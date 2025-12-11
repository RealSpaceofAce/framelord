// =============================================================================
// PSYCHOMETRIC INFERENCE UTILITIES — Shared helpers for LLM inference modules
// =============================================================================
// Common utilities used by Big Five, MBTI, DISC, and dark trait inference.
// Centralizes clamping, confidence parsing, and JSON extraction logic.
// =============================================================================

import type { ConfidenceLevel, DarkTraitOverallRisk, DiscType } from '@/types/psychometrics';

/**
 * Clamp a numeric value to the 0-1 range.
 * Returns 0.5 for NaN or non-number values as a safe neutral default.
 */
export function clamp01(value: number): number {
  if (Number.isNaN(value) || typeof value !== 'number') return 0.5;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * Map a string from LLM response to our ConfidenceLevel type.
 * Handles common variations and defaults to 'low' for unrecognized values.
 */
export function parseConfidenceLevel(raw: string): ConfidenceLevel {
  const lower = (raw || '').toLowerCase().trim();
  if (lower === 'insufficient' || lower === 'none') return 'insufficient';
  if (lower === 'low') return 'low';
  if (lower === 'medium' || lower === 'moderate') return 'medium';
  if (lower === 'high') return 'high';
  if (lower === 'confirmed' || lower === 'very_high') return 'confirmed';
  return 'low';
}

/**
 * Map a string from LLM response to DarkTraitOverallRisk type.
 * Defaults to 'insufficient' for unrecognized values.
 */
export function parseDarkTraitRisk(raw: string): DarkTraitOverallRisk {
  const lower = (raw || '').toLowerCase().trim();
  if (lower === 'insufficient' || lower === 'none') return 'insufficient';
  if (lower === 'low') return 'low';
  if (lower === 'medium' || lower === 'moderate') return 'medium';
  if (lower === 'high') return 'high';
  return 'insufficient';
}

/**
 * Valid DISC types including blends.
 */
const VALID_DISC_TYPES: DiscType[] = ['D', 'I', 'S', 'C', 'DI', 'ID', 'SC', 'CS'];

/**
 * Parse and validate a DISC type string from LLM response.
 * Returns null for invalid or unrecognized types.
 */
export function parseDiscType(raw: string | null | undefined): DiscType {
  if (!raw) return null;
  const upper = raw.toUpperCase().trim();
  if (VALID_DISC_TYPES.includes(upper as DiscType)) {
    return upper as DiscType;
  }
  return null;
}

/**
 * Valid MBTI types.
 */
const VALID_MBTI_TYPES = [
  'ISTJ', 'ISFJ', 'INFJ', 'INTJ',
  'ISTP', 'ISFP', 'INFP', 'INTP',
  'ESTP', 'ESFP', 'ENFP', 'ENTP',
  'ESTJ', 'ESFJ', 'ENFJ', 'ENTJ',
];

/**
 * Parse and validate an MBTI type string from LLM response.
 * Returns null for invalid or unrecognized types.
 */
export function parseMbtiType(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const upper = raw.toUpperCase().trim();
  if (VALID_MBTI_TYPES.includes(upper)) {
    return upper;
  }
  return null;
}

/**
 * Parse and filter an array of MBTI candidate types.
 * Removes invalid types and returns only valid MBTI types.
 */
export function parseMbtiCandidates(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => parseMbtiType(String(item)))
    .filter((t): t is string => t !== null);
}

/**
 * Extract JSON from LLM response text.
 * Handles markdown code blocks and extracts the first JSON object found.
 */
export function extractJsonFromResponse(rawText: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(rawText);
  } catch {
    // Try to extract JSON from markdown code blocks or other formatting
    const start = rawText.indexOf('{');
    const end = rawText.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(rawText.slice(start, end + 1));
    }
    throw new Error('No JSON found in response');
  }
}

/**
 * Maximum number of evidence entries to send to LLM.
 * Prevents prompt explosion while keeping recent relevant data.
 */
export const MAX_EVIDENCE_ENTRIES = 20;

/**
 * Build a compact evidence summary array from raw evidence.
 * Limits to last N entries and extracts only relevant fields.
 */
export function buildEvidenceSummaries(
  evidence: Array<{ sourceType: string; createdAt: string; rawText: string }>
): Array<{ sourceType: string; createdAt: string; rawText: string }> {
  return evidence.slice(-MAX_EVIDENCE_ENTRIES).map((e) => ({
    sourceType: e.sourceType,
    createdAt: e.createdAt,
    rawText: e.rawText,
  }));
}

/**
 * Calculate total word count from evidence summaries.
 */
export function calculateTotalWordCount(
  summaries: Array<{ rawText: string }>
): number {
  return summaries.reduce(
    (sum, e) => sum + (e.rawText?.split(/\s+/).length || 0),
    0
  );
}
