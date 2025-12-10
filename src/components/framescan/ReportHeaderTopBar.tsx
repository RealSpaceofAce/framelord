// =============================================================================
// REPORT HEADER TOP BAR — Product label and system status display
// =============================================================================
// Shows FRAMELORD / FRAMESCAN / ANALYSIS DASHBOARD branding on left,
// decorative chrome console panel in center, and FrameScore + Overall Frame
// + report metadata on right with neon HUD styling.
// =============================================================================

import React from 'react';
import type { FrameScanReport } from '../../services/frameScanReportStore';

export interface ReportHeaderTopBarProps {
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

export const ReportHeaderTopBar: React.FC<ReportHeaderTopBarProps> = ({ report }) => {
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
    <header className="framescan-header">
      {/* Left: Product label stack */}
      <div className="framescan-header-left">
        <span className="label-framelord">FRAMELORD</span>
        <span className="label-framescan">FRAMESCAN</span>
        <span className="label-dashboard">ANALYSIS DASHBOARD</span>
      </div>

      {/* Center: System Status Block */}
      <div className="framescan-header-center">
        <div className="framescan-system-status">
          <div className="system-status-row">
            <span className="system-status-label">SYSTEM STATUS</span>
            <span className="system-status-value system-status-value--active">OPERATIONAL</span>
          </div>
          <div className="system-status-row">
            <span className="system-status-label">SCAN ID</span>
            <span className="system-status-value">{report.id.slice(0, 8).toUpperCase()}</span>
          </div>
          <div className="system-status-row">
            <span className="system-status-label">PROGRESS</span>
            <span className="system-status-value system-status-value--complete">COMPLETE</span>
          </div>
        </div>
      </div>

      {/* Right: Score + Frame + Metadata */}
      <div className="framescan-header-right">
        {/* Score and frame row */}
        <div className="framescan-score-block">
          <span className={`framescan-score-pill framescan-score-pill--${frameModifier}`}>
            {score.frameScore}
          </span>
          <span className={`framescan-frame-label framescan-frame-label--${frameModifier}`}>
            {overallFrame.toUpperCase()}
          </span>
        </div>

        {/* Metadata block */}
        <div className="framescan-meta">
          <div className="framescan-meta-row">
            <span className="framescan-meta-label">Mode:</span>
            <span className="framescan-meta-value">{modality.toUpperCase()}</span>
          </div>
          <div className="framescan-meta-row">
            <span className="framescan-meta-label">Domain:</span>
            <span className="framescan-meta-value">{domainLabel}</span>
          </div>
          <div className="framescan-meta-row">
            <span className="framescan-meta-label">Date:</span>
            <span className="framescan-meta-value">{dateLabel}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default ReportHeaderTopBar;
