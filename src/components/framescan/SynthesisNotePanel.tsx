// =============================================================================
// SYNTHESIS NOTE PANEL — Summary card with Add to Notes action
// =============================================================================
// Displays a synthesized summary of the FrameScan report that can be
// converted into a Note in the notes system. Contains generated prose
// and an "Add to Notes" button.
// =============================================================================

import React, { useState } from 'react';
import { createNote } from '../../services/noteStore';
import { showToast } from '../Toast';
import type { FrameScanReport } from '../../services/frameScanReportStore';

export interface SynthesisNotePanelProps {
  report: FrameScanReport;
  onNoteCreated?: (noteId: string) => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format domain ID to a readable title case label
 */
function toTitleCase(str: string): string {
  return str
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format date as YYYY-MM-DD
 */
function formatDate(isoString: string): string {
  return isoString.split('T')[0];
}

/**
 * Build a note title from the report
 */
function buildFrameScanNoteTitle(report: FrameScanReport): string {
  const date = formatDate(report.createdAt);
  const domainLabel = toTitleCase(report.domain || 'Generic');
  return `FrameScan – ${domainLabel} – ${date}`;
}

/**
 * Convert axis ID to a wiki link
 */
function axisToWikiLink(axisId: string): string {
  const axisNames: Record<string, string> = {
    assumptive_state: 'Assumptive State',
    buyer_seller_position: 'Buyer Seller Position',
    identity_vs_tactic: 'Identity vs Tactic',
    internal_sale: 'Internal Sale',
    win_win_integrity: 'Win-Win Integrity',
    persuasion_style: 'Persuasion Style',
    pedestalization: 'Pedestalization',
    self_trust_vs_permission: 'Self Trust vs Permission',
    field_strength: 'Field Strength',
  };
  const name = axisNames[axisId] || toTitleCase(axisId);
  return `[[${name}]]`;
}

/**
 * Convert frame type to wiki link
 */
function frameToWikiLink(frame: string): string {
  const frameMap: Record<string, string> = {
    apex: 'Apex Frame',
    slave: 'Slave Frame',
    mixed: 'Mixed Frame',
    neutral: 'Neutral Frame',
  };
  return `[[${frameMap[frame] || frame}]]`;
}

/**
 * Convert win/win state to wiki link
 */
function winWinToWikiLink(state: string): string {
  const stateMap: Record<string, string> = {
    win_win: 'Win-Win',
    win_lose: 'Win-Lose',
    lose_lose: 'Lose-Lose',
    neutral: 'Neutral State',
  };
  return `[[${stateMap[state] || state}]]`;
}

/**
 * Build the note body from report data
 * Creates a structured markdown document with the scan results
 */
function buildFrameScanNoteBody(report: FrameScanReport, opts?: { autoWikiLink?: boolean }): string {
  const { score, rawResult } = report;

  // Extract data with safe defaults
  const diagnostics = rawResult.diagnostics || { primaryPatterns: [], supportingEvidence: [] };
  const corrections = rawResult.corrections || { topShifts: [], sampleRewrites: [] };
  const primaryPatterns = diagnostics.primaryPatterns || [];
  const topShifts = corrections.topShifts || [];

  // Helper for conditional wiki-linking
  const concept = (label: string): string => {
    if (opts?.autoWikiLink === false) return label;
    return `[[${label}]]`;
  };

  // Build sections
  const sections: string[] = [];

  // Header with doctrine wiki links
  sections.push(`# FrameScan Analysis`);
  sections.push('');

  // Build frame and win-win tags with conditional wiki-linking
  const frameTag = opts?.autoWikiLink === false
    ? score.overallFrame.charAt(0).toUpperCase() + score.overallFrame.slice(1) + ' Frame'
    : frameToWikiLink(score.overallFrame);
  const winWinTag = opts?.autoWikiLink === false
    ? score.overallWinWinState.replace(/_/g, '-').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('-')
    : winWinToWikiLink(score.overallWinWinState);

  sections.push(`**Tags:** ${concept('Frame Score')} ${frameTag} ${winWinTag}`);
  sections.push('');

  // Score summary box
  sections.push(`---`);
  sections.push(`### Score: ${score.frameScore}/100`);
  sections.push(`- **Frame:** ${score.overallFrame.toUpperCase()}`);
  sections.push(`- **Win-Win State:** ${score.overallWinWinState.replace(/_/g, ' ').toUpperCase()}`);
  sections.push(`- **Domain:** ${toTitleCase(report.domain)}`);
  sections.push(`---`);
  sections.push('');

  // Primary patterns detected
  if (primaryPatterns.length > 0) {
    sections.push(`## Patterns Detected`);
    sections.push('');
    primaryPatterns.forEach(pattern => {
      sections.push(`• ${pattern}`);
    });
    sections.push('');
  }

  // Recommended shifts with wiki links
  if (topShifts.length > 0) {
    sections.push(`## Priority Corrections`);
    sections.push('');
    topShifts.forEach(shift => {
      // Build axis label with conditional wiki-linking
      const axisLabel = opts?.autoWikiLink === false
        ? toTitleCase(shift.axisId)
        : axisToWikiLink(shift.axisId);
      sections.push(`### ${axisLabel}`);
      sections.push('');
      sections.push(`${shift.shift}`);
      sections.push('');

      if (shift.protocolSteps && shift.protocolSteps.length > 0) {
        sections.push(`**Protocol:**`);
        shift.protocolSteps.forEach((step, i) => {
          sections.push(`${i + 1}. ${step}`);
        });
        sections.push('');
      }
    });
  }

  // Axis scores with wiki links
  if (score.axisScores && score.axisScores.length > 0) {
    sections.push(`## Axis Breakdown`);
    sections.push('');
    score.axisScores.forEach(axis => {
      const axisLink = axisToWikiLink(axis.axisId);
      const scoreStr = axis.score !== null ? (axis.score > 0 ? `+${axis.score.toFixed(1)}` : axis.score.toFixed(1)) : 'N/A';
      const bandLabel = axis.band.replace(/_/g, ' ').toUpperCase();
      sections.push(`- ${axisLink}: **${scoreStr}** (${bandLabel})`);
    });
    sections.push('');
  }

  // Related concepts footer
  sections.push(`---`);
  sections.push(`*Related: ${concept('Apex Frame')} ${concept('Frame Score')} ${concept('Win-Win')} ${concept('FrameScan')}*`);

  return sections.join('\n');
}

/**
 * Generate a synthesis preview (shorter version for display)
 */
function generateSynthesisPreview(report: FrameScanReport): string {
  const { score, rawResult } = report;

  const diagnostics = rawResult.diagnostics || { primaryPatterns: [], supportingEvidence: [] };
  const corrections = rawResult.corrections || { topShifts: [] };
  const primaryPatterns = diagnostics.primaryPatterns || [];
  const topShifts = corrections.topShifts || [];

  const lines: string[] = [];

  // Summary line
  lines.push(`This scan identified a ${score.overallFrame.toUpperCase()} frame with a FrameScore of ${score.frameScore}.`);
  lines.push('');

  // Primary patterns
  if (primaryPatterns.length > 0) {
    lines.push(`Key patterns detected: ${primaryPatterns.slice(0, 3).join(', ')}.`);
    lines.push('');
  }

  // Top shifts summary
  if (topShifts.length > 0) {
    lines.push(`Priority corrections needed:`);
    topShifts.slice(0, 3).forEach(shift => {
      const axisLabel = toTitleCase(shift.axisId);
      lines.push(`• ${axisLabel}: ${shift.shift}`);
    });
    lines.push('');
  }

  // If no content, show placeholder
  if (lines.length <= 1) {
    return 'Analysis complete. Click "Add to Notes" to save a detailed summary of this FrameScan report.';
  }

  return lines.join('\n');
}

// =============================================================================
// COMPONENT
// =============================================================================

export const SynthesisNotePanel: React.FC<SynthesisNotePanelProps> = ({
  report,
  onNoteCreated,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [created, setCreated] = useState(false);
  const [autoWikiLink, setAutoWikiLink] = useState<boolean>(true);

  // Generate synthesis preview
  const synthesisPreview = generateSynthesisPreview(report);

  // Handle Add to Notes click
  const handleAddToNotes = async () => {
    if (isCreating || created) return;

    setIsCreating(true);

    try {
      const title = buildFrameScanNoteTitle(report);
      const body = buildFrameScanNoteBody(report, { autoWikiLink });

      // Get the first contact ID from the report (or use contact_zero for self-scans)
      const contactId = report.subjectContactIds?.[0] || 'contact_zero';

      // Create the note
      const note = createNote({
        title,
        content: body,
        contactId,
        kind: 'note',
        folderId: 'inbox',
        tags: ['framescan', report.domain],
      });

      setCreated(true);

      // Show success toast with click-to-view action
      showToast({
        type: 'success',
        title: 'Synthesis Note added to Notes',
        message: 'Click to view the new note',
        onClick: () => {
          if (onNoteCreated) {
            onNoteCreated(note.id);
          }
        },
      });
    } catch (error) {
      console.error('Failed to create note from FrameScan:', error);

      // Show error toast
      showToast({
        type: 'error',
        title: 'Failed to create note',
        message: 'Please try again',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <section className="framescan-synthesis-card">
      <div className="framescan-synthesis-header">
        <h3 className="framescan-synthesis-title">
          <span>Synthesis Note</span>
          <span className="framescan-synthesis-title-sep"> — </span>
          <span className="framescan-synthesis-title-status">Ready to Save</span>
        </h3>

        <div className="framescan-synthesis-toggle-wrapper">
          <label className="framescan-synthesis-toggle-label">
            <span className="framescan-synthesis-toggle-text">Auto wiki-link</span>
            <button
              onClick={() => setAutoWikiLink(!autoWikiLink)}
              className={`framescan-synthesis-toggle ${autoWikiLink ? 'framescan-synthesis-toggle--active' : ''}`}
              type="button"
              role="switch"
              aria-checked={autoWikiLink}
            >
              <span
                className={`framescan-synthesis-toggle-thumb ${
                  autoWikiLink ? 'framescan-synthesis-toggle-thumb--active' : ''
                }`}
              />
            </button>
          </label>
        </div>
      </div>

      <div className={synthesisPreview ? 'framescan-synthesis-body' : 'framescan-synthesis-placeholder'}>
        {synthesisPreview || 'Synthesis not available for this report yet.'}
      </div>

      <div className="framescan-synthesis-actions">
        <button
          className="framescan-add-to-notes-btn"
          onClick={handleAddToNotes}
          disabled={isCreating || created}
          style={created ? { opacity: 0.6, cursor: 'default' } : undefined}
        >
          {/* Note icon */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          {created ? 'Added to Notes' : isCreating ? 'Creating...' : 'Add to Notes'}
        </button>
      </div>
    </section>
  );
};

export default SynthesisNotePanel;
