// =============================================================================
// DAILY NOTE STORE
// =============================================================================
// Manages daily journal-style notes with Obsidian-style [[linking]]
// =============================================================================

import type { DailyNote } from '../types';
import { CONTACT_ZERO } from './contactStore';

// =============================================================================
// STATE
// =============================================================================

let DAILY_NOTES: DailyNote[] = [];

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Format date as YYYY-MM-DD
 */
export const formatDateKey = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Get today's date key
 */
export const getTodayKey = (): string => {
  return formatDateKey(new Date());
};

/**
 * Parse date from YYYY-MM-DD string
 */
export const parseDateKey = (dateKey: string): Date => {
  return new Date(dateKey + 'T00:00:00');
};

// =============================================================================
// CRUD
// =============================================================================

/**
 * Get all daily notes, sorted by date (newest first)
 */
export const getAllDailyNotes = (): DailyNote[] => {
  return [...DAILY_NOTES].sort((a, b) =>
    b.date.localeCompare(a.date)
  );
};

/**
 * Get notes for a specific date
 */
export const getDailyNoteByDate = (dateKey: string): DailyNote | undefined => {
  return DAILY_NOTES.find(note => note.date === dateKey);
};

/**
 * Get notes for a date range
 */
export const getDailyNotesInRange = (startDate: string, endDate: string): DailyNote[] => {
  return DAILY_NOTES
    .filter(note => note.date >= startDate && note.date <= endDate)
    .sort((a, b) => b.date.localeCompare(a.date));
};

/**
 * Get today's note (create if doesn't exist)
 */
export const getTodayNote = (): DailyNote => {
  const todayKey = getTodayKey();
  let note = getDailyNoteByDate(todayKey);

  if (!note) {
    note = createDailyNote(todayKey, '');
  }

  return note;
};

/**
 * Create a new daily note
 */
export const createDailyNote = (dateKey: string, content: string = ''): DailyNote => {
  const now = new Date().toISOString();

  const newNote: DailyNote = {
    id: `daily-${dateKey}-${Date.now()}`,
    date: dateKey,
    authorContactId: CONTACT_ZERO.id,
    content,
    createdAt: now,
    updatedAt: now,
  };

  DAILY_NOTES.push(newNote);
  return newNote;
};

/**
 * Update a daily note's content
 */
export const updateDailyNote = (dateKey: string, content: string): DailyNote => {
  let note = getDailyNoteByDate(dateKey);

  if (!note) {
    note = createDailyNote(dateKey, content);
  } else {
    note.content = content;
    note.updatedAt = new Date().toISOString();
  }

  return note;
};

/**
 * Delete a daily note
 */
export const deleteDailyNote = (dateKey: string): void => {
  DAILY_NOTES = DAILY_NOTES.filter(note => note.date !== dateKey);
};

// =============================================================================
// LINK PARSING
// =============================================================================

/**
 * Extract all [[links]] from note content
 * Returns array of link texts (without brackets)
 */
export const extractLinks = (content: string): string[] => {
  const linkRegex = /\[\[([^\]]+)\]\]/g;
  const links: string[] = [];
  let match;

  while ((match = linkRegex.exec(content)) !== null) {
    links.push(match[1]);
  }

  return links;
};

/**
 * Get all notes that contain a specific link
 */
export const getNotesLinkingTo = (linkText: string): DailyNote[] => {
  return DAILY_NOTES.filter(note => {
    const links = extractLinks(note.content);
    return links.includes(linkText);
  });
};

/**
 * Get all unique links from all daily notes
 */
export const getAllLinks = (): string[] => {
  const allLinks = new Set<string>();

  DAILY_NOTES.forEach(note => {
    const links = extractLinks(note.content);
    links.forEach(link => allLinks.add(link));
  });

  return Array.from(allLinks).sort();
};

// =============================================================================
// SEARCH
// =============================================================================

/**
 * Search daily notes by content
 */
export const searchDailyNotes = (query: string): DailyNote[] => {
  const lowercaseQuery = query.toLowerCase();

  return DAILY_NOTES.filter(note =>
    note.content.toLowerCase().includes(lowercaseQuery)
  ).sort((a, b) => b.date.localeCompare(a.date));
};
