// =============================================================================
// DATA REQUEST STORE — Data export and deletion requests
// =============================================================================
// Manages user requests for data export and account deletion.
// All status changes are logged in audit log.
// =============================================================================

import type { DataRequest, DataRequestType, DataRequestStatus } from '../types/multiTenant';

const STORAGE_KEY = 'framelord_data_requests';

// In-memory cache
let requests: DataRequest[] = [];
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
        requests = parsed;
      }
    }
  } catch {
    console.warn('[DataRequestStore] Failed to load from localStorage');
  }
  
  initialized = true;
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  } catch {
    console.warn('[DataRequestStore] Failed to persist to localStorage');
  }
}

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

/**
 * Create a data request
 */
export function createDataRequest(
  tenantId: string,
  userId: string,
  type: DataRequestType,
  note?: string
): DataRequest {
  init();
  
  const request: DataRequest = {
    id: `dr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    tenantId,
    userId,
    type,
    status: 'REQUESTED',
    requestedAt: new Date().toISOString(),
    note,
  };
  
  requests = [request, ...requests];
  persist();
  
  // BACKEND TODO: Send confirmation email to user
  // BACKEND TODO: Notify admins of new request
  // BACKEND TODO: Record in audit log
  console.log('[DataRequestStore] Request created:', request.id, type);
  
  return request;
}

/**
 * Get data request by ID
 */
export function getDataRequestById(id: string): DataRequest | null {
  init();
  return requests.find(r => r.id === id) ?? null;
}

/**
 * Get data requests for a user
 */
export function getDataRequestsForUser(
  tenantId: string,
  userId: string
): DataRequest[] {
  init();
  return requests.filter(r => 
    r.tenantId === tenantId && r.userId === userId
  );
}

/**
 * Update data request status
 */
export function updateDataRequestStatus(
  id: string,
  status: DataRequestStatus,
  note?: string
): DataRequest | null {
  init();
  
  const index = requests.findIndex(r => r.id === id);
  if (index < 0) return null;
  
  requests[index] = {
    ...requests[index],
    status,
    note: note ?? requests[index].note,
    resolvedAt: status === 'COMPLETED' || status === 'DECLINED' 
      ? new Date().toISOString() 
      : requests[index].resolvedAt,
  };
  
  persist();
  
  // BACKEND TODO: Record status change in audit log
  // BACKEND TODO: Send notification email to user
  console.log('[DataRequestStore] Status updated:', id, status);
  
  return requests[index];
}

/**
 * Request data export
 */
export function requestDataExport(
  tenantId: string,
  userId: string,
  note?: string
): DataRequest {
  return createDataRequest(tenantId, userId, 'EXPORT', note);
}

/**
 * Request account deletion
 */
export function requestAccountDeletion(
  tenantId: string,
  userId: string,
  note?: string
): DataRequest {
  return createDataRequest(tenantId, userId, 'DELETE', note);
}

/**
 * Check if user has pending data request
 */
export function hasPendingDataRequest(
  tenantId: string,
  userId: string,
  type?: DataRequestType
): boolean {
  const userRequests = getDataRequestsForUser(tenantId, userId);
  return userRequests.some(r => {
    const isPending = r.status === 'REQUESTED' || r.status === 'IN_PROGRESS';
    if (type) {
      return isPending && r.type === type;
    }
    return isPending;
  });
}

// =============================================================================
// ADMIN OPERATIONS
// =============================================================================

/**
 * Get all data requests (Platform Admin)
 */
export function getAllDataRequests(): DataRequest[] {
  init();
  return [...requests];
}

/**
 * Get data requests by status
 */
export function getDataRequestsByStatus(status: DataRequestStatus): DataRequest[] {
  init();
  return requests.filter(r => r.status === status);
}

/**
 * Get data requests by type
 */
export function getDataRequestsByType(type: DataRequestType): DataRequest[] {
  init();
  return requests.filter(r => r.type === type);
}

/**
 * Get pending data requests
 */
export function getPendingDataRequests(): DataRequest[] {
  init();
  return requests.filter(r => 
    r.status === 'REQUESTED' || r.status === 'IN_PROGRESS'
  );
}

/**
 * Get data requests for a tenant
 */
export function getDataRequestsForTenant(tenantId: string): DataRequest[] {
  init();
  return requests.filter(r => r.tenantId === tenantId);
}

/**
 * Start processing a request
 */
export function startProcessingRequest(id: string): DataRequest | null {
  return updateDataRequestStatus(id, 'IN_PROGRESS');
}

/**
 * Complete a request
 */
export function completeRequest(id: string, note?: string): DataRequest | null {
  return updateDataRequestStatus(id, 'COMPLETED', note);
}

/**
 * Decline a request
 */
export function declineRequest(id: string, note?: string): DataRequest | null {
  return updateDataRequestStatus(id, 'DECLINED', note);
}

// =============================================================================
// STATUS HELPERS
// =============================================================================

export function getRequestTypeLabel(type: DataRequestType): string {
  const labels: Record<DataRequestType, string> = {
    EXPORT: 'Data Export',
    DELETE: 'Account Deletion',
  };
  return labels[type];
}

export function getRequestStatusLabel(status: DataRequestStatus): string {
  const labels: Record<DataRequestStatus, string> = {
    REQUESTED: 'Requested',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    DECLINED: 'Declined',
  };
  return labels[status];
}

export function getRequestStatusColor(status: DataRequestStatus): string {
  const colors: Record<DataRequestStatus, string> = {
    REQUESTED: 'text-yellow-400',
    IN_PROGRESS: 'text-blue-400',
    COMPLETED: 'text-green-400',
    DECLINED: 'text-red-400',
  };
  return colors[status];
}

// =============================================================================
// RESET (TESTING ONLY)
// =============================================================================

export function resetDataRequestStore(): void {
  requests = [];
  initialized = false;
  localStorage.removeItem(STORAGE_KEY);
}







