// =============================================================================
// USAGE ANALYTICS PANEL — Global platform usage metrics
// =============================================================================
// Displays system-wide usage metrics for Super Admin and staff.
// Shows credits consumed, action breakdowns, peak hours, and error rates.
// =============================================================================

import React, { useMemo } from 'react';
import {
  Activity, TrendingUp, Clock, AlertTriangle, Zap, Image,
  MessageSquare, FileText, Mic, BarChart3
} from 'lucide-react';
import type { UserScope } from '../../../types/multiTenant';
import { computeGlobalUsageSummary } from '../../../stores/usageSelectors';

interface UsageAnalyticsPanelProps {
  userScope: UserScope;
}

export const UsageAnalyticsPanel: React.FC<UsageAnalyticsPanelProps> = ({
  userScope,
}) => {
  const usage = useMemo(() => computeGlobalUsageSummary(), []);

  const actionTypeLabels: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    textScan: { label: 'Text Scans', icon: <FileText size={14} />, color: 'text-blue-400' },
    imageScan: { label: 'Image Scans', icon: <Image size={14} />, color: 'text-purple-400' },
    audioMinutes: { label: 'Audio Minutes', icon: <Mic size={14} />, color: 'text-green-400' },
    littleLordMessages: { label: 'Little Lord Messages', icon: <MessageSquare size={14} />, color: 'text-yellow-400' },
    canvasEvents: { label: 'Canvas Events', icon: <Zap size={14} />, color: 'text-pink-400' },
  };

  // Find peak hours (top 5)
  const peakHours = [...usage.peakUsageHours]
    .sort((a, b) => b.credits - a.credits)
    .slice(0, 5);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Activity size={20} className="text-[#4433FF]" />
            Usage Analytics
          </h3>
          <p className="text-xs text-gray-500 mt-1">Platform-wide credit consumption and activity metrics</p>
        </div>
      </div>

      {/* Credit Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">Today</div>
          <div className="text-2xl font-bold text-white">{usage.totalFrameCreditsToday.toLocaleString()}</div>
          <div className="text-xs text-gray-400">credits consumed</div>
        </div>
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">This Week</div>
          <div className="text-2xl font-bold text-white">{usage.totalFrameCreditsThisWeek.toLocaleString()}</div>
          <div className="text-xs text-gray-400">credits consumed</div>
        </div>
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">This Month</div>
          <div className="text-2xl font-bold text-white">{usage.totalFrameCreditsThisMonth.toLocaleString()}</div>
          <div className="text-xs text-gray-400">credits consumed</div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-green-400" />
            <span className="text-xs text-gray-500">Avg Cost/User</span>
          </div>
          <div className="text-xl font-bold text-white">{usage.averageCostPerUser.toFixed(1)}</div>
        </div>
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={14} className="text-red-400" />
            <span className="text-xs text-gray-500">Error Rate</span>
          </div>
          <div className="text-xl font-bold text-white">{(usage.errorRateBlockedScans * 100).toFixed(1)}%</div>
        </div>
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} className="text-blue-400" />
            <span className="text-xs text-gray-500">Active Users</span>
          </div>
          <div className="text-xl font-bold text-white">{usage.totalActiveUsers}</div>
        </div>
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={14} className="text-purple-400" />
            <span className="text-xs text-gray-500">Frame Scores</span>
          </div>
          <div className="text-xl font-bold text-white">{usage.totalInitialFrameScores}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Action Type Breakdown */}
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Zap size={14} className="text-yellow-400" />
            Credits by Action Type
          </h4>
          <div className="space-y-3">
            {(Object.entries(usage.byActionType) as [string, number][]).map(([type, credits]) => {
              const config = actionTypeLabels[type] || { 
                label: type, 
                icon: <Activity size={14} />, 
                color: 'text-gray-400' 
              };
              const totalCredits = (Object.values(usage.byActionType) as number[]).reduce((a, b) => a + b, 0);
              const percentage = totalCredits > 0 ? (credits / totalCredits) * 100 : 0;
              
              return (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={config.color}>{config.icon}</span>
                    <span className="text-sm text-gray-300">{config.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#4433FF] rounded-full" 
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-white font-medium w-16 text-right">
                      {credits.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Peak Usage Hours */}
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <Clock size={14} className="text-blue-400" />
            Peak Usage Hours
          </h4>
          <div className="space-y-3">
            {peakHours.map((item, index) => {
              const maxCredits = peakHours[0]?.credits || 1;
              const percentage = (item.credits / maxCredits) * 100;
              const hourLabel = item.hour === 0 ? '12 AM' : 
                item.hour === 12 ? '12 PM' :
                item.hour > 12 ? `${item.hour - 12} PM` : `${item.hour} AM`;
              
              return (
                <div key={item.hour} className="flex items-center justify-between">
                  <span className="text-sm text-gray-300 w-16">{hourLabel}</span>
                  <div className="flex-1 mx-3">
                    <div className="w-full h-2 bg-[#0A0A0A] rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          index === 0 ? 'bg-green-500' : 'bg-[#4433FF]/60'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-sm text-white font-medium w-16 text-right">
                    {item.credits}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <div className="flex items-center gap-2 mb-2">
            <Mic size={14} className="text-green-400" />
            <span className="text-xs text-gray-500">Transcription Minutes</span>
          </div>
          <div className="text-xl font-bold text-white">{usage.totalTranscriptionMinutes}</div>
          <div className="text-xs text-gray-500 mt-1">
            {/* TODO: Wire to backend transcription data */}
            Total audio processed
          </div>
        </div>
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <div className="flex items-center gap-2 mb-2">
            <Image size={14} className="text-purple-400" />
            <span className="text-xs text-gray-500">Image Scans</span>
          </div>
          <div className="text-xl font-bold text-white">{usage.totalImageScans}</div>
          <div className="text-xs text-gray-500 mt-1">
            Total images analyzed
          </div>
        </div>
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} className="text-blue-400" />
            <span className="text-xs text-gray-500">Active Tenants</span>
          </div>
          <div className="text-xl font-bold text-white">{usage.totalActiveTenants}</div>
          <div className="text-xs text-gray-500 mt-1">
            Organizations using platform
          </div>
        </div>
      </div>
    </div>
  );
};

export default UsageAnalyticsPanel;

