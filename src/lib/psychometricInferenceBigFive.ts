// =============================================================================
// BIG FIVE PSYCHOMETRIC INFERENCE — LLM-based Big Five personality inference
// =============================================================================
// This module is the ONLY place that calls the LLM for Big Five inference.
// It uses the existing OpenAI client pattern from FrameScan.
//
// Inputs:
// - Big Five doctrine from ai_knowledge/psychometrics/big_five_doctrine.txt
// - Evidence from psychometricStore.getEvidence(contactId)
// - Optional existing profile for Bayesian-style continuity
//
// Output:
// - BigFiveInferenceResult with scores (0-1) and confidence level
// - Returns null on failure or insufficient evidence
// =============================================================================

import { callOpenAIChat, LlmMessage } from '@/lib/llm/openaiClient';
import { psychometricStore } from '@/services/psychometricStore';
import type { PsychometricEvidence, ConfidenceLevel } from '@/types/psychometrics';

// =============================================================================
// DOCTRINE LOADING (Vite build-time import)
// =============================================================================

// Load Big Five doctrine at build time using Vite's ?raw query
import bigFiveDoctrine from '../../ai_knowledge/psychometrics/big_five_doctrine.txt?raw';

// =============================================================================
// TYPES
// =============================================================================

/**
 * Result from the LLM inference for Big Five traits.
 * Scores are 0-1 scale, confidence is a categorical level.
 */
export interface BigFiveInferenceResult {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  confidence: ConfidenceLevel;
}

/**
 * The payload we send to the LLM.
 */
interface InferencePayload {
  doctrine: string;
  contactId: string;
  evidenceCount: number;
  evidence: Array<{
    sourceType: string;
    createdAt: string;
    rawText: string;
  }>;
}

/**
 * The expected JSON structure from the LLM response.
 */
interface LlmBigFiveResponse {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  confidence: string;
  reasoning?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Clamp a value to the 0-1 range.
 * Returns 0.5 for NaN values.
 */
function clamp01(value: number): number {
  if (Number.isNaN(value) || typeof value !== 'number') return 0.5;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}

/**
 * Map the LLM's confidence string to our ConfidenceLevel type.
 */
function parseConfidenceLevel(raw: string): ConfidenceLevel {
  const lower = (raw || '').toLowerCase().trim();
  if (lower === 'insufficient' || lower === 'none') return 'insufficient';
  if (lower === 'low') return 'low';
  if (lower === 'medium' || lower === 'moderate') return 'medium';
  if (lower === 'high') return 'high';
  if (lower === 'confirmed' || lower === 'very_high') return 'confirmed';
  // Default based on whether we have evidence
  return 'low';
}

/**
 * Parse and validate the LLM response JSON.
 * Returns null if parsing fails or required fields are missing.
 */
function parseAndValidateResponse(rawText: string): BigFiveInferenceResult | null {
  try {
    // Try direct parse
    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Try to extract JSON from markdown code blocks
      const start = rawText.indexOf('{');
      const end = rawText.lastIndexOf('}');
      if (start >= 0 && end > start) {
        parsed = JSON.parse(rawText.slice(start, end + 1));
      } else {
        throw new Error('No JSON found in response');
      }
    }

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Response is not an object');
    }

    const obj = parsed as Record<string, unknown>;

    // Validate required trait fields exist and are numbers
    const traits = ['openness', 'conscientiousness', 'extraversion', 'agreeableness', 'neuroticism'];
    for (const trait of traits) {
      if (typeof obj[trait] !== 'number') {
        throw new Error(`Missing or invalid trait: ${trait}`);
      }
    }

    // Build the result with clamped values
    const result: BigFiveInferenceResult = {
      openness: clamp01(obj.openness as number),
      conscientiousness: clamp01(obj.conscientiousness as number),
      extraversion: clamp01(obj.extraversion as number),
      agreeableness: clamp01(obj.agreeableness as number),
      neuroticism: clamp01(obj.neuroticism as number),
      confidence: parseConfidenceLevel(String(obj.confidence || 'low')),
    };

    return result;
  } catch (err) {
    console.error('[parseAndValidateResponse] Failed to parse LLM response:', err);
    return null;
  }
}

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

/**
 * Build the system prompt for Big Five inference.
 * Includes the full doctrine and clear output instructions.
 */
function buildSystemPrompt(): string {
  return `You are the FrameLord Psychometric Inference Engine.

Your task is to analyze evidence (notes, FrameScans, transcripts) about a CRM contact and infer their Big Five personality profile.

=== DOCTRINE ===

${bigFiveDoctrine}

=== END DOCTRINE ===

=== INSTRUCTIONS ===

1. Analyze ALL evidence provided in the user message.
2. Apply the signal extraction rules from the doctrine.
3. Consider linguistic indicators, behavioral clusters, and CRM frames.
4. Apply role normalization if job title is apparent.
5. Apply state vs. trait distinction - discount signals from crisis contexts.
6. Output a Big Five profile with scores from 0.0 to 1.0.

=== OUTPUT FORMAT ===

You MUST output a valid JSON object with EXACTLY this structure:

{
  "openness": 0.0 to 1.0,
  "conscientiousness": 0.0 to 1.0,
  "extraversion": 0.0 to 1.0,
  "agreeableness": 0.0 to 1.0,
  "neuroticism": 0.0 to 1.0,
  "confidence": "low" | "medium" | "high",
  "reasoning": "Brief 1-2 sentence summary of key signals"
}

=== SCORING GUIDELINES ===

- 0.0 - 0.30: Low expression of trait
- 0.31 - 0.69: Medium/ambivalent expression
- 0.70 - 1.0: High expression of trait

- confidence "low": < 500 words of evidence, inconsistent signals
- confidence "medium": 500-1500 words, somewhat consistent signals
- confidence "high": > 1500 words, consistent signals across multiple sources

=== CRITICAL RULES ===

1. Output ONLY valid JSON. No explanation text outside JSON.
2. All trait scores MUST be numbers between 0.0 and 1.0.
3. If evidence is extremely sparse or uninformative, still provide your best estimate but set confidence to "low".
4. Do not hallucinate signals. Base scores only on actual evidence.
5. Avoid clinical/pathological terms. Use operational descriptors.`;
}

// =============================================================================
// MAIN INFERENCE FUNCTION
// =============================================================================

/**
 * Infer Big Five personality traits for a contact using LLM analysis.
 *
 * This is the ONLY function that calls the LLM for Big Five inference.
 * All other code should call updateBigFiveProfileForContact which uses this.
 *
 * @param contactId - The contact to infer Big Five for
 * @returns BigFiveInferenceResult or null if no evidence or inference fails
 */
export async function inferBigFiveForContact(
  contactId: string
): Promise<BigFiveInferenceResult | null> {
  // Get evidence from store
  const evidence: PsychometricEvidence[] = psychometricStore.getEvidence(contactId);

  // Return null immediately if no evidence
  if (!evidence || evidence.length === 0) {
    console.log('[inferBigFiveForContact] No evidence for contact:', contactId);
    return null;
  }

  // Build a compact evidence bundle (limit to last 20 entries to avoid prompt explosion)
  const evidenceSummaries = evidence
    .slice(-20)
    .map((e) => ({
      sourceType: e.sourceType,
      createdAt: e.createdAt,
      rawText: e.rawText,
    }));

  // Calculate total word count for context
  const totalWordCount = evidenceSummaries.reduce(
    (sum, e) => sum + (e.rawText?.split(/\s+/).length || 0),
    0
  );

  const payload: InferencePayload = {
    doctrine: '[Included in system prompt]',
    contactId,
    evidenceCount: evidence.length,
    evidence: evidenceSummaries,
  };

  // Build messages
  const messages: LlmMessage[] = [
    { role: 'system', content: buildSystemPrompt() },
    {
      role: 'user',
      content: `Analyze the following evidence for contact "${contactId}".

Evidence count: ${evidence.length}
Total words: ~${totalWordCount}

Evidence entries:
${JSON.stringify(payload.evidence, null, 2)}

Output your Big Five inference as JSON.`,
    },
  ];

  try {
    console.log('[inferBigFiveForContact] Calling LLM for contact:', contactId);
    const response = await callOpenAIChat(messages);
    const rawText = response.rawText ?? '';

    if (!rawText) {
      console.error('[inferBigFiveForContact] Empty response from LLM');
      return null;
    }

    const result = parseAndValidateResponse(rawText);

    if (result) {
      console.log('[inferBigFiveForContact] Successfully inferred Big Five:', result);
    } else {
      console.error('[inferBigFiveForContact] Failed to parse LLM response:', rawText.slice(0, 200));
    }

    return result;
  } catch (err) {
    console.error('[inferBigFiveForContact] LLM call failed:', err);
    return null;
  }
}
