// =============================================================================
// TENANT ADMIN PORTAL — /admin
// =============================================================================
// Tenant-level admin panel visible to OWNER and MANAGER roles.
// Manages people, struggling users, beta status, and tenant settings.
// =============================================================================

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Users, AlertTriangle, FlaskConical, Settings, Search, MoreHorizontal,
  RefreshCw, UserPlus, Shield, ChevronDown, Mail
} from 'lucide-react';
import type { UserScope, TenantRole } from '../../types/multiTenant';
import { getTenantById } from '../../stores/tenantStore';
import { 
  getTenantUsers, 
  changeTenantRole,
  inviteUserToTenantStub,
  deactivateTenantUserStub,
  canAccessTenantAdmin,
  isTenantOwner
} from '../../stores/tenantUserStore';
import { 
  getStrugglingUsersInTenant, 
  getHealthLevelLabel, 
  getHealthLevelColor 
} from '../../stores/frameHealthStore';
import { 
  getCoachingCandidatesForTenant,
  sendManualCoachingNudge,
  getCandidateStatusLabel 
} from '../../stores/coachingStore';
import { 
  getBetaUsersForTenant,
  getBetaStatusLabel,
  getUsageStatusLabel 
} from '../../stores/betaProgramStore';
import { recordAdminAction } from '../../stores/adminAuditStore';

const MotionDiv = motion.div as any;

// =============================================================================
// TYPES
// =============================================================================

type AdminTab = 'people' | 'struggling' | 'beta' | 'settings';

interface TenantAdminPortalProps {
  userScope: UserScope;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const TenantAdminPortal: React.FC<TenantAdminPortalProps> = ({
  userScope,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('people');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [showInviteModal, setShowInviteModal] = useState(false);

  // Access check
  if (!canAccessTenantAdmin(userScope)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
        <div className="text-center p-8">
          <Shield size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400">You do not have permission to access the Tenant Admin portal.</p>
        </div>
      </div>
    );
  }

  const tenant = getTenantById(userScope.tenantId);
  const refresh = () => setRefreshKey(k => k + 1);

  const tabs: { id: AdminTab; label: string; icon: React.ReactNode }[] = [
    { id: 'people', label: 'People', icon: <Users size={16} /> },
    { id: 'struggling', label: 'Struggling Users', icon: <AlertTriangle size={16} /> },
    { id: 'beta', label: 'Beta Status', icon: <FlaskConical size={16} /> },
    { id: 'settings', label: 'Settings', icon: <Settings size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="border-b border-[#2A2A2A] bg-[#0E0E0E]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#4433FF]/20 rounded-lg border border-[#4433FF]/30">
                <Shield size={20} className="text-[#4433FF]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Tenant Admin</h1>
                <p className="text-xs text-gray-500">
                  {tenant?.name || 'Unknown Tenant'} • {isTenantOwner(userScope) ? 'Owner' : 'Manager'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={refresh}
                className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1D] border border-[#333] rounded-lg text-sm text-gray-400 hover:text-white hover:border-[#4433FF] transition-colors"
              >
                <RefreshCw size={14} />
                Refresh
              </button>
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center gap-2 px-3 py-2 bg-[#4433FF] text-white rounded-lg text-sm font-medium hover:bg-[#5544FF] transition-colors"
              >
                <UserPlus size={14} />
                Invite User
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-48 flex-shrink-0">
            <nav className="space-y-1">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-[#4433FF]/20 text-white border border-[#4433FF]/30'
                      : 'text-gray-400 hover:text-white hover:bg-[#1A1A1D]'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Search Bar */}
            <div className="mb-6">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  placeholder={`Search ${tabs.find(t => t.id === activeTab)?.label.toLowerCase()}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-[#1A1A1D] border border-[#333] rounded-lg text-sm text-white placeholder-gray-500 focus:border-[#4433FF] outline-none"
                />
              </div>
            </div>

            {/* Tab Content */}
            <MotionDiv
              key={`${activeTab}-${refreshKey}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-[#0E0E0E] rounded-xl border border-[#2A2A2A] overflow-hidden"
            >
              {activeTab === 'people' && (
                <PeoplePanel userScope={userScope} searchQuery={searchQuery} />
              )}
              {activeTab === 'struggling' && (
                <TenantStrugglingPanel userScope={userScope} searchQuery={searchQuery} />
              )}
              {activeTab === 'beta' && (
                <TenantBetaPanel userScope={userScope} searchQuery={searchQuery} />
              )}
              {activeTab === 'settings' && (
                <TenantSettingsPanel userScope={userScope} />
              )}
            </MotionDiv>
          </div>
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteUserModal
          userScope={userScope}
          onClose={() => setShowInviteModal(false)}
          onInvite={() => {
            setShowInviteModal(false);
            refresh();
          }}
        />
      )}
    </div>
  );
};

// =============================================================================
// PEOPLE PANEL
// =============================================================================

const PeoplePanel: React.FC<{ userScope: UserScope; searchQuery: string }> = ({
  userScope,
  searchQuery,
}) => {
  const users = useMemo(() => {
    const all = getTenantUsers(userScope.tenantId);
    if (!searchQuery) return all;
    const q = searchQuery.toLowerCase();
    return all.filter(u => 
      u.displayName.toLowerCase().includes(q) || 
      u.email.toLowerCase().includes(q)
    );
  }, [userScope.tenantId, searchQuery]);

  const isOwner = isTenantOwner(userScope);

  const handleRoleChange = (userId: string, newRole: TenantRole) => {
    const result = changeTenantRole(userScope, userId, newRole);
    if (!result.success) {
      alert(result.error);
    } else {
      recordAdminAction({
        actorUserId: userScope.userId,
        actorStaffRole: userScope.staffRole,
        scopeTenantId: userScope.tenantId,
        targetUserId: userId,
        actionType: 'TENANT_ROLE_CHANGE',
        metadata: { newRole },
      });
    }
  };

  return (
    <div>
      <div className="px-4 py-3 border-b border-[#2A2A2A]">
        <h3 className="text-sm font-bold text-white">Team Members ({users.length})</h3>
      </div>
      <div className="divide-y divide-[#1A1A1D]">
        {users.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No users found</div>
        ) : (
          users.map(user => (
            <div key={user.userId} className="p-4 hover:bg-[#1A1A1D] transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#4433FF]/20 flex items-center justify-center">
                    <span className="text-sm font-bold text-[#4433FF]">
                      {user.displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-white">{user.displayName}</div>
                    <div className="text-xs text-gray-500">{user.email}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Role selector */}
                  {isOwner && user.tenantRole !== 'OWNER' ? (
                    <select
                      value={user.tenantRole}
                      onChange={(e) => handleRoleChange(user.userId, e.target.value as TenantRole)}
                      className="text-xs bg-[#1A1A1D] border border-[#333] rounded px-2 py-1 text-gray-400"
                    >
                      <option value="MANAGER">Manager</option>
                      <option value="MEMBER">Member</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  ) : (
                    <span className={`text-xs px-2 py-1 rounded ${
                      user.tenantRole === 'OWNER' ? 'bg-[#4433FF]/20 text-[#4433FF]' :
                      user.tenantRole === 'MANAGER' ? 'bg-green-500/20 text-green-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {user.tenantRole}
                    </span>
                  )}
                  <span className={`text-xs ${user.isActive ? 'text-green-400' : 'text-red-400'}`}>
                    {user.isActive ? 'Active' : 'Inactive'}
                  </span>
                  {user.tenantRole !== 'OWNER' && isOwner && (
                    <button className="p-1 text-gray-500 hover:text-white">
                      <MoreHorizontal size={16} />
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Last login: {user.lastLoginAt 
                  ? new Date(user.lastLoginAt).toLocaleDateString()
                  : 'Never'}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// =============================================================================
// TENANT STRUGGLING USERS PANEL
// =============================================================================

const TenantStrugglingPanel: React.FC<{ userScope: UserScope; searchQuery: string }> = ({
  userScope,
  searchQuery,
}) => {
  const candidates = useMemo(() => {
    return getCoachingCandidatesForTenant(userScope.tenantId)
      .filter(c => c.lastFrameHealth.level !== 'GREEN');
  }, [userScope.tenantId]);

  return (
    <div>
      <div className="px-4 py-3 border-b border-[#2A2A2A]">
        <h3 className="text-sm font-bold text-white">Struggling Users ({candidates.length})</h3>
      </div>
      <div className="divide-y divide-[#1A1A1D]">
        {candidates.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <AlertTriangle size={32} className="mx-auto mb-2 text-gray-600" />
            <p>No struggling users in your team</p>
          </div>
        ) : (
          candidates.map(candidate => (
            <div key={candidate.id} className="p-4 hover:bg-[#1A1A1D] transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    candidate.lastFrameHealth.level === 'RED' ? 'bg-red-500' : 'bg-yellow-500'
                  }`} />
                  <div>
                    <div className="text-sm font-medium text-white">{candidate.userId}</div>
                    <div className="text-xs text-gray-500">
                      {candidate.reasons.slice(0, 2).join(' • ')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-1 bg-[#1A1A1D] border border-[#333] rounded">
                    {getCandidateStatusLabel(candidate.status)}
                  </span>
                  <button
                    onClick={() => sendManualCoachingNudge(candidate.id)}
                    className="p-1.5 bg-[#4433FF]/20 text-[#4433FF] rounded hover:bg-[#4433FF]/30 transition-colors"
                    title="Send coaching nudge"
                  >
                    <Mail size={14} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// =============================================================================
// TENANT BETA PANEL
// =============================================================================

const TenantBetaPanel: React.FC<{ userScope: UserScope; searchQuery: string }> = ({
  userScope,
  searchQuery,
}) => {
  const betaUsers = useMemo(() => {
    return getBetaUsersForTenant(userScope.tenantId);
  }, [userScope.tenantId]);

  return (
    <div>
      <div className="px-4 py-3 border-b border-[#2A2A2A]">
        <h3 className="text-sm font-bold text-white">Beta Users ({betaUsers.length})</h3>
      </div>
      <div className="divide-y divide-[#1A1A1D]">
        {betaUsers.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            <FlaskConical size={32} className="mx-auto mb-2 text-gray-600" />
            <p>No beta users in your team</p>
          </div>
        ) : (
          betaUsers.map(user => (
            <div key={user.userId} className="p-4 hover:bg-[#1A1A1D] transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">{user.userId}</div>
                  <div className="text-xs text-gray-500">
                    Logins: {user.metrics.logins} • Notes: {user.metrics.notesCreated}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded border ${
                    user.betaStatus === 'BETA_ACTIVE' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    user.betaStatus === 'BETA_WARNING' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                    'bg-red-500/20 text-red-400 border-red-500/30'
                  }`}>
                    {getBetaStatusLabel(user.betaStatus)}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded border ${
                    user.usageStatus === 'HEALTHY' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    user.usageStatus === 'WARNING' ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' :
                    'bg-red-500/20 text-red-400 border-red-500/30'
                  }`}>
                    {getUsageStatusLabel(user.usageStatus)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// =============================================================================
// TENANT SETTINGS PANEL
// =============================================================================

const TenantSettingsPanel: React.FC<{ userScope: UserScope }> = ({
  userScope,
}) => {
  const tenant = getTenantById(userScope.tenantId);

  return (
    <div className="p-6">
      <h3 className="text-sm font-bold text-white mb-4">Tenant Settings</h3>
      <div className="space-y-4">
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider">Tenant Name</label>
          <div className="text-sm text-white mt-1">{tenant?.name || 'Unknown'}</div>
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider">Tenant ID</label>
          <div className="text-sm text-white font-mono mt-1">{tenant?.tenantId || 'Unknown'}</div>
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider">Plan</label>
          <div className="text-sm text-white mt-1">{tenant?.planName || 'Unknown'}</div>
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider">Status</label>
          <div className="mt-1">
            <span className={`text-xs px-2 py-1 rounded ${
              tenant?.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
              tenant?.status === 'TRIAL' ? 'bg-blue-500/20 text-blue-400' :
              'bg-gray-500/20 text-gray-400'
            }`}>
              {tenant?.status || 'Unknown'}
            </span>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 uppercase tracking-wider">Created</label>
          <div className="text-sm text-white mt-1">
            {tenant?.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : 'Unknown'}
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// INVITE USER MODAL
// =============================================================================

const InviteUserModal: React.FC<{
  userScope: UserScope;
  onClose: () => void;
  onInvite: () => void;
}> = ({ userScope, onClose, onInvite }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TenantRole>('MEMBER');
  const [isLoading, setIsLoading] = useState(false);

  const handleInvite = () => {
    if (!email.trim()) {
      alert('Please enter an email address');
      return;
    }

    setIsLoading(true);
    
    const result = inviteUserToTenantStub(userScope.tenantId, email.trim(), role);
    
    if (result.success) {
      recordAdminAction({
        actorUserId: userScope.userId,
        actorStaffRole: userScope.staffRole,
        scopeTenantId: userScope.tenantId,
        actionType: 'TENANT_ROLE_CHANGE',
        metadata: { action: 'invite', email, role },
      });
      onInvite();
    } else {
      alert(result.error || 'Failed to send invitation');
    }
    
    setIsLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#0E0E0E] rounded-xl border border-[#2A2A2A] w-full max-w-md p-6">
        <h3 className="text-lg font-bold text-white mb-4">Invite User</h3>
        
        <div className="space-y-4">
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 bg-[#1A1A1D] border border-[#333] rounded-lg text-sm text-white placeholder-gray-500 focus:border-[#4433FF] outline-none"
            />
          </div>
          
          <div>
            <label className="text-xs text-gray-500 uppercase tracking-wider block mb-1">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as TenantRole)}
              className="w-full px-3 py-2 bg-[#1A1A1D] border border-[#333] rounded-lg text-sm text-white focus:border-[#4433FF] outline-none"
            >
              {isTenantOwner(userScope) && <option value="MANAGER">Manager</option>}
              <option value="MEMBER">Member</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>
        </div>
        
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleInvite}
            disabled={isLoading}
            className="px-4 py-2 bg-[#4433FF] text-white rounded-lg text-sm font-medium hover:bg-[#5544FF] disabled:opacity-50 transition-colors"
          >
            {isLoading ? 'Sending...' : 'Send Invitation'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TenantAdminPortal;

