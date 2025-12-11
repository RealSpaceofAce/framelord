// =============================================================================
// NOTE ADAPTER — Bridge between noteStore and TipTap editor
// =============================================================================
// This adapter handles conversions between the note storage format (HTML) and
// the TipTap editor format. It provides a clean abstraction layer for future
// format changes.
//
// CURRENT STORAGE FORMAT: HTML string (in note.content field)
// EDITOR FORMAT: TipTap JSON (ProseMirror document)
//
// TipTap handles HTML<->JSON conversion automatically via:
// - editor.setContent(html) - Parses HTML into ProseMirror doc
// - editor.getHTML() - Serializes ProseMirror doc to HTML
//
// FUTURE CONSIDERATIONS:
// - Could switch to storing TipTap JSON for better fidelity
// - Could add markdown import/export
// - Could add migration support for legacy formats
// =============================================================================

import type { Note } from '../../types';

// =============================================================================
// TYPES
// =============================================================================

/** Storage format for notes - currently HTML */
export type NoteStorageFormat = 'html';

/** Editor format - TipTap uses ProseMirror JSON internally */
export type EditorFormat = 'prosemirror-json';

/** Adapter result containing content and metadata */
export interface AdapterResult {
  /** The converted content */
  content: string;
  /** Whether conversion was successful */
  success: boolean;
  /** Any warnings during conversion */
  warnings?: string[];
}

// =============================================================================
// STORAGE TO EDITOR CONVERSION
// =============================================================================

/**
 * Prepare note content for the TipTap editor.
 * Currently a passthrough since TipTap handles HTML parsing.
 *
 * @param note - The note from the store
 * @returns Content ready for TipTap's setContent()
 */
export function prepareForEditor(note: Note | null): string {
  if (!note) return '';

  // TipTap accepts HTML directly - no conversion needed
  return note.content || '';
}

/**
 * Check if content contains custom nodes that need special handling.
 * Useful for debugging and validation.
 *
 * @param html - HTML content to analyze
 * @returns Object with detected node types
 */
export function analyzeContent(html: string): {
  hasWikiLinks: boolean;
  hasContactMentions: boolean;
  hasTopicMentions: boolean;
  hasResizableImages: boolean;
  hasTweetEmbeds: boolean;
} {
  return {
    hasWikiLinks: html.includes('data-type="wiki-link"'),
    hasContactMentions: html.includes('data-type="contact-mention"'),
    hasTopicMentions: html.includes('data-type="topic-mention"'),
    hasResizableImages: html.includes('data-type="resizable-image"'),
    hasTweetEmbeds: html.includes('data-type="tweet-embed"'),
  };
}

// =============================================================================
// EDITOR TO STORAGE CONVERSION
// =============================================================================

/**
 * Prepare editor content for storage in noteStore.
 * Currently a passthrough since we store HTML.
 *
 * @param html - HTML from editor.getHTML()
 * @returns Content ready for noteStore
 */
export function prepareForStorage(html: string): string {
  // Store HTML directly - no conversion needed
  return html;
}

/**
 * Sanitize HTML before storage (security).
 * Removes potentially dangerous elements while preserving custom nodes.
 *
 * @param html - Raw HTML from editor
 * @returns Sanitized HTML
 */
export function sanitizeHtml(html: string): string {
  // TipTap's output is generally safe since it only produces
  // nodes defined in the schema. This function is a safety net
  // for any edge cases.

  // Remove script tags (should never be present in TipTap output)
  let sanitized = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers
  sanitized = sanitized.replace(/\s*on\w+="[^"]*"/gi, '');

  // Remove javascript: URLs
  sanitized = sanitized.replace(/href="javascript:[^"]*"/gi, 'href="#"');

  return sanitized;
}

// =============================================================================
// IMPORT/EXPORT UTILITIES
// =============================================================================

/**
 * Convert HTML to plain text (for search indexing, previews, etc.)
 *
 * @param html - HTML content
 * @returns Plain text content
 */
export function htmlToPlainText(html: string): string {
  // Create a temporary element to extract text
  if (typeof document !== 'undefined') {
    const temp = document.createElement('div');
    temp.innerHTML = html;
    return temp.textContent || temp.innerText || '';
  }

  // Server-side fallback: strip HTML tags
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Generate a preview snippet from HTML content.
 *
 * @param html - HTML content
 * @param maxLength - Maximum character length (default 150)
 * @returns Preview snippet
 */
export function generatePreview(html: string, maxLength = 150): string {
  const text = htmlToPlainText(html);
  if (text.length <= maxLength) return text;

  // Find a good break point (space, punctuation)
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > maxLength * 0.7) {
    return truncated.slice(0, lastSpace) + '...';
  }

  return truncated + '...';
}

/**
 * Extract all wiki links from HTML content.
 *
 * @param html - HTML content
 * @returns Array of wiki link titles
 */
export function extractWikiLinks(html: string): string[] {
  const regex = /data-type="wiki-link"[^>]*data-title="([^"]*)"/g;
  const links: string[] = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    links.push(match[1]);
  }

  return links;
}

/**
 * Extract all contact mentions from HTML content.
 *
 * @param html - HTML content
 * @returns Array of contact IDs
 */
export function extractContactMentions(html: string): string[] {
  const regex = /data-type="contact-mention"[^>]*data-contact-id="([^"]*)"/g;
  const mentions: string[] = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    mentions.push(match[1]);
  }

  return mentions;
}

/**
 * Extract all topic hashtags from HTML content.
 *
 * @param html - HTML content
 * @returns Array of topic IDs
 */
export function extractTopicMentions(html: string): string[] {
  const regex = /data-type="topic-mention"[^>]*data-topic-id="([^"]*)"/g;
  const topics: string[] = [];
  let match;

  while ((match = regex.exec(html)) !== null) {
    topics.push(match[1]);
  }

  return topics;
}

// =============================================================================
// FUTURE MIGRATION HELPERS
// =============================================================================

/**
 * Placeholder for future format migration.
 * Would convert between storage format versions.
 *
 * @param content - Content in old format
 * @param fromVersion - Source format version
 * @param toVersion - Target format version
 * @returns Migrated content
 */
export function migrateContent(
  content: string,
  fromVersion: string,
  toVersion: string
): AdapterResult {
  // Currently no migration needed - HTML is the only format
  if (fromVersion === 'html' && toVersion === 'html') {
    return { content, success: true };
  }

  // Future: Add migration paths
  // e.g., 'markdown' -> 'html', 'html' -> 'json', etc.

  return {
    content,
    success: false,
    warnings: [`Migration from ${fromVersion} to ${toVersion} not implemented`],
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  prepareForEditor,
  prepareForStorage,
  sanitizeHtml,
  htmlToPlainText,
  generatePreview,
  extractWikiLinks,
  extractContactMentions,
  extractTopicMentions,
  analyzeContent,
  migrateContent,
};
