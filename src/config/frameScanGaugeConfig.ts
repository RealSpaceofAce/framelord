// =============================================================================
// FRAMESCAN GAUGE CONFIG — Central mapping of doctrine axes to UI gauges
// =============================================================================
// Maps the 9 doctrine axes + 1 composite to exactly 10 UI gauge slots.
// Labels and descriptions are aligned with Apex Frame doctrine terminology.
// =============================================================================

import type { FrameAxisId, FrameAxisScore, FrameBand } from '../lib/frameScan/frameTypes';

// =============================================================================
// TYPES
// =============================================================================

export type GaugeSlot = 'core' | 'system' | 'behavioral';

export interface GaugeConfig {
  /** Internal axis ID from doctrine (null for composite gauges) */
  axisId: FrameAxisId | 'overall_frame';
  /** Display label shown below the gauge - doctrine-aligned */
  label: string;
  /** Short description explaining what this axis measures */
  shortDescription: string;
  /** Which UI panel slot this gauge appears in */
  slot: GaugeSlot;
  /** Order within the slot (0-based) */
  order: number;
}

export interface GaugeData {
  id: string;
  label: string;
  description: string;
  slot: GaugeSlot;
  order: number;
  score: number | null;
  band: FrameBand;
  notes: string;
  hasData: boolean;
}

// =============================================================================
// GAUGE CONFIGURATION — 10 total gauges with doctrine-aligned labels
// =============================================================================

export const FRAMESCAN_GAUGE_CONFIG: GaugeConfig[] = [
  // CORE FRAME METRICS (2 gauges) — high-level overall state
  {
    axisId: 'assumptive_state',
    label: 'ASSUMPTIVE STATE',
    shortDescription: 'Belief in being wanted vs needing to prove worth',
    slot: 'core',
    order: 0,
  },
  {
    axisId: 'buyer_seller_position',
    label: 'BUYER VS SELLER',
    shortDescription: 'Screening for fit vs seeking approval',
    slot: 'core',
    order: 1,
  },

  // SIGNAL QUALITY METRICS (2 gauges) — consistency and coherence
  {
    axisId: 'identity_vs_tactic',
    label: 'IDENTITY VS TACTIC',
    shortDescription: 'Worth separate from outcomes vs fused with results',
    slot: 'system',
    order: 0,
  },
  {
    axisId: 'internal_sale',
    label: 'INTERNAL SALE',
    shortDescription: 'Self-conviction before interaction vs seeking validation',
    slot: 'system',
    order: 1,
  },

  // BEHAVIORAL AXIS BREAKDOWN (6 gauges) — detailed behavioral patterns
  {
    axisId: 'win_win_integrity',
    label: 'WIN-WIN INTEGRITY',
    shortDescription: 'Mutual gain orientation vs extraction or coercion',
    slot: 'behavioral',
    order: 0,
  },
  {
    axisId: 'persuasion_style',
    label: 'PERSUASION STYLE',
    shortDescription: 'Leading with clarity vs chasing compliance',
    slot: 'behavioral',
    order: 1,
  },
  {
    axisId: 'pedestalization',
    label: 'PEDESTALIZATION',
    shortDescription: 'Self as origin vs orbiting external validation',
    slot: 'behavioral',
    order: 2,
  },
  {
    axisId: 'self_trust_vs_permission',
    label: 'SELF-TRUST',
    shortDescription: 'Inner authority vs external permission seeking',
    slot: 'behavioral',
    order: 3,
  },
  {
    axisId: 'field_strength',
    label: 'FIELD STRENGTH',
    shortDescription: 'Coherent presence vs scattered/chaotic energy',
    slot: 'behavioral',
    order: 4,
  },
  {
    axisId: 'overall_frame',
    label: 'FRAME INTEGRITY',
    shortDescription: 'Overall alignment with Apex Frame doctrine',
    slot: 'behavioral',
    order: 5,
  },
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get gauge configs for a specific slot, sorted by order.
 */
export function getGaugesForSlot(slot: GaugeSlot): GaugeConfig[] {
  return FRAMESCAN_GAUGE_CONFIG
    .filter(g => g.slot === slot)
    .sort((a, b) => a.order - b.order);
}

/**
 * Look up an axis score by axis ID from the scores array.
 */
export function findAxisScore(
  axisScores: FrameAxisScore[] | undefined,
  axisId: FrameAxisId
): FrameAxisScore | null {
  if (!axisScores || !Array.isArray(axisScores)) return null;
  return axisScores.find(a => a.axisId === axisId) || null;
}

/**
 * Check if a score value represents valid data
 */
function isValidScore(score: number | null | undefined): boolean {
  return score !== null && score !== undefined && !isNaN(score);
}

/**
 * Convert axis scores array into gauge data for a specific slot.
 * Returns array of GaugeData objects ready for rendering.
 */
export function getGaugeDataForSlot(
  slot: GaugeSlot,
  axisScores: FrameAxisScore[] | undefined,
  overallFrameScore?: number
): GaugeData[] {
  const configs = getGaugesForSlot(slot);

  return configs.map(config => {
    // Special handling for composite "overall_frame" gauge
    if (config.axisId === 'overall_frame') {
      const hasValidScore = overallFrameScore != null && !isNaN(overallFrameScore);
      const normalizedScore = hasValidScore
        ? normalizeScoreToGaugeRange(overallFrameScore)
        : null;

      return {
        id: config.axisId,
        label: config.label,
        description: config.shortDescription,
        slot: config.slot,
        order: config.order,
        score: normalizedScore,
        band: normalizedScore != null ? scoreToGaugeBand(normalizedScore) : 'neutral',
        notes: config.shortDescription,
        hasData: hasValidScore,
      };
    }

    // Standard axis gauge
    const axisScore = findAxisScore(axisScores, config.axisId as FrameAxisId);
    const hasValidData = axisScore !== null && isValidScore(axisScore.score);

    if (!axisScore || !hasValidData) {
      return {
        id: config.axisId,
        label: config.label,
        description: config.shortDescription,
        slot: config.slot,
        order: config.order,
        score: null,
        band: 'neutral' as FrameBand,
        notes: 'Insufficient context to evaluate this axis. Include who/what/when/why for better accuracy.',
        hasData: false,
      };
    }

    return {
      id: config.axisId,
      label: config.label,
      description: config.shortDescription,
      slot: config.slot,
      order: config.order,
      score: axisScore.score,
      band: axisScore.band,
      notes: axisScore.notes || config.shortDescription,
      hasData: true,
    };
  });
}

/**
 * Get all gauge data for a report, organized by slot
 */
export function getAllGaugeData(
  axisScores: FrameAxisScore[] | undefined,
  overallFrameScore?: number
): {
  core: GaugeData[];
  system: GaugeData[];
  behavioral: GaugeData[];
  hasSufficientContext: boolean;
} {
  const core = getGaugeDataForSlot('core', axisScores, overallFrameScore);
  const system = getGaugeDataForSlot('system', axisScores, overallFrameScore);
  const behavioral = getGaugeDataForSlot('behavioral', axisScores, overallFrameScore);

  // Check if we have sufficient context (at least half the gauges have data)
  const allGauges = [...core, ...system, ...behavioral];
  const gaugesWithData = allGauges.filter(g => g.hasData).length;
  const hasSufficientContext = gaugesWithData >= allGauges.length / 2;

  return { core, system, behavioral, hasSufficientContext };
}

/**
 * Convert a 0-100 frame score to the -3 to +3 gauge range.
 * Maps: 0 → -3, 50 → 0, 100 → +3
 */
export function normalizeScoreToGaugeRange(score100: number): number {
  const clamped = Math.max(0, Math.min(100, score100));
  return ((clamped / 100) * 6) - 3;
}

/**
 * Get band classification from a -3 to +3 score.
 */
export function scoreToGaugeBand(score: number): FrameBand {
  if (score <= -2) return 'strong_slave';
  if (score <= -0.5) return 'mild_slave';
  if (score <= 0.5) return 'neutral';
  if (score <= 2) return 'mild_apex';
  return 'strong_apex';
}

/**
 * Get human-readable band label
 */
export function getBandLabel(band: FrameBand): string {
  switch (band) {
    case 'strong_apex': return 'Strong Apex';
    case 'mild_apex': return 'Mild Apex';
    case 'neutral': return 'Neutral';
    case 'mild_slave': return 'Mild Slave';
    case 'strong_slave': return 'Strong Slave';
    default: return 'Unknown';
  }
}

// =============================================================================
// VERIFICATION
// =============================================================================

// Ensure we have exactly 10 gauges
const TOTAL_GAUGES = FRAMESCAN_GAUGE_CONFIG.length;
if (TOTAL_GAUGES !== 10) {
  console.error(`[FrameScanGaugeConfig] Expected 10 gauges, found ${TOTAL_GAUGES}`);
}

// Ensure slot counts are correct
const coreCount = getGaugesForSlot('core').length;
const systemCount = getGaugesForSlot('system').length;
const behavioralCount = getGaugesForSlot('behavioral').length;

if (coreCount !== 2) {
  console.error(`[FrameScanGaugeConfig] core should have 2 gauges, found ${coreCount}`);
}
if (systemCount !== 2) {
  console.error(`[FrameScanGaugeConfig] system should have 2 gauges, found ${systemCount}`);
}
if (behavioralCount !== 6) {
  console.error(`[FrameScanGaugeConfig] behavioral should have 6 gauges, found ${behavioralCount}`);
}
