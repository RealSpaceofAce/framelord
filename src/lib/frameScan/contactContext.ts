// =============================================================================
// CONTACT CONTEXT — Types for per-contact frame context summaries
// =============================================================================
// ContactContextSummary stores a high-level narrative description of the
// frame dynamics between Contact Zero and a specific contact.
// This is used by Framelord assistant and future scans for context.
// =============================================================================

/**
 * A stored summary of the frame context for a contact.
 * Updated by Framelord conversations and used to provide context
 * in future scans and assistant interactions.
 */
export interface ContactContextSummary {
  /** The contact this summary is about */
  contactId: string;
  /** When the summary was last updated (ISO timestamp) */
  lastUpdatedAt: string;
  /** 
   * High-level narrative description of this contact and 
   * the frame dynamics between Contact Zero and them.
   * Typically 2-4 sentences.
   */
  summary: string;
}

/**
 * A snapshot of context for a contact, used when building
 * Framelord prompts or scan inputs.
 */
export interface ContactContextSnapshot {
  contactId: string;
  profile: ContactContextSummary | null;
}







