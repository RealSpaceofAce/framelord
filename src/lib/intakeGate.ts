// =============================================================================
// INTAKE GATE — Helper functions for Tier 1 intake routing
// =============================================================================
// Determines whether a user should be forced through the Tier 1 intake gateway.
// Users who have completed Tier 1 once are never auto-gated again.
// =============================================================================

import { getContactById } from '../services/contactStore';

/**
 * Check if a user still needs to complete Tier 1 intake.
 *
 * Returns true if:
 * - contactId is valid and contact exists
 * - contact has NOT completed Tier 1 (firstIntakeCompletedAt is null/undefined)
 *
 * Returns false if:
 * - contactId is null/undefined (no user to gate)
 * - contact not found
 * - contact has already completed Tier 1
 *
 * @param contactId - The contact ID to check (usually Contact Zero)
 * @returns True if user should be forced into Tier 1, false otherwise
 */
export function needsTier1Intake(contactId: string | null | undefined): boolean {
  if (!contactId) {
    // No contact, do not gate
    return false;
  }

  const contact = getContactById(contactId);
  if (!contact) {
    // Contact not found, do not gate
    return false;
  }

  // User needs intake if they have NOT completed Tier 1
  return !contact.firstIntakeCompletedAt;
}

/**
 * Check if a user has completed Tier 1 intake.
 * Inverse of needsTier1Intake for clarity.
 *
 * @param contactId - The contact ID to check
 * @returns True if user has completed Tier 1, false otherwise
 */
export function hasCompletedTier1Intake(contactId: string | null | undefined): boolean {
  if (!contactId) {
    return false;
  }

  const contact = getContactById(contactId);
  if (!contact) {
    return false;
  }

  return !!contact.firstIntakeCompletedAt;
}

/**
 * Get the timestamp when a user completed Tier 1 intake.
 *
 * @param contactId - The contact ID to check
 * @returns ISO timestamp string or null if not completed
 */
export function getTier1CompletionDate(contactId: string | null | undefined): string | null {
  if (!contactId) {
    return null;
  }

  const contact = getContactById(contactId);
  if (!contact) {
    return null;
  }

  return contact.firstIntakeCompletedAt || null;
}
