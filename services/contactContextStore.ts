// =============================================================================
// CONTACT CONTEXT STORE — In-memory storage for contact frame context summaries
// =============================================================================
// Follows the same pattern as noteStore and taskStore.
// Stores ContactContextSummary objects that describe the frame dynamics
// between Contact Zero and each contact.
// =============================================================================

import type { ContactContextSummary } from '../lib/frameScan/contactContext';

// =============================================================================
// IN-MEMORY STORE
// =============================================================================

let summaries: ContactContextSummary[] = [];

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

/**
 * Get the context summary for a specific contact.
 * @returns The summary, or null if none exists
 */
export function getContactContextSummary(contactId: string): ContactContextSummary | null {
  return summaries.find(s => s.contactId === contactId) ?? null;
}

/**
 * Create or update the context summary for a contact.
 * @param contactId - The contact ID
 * @param summary - The new summary text
 * @returns The updated ContactContextSummary
 */
export function upsertContactContextSummary(
  contactId: string,
  summary: string
): ContactContextSummary {
  const now = new Date().toISOString();
  const existingIndex = summaries.findIndex(s => s.contactId === contactId);
  
  const next: ContactContextSummary = {
    contactId,
    lastUpdatedAt: now,
    summary: summary.trim(),
  };

  if (existingIndex >= 0) {
    summaries[existingIndex] = next;
  } else {
    summaries = [next, ...summaries];
  }
  
  return next;
}

/**
 * Get all contact context summaries.
 * @returns Array of all summaries, most recent first
 */
export function getAllContactContextSummaries(): ContactContextSummary[] {
  return [...summaries].sort((a, b) => 
    new Date(b.lastUpdatedAt).getTime() - new Date(a.lastUpdatedAt).getTime()
  );
}

/**
 * Delete the context summary for a contact.
 * @param contactId - The contact ID
 * @returns True if deleted, false if not found
 */
export function deleteContactContextSummary(contactId: string): boolean {
  const initialLength = summaries.length;
  summaries = summaries.filter(s => s.contactId !== contactId);
  return summaries.length < initialLength;
}

/**
 * Clear all context summaries (for testing/reset).
 */
export function clearAllContactContextSummaries(): void {
  summaries = [];
}

/**
 * Get count of contacts with summaries.
 */
export function getContactContextSummaryCount(): number {
  return summaries.length;
}

/**
 * Check if a contact has a context summary.
 */
export function hasContactContextSummary(contactId: string): boolean {
  return summaries.some(s => s.contactId === contactId);
}

// =============================================================================
// EXPORT / IMPORT (for potential future persistence)
// =============================================================================

/**
 * Export all summaries as JSON string.
 */
export function exportContactContextSummariesToJSON(): string {
  return JSON.stringify(summaries, null, 2);
}

/**
 * Import summaries from JSON string (replaces current data).
 */
export function importContactContextSummariesFromJSON(json: string): void {
  try {
    const parsed = JSON.parse(json);
    if (Array.isArray(parsed)) {
      summaries = parsed;
    }
  } catch (err) {
    console.error('Failed to import contact context summaries:', err);
  }
}






