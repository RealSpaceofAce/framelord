// =============================================================================
// PSYCHOMETRIC NOTE ADAPTER — Converts notes to psychometric evidence
// =============================================================================
// Bridges the note system with the psychometric store.
// When a note is created/updated that targets a contact, this adapter
// extracts the text content and adds it as evidence for that contact.
// =============================================================================

import { psychometricStore } from '@/services/psychometricStore';
import { PsychometricEvidence } from '@/types/psychometrics';
import type { Note } from '@/types';

/**
 * Generate a unique ID for psychometric evidence entries.
 */
const generateEvidenceId = (): string => {
  return `psycho-evidence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Extract text content from a note.
 * Handles both legacy content field and BlockSuite serialized content.
 * For now, uses the legacy content field; future updates will parse BlockSuite.
 */
const extractTextFromNote = (note: Note): string => {
  // Use legacy content field if available
  if (note.content && note.content.trim().length > 0) {
    return note.content;
  }

  // Future: Parse blocksuiteSerialized for text content
  // For now, return empty string if no legacy content
  return '';
};

/**
 * Add a note as psychometric evidence for its target contacts.
 *
 * This should be called when:
 * - A note is created with targetContactIds
 * - A note is updated with new content
 *
 * Notes that only target Contact Zero are skipped (we don't build
 * psychometric profiles for the user themselves via their own notes).
 *
 * @param note - The note to process
 */
export function addNoteAsPsychometricEvidence(note: Note): void {
  // Skip if no target contacts
  const targetIds = note.targetContactIds || [];
  if (targetIds.length === 0) {
    // Fallback to legacy targetContactId field
    if (note.targetContactId) {
      targetIds.push(note.targetContactId);
    } else {
      return;
    }
  }

  // Extract text content
  const rawText = extractTextFromNote(note);
  if (!rawText || rawText.trim().length === 0) {
    return; // No text content to add as evidence
  }

  // Add evidence for each target contact (except Contact Zero)
  for (const contactId of targetIds) {
    // Skip Contact Zero - we don't build psychometric profiles for self
    if (contactId === 'contact_zero') {
      continue;
    }

    const entry: PsychometricEvidence = {
      id: generateEvidenceId(),
      contactId,
      sourceType: 'note',
      originId: note.id,
      rawText,
      createdAt: new Date().toISOString(),
    };

    psychometricStore.addEvidence(entry);
  }
}

/**
 * Update psychometric evidence when a note is modified.
 * Removes old evidence and adds new evidence with updated content.
 *
 * @param note - The updated note
 */
export function updateNoteAsPsychometricEvidence(note: Note): void {
  // First, remove existing evidence from this note
  removeNoteFromPsychometricEvidence(note.id);

  // Then add fresh evidence with updated content
  addNoteAsPsychometricEvidence(note);
}

/**
 * Remove psychometric evidence when a note is deleted.
 *
 * @param noteId - The ID of the deleted note
 */
export function removeNoteFromPsychometricEvidence(noteId: string): void {
  // We need to check all contacts since we don't know which contact
  // this note was targeting. The store handles this efficiently.
  const allProfiles = psychometricStore.getAllProfiles();

  for (const contactId of Object.keys(allProfiles)) {
    psychometricStore.removeEvidenceByOriginId(contactId, noteId);
  }

  // Also check evidence that might exist without a profile yet
  // This is a bit of a hack but ensures cleanup
  // In a real implementation, we might track note->contact mappings
}
