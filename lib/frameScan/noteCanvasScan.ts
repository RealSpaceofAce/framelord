// =============================================================================
// NOTE CANVAS SCAN — FrameScan integration for note canvas mode
// =============================================================================
// Provides canvas snapshot capture and FrameScan analysis for edgeless canvases.
// Uses image-based scanning since canvas content is visual.
// =============================================================================

import { getNoteById } from '../../services/noteStore';
import { runImageFrameScan, type ImageDomainId } from './frameScanLLM';
import type { FrameImageScanResult } from './frameTypes';

/**
 * Capture a snapshot of the canvas as a data URL.
 * This converts the edgeless canvas to an image for analysis.
 *
 * @param canvasContainer - The DOM element containing the BlockSuite canvas
 * @returns Base64 data URL of the canvas snapshot
 */
export async function captureCanvasSnapshot(
  canvasContainer: HTMLElement
): Promise<string> {
  // Try to find the actual canvas element
  const canvas = canvasContainer.querySelector('canvas');

  if (canvas) {
    // Direct canvas capture
    return canvas.toDataURL('image/png');
  }

  // Fallback: Use html2canvas for complex DOM structures
  const html2canvas = await import('html2canvas');
  const snapshotCanvas = await html2canvas.default(canvasContainer, {
    backgroundColor: '#0a0b0e',
    scale: 1,
    useCORS: true,
    allowTaint: true,
  });

  return snapshotCanvas.toDataURL('image/png');
}

/**
 * Extract text content from canvas shapes and blocks.
 * BlockSuite stores text in various block types.
 *
 * @param doc - BlockSuite document
 * @returns Combined text from canvas elements
 */
export function extractTextFromCanvas(doc: unknown): string {
  const textParts: string[] = [];

  // TODO: Implement proper BlockSuite block traversal
  // This will need to iterate through surface blocks, note blocks, text blocks
  // and extract their text content

  if (doc && typeof (doc as any).blocks === 'object') {
    const blocks = (doc as any).blocks;
    for (const block of Object.values(blocks)) {
      if (block && typeof (block as any).text === 'string') {
        textParts.push((block as any).text);
      }
    }
  }

  return textParts.join('\n');
}

/**
 * Scan note canvas using FrameScan image analysis.
 *
 * @param noteId - The ID of the note to scan
 * @param canvasContainer - DOM element containing the canvas
 * @param domain - Image domain context (defaults to 'landing_page_hero')
 * @returns FrameImageScanResult with score, annotations, and optional annotated image
 * @throws Error if note not found or scan fails
 */
export async function scanNoteCanvas(
  noteId: string,
  canvasContainer: HTMLElement,
  domain: ImageDomainId = 'landing_page_hero'
): Promise<FrameImageScanResult> {
  const note = getNoteById(noteId);

  if (!note) {
    throw new Error(`Note not found: ${noteId}`);
  }

  // Capture canvas as image
  const imageDataUrl = await captureCanvasSnapshot(canvasContainer);

  // Build context description from note metadata
  const contextDescription = [
    `Canvas from note: ${note.title || 'Untitled'}`,
    note.topics.length > 0 ? `Topics: ${note.topics.join(', ')}` : null,
    note.tags.length > 0 ? `Tags: ${note.tags.join(', ')}` : null,
  ].filter(Boolean).join('. ');

  // Build context object
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

  // Run image scan
  const result = await runImageFrameScan({
    domain,
    imageIdOrUrl: imageDataUrl,
    description: contextDescription,
    context,
    contactId: note.targetContactIds?.[0] || note.authorContactId,
    sourceRef: `note:${noteId}:canvas`,
    subjectLabel: note.title ? `Canvas: ${note.title}` : `Canvas scan`,
  });

  return result;
}

/**
 * Scan canvas using a pre-captured image URL or data URL.
 * Use this when you already have the image captured.
 *
 * @param noteId - The ID of the note
 * @param imageUrl - URL or data URL of the canvas image
 * @param domain - Image domain context
 * @returns FrameImageScanResult
 */
export async function scanNoteCanvasImage(
  noteId: string,
  imageUrl: string,
  domain: ImageDomainId = 'landing_page_hero'
): Promise<FrameImageScanResult> {
  const note = getNoteById(noteId);

  if (!note) {
    throw new Error(`Note not found: ${noteId}`);
  }

  const contextDescription = `Canvas from note: ${note.title || 'Untitled'}`;

  const result = await runImageFrameScan({
    domain,
    imageIdOrUrl: imageUrl,
    description: contextDescription,
    context: {
      noteId,
      noteTitle: note.title,
      noteKind: note.kind,
    },
    contactId: note.targetContactIds?.[0] || note.authorContactId,
    sourceRef: `note:${noteId}:canvas`,
    subjectLabel: note.title ? `Canvas: ${note.title}` : `Canvas scan`,
  });

  return result;
}
