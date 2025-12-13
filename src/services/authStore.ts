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
// QUERY TIMEOUT UTILITY
// =============================================================================
// Wraps async operations with a timeout to prevent indefinite spinning

const QUERY_TIMEOUT_MS = 10000; // 10 seconds

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = QUERY_TIMEOUT_MS,
  fallback?: T
): Promise<T> {
  const timeoutPromise = new Promise<T>((resolve, reject) => {
    setTimeout(() => {
      if (fallback !== undefined) {
        console.warn(`[AuthStore] Query timed out after ${timeoutMs}ms, using fallback`);
        resolve(fallback);
      } else {
        reject(new Error(`Query timed out after ${timeoutMs}ms`));
      }
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

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
 * Uses timeouts to prevent indefinite spinning on slow queries
 */
async function buildUserScope(user: User): Promise<UserScope> {
  // Get user's staff role from users table (with timeout)
  let staffRole: StaffRole = 'NONE';
  try {
    const result = await withTimeout(
      supabase
        .from('users')
        .select('staff_role')
        .eq('id', user.id)
        .single(),
      QUERY_TIMEOUT_MS,
      { data: null, error: null } // Fallback on timeout
    );

    if (result.data?.staff_role) {
      staffRole = result.data.staff_role.toUpperCase() as StaffRole;
      console.log('[AuthStore] User staff role:', staffRole);
    }
  } catch (e) {
    console.log('[AuthStore] Could not fetch staff role, defaulting to NONE');
  }

  // Try to get user's tenant membership from database (with timeout)
  try {
    const result = await withTimeout(
      supabase
        .from('user_tenants')
        .select('tenant_id, role')
        .eq('user_id', user.id)
        .single(),
      QUERY_TIMEOUT_MS,
      { data: null, error: null } // Fallback on timeout
    );

    if (result.data) {
      return {
        userId: user.id,
        tenantId: result.data.tenant_id,
        tenantRole: (result.data.role?.toUpperCase() || 'MEMBER') as TenantRole,
        staffRole,
        tenantContactZeroId: `contact_zero_${result.data.tenant_id}`,
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
 * Uses timeouts and runs in background to not block login
 */
async function createTenantForUser(user: User): Promise<void> {
  try {
    // Check if user already exists (with timeout)
    const existingUserResult = await withTimeout(
      supabase.from('users').select('id').eq('id', user.id).single(),
      QUERY_TIMEOUT_MS,
      { data: { id: user.id }, error: null } // Assume exists on timeout to avoid duplicate creation
    );

    if (!existingUserResult.data) {
      // Create user record (with timeout, ignore failures)
      await withTimeout(
        supabase.from('users').insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.email?.split('@')[0],
        }),
        QUERY_TIMEOUT_MS,
        { data: null, error: null }
      );

      // Create tenant for user (with timeout)
      const tenantResult = await withTimeout(
        supabase
          .from('tenants')
          .insert({
            name: `${user.email}'s Workspace`,
            owner_user_id: user.id,
            plan_tier: 'beta_free',
          })
          .select()
          .single(),
        QUERY_TIMEOUT_MS,
        { data: null, error: null }
      );

      if (tenantResult.data) {
        // Create membership (with timeout, ignore failures)
        await withTimeout(
          supabase.from('user_tenants').insert({
            user_id: user.id,
            tenant_id: tenantResult.data.id,
            role: 'owner',
          }),
          QUERY_TIMEOUT_MS,
          { data: null, error: null }
        );
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
      // Create tenant for new users - run in background, don't block login
      createTenantForUser(session.user).catch((e) => {
        console.error('[AuthStore] Background tenant creation failed:', e);
      });
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

  try {
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({ email, password }),
      QUERY_TIMEOUT_MS
    );

    if (error) {
      updateState({ isLoading: false, error: error.message });
      return { success: false, error: error.message };
    }

    return { success: true, user: data.user! };
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Login timed out. Please try again.';
    updateState({ isLoading: false, error: errorMsg });
    return { success: false, error: errorMsg };
  }
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
// INTAKE COMPLETION (Supabase user_metadata)
// =============================================================================

// LocalStorage keys for intake completion (fallback when Supabase is slow/unavailable)
const INTAKE_COMPLETE_KEY = 'framelord_intake_completed';
const INTAKE_COMPLETE_GENERIC_KEY = 'framelord_intake_completed_any'; // Device-level fallback

/**
 * Check if the current user has completed Tier 1 intake.
 * Checks multiple sources for reliability:
 * 1. Supabase user_metadata (cross-device, requires auth)
 * 2. User-specific localStorage (device-specific, requires user.id)
 * 3. Generic localStorage (device-specific, works even if auth is slow)
 */
export function hasCompletedIntake(): boolean {
  const user = authState.user;

  // Check Supabase user_metadata first
  if (user?.user_metadata?.intake_completed_at) {
    return true;
  }

  // Fallback: check user-specific localStorage
  if (user) {
    const localKey = `${INTAKE_COMPLETE_KEY}_${user.id}`;
    const localValue = localStorage.getItem(localKey);
    if (localValue) {
      console.log('[AuthStore] Intake completion found in user-specific localStorage');
      return true;
    }
  }

  // Final fallback: check generic localStorage (for when auth is slow but user completed on this device)
  const genericValue = localStorage.getItem(INTAKE_COMPLETE_GENERIC_KEY);
  if (genericValue) {
    console.log('[AuthStore] Intake completion found in generic localStorage fallback');
    return true;
  }

  return false;
}

/**
 * Get the intake completion timestamp for the current user.
 */
export function getIntakeCompletionDate(): string | null {
  const user = authState.user;
  if (!user) return null;

  // Check Supabase first
  if (user.user_metadata?.intake_completed_at) {
    return user.user_metadata.intake_completed_at;
  }

  // Fallback: check localStorage
  const localKey = `${INTAKE_COMPLETE_KEY}_${user.id}`;
  return localStorage.getItem(localKey);
}

/**
 * Mark the current user's Tier 1 intake as completed.
 * Stores in multiple places for reliability:
 * 1. Generic localStorage (always, for device-level fallback)
 * 2. User-specific localStorage (if user.id available)
 * 3. Supabase user_metadata (for cross-device sync)
 */
export async function markIntakeComplete(): Promise<boolean> {
  const now = new Date().toISOString();

  // Always store in generic localStorage first (works even if auth fails)
  localStorage.setItem(INTAKE_COMPLETE_GENERIC_KEY, now);
  console.log('[AuthStore] Intake marked complete in generic localStorage');

  const user = authState.user;
  if (!user) {
    console.warn('[AuthStore] No user logged in - using generic localStorage only');
    return true; // Still consider it successful since generic localStorage worked
  }

  // Also store in user-specific localStorage
  const localKey = `${INTAKE_COMPLETE_KEY}_${user.id}`;
  localStorage.setItem(localKey, now);
  console.log('[AuthStore] Intake marked complete in user-specific localStorage');

  // Don't overwrite Supabase if already set
  if (user.user_metadata?.intake_completed_at) {
    console.log('[AuthStore] Intake already marked complete in Supabase');
    return true;
  }

  // Try to store in Supabase (may fail if connection is slow)
  if (!isSupabaseConfigured()) {
    console.warn('[AuthStore] Supabase not configured - using localStorage only');
    return true;
  }

  try {
    const { data, error } = await withTimeout(
      supabase.auth.updateUser({
        data: {
          ...user.user_metadata,
          intake_completed_at: now,
        },
      }),
      QUERY_TIMEOUT_MS,
      { data: null, error: { message: 'Timeout' } }
    );

    if (error) {
      console.warn('[AuthStore] Failed to mark intake complete in Supabase (localStorage fallback active):', error);
      return true; // Still return true since localStorage worked
    }

    // Update local state with new user data
    if (data?.user) {
      updateState({ user: data.user });
    }

    console.log('[AuthStore] Intake marked complete in Supabase');
  } catch (e) {
    console.warn('[AuthStore] Supabase update failed, using localStorage fallback');
  }

  console.log('[AuthStore] Intake marked complete at:', now);
  return true;
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
