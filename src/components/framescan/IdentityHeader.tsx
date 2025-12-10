// =============================================================================
// IDENTITY HEADER — Product branding, chrome console, and score display
// =============================================================================
// Unified header band inside the frame with brand stack on left,
// decorative chrome console in center, and score/status on right.
// Aurora background for visual impact matching Wants module.
// =============================================================================

import React from 'react';
import { Aurora } from '../ui/Aurora';
import type { FrameScanReport } from '../../services/frameScanReportStore';

export interface IdentityHeaderProps {
  report: FrameScanReport;
}

/**
 * Format domain ID to a readable label
 */
function formatDomain(domain: string): string {
  return domain
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format ISO date to local YYYY-MM-DD HH:mm
 */
function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}`;
}

export const IdentityHeader: React.FC<IdentityHeaderProps> = ({ report }) => {
  console.log('[IdentityHeader] Rendering with Aurora wrapper');
  const { score, modality, domain, createdAt } = report;
  const overallFrame = score.overallFrame;

  // Get CSS class modifier based on frame
  const getFrameModifier = (frame: string): string => {
    switch (frame) {
      case 'apex':
        return 'apex';
      case 'slave':
        return 'slave';
      case 'mixed':
      default:
        return 'mixed';
    }
  };

  const frameModifier = getFrameModifier(overallFrame);
  const domainLabel = formatDomain(domain);
  const dateLabel = formatDateTime(createdAt);

  return (
    <Aurora
      colorStops={['#001133', '#0043FF', '#001133']}
      amplitude={1.2}
      blend={0.7}
      speed={0.5}
      className="framescan-header-aurora"
    >
      <header className="framescan-identity-header">
        {/* Left: Brand stack */}
        <div className="framescan-identity-left">
          <div className="framescan-brand-small">Framelord</div>
          <div className="framescan-brand-main">Framescan</div>
          <div className="framescan-brand-sub">Analysis Dashboard</div>
        </div>

        {/* Center: Decorative chrome console */}
        <div className="framescan-identity-center" />

        {/* Right: Score, Frame, System Status, Meta */}
        <div className="framescan-identity-right">
          {/* Score and frame row */}
          <div className="framescan-identity-score-row">
            <span className={`framescan-score-pill framescan-score-pill--${frameModifier}`}>
              {score.frameScore}
            </span>
            <span className={`framescan-frame-label framescan-frame-label--${frameModifier}`}>
              {overallFrame.toUpperCase()}
            </span>
          </div>

          {/* System status and meta */}
          <div className="framescan-identity-meta">
            <div className="framescan-identity-meta-row">
              <span className="framescan-identity-meta-label">STATUS</span>
              <span className="framescan-identity-meta-value framescan-identity-meta-value--active">OPERATIONAL</span>
            </div>
            <div className="framescan-identity-meta-row">
              <span className="framescan-identity-meta-label">MODE</span>
              <span className="framescan-identity-meta-value">{modality.toUpperCase()}</span>
            </div>
            <div className="framescan-identity-meta-row">
              <span className="framescan-identity-meta-label">DOMAIN</span>
              <span className="framescan-identity-meta-value">{domainLabel}</span>
            </div>
            <div className="framescan-identity-meta-row">
              <span className="framescan-identity-meta-label">DATE</span>
              <span className="framescan-identity-meta-value">{dateLabel}</span>
            </div>
          </div>
        </div>
      </header>
    </Aurora>
  );
};

export default IdentityHeader;
