// =============================================================================
// ATTACHMENT STORE — Aggregation helpers for attachments across notes
// =============================================================================
// Provides derived views of attachments for Contact Zero and individual contacts
// All attachments are stored on notes, this just aggregates them
// =============================================================================

import { NoteAttachment } from '../types';
import { getAllNotes, getNoteById } from './noteStore';
import { CONTACT_ZERO } from './contactStore';

export interface NoteAttachmentWithContext {
  attachment: NoteAttachment;
  noteId: string;
  noteTitle?: string;
  noteDate: string;
  linkedContactIds: string[];
}

/**
 * Get all attachments for Contact Zero (all notes authored by Contact Zero)
 */
export const getAllAttachmentsForContactZero = (): NoteAttachmentWithContext[] => {
  const allNotes = getAllNotes();
  const attachments: NoteAttachmentWithContext[] = [];

  for (const note of allNotes) {
    // All notes are authored by Contact Zero, so include all
    const noteAttachments = note.attachments || [];
    const entryAttachments = note.entries?.flatMap(entry => entry.attachments || []) || [];
    const allNoteAttachments = [...noteAttachments, ...entryAttachments];

    // Collect linked contacts
    const linkedContactIds: string[] = [];
    if (note.targetContactId) linkedContactIds.push(note.targetContactId);
    if (note.mentionedContactIds) linkedContactIds.push(...note.mentionedContactIds);
    // Also include legacy contactId if different from Contact Zero
    if (note.contactId && note.contactId !== CONTACT_ZERO.id) {
      if (!linkedContactIds.includes(note.contactId)) {
        linkedContactIds.push(note.contactId);
      }
    }

    for (const attachment of allNoteAttachments) {
      attachments.push({
        attachment,
        noteId: note.id,
        noteTitle: note.title,
        noteDate: note.createdAt,
        linkedContactIds: [...linkedContactIds],
      });
    }
  }

  // Sort by date (newest first)
  return attachments.sort((a, b) => 
    new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime()
  );
};

/**
 * Get all attachments for a specific contact
 * Includes attachments from notes where:
 * - note.targetContactId === contactId
 * - note.mentionedContactIds includes contactId
 * - note.contactId === contactId (legacy)
 */
export const getAttachmentsForContact = (contactId: string): NoteAttachmentWithContext[] => {
  const allNotes = getAllNotes();
  const attachments: NoteAttachmentWithContext[] = [];

  for (const note of allNotes) {
    // Check if this note is linked to the contact
    const isLinked = 
      note.targetContactId === contactId ||
      note.mentionedContactIds?.includes(contactId) ||
      note.contactId === contactId;

    if (!isLinked) continue;

    const noteAttachments = note.attachments || [];
    const entryAttachments = note.entries?.flatMap(entry => entry.attachments || []) || [];
    const allNoteAttachments = [...noteAttachments, ...entryAttachments];

    // Collect all linked contacts for this note
    const linkedContactIds: string[] = [];
    if (note.targetContactId) linkedContactIds.push(note.targetContactId);
    if (note.mentionedContactIds) linkedContactIds.push(...note.mentionedContactIds);
    if (note.contactId && note.contactId !== CONTACT_ZERO.id) {
      if (!linkedContactIds.includes(note.contactId)) {
        linkedContactIds.push(note.contactId);
      }
    }

    for (const attachment of allNoteAttachments) {
      attachments.push({
        attachment,
        noteId: note.id,
        noteTitle: note.title,
        noteDate: note.createdAt,
        linkedContactIds: [...linkedContactIds],
      });
    }
  }

  // Sort by date (newest first)
  return attachments.sort((a, b) => 
    new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime()
  );
};

/**
 * Filter attachments by type
 */
export const filterAttachmentsByType = (
  attachments: NoteAttachmentWithContext[],
  type: 'image' | 'audio' | 'file' | 'all'
): NoteAttachmentWithContext[] => {
  if (type === 'all') return attachments;
  return attachments.filter(item => item.attachment.type === type);
};

/**
 * Search attachments by name or note context
 */
export const searchAttachments = (
  attachments: NoteAttachmentWithContext[],
  query: string
): NoteAttachmentWithContext[] => {
  if (!query.trim()) return attachments;
  
  const normalizedQuery = query.toLowerCase();
  return attachments.filter(item => {
    const filename = item.attachment.filename?.toLowerCase() || '';
    const noteTitle = item.noteTitle?.toLowerCase() || '';
    return filename.includes(normalizedQuery) || noteTitle.includes(normalizedQuery);
  });
};








