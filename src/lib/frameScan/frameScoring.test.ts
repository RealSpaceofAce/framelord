// =============================================================================
// FRAME SCORING TESTS — Unit tests for the FrameScan scoring engine
// =============================================================================
// Run with: npm test
// =============================================================================

import { describe, it, expect } from "vitest";
import {
  normalizeAxisScoreTo100,
  computeAxisWeights,
  applyWinWinAdjustment,
  deriveOverallFrameLabel,
  scoreFrameScan,
  getFrameScoreSeverity,
  getWeakestAxes,
  getStrongestAxes,
} from "./frameScoring";
import {
  FrameAxisScore,
  FrameScanResult,
  FrameWinWinState,
} from "./frameTypes";

// =============================================================================
// TEST: normalizeAxisScoreTo100
// =============================================================================

describe("normalizeAxisScoreTo100", () => {
  it("maps -3 to 0", () => {
    expect(normalizeAxisScoreTo100(-3)).toBe(0);
  });

  it("maps 0 to 50", () => {
    expect(normalizeAxisScoreTo100(0)).toBe(50);
  });

  it("maps +3 to 100", () => {
    expect(normalizeAxisScoreTo100(3)).toBe(100);
  });

  it("maps intermediate values correctly", () => {
    // -1.5 should map to 25
    expect(normalizeAxisScoreTo100(-1.5)).toBe(25);
    // +1.5 should map to 75
    expect(normalizeAxisScoreTo100(1.5)).toBe(75);
  });

  it("clamps values below -3 to 0", () => {
    expect(normalizeAxisScoreTo100(-5)).toBe(0);
    expect(normalizeAxisScoreTo100(-10)).toBe(0);
  });

  it("clamps values above +3 to 100", () => {
    expect(normalizeAxisScoreTo100(5)).toBe(100);
    expect(normalizeAxisScoreTo100(10)).toBe(100);
  });
});

// =============================================================================
// TEST: computeAxisWeights
// =============================================================================

describe("computeAxisWeights", () => {
  const createAxisScore = (axisId: string, score: number): FrameAxisScore => ({
    axisId: axisId as any,
    score,
    band: "neutral",
    notes: "",
  });

  it("assigns base weight of 1 to non-priority axes", () => {
    const axisScores: FrameAxisScore[] = [
      createAxisScore("identity_vs_tactic", 0),
      createAxisScore("internal_sale", 0),
    ];

    // Using "generic" domain which has priority_axes: assumptive_state, buyer_seller_position, win_win_integrity
    const weights = computeAxisWeights("generic", axisScores);

    expect(weights.identity_vs_tactic).toBe(1);
    expect(weights.internal_sale).toBe(1);
  });

  it("assigns weight of 2 to priority axes", () => {
    const axisScores: FrameAxisScore[] = [
      createAxisScore("assumptive_state", 0),
      createAxisScore("buyer_seller_position", 0),
      createAxisScore("win_win_integrity", 0),
    ];

    // Using "generic" domain which has priority_axes: assumptive_state, buyer_seller_position, win_win_integrity
    const weights = computeAxisWeights("generic", axisScores);

    expect(weights.assumptive_state).toBe(2);
    expect(weights.buyer_seller_position).toBe(2);
    expect(weights.win_win_integrity).toBe(2);
  });

  it("handles sales_email domain priority axes correctly", () => {
    const axisScores: FrameAxisScore[] = [
      createAxisScore("buyer_seller_position", 0),
      createAxisScore("internal_sale", 0),
      createAxisScore("win_win_integrity", 0),
      createAxisScore("persuasion_style", 0),
      createAxisScore("assumptive_state", 0), // Not a priority for sales_email
    ];

    // sales_email priority_axes: buyer_seller_position, internal_sale, win_win_integrity, persuasion_style
    const weights = computeAxisWeights("sales_email", axisScores);

    expect(weights.buyer_seller_position).toBe(2);
    expect(weights.internal_sale).toBe(2);
    expect(weights.win_win_integrity).toBe(2);
    expect(weights.persuasion_style).toBe(2);
    expect(weights.assumptive_state).toBe(1); // Not a priority axis
  });

  it("handles image domain priority axes correctly", () => {
    const axisScores: FrameAxisScore[] = [
      createAxisScore("assumptive_state", 0),
      createAxisScore("pedestalization", 0),
      createAxisScore("field_strength", 0),
      createAxisScore("buyer_seller_position", 0),
      createAxisScore("internal_sale", 0), // Not a priority for profile_photo
    ];

    // profile_photo priority_axes: assumptive_state, pedestalization, field_strength, buyer_seller_position
    const weights = computeAxisWeights("profile_photo", axisScores);

    expect(weights.assumptive_state).toBe(2);
    expect(weights.pedestalization).toBe(2);
    expect(weights.field_strength).toBe(2);
    expect(weights.buyer_seller_position).toBe(2);
    expect(weights.internal_sale).toBe(1); // Not a priority axis
  });
});

// =============================================================================
// TEST: applyWinWinAdjustment
// =============================================================================

describe("applyWinWinAdjustment", () => {
  it("applies no penalty for win_win", () => {
    expect(applyWinWinAdjustment(80, "win_win")).toBe(80);
    expect(applyWinWinAdjustment(50, "win_win")).toBe(50);
    expect(applyWinWinAdjustment(20, "win_win")).toBe(20);
  });

  it("applies -5 penalty for neutral", () => {
    expect(applyWinWinAdjustment(80, "neutral")).toBe(75);
    expect(applyWinWinAdjustment(50, "neutral")).toBe(45);
    expect(applyWinWinAdjustment(20, "neutral")).toBe(15);
  });

  it("applies -15 penalty for win_lose", () => {
    expect(applyWinWinAdjustment(80, "win_lose")).toBe(65);
    expect(applyWinWinAdjustment(50, "win_lose")).toBe(35);
    expect(applyWinWinAdjustment(20, "win_lose")).toBe(5);
  });

  it("applies -30 penalty for lose_lose", () => {
    expect(applyWinWinAdjustment(80, "lose_lose")).toBe(50);
    expect(applyWinWinAdjustment(50, "lose_lose")).toBe(20);
    expect(applyWinWinAdjustment(30, "lose_lose")).toBe(0);
  });

  it("clamps result to minimum of 0", () => {
    expect(applyWinWinAdjustment(10, "lose_lose")).toBe(0);
    expect(applyWinWinAdjustment(5, "win_lose")).toBe(0);
  });

  it("clamps result to maximum of 100", () => {
    expect(applyWinWinAdjustment(100, "win_win")).toBe(100);
  });
});

// =============================================================================
// TEST: deriveOverallFrameLabel
// =============================================================================

describe("deriveOverallFrameLabel", () => {
  const createAxisWithBand = (
    band: "strong_slave" | "mild_slave" | "neutral" | "mild_apex" | "strong_apex"
  ): FrameAxisScore => ({
    axisId: "assumptive_state",
    score: 0,
    band,
    notes: "",
  });

  it("returns 'apex' for high score with majority apex bands", () => {
    const axes: FrameAxisScore[] = [
      createAxisWithBand("strong_apex"),
      createAxisWithBand("strong_apex"),
      createAxisWithBand("mild_apex"),
      createAxisWithBand("mild_apex"),
      createAxisWithBand("neutral"), // minority non-apex
    ];

    expect(deriveOverallFrameLabel(75, axes)).toBe("apex");
    expect(deriveOverallFrameLabel(85, axes)).toBe("apex");
  });

  it("returns 'slave' for low score with majority slave bands", () => {
    const axes: FrameAxisScore[] = [
      createAxisWithBand("strong_slave"),
      createAxisWithBand("strong_slave"),
      createAxisWithBand("mild_slave"),
      createAxisWithBand("mild_slave"),
      createAxisWithBand("neutral"), // minority non-slave
    ];

    expect(deriveOverallFrameLabel(25, axes)).toBe("slave");
    expect(deriveOverallFrameLabel(15, axes)).toBe("slave");
  });

  it("returns 'mixed' for score between 30 and 70", () => {
    const axes: FrameAxisScore[] = [
      createAxisWithBand("strong_apex"),
      createAxisWithBand("strong_apex"),
      createAxisWithBand("mild_apex"),
    ];

    expect(deriveOverallFrameLabel(50, axes)).toBe("mixed");
    expect(deriveOverallFrameLabel(65, axes)).toBe("mixed");
  });

  it("returns 'mixed' for high score without majority apex bands", () => {
    const axes: FrameAxisScore[] = [
      createAxisWithBand("mild_apex"),
      createAxisWithBand("neutral"),
      createAxisWithBand("neutral"),
      createAxisWithBand("mild_slave"),
    ];

    // Only 1 apex band out of 4 (not majority), even with high score
    expect(deriveOverallFrameLabel(75, axes)).toBe("mixed");
  });

  it("returns 'mixed' for low score without majority slave bands", () => {
    const axes: FrameAxisScore[] = [
      createAxisWithBand("mild_slave"),
      createAxisWithBand("neutral"),
      createAxisWithBand("neutral"),
      createAxisWithBand("mild_apex"),
    ];

    // Only 1 slave band out of 4 (not majority), even with low score
    expect(deriveOverallFrameLabel(25, axes)).toBe("mixed");
  });

  it("returns 'mixed' for empty axis array", () => {
    expect(deriveOverallFrameLabel(50, [])).toBe("mixed");
  });
});

// =============================================================================
// TEST: scoreFrameScan (Integration)
// =============================================================================

describe("scoreFrameScan", () => {
  const createSlaveResult = (): FrameScanResult => ({
    modality: "text",
    domain: "sales_email",
    overallFrame: "slave",
    overallWinWinState: "win_lose",
    axes: [
      { axisId: "assumptive_state", score: -2, band: "strong_slave", notes: "Apologetic tone" },
      { axisId: "buyer_seller_position", score: -2.5, band: "strong_slave", notes: "Begging for chance" },
      { axisId: "identity_vs_tactic", score: -1, band: "mild_slave", notes: "Takes failure personally" },
      { axisId: "internal_sale", score: -2, band: "strong_slave", notes: "Needs validation" },
      { axisId: "win_win_integrity", score: -1.5, band: "mild_slave", notes: "Pressure tactics" },
      { axisId: "persuasion_style", score: -2, band: "strong_slave", notes: "Chasing compliance" },
      { axisId: "pedestalization", score: -2, band: "strong_slave", notes: "Other on pedestal" },
      { axisId: "self_trust_vs_permission", score: -1, band: "mild_slave", notes: "Seeking permission" },
      { axisId: "field_strength", score: -1.5, band: "mild_slave", notes: "Chaotic presence" },
    ],
    diagnostics: {
      primaryPatterns: ["chronic pedestalization", "seller posture"],
      supportingEvidence: ["I hope you might consider...", "Please give me a chance"],
    },
    corrections: {
      topShifts: [],
      sampleRewrites: [],
    },
  });

  const createApexResult = (): FrameScanResult => ({
    modality: "text",
    domain: "sales_email",
    overallFrame: "apex",
    overallWinWinState: "win_win",
    axes: [
      { axisId: "assumptive_state", score: 2, band: "mild_apex", notes: "Assumes interest" },
      { axisId: "buyer_seller_position", score: 2.5, band: "strong_apex", notes: "Screening for fit" },
      { axisId: "identity_vs_tactic", score: 2, band: "mild_apex", notes: "Tactics as tools" },
      { axisId: "internal_sale", score: 2.5, band: "strong_apex", notes: "Fully convinced" },
      { axisId: "win_win_integrity", score: 2, band: "mild_apex", notes: "Mutual gain focus" },
      { axisId: "persuasion_style", score: 2.5, band: "strong_apex", notes: "Leading with clarity" },
      { axisId: "pedestalization", score: 2, band: "mild_apex", notes: "Self as center" },
      { axisId: "self_trust_vs_permission", score: 2, band: "mild_apex", notes: "Inner authority" },
      { axisId: "field_strength", score: 2.5, band: "strong_apex", notes: "Clear presence" },
    ],
    diagnostics: {
      primaryPatterns: ["buyer positioning", "clear field"],
      supportingEvidence: ["I'm looking for clients who...", "Here's what I offer"],
    },
    corrections: {
      topShifts: [],
      sampleRewrites: [],
    },
  });

  const createMixedResult = (): FrameScanResult => ({
    modality: "text",
    domain: "generic",
    overallFrame: "mixed",
    overallWinWinState: "neutral",
    axes: [
      { axisId: "assumptive_state", score: 1, band: "mild_apex", notes: "" },
      { axisId: "buyer_seller_position", score: -1, band: "mild_slave", notes: "" },
      { axisId: "identity_vs_tactic", score: 0, band: "neutral", notes: "" },
      { axisId: "internal_sale", score: 1, band: "mild_apex", notes: "" },
      { axisId: "win_win_integrity", score: 0, band: "neutral", notes: "" },
      { axisId: "persuasion_style", score: -1, band: "mild_slave", notes: "" },
      { axisId: "pedestalization", score: 0, band: "neutral", notes: "" },
      { axisId: "self_trust_vs_permission", score: 1, band: "mild_apex", notes: "" },
      { axisId: "field_strength", score: 0, band: "neutral", notes: "" },
    ],
    diagnostics: {
      primaryPatterns: [],
      supportingEvidence: [],
    },
    corrections: {
      topShifts: [],
      sampleRewrites: [],
    },
  });

  it("produces low score for slave pattern", () => {
    const result = scoreFrameScan(createSlaveResult());

    expect(result.frameScore).toBeLessThan(40);
    expect(result.overallFrame).toBe("slave");
    expect(result.overallWinWinState).toBe("win_lose");
    expect(result.domain).toBe("sales_email");
    expect(result.axisScores).toHaveLength(9);
    expect(result.weightedAxisScores).toHaveLength(9);
    expect(result.notes.length).toBeGreaterThan(0);
  });

  it("produces high score for apex pattern", () => {
    const result = scoreFrameScan(createApexResult());

    expect(result.frameScore).toBeGreaterThan(70);
    expect(result.overallFrame).toBe("apex");
    expect(result.overallWinWinState).toBe("win_win");
  });

  it("produces mid-range score for mixed pattern", () => {
    const result = scoreFrameScan(createMixedResult());

    expect(result.frameScore).toBeGreaterThan(35);
    expect(result.frameScore).toBeLessThan(65);
    expect(result.overallFrame).toBe("mixed");
  });

  it("applies higher weights to priority axes", () => {
    const result = scoreFrameScan(createSlaveResult());

    // For sales_email, priority axes are: buyer_seller_position, internal_sale, win_win_integrity, persuasion_style
    const priorityWeights = result.weightedAxisScores.filter((w) =>
      ["buyer_seller_position", "internal_sale", "win_win_integrity", "persuasion_style"].includes(
        w.axisId
      )
    );
    const nonPriorityWeights = result.weightedAxisScores.filter(
      (w) =>
        !["buyer_seller_position", "internal_sale", "win_win_integrity", "persuasion_style"].includes(
          w.axisId
        )
    );

    expect(priorityWeights.every((w) => w.weight === 2)).toBe(true);
    expect(nonPriorityWeights.every((w) => w.weight === 1)).toBe(true);
  });

  it("includes domain in notes", () => {
    const result = scoreFrameScan(createSlaveResult());
    expect(result.notes.some((n) => n.includes("sales_email"))).toBe(true);
  });

  it("includes Win/Win state in notes", () => {
    const result = scoreFrameScan(createSlaveResult());
    expect(result.notes.some((n) => n.includes("win_lose"))).toBe(true);
  });
});

// =============================================================================
// TEST: Utility Functions
// =============================================================================

describe("getFrameScoreSeverity", () => {
  it("returns 'critical' for scores below 25", () => {
    expect(getFrameScoreSeverity(0)).toBe("critical");
    expect(getFrameScoreSeverity(24)).toBe("critical");
  });

  it("returns 'warning' for scores 25-44", () => {
    expect(getFrameScoreSeverity(25)).toBe("warning");
    expect(getFrameScoreSeverity(44)).toBe("warning");
  });

  it("returns 'neutral' for scores 45-64", () => {
    expect(getFrameScoreSeverity(45)).toBe("neutral");
    expect(getFrameScoreSeverity(64)).toBe("neutral");
  });

  it("returns 'good' for scores 65-79", () => {
    expect(getFrameScoreSeverity(65)).toBe("good");
    expect(getFrameScoreSeverity(79)).toBe("good");
  });

  it("returns 'excellent' for scores 80+", () => {
    expect(getFrameScoreSeverity(80)).toBe("excellent");
    expect(getFrameScoreSeverity(100)).toBe("excellent");
  });
});

describe("getWeakestAxes", () => {
  const axes: FrameAxisScore[] = [
    { axisId: "assumptive_state", score: 2, band: "mild_apex", notes: "" },
    { axisId: "buyer_seller_position", score: -2, band: "strong_slave", notes: "" },
    { axisId: "identity_vs_tactic", score: 0, band: "neutral", notes: "" },
    { axisId: "internal_sale", score: -1, band: "mild_slave", notes: "" },
    { axisId: "win_win_integrity", score: 1, band: "mild_apex", notes: "" },
  ];

  const score: any = { axisScores: axes };

  it("returns the N weakest axes sorted by score ascending", () => {
    const weakest = getWeakestAxes(score, 3);

    expect(weakest).toHaveLength(3);
    expect(weakest[0].axisId).toBe("buyer_seller_position");
    expect(weakest[0].score).toBe(-2);
    expect(weakest[1].axisId).toBe("internal_sale");
    expect(weakest[1].score).toBe(-1);
    expect(weakest[2].axisId).toBe("identity_vs_tactic");
    expect(weakest[2].score).toBe(0);
  });

  it("defaults to 3 axes", () => {
    const weakest = getWeakestAxes(score);
    expect(weakest).toHaveLength(3);
  });
});

describe("getStrongestAxes", () => {
  const axes: FrameAxisScore[] = [
    { axisId: "assumptive_state", score: 2, band: "mild_apex", notes: "" },
    { axisId: "buyer_seller_position", score: -2, band: "strong_slave", notes: "" },
    { axisId: "identity_vs_tactic", score: 0, band: "neutral", notes: "" },
    { axisId: "internal_sale", score: -1, band: "mild_slave", notes: "" },
    { axisId: "win_win_integrity", score: 1, band: "mild_apex", notes: "" },
  ];

  const score: any = { axisScores: axes };

  it("returns the N strongest axes sorted by score descending", () => {
    const strongest = getStrongestAxes(score, 3);

    expect(strongest).toHaveLength(3);
    expect(strongest[0].axisId).toBe("assumptive_state");
    expect(strongest[0].score).toBe(2);
    expect(strongest[1].axisId).toBe("win_win_integrity");
    expect(strongest[1].score).toBe(1);
    expect(strongest[2].axisId).toBe("identity_vs_tactic");
    expect(strongest[2].score).toBe(0);
  });
});

