// =============================================================================
// BIG FIVE INFERENCE CLIENT — LLM-powered personality inference from evidence
// =============================================================================
// This client:
// 1. Gathers evidence for a contact from psychometricStore
// 2. Calls inferBigFiveForContact which sends doctrine + evidence to LLM
// 3. Parses the LLM response and updates the profile
// 4. Falls back to neutral scores if inference fails or no evidence exists
// =============================================================================

import { BigFiveScores, PsychometricProfile, ConfidenceLevel } from '@/types/psychometrics';
import { psychometricStore } from '@/services/psychometricStore';
import { inferBigFiveForContact } from '@/lib/psychometricInferenceBigFive';

/**
 * Path to the Big Five doctrine file (relative to repo root).
 * This doctrine provides the behavioral markers and inference rules
 * that the LLM will use to infer Big Five scores from text evidence.
 *
 * TODO: When implementing real inference:
 * - Read this file's contents
 * - Include doctrine in the LLM system prompt
 * - Structure the prompt: doctrine + evidence list + existing profile
 * - Parse LLM response for updated scores
 */
const BIG_FIVE_DOCTRINE_PATH = 'ai_knowledge/psychometrics/big_five_doctrine.txt';

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
 * Create neutral Big Five scores (0.5 for each dimension).
 * These are placeholders until real LLM inference is implemented.
 */
function createNeutralScores(confidence: ConfidenceLevel): BigFiveScores {
  return {
    openness: 0.5,
    conscientiousness: 0.5,
    extraversion: 0.5,
    agreeableness: 0.5,
    neuroticism: 0.5,
    confidence,
  };
}

/**
 * Update (or create) the Big Five profile for a contact.
 *
 * Behavior:
 * 1. If no evidence exists, returns profile with status "insufficient_data" and neutral scores
 * 2. If evidence exists, calls LLM inference to get real Big Five scores
 * 3. Falls back to neutral scores if LLM inference fails
 *
 * @param contactId - The contact to update profile for
 * @returns The updated (or created) profile
 */
export async function updateBigFiveProfileForContact(
  contactId: string
): Promise<PsychometricProfile> {
  // Get existing profile if any
  const existing = psychometricStore.getProfile(contactId);

  // Get all evidence for this contact
  const evidence = psychometricStore.getEvidence(contactId);
  const hasEvidence = evidence.length > 0;

  let bigFive: BigFiveScores;

  // Only call LLM if we have evidence
  if (hasEvidence) {
    try {
      const inferred = await inferBigFiveForContact(contactId);

      if (inferred) {
        // Use LLM-inferred scores
        bigFive = {
          openness: inferred.openness,
          conscientiousness: inferred.conscientiousness,
          extraversion: inferred.extraversion,
          agreeableness: inferred.agreeableness,
          neuroticism: inferred.neuroticism,
          confidence: inferred.confidence,
        };
      } else {
        // Inference returned null (e.g., parsing failed) - use fallback
        const confidence = determineConfidence(evidence.length);
        bigFive = createNeutralScores(confidence);
      }
    } catch (err) {
      // LLM call failed - log and use fallback
      console.error('[updateBigFiveProfileForContact] Inference error:', err);
      const confidence = determineConfidence(evidence.length);
      bigFive = createNeutralScores(confidence);
    }
  } else {
    // No evidence - use insufficient confidence with neutral scores
    bigFive = createNeutralScores('insufficient');
  }

  // Build the profile, preserving any existing MBTI, DISC, and dark trait inference
  const profile: PsychometricProfile = {
    contactId,
    bigFive,
    mbti: existing?.mbti,           // preserve any existing MBTI inference
    disc: existing?.disc,           // preserve any existing DISC inference
    darkTraits: existing?.darkTraits, // preserve any existing dark trait inference
    lastUpdatedAt: new Date().toISOString(),
    status: hasEvidence ? 'speculative' : (existing?.status ?? 'insufficient_data'),
  };

  // Save to store
  psychometricStore.upsertProfile(profile);

  return profile;
}

/**
 * Get the current Big Five profile for a contact without updating.
 * Returns null if no profile exists.
 *
 * @param contactId - The contact to get profile for
 * @returns The profile if it exists, null otherwise
 */
export function getBigFiveProfile(contactId: string): PsychometricProfile | null {
  return psychometricStore.getProfile(contactId);
}

/**
 * Check if a contact has enough evidence for a speculative profile.
 *
 * @param contactId - The contact to check
 * @returns True if evidence exists, false otherwise
 */
export function hasEvidenceForProfile(contactId: string): boolean {
  return psychometricStore.hasEvidence(contactId);
}

/**
 * Get doctrine path (for debugging/info display).
 *
 * @returns The path to the Big Five doctrine file
 */
export function getDoctrinePath(): string {
  return BIG_FIVE_DOCTRINE_PATH;
}
