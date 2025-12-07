// =============================================================================
// FRAME SCORE ANALYTICS PANEL — Platform-wide scoring trends
// =============================================================================
// Displays frame score distribution and trends across the platform.
// Only visible to Super Admin and internal staff.
// =============================================================================

import React, { useMemo } from 'react';
import {
  Target, TrendingUp, BarChart3, Activity, Users
} from 'lucide-react';
import type { UserScope } from '../../../types/multiTenant';
import { computeGlobalFrameScoreAnalytics } from '../../../stores/usageSelectors';

interface FrameScoreAnalyticsPanelProps {
  userScope: UserScope;
}

export const FrameScoreAnalyticsPanel: React.FC<FrameScoreAnalyticsPanelProps> = ({
  userScope,
}) => {
  const analytics = useMemo(() => computeGlobalFrameScoreAnalytics(), []);

  // Calculate bar widths for histogram
  const maxBinCount = Math.max(...analytics.bins.map(b => b.count), 1);

  // Calculate trend line data
  const maxTrendScore = Math.max(...analytics.trendOverTime.map(t => t.averageScore), 100);
  const minTrendScore = Math.min(...analytics.trendOverTime.map(t => t.averageScore), 0);
  const trendRange = maxTrendScore - minTrendScore || 1;

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Target size={20} className="text-[#4433FF]" />
            Frame Score Analytics
          </h3>
          <p className="text-xs text-gray-500 mt-1">Platform-wide scoring distribution and trends</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <div className="flex items-center gap-2 mb-2">
            <Target size={14} className="text-[#4433FF]" />
            <span className="text-xs text-gray-500">Average Score</span>
          </div>
          <div className="text-3xl font-bold text-white">{analytics.averageFrameScore}</div>
          <div className="text-xs text-gray-500 mt-1">across all users</div>
        </div>
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 size={14} className="text-purple-400" />
            <span className="text-xs text-gray-500">Median Score</span>
          </div>
          <div className="text-3xl font-bold text-white">{analytics.medianFrameScore}</div>
          <div className="text-xs text-gray-500 mt-1">50th percentile</div>
        </div>
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} className="text-green-400" />
            <span className="text-xs text-gray-500">Total Scans</span>
          </div>
          <div className="text-3xl font-bold text-white">{analytics.totalScansProcessed.toLocaleString()}</div>
          <div className="text-xs text-gray-500 mt-1">scans processed</div>
        </div>
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={14} className="text-green-400" />
            <span className="text-xs text-gray-500">Improvement Rate</span>
          </div>
          <div className="text-3xl font-bold text-green-400">{analytics.improvementRate}%</div>
          <div className="text-xs text-gray-500 mt-1">users improving</div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Score Distribution Histogram */}
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={14} className="text-purple-400" />
            Score Distribution
          </h4>
          <div className="space-y-3">
            {analytics.bins.map((bin, index) => {
              const width = (bin.count / maxBinCount) * 100;
              const colors = [
                'bg-red-500',     // 0-20
                'bg-orange-500',  // 21-40
                'bg-yellow-500',  // 41-60
                'bg-green-400',   // 61-80
                'bg-green-500',   // 81-100
              ];
              
              return (
                <div key={bin.rangeLabel} className="flex items-center gap-3">
                  <span className="text-xs text-gray-400 w-12">{bin.rangeLabel}</span>
                  <div className="flex-1 h-6 bg-[#0A0A0A] rounded overflow-hidden">
                    <div 
                      className={`h-full ${colors[index]} rounded transition-all duration-500`}
                      style={{ width: `${Math.max(width, 2)}%` }}
                    />
                  </div>
                  <div className="text-right w-20">
                    <span className="text-sm text-white font-medium">{bin.count}</span>
                    <span className="text-xs text-gray-500 ml-1">({bin.percentage.toFixed(0)}%)</span>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-4 pt-4 border-t border-[#2A2A2A]">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500" />
              <span className="text-xs text-gray-500">Poor</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-yellow-500" />
              <span className="text-xs text-gray-500">Average</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-green-500" />
              <span className="text-xs text-gray-500">Strong</span>
            </div>
          </div>
        </div>

        {/* Trend Over Time */}
        <div className="bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
          <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <TrendingUp size={14} className="text-green-400" />
            Score Trend (Last 30 Days)
          </h4>
          {analytics.trendOverTime.length > 0 ? (
            <>
              {/* Chart */}
              <div className="h-40 flex items-end gap-1">
                {analytics.trendOverTime.map((point, i) => {
                  const height = ((point.averageScore - minTrendScore) / trendRange) * 100;
                  const isRecent = i >= analytics.trendOverTime.length - 7;
                  
                  return (
                    <div
                      key={point.date}
                      className="flex-1 flex flex-col items-center group relative"
                    >
                      <div 
                        className={`w-full rounded-t transition-all duration-300 ${
                          isRecent ? 'bg-[#4433FF]' : 'bg-[#4433FF]/40'
                        } hover:bg-[#5544FF]`}
                        style={{ height: `${Math.max(height, 5)}%` }}
                      />
                      {/* Tooltip */}
                      <div className="absolute bottom-full mb-2 hidden group-hover:block bg-[#0A0A0A] border border-[#2A2A2A] rounded px-2 py-1 text-xs whitespace-nowrap z-10">
                        <div className="text-white font-medium">{point.averageScore.toFixed(1)}</div>
                        <div className="text-gray-500">{point.date}</div>
                        <div className="text-gray-500">{point.scanCount} scans</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* X-axis labels */}
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>{analytics.trendOverTime[0]?.date}</span>
                <span>{analytics.trendOverTime[analytics.trendOverTime.length - 1]?.date}</span>
              </div>
              
              {/* Stats below chart */}
              <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-[#2A2A2A]">
                <div className="text-center">
                  <div className="text-xs text-gray-500">Start</div>
                  <div className="text-sm font-medium text-white">
                    {analytics.trendOverTime[0]?.averageScore.toFixed(1) || '—'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Current</div>
                  <div className="text-sm font-medium text-white">
                    {analytics.trendOverTime[analytics.trendOverTime.length - 1]?.averageScore.toFixed(1) || '—'}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-xs text-gray-500">Change</div>
                  {analytics.trendOverTime.length >= 2 && (
                    <div className={`text-sm font-medium ${
                      analytics.trendOverTime[analytics.trendOverTime.length - 1].averageScore > 
                      analytics.trendOverTime[0].averageScore ? 'text-green-400' : 
                      analytics.trendOverTime[analytics.trendOverTime.length - 1].averageScore <
                      analytics.trendOverTime[0].averageScore ? 'text-red-400' : 'text-gray-400'
                    }`}>
                      {(analytics.trendOverTime[analytics.trendOverTime.length - 1].averageScore - 
                        analytics.trendOverTime[0].averageScore) > 0 ? '+' : ''}
                      {(analytics.trendOverTime[analytics.trendOverTime.length - 1].averageScore - 
                        analytics.trendOverTime[0].averageScore).toFixed(1)}
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-gray-500">
              No trend data available
            </div>
          )}
        </div>
      </div>

      {/* Score Breakdown by Segment */}
      <div className="mt-6 bg-[#1A1A1D] rounded-lg p-4 border border-[#2A2A2A]">
        <h4 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Users size={14} className="text-blue-400" />
          Score Segments
        </h4>
        <div className="grid grid-cols-5 gap-4">
          {analytics.bins.map((bin, index) => {
            const segmentLabels = ['At Risk', 'Needs Work', 'Developing', 'Strong', 'Excellent'];
            const segmentColors = [
              'text-red-400 border-red-500/30 bg-red-500/10',
              'text-orange-400 border-orange-500/30 bg-orange-500/10',
              'text-yellow-400 border-yellow-500/30 bg-yellow-500/10',
              'text-green-400 border-green-500/30 bg-green-500/10',
              'text-green-500 border-green-600/30 bg-green-600/10',
            ];
            
            return (
              <div 
                key={bin.rangeLabel}
                className={`rounded-lg p-4 border ${segmentColors[index]}`}
              >
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">
                  {segmentLabels[index]}
                </div>
                <div className="text-xs text-gray-400 mb-2">{bin.rangeLabel}</div>
                <div className="text-2xl font-bold">{bin.count}</div>
                <div className="text-xs text-gray-500">{bin.percentage.toFixed(1)}% of users</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FrameScoreAnalyticsPanel;







