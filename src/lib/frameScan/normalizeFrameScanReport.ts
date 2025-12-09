// =============================================================================
// FRAME SCAN REPORT NORMALIZER — Centralized normalization for LLM responses
// =============================================================================
// This module ensures ALL array fields in FrameScanResult are safely initialized
// to prevent "Cannot read properties of undefined (reading 'slice')" errors.
//
// WHY: LLM responses can be incomplete - optional array fields may be missing.
// This normalizer guarantees that every array field is at least [] before any
// UI component consumes the data.
//
// ARRAY FIELDS NORMALIZED:
// - diagnostics.primaryPatterns: string[]
// - diagnostics.supportingEvidence: string[]
// - corrections.topShifts: FrameCorrectionShift[]
// - corrections.topShifts[].protocolSteps: string[] (nested)
// - corrections.sampleRewrites: FrameSampleRewrite[]
// - axes: FrameAxisScore[]
//
// This is the SINGLE SOURCE OF TRUTH for normalizing FrameScan reports.
// All paths (public landing, internal CRM, UI builder) MUST use this normalizer.
// =============================================================================

import type { FrameScanResult, FrameCorrectionShift } from "./frameTypes";

/**
 * Normalizes a raw FrameScan report from LLM output to ensure ALL array fields
 * are safely initialized. After calling this function, no array field will ever
 * be undefined - it will be at least [].
 *
 * This function is DEFENSIVE and IDEMPOTENT - it can be called multiple times
 * safely, and it handles malformed or partial LLM responses gracefully.
 *
 * @param raw - Raw object parsed from LLM response (may be incomplete)
 * @returns Fully normalized FrameScanResult safe for UI consumption
 */
export function normalizeFrameScanReport(raw: any): FrameScanResult {
  if (!raw || typeof raw !== "object") {
    throw new Error("FrameScanResult must be a non-null object");
  }

  // Ensure axes array exists
  const axes = Array.isArray(raw.axes) ? raw.axes : [];

  // Ensure diagnostics object exists
  const diagnostics = raw.diagnostics && typeof raw.diagnostics === "object"
    ? raw.diagnostics
    : {};

  // Normalize diagnostics arrays
  const normalizedDiagnostics = {
    primaryPatterns: Array.isArray(diagnostics.primaryPatterns)
      ? diagnostics.primaryPatterns
      : [],
    supportingEvidence: Array.isArray(diagnostics.supportingEvidence)
      ? diagnostics.supportingEvidence
      : [],
  };

  // Ensure corrections object exists
  const corrections = raw.corrections && typeof raw.corrections === "object"
    ? raw.corrections
    : {};

  // Normalize topShifts array
  const topShifts = Array.isArray(corrections.topShifts)
    ? corrections.topShifts
    : [];

  // Normalize protocolSteps within each topShift (nested arrays)
  const normalizedTopShifts: FrameCorrectionShift[] = topShifts.map((shift: any) => {
    if (!shift || typeof shift !== "object") {
      // If shift is malformed, return a minimal valid shift
      return {
        axisId: "assumptive_state",
        shift: "Malformed shift data",
        protocolSteps: [],
      };
    }

    return {
      ...shift,
      protocolSteps: Array.isArray(shift.protocolSteps)
        ? shift.protocolSteps
        : [],
    };
  });

  // Normalize sampleRewrites array
  const sampleRewrites = Array.isArray(corrections.sampleRewrites)
    ? corrections.sampleRewrites
    : [];

  const normalizedCorrections = {
    topShifts: normalizedTopShifts,
    sampleRewrites,
  };

  // Return fully normalized result
  return {
    modality: raw.modality || "text",
    domain: raw.domain || "generic",
    overallFrame: raw.overallFrame || "mixed",
    overallWinWinState: raw.overallWinWinState || "neutral",
    axes,
    diagnostics: normalizedDiagnostics,
    corrections: normalizedCorrections,
  };
}

/**
 * Type guard to check if a value is a valid normalized FrameScanResult.
 * This is a RUNTIME CHECK that verifies all required fields exist.
 *
 * @param value - Value to check
 * @returns true if value is a valid FrameScanResult with all arrays initialized
 */
export function isNormalizedFrameScanResult(value: unknown): value is FrameScanResult {
  if (!value || typeof value !== "object") return false;

  const obj = value as Record<string, unknown>;

  // Check required top-level fields
  if (!obj.modality || !obj.domain || !obj.overallFrame || !obj.overallWinWinState) {
    return false;
  }

  // Check axes array
  if (!Array.isArray(obj.axes)) return false;

  // Check diagnostics object and arrays
  if (!obj.diagnostics || typeof obj.diagnostics !== "object") return false;
  const diag = obj.diagnostics as Record<string, unknown>;
  if (!Array.isArray(diag.primaryPatterns)) return false;
  if (!Array.isArray(diag.supportingEvidence)) return false;

  // Check corrections object and arrays
  if (!obj.corrections || typeof obj.corrections !== "object") return false;
  const corr = obj.corrections as Record<string, unknown>;
  if (!Array.isArray(corr.topShifts)) return false;
  if (!Array.isArray(corr.sampleRewrites)) return false;

  // Check nested protocolSteps in each topShift
  const shifts = corr.topShifts as Array<any>;
  for (const shift of shifts) {
    if (!shift || typeof shift !== "object") return false;
    if (!Array.isArray(shift.protocolSteps)) return false;
  }

  return true;
}

/**
 * List of all array field paths in FrameScanResult for documentation.
 * This is the definitive list of what gets normalized.
 */
export const NORMALIZED_ARRAY_FIELDS = [
  "axes",
  "diagnostics.primaryPatterns",
  "diagnostics.supportingEvidence",
  "corrections.topShifts",
  "corrections.topShifts[].protocolSteps", // Nested array
  "corrections.sampleRewrites",
] as const;
