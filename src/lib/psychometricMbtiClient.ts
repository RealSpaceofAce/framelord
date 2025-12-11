// =============================================================================
// MBTI INFERENCE CLIENT — LLM-powered MBTI personality type inference
// =============================================================================
// This client:
// 1. Gathers evidence for a contact from psychometricStore
// 2. Calls inferMbtiForContact which sends doctrine + evidence to LLM
// 3. Parses the LLM response and updates the profile
// 4. Falls back to default values if inference fails or no evidence exists
// =============================================================================

import { MbtiProfile, PsychometricProfile, ConfidenceLevel } from '@/types/psychometrics';
import { psychometricStore } from '@/services/psychometricStore';
import { inferMbtiForContact } from '@/lib/psychometricInferenceMbti';

/**
 * Path to the MBTI doctrine file (relative to repo root).
 * This doctrine provides the behavioral markers and inference rules
 * that the LLM will use to infer MBTI type from text evidence.
 *
 * TODO: When implementing real inference:
 * - Read this file's contents
 * - Include doctrine in the LLM system prompt
 * - Structure the prompt: doctrine + evidence list + existing profile
 * - Parse LLM response for inferred MBTI type and candidates
 */
const MBTI_DOCTRINE_PATH = 'ai_knowledge/psychometrics/mbti_doctrine.txt';

/**
 * Determine confidence level based on evidence count.
 * More evidence = higher confidence (up to a point).
 */
function determineConfidence(evidenceCount: number): ConfidenceLevel {
  if (evidenceCount === 0) return 'insufficient';
  if (evidenceCount < 3) return 'low';
  if (evidenceCount < 10) return 'medium';
  if (evidenceCount < 25) return 'high';
  return 'high'; // Max confidence from evidence alone; 'confirmed' requires formal assessment
}

/**
 * Create a default MBTI profile based on evidence presence.
 * Used as fallback when LLM inference fails or returns null.
 */
function createDefaultMbti(confidence: ConfidenceLevel): MbtiProfile {
  return {
    primaryType: null,
    candidateTypes: [],
    confidence,
  };
}

/**
 * Update (or create) the MBTI profile for a contact.
 *
 * Behavior:
 * 1. If no evidence exists, returns profile with MBTI confidence "insufficient"
 * 2. If evidence exists, calls LLM inference to get real MBTI type
 * 3. Falls back to default values if LLM inference fails
 *
 * @param contactId - The contact to update profile for
 * @returns The updated (or created) profile
 */
export async function updateMbtiProfileForContact(
  contactId: string
): Promise<PsychometricProfile> {
  // Get existing profile if any
  const existing = psychometricStore.getProfile(contactId);

  // Get all evidence for this contact
  const evidence = psychometricStore.getEvidence(contactId);
  const hasEvidence = evidence.length > 0;

  let mbti: MbtiProfile;

  // Only call LLM if we have evidence
  if (hasEvidence) {
    try {
      const inferred = await inferMbtiForContact(contactId);

      if (inferred) {
        // Use LLM-inferred MBTI profile
        mbti = inferred;
      } else {
        // Inference returned null - use fallback
        const confidence = determineConfidence(evidence.length);
        mbti = createDefaultMbti(confidence);
      }
    } catch (err) {
      // LLM call failed - log and use fallback
      console.error('[updateMbtiProfileForContact] Inference error:', err);
      const confidence = determineConfidence(evidence.length);
      mbti = createDefaultMbti(confidence);
    }
  } else {
    // No evidence - use insufficient confidence
    mbti = createDefaultMbti('insufficient');
  }

  // Build the profile, preserving existing Big Five, DISC, and dark traits
  const profile: PsychometricProfile = {
    contactId,
    bigFive: existing?.bigFive ?? {
      openness: 0.5,
      conscientiousness: 0.5,
      extraversion: 0.5,
      agreeableness: 0.5,
      neuroticism: 0.5,
      confidence: hasEvidence ? 'low' : 'insufficient',
    },
    mbti,
    disc: existing?.disc,
    darkTraits: existing?.darkTraits,
    lastUpdatedAt: new Date().toISOString(),
    status: hasEvidence ? 'speculative' : (existing?.status ?? 'insufficient_data'),
  };

  // Save to store
  psychometricStore.upsertProfile(profile);

  return profile;
}

/**
 * Get the current MBTI profile for a contact without updating.
 * Returns null if no profile or no MBTI data exists.
 *
 * @param contactId - The contact to get MBTI for
 * @returns The MBTI profile if it exists, null otherwise
 */
export function getMbtiProfile(contactId: string): MbtiProfile | null {
  const profile = psychometricStore.getProfile(contactId);
  return profile?.mbti ?? null;
}

/**
 * Get doctrine path (for debugging/info display).
 *
 * @returns The path to the MBTI doctrine file
 */
export function getMbtiDoctrinePath(): string {
  return MBTI_DOCTRINE_PATH;
}
