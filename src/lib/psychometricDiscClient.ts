// =============================================================================
// DISC INFERENCE CLIENT — LLM-powered DISC behavioral style inference
// =============================================================================
// This client:
// 1. Gathers evidence for a contact from psychometricStore
// 2. Calls inferDiscForContact which sends doctrine + evidence to LLM
// 3. Parses the LLM response and updates the profile
// 4. Falls back to default values if inference fails or no evidence exists
// =============================================================================

import { DiscProfile, PsychometricProfile, ConfidenceLevel } from '@/types/psychometrics';
import { psychometricStore } from '@/services/psychometricStore';
import { inferDiscForContact } from '@/lib/psychometricInferenceDisc';

/**
 * Path to the DISC doctrine file (relative to repo root).
 * This doctrine provides the behavioral markers and inference rules
 * that the LLM will use to infer DISC type from text evidence.
 *
 * TODO: When implementing real inference:
 * - Read this file's contents
 * - Include doctrine in the LLM system prompt
 * - Structure the prompt: doctrine + evidence list + existing profile
 * - Parse LLM response for inferred DISC type
 */
const DISC_DOCTRINE_PATH = 'ai_knowledge/psychometrics/disc_doctrine.txt';

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
 * Create a default DISC profile.
 * Used as fallback when LLM inference fails or returns null.
 */
function createDefaultDisc(confidence: ConfidenceLevel): DiscProfile {
  return {
    type: null,
    confidence,
  };
}

/**
 * Update (or create) the DISC profile for a contact.
 *
 * Behavior:
 * 1. If no evidence exists, returns profile with DISC confidence "insufficient"
 * 2. If evidence exists, calls LLM inference to get real DISC type
 * 3. Falls back to default values if LLM inference fails
 *
 * @param contactId - The contact to update profile for
 * @returns The updated (or created) profile
 */
export async function updateDiscProfileForContact(
  contactId: string
): Promise<PsychometricProfile> {
  // Get existing profile if any
  const existing = psychometricStore.getProfile(contactId);

  // Get all evidence for this contact
  const evidence = psychometricStore.getEvidence(contactId);
  const hasEvidence = evidence.length > 0;

  let disc: DiscProfile;

  // Only call LLM if we have evidence
  if (hasEvidence) {
    try {
      const inferred = await inferDiscForContact(contactId);

      if (inferred) {
        // Use LLM-inferred DISC profile
        disc = inferred;
      } else {
        // Inference returned null - use fallback
        const confidence = determineConfidence(evidence.length);
        disc = createDefaultDisc(confidence);
      }
    } catch (err) {
      // LLM call failed - log and use fallback
      console.error('[updateDiscProfileForContact] Inference error:', err);
      const confidence = determineConfidence(evidence.length);
      disc = createDefaultDisc(confidence);
    }
  } else {
    // No evidence - use insufficient confidence
    disc = createDefaultDisc('insufficient');
  }

  // Build the profile, preserving existing Big Five, MBTI, and dark traits
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
    mbti: existing?.mbti,
    disc,
    darkTraits: existing?.darkTraits,
    lastUpdatedAt: new Date().toISOString(),
    status: hasEvidence ? 'speculative' : (existing?.status ?? 'insufficient_data'),
  };

  // Save to store
  psychometricStore.upsertProfile(profile);

  return profile;
}

/**
 * Get the current DISC profile for a contact without updating.
 * Returns null if no profile or no DISC data exists.
 *
 * @param contactId - The contact to get DISC for
 * @returns The DISC profile if it exists, null otherwise
 */
export function getDiscProfile(contactId: string): DiscProfile | null {
  const profile = psychometricStore.getProfile(contactId);
  return profile?.disc ?? null;
}

/**
 * Get doctrine path (for debugging/info display).
 *
 * @returns The path to the DISC doctrine file
 */
export function getDiscDoctrinePath(): string {
  return DISC_DOCTRINE_PATH;
}
