-- =============================================================================
-- CORE TABLES MIGRATION
-- =============================================================================
-- Creates the foundational tables for FrameLord:
-- - users (extends auth.users with app-specific fields)
-- - tenants (workspaces/organizations)
-- - user_tenants (user membership in tenants)
-- =============================================================================

-- =============================================================================
-- USERS TABLE
-- =============================================================================
-- Extends Supabase auth.users with app-specific fields
-- Links to auth.users via id (same UUID)

CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  staff_role TEXT DEFAULT 'NONE' CHECK (staff_role IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'EMPLOYEE', 'NONE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can read their own record
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Users can update their own record (except staff_role)
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow insert on user creation (via trigger or direct)
CREATE POLICY "Allow user creation"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Admins can view all users
CREATE POLICY "Admins can view all users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.staff_role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- =============================================================================
-- TENANTS TABLE
-- =============================================================================
-- Workspaces/organizations that users belong to

CREATE TABLE IF NOT EXISTS public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  plan_tier TEXT DEFAULT 'beta_free' CHECK (plan_tier IN ('beta_free', 'basic', 'pro', 'elite', 'team', 'enterprise')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

-- Users can view their own tenant
CREATE POLICY "Users can view own tenant"
  ON public.tenants
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants ut
      WHERE ut.tenant_id = id
      AND ut.user_id = auth.uid()
    )
  );

-- Users can create tenants
CREATE POLICY "Users can create tenants"
  ON public.tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (owner_user_id = auth.uid());

-- Owners can update their tenant
CREATE POLICY "Owners can update tenant"
  ON public.tenants
  FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid());

-- =============================================================================
-- USER_TENANTS TABLE
-- =============================================================================
-- Junction table for user-tenant membership with roles

CREATE TABLE IF NOT EXISTS public.user_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'member', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, tenant_id)
);

-- Enable RLS
ALTER TABLE public.user_tenants ENABLE ROW LEVEL SECURITY;

-- Users can view their own memberships
CREATE POLICY "Users can view own memberships"
  ON public.user_tenants
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own membership (for new tenant creation)
CREATE POLICY "Users can create own membership"
  ON public.user_tenants
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Tenant owners/admins can manage memberships
CREATE POLICY "Tenant admins can manage memberships"
  ON public.user_tenants
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_tenants ut
      WHERE ut.tenant_id = tenant_id
      AND ut.user_id = auth.uid()
      AND ut.role IN ('owner', 'admin')
    )
  );

-- =============================================================================
-- TRIGGER: Auto-create user record on auth signup
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =============================================================================
-- GRANTS
-- =============================================================================

GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.tenants TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_tenants TO authenticated;
