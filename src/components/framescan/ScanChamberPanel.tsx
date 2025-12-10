// =============================================================================
// SCAN CHAMBER PANEL — Center panel with Little Lord Orb animation
// =============================================================================
// Displays the animated 3D particle orb from LittleLordOrbView in a contained
// chamber with grid background and glowing chrome border.
// Now wrapped with ElectricBorder for animated cyan glow effect.
// =============================================================================

import React from 'react';
import { LittleLordOrbView, type SpiritState } from '../littleLord/LittleLordOrbView';
import ElectricBorder from '../ElectricBorder';
import type { FrameScanReport } from '../../services/frameScanReportStore';

export interface ScanChamberPanelProps {
  report: FrameScanReport;
}

export const ScanChamberPanel: React.FC<ScanChamberPanelProps> = ({ report }) => {
  // Calm/neutral spirit state for ambient animation
  const spiritState: SpiritState = {
    isThinking: false,
    isSpeaking: false,
    emotion: 'neutral',
  };

  return (
    <div className="framescan-panel framescan-scan-chamber">
      {/* Section header */}
      <h3 className="framescan-card-title">SCAN CHAMBER</h3>

      {/* Chamber container with ElectricBorder and orb */}
      <ElectricBorder
        color="#5fe0ff"
        speed={0.8}
        chaos={0.6}
        thickness={2}
        className="framescan-chamber-electric-wrapper"
      >
        <div className="framescan-chamber-orb-container">
          {/* Grid overlay */}
          <div className="framescan-chamber-grid" />

          {/* Animated scanline */}
          <div className="framescan-chamber-scanline" />

          {/* Little Lord Orb */}
          <LittleLordOrbView state={spiritState} />
        </div>
      </ElectricBorder>

      {/* Status indicator */}
      <span className="framescan-chamber-status">SCAN COMPLETE</span>
    </div>
  );
};

export default ScanChamberPanel;
