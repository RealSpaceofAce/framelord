// =============================================================================
// PLATFORM ADMIN PORTAL — /super-admin
// =============================================================================
// Platform-wide admin panel visible only to SUPER_ADMIN and ADMIN staff roles.
// Manages tenants, users, struggling users, beta usage, data requests, and logs.
// =============================================================================

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Building2, Users, AlertTriangle, FlaskConical, FileDown, ScrollText,
  ShieldCheck, ChevronRight, Search, Filter, MoreHorizontal, RefreshCw,
  Mail, Clock, CheckCircle, XCircle, AlertCircle, UserPlus, Ban, Play,
  Target, Calendar, BarChart3, Activity, Radio, User, ClipboardList, Eye,
  ChevronDown, ChevronUp, Phone
} from 'lucide-react';
import type { UserScope, AdminActionType } from '../../types/multiTenant';
import {
  CoachingApplicationsPanel,
  BetaApplicationsPanel,
  PendingCallsPanel,
  CaseCallApplicationsPanel,
} from './ApplicationAdminPanels';
import {
  UsageAnalyticsPanel,
  EnterpriseUsagePanel,
  UserUsagePanel,
  FrameScoreAnalyticsPanel,
  BroadcastPanel,
} from './panels';
import { getAllTenants, changeTenantPlan, changeTenantStatus } from '../../stores/tenantStore';
import { 
  getAllTenantUsers, 
  changeStaffRole, 
  getUsersWithStaffRoles,
  canAccessPlatformAdmin,
  isSuperAdmin,
} from '../../stores/tenantUserStore';
import { getAllStrugglingUsers, getHealthLevelLabel, getHealthLevelColor } from '../../stores/frameHealthStore';
import { 
  getAllCoachingCandidates, 
  updateCoachingCandidateStatus,
  sendManualCoachingNudge,
  getCandidateStatusLabel 
} from '../../stores/coachingStore';
import { 
  getAllBetaUsers, 
  extendBeta, 
  revokeBeta, 
  sendManualBetaNudge,
  getBetaStatusLabel,
  getUsageStatusLabel 
} from '../../stores/betaProgramStore';
import { 
  getAllDataRequests, 
  updateDataRequestStatus,
  getRequestTypeLabel,
  getRequestStatusLabel,
  getRequestStatusColor 
} from '../../stores/dataRequestStore';
import {
  getFilteredAuditLogs,
  getAllActionTypes,
  getActionTypeLabel
} from '../../stores/adminAuditStore';
import { recordAdminAction } from '../../stores/adminAuditStore';
import { getAllSessions, getSessionById } from '../../services/intakeStore';
import { getContactById } from '../../services/contactStore';
import type { IntakeSession, Answer } from '../../types/businessFrame';

const MotionDiv = motion.div as any;

// =============================================================================
// TYPES
// =============================================================================

type AdminTab =
  | 'tenants'
  | 'users'
  | 'coaching-apps'
  | 'beta-apps'
  | 'case-call-apps'
  | 'pending-calls'
  | 'struggling'
  | 'intake-sessions'
  | 'usage-analytics'
  | 'enterprise-usage'
  | 'user-usage'
  | 'frame-score-analytics'
  | 'data-requests'
  | 'logs'
  | 'staff-roles'
  | 'broadcast';

interface PlatformAdminPortalProps {
  userScope: UserScope;
  userEmail?: string | null;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const PlatformAdminPortal: React.FC<PlatformAdminPortalProps> = ({
  userScope,
  userEmail,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('tenants');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  // Access check - checks both email allowlist and staffRole
  if (!canAccessPlatformAdmin(userScope, userEmail)) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0A0A0A]">
        <div className="text-center p-8">
          <ShieldCheck size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Access Denied</h1>
          <p className="text-gray-400">You do not have permission to access the Platform Admin portal.</p>
        </div>
      </div>
    );
  }

  const refresh = () => setRefreshKey(k => k + 1);

  // Build tabs based on role - some tabs are Super Admin only
  const isSuperAdminUser = isSuperAdmin(userScope);
  
  const allTabs: { id: AdminTab; label: string; icon: React.ReactNode; superAdminOnly?: boolean }[] = [
    { id: 'tenants', label: 'Tenants', icon: <Building2 size={16} /> },
    { id: 'users', label: 'Users', icon: <Users size={16} /> },
    { id: 'coaching-apps', label: 'Coaching Apps', icon: <Target size={16} /> },
    { id: 'beta-apps', label: 'Beta Apps', icon: <FlaskConical size={16} /> },
    { id: 'case-call-apps', label: 'Case Calls', icon: <Phone size={16} /> },
    { id: 'pending-calls', label: 'Pending Calls', icon: <Calendar size={16} /> },
    { id: 'struggling', label: 'Struggling Users', icon: <AlertTriangle size={16} /> },
    { id: 'intake-sessions', label: 'Intake Sessions', icon: <ClipboardList size={16} /> },
    { id: 'usage-analytics', label: 'Usage Analytics', icon: <Activity size={16} /> },
    { id: 'enterprise-usage', label: 'Enterprise Usage', icon: <BarChart3 size={16} /> },
    { id: 'user-usage', label: 'User Usage', icon: <User size={16} /> },
    { id: 'frame-score-analytics', label: 'Frame Score Analytics', icon: <Target size={16} /> },
    { id: 'data-requests', label: 'Data Requests', icon: <FileDown size={16} /> },
    { id: 'logs', label: 'System Logs', icon: <ScrollText size={16} />, superAdminOnly: true },
    { id: 'staff-roles', label: 'Staff Roles', icon: <ShieldCheck size={16} />, superAdminOnly: true },
    { id: 'broadcast', label: 'Broadcast', icon: <Radio size={16} />, superAdminOnly: true },
  ];
  
  const tabs = allTabs.filter(tab => !tab.superAdminOnly || isSuperAdminUser);

  return (
    <div className="min-h-screen bg-[#0A0A0A]">
      {/* Header */}
      <div className="border-b border-[#2A2A2A] bg-[#0E0E0E]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg border border-red-500/30">
                <ShieldCheck size={20} className="text-red-400" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Platform Admin</h1>
                <p className="text-xs text-gray-500">
                  {userScope.staffRole === 'SUPER_ADMIN' ? 'Super Admin' : 'Admin'} Access
                </p>
              </div>
            </div>
            <button
              onClick={refresh}
              className="flex items-center gap-2 px-3 py-2 bg-[#1A1A1D] border border-[#333] rounded-lg text-sm text-gray-400 hover:text-white hover:border-[#4433FF] transition-colors"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-56 flex-shrink-0">
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
              {activeTab === 'tenants' && (
                <TenantsPanel userScope={userScope} searchQuery={searchQuery} />
              )}
              {activeTab === 'users' && (
                <UsersPanel userScope={userScope} searchQuery={searchQuery} />
              )}
              {activeTab === 'coaching-apps' && (
                <CoachingApplicationsPanel userScope={userScope} />
              )}
              {activeTab === 'beta-apps' && (
                <BetaApplicationsPanel userScope={userScope} />
              )}
              {activeTab === 'case-call-apps' && (
                <CaseCallApplicationsPanel userScope={userScope} />
              )}
              {activeTab === 'pending-calls' && (
                <PendingCallsPanel userScope={userScope} />
              )}
              {activeTab === 'struggling' && (
                <StrugglingUsersPanel userScope={userScope} searchQuery={searchQuery} />
              )}
              {activeTab === 'intake-sessions' && (
                <IntakeSessionsPanel userScope={userScope} searchQuery={searchQuery} />
              )}
              {activeTab === 'usage-analytics' && (
                <UsageAnalyticsPanel userScope={userScope} />
              )}
              {activeTab === 'enterprise-usage' && (
                <EnterpriseUsagePanel 
                  userScope={userScope} 
                  onViewUserUsage={(tenantId) => {
                    // Navigate to user usage with tenant filter
                    setActiveTab('user-usage');
                  }}
                />
              )}
              {activeTab === 'user-usage' && (
                <UserUsagePanel userScope={userScope} showTenantColumn={true} />
              )}
              {activeTab === 'frame-score-analytics' && (
                <FrameScoreAnalyticsPanel userScope={userScope} />
              )}
              {activeTab === 'data-requests' && (
                <DataRequestsPanel userScope={userScope} searchQuery={searchQuery} />
              )}
              {activeTab === 'logs' && (
                <SystemLogsPanel userScope={userScope} searchQuery={searchQuery} />
              )}
              {activeTab === 'staff-roles' && (
                <StaffRolesPanel userScope={userScope} searchQuery={searchQuery} />
              )}
              {activeTab === 'broadcast' && (
                <BroadcastPanel userScope={userScope} />
              )}
            </MotionDiv>
          </div>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// TENANTS PANEL
// =============================================================================

const TenantsPanel: React.FC<{ userScope: UserScope; searchQuery: string }> = ({
  userScope,
  searchQuery,
}) => {
  const tenants = useMemo(() => {
    const all = getAllTenants();
    if (!searchQuery) return all;
    const q = searchQuery.toLowerCase();
    return all.filter(t => 
      t.name.toLowerCase().includes(q) || 
      t.tenantId.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div>
      <div className="px-4 py-3 border-b border-[#2A2A2A]">
        <h3 className="text-sm font-bold text-white">All Tenants ({tenants.length})</h3>
      </div>
      <div className="divide-y divide-[#1A1A1D]">
        {tenants.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No tenants found</div>
        ) : (
          tenants.map(tenant => (
            <div key={tenant.tenantId} className="p-4 hover:bg-[#1A1A1D] transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">{tenant.name}</div>
                  <div className="text-xs text-gray-500 font-mono">{tenant.tenantId}</div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-1 rounded border ${
                    tenant.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                    tenant.status === 'TRIAL' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                    tenant.status === 'SUSPENDED' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                    'bg-gray-500/20 text-gray-400 border-gray-500/30'
                  }`}>
                    {tenant.status}
                  </span>
                  <span className="text-xs text-gray-500">{tenant.planName}</span>
                  <button className="p-1 text-gray-500 hover:text-white">
                    <MoreHorizontal size={16} />
                  </button>
                </div>
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Created: {new Date(tenant.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// =============================================================================
// USERS PANEL
// =============================================================================

const UsersPanel: React.FC<{ userScope: UserScope; searchQuery: string }> = ({
  userScope,
  searchQuery,
}) => {
  const users = useMemo(() => {
    const all = getAllTenantUsers();
    if (!searchQuery) return all;
    const q = searchQuery.toLowerCase();
    return all.filter(u => 
      u.displayName.toLowerCase().includes(q) || 
      u.email.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div>
      <div className="px-4 py-3 border-b border-[#2A2A2A]">
        <h3 className="text-sm font-bold text-white">All Platform Users ({users.length})</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#1A1A1D]">
            <tr className="text-[10px] text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-2 text-left">User</th>
              <th className="px-4 py-2 text-left">Tenant</th>
              <th className="px-4 py-2 text-left">Tenant Role</th>
              <th className="px-4 py-2 text-left">Staff Role</th>
              <th className="px-4 py-2 text-left">Last Login</th>
              <th className="px-4 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1A1A1D]">
            {users.map(user => (
              <tr key={user.userId} className="hover:bg-[#1A1A1D] transition-colors">
                <td className="px-4 py-3">
                  <div className="text-sm text-white">{user.displayName}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400 font-mono">
                  {user.tenantId.slice(0, 12)}...
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs px-2 py-1 bg-[#4433FF]/20 text-[#4433FF] rounded">
                    {user.tenantRole}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded ${
                    user.staffRole === 'SUPER_ADMIN' ? 'bg-red-500/20 text-red-400' :
                    user.staffRole === 'ADMIN' ? 'bg-orange-500/20 text-orange-400' :
                    user.staffRole !== 'NONE' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {user.staffRole}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {user.lastLoginAt 
                    ? new Date(user.lastLoginAt).toLocaleDateString()
                    : 'Never'}
                </td>
                <td className="px-4 py-3">
                  <button className="p-1 text-gray-500 hover:text-white">
                    <MoreHorizontal size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// =============================================================================
// STRUGGLING USERS PANEL
// =============================================================================

const StrugglingUsersPanel: React.FC<{ userScope: UserScope; searchQuery: string }> = ({
  userScope,
  searchQuery,
}) => {
  const candidates = useMemo(() => {
    const all = getAllCoachingCandidates();
    return all.filter(c => c.lastFrameHealth.level !== 'GREEN');
  }, []);

  return (
    <div>
      <div className="px-4 py-3 border-b border-[#2A2A2A]">
        <h3 className="text-sm font-bold text-white">Struggling Users ({candidates.length})</h3>
      </div>
      <div className="divide-y divide-[#1A1A1D]">
        {candidates.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No struggling users found</div>
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
                    title="Send nudge"
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
// INTAKE SESSIONS PANEL
// =============================================================================

const IntakeSessionsPanel: React.FC<{ userScope: UserScope; searchQuery: string }> = ({
  userScope,
  searchQuery,
}) => {
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  const sessions = useMemo(() => {
    const all = getAllSessions();
    if (!searchQuery) return all;
    const q = searchQuery.toLowerCase();
    return all.filter(s => {
      const contact = getContactById(s.contactId);
      return (
        s.id.toLowerCase().includes(q) ||
        s.contactId.toLowerCase().includes(q) ||
        (contact?.fullName?.toLowerCase().includes(q))
      );
    });
  }, [searchQuery]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'in_progress':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'abandoned':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const toggleSession = (sessionId: string) => {
    setExpandedSessionId(prev => prev === sessionId ? null : sessionId);
  };

  return (
    <div>
      <div className="px-4 py-3 border-b border-[#2A2A2A]">
        <h3 className="text-sm font-bold text-white">Intake Sessions ({sessions.length})</h3>
        <p className="text-xs text-gray-500 mt-1">All Q/A from Tier 1 and Tier 2 intake flows</p>
      </div>
      <div className="divide-y divide-[#1A1A1D]">
        {sessions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No intake sessions found</div>
        ) : (
          sessions.map(session => {
            const contact = getContactById(session.contactId);
            const isExpanded = expandedSessionId === session.id;

            return (
              <div key={session.id} className="bg-[#0E0E0E]">
                {/* Session Header */}
                <div
                  className="p-4 hover:bg-[#1A1A1D] transition-colors cursor-pointer"
                  onClick={() => toggleSession(session.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {isExpanded ? (
                          <ChevronUp size={16} className="text-gray-500" />
                        ) : (
                          <ChevronDown size={16} className="text-gray-500" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-white">
                            {contact?.fullName || session.contactId}
                          </div>
                          <div className="text-xs text-gray-500 font-mono">{session.id}</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs px-2 py-1 bg-[#4433FF]/20 text-[#4433FF] rounded border border-[#4433FF]/30">
                        Tier {session.tier}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded border ${getStatusColor(session.status)}`}>
                        {session.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {session.answers.length} answers
                      </span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Started: {new Date(session.startedAt).toLocaleString()}
                    {session.completedAt && (
                      <> • Completed: {new Date(session.completedAt).toLocaleString()}</>
                    )}
                  </div>
                </div>

                {/* Expanded Q/A Detail */}
                {isExpanded && (
                  <div className="border-t border-[#2A2A2A] bg-[#0A0A0A]">
                    <div className="p-4">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
                        Questions & Answers
                      </h4>
                      {session.answers.length === 0 ? (
                        <p className="text-sm text-gray-500">No answers recorded yet</p>
                      ) : (
                        <div className="space-y-4">
                          {session.answers.map((answer, idx) => (
                            <div key={answer.id} className="bg-[#1A1A1D] rounded-lg p-3 border border-[#2A2A2A]">
                              <div className="flex items-start justify-between gap-2 mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs px-1.5 py-0.5 bg-[#4433FF]/20 text-[#4433FF] rounded font-mono">
                                    Q{idx + 1}
                                  </span>
                                  <span className="text-xs text-gray-500">{answer.questionId}</span>
                                </div>
                                <span className="text-xs px-2 py-0.5 bg-[#2A2A2A] text-gray-400 rounded">
                                  {answer.inputType}
                                </span>
                              </div>
                              <p className="text-sm text-gray-300 mb-2">{answer.questionText}</p>
                              <div className="bg-[#0E0E0E] rounded p-2 border border-[#333]">
                                <p className="text-sm text-white whitespace-pre-wrap">{answer.rawText}</p>
                              </div>
                              <div className="mt-2 text-xs text-gray-500">
                                Answered: {new Date(answer.answeredAt).toLocaleString()}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Session Metrics */}
                      {session.metrics && (
                        <div className="mt-4 pt-4 border-t border-[#2A2A2A]">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
                            Analysis Metrics
                          </h4>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-[#1A1A1D] rounded p-2 border border-[#2A2A2A]">
                              <div className="text-xs text-gray-500">Frame Score</div>
                              <div className="text-lg font-bold text-white">
                                {session.metrics.overallFrameScore}
                              </div>
                            </div>
                            <div className="bg-[#1A1A1D] rounded p-2 border border-[#2A2A2A]">
                              <div className="text-xs text-gray-500">Frame Type</div>
                              <div className="text-sm font-medium text-white capitalize">
                                {session.metrics.frameType}
                              </div>
                            </div>
                            <div className="bg-[#1A1A1D] rounded p-2 border border-[#2A2A2A]">
                              <div className="text-xs text-gray-500">Self Rating</div>
                              <div className="text-lg font-bold text-white">
                                {session.metrics.selfRatedFrameScore ?? '—'}
                              </div>
                            </div>
                          </div>
                          {session.metrics.activeFlags.length > 0 && (
                            <div className="mt-3">
                              <div className="text-xs text-gray-500 mb-1">Active Flags</div>
                              <div className="flex flex-wrap gap-1">
                                {session.metrics.activeFlags.map(flag => (
                                  <span
                                    key={flag.code}
                                    className={`text-xs px-2 py-0.5 rounded ${
                                      flag.severity === 'critical'
                                        ? 'bg-red-500/20 text-red-400'
                                        : flag.severity === 'warn'
                                        ? 'bg-yellow-500/20 text-yellow-400'
                                        : 'bg-gray-500/20 text-gray-400'
                                    }`}
                                  >
                                    {flag.code}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

// =============================================================================
// BETA USAGE PANEL
// =============================================================================

const BetaUsagePanel: React.FC<{ userScope: UserScope; searchQuery: string }> = ({
  userScope,
  searchQuery,
}) => {
  const betaUsers = useMemo(() => getAllBetaUsers(), []);

  return (
    <div>
      <div className="px-4 py-3 border-b border-[#2A2A2A]">
        <h3 className="text-sm font-bold text-white">Beta Users ({betaUsers.length})</h3>
      </div>
      <div className="divide-y divide-[#1A1A1D]">
        {betaUsers.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No beta users found</div>
        ) : (
          betaUsers.map(user => (
            <div key={`${user.tenantId}-${user.userId}`} className="p-4 hover:bg-[#1A1A1D] transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">{user.userId}</div>
                  <div className="text-xs text-gray-500">
                    Logins: {user.metrics.logins} • Notes: {user.metrics.notesCreated} • Tasks: {user.metrics.tasksCreated}
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
                  <button
                    onClick={() => extendBeta(user.tenantId, user.userId)}
                    className="p-1.5 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
                    title="Extend beta"
                  >
                    <Play size={14} />
                  </button>
                  <button
                    onClick={() => revokeBeta(user.tenantId, user.userId)}
                    className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                    title="Revoke beta"
                  >
                    <Ban size={14} />
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
// DATA REQUESTS PANEL
// =============================================================================

const DataRequestsPanel: React.FC<{ userScope: UserScope; searchQuery: string }> = ({
  userScope,
  searchQuery,
}) => {
  const requests = useMemo(() => getAllDataRequests(), []);

  return (
    <div>
      <div className="px-4 py-3 border-b border-[#2A2A2A]">
        <h3 className="text-sm font-bold text-white">Data Requests ({requests.length})</h3>
      </div>
      <div className="divide-y divide-[#1A1A1D]">
        {requests.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No data requests found</div>
        ) : (
          requests.map(request => (
            <div key={request.id} className="p-4 hover:bg-[#1A1A1D] transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded border ${
                      request.type === 'DELETE' ? 'bg-red-500/20 text-red-400 border-red-500/30' :
                      'bg-blue-500/20 text-blue-400 border-blue-500/30'
                    }`}>
                      {getRequestTypeLabel(request.type)}
                    </span>
                    <span className="text-sm text-white">{request.userId}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Requested: {new Date(request.requestedAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${getRequestStatusColor(request.status)}`}>
                    {getRequestStatusLabel(request.status)}
                  </span>
                  {request.status === 'REQUESTED' && (
                    <>
                      <button
                        onClick={() => {
                          updateDataRequestStatus(request.id, 'COMPLETED');
                          recordAdminAction({
                            actorUserId: userScope.userId,
                            actorStaffRole: userScope.staffRole,
                            targetUserId: request.userId,
                            scopeTenantId: request.tenantId,
                            actionType: 'DATA_REQUEST_STATUS_CHANGE',
                            metadata: { requestId: request.id, newStatus: 'COMPLETED' },
                          });
                        }}
                        className="p-1.5 bg-green-500/20 text-green-400 rounded hover:bg-green-500/30 transition-colors"
                        title="Complete"
                      >
                        <CheckCircle size={14} />
                      </button>
                      <button
                        onClick={() => {
                          updateDataRequestStatus(request.id, 'DECLINED');
                          recordAdminAction({
                            actorUserId: userScope.userId,
                            actorStaffRole: userScope.staffRole,
                            targetUserId: request.userId,
                            scopeTenantId: request.tenantId,
                            actionType: 'DATA_REQUEST_STATUS_CHANGE',
                            metadata: { requestId: request.id, newStatus: 'DECLINED' },
                          });
                        }}
                        className="p-1.5 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                        title="Decline"
                      >
                        <XCircle size={14} />
                      </button>
                    </>
                  )}
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
// SYSTEM LOGS PANEL
// =============================================================================

const SystemLogsPanel: React.FC<{ userScope: UserScope; searchQuery: string }> = ({
  userScope,
  searchQuery,
}) => {
  const [actionTypeFilter, setActionTypeFilter] = useState<AdminActionType | 'all'>('all');
  
  const logs = useMemo(() => {
    const filters: any = { limit: 100 };
    if (actionTypeFilter !== 'all') {
      filters.actionType = actionTypeFilter;
    }
    return getFilteredAuditLogs(filters);
  }, [actionTypeFilter]);

  return (
    <div>
      <div className="px-4 py-3 border-b border-[#2A2A2A] flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">System Logs ({logs.length})</h3>
        <select
          value={actionTypeFilter}
          onChange={(e) => setActionTypeFilter(e.target.value as any)}
          className="text-xs bg-[#1A1A1D] border border-[#333] rounded px-2 py-1 text-gray-400"
        >
          <option value="all">All Actions</option>
          {getAllActionTypes().map(type => (
            <option key={type} value={type}>{getActionTypeLabel(type)}</option>
          ))}
        </select>
      </div>
      <div className="divide-y divide-[#1A1A1D] max-h-[500px] overflow-y-auto">
        {logs.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No logs found</div>
        ) : (
          logs.map(log => (
            <div key={log.id} className="p-4 hover:bg-[#1A1A1D] transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white">
                    {getActionTypeLabel(log.actionType)}
                  </div>
                  <div className="text-xs text-gray-500">
                    Actor: {log.actorUserId} • Target: {log.targetUserId || 'N/A'}
                  </div>
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(log.timestamp).toLocaleString()}
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
// STAFF ROLES PANEL
// =============================================================================

const StaffRolesPanel: React.FC<{ userScope: UserScope; searchQuery: string }> = ({
  userScope,
  searchQuery,
}) => {
  const staffUsers = useMemo(() => getUsersWithStaffRoles(), []);

  return (
    <div>
      <div className="px-4 py-3 border-b border-[#2A2A2A]">
        <h3 className="text-sm font-bold text-white">Staff Roles ({staffUsers.length})</h3>
      </div>
      <div className="divide-y divide-[#1A1A1D]">
        {staffUsers.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No staff users found</div>
        ) : (
          staffUsers.map(user => (
            <div key={user.userId} className="p-4 hover:bg-[#1A1A1D] transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-medium text-white">{user.displayName}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2 py-1 rounded ${
                    user.staffRole === 'SUPER_ADMIN' ? 'bg-red-500/20 text-red-400' :
                    user.staffRole === 'ADMIN' ? 'bg-orange-500/20 text-orange-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}>
                    {user.staffRole}
                  </span>
                  {userScope.staffRole === 'SUPER_ADMIN' && user.staffRole !== 'SUPER_ADMIN' && (
                    <button className="p-1 text-gray-500 hover:text-white">
                      <MoreHorizontal size={16} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PlatformAdminPortal;

