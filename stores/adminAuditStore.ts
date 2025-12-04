// =============================================================================
// ADMIN AUDIT STORE — Audit log for all admin actions
// =============================================================================
// Records all administrative actions for compliance and debugging.
// All admin operations must call recordAdminAction.
// =============================================================================

import type { AdminAction, AdminActionType, StaffRole } from '../types/multiTenant';

const STORAGE_KEY = 'framelord_admin_audit';

// In-memory cache
let auditLog: AdminAction[] = [];
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
        auditLog = parsed;
      }
    }
  } catch {
    console.warn('[AdminAuditStore] Failed to load from localStorage');
  }
  
  initialized = true;
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(auditLog));
  } catch {
    console.warn('[AdminAuditStore] Failed to persist to localStorage');
  }
}

// =============================================================================
// RECORD ACTION
// =============================================================================

/**
 * Record an admin action in the audit log
 */
export function recordAdminAction(action: Omit<AdminAction, 'id' | 'timestamp'>): AdminAction {
  init();
  
  const record: AdminAction = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    timestamp: new Date().toISOString(),
    ...action,
  };
  
  auditLog = [record, ...auditLog];
  persist();
  
  // BACKEND TODO: Send to centralized logging service
  // BACKEND TODO: Store in database with indexing
  console.log('[AdminAuditStore] Action recorded:', record);
  
  return record;
}

// =============================================================================
// QUERY OPERATIONS
// =============================================================================

/**
 * Get all audit log entries
 */
export function getAllAuditLogs(): AdminAction[] {
  init();
  return [...auditLog];
}

/**
 * Get audit logs with filters
 */
export interface AuditLogFilters {
  actorUserId?: string;
  targetUserId?: string;
  scopeTenantId?: string;
  actionType?: AdminActionType;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export function getFilteredAuditLogs(filters: AuditLogFilters): AdminAction[] {
  init();
  
  let results = [...auditLog];
  
  if (filters.actorUserId) {
    results = results.filter(a => a.actorUserId === filters.actorUserId);
  }
  
  if (filters.targetUserId) {
    results = results.filter(a => a.targetUserId === filters.targetUserId);
  }
  
  if (filters.scopeTenantId) {
    results = results.filter(a => a.scopeTenantId === filters.scopeTenantId);
  }
  
  if (filters.actionType) {
    results = results.filter(a => a.actionType === filters.actionType);
  }
  
  if (filters.startDate) {
    const start = new Date(filters.startDate).getTime();
    results = results.filter(a => new Date(a.timestamp).getTime() >= start);
  }
  
  if (filters.endDate) {
    const end = new Date(filters.endDate).getTime();
    results = results.filter(a => new Date(a.timestamp).getTime() <= end);
  }
  
  // Sort by timestamp descending (most recent first)
  results.sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  
  if (filters.limit) {
    results = results.slice(0, filters.limit);
  }
  
  return results;
}

/**
 * Get audit logs for a specific tenant
 */
export function getAuditLogsForTenant(tenantId: string): AdminAction[] {
  return getFilteredAuditLogs({ scopeTenantId: tenantId });
}

/**
 * Get audit logs by actor
 */
export function getAuditLogsByActor(actorUserId: string): AdminAction[] {
  return getFilteredAuditLogs({ actorUserId });
}

/**
 * Get recent audit logs
 */
export function getRecentAuditLogs(count: number = 50): AdminAction[] {
  return getFilteredAuditLogs({ limit: count });
}

// =============================================================================
// ACTION TYPE HELPERS
// =============================================================================

/**
 * Get human-readable label for action type
 */
export function getActionTypeLabel(actionType: AdminActionType): string {
  const labels: Record<AdminActionType, string> = {
    TENANT_PLAN_CHANGE: 'Tenant Plan Changed',
    TENANT_STATUS_CHANGE: 'Tenant Status Changed',
    STAFF_ROLE_CHANGE: 'Staff Role Changed',
    TENANT_ROLE_CHANGE: 'Tenant Role Changed',
    ACCOUNT_SUSPEND: 'Account Suspended',
    ACCOUNT_UNSUSPEND: 'Account Unsuspended',
    EMAIL_PREF_CHANGE: 'Email Preferences Changed',
    COACHING_STATUS_CHANGE: 'Coaching Status Changed',
    BETA_STATUS_CHANGE: 'Beta Status Changed',
    MANUAL_NOTIFICATION: 'Manual Notification Sent',
    DATA_REQUEST_STATUS_CHANGE: 'Data Request Status Changed',
  };
  return labels[actionType] || actionType;
}

/**
 * Get all action types
 */
export function getAllActionTypes(): AdminActionType[] {
  return [
    'TENANT_PLAN_CHANGE',
    'TENANT_STATUS_CHANGE',
    'STAFF_ROLE_CHANGE',
    'TENANT_ROLE_CHANGE',
    'ACCOUNT_SUSPEND',
    'ACCOUNT_UNSUSPEND',
    'EMAIL_PREF_CHANGE',
    'COACHING_STATUS_CHANGE',
    'BETA_STATUS_CHANGE',
    'MANUAL_NOTIFICATION',
    'DATA_REQUEST_STATUS_CHANGE',
  ];
}

// =============================================================================
// RESET (TESTING ONLY)
// =============================================================================

export function resetAdminAuditStore(): void {
  auditLog = [];
  initialized = false;
  localStorage.removeItem(STORAGE_KEY);
}

