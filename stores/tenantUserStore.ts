// =============================================================================
// TENANT USER STORE — User membership and role management
// =============================================================================
// Manages tenant user records with strict role enforcement.
// Each user belongs to exactly one tenant and maps to a contact.
// Tenant Contact Zero must always have tenantRole: 'OWNER'.
// =============================================================================

import type { TenantUser, TenantRole, StaffRole, UserScope } from '../types/multiTenant';
import { SUPER_ADMIN_USER_ID } from '../config/appConfig';
import { getTenantById } from './tenantStore';

const STORAGE_KEY = 'framelord_tenant_users';

// In-memory cache
let tenantUsers: TenantUser[] = [];
let initialized = false;

// =============================================================================
// INITIALIZATION
// =============================================================================

function init(): void {
  if (initialized) return;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        tenantUsers = parsed;
      }
    }
  } catch {
    console.warn('[TenantUserStore] Failed to load from localStorage');
  }
  
  initialized = true;
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tenantUsers));
  } catch {
    console.warn('[TenantUserStore] Failed to persist to localStorage');
  }
}

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

/**
 * Get all users for a tenant
 */
export function getTenantUsers(tenantId: string): TenantUser[] {
  init();
  return tenantUsers.filter(u => u.tenantId === tenantId);
}

/**
 * Get all users across all tenants (Platform Admin only)
 */
export function getAllTenantUsers(): TenantUser[] {
  init();
  return [...tenantUsers];
}

/**
 * Get user by ID
 */
export function getTenantUserById(userId: string): TenantUser | null {
  init();
  return tenantUsers.find(u => u.userId === userId) ?? null;
}

/**
 * Get user by email within a tenant
 */
export function getTenantUserByEmail(tenantId: string, email: string): TenantUser | null {
  init();
  return tenantUsers.find(u => 
    u.tenantId === tenantId && 
    u.email.toLowerCase() === email.toLowerCase()
  ) ?? null;
}

/**
 * Get user by contact ID within a tenant
 */
export function getTenantUserByContactId(tenantId: string, contactId: string): TenantUser | null {
  init();
  return tenantUsers.find(u => 
    u.tenantId === tenantId && 
    u.contactId === contactId
  ) ?? null;
}

/**
 * Create a new tenant user
 */
export function createTenantUser(
  tenantId: string,
  contactId: string,
  email: string,
  displayName: string,
  tenantRole: TenantRole,
  staffRole: StaffRole = 'NONE'
): TenantUser {
  init();
  
  const user: TenantUser = {
    userId: `user_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    tenantId,
    contactId,
    email,
    displayName,
    tenantRole,
    staffRole,
    createdAt: new Date().toISOString(),
    isActive: true,
  };
  
  tenantUsers = [user, ...tenantUsers];
  persist();
  
  // BACKEND TODO: Create user record in auth system
  // BACKEND TODO: Create user in database
  // BACKEND TODO: Send welcome email
  console.log('[TenantUserStore] BACKEND STUB: createTenantUser', user.userId);
  
  return user;
}

/**
 * Update tenant user
 */
export function updateTenantUser(
  userId: string,
  updates: Partial<Pick<TenantUser, 'displayName' | 'email' | 'isActive' | 'lastLoginAt'>>
): TenantUser | null {
  init();
  
  const index = tenantUsers.findIndex(u => u.userId === userId);
  if (index < 0) return null;
  
  tenantUsers[index] = { ...tenantUsers[index], ...updates };
  persist();
  
  return tenantUsers[index];
}

/**
 * Update last login timestamp
 */
export function recordUserLogin(userId: string): TenantUser | null {
  return updateTenantUser(userId, { lastLoginAt: new Date().toISOString() });
}

// =============================================================================
// ROLE MANAGEMENT
// =============================================================================

/**
 * Change tenant role for a user
 * Enforces: OWNER cannot change their own role
 * Enforces: MANAGER cannot change OWNER role
 */
export function changeTenantRole(
  actorScope: UserScope,
  targetUserId: string,
  newRole: TenantRole
): { success: boolean; error?: string } {
  init();
  
  const target = getTenantUserById(targetUserId);
  if (!target) {
    return { success: false, error: 'User not found' };
  }
  
  // Cannot change role for users in different tenant
  if (target.tenantId !== actorScope.tenantId) {
    return { success: false, error: 'Cannot modify users in other tenants' };
  }
  
  // OWNER cannot demote themselves
  if (target.tenantRole === 'OWNER' && target.userId === actorScope.userId) {
    return { success: false, error: 'Owner cannot change their own role' };
  }
  
  // Only OWNER can change roles to/from OWNER
  if (newRole === 'OWNER' || target.tenantRole === 'OWNER') {
    if (actorScope.tenantRole !== 'OWNER') {
      return { success: false, error: 'Only owner can modify owner role' };
    }
  }
  
  // MANAGER cannot change OWNER role
  if (actorScope.tenantRole === 'MANAGER' && target.tenantRole === 'OWNER') {
    return { success: false, error: 'Manager cannot modify owner' };
  }
  
  const index = tenantUsers.findIndex(u => u.userId === targetUserId);
  tenantUsers[index] = { ...tenantUsers[index], tenantRole: newRole };
  persist();
  
  // BACKEND TODO: Record role change in audit log
  console.log('[TenantUserStore] BACKEND STUB: changeTenantRole', targetUserId, newRole);
  
  return { success: true };
}

/**
 * Change staff role for a user (Platform Admin only)
 * ENFORCED: Cannot demote SUPER_ADMIN
 * ENFORCED: Only SUPER_ADMIN can assign/revoke ADMIN
 */
export function changeStaffRole(
  actorScope: UserScope,
  targetUserId: string,
  newRole: StaffRole
): { success: boolean; error?: string } {
  init();
  
  const target = getTenantUserById(targetUserId);
  if (!target) {
    return { success: false, error: 'User not found' };
  }
  
  // CRITICAL: Cannot demote the designated SUPER_ADMIN
  if (targetUserId === SUPER_ADMIN_USER_ID && newRole !== 'SUPER_ADMIN') {
    return { success: false, error: 'Cannot demote the designated SUPER_ADMIN' };
  }
  
  // Only SUPER_ADMIN can assign SUPER_ADMIN role
  if (newRole === 'SUPER_ADMIN' && actorScope.staffRole !== 'SUPER_ADMIN') {
    return { success: false, error: 'Only SUPER_ADMIN can assign SUPER_ADMIN role' };
  }
  
  // Only SUPER_ADMIN can assign/revoke ADMIN role
  if ((newRole === 'ADMIN' || target.staffRole === 'ADMIN') && 
      actorScope.staffRole !== 'SUPER_ADMIN') {
    return { success: false, error: 'Only SUPER_ADMIN can modify ADMIN role' };
  }
  
  // ADMIN can only assign EMPLOYEE, SUPPORT, NONE
  if (actorScope.staffRole === 'ADMIN') {
    const allowedRoles: StaffRole[] = ['EMPLOYEE', 'SUPPORT', 'NONE'];
    if (!allowedRoles.includes(newRole)) {
      return { success: false, error: 'ADMIN can only assign EMPLOYEE, SUPPORT, or NONE' };
    }
  }
  
  const index = tenantUsers.findIndex(u => u.userId === targetUserId);
  tenantUsers[index] = { ...tenantUsers[index], staffRole: newRole };
  persist();
  
  // BACKEND TODO: Record role change in audit log
  console.log('[TenantUserStore] BACKEND STUB: changeStaffRole', targetUserId, newRole);
  
  return { success: true };
}

// =============================================================================
// INVITATION STUBS
// =============================================================================

/**
 * Invite a user to a tenant
 * BACKEND STUB: This would send an invitation email
 */
export function inviteUserToTenantStub(
  tenantId: string,
  email: string,
  role: TenantRole
): { success: boolean; inviteId?: string; error?: string } {
  // BACKEND TODO: Generate unique invite token
  // BACKEND TODO: Store pending invitation
  // BACKEND TODO: Send invitation email with link
  // BACKEND TODO: Set expiration (e.g., 7 days)
  
  console.log('[TenantUserStore] BACKEND STUB: inviteUserToTenant', {
    tenantId,
    email,
    role,
  });
  
  return {
    success: true,
    inviteId: `invite_${Date.now()}`,
  };
}

/**
 * Deactivate a tenant user
 * BACKEND STUB: This would revoke access
 */
export function deactivateTenantUserStub(
  tenantId: string,
  userId: string
): { success: boolean; error?: string } {
  const user = getTenantUserById(userId);
  
  if (!user) {
    return { success: false, error: 'User not found' };
  }
  
  if (user.tenantId !== tenantId) {
    return { success: false, error: 'User not in this tenant' };
  }
  
  if (user.tenantRole === 'OWNER') {
    return { success: false, error: 'Cannot deactivate tenant owner' };
  }
  
  // Update local store
  updateTenantUser(userId, { isActive: false });
  
  // BACKEND TODO: Revoke auth tokens
  // BACKEND TODO: Send notification email
  // BACKEND TODO: Record in audit log
  
  console.log('[TenantUserStore] BACKEND STUB: deactivateTenantUser', {
    tenantId,
    userId,
  });
  
  return { success: true };
}

// =============================================================================
// SCOPE HELPERS
// =============================================================================

/**
 * Build UserScope from a user ID
 */
export function buildUserScope(userId: string): UserScope | null {
  const user = getTenantUserById(userId);
  if (!user) return null;
  
  const tenant = getTenantById(user.tenantId);
  if (!tenant) return null;
  
  return {
    userId: user.userId,
    tenantId: user.tenantId,
    tenantRole: user.tenantRole,
    staffRole: user.staffRole,
    tenantContactZeroId: tenant.tenantContactZeroId,
  };
}

/**
 * Check if user can access Platform Admin
 */
export function canAccessPlatformAdmin(scope: UserScope): boolean {
  return scope.staffRole === 'SUPER_ADMIN' || scope.staffRole === 'ADMIN';
}

/**
 * Check if user can access Tenant Admin
 */
export function canAccessTenantAdmin(scope: UserScope): boolean {
  return scope.tenantRole === 'OWNER' || scope.tenantRole === 'MANAGER';
}

/**
 * Check if user is Tenant Owner
 */
export function isTenantOwner(scope: UserScope): boolean {
  return scope.tenantRole === 'OWNER';
}

/**
 * Check if user is Super Admin
 */
export function isSuperAdmin(scope: UserScope): boolean {
  return scope.staffRole === 'SUPER_ADMIN';
}

/**
 * Check if user has staff role
 */
export function hasStaffRole(scope: UserScope): boolean {
  return scope.staffRole !== 'NONE';
}

// =============================================================================
// QUERY HELPERS
// =============================================================================

/**
 * Get users with staff roles (Platform Admin)
 */
export function getUsersWithStaffRoles(): TenantUser[] {
  init();
  return tenantUsers.filter(u => u.staffRole !== 'NONE');
}

/**
 * Get active users for a tenant
 */
export function getActiveTenantUsers(tenantId: string): TenantUser[] {
  init();
  return tenantUsers.filter(u => u.tenantId === tenantId && u.isActive);
}

/**
 * Search users
 */
export function searchTenantUsers(query: string, tenantId?: string): TenantUser[] {
  init();
  const lowerQuery = query.toLowerCase();
  return tenantUsers.filter(u => {
    if (tenantId && u.tenantId !== tenantId) return false;
    return (
      u.displayName.toLowerCase().includes(lowerQuery) ||
      u.email.toLowerCase().includes(lowerQuery) ||
      u.userId.toLowerCase().includes(lowerQuery)
    );
  });
}

// =============================================================================
// INITIALIZATION HELPER
// =============================================================================

/**
 * Ensure super admin user exists
 */
export function ensureSuperAdminUser(
  tenantId: string,
  contactId: string,
  email: string
): TenantUser {
  init();
  
  let user = getTenantUserById(SUPER_ADMIN_USER_ID);
  if (!user) {
    user = {
      userId: SUPER_ADMIN_USER_ID,
      tenantId,
      contactId,
      email,
      displayName: 'Super Admin',
      tenantRole: 'OWNER',
      staffRole: 'SUPER_ADMIN',
      createdAt: new Date().toISOString(),
      isActive: true,
    };
    tenantUsers = [user, ...tenantUsers];
    persist();
  }
  
  return user;
}

/**
 * Reset store (for testing only)
 */
export function resetTenantUserStore(): void {
  tenantUsers = [];
  initialized = false;
  localStorage.removeItem(STORAGE_KEY);
}

