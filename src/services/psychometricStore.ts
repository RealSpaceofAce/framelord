// =============================================================================
// PSYCHOMETRIC STORE — In-memory data source for psychometric profiles
// =============================================================================
// Stores psychometric profiles and evidence for contacts.
// Follows the same patterns as other stores in the app.
// =============================================================================

import {
  PsychometricProfile,
  PsychometricEvidence,
} from '@/types/psychometrics';

/**
 * Internal state for psychometric data.
 * - profiles: Map of contactId -> PsychometricProfile
 * - evidence: Map of contactId -> array of PsychometricEvidence
 */
interface PsychometricState {
  profiles: Record<string, PsychometricProfile>;
  evidence: Record<string, PsychometricEvidence[]>;
}

const psychometricState: PsychometricState = {
  profiles: {},
  evidence: {},
};

/**
 * Psychometric store for managing personality profiles and evidence.
 */
export const psychometricStore = {
  /**
   * Get the psychometric profile for a contact.
   * @param contactId - The contact ID
   * @returns The profile if it exists, null otherwise
   */
  getProfile(contactId: string): PsychometricProfile | null {
    return psychometricState.profiles[contactId] ?? null;
  },

  /**
   * Create or update a psychometric profile for a contact.
   * @param profile - The profile to save
   */
  upsertProfile(profile: PsychometricProfile): void {
    psychometricState.profiles[profile.contactId] = profile;
  },

  /**
   * Get all evidence entries for a contact.
   * @param contactId - The contact ID
   * @returns Array of evidence entries (empty if none exist)
   */
  getEvidence(contactId: string): PsychometricEvidence[] {
    return psychometricState.evidence[contactId] ?? [];
  },

  /**
   * Add a new evidence entry for a contact.
   * Automatically initializes the evidence array if needed.
   * @param entry - The evidence entry to add
   */
  addEvidence(entry: PsychometricEvidence): void {
    if (!psychometricState.evidence[entry.contactId]) {
      psychometricState.evidence[entry.contactId] = [];
    }

    // Avoid duplicate entries with the same originId
    const existing = psychometricState.evidence[entry.contactId].find(
      e => e.originId === entry.originId
    );
    if (!existing) {
      psychometricState.evidence[entry.contactId].push(entry);
    }
  },

  /**
   * Remove evidence by origin ID (e.g., when a note is deleted).
   * @param contactId - The contact ID
   * @param originId - The origin ID to remove
   */
  removeEvidenceByOriginId(contactId: string, originId: string): void {
    if (psychometricState.evidence[contactId]) {
      psychometricState.evidence[contactId] = psychometricState.evidence[contactId].filter(
        e => e.originId !== originId
      );
    }
  },

  /**
   * Get evidence count for a contact.
   * Useful for determining profile status.
   * @param contactId - The contact ID
   * @returns Number of evidence entries
   */
  getEvidenceCount(contactId: string): number {
    return psychometricState.evidence[contactId]?.length ?? 0;
  },

  /**
   * Check if a contact has any evidence.
   * @param contactId - The contact ID
   * @returns True if evidence exists
   */
  hasEvidence(contactId: string): boolean {
    return this.getEvidenceCount(contactId) > 0;
  },

  /**
   * Get all profiles (for debugging/export).
   * @returns All stored profiles
   */
  getAllProfiles(): Record<string, PsychometricProfile> {
    return { ...psychometricState.profiles };
  },

  /**
   * Clear all data (for testing/reset).
   */
  clearAll(): void {
    psychometricState.profiles = {};
    psychometricState.evidence = {};
  },
};

// Export individual functions for convenience
export const getProfile = psychometricStore.getProfile.bind(psychometricStore);
export const upsertProfile = psychometricStore.upsertProfile.bind(psychometricStore);
export const getEvidence = psychometricStore.getEvidence.bind(psychometricStore);
export const addEvidence = psychometricStore.addEvidence.bind(psychometricStore);
export const getEvidenceCount = psychometricStore.getEvidenceCount.bind(psychometricStore);
export const hasEvidence = psychometricStore.hasEvidence.bind(psychometricStore);
