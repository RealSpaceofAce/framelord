-- =============================================================================
-- INTAKE APPLICATIONS MIGRATION
-- =============================================================================
-- Creates tables for beta_chat_applications and case_call_applications
-- with RLS policies for admin-only access
-- =============================================================================

-- =============================================================================
-- BETA CHAT APPLICATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.beta_chat_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  conversation_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'applied' CHECK (status IN ('applied', 'approved', 'rejected', 'needs_case_call')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  reviewer_id UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_beta_chat_applications_status ON public.beta_chat_applications(status);
CREATE INDEX IF NOT EXISTS idx_beta_chat_applications_created_at ON public.beta_chat_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_beta_chat_applications_email ON public.beta_chat_applications(email);

-- Enable RLS
ALTER TABLE public.beta_chat_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (public submission)
CREATE POLICY "Anyone can submit beta application"
  ON public.beta_chat_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Only admins can select
-- Note: This assumes you have a way to check staff role.
-- Adjust based on your actual staff role checking mechanism.
CREATE POLICY "Admins can view all beta applications"
  ON public.beta_chat_applications
  FOR SELECT
  TO authenticated
  USING (
    -- Check if user is in super admin emails list or has staff role
    auth.jwt() ->> 'email' IN ('realaaronernst@gmail.com')
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.staff_role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- Policy: Only admins can update
CREATE POLICY "Admins can update beta applications"
  ON public.beta_chat_applications
  FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN ('realaaronernst@gmail.com')
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.staff_role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- Policy: Only super admins can delete
CREATE POLICY "Super admins can delete beta applications"
  ON public.beta_chat_applications
  FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN ('realaaronernst@gmail.com')
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.staff_role = 'SUPER_ADMIN'
    )
  );

-- =============================================================================
-- CASE CALL APPLICATIONS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.case_call_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  contact_id TEXT, -- Optional link to contact
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'scheduled', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  reviewed_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ,
  notes TEXT
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_case_call_applications_status ON public.case_call_applications(status);
CREATE INDEX IF NOT EXISTS idx_case_call_applications_created_at ON public.case_call_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_case_call_applications_email ON public.case_call_applications(email);

-- Enable RLS
ALTER TABLE public.case_call_applications ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can insert (public submission)
CREATE POLICY "Anyone can submit case call application"
  ON public.case_call_applications
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Policy: Only admins can select
CREATE POLICY "Admins can view all case call applications"
  ON public.case_call_applications
  FOR SELECT
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN ('realaaronernst@gmail.com')
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.staff_role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- Policy: Only admins can update
CREATE POLICY "Admins can update case call applications"
  ON public.case_call_applications
  FOR UPDATE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN ('realaaronernst@gmail.com')
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.staff_role IN ('SUPER_ADMIN', 'ADMIN')
    )
  );

-- Policy: Only super admins can delete
CREATE POLICY "Super admins can delete case call applications"
  ON public.case_call_applications
  FOR DELETE
  TO authenticated
  USING (
    auth.jwt() ->> 'email' IN ('realaaronernst@gmail.com')
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.staff_role = 'SUPER_ADMIN'
    )
  );

-- =============================================================================
-- ADD STAFF_ROLE TO USERS TABLE (if not exists)
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'users'
    AND column_name = 'staff_role'
  ) THEN
    ALTER TABLE public.users ADD COLUMN staff_role TEXT DEFAULT 'NONE' CHECK (staff_role IN ('SUPER_ADMIN', 'ADMIN', 'SUPPORT', 'NONE'));
  END IF;
END
$$;

-- =============================================================================
-- EMAIL NOTIFICATION FUNCTION
-- =============================================================================
-- This function will be called by triggers to send email notifications
-- Uses pg_net extension if available, otherwise logs to a notifications table

-- Create notifications log table for tracking
CREATE TABLE IF NOT EXISTS public.admin_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  recipient_email TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  error_message TEXT
);

-- Function to log notification (will be picked up by edge function or webhook)
CREATE OR REPLACE FUNCTION public.log_admin_notification(
  p_event_type TEXT,
  p_payload JSONB,
  p_recipient_email TEXT DEFAULT 'realaaronernst@gmail.com'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.admin_notification_log (event_type, payload, recipient_email)
  VALUES (p_event_type, p_payload, p_recipient_email)
  RETURNING id INTO notification_id;

  RETURN notification_id;
END;
$$;

-- =============================================================================
-- TRIGGERS FOR EMAIL NOTIFICATIONS
-- =============================================================================

-- Trigger function for beta applications
CREATE OR REPLACE FUNCTION public.notify_beta_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.log_admin_notification(
    'BETA_APPLICATION_SUBMITTED',
    jsonb_build_object(
      'id', NEW.id,
      'email', NEW.email,
      'name', NEW.name,
      'submitted_at', NEW.created_at,
      'conversation_preview', (NEW.conversation_history->0->>'content')
    ),
    'realaaronernst@gmail.com'
  );
  RETURN NEW;
END;
$$;

-- Trigger for beta applications
DROP TRIGGER IF EXISTS on_beta_application_insert ON public.beta_chat_applications;
CREATE TRIGGER on_beta_application_insert
  AFTER INSERT ON public.beta_chat_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_beta_application();

-- Trigger function for case call applications
CREATE OR REPLACE FUNCTION public.notify_case_call_application()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM public.log_admin_notification(
    'CASE_CALL_APPLICATION_SUBMITTED',
    jsonb_build_object(
      'id', NEW.id,
      'email', NEW.email,
      'name', NEW.name,
      'phone', NEW.phone,
      'submitted_at', NEW.created_at,
      'situation_preview', (NEW.answers->0->>'answer')
    ),
    'realaaronernst@gmail.com'
  );
  RETURN NEW;
END;
$$;

-- Trigger for case call applications
DROP TRIGGER IF EXISTS on_case_call_application_insert ON public.case_call_applications;
CREATE TRIGGER on_case_call_application_insert
  AFTER INSERT ON public.case_call_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_case_call_application();

-- =============================================================================
-- GRANT PERMISSIONS
-- =============================================================================

GRANT SELECT, INSERT ON public.beta_chat_applications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.beta_chat_applications TO authenticated;

GRANT SELECT, INSERT ON public.case_call_applications TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.case_call_applications TO authenticated;

GRANT INSERT ON public.admin_notification_log TO anon, authenticated;
GRANT SELECT ON public.admin_notification_log TO authenticated;
