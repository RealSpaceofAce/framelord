// =============================================================================
// FRAME SCAN REPORT LAYOUT — Main layout composing all report sections
// =============================================================================
// Orchestrates the complete report page layout: header, input preview, core grid,
// 9-axis breakdown, synthesis note, and deep analysis panels. Uses neon HUD styling.
// =============================================================================

import React from 'react';
import { IdentityHeader } from './IdentityHeader';
import { InputPreviewCard } from './InputPreviewCard';
import { SAxisPanel } from './SAxisPanel';
import { ScanChamberPanel } from './ScanChamberPanel';
import { SystemMetricsPanel } from './SystemMetricsPanel';
import { ImagePanel } from './ImagePanel';
import { NineAxisBreakdownPanel } from './NineAxisBreakdownPanel';
import { SynthesisNotePanel } from './SynthesisNotePanel';
import { DeepAnalysisPanels } from './DeepAnalysisPanels';
import type { FrameScanReport } from '../../services/frameScanReportStore';
import './FrameScanReport.css';

export interface FrameScanReportLayoutProps {
  report: FrameScanReport;
  onNavigateToNote?: (noteId: string) => void;
}

export const FrameScanReportLayout: React.FC<FrameScanReportLayoutProps> = ({
  report,
  onNavigateToNote,
}) => {
  console.log('[FrameScanReportLayout] Rendering with report:', report.id);

  // Handle note creation callback
  const handleNoteCreated = (noteId: string) => {
    if (onNavigateToNote) {
      onNavigateToNote(noteId);
    }
  };

  return (
    <div className="framescan-report-root">
      {/* Outer Frame — unified chrome panel */}
      <div className="framescan-report-frame">
        {/* Corner brackets */}
        <div className="framescan-frame-bracket framescan-frame-bracket--tl" />
        <div className="framescan-frame-bracket framescan-frame-bracket--tr" />
        <div className="framescan-frame-bracket framescan-frame-bracket--bl" />
        <div className="framescan-frame-bracket framescan-frame-bracket--br" />

        {/* Identity Header — brand, console chrome, score block */}
        <IdentityHeader report={report} />

        {/* Main content container */}
        <div className="framescan-report-content">
          {/* Input Preview (what was scanned) */}
          <InputPreviewCard report={report} />

          {/* Core Grid: 3 columns (S-Axis, Scan Chamber, System Metrics) */}
          <div className="framescan-core-grid">
            <SAxisPanel report={report} />
            <ScanChamberPanel report={report} />
            <SystemMetricsPanel report={report} />
          </div>

          {/* Image Panel — shows input image for image scans */}
          <ImagePanel report={report} />

          {/* Behavioral Axis Breakdown */}
          <NineAxisBreakdownPanel report={report} />

          {/* Synthesis Note Card */}
          <SynthesisNotePanel
            report={report}
            onNoteCreated={handleNoteCreated}
          />

          {/* Deep Analysis Panels */}
          <DeepAnalysisPanels report={report} />
        </div>
      </div>
    </div>
  );
};

export default FrameScanReportLayout;
