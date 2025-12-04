// =============================================================================
// FRAME SCORING — Deterministic scoring algorithm for FrameScan results
// =============================================================================
// This module implements the pure scoring logic that converts LLM-generated
// FrameScanResult objects into a final 0-100 FrameScore with full breakdown.
// =============================================================================

import {
  FrameScanResult,
  FrameScore,
  FrameAxisId,
  FrameAxisScore,
  FrameDomainId,
  FrameWinWinState,
  FrameBand,
  WeightedAxisScore,
} from "./frameTypes";
import { getDomainPriorityAxes } from "./frameSpec";

// =============================================================================
// INTERNAL HELPER FUNCTIONS
// =============================================================================

/**
 * Normalize an axis score from -3 to +3 range into 0 to 100 range.
 *
 * Mapping:
 * - -3 → 0
 * -  0 → 50
 * - +3 → 100
 *
 * @param score - Axis score from -3 to +3
 * @returns Normalized score from 0 to 100
 */
export function normalizeAxisScoreTo100(score: number): number {
  const clamped = Math.max(-3, Math.min(3, score));
  return ((clamped + 3) / 6) * 100;
}

/**
 * Compute weights for each axis based on domain priority.
 *
 * Rules:
 * - Every axis gets a base weight of 1
 * - Axes listed in the domain's priority_axes get an additional +1 (total 2)
 *
 * @param domain - The domain context for the scan
 * @param axisScores - The axis scores from the scan result
 * @returns A record mapping axis ID to weight
 */
export function computeAxisWeights(
  domain: FrameDomainId,
  axisScores: FrameAxisScore[]
): Record<FrameAxisId, number> {
  const priorityAxes = getDomainPriorityAxes(domain);
  const prioritySet = new Set(priorityAxes);

  const weights: Partial<Record<FrameAxisId, number>> = {};

  for (const axis of axisScores) {
    // Base weight of 1, plus 1 if it's a priority axis
    weights[axis.axisId] = prioritySet.has(axis.axisId) ? 2 : 1;
  }

  return weights as Record<FrameAxisId, number>;
}

/**
 * Apply Win/Win state adjustment to the base score.
 *
 * Adjustments:
 * - win_win: no penalty (0)
 * - neutral: -5
 * - win_lose: -15
 * - lose_lose: -30
 *
 * @param baseScore - The base score (0-100) before adjustment
 * @param winWinState - The Win/Win state from the scan
 * @returns Adjusted score, clamped to 0-100
 */
export function applyWinWinAdjustment(
  baseScore: number,
  winWinState: FrameWinWinState
): number {
  const penalties: Record<FrameWinWinState, number> = {
    win_win: 0,
    neutral: 5,
    win_lose: 15,
    lose_lose: 30,
  };

  const penalty = penalties[winWinState] ?? 0;
  const adjusted = baseScore - penalty;

  // Clamp to 0-100
  return Math.max(0, Math.min(100, adjusted));
}

/**
 * Determine the overall frame label based on score and axis distribution.
 *
 * Rules:
 * - If score >= 70 AND more than half of axes are mild_apex or strong_apex → "apex"
 * - If score <= 30 AND more than half of axes are mild_slave or strong_slave → "slave"
 * - Otherwise → "mixed"
 *
 * @param frameScore - The final numeric score (0-100)
 * @param axisScores - The individual axis scores
 * @returns The overall frame classification
 */
export function deriveOverallFrameLabel(
  frameScore: number,
  axisScores: FrameAxisScore[]
): "apex" | "slave" | "mixed" {
  if (axisScores.length === 0) {
    return "mixed";
  }

  const apexBands: FrameBand[] = ["mild_apex", "strong_apex"];
  const slaveBands: FrameBand[] = ["mild_slave", "strong_slave"];

  const apexCount = axisScores.filter((a) => apexBands.includes(a.band)).length;
  const slaveCount = axisScores.filter((a) => slaveBands.includes(a.band)).length;
  const halfCount = axisScores.length / 2;

  // Check for Apex classification
  if (frameScore >= 70 && apexCount > halfCount) {
    return "apex";
  }

  // Check for Slave classification
  if (frameScore <= 30 && slaveCount > halfCount) {
    return "slave";
  }

  // Default to mixed
  return "mixed";
}

/**
 * Calculate the weighted average of normalized axis scores.
 *
 * @param axisScores - The axis scores from the scan
 * @param weights - The weight for each axis
 * @returns The weighted average (0-100)
 */
function calculateWeightedAverage(
  axisScores: FrameAxisScore[],
  weights: Record<FrameAxisId, number>
): number {
  if (axisScores.length === 0) {
    return 50; // Neutral default
  }

  let weightedSum = 0;
  let totalWeight = 0;

  for (const axis of axisScores) {
    const normalized = normalizeAxisScoreTo100(axis.score);
    const weight = weights[axis.axisId] ?? 1;
    weightedSum += normalized * weight;
    totalWeight += weight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 50;
}

// =============================================================================
// MAIN SCORING FUNCTION
// =============================================================================

/**
 * Score a FrameScan result and produce a full FrameScore breakdown.
 *
 * Scoring algorithm:
 * 1. Normalize each axis score from -3..+3 to 0..100
 * 2. Determine weights based on domain priority axes
 * 3. Compute weighted average of normalized scores
 * 4. Apply Win/Win state adjustment (penalties for non-win_win states)
 * 5. Derive overall frame label based on final score and axis band distribution
 * 6. Return complete FrameScore with all breakdowns
 *
 * @param result - The FrameScanResult from LLM analysis
 * @returns The computed FrameScore with full breakdown
 */
export function scoreFrameScan(result: FrameScanResult): FrameScore {
  const { domain, overallWinWinState, axes } = result;

  // Step 1 & 2: Compute weights based on domain
  const weights = computeAxisWeights(domain, axes);

  // Step 3: Calculate weighted average
  const baseScore = calculateWeightedAverage(axes, weights);

  // Step 4: Apply Win/Win adjustment
  const adjustedScore = applyWinWinAdjustment(baseScore, overallWinWinState);

  // Step 5: Derive overall frame label
  const overallFrame = deriveOverallFrameLabel(adjustedScore, axes);

  // Step 6: Build the complete FrameScore object
  const weightedAxisScores: WeightedAxisScore[] = axes.map((axis) => ({
    axisId: axis.axisId,
    normalizedScore: normalizeAxisScoreTo100(axis.score),
    weight: weights[axis.axisId] ?? 1,
  }));

  // Generate summary notes
  const notes: string[] = [];
  notes.push(`Base frame score before Win/Win adjustment: ${baseScore.toFixed(1)}`);
  notes.push(`Final frame score after Win/Win adjustment: ${adjustedScore.toFixed(1)}`);
  notes.push(`Win/Win state: ${overallWinWinState}`);
  notes.push(`Domain: ${domain}`);

  // Add priority axes info
  const priorityAxes = getDomainPriorityAxes(domain);
  if (priorityAxes.length > 0) {
    notes.push(`Priority axes for domain: ${priorityAxes.join(", ")}`);
  }

  // Add frame classification reasoning
  const apexCount = axes.filter((a) =>
    ["mild_apex", "strong_apex"].includes(a.band)
  ).length;
  const slaveCount = axes.filter((a) =>
    ["mild_slave", "strong_slave"].includes(a.band)
  ).length;
  notes.push(
    `Axis distribution: ${apexCount} apex bands, ${slaveCount} slave bands, ${
      axes.length - apexCount - slaveCount
    } neutral`
  );

  return {
    frameScore: Math.round(adjustedScore),
    overallFrame,
    overallWinWinState,
    domain,
    axisScores: axes,
    weightedAxisScores,
    notes,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Create a quick summary string from a FrameScore.
 * Useful for display in UI components.
 *
 * @param score - The FrameScore to summarize
 * @returns A human-readable summary string
 */
export function summarizeFrameScore(score: FrameScore): string {
  const frameLabel = score.overallFrame.charAt(0).toUpperCase() + score.overallFrame.slice(1);
  const winWinLabel = score.overallWinWinState.replace(/_/g, "-");

  return `${score.frameScore}/100 • ${frameLabel} Frame • ${winWinLabel}`;
}

/**
 * Get a color/severity indicator for a frame score.
 * Useful for UI styling.
 *
 * @param frameScore - The numeric score (0-100)
 * @returns A severity level for styling
 */
export function getFrameScoreSeverity(
  frameScore: number
): "critical" | "warning" | "neutral" | "good" | "excellent" {
  if (frameScore >= 80) return "excellent";
  if (frameScore >= 65) return "good";
  if (frameScore >= 45) return "neutral";
  if (frameScore >= 25) return "warning";
  return "critical";
}

/**
 * Get the top N weakest axes (most slave-leaning) from a FrameScore.
 * Useful for prioritizing corrections.
 *
 * @param score - The FrameScore to analyze
 * @param n - Number of axes to return (default 3)
 * @returns The weakest axis scores, sorted from worst to least bad
 */
export function getWeakestAxes(score: FrameScore, n: number = 3): FrameAxisScore[] {
  return [...score.axisScores]
    .sort((a, b) => a.score - b.score)
    .slice(0, n);
}

/**
 * Get the top N strongest axes (most apex-leaning) from a FrameScore.
 * Useful for highlighting strengths.
 *
 * @param score - The FrameScore to analyze
 * @param n - Number of axes to return (default 3)
 * @returns The strongest axis scores, sorted from best to least good
 */
export function getStrongestAxes(score: FrameScore, n: number = 3): FrameAxisScore[] {
  return [...score.axisScores]
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}

