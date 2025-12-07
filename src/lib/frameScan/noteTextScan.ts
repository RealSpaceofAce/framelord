// =============================================================================
// NOTE TEXT SCAN — FrameScan integration for note text mode
// =============================================================================
// Provides a thin wrapper around runTextFrameScan for scanning note content.
// =============================================================================

import { getNoteById } from '../../services/noteStore';
import { runTextFrameScan, type TextDomainId } from './frameScanLLM';
import type { FrameScore } from './frameTypes';

/**
 * Scan note content in text mode using FrameScan.
 *
 * @param noteId - The ID of the note to scan
 * @param textContent - The text content to analyze (from BlockSuite or legacy content)
 * @param domain - The text domain context (defaults to 'generic')
 * @returns FrameScore with 0-100 score and breakdown
 * @throws Error if note not found or scan fails
 */
export async function scanNoteText(
  noteId: string,
  textContent: string,
  domain: TextDomainId = 'generic'
): Promise<FrameScore> {
  const note = getNoteById(noteId);

  if (!note) {
    throw new Error(`Note not found: ${noteId}`);
  }

  if (!textContent || textContent.trim().length === 0) {
    throw new Error('Cannot scan empty text content');
  }

  // Build context from note metadata
  const context: Record<string, unknown> = {
    noteId,
    noteTitle: note.title || 'Untitled',
    noteKind: note.kind,
    authorContactId: note.authorContactId,
    targetContactIds: note.targetContactIds,
    folderId: note.folderId,
    topics: note.topics,
    tags: note.tags,
  };

  // Run the text scan
  const score = await runTextFrameScan({
    domain,
    content: textContent,
    context,
    contactId: note.targetContactIds?.[0] || note.authorContactId,
    sourceRef: `note:${noteId}`,
    subjectLabel: note.title ? `Note: ${note.title}` : `Note scan`,
  });

  return score;
}

/**
 * Extract plain text from BlockSuite document for scanning.
 * This is a placeholder - actual implementation depends on BlockSuite API.
 *
 * @param doc - BlockSuite document
 * @returns Plain text content
 */
export function extractTextFromBlockSuiteDoc(doc: unknown): string {
  // TODO: Implement proper BlockSuite text extraction
  // For now, this is a placeholder that should be called with actual doc content
  if (typeof doc === 'string') {
    return doc;
  }

  // If doc has a getText method or similar
  if (doc && typeof (doc as any).getText === 'function') {
    return (doc as any).getText();
  }

  // If doc has blocks we can iterate
  if (doc && typeof (doc as any).getBlockText === 'function') {
    return (doc as any).getBlockText();
  }

  return '';
}
