// =============================================================================
// FRAME PROFILE — Cumulative frame profile computation for contacts
// =============================================================================
// Computes a running frame profile based on FrameScan reports.
//
// TODO: Future expansions:
// - Add FrameScoreLedger for event-based score adjustments
// - Add task-based penalties (missed commitments decrease score)
// - Add time-weighted decay (older scans count less)
// - Add domain-specific profiles (business vs personal)
// =============================================================================

import type { FrameScanReport } from '../../services/frameScanReportStore';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Cumulative frame profile for a contact.
 * Currently a simple average; will expand to include ledger events.
 */
export interface CumulativeFrameProfile {
  contactId: string;
  currentFrameScore: number;       // 0 to 100
  scansCount: number;
  lastScanAt?: string;             // ISO timestamp of most recent scan
  // TODO: Add these in future iterations
  // pendingPenalties?: number;
  // ledgerAdjustments?: number;
  // confidenceLevel?: 'low' | 'medium' | 'high';
}

/**
 * Profile trend data for UI display.
 */
export interface FrameProfileTrend {
  direction: 'up' | 'down' | 'flat';
  changeAmount: number;            // Absolute change from previous scan
  changePercent: number;           // Percentage change
}

// =============================================================================
// CORE COMPUTATION
// =============================================================================

/**
 * Compute cumulative frame profile for a contact based on their scan reports.
 * 
 * Current implementation: Simple average of frameScore across all reports.
 * Future: Will incorporate ledger events and task penalties.
 * 
 * @param contactId - The contact ID to compute profile for
 * @param reports - All FrameScanReports for this contact (pre-filtered)
 * @returns CumulativeFrameProfile with current score and metadata
 */
export function computeCumulativeFrameProfileForContact(
  contactId: string,
  reports: FrameScanReport[]
): CumulativeFrameProfile {
  // No reports = default profile
  if (reports.length === 0) {
    return {
      contactId,
      currentFrameScore: 50, // Neutral default
      scansCount: 0,
      lastScanAt: undefined,
    };
  }

  // Sort reports by date (most recent first)
  const sortedReports = [...reports].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Simple average of all scores
  const totalScore = sortedReports.reduce((sum, r) => sum + r.score.frameScore, 0);
  const averageScore = Math.round(totalScore / sortedReports.length);

  // TODO: Apply ledger adjustments here
  // const adjustedScore = applyLedgerAdjustments(averageScore, contactId);
  
  // TODO: Apply task-based penalties here
  // const finalScore = applyTaskPenalties(adjustedScore, contactId);

  return {
    contactId,
    currentFrameScore: Math.max(0, Math.min(100, averageScore)),
    scansCount: sortedReports.length,
    lastScanAt: sortedReports[0].createdAt,
  };
}

// =============================================================================
// TREND ANALYSIS
// =============================================================================

/**
 * Compute the trend between the two most recent scans.
 */
export function computeFrameProfileTrend(reports: FrameScanReport[]): FrameProfileTrend | null {
  if (reports.length < 2) {
    return null;
  }

  // Sort by date (most recent first)
  const sorted = [...reports].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const current = sorted[0].score.frameScore;
  const previous = sorted[1].score.frameScore;
  
  const changeAmount = current - previous;
  const changePercent = previous !== 0 
    ? Math.round((changeAmount / previous) * 100) 
    : 0;

  let direction: 'up' | 'down' | 'flat';
  if (changeAmount > 2) {
    direction = 'up';
  } else if (changeAmount < -2) {
    direction = 'down';
  } else {
    direction = 'flat';
  }

  return {
    direction,
    changeAmount: Math.abs(changeAmount),
    changePercent: Math.abs(changePercent),
  };
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get a human-readable label for the frame score.
 */
export function getFrameScoreLabel(score: number): string {
  if (score >= 80) return 'Strong Apex';
  if (score >= 65) return 'Mild Apex';
  if (score >= 45) return 'Neutral';
  if (score >= 25) return 'Mild Slave';
  return 'Strong Slave';
}

/**
 * Get color class for frame score (for UI styling).
 */
export function getFrameScoreColorClass(score: number): string {
  if (score >= 80) return 'text-green-400';
  if (score >= 65) return 'text-emerald-400';
  if (score >= 45) return 'text-yellow-400';
  if (score >= 25) return 'text-orange-400';
  return 'text-red-400';
}

/**
 * Get background color class for frame score.
 */
export function getFrameScoreBgClass(score: number): string {
  if (score >= 80) return 'bg-green-500/20 border-green-500/30';
  if (score >= 65) return 'bg-emerald-500/20 border-emerald-500/30';
  if (score >= 45) return 'bg-yellow-500/20 border-yellow-500/30';
  if (score >= 25) return 'bg-orange-500/20 border-orange-500/30';
  return 'bg-red-500/20 border-red-500/30';
}

/**
 * Format a date for display in frame profile context.
 */
export function formatProfileDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else {
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
    });
  }
}

// =============================================================================
// TODO: FUTURE LEDGER & TASK INTEGRATION
// =============================================================================

// /**
//  * FrameScoreLedger entry - for event-based score adjustments.
//  * TODO: Implement in future iteration.
//  */
// export interface FrameScoreLedgerEntry {
//   id: string;
//   contactId: string;
//   eventType: 'task_completed' | 'task_missed' | 'commitment_kept' | 'commitment_broken' | 'manual_adjustment';
//   adjustment: number; // Positive or negative
//   reason: string;
//   createdAt: string;
// }

// /**
//  * Apply ledger adjustments to base score.
//  * TODO: Implement when ledger store is created.
//  */
// function applyLedgerAdjustments(baseScore: number, contactId: string): number {
//   // Get ledger entries for contact
//   // Sum up adjustments
//   // Apply with decay based on age
//   return baseScore;
// }

// /**
//  * Apply task-based penalties.
//  * TODO: Implement when task integration is ready.
//  */
// function applyTaskPenalties(score: number, contactId: string): number {
//   // Get overdue tasks for contact
//   // Apply penalty per missed task
//   // Consider task importance/priority
//   return score;
// }




