// =============================================================================
// FRAME SCORE TILE — Dashboard widget showing frame profile for Contact Zero
// =============================================================================
// Compact widget for the dashboard showing current frame score and scan count.
// Links to the full Frame Scans page.
// =============================================================================

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Scan, TrendingUp, TrendingDown, Minus, ArrowRight 
} from 'lucide-react';
import { getContactZeroReports } from '../../services/frameScanReportStore';
import { CONTACT_ZERO } from '../../services/contactStore';
import { 
  computeCumulativeFrameProfileForContact,
  computeFrameProfileTrend,
  getFrameScoreLabel,
  getFrameScoreColorClass,
  formatProfileDate,
} from '../../lib/frameScan/frameProfile';

const MotionDiv = motion.div as any;

// =============================================================================
// TYPES
// =============================================================================

interface FrameScoreTileProps {
  onOpenFrameScans: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const FrameScoreTile: React.FC<FrameScoreTileProps> = ({
  onOpenFrameScans,
}) => {
  const reports = useMemo(() => getContactZeroReports(), []);
  const profile = useMemo(() => computeCumulativeFrameProfileForContact(CONTACT_ZERO.id, reports), [reports]);
  const trend = useMemo(() => computeFrameProfileTrend(reports), [reports]);

  const scoreColorClass = getFrameScoreColorClass(profile.currentFrameScore);
  const scoreLabel = getFrameScoreLabel(profile.currentFrameScore);

  const TrendIcon = trend?.direction === 'up' ? TrendingUp 
    : trend?.direction === 'down' ? TrendingDown 
    : Minus;

  return (
    <MotionDiv
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-[#0E0E0E] border border-[#222] rounded-lg p-4 hover:border-[#333] transition-colors"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-[#4433FF]/20 rounded border border-[#4433FF]/30">
            <Scan size={14} className="text-[#4433FF]" />
          </div>
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Frame Score</span>
        </div>
        
        {profile.scansCount > 0 && (
          <span className="text-[10px] px-2 py-0.5 bg-[#1A1A1A] border border-[#333] rounded text-gray-500">
            {profile.scansCount} scan{profile.scansCount !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Score Display */}
      <div className="flex items-end justify-between mb-4">
        <div>
          <div className={`text-4xl font-bold ${scoreColorClass}`}>
            {profile.currentFrameScore}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {trend && (
              <span className={`flex items-center gap-0.5 text-xs ${
                trend.direction === 'up' ? 'text-green-400' :
                trend.direction === 'down' ? 'text-red-400' : 'text-gray-500'
              }`}>
                <TrendIcon size={12} />
                {trend.changeAmount > 0 && `${trend.changeAmount}`}
              </span>
            )}
            <span className="text-xs text-gray-500">{scoreLabel}</span>
          </div>
        </div>

        {/* Mini progress indicator */}
        <div className="w-16 h-16 relative">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <circle
              className="stroke-[#222]"
              fill="none"
              strokeWidth="3"
              cx="18"
              cy="18"
              r="15"
            />
            <circle
              className={`${
                profile.currentFrameScore >= 65 ? 'stroke-green-500' :
                profile.currentFrameScore >= 45 ? 'stroke-yellow-500' :
                'stroke-red-500'
              }`}
              fill="none"
              strokeWidth="3"
              strokeLinecap="round"
              cx="18"
              cy="18"
              r="15"
              strokeDasharray={`${profile.currentFrameScore * 0.94} 100`}
            />
          </svg>
        </div>
      </div>

      {/* Last Scan Info */}
      {profile.lastScanAt && (
        <div className="text-xs text-gray-600 mb-3">
          Last scan: {formatProfileDate(profile.lastScanAt)}
        </div>
      )}

      {/* CTA Button */}
      <button
        onClick={onOpenFrameScans}
        className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#1A1A1A] border border-[#333] rounded text-xs text-white hover:bg-[#222] hover:border-[#4433FF]/50 transition-colors"
      >
        Open Frame Scans
        <ArrowRight size={12} />
      </button>
    </MotionDiv>
  );
};

export default FrameScoreTile;

