import React from 'react';
import { Dashboard } from './components/Dashboard';
import type { UserScope } from './types/multiTenant';

type ViewType = 'dashboard';

// =============================================================================
// MOCK USER SCOPES FOR TESTING (kept for dashboard needs)
// =============================================================================

// Platform Super Admin - uses Platform Admin portal
const MOCK_SUPER_ADMIN_SCOPE: UserScope = {
  userId: 'user_super_admin_123',
  tenantId: 'tenant_demo_001',
  tenantRole: 'OWNER',
  staffRole: 'SUPER_ADMIN',
  tenantContactZeroId: 'contact_zero_demo_001',
};

// Enterprise Tenant Owner - uses Tenant Admin portal
// staffRole must be NONE, tenant must be TEAM or ENTERPRISE plan
const MOCK_ENTERPRISE_OWNER_SCOPE: UserScope = {
  userId: 'user_enterprise_owner_456',
  tenantId: 'tenant_enterprise_001',
  tenantRole: 'OWNER',
  staffRole: 'NONE',
  tenantContactZeroId: 'contact_zero_enterprise_001',
};

// Ensure enterprise tenant exists for testing
function ensureEnterpriseTenantExists() {
  const STORAGE_KEY = 'framelord_tenants';
  const tenantId = 'tenant_enterprise_001';
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    let tenants = stored ? JSON.parse(stored) : [];
    
    const existingIndex = tenants.findIndex((t: any) => t.tenantId === tenantId);
    
    const enterpriseTenant = {
      tenantId,
      name: 'Demo Enterprise Team',
      createdAt: new Date().toISOString(),
      status: 'ACTIVE',
      planName: 'TEAM',
      planCode: 'TEAM',
      ownerUserId: 'user_enterprise_owner_456',
      tenantContactZeroId: 'contact_zero_enterprise_001',
      seatCount: 10,
    };
    
    if (existingIndex >= 0) {
      tenants[existingIndex] = { ...tenants[existingIndex], ...enterpriseTenant };
    } else {
      tenants.unshift(enterpriseTenant);
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tenants));
  } catch (e) {
    console.warn('[App] Failed to ensure enterprise tenant:', e);
  }
}

// Initialize enterprise tenant on load
ensureEnterpriseTenantExists();

const App: React.FC = () => {
  // Single view: dashboard only
  const currentView: ViewType = 'dashboard';
  
  if (currentView === 'dashboard') {
    return <Dashboard />;
  }

  return <Dashboard />;
};

export default App;
