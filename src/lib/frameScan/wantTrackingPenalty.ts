// =============================================================================
// WANT TRACKING PENALTY — FrameScore modifier based on Want tracking compliance
// =============================================================================
// This module calculates a penalty for Contact Zero's FrameScore based on
// how well they are meeting their self-defined tracking goals.
//
// Key concepts:
// - Only applies to Contact Zero (the user), not other contacts
// - Uses a rolling 14-day lookback window
// - Metrics need 7+ tracked days to apply full penalty (ramp-up period)
// - Maximum total penalty is capped at 20 points
// - Penalty is calculated from weighted compliance rates
// =============================================================================

import {
  getWeightedMetricsCompliance,
  type MetricComplianceData,
} from '../../services/wantTrackingStore';
import { addWantTrackingPenaltyToMemory } from '../../services/aiMemoryAdapters';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Rolling lookback window in days */
export const LOOKBACK_DAYS = 14;

/** Minimum tracked days before full penalty applies */
export const MIN_TRACKED_DAYS_FOR_FULL_PENALTY = 7;

/** Maximum total penalty in FrameScore points */
export const MAX_TOTAL_PENALTY = 20;

/** Failure threshold - compliance below this starts incurring penalty */
export const FAILURE_THRESHOLD = 0.7;

// =============================================================================
// TYPES
// =============================================================================

/**
 * Detailed breakdown of tracking penalty calculation.
 * Useful for debugging and displaying penalty reasoning to the user.
 */
export interface WantTrackingPenaltyBreakdown {
  /** Total penalty points to subtract from FrameScore (0 to MAX_TOTAL_PENALTY) */
  totalPenalty: number;
  /** Per-metric breakdown of penalties */
  metricPenalties: MetricPenaltyDetail[];
  /** Date range used for calculation */
  dateRange: {
    startDate: string;
    endDate: string;
  };
  /** Summary notes for display */
  notes: string[];
}

/**
 * Per-metric penalty detail.
 */
export interface MetricPenaltyDetail {
  metricSlug: string;
  trackedDays: number;
  completedDays: number;
  complianceRate: number;
  effectiveFailure: number;
  rawPenalty: number;
  rampUpFactor: number;
  finalPenalty: number;
}

// =============================================================================
// DATE HELPERS
// =============================================================================

/**
 * Get today's date in YYYY-MM-DD format (local time).
 */
const getTodayDate = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Get a date N days ago in YYYY-MM-DD format.
 */
const getDateNDaysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

// =============================================================================
// PENALTY CALCULATION
// =============================================================================

/**
 * Calculate the tracking penalty for Contact Zero.
 *
 * Algorithm:
 * 1. Get compliance data for all weighted metrics in the lookback window
 * 2. For each metric:
 *    a. Calculate effectiveFailure = max(0, FAILURE_THRESHOLD - complianceRate)
 *    b. Calculate rawPenalty = effectiveFailure * frameScoreWeight * MAX_TOTAL_PENALTY
 *    c. Apply ramp-up factor: if trackedDays < 7, scale by trackedDays/7
 * 3. Sum all metric penalties, cap at MAX_TOTAL_PENALTY
 *
 * @returns The penalty breakdown with total penalty and per-metric details
 */
export function calculateWantTrackingPenalty(): WantTrackingPenaltyBreakdown {
  const endDate = getTodayDate();
  const startDate = getDateNDaysAgo(LOOKBACK_DAYS - 1); // 14 days including today

  // Get compliance data for weighted metrics
  const complianceData = getWeightedMetricsCompliance(startDate, endDate);

  const notes: string[] = [];
  const metricPenalties: MetricPenaltyDetail[] = [];

  // No weighted metrics = no penalty
  if (complianceData.length === 0) {
    notes.push('No metrics with FrameScore weight defined.');
    return {
      totalPenalty: 0,
      metricPenalties: [],
      dateRange: { startDate, endDate },
      notes,
    };
  }

  notes.push(`Analyzing ${complianceData.length} weighted metric(s) over ${LOOKBACK_DAYS} days.`);

  // Calculate total weight to normalize penalties
  const totalWeight = complianceData.reduce((sum, m) => sum + m.frameScoreWeight, 0);

  // Calculate per-metric penalties
  let rawTotalPenalty = 0;

  for (const metric of complianceData) {
    // Calculate effective failure (how far below threshold)
    const effectiveFailure = Math.max(0, FAILURE_THRESHOLD - metric.complianceRate);

    // Calculate raw penalty contribution
    // Normalized by total weight so metrics compete fairly for the penalty budget
    const normalizedWeight = totalWeight > 0 ? metric.frameScoreWeight / totalWeight : 0;
    const rawPenalty = effectiveFailure * normalizedWeight * MAX_TOTAL_PENALTY;

    // Apply ramp-up factor for new metrics
    const rampUpFactor = Math.min(1, metric.trackedDays / MIN_TRACKED_DAYS_FOR_FULL_PENALTY);
    const finalPenalty = rawPenalty * rampUpFactor;

    metricPenalties.push({
      metricSlug: metric.metricSlug,
      trackedDays: metric.trackedDays,
      completedDays: metric.completedDays,
      complianceRate: metric.complianceRate,
      effectiveFailure,
      rawPenalty,
      rampUpFactor,
      finalPenalty,
    });

    rawTotalPenalty += finalPenalty;
  }

  // Cap total penalty
  const totalPenalty = Math.min(MAX_TOTAL_PENALTY, Math.round(rawTotalPenalty * 10) / 10);

  // Generate summary notes
  const failingMetrics = metricPenalties.filter(m => m.finalPenalty > 0);
  if (failingMetrics.length > 0) {
    notes.push(`${failingMetrics.length} metric(s) below ${FAILURE_THRESHOLD * 100}% compliance threshold.`);
    for (const m of failingMetrics) {
      notes.push(`  - ${m.metricSlug}: ${Math.round(m.complianceRate * 100)}% compliance → -${m.finalPenalty.toFixed(1)} points`);
    }
  } else {
    notes.push('All metrics meeting compliance threshold.');
  }

  notes.push(`Total tracking penalty: -${totalPenalty} points`);

  const breakdown: WantTrackingPenaltyBreakdown = {
    totalPenalty,
    metricPenalties,
    dateRange: { startDate, endDate },
    notes,
  };

  // Feed into AI memory for self-improving AI layer
  try {
    addWantTrackingPenaltyToMemory(breakdown);
  } catch (err) {
    console.warn('[wantTrackingPenalty] Failed to add penalty to AI memory:', err);
  }

  return breakdown;
}

/**
 * Get just the numeric penalty value for quick FrameScore adjustment.
 * Use this when you don't need the full breakdown.
 *
 * @returns Penalty points (0 to MAX_TOTAL_PENALTY)
 */
export function getWantTrackingPenalty(): number {
  return calculateWantTrackingPenalty().totalPenalty;
}

/**
 * Apply the tracking penalty to a base FrameScore.
 * Only use this for Contact Zero.
 *
 * @param baseScore - The base FrameScore (0-100)
 * @returns Adjusted score after applying tracking penalty, clamped to 0-100
 */
export function applyWantTrackingPenalty(baseScore: number): number {
  const penalty = getWantTrackingPenalty();
  const adjusted = baseScore - penalty;
  return Math.max(0, Math.min(100, adjusted));
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  calculateWantTrackingPenalty,
  getWantTrackingPenalty,
  applyWantTrackingPenalty,
  LOOKBACK_DAYS,
  MIN_TRACKED_DAYS_FOR_FULL_PENALTY,
  MAX_TOTAL_PENALTY,
  FAILURE_THRESHOLD,
};
