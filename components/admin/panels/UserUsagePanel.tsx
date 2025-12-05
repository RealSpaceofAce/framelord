// =============================================================================
// USER USAGE PANEL — Individual user metrics
// =============================================================================
// Displays usage metrics for individual users.
// Shows credits, frame scores, trajectories, and engagement.
// Used by both Platform Admin (all users) and Tenant Admin (tenant users only).
// =============================================================================

import React, { useMemo, useState } from 'react';
import {
  User, Search, TrendingUp, TrendingDown, Minus, Activity,
  ArrowUpDown, ChevronDown, ChevronUp, Zap, Target
} from 'lucide-react';
import type { UserScope } from '../../../types/multiTenant';
import type { UserUsageSummary, Trajectory } from '../../../types/usage';
import { computeAllUserUsageSummaries, computeUserUsageSummary } from '../../../stores/usageSelectors';
import { getAllTenants } from '../../../stores/tenantStore';

interface UserUsagePanelProps {
  userScope: UserScope;
  tenantFilter?: string; // If provided, only show users from this tenant
  showTenantColumn?: boolean; // Whether to show tenant column (Platform Admin only)
}

type SortField = 'userName' | 'creditsConsumed' | 'currentFrameScore' | 'struggleIndex' | 'recentScanCount';
type SortDirection = 'asc' | 'desc';

export const UserUsagePanel: React.FC<UserUsagePanelProps> = ({
  userScope,
  tenantFilter,
  showTenantColumn = true,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<string>(tenantFilter || '');
  const [sortField, setSortField] = useState<SortField>('creditsConsumed');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [trajectoryFilter, setTrajectoryFilter] = useState<Trajectory | 'ALL'>('ALL');

  const tenants = useMemo(() => getAllTenants(), []);
  
  const allUsers = useMemo(() => {
    const filterTenantId = tenantFilter || selectedTenant || undefined;
    return computeAllUserUsageSummaries(filterTenantId);
  }, [tenantFilter, selectedTenant]);

  const filteredUsers = useMemo(() => {
    let users = [...allUsers];
    
    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      users = users.filter(u => 
        u.userName.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.userId.toLowerCase().includes(q)
      );
    }
    
    // Filter by trajectory
    if (trajectoryFilter !== 'ALL') {
      users = users.filter(u => u.trajectory === trajectoryFilter);
    }
    
    // Sort
    users.sort((a, b) => {
      let aVal: number | string | null = a[sortField];
      let bVal: number | string | null = b[sortField];
      
      // Handle null values
      if (aVal === null) aVal = -Infinity;
      if (bVal === null) bVal = -Infinity;
      
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = (bVal as string).toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });
    
    return users;
  }, [allUsers, searchQuery, trajectoryFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortHeader: React.FC<{ field: SortField; label: string }> = ({ field, label }) => (
    <button
      onClick={() => handleSort(field)}
      className="flex items-center gap-1 hover:text-white transition-colors"
    >
      {label}
      <ArrowUpDown size={12} className={sortField === field ? 'text-[#4433FF]' : 'opacity-50'} />
    </button>
  );

  const TrajectoryBadge: React.FC<{ trajectory: Trajectory }> = ({ trajectory }) => {
    const config = {
      POSITIVE: { icon: <TrendingUp size={12} />, color: 'text-green-400 bg-green-500/20', label: 'Improving' },
      NEUTRAL: { icon: <Minus size={12} />, color: 'text-yellow-400 bg-yellow-500/20', label: 'Stable' },
      NEGATIVE: { icon: <TrendingDown size={12} />, color: 'text-red-400 bg-red-500/20', label: 'Declining' },
    }[trajectory];
    
    return (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${config.color}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <User size={20} className="text-[#4433FF]" />
            User Usage
          </h3>
          <p className="text-xs text-gray-500 mt-1">Individual user metrics and engagement</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Trajectory Filter */}
          <select
            value={trajectoryFilter}
            onChange={(e) => setTrajectoryFilter(e.target.value as Trajectory | 'ALL')}
            className="px-3 py-2 bg-[#1A1A1D] border border-[#2A2A2A] rounded-lg text-sm text-white focus:border-[#4433FF] outline-none"
          >
            <option value="ALL">All Trajectories</option>
            <option value="POSITIVE">Improving</option>
            <option value="NEUTRAL">Stable</option>
            <option value="NEGATIVE">Declining</option>
          </select>
          
          {/* Tenant Filter (Platform Admin only) */}
          {showTenantColumn && !tenantFilter && (
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="px-3 py-2 bg-[#1A1A1D] border border-[#2A2A2A] rounded-lg text-sm text-white focus:border-[#4433FF] outline-none w-48"
            >
              <option value="">All Tenants</option>
              {tenants.map(t => (
                <option key={t.tenantId} value={t.tenantId}>{t.name}</option>
              ))}
            </select>
          )}
          
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users..."
              className="pl-9 pr-4 py-2 bg-[#1A1A1D] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder-gray-500 focus:border-[#4433FF] outline-none w-64"
            />
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Users</div>
          <div className="text-2xl font-bold text-white">{filteredUsers.length}</div>
        </div>
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Improving</div>
          <div className="text-2xl font-bold text-green-400">
            {filteredUsers.filter(u => u.trajectory === 'POSITIVE').length}
          </div>
        </div>
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Stable</div>
          <div className="text-2xl font-bold text-yellow-400">
            {filteredUsers.filter(u => u.trajectory === 'NEUTRAL').length}
          </div>
        </div>
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Declining</div>
          <div className="text-2xl font-bold text-red-400">
            {filteredUsers.filter(u => u.trajectory === 'NEGATIVE').length}
          </div>
        </div>
      </div>

      {/* User Table */}
      <div className="bg-[#1A1A1D] rounded-lg border border-[#2A2A2A] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0E0E0E]">
            <tr className="text-[10px] text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3 text-left">
                <SortHeader field="userName" label="User" />
              </th>
              {showTenantColumn && !tenantFilter && (
                <th className="px-4 py-3 text-left">Tenant</th>
              )}
              <th className="px-4 py-3 text-left">Credits</th>
              <th className="px-4 py-3 text-left">
                <SortHeader field="currentFrameScore" label="Frame Score" />
              </th>
              <th className="px-4 py-3 text-left">Trajectory</th>
              <th className="px-4 py-3 text-left">Congruency</th>
              <th className="px-4 py-3 text-left">
                <SortHeader field="struggleIndex" label="Struggle" />
              </th>
              <th className="px-4 py-3 text-left">
                <SortHeader field="recentScanCount" label="Recent Scans" />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2A2A]">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={showTenantColumn ? 8 : 7} className="px-4 py-8 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <React.Fragment key={`${user.tenantId}-${user.userId}`}>
                  <tr 
                    className="hover:bg-[#0E0E0E] transition-colors cursor-pointer"
                    onClick={() => setExpandedUser(
                      expandedUser === user.userId ? null : user.userId
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {expandedUser === user.userId 
                          ? <ChevronUp size={14} className="text-gray-500" />
                          : <ChevronDown size={14} className="text-gray-500" />
                        }
                        <div>
                          <div className="text-sm font-medium text-white">{user.userName}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    {showTenantColumn && !tenantFilter && (
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400 font-mono">
                          {user.tenantId.slice(0, 12)}...
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">{user.creditsConsumed}</div>
                      <div className="text-xs text-gray-500">{user.creditsRemaining} left</div>
                    </td>
                    <td className="px-4 py-3">
                      {user.currentFrameScore !== null ? (
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${
                            user.currentFrameScore >= 70 ? 'text-green-400' :
                            user.currentFrameScore >= 40 ? 'text-yellow-400' :
                            'text-red-400'
                          }`}>
                            {user.currentFrameScore.toFixed(0)}
                          </span>
                          {user.firstFrameScore !== null && (
                            <span className="text-xs text-gray-500">
                              (started: {user.firstFrameScore.toFixed(0)})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-gray-500">No scans</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <TrajectoryBadge trajectory={user.trajectory} />
                    </td>
                    <td className="px-4 py-3">
                      <TrajectoryBadge trajectory={user.congruencyTrend} />
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${
                        user.struggleIndex === 0 ? 'text-green-400' :
                        user.struggleIndex <= 3 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {user.struggleIndex}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Activity size={12} className="text-gray-500" />
                        <span className="text-sm text-white">{user.recentScanCount}</span>
                        <span className="text-xs text-gray-500">this week</span>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Row */}
                  {expandedUser === user.userId && (
                    <tr className="bg-[#0E0E0E]">
                      <td colSpan={showTenantColumn ? 8 : 7} className="px-4 py-4">
                        <UserUsageDetail user={user} />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Expanded user detail component
const UserUsageDetail: React.FC<{ user: UserUsageSummary }> = ({ user }) => {
  const categoryLabels: Record<string, string> = {
    textScan: 'Text Scans',
    imageScan: 'Image Scans',
    littleLordMessages: 'Little Lord Messages',
  };

  // Simple sparkline for frame score history
  const maxScore = Math.max(...user.frameScoreHistory.map(h => h.score), 100);
  const minScore = Math.min(...user.frameScoreHistory.map(h => h.score), 0);
  const range = maxScore - minScore || 1;

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Credits Breakdown */}
      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Zap size={12} />
          Credits by Category
        </h4>
        <div className="space-y-2">
          {Object.entries(user.creditsByCategory).map(([category, credits]) => (
            <div key={category} className="flex items-center justify-between">
              <span className="text-sm text-gray-300">{categoryLabels[category] || category}</span>
              <span className="text-sm text-white font-medium">{credits}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Frame Score History */}
      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Target size={12} />
          Frame Score History
        </h4>
        {user.frameScoreHistory.length > 0 ? (
          <div className="h-24 flex items-end gap-1">
            {user.frameScoreHistory.slice(-14).map((point, i) => {
              const height = ((point.score - minScore) / range) * 100;
              return (
                <div
                  key={i}
                  className="flex-1 bg-[#4433FF] rounded-t"
                  style={{ height: `${Math.max(height, 5)}%` }}
                  title={`${point.date}: ${point.score.toFixed(0)}`}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-sm text-gray-500">No scan history</div>
        )}
        {user.frameScoreHistory.length > 0 && (
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>{user.frameScoreHistory[0]?.date}</span>
            <span>{user.frameScoreHistory[user.frameScoreHistory.length - 1]?.date}</span>
          </div>
        )}
      </div>
      
      {/* User Info */}
      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
          Activity Details
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Status</span>
            <span className={user.isActive ? 'text-green-400' : 'text-red-400'}>
              {user.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Last Scan</span>
            <span className="text-white">
              {user.lastScanAt 
                ? new Date(user.lastScanAt).toLocaleDateString()
                : 'Never'
              }
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Total Scans</span>
            <span className="text-white">{user.frameScoreHistory.length}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Score Change</span>
            {user.firstFrameScore !== null && user.currentFrameScore !== null ? (
              <span className={
                user.currentFrameScore > user.firstFrameScore ? 'text-green-400' :
                user.currentFrameScore < user.firstFrameScore ? 'text-red-400' :
                'text-gray-400'
              }>
                {user.currentFrameScore > user.firstFrameScore ? '+' : ''}
                {(user.currentFrameScore - user.firstFrameScore).toFixed(0)} pts
              </span>
            ) : (
              <span className="text-gray-500">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserUsagePanel;




