// =============================================================================
// DARK TRAIT INFERENCE CLIENT — LLM-powered behavioral risk assessment
// =============================================================================
// This client:
// 1. Gathers evidence for a contact from psychometricStore
// 2. Calls inferDarkTraitsForContact which sends doctrine + evidence to LLM
// 3. Parses the LLM response and updates the profile
// 4. Falls back to conservative defaults if inference fails or no evidence exists
//
// IMPORTANT: This is a behavioral risk module, not a clinical assessment.
// All outputs are speculative and based only on user-provided data.
// =============================================================================

import { DarkTraitProfile, PsychometricProfile, ConfidenceLevel } from '@/types/psychometrics';
import { psychometricStore } from '@/services/psychometricStore';
import { inferDarkTraitsForContact } from '@/lib/psychometricInferenceDarkTraits';

/**
 * Path to the dark trait doctrine file (relative to repo root).
 * This doctrine provides the behavioral markers and inference rules
 * that the LLM will use to assess risk signals from text evidence.
 *
 * TODO: When implementing real inference:
 * - Read this file's contents
 * - Include doctrine in the LLM system prompt
 * - Structure the prompt: doctrine + evidence list + existing profile
 * - Parse LLM response for inferred risk signals and explanation notes
 */
const DARK_TRAIT_DOCTRINE_PATH = 'ai_knowledge/psychometrics/dark_trait_doctrine.txt';

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
 * Create a default dark trait profile with conservative placeholder values.
 * Used as fallback when LLM inference fails or returns null.
 */
function createDefaultDarkTraits(hasEvidence: boolean, confidence: ConfidenceLevel): DarkTraitProfile {
  return {
    narcissism: 0.2,
    machiavellianism: 0.2,
    psychopathy: 0.2,
    overallRisk: hasEvidence ? 'low' : 'insufficient',
    confidence,
    explanationNotes: [],
  };
}

/**
 * Update (or create) the dark trait risk profile for a contact.
 *
 * Behavior:
 * 1. If no evidence exists, returns profile with risk "insufficient"
 * 2. If evidence exists, calls LLM inference to get real risk assessment
 * 3. Falls back to conservative defaults if LLM inference fails
 *
 * @param contactId - The contact to update profile for
 * @returns The updated (or created) profile
 */
export async function updateDarkTraitProfileForContact(
  contactId: string
): Promise<PsychometricProfile> {
  // Get existing profile if any
  const existing = psychometricStore.getProfile(contactId);

  // Get all evidence for this contact
  const evidence = psychometricStore.getEvidence(contactId);
  const hasEvidence = evidence.length > 0;

  let darkTraits: DarkTraitProfile;

  // Only call LLM if we have evidence
  if (hasEvidence) {
    try {
      const inferred = await inferDarkTraitsForContact(contactId);

      if (inferred) {
        // Use LLM-inferred dark traits profile
        darkTraits = inferred;
      } else {
        // Inference returned null - use conservative fallback
        const confidence = determineConfidence(evidence.length);
        darkTraits = createDefaultDarkTraits(hasEvidence, confidence);
      }
    } catch (err) {
      // LLM call failed - log and use conservative fallback
      console.error('[updateDarkTraitProfileForContact] Inference error:', err);
      const confidence = determineConfidence(evidence.length);
      darkTraits = createDefaultDarkTraits(hasEvidence, confidence);
    }
  } else {
    // No evidence - use insufficient risk
    darkTraits = createDefaultDarkTraits(false, 'insufficient');
  }

  // Build the profile, preserving existing Big Five, MBTI, and DISC
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
    disc: existing?.disc,
    darkTraits,
    lastUpdatedAt: new Date().toISOString(),
    status: hasEvidence ? 'speculative' : (existing?.status ?? 'insufficient_data'),
  };

  // Save to store
  psychometricStore.upsertProfile(profile);

  return profile;
}

/**
 * Get the current dark trait profile for a contact without updating.
 * Returns null if no profile or no dark trait data exists.
 *
 * @param contactId - The contact to get dark traits for
 * @returns The dark trait profile if it exists, null otherwise
 */
export function getDarkTraitProfile(contactId: string): DarkTraitProfile | null {
  const profile = psychometricStore.getProfile(contactId);
  return profile?.darkTraits ?? null;
}

/**
 * Get doctrine path (for debugging/info display).
 *
 * @returns The path to the dark trait doctrine file
 */
export function getDarkTraitDoctrinePath(): string {
  return DARK_TRAIT_DOCTRINE_PATH;
}
