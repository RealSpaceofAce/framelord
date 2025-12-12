// =============================================================================
// AUTH STORE — Authentication state management
// =============================================================================
// Manages user authentication state including login/logout and user scope.
// Uses localStorage for session persistence.
//
// MOCK MODE: During beta, uses mock authentication without real backend.
// When backend is ready, replace loginWithEmailMock with real API calls.
// =============================================================================

import type { UserScope, StaffRole, TenantRole } from '../types/multiTenant';

// =============================================================================
// STORAGE KEYS
// =============================================================================

const AUTH_STORAGE_KEY = 'framelord_auth';

// =============================================================================
// TYPES
// =============================================================================

export interface AuthState {
  isAuthenticated: boolean;
  currentUserScope: UserScope | null;
  loginMethod: 'email' | 'dev_super_admin' | null;
  lastLoginAt: string | null;
}

// =============================================================================
// DEFAULT MOCK SCOPES
// =============================================================================

// Platform Super Admin - full access to Platform Admin portal
const SUPER_ADMIN_SCOPE: UserScope = {
  userId: 'user_super_admin_001',
  tenantId: 'tenant_demo_001',
  tenantRole: 'OWNER',
  staffRole: 'SUPER_ADMIN',
  tenantContactZeroId: 'contact_zero_demo_001',
};

// Default user scope for email login (beta user)
const DEFAULT_USER_SCOPE: UserScope = {
  userId: 'user_beta_001',
  tenantId: 'tenant_demo_001',
  tenantRole: 'OWNER',
  staffRole: 'NONE',
  tenantContactZeroId: 'contact_zero_demo_001',
};

// =============================================================================
// STATE
// =============================================================================

let authState: AuthState = {
  isAuthenticated: false,
  currentUserScope: null,
  loginMethod: null,
  lastLoginAt: null,
};

// Subscribers for state changes
const subscribers: Set<() => void> = new Set();

// =============================================================================
// PERSISTENCE
// =============================================================================

function saveToStorage(): void {
  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(authState));
  } catch (e) {
    console.warn('[AuthStore] Failed to save auth state:', e);
  }
}

function loadFromStorage(): void {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Validate the stored state
      if (parsed && typeof parsed.isAuthenticated === 'boolean') {
        authState = {
          isAuthenticated: parsed.isAuthenticated,
          currentUserScope: parsed.currentUserScope || null,
          loginMethod: parsed.loginMethod || null,
          lastLoginAt: parsed.lastLoginAt || null,
        };
      }
    }
  } catch (e) {
    console.warn('[AuthStore] Failed to load auth state:', e);
  }
}

// Initialize from storage on load
loadFromStorage();

// =============================================================================
// NOTIFY SUBSCRIBERS
// =============================================================================

function notifySubscribers(): void {
  subscribers.forEach((callback) => callback());
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

/**
 * Mock login with email and password
 * In production, replace with real API call
 */
export function loginWithEmailMock(email: string, password: string): boolean {
  // Mock validation - in production, this would be an API call
  if (!email || !password) {
    console.warn('[AuthStore] Login failed: Missing email or password');
    return false;
  }

  // For now, any email/password combination works
  // Password must be at least 6 characters
  if (password.length < 6) {
    console.warn('[AuthStore] Login failed: Password too short');
    return false;
  }

  // Create user scope based on email
  const userScope: UserScope = {
    ...DEFAULT_USER_SCOPE,
    userId: `user_${email.split('@')[0]}_${Date.now()}`,
  };

  authState = {
    isAuthenticated: true,
    currentUserScope: userScope,
    loginMethod: 'email',
    lastLoginAt: new Date().toISOString(),
  };

  saveToStorage();
  notifySubscribers();
  console.log('[AuthStore] Logged in as:', email);
  return true;
}

/**
 * Dev-only: Login as SUPER_ADMIN
 * This should only be available in development mode
 */
export function loginAsSuperAdminDev(): boolean {
  const isDev = import.meta.env.DEV ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1';

  if (!isDev) {
    console.warn('[AuthStore] Super Admin dev login only available in development');
    return false;
  }

  authState = {
    isAuthenticated: true,
    currentUserScope: SUPER_ADMIN_SCOPE,
    loginMethod: 'dev_super_admin',
    lastLoginAt: new Date().toISOString(),
  };

  saveToStorage();
  notifySubscribers();
  console.log('[AuthStore] Logged in as SUPER_ADMIN (dev mode)');
  return true;
}

/**
 * Login with a specific scope (for testing different roles)
 */
export function loginWithScope(scope: UserScope): boolean {
  authState = {
    isAuthenticated: true,
    currentUserScope: scope,
    loginMethod: 'email',
    lastLoginAt: new Date().toISOString(),
  };

  saveToStorage();
  notifySubscribers();
  console.log('[AuthStore] Logged in with custom scope:', scope.staffRole, scope.tenantRole);
  return true;
}

/**
 * Logout - clears all auth state
 */
export function logout(): void {
  authState = {
    isAuthenticated: false,
    currentUserScope: null,
    loginMethod: null,
    lastLoginAt: null,
  };

  saveToStorage();
  notifySubscribers();
  console.log('[AuthStore] Logged out');
}

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
 * Usage: const { isAuthenticated, userScope, login, logout } = useAuth();
 */
export function useAuth() {
  // This will be used with useSyncExternalStore in React 18+
  // For now, components can use subscribeAuth for updates
  return {
    isAuthenticated: isAuthenticated(),
    userScope: getCurrentUserScope(),
    authState: getAuthState(),
    loginWithEmail: loginWithEmailMock,
    loginAsSuperAdmin: loginAsSuperAdminDev,
    loginWithScope,
    logout,
    isPlatformStaff: isPlatformStaff(),
    isSuperAdmin: isSuperAdmin(),
    isTenantAdmin: isTenantAdmin(),
    subscribe: subscribeAuth,
  };
}
