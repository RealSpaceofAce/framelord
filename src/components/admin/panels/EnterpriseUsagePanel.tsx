// =============================================================================
// ENTERPRISE USAGE PANEL — Tenant-level usage metrics
// =============================================================================
// Displays usage metrics for each tenant for Super Admin and staff.
// Shows seats, credits, frame scores, and engagement per tenant.
// =============================================================================

import React, { useMemo, useState } from 'react';
import {
  Building2, Users, Zap, TrendingUp, AlertTriangle, ChevronDown, ChevronUp,
  ArrowUpDown, Search
} from 'lucide-react';
import type { UserScope } from '../../../types/multiTenant';
import type { TenantUsageSummary } from '../../../types/usage';
import { computeTenantUsageSummaries } from '../../../stores/usageSelectors';

interface EnterpriseUsagePanelProps {
  userScope: UserScope;
  onViewUserUsage?: (tenantId: string) => void;
}

type SortField = 'tenantName' | 'creditsConsumed' | 'averageFrameScore' | 'seats' | 'struggleIndexCount';
type SortDirection = 'asc' | 'desc';

export const EnterpriseUsagePanel: React.FC<EnterpriseUsagePanelProps> = ({
  userScope,
  onViewUserUsage,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('creditsConsumed');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);

  const allTenants = useMemo(() => computeTenantUsageSummaries(), []);

  const filteredTenants = useMemo(() => {
    let tenants = [...allTenants];
    
    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      tenants = tenants.filter(t => 
        t.tenantName.toLowerCase().includes(q) ||
        t.tenantId.toLowerCase().includes(q)
      );
    }
    
    // Sort
    tenants.sort((a, b) => {
      let aVal: number | string = a[sortField];
      let bVal: number | string = b[sortField];
      
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
    
    return tenants;
  }, [allTenants, searchQuery, sortField, sortDirection]);

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

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 size={20} className="text-[#4433FF]" />
            Enterprise Usage
          </h3>
          <p className="text-xs text-gray-500 mt-1">Credit consumption and engagement by tenant</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tenants..."
            className="pl-9 pr-4 py-2 bg-[#1A1A1D] border border-[#2A2A2A] rounded-lg text-sm text-white placeholder-gray-500 focus:border-[#4433FF] outline-none w-64"
          />
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Tenants</div>
          <div className="text-2xl font-bold text-white">{allTenants.length}</div>
        </div>
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Seats</div>
          <div className="text-2xl font-bold text-white">
            {allTenants.reduce((sum, t) => sum + t.seats, 0)}
          </div>
        </div>
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Total Credits Used</div>
          <div className="text-2xl font-bold text-white">
            {allTenants.reduce((sum, t) => sum + t.creditsConsumed, 0).toLocaleString()}
          </div>
        </div>
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Avg Frame Score</div>
          <div className="text-2xl font-bold text-white">
            {allTenants.length > 0 
              ? (allTenants.reduce((sum, t) => sum + t.averageFrameScore, 0) / allTenants.length).toFixed(1)
              : '0'
            }
          </div>
        </div>
      </div>

      {/* Tenant Table */}
      <div className="bg-[#1A1A1D] rounded-lg border border-[#2A2A2A] overflow-hidden">
        <table className="w-full">
          <thead className="bg-[#0E0E0E]">
            <tr className="text-[10px] text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3 text-left">
                <SortHeader field="tenantName" label="Tenant" />
              </th>
              <th className="px-4 py-3 text-left">
                <SortHeader field="seats" label="Seats" />
              </th>
              <th className="px-4 py-3 text-left">Credits</th>
              <th className="px-4 py-3 text-left">
                <SortHeader field="averageFrameScore" label="Avg Score" />
              </th>
              <th className="px-4 py-3 text-left">
                <SortHeader field="struggleIndexCount" label="Struggling" />
              </th>
              <th className="px-4 py-3 text-left">Congruency</th>
              <th className="px-4 py-3 text-left">High Usage</th>
              <th className="px-4 py-3 text-left">Plan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2A2A2A]">
            {filteredTenants.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  No tenants found
                </td>
              </tr>
            ) : (
              filteredTenants.map(tenant => (
                <React.Fragment key={tenant.tenantId}>
                  <tr 
                    className="hover:bg-[#0E0E0E] transition-colors cursor-pointer"
                    onClick={() => setExpandedTenant(
                      expandedTenant === tenant.tenantId ? null : tenant.tenantId
                    )}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {expandedTenant === tenant.tenantId 
                          ? <ChevronUp size={14} className="text-gray-500" />
                          : <ChevronDown size={14} className="text-gray-500" />
                        }
                        <div>
                          <div className="text-sm font-medium text-white">{tenant.tenantName}</div>
                          <div className="text-xs text-gray-500 font-mono">{tenant.tenantId.slice(0, 12)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <Users size={12} className="text-gray-500" />
                        <span className="text-sm text-white">{tenant.seats}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-white">{tenant.creditsConsumed.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">
                        of {tenant.creditsAllocated.toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm font-medium ${
                        tenant.averageFrameScore >= 70 ? 'text-green-400' :
                        tenant.averageFrameScore >= 40 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {tenant.averageFrameScore.toFixed(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {tenant.struggleIndexCount > 0 ? (
                        <span className="flex items-center gap-1 text-sm text-red-400">
                          <AlertTriangle size={12} />
                          {tenant.struggleIndexCount}
                        </span>
                      ) : (
                        <span className="text-sm text-green-400">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${
                        tenant.congruencyAverage >= 70 ? 'text-green-400' :
                        tenant.congruencyAverage >= 40 ? 'text-yellow-400' :
                        'text-red-400'
                      }`}>
                        {tenant.congruencyAverage.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {tenant.highUsageUserIds.length > 0 ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewUserUsage?.(tenant.tenantId);
                          }}
                          className="text-xs text-[#4433FF] hover:text-[#5544FF] transition-colors"
                        >
                          {tenant.highUsageUserIds.length} users →
                        </button>
                      ) : (
                        <span className="text-xs text-gray-500">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 bg-[#4433FF]/20 text-[#4433FF] rounded">
                        {tenant.planName}
                      </span>
                    </td>
                  </tr>
                  
                  {/* Expanded Row */}
                  {expandedTenant === tenant.tenantId && (
                    <tr className="bg-[#0E0E0E]">
                      <td colSpan={8} className="px-4 py-4">
                        <TenantUsageDetail tenant={tenant} />
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

// Expanded tenant detail component
const TenantUsageDetail: React.FC<{ tenant: TenantUsageSummary }> = ({ tenant }) => {
  const actionTypeLabels: Record<string, string> = {
    textScan: 'Text Scans',
    imageScan: 'Image Scans',
    audioMinutes: 'Audio Minutes',
    littleLordMessages: 'Little Lord Messages',
    canvasEvents: 'Canvas Events',
  };

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* Credits Breakdown */}
      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
          Credits by Action Type
        </h4>
        <div className="space-y-2">
          {Object.entries(tenant.creditsByActionType).map(([type, credits]) => (
            <div key={type} className="flex items-center justify-between">
              <span className="text-sm text-gray-300">{actionTypeLabels[type] || type}</span>
              <span className="text-sm text-white font-medium">{credits.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Tenant Info */}
      <div>
        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">
          Tenant Details
        </h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Created</span>
            <span className="text-white">{new Date(tenant.createdAt).toLocaleDateString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Last Activity</span>
            <span className="text-white">
              {tenant.lastActivityAt 
                ? new Date(tenant.lastActivityAt).toLocaleDateString()
                : 'Never'
              }
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Active Users</span>
            <span className="text-white">{tenant.activeUsers}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Credit Utilization</span>
            <span className={`${
              (tenant.creditsConsumed / tenant.creditsAllocated) > 0.8 ? 'text-red-400' :
              (tenant.creditsConsumed / tenant.creditsAllocated) > 0.5 ? 'text-yellow-400' :
              'text-green-400'
            }`}>
              {tenant.creditsAllocated > 0 
                ? ((tenant.creditsConsumed / tenant.creditsAllocated) * 100).toFixed(0)
                : 0
              }%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnterpriseUsagePanel;







