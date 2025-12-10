// =============================================================================
// BEHAVIORAL AXIS BREAKDOWN PANEL — 2×3 grid of axis cards
// =============================================================================
// Each card shows a small gauge on the left with category label and summary
// text on the right. Uses central gauge config to map doctrine axes.
// Uses neon HUD card chrome styling with color-banded gauges.
// =============================================================================

import React from 'react';
import { FrameScanGauge } from './FrameScanGauge';
import { getGaugeDataForSlot } from '../../config/frameScanGaugeConfig';
import type { FrameScanReport } from '../../services/frameScanReportStore';

export interface NineAxisBreakdownPanelProps {
  report: FrameScanReport;
}

export const NineAxisBreakdownPanel: React.FC<NineAxisBreakdownPanelProps> = ({ report }) => {
  const { score } = report;

  // Get gauge data from central config (includes overall_frame as 6th gauge)
  const gaugeData = getGaugeDataForSlot('behavioral', score.axisScores, score.frameScore);

  return (
    <div className="framescan-nine-axis">
      {/* Section header */}
      <h2 className="framescan-nine-axis-title">BEHAVIORAL AXIS BREAKDOWN</h2>
      <p className="framescan-nine-axis-subtitle">
        Detailed analysis of behavioral patterns aligned with Apex Frame doctrine.
      </p>

      {/* 2×3 Grid */}
      <div className="framescan-nine-axis-grid">
        {gaugeData.map((gauge) => {
          const hasData = gauge.hasData;

          return (
            <div
              key={gauge.label}
              className={`framescan-panel framescan-axis-card${!hasData ? ' framescan-axis-card--insufficient' : ''}`}
            >
              {/* Small gauge on left */}
              <div className="framescan-axis-card-gauge">
                <FrameScanGauge
                  label=""
                  score={gauge.score}
                  band={gauge.band}
                  size={90}
                  showScore={false}
                  hasData={hasData}
                />
              </div>

              {/* Category label + summary text on right */}
              <div className="framescan-axis-card-content">
                <h4 className="framescan-axis-card-name">
                  {gauge.label}
                </h4>
                <p className="framescan-axis-card-description">
                  {!hasData
                    ? gauge.notes
                    : gauge.notes || gauge.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NineAxisBreakdownPanel;
