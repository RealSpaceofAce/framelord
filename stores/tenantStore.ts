// =============================================================================
// TENANT STORE — Multi-tenant isolation layer
// =============================================================================
// Manages tenant data with absolute isolation.
// All tenant-facing operations must pass tenantId.
// Contact spine centrality is maintained through tenantContactZeroId.
// =============================================================================

import type { Tenant, TenantStatus, TenantPlanCode } from '../types/multiTenant';

const STORAGE_KEY = 'framelord_tenants';

// In-memory cache
let tenants: Tenant[] = [];
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
        tenants = parsed;
      }
    }
  } catch {
    console.warn('[TenantStore] Failed to load from localStorage');
  }
  
  initialized = true;
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tenants));
  } catch {
    console.warn('[TenantStore] Failed to persist to localStorage');
  }
}

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

/**
 * Get all tenants (Platform Admin only)
 */
export function getAllTenants(): Tenant[] {
  init();
  return [...tenants];
}

/**
 * Get a tenant by ID
 */
export function getTenantById(tenantId: string): Tenant | null {
  init();
  return tenants.find(t => t.tenantId === tenantId) ?? null;
}

/**
 * Get tenant by owner user ID
 */
export function getTenantByOwnerUserId(ownerUserId: string): Tenant | null {
  init();
  return tenants.find(t => t.ownerUserId === ownerUserId) ?? null;
}

/**
 * Create a new tenant
 * BACKEND STUB: This would create tenant in database and set up billing
 * 
 * @param planCode - Determines if tenant is enterprise (TEAM/ENTERPRISE) or solo (FREE/BETA/PRO)
 */
export function createTenant(
  name: string,
  ownerUserId: string,
  tenantContactZeroId: string,
  planCode: TenantPlanCode = 'FREE',
  seatCount?: number
): Tenant {
  init();
  
  const tenant: Tenant = {
    tenantId: `tenant_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    name,
    createdAt: new Date().toISOString(),
    status: 'TRIAL',
    planName: planCode, // Legacy field - keep in sync with planCode
    planCode,
    ownerUserId,
    tenantContactZeroId,
    seatCount: seatCount ?? (planCode === 'TEAM' ? 5 : planCode === 'ENTERPRISE' ? 25 : undefined),
  };
  
  tenants = [tenant, ...tenants];
  persist();
  
  // BACKEND TODO: Create tenant record in database
  // BACKEND TODO: Set up billing subscription
  // BACKEND TODO: Create audit log entry
  console.log('[TenantStore] BACKEND STUB: createTenant', tenant.tenantId, 'planCode:', planCode);
  
  return tenant;
}

/**
 * Update tenant details
 */
export function updateTenant(
  tenantId: string,
  updates: Partial<Pick<Tenant, 'name' | 'planName' | 'planCode' | 'status' | 'seatCount'>>
): Tenant | null {
  init();
  
  const index = tenants.findIndex(t => t.tenantId === tenantId);
  if (index < 0) return null;
  
  // Keep planName and planCode in sync
  if (updates.planCode && !updates.planName) {
    updates.planName = updates.planCode;
  }
  
  tenants[index] = { ...tenants[index], ...updates };
  persist();
  
  // BACKEND TODO: Update tenant in database
  console.log('[TenantStore] BACKEND STUB: updateTenant', tenantId, updates);
  
  return tenants[index];
}

/**
 * Change tenant plan (Platform Admin action)
 * BACKEND STUB: This would update billing
 * 
 * NOTE: Changing to TEAM or ENTERPRISE makes this an enterprise tenant with Tenant Admin
 */
export function changeTenantPlan(tenantId: string, newPlanCode: TenantPlanCode, newSeatCount?: number): Tenant | null {
  // BACKEND TODO: Validate plan exists
  // BACKEND TODO: Update billing subscription
  // BACKEND TODO: Record admin action in audit log
  console.log('[TenantStore] BACKEND STUB: changeTenantPlan', tenantId, newPlanCode);
  
  return updateTenant(tenantId, { 
    planCode: newPlanCode, 
    planName: newPlanCode,
    seatCount: newSeatCount ?? (newPlanCode === 'TEAM' ? 5 : newPlanCode === 'ENTERPRISE' ? 25 : undefined),
  });
}

/**
 * Change tenant status (Platform Admin action)
 * BACKEND STUB: This would handle suspension/cancellation logic
 */
export function changeTenantStatus(tenantId: string, newStatus: TenantStatus): Tenant | null {
  // BACKEND TODO: Handle status-specific logic (suspend access, etc.)
  // BACKEND TODO: Send notification emails
  // BACKEND TODO: Record admin action in audit log
  console.log('[TenantStore] BACKEND STUB: changeTenantStatus', tenantId, newStatus);
  
  return updateTenant(tenantId, { status: newStatus });
}

/**
 * Delete tenant (DANGEROUS - Platform Admin only)
 * BACKEND STUB: This would cascade delete all tenant data
 */
export function deleteTenant(tenantId: string): boolean {
  init();
  
  const index = tenants.findIndex(t => t.tenantId === tenantId);
  if (index < 0) return false;
  
  tenants = tenants.filter(t => t.tenantId !== tenantId);
  persist();
  
  // BACKEND TODO: Cascade delete all tenant data
  // BACKEND TODO: Cancel billing subscription
  // BACKEND TODO: Send confirmation email
  // BACKEND TODO: Record admin action in audit log
  console.log('[TenantStore] BACKEND STUB: deleteTenant (DANGEROUS)', tenantId);
  
  return true;
}

// =============================================================================
// QUERY HELPERS
// =============================================================================

/**
 * Get tenants by status
 */
export function getTenantsByStatus(status: TenantStatus): Tenant[] {
  init();
  return tenants.filter(t => t.status === status);
}

/**
 * Get active tenants count
 */
export function getActiveTenantCount(): number {
  init();
  return tenants.filter(t => t.status === 'ACTIVE' || t.status === 'TRIAL').length;
}

/**
 * Search tenants by name
 */
export function searchTenants(query: string): Tenant[] {
  init();
  const lowerQuery = query.toLowerCase();
  return tenants.filter(t => 
    t.name.toLowerCase().includes(lowerQuery) ||
    t.tenantId.toLowerCase().includes(lowerQuery)
  );
}

// =============================================================================
// INITIALIZATION HELPER FOR DEVELOPMENT
// =============================================================================

/**
 * Create a default tenant for development if none exists
 * 
 * @param planCode - Set to TEAM or ENTERPRISE to create an enterprise tenant for testing
 */
export function ensureDefaultTenant(
  ownerUserId: string,
  tenantContactZeroId: string,
  planCode: TenantPlanCode = 'FREE'
): Tenant {
  init();
  
  let tenant = getTenantByOwnerUserId(ownerUserId);
  if (!tenant) {
    tenant = createTenant('Default Tenant', ownerUserId, tenantContactZeroId, planCode);
  }
  
  return tenant;
}

/**
 * Reset store (for testing only)
 */
export function resetTenantStore(): void {
  tenants = [];
  initialized = false;
  localStorage.removeItem(STORAGE_KEY);
}

