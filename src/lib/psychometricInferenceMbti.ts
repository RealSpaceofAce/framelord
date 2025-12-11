// =============================================================================
// MBTI PSYCHOMETRIC INFERENCE — LLM-based MBTI personality type inference
// =============================================================================
// This module is the ONLY place that calls the LLM for MBTI inference.
// It uses the existing OpenAI client pattern from FrameScan.
//
// Inputs:
// - MBTI doctrine from ai_knowledge/psychometrics/mbti_doctrine.txt
// - Evidence from psychometricStore.getEvidence(contactId)
//
// Output:
// - MbtiProfile with primaryType, candidateTypes, and confidence
// - Returns null on failure or insufficient evidence
// =============================================================================

import { callOpenAIChat, LlmMessage } from '@/lib/llm/openaiClient';
import { psychometricStore } from '@/services/psychometricStore';
import type { MbtiProfile, PsychometricEvidence } from '@/types/psychometrics';
import {
  parseConfidenceLevel,
  parseMbtiType,
  parseMbtiCandidates,
  extractJsonFromResponse,
  buildEvidenceSummaries,
  calculateTotalWordCount,
} from '@/lib/psychometricInferenceUtils';

// =============================================================================
// DOCTRINE LOADING (Vite build-time import)
// =============================================================================

import mbtiDoctrine from '../../ai_knowledge/psychometrics/mbti_doctrine.txt?raw';

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

function buildSystemPrompt(): string {
  return `You are the FrameLord Psychometric Inference Engine.

Your task is to analyze evidence (notes, FrameScans, transcripts) about a CRM contact and infer their MBTI personality type.

=== DOCTRINE ===

${mbtiDoctrine}

=== END DOCTRINE ===

=== INSTRUCTIONS ===

1. Analyze ALL evidence provided in the user message.
2. Apply the cognitive function and behavioral marker rules from the doctrine.
3. Look for patterns in communication style, decision-making, and social behavior.
4. Consider both primary type and possible candidates when evidence is ambiguous.
5. Output an MBTI profile with your inference.

=== OUTPUT FORMAT ===

You MUST output a valid JSON object with EXACTLY this structure:

{
  "primaryType": "ENTJ" | "INTJ" | "ENFP" | ... | null,
  "candidateTypes": ["ENTJ", "INTJ", ...],
  "confidence": "low" | "medium" | "high",
  "reasoning": "Brief 1-2 sentence summary of key signals"
}

=== TYPING GUIDELINES ===

- primaryType: Your best single-type inference. Use null if evidence is too sparse.
- candidateTypes: 1-3 types ordered by likelihood. Include primaryType first if set.
- confidence "low": < 500 words of evidence, inconsistent signals, weak type indicators
- confidence "medium": 500-1500 words, some consistent patterns
- confidence "high": > 1500 words, strong consistent cognitive function signals

=== CRITICAL RULES ===

1. Output ONLY valid JSON. No explanation text outside JSON.
2. primaryType must be a valid 4-letter MBTI type (ISTJ, ISFJ, INFJ, INTJ, ISTP, ISFP, INFP, INTP, ESTP, ESFP, ENFP, ENTP, ESTJ, ESFJ, ENFJ, ENTJ) or null.
3. candidateTypes must be an array of valid MBTI types.
4. If evidence is extremely sparse, set primaryType to null and candidateTypes to empty array.
5. Do not hallucinate type indicators. Base inference only on actual evidence.`;
}

// =============================================================================
// RESPONSE PARSING
// =============================================================================

function parseAndValidateResponse(rawText: string): MbtiProfile | null {
  try {
    const parsed = extractJsonFromResponse(rawText);

    if (typeof parsed !== 'object' || parsed === null) {
      throw new Error('Response is not an object');
    }

    const obj = parsed as Record<string, unknown>;

    // Build the result with validated values
    const result: MbtiProfile = {
      primaryType: parseMbtiType(obj.primaryType as string | null),
      candidateTypes: parseMbtiCandidates(obj.candidateTypes),
      confidence: parseConfidenceLevel(String(obj.confidence || 'low')),
    };

    return result;
  } catch (err) {
    console.error('[parseAndValidateResponse:MBTI] Failed to parse LLM response:', err);
    return null;
  }
}

// =============================================================================
// MAIN INFERENCE FUNCTION
// =============================================================================

/**
 * Infer MBTI personality type for a contact using LLM analysis.
 *
 * This is the ONLY function that calls the LLM for MBTI inference.
 * All other code should call updateMbtiProfileForContact which uses this.
 *
 * @param contactId - The contact to infer MBTI for
 * @returns MbtiProfile or null if no evidence or inference fails
 */
export async function inferMbtiForContact(
  contactId: string
): Promise<MbtiProfile | null> {
  // Get evidence from store
  const evidence: PsychometricEvidence[] = psychometricStore.getEvidence(contactId);

  // Return null immediately if no evidence
  if (!evidence || evidence.length === 0) {
    console.log('[inferMbtiForContact] No evidence for contact:', contactId);
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

Output your MBTI inference as JSON.`,
    },
  ];

  try {
    console.log('[inferMbtiForContact] Calling LLM for contact:', contactId);
    const response = await callOpenAIChat(messages);
    const rawText = response.rawText ?? '';

    if (!rawText) {
      console.error('[inferMbtiForContact] Empty response from LLM');
      return null;
    }

    const result = parseAndValidateResponse(rawText);

    if (result) {
      console.log('[inferMbtiForContact] Successfully inferred MBTI:', result);
    } else {
      console.error('[inferMbtiForContact] Failed to parse LLM response:', rawText.slice(0, 200));
    }

    return result;
  } catch (err) {
    console.error('[inferMbtiForContact] LLM call failed:', err);
    return null;
  }
}
