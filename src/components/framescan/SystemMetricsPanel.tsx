// =============================================================================
// SIGNAL QUALITY PANEL — Right column with stacked gauges
// =============================================================================
// Displays two gauge components for Signal Quality Metrics.
// Uses central gauge config to map doctrine axes to UI slots.
// Uses neon HUD card chrome styling with color-banded gauges.
// =============================================================================

import React from 'react';
import { FrameScanGauge } from './FrameScanGauge';
import { getGaugeDataForSlot } from '../../config/frameScanGaugeConfig';
import type { FrameScanReport } from '../../services/frameScanReportStore';

export interface SystemMetricsPanelProps {
  report: FrameScanReport;
}

export const SystemMetricsPanel: React.FC<SystemMetricsPanelProps> = ({ report }) => {
  const { score } = report;

  // Get gauge data from central config
  const gaugeData = getGaugeDataForSlot('system', score.axisScores);

  return (
    <div className="framescan-panel framescan-gauge-panel">
      {/* Section header */}
      <h3 className="framescan-card-title">SIGNAL QUALITY</h3>

      {/* Gauge stack */}
      <div className="framescan-gauge-stack">
        {gaugeData.map((gauge) => (
          <div key={gauge.label} className="framescan-gauge-item">
            <FrameScanGauge
              label={gauge.label}
              score={gauge.score}
              band={gauge.band}
              size={130}
              hasData={gauge.hasData}
            />
            <p className="framescan-gauge-description">{gauge.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemMetricsPanel;
