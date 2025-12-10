// =============================================================================
// DEEP ANALYSIS PANELS — Bottom section with diagnostic text
// =============================================================================
// Four stacked text panels showing diagnostics, corrections, and recommendations.
// Each panel displays heading + scrollable paragraphs with neon HUD styling.
// Shows red banner when there's not enough context.
// =============================================================================

import React from 'react';
import type { FrameScanReport } from '../../services/frameScanReportStore';

export interface DeepAnalysisPanelsProps {
  report: FrameScanReport;
}

// Helper to format axis names
function formatAxisName(axisId: string): string {
  return axisId
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Deduplicate lines in content to avoid repetition
 * Splits by newlines, removes exact duplicates, rejoins
 */
function deduplicateContent(content: string): string {
  const lines = content.split('\n');
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Keep empty lines for spacing, but dedupe non-empty ones
    if (trimmed === '' || !seen.has(trimmed)) {
      unique.push(line);
      if (trimmed !== '') {
        seen.add(trimmed);
      }
    }
  }

  return unique.join('\n');
}

export const DeepAnalysisPanels: React.FC<DeepAnalysisPanelsProps> = ({ report }) => {
  const { rawResult } = report;

  // Safely extract data from rawResult with defensive checks
  const diagnostics = rawResult?.diagnostics || { primaryPatterns: [], supportingEvidence: [] };
  const corrections = rawResult?.corrections || { topShifts: [], sampleRewrites: [] };

  const supportingEvidence = Array.isArray(diagnostics.supportingEvidence)
    ? diagnostics.supportingEvidence
    : [];
  const topShifts = Array.isArray(corrections.topShifts)
    ? corrections.topShifts
    : [];
  const primaryPatterns = Array.isArray(diagnostics.primaryPatterns)
    ? diagnostics.primaryPatterns
    : [];

  // Build panel content from diagnostics and corrections
  // Each panel shows different aspects of the analysis
  const panels = [
    {
      id: 'deep-pattern-analysis',
      title: 'DEEP PATTERN ANALYSIS',
      content: supportingEvidence.length > 0
        ? supportingEvidence.filter(Boolean).join('\n\n')
        : null,
    },
    {
      id: 'behavioral-structural-shift',
      title: 'BEHAVIORAL STRUCTURAL SHIFT',
      content: topShifts.length > 0
        ? topShifts
            .filter(shift => shift && shift.axisId && shift.shift)
            .map(shift => `${formatAxisName(shift.axisId)}: ${shift.shift}`)
            .join('\n\n')
        : null,
    },
    {
      id: 'apex-protocol-rewrite',
      title: 'APEX PROTOCOL REWRITE',
      content: (() => {
        const allSteps = topShifts
          .filter(shift => shift && Array.isArray(shift.protocolSteps) && shift.protocolSteps.length > 0)
          .flatMap(shift => shift.protocolSteps.filter(Boolean));
        return allSteps.length > 0 ? allSteps.join('\n\n') : null;
      })(),
    },
    {
      id: 'strategic-implementation',
      title: 'STRATEGIC IMPLEMENTATION',
      content: primaryPatterns.length > 0
        ? `Address these primary patterns: ${primaryPatterns.filter(Boolean).join(', ')}.\n\nFocus on the highest leverage shifts identified above. Start with awareness of these patterns in your next communication, then progressively implement the protocol steps.`
        : null,
    },
  ];

  return (
    <div className="framescan-narratives">
      {panels.map(panel => (
        <div
          key={panel.id}
          className="framescan-narrative-panel"
        >
          <h3 className="framescan-narrative-title">
            {panel.title}
          </h3>

          {panel.content ? (
            <div className="framescan-narrative-content">
              {deduplicateContent(panel.content)}
            </div>
          ) : (
            <div className="framescan-insufficient-banner framescan-insufficient-banner--compact">
              Not enough context provided for this section. Re-scan with clearer who / what / stakes.
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default DeepAnalysisPanels;
