// =============================================================================
// AUTH STORE — Supabase Authentication
// =============================================================================
// Real authentication using Supabase Auth.
// Manages user sessions, login/logout, and user scope.
// =============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import type { UserScope, StaffRole, TenantRole } from '../types/multiTenant';
import { setDemoContactsEnabled, refreshContactsList } from './contactStore';
import { setDemoLogsEnabled } from './systemLogStore';

// =============================================================================
// TYPES
// =============================================================================

export interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  session: Session | null;
  currentUserScope: UserScope | null;
  error: string | null;
}

export interface AuthResult {
  success: boolean;
  error?: string;
  user?: User;
}

// =============================================================================
// STATE
// =============================================================================

let authState: AuthState = {
  isAuthenticated: false,
  isLoading: true,
  user: null,
  session: null,
  currentUserScope: null,
  error: null,
};

// Subscribers for state changes
const subscribers: Set<() => void> = new Set();

// =============================================================================
// NOTIFY SUBSCRIBERS
// =============================================================================

function notifySubscribers(): void {
  subscribers.forEach((callback) => callback());
}

function updateState(updates: Partial<AuthState>): void {
  authState = { ...authState, ...updates };
  notifySubscribers();
}

// =============================================================================
// USER SCOPE MANAGEMENT
// =============================================================================

/**
 * Build UserScope from Supabase user and database records
 */
async function buildUserScope(user: User): Promise<UserScope> {
  // Get user's staff role from users table
  let staffRole: StaffRole = 'NONE';
  try {
    const { data: userData } = await supabase
      .from('users')
      .select('staff_role')
      .eq('id', user.id)
      .single();

    if (userData?.staff_role) {
      staffRole = userData.staff_role.toUpperCase() as StaffRole;
      console.log('[AuthStore] User staff role:', staffRole);
    }
  } catch (e) {
    console.log('[AuthStore] Could not fetch staff role, defaulting to NONE');
  }

  // Try to get user's tenant membership from database
  try {
    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .single();

    if (userTenant) {
      return {
        userId: user.id,
        tenantId: userTenant.tenant_id,
        tenantRole: (userTenant.role?.toUpperCase() || 'MEMBER') as TenantRole,
        staffRole,
        tenantContactZeroId: `contact_zero_${userTenant.tenant_id}`,
      };
    }
  } catch (e) {
    console.log('[AuthStore] No tenant membership found, using default scope');
  }

  // Default scope for new users
  return {
    userId: user.id,
    tenantId: `tenant_${user.id}`,
    tenantRole: 'OWNER',
    staffRole,
    tenantContactZeroId: `contact_zero_${user.id}`,
  };
}

/**
 * Create tenant and membership for new user
 */
async function createTenantForUser(user: User): Promise<void> {
  try {
    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single();

    if (!existingUser) {
      // Create user record
      await supabase.from('users').insert({
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
      });

      // Create tenant for user
      const { data: tenant } = await supabase
        .from('tenants')
        .insert({
          name: `${user.email}'s Workspace`,
          owner_user_id: user.id,
          plan_tier: 'beta_free',
        })
        .select()
        .single();

      if (tenant) {
        // Create membership
        await supabase.from('user_tenants').insert({
          user_id: user.id,
          tenant_id: tenant.id,
          role: 'owner',
        });
      }
    }
  } catch (e) {
    console.error('[AuthStore] Error creating tenant for user:', e);
  }
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

/**
 * Handle auth state change from Supabase
 */
async function handleAuthChange(session: Session | null): Promise<void> {
  if (session?.user) {
    // Disable demo data for authenticated users
    setDemoContactsEnabled(false);
    setDemoLogsEnabled(false);
    refreshContactsList();
    console.log('[AuthStore] Demo data disabled for authenticated user');

    const userScope = await buildUserScope(session.user);
    updateState({
      isAuthenticated: true,
      isLoading: false,
      user: session.user,
      session,
      currentUserScope: userScope,
      error: null,
    });
  } else {
    // Re-enable demo data for logged out users (landing page visitors)
    setDemoContactsEnabled(true);
    setDemoLogsEnabled(true);
    refreshContactsList();

    updateState({
      isAuthenticated: false,
      isLoading: false,
      user: null,
      session: null,
      currentUserScope: null,
      error: null,
    });
  }
}

// =============================================================================
// INITIALIZE AUTH LISTENER
// =============================================================================

// Only initialize if Supabase is configured
if (isSupabaseConfigured()) {
  // Listen for auth state changes
  supabase.auth.onAuthStateChange(async (event, session) => {
    console.log('[AuthStore] Auth event:', event);

    if (event === 'SIGNED_IN' && session?.user) {
      // Create tenant for new users
      await createTenantForUser(session.user);
    }

    await handleAuthChange(session);
  });

  // Get initial session
  supabase.auth.getSession().then(({ data: { session } }) => {
    handleAuthChange(session);
  });
} else {
  // Supabase not configured - mark as not loading, not authenticated
  console.warn('[AuthStore] Supabase not configured - auth disabled');
  updateState({ isLoading: false });
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return authState.isAuthenticated;
}

/**
 * Check if auth is still loading
 */
export function isAuthLoading(): boolean {
  return authState.isLoading;
}

/**
 * Get current user
 */
export function getCurrentUser(): User | null {
  return authState.user;
}

/**
 * Get current user scope (null if not authenticated)
 */
export function getCurrentUserScope(): UserScope | null {
  return authState.currentUserScope;
}

/**
 * Get full auth state
 */
export function getAuthState(): AuthState {
  return { ...authState };
}

/**
 * Subscribe to auth state changes
 * Returns unsubscribe function
 */
export function subscribeAuth(callback: () => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

// =============================================================================
// AUTH ACTIONS
// =============================================================================

const SUPABASE_NOT_CONFIGURED_ERROR = 'Authentication service not configured';

/**
 * Sign in with email and password
 */
export async function loginWithEmail(email: string, password: string): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: SUPABASE_NOT_CONFIGURED_ERROR };
  }
  updateState({ isLoading: true, error: null });

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    updateState({ isLoading: false, error: error.message });
    return { success: false, error: error.message };
  }

  return { success: true, user: data.user! };
}

/**
 * Sign up with email and password
 */
export async function signUpWithEmail(
  email: string,
  password: string,
  fullName?: string
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: SUPABASE_NOT_CONFIGURED_ERROR };
  }
  updateState({ isLoading: true, error: null });

  // Use VITE_APP_URL for redirects, fallback to current origin
  const siteUrl = import.meta.env.VITE_APP_URL || window.location.origin;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName || email.split('@')[0],
      },
      emailRedirectTo: `${siteUrl}/dashboard`,
    },
  });

  if (error) {
    updateState({ isLoading: false, error: error.message });
    return { success: false, error: error.message };
  }

  // Check if email confirmation is required
  if (data.user && !data.session) {
    updateState({ isLoading: false });
    return {
      success: true,
      user: data.user,
      error: 'Please check your email to confirm your account.',
    };
  }

  return { success: true, user: data.user! };
}

/**
 * Sign in with magic link (passwordless)
 */
export async function loginWithMagicLink(email: string): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: SUPABASE_NOT_CONFIGURED_ERROR };
  }
  updateState({ isLoading: true, error: null });

  const siteUrl = import.meta.env.VITE_APP_URL || window.location.origin;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/dashboard`,
    },
  });

  if (error) {
    updateState({ isLoading: false, error: error.message });
    return { success: false, error: error.message };
  }

  updateState({ isLoading: false });
  return { success: true, error: 'Check your email for the magic link!' };
}

/**
 * Request password reset
 */
export async function resetPassword(email: string): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: SUPABASE_NOT_CONFIGURED_ERROR };
  }

  const siteUrl = import.meta.env.VITE_APP_URL || window.location.origin;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${siteUrl}/reset-password`,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true, error: 'Check your email for the reset link!' };
}

/**
 * Update password (after reset)
 */
export async function updatePassword(newPassword: string): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return { success: false, error: SUPABASE_NOT_CONFIGURED_ERROR };
  }
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Logout - clears all auth state
 */
export async function logout(): Promise<void> {
  if (isSupabaseConfigured()) {
    await supabase.auth.signOut();
  }
  updateState({
    isAuthenticated: false,
    isLoading: false,
    user: null,
    session: null,
    currentUserScope: null,
    error: null,
  });
  console.log('[AuthStore] Logged out');
}

// =============================================================================
// LEGACY COMPATIBILITY
// =============================================================================

/**
 * @deprecated Use loginWithEmail instead
 */
export function loginWithEmailMock(email: string, password: string): boolean {
  console.warn('[AuthStore] loginWithEmailMock is deprecated. Use loginWithEmail instead.');
  loginWithEmail(email, password);
  return true;
}

/**
 * Dev-only: Login as SUPER_ADMIN (only in development)
 */
export function loginAsSuperAdminDev(): boolean {
  if (!import.meta.env.DEV) {
    console.warn('[AuthStore] Super Admin dev login only available in development');
    return false;
  }

  // Create mock super admin scope for dev testing
  const superAdminScope: UserScope = {
    userId: 'dev_super_admin',
    tenantId: 'dev_tenant',
    tenantRole: 'OWNER',
    staffRole: 'SUPER_ADMIN',
    tenantContactZeroId: 'dev_contact_zero',
  };

  updateState({
    isAuthenticated: true,
    isLoading: false,
    user: null,
    session: null,
    currentUserScope: superAdminScope,
    error: null,
  });

  console.log('[AuthStore] Logged in as SUPER_ADMIN (dev mode)');
  return true;
}

/**
 * Login with a specific scope (for testing different roles)
 */
export function loginWithScope(scope: UserScope): boolean {
  updateState({
    isAuthenticated: true,
    isLoading: false,
    user: null,
    session: null,
    currentUserScope: scope,
    error: null,
  });
  return true;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if current user is a platform staff member
 */
export function isPlatformStaff(): boolean {
  const scope = authState.currentUserScope;
  if (!scope) return false;
  return scope.staffRole !== 'NONE';
}

/**
 * Check if current user is a SUPER_ADMIN
 */
export function isSuperAdmin(): boolean {
  const scope = authState.currentUserScope;
  if (!scope) return false;
  return scope.staffRole === 'SUPER_ADMIN';
}

/**
 * Check if current user is tenant OWNER or MANAGER
 */
export function isTenantAdmin(): boolean {
  const scope = authState.currentUserScope;
  if (!scope) return false;
  return scope.tenantRole === 'OWNER' || scope.tenantRole === 'MANAGER';
}

// =============================================================================
// REACT HOOK
// =============================================================================

/**
 * React hook for auth state
 */
export function useAuth() {
  return {
    isAuthenticated: isAuthenticated(),
    isLoading: isAuthLoading(),
    user: getCurrentUser(),
    userScope: getCurrentUserScope(),
    authState: getAuthState(),
    loginWithEmail,
    signUpWithEmail,
    loginWithMagicLink,
    resetPassword,
    logout,
    loginAsSuperAdmin: loginAsSuperAdminDev,
    loginWithScope,
    isPlatformStaff: isPlatformStaff(),
    isSuperAdmin: isSuperAdmin(),
    isTenantAdmin: isTenantAdmin(),
    subscribe: subscribeAuth,
  };
}
