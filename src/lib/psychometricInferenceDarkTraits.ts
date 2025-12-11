// =============================================================================
// DARK TRAITS PSYCHOMETRIC INFERENCE — LLM-based behavioral risk assessment
// =============================================================================
// This module is the ONLY place that calls the LLM for dark trait inference.
// It uses the existing OpenAI client pattern from FrameScan.
//
// IMPORTANT: This is a behavioral risk assessment module, NOT a clinical tool.
// All outputs are speculative and based only on user-provided evidence.
//
// Inputs:
// - Dark trait doctrine from ai_knowledge/psychometrics/dark_trait_doctrine.txt
// - Evidence from psychometricStore.getEvidence(contactId)
//
// Output:
// - DarkTraitProfile with risk signals and confidence
// - Returns null on failure or insufficient evidence
// =============================================================================

import { callOpenAIChat, LlmMessage } from '@/lib/llm/openaiClient';
import { psychometricStore } from '@/services/psychometricStore';
import type { DarkTraitProfile, PsychometricEvidence } from '@/types/psychometrics';
import {
  clamp01,
  parseConfidenceLevel,
  parseDarkTraitRisk,
  extractJsonFromResponse,
  buildEvidenceSummaries,
  calculateTotalWordCount,
} from '@/lib/psychometricInferenceUtils';

// =============================================================================
// DOCTRINE LOADING (Vite build-time import)
// =============================================================================

import darkTraitDoctrine from '../../ai_knowledge/psychometrics/dark_trait_doctrine.txt?raw';

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

function buildSystemPrompt(): string {
  return `You are the FrameLord Behavioral Risk Assessment Engine.

Your task is to analyze evidence (notes, FrameScans, transcripts) about a CRM contact and assess potential behavioral risk signals associated with the "Dark Triad" traits.

CRITICAL DISCLAIMER: This is a BEHAVIORAL RISK ASSESSMENT, NOT a clinical diagnosis. You are identifying potential risk signals from communication patterns, not labeling anyone with personality disorders.

=== DOCTRINE ===

${darkTraitDoctrine}

=== END DOCTRINE ===

=== INSTRUCTIONS ===

1. Analyze ALL evidence provided in the user message.
2. Apply the behavioral signal extraction rules from the doctrine.
3. Look for patterns indicating narcissistic, manipulative, or callous communication styles.
4. Score each trait dimension from 0.0 (no signals) to 1.0 (strong signals).
5. Provide an overall risk assessment.
6. Include brief explanation notes for any elevated signals.

=== OUTPUT FORMAT ===

You MUST output a valid JSON object with EXACTLY this structure:

{
  "narcissism": 0.0 to 1.0,
  "machiavellianism": 0.0 to 1.0,
  "psychopathy": 0.0 to 1.0,
  "overallRisk": "insufficient" | "low" | "medium" | "high",
  "confidence": "low" | "medium" | "high",
  "explanationNotes": ["Brief note explaining a signal", ...],
  "reasoning": "Brief 1-2 sentence summary of assessment"
}

=== SIGNAL SCORING GUIDELINES ===

Signal Levels (0-1):
- 0.0 - 0.20: No significant signals / baseline
- 0.21 - 0.40: Mild signals, possibly situational
- 0.41 - 0.60: Moderate signals, worth monitoring
- 0.61 - 0.80: Elevated signals, caution advised
- 0.81 - 1.0: Strong signals, significant behavioral risk

Overall Risk:
- "insufficient": Not enough evidence to assess
- "low": All signals below 0.3, normal baseline
- "medium": Any signal 0.3-0.5, some concerning patterns
- "high": Any signal above 0.5, significant risk signals

Confidence:
- "low": < 500 words, sparse evidence
- "medium": 500-1500 words, some patterns visible
- "high": > 1500 words, clear behavioral patterns

=== CRITICAL RULES ===

1. Output ONLY valid JSON. No explanation text outside JSON.
2. All trait scores MUST be numbers between 0.0 and 1.0.
3. explanationNotes should be empty array if no elevated signals (signals > 0.3).
4. Be conservative - do not inflate risk signals without clear evidence.
5. This is behavioral pattern detection, NOT clinical diagnosis.
6. Do not use clinical/diagnostic language in explanationNotes.`;
}

// =============================================================================
// RESPONSE PARSING
// =============================================================================

function parseAndValidateResponse(rawText: string): DarkTraitProfile | null {
  try {
    const parsed = extractJsonFromResponse(rawText);

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Response is not an object');
    }

    const obj = parsed as Record<string, unknown>;

    // Validate required numeric fields exist
    if (typeof obj.narcissism !== 'number') {
      throw new Error('Missing or invalid narcissism score');
    }
    if (typeof obj.machiavellianism !== 'number') {
      throw new Error('Missing or invalid machiavellianism score');
    }
    if (typeof obj.psychopathy !== 'number') {
      throw new Error('Missing or invalid psychopathy score');
    }

    // Parse explanation notes
    let explanationNotes: string[] = [];
    if (Array.isArray(obj.explanationNotes)) {
      explanationNotes = obj.explanationNotes
        .filter((note): note is string => typeof note === 'string')
        .slice(0, 5); // Limit to 5 notes
    }

    // Build the result with clamped and validated values
    const result: DarkTraitProfile = {
      narcissism: clamp01(obj.narcissism as number),
      machiavellianism: clamp01(obj.machiavellianism as number),
      psychopathy: clamp01(obj.psychopathy as number),
      overallRisk: parseDarkTraitRisk(String(obj.overallRisk || 'insufficient')),
      confidence: parseConfidenceLevel(String(obj.confidence || 'low')),
      explanationNotes,
    };

    return result;
  } catch (err) {
    console.error('[parseAndValidateResponse:DarkTraits] Failed to parse LLM response:', err);
    return null;
  }
}

// =============================================================================
// MAIN INFERENCE FUNCTION
// =============================================================================

/**
 * Infer dark trait behavioral risk signals for a contact using LLM analysis.
 *
 * This is the ONLY function that calls the LLM for dark trait inference.
 * All other code should call updateDarkTraitProfileForContact which uses this.
 *
 * IMPORTANT: This is behavioral risk assessment, NOT clinical diagnosis.
 *
 * @param contactId - The contact to assess dark traits for
 * @returns DarkTraitProfile or null if no evidence or inference fails
 */
export async function inferDarkTraitsForContact(
  contactId: string
): Promise<DarkTraitProfile | null> {
  // Get evidence from store
  const evidence: PsychometricEvidence[] = psychometricStore.getEvidence(contactId);

  // Return null immediately if no evidence
  if (!evidence || evidence.length === 0) {
    console.log('[inferDarkTraitsForContact] No evidence for contact:', contactId);
    return null;
  }

  // Build a compact evidence bundle
  const evidenceSummaries = buildEvidenceSummaries(evidence);
  const totalWordCount = calculateTotalWordCount(evidenceSummaries);

  // Build messages
  const messages: LlmMessage[] = [
    { role: 'system', content: buildSystemPrompt() },
    {
      role: 'user',
      content: `Analyze the following evidence for contact "${contactId}".

Evidence count: ${evidence.length}
Total words: ~${totalWordCount}

Evidence entries:
${JSON.stringify(evidenceSummaries, null, 2)}

Output your dark trait behavioral risk assessment as JSON.`,
    },
  ];

  try {
    console.log('[inferDarkTraitsForContact] Calling LLM for contact:', contactId);
    const response = await callOpenAIChat(messages);
    const rawText = response.rawText ?? '';

    if (!rawText) {
      console.error('[inferDarkTraitsForContact] Empty response from LLM');
      return null;
    }

    const result = parseAndValidateResponse(rawText);

    if (result) {
      console.log('[inferDarkTraitsForContact] Successfully inferred dark traits:', result);
    } else {
      console.error('[inferDarkTraitsForContact] Failed to parse LLM response:', rawText.slice(0, 200));
    }

    return result;
  } catch (err) {
    console.error('[inferDarkTraitsForContact] LLM call failed:', err);
    return null;
  }
}
