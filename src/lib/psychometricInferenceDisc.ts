// =============================================================================
// DISC PSYCHOMETRIC INFERENCE — LLM-based DISC behavioral style inference
// =============================================================================
// This module is the ONLY place that calls the LLM for DISC inference.
// It uses the existing OpenAI client pattern from FrameScan.
//
// Inputs:
// - DISC doctrine from ai_knowledge/psychometrics/disc_doctrine.txt
// - Evidence from psychometricStore.getEvidence(contactId)
//
// Output:
// - DiscProfile with type and confidence
// - Returns null on failure or insufficient evidence
// =============================================================================

import { callOpenAIChat, LlmMessage } from '@/lib/llm/openaiClient';
import { psychometricStore } from '@/services/psychometricStore';
import type { DiscProfile, PsychometricEvidence } from '@/types/psychometrics';
import {
  parseConfidenceLevel,
  parseDiscType,
  extractJsonFromResponse,
  buildEvidenceSummaries,
  calculateTotalWordCount,
} from '@/lib/psychometricInferenceUtils';

// =============================================================================
// DOCTRINE LOADING (Vite build-time import)
// =============================================================================

import discDoctrine from '../../ai_knowledge/psychometrics/disc_doctrine.txt?raw';

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

function buildSystemPrompt(): string {
  return `You are the FrameLord Psychometric Inference Engine.

Your task is to analyze evidence (notes, FrameScans, transcripts) about a CRM contact and infer their DISC behavioral style.

=== DOCTRINE ===

${discDoctrine}

=== END DOCTRINE ===

=== INSTRUCTIONS ===

1. Analyze ALL evidence provided in the user message.
2. Apply the behavioral marker rules from the DISC doctrine.
3. Look for patterns in communication style, pace, focus (task vs. people), and assertiveness.
4. Identify the primary DISC type or blend.
5. Output a DISC profile with your inference.

=== OUTPUT FORMAT ===

You MUST output a valid JSON object with EXACTLY this structure:

{
  "type": "D" | "I" | "S" | "C" | "DI" | "ID" | "SC" | "CS" | null,
  "confidence": "low" | "medium" | "high",
  "reasoning": "Brief 1-2 sentence summary of key signals"
}

=== DISC TYPE GUIDELINES ===

Primary Types:
- D (Dominance): Direct, results-oriented, decisive, competitive
- I (Influence): Outgoing, enthusiastic, optimistic, collaborative
- S (Steadiness): Patient, reliable, team-oriented, supportive
- C (Conscientiousness): Analytical, systematic, accurate, quality-focused

Common Blends:
- DI/ID: Dominant-Influential (assertive + social)
- SC/CS: Steady-Conscientious (supportive + analytical)

Confidence Levels:
- "low": < 500 words of evidence, inconsistent signals
- "medium": 500-1500 words, some consistent patterns
- "high": > 1500 words, strong consistent behavioral signals

=== CRITICAL RULES ===

1. Output ONLY valid JSON. No explanation text outside JSON.
2. type must be one of: D, I, S, C, DI, ID, SC, CS, or null.
3. If evidence is extremely sparse, set type to null.
4. Do not hallucinate behavioral indicators. Base inference only on actual evidence.
5. Consider task-focus (D/C) vs. people-focus (I/S) and pace (D/I fast, S/C deliberate).`;
}

// =============================================================================
// RESPONSE PARSING
// =============================================================================

function parseAndValidateResponse(rawText: string): DiscProfile | null {
  try {
    const parsed = extractJsonFromResponse(rawText);

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Response is not an object');
    }

    const obj = parsed as Record<string, unknown>;

    // Build the result with validated values
    const result: DiscProfile = {
      type: parseDiscType(obj.type as string | null),
      confidence: parseConfidenceLevel(String(obj.confidence || 'low')),
    };

    return result;
  } catch (err) {
    console.error('[parseAndValidateResponse:DISC] Failed to parse LLM response:', err);
    return null;
  }
}

// =============================================================================
// MAIN INFERENCE FUNCTION
// =============================================================================

/**
 * Infer DISC behavioral style for a contact using LLM analysis.
 *
 * This is the ONLY function that calls the LLM for DISC inference.
 * All other code should call updateDiscProfileForContact which uses this.
 *
 * @param contactId - The contact to infer DISC for
 * @returns DiscProfile or null if no evidence or inference fails
 */
export async function inferDiscForContact(
  contactId: string
): Promise<DiscProfile | null> {
  // Get evidence from store
  const evidence: PsychometricEvidence[] = psychometricStore.getEvidence(contactId);

  // Return null immediately if no evidence
  if (!evidence || evidence.length === 0) {
    console.log('[inferDiscForContact] No evidence for contact:', contactId);
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

Output your DISC inference as JSON.`,
    },
  ];

  try {
    console.log('[inferDiscForContact] Calling LLM for contact:', contactId);
    const response = await callOpenAIChat(messages);
    const rawText = response.rawText ?? '';

    if (!rawText) {
      console.error('[inferDiscForContact] Empty response from LLM');
      return null;
    }

    const result = parseAndValidateResponse(rawText);

    if (result) {
      console.log('[inferDiscForContact] Successfully inferred DISC:', result);
    } else {
      console.error('[inferDiscForContact] Failed to parse LLM response:', rawText.slice(0, 200));
    }

    return result;
  } catch (err) {
    console.error('[inferDiscForContact] LLM call failed:', err);
    return null;
  }
}
