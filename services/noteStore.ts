// =============================================================================
// NOTE STORE — In-memory data source for Notes
// =============================================================================
// INVARIANT: Every Note has a contactId (who it's ABOUT) and authorContactId (who wrote it).
// No orphan notes.
// Supports [[Topic]] syntax for Obsidian-style topic links.
// Adds Obsidian-style note-to-note backlinks via [[Note Title]].
// =============================================================================

import { Note, NoteLink } from '../types';
import { CONTACT_ZERO } from './contactStore';
import { getOrCreateTopic, linkNoteToTopic } from './topicStore';

// --- TOPIC PARSING ---

/**
 * Extract topic labels from content using [[Topic]] syntax.
 * Returns unique, trimmed, non-empty labels.
 */
export const extractTopicLabelsFromContent = (content: string): string[] => {
  const regex = /\[\[([^\]]+)\]\]/g;
  const labels: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const label = match[1].trim();
    if (label && !labels.includes(label)) {
      labels.push(label);
    }
  }

  return labels;
};

/**
 * Process a note's content for [[Topic]] links.
 * Creates topics if needed and links them to the note.
 */
const processNoteTopics = (note: Note): void => {
  const topicLabels = extractTopicLabelsFromContent(note.content);
  
  for (const label of topicLabels) {
    const topic = getOrCreateTopic(label);
    linkNoteToTopic(note.id, topic);
  }
};

// --- NOTE LINK (BACKLINK) PARSING ---

let NOTE_LINKS: NoteLink[] = [];

const normalizeTitle = (title: string): string =>
  title.trim().toLowerCase();

const deriveTitleFromContent = (content: string): string => {
  const firstLine = content.split('\n')[0] || content;
  return firstLine.trim().slice(0, 120) || 'Untitled';
};

const extractNoteLinkLabelsFromContent = (content: string): string[] => {
  const regex = /\[\[([^\]]+)\]\]/g;
  const labels: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    const label = match[1].trim();
    if (label && !labels.includes(label)) {
      labels.push(label);
    }
  }

  return labels;
};

const getNoteByTitle = (title: string): Note | undefined => {
  const normalized = normalizeTitle(title);
  return MOCK_NOTES.find(
    n => n.title && normalizeTitle(n.title) === normalized
  );
};

const ensureNoteForLink = (
  label: string,
  contextContactId: string,
  authorContactId: string
): Note => {
  const existing = getNoteByTitle(label);
  if (existing) return existing;

  // Create a lightweight note anchored to the same contact context
  const newNote: Note = {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    contactId: contextContactId || CONTACT_ZERO.id,
    authorContactId: authorContactId || CONTACT_ZERO.id,
    title: label.trim(),
    content: '',
    createdAt: new Date().toISOString(),
    updatedAt: null,
    tags: [],
  };

  MOCK_NOTES = [newNote, ...MOCK_NOTES];
  return newNote;
};

const processNoteLinks = (note: Note): void => {
  // Remove existing outgoing links for this note
  NOTE_LINKS = NOTE_LINKS.filter(link => link.sourceNoteId !== note.id);

  const linkLabels = extractNoteLinkLabelsFromContent(note.content);
  for (const label of linkLabels) {
    const targetNote = ensureNoteForLink(label, note.contactId, note.authorContactId);
    if (targetNote.id === note.id) continue; // avoid self-loop

    const exists = NOTE_LINKS.some(
      link => link.sourceNoteId === note.id && link.targetNoteId === targetNote.id
    );

    if (!exists) {
      NOTE_LINKS.push({
        sourceNoteId: note.id,
        targetNoteId: targetNote.id,
      });
    }
  }
};

// --- MOCK NOTES ---
// All notes are linked to a Contact via contactId
// All notes have an author via authorContactId (typically CONTACT_ZERO)
// Some notes include [[Topic]] syntax for testing

// Start with empty notes - users will create their own
let MOCK_NOTES: Note[] = [];

// --- INITIALIZATION ---
// Process existing mock notes to create topics and note links
let _initialized = false;

export const initializeNoteMetadata = (): void => {
  if (_initialized) return;
  _initialized = true;
  
  for (const note of MOCK_NOTES) {
    // Ensure a derived title exists for backlink lookup
    if (!note.title) {
      note.title = deriveTitleFromContent(note.content);
    }
    processNoteTopics(note);
    processNoteLinks(note);
  }
};

// Auto-initialize when module loads
initializeNoteMetadata();

// --- HELPER FUNCTIONS ---

/** Get all notes sorted by createdAt descending */
export const getAllNotes = (): Note[] => {
  return [...MOCK_NOTES].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

/** Get notes ABOUT a specific contact (sorted by createdAt descending) */
export const getNotesByContactId = (contactId: string): Note[] => {
  return MOCK_NOTES
    .filter(n => n.contactId === contactId)
    .sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
};

/** Get notes written BY a specific author (sorted by createdAt descending) */
export const getNotesByAuthorId = (authorContactId: string): Note[] => {
  return MOCK_NOTES
    .filter(n => n.authorContactId === authorContactId)
    .sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
};

/** Get notes for Contact Zero */
export const getContactZeroNotes = (): Note[] => {
  return getNotesByContactId(CONTACT_ZERO.id);
};

/** Generate a unique ID for new notes */
const generateNoteId = (): string => {
  return `note-${Date.now()}`;
};

/** 
 * Create a new note (always attached to a contact) 
 * Automatically parses [[Topic]] syntax, note [[links]], and creates graph links.
 * @param params.contactId - Who the note is ABOUT
 * @param params.authorContactId - Who is WRITING the note
 * @param params.content - The note content
 * @param params.title - Optional explicit title (otherwise derived from content)
 * @param params.tags - Optional tags
 */
export const createNote = (params: {
  contactId: string;
  authorContactId: string;
  content: string;
  title?: string;
  tags?: string[];
}): Note => {
  const newNote: Note = {
    id: generateNoteId(),
    contactId: params.contactId,
    authorContactId: params.authorContactId,
    title: params.title?.trim() || deriveTitleFromContent(params.content),
    content: params.content,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    tags: params.tags || [],
  };
  
  MOCK_NOTES = [newNote, ...MOCK_NOTES];
  
  // Process [[Topic]] links
  processNoteTopics(newNote);
  // Process [[Note]] links/backlinks
  processNoteLinks(newNote);
  
  return newNote;
};

/** Update an existing note */
export const updateNote = (noteId: string, updates: Partial<Pick<Note, 'content' | 'tags' | 'title'>>): Note | null => {
  const index = MOCK_NOTES.findIndex(n => n.id === noteId);
  if (index === -1) return null;
  
  MOCK_NOTES[index] = {
    ...MOCK_NOTES[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  // If content changed, re-process topics and links
  if (updates.content) {
    processNoteTopics(MOCK_NOTES[index]);
    processNoteLinks(MOCK_NOTES[index]);
  }
  
  return MOCK_NOTES[index];
};

/** Delete a note */
export const deleteNote = (noteId: string): boolean => {
  const initialLength = MOCK_NOTES.length;
  MOCK_NOTES = MOCK_NOTES.filter(n => n.id !== noteId);
  return MOCK_NOTES.length < initialLength;
};

/** Get notes for a specific date (YYYY-MM-DD) */
export const getNotesByDate = (dateKey: string): Note[] => {
  return getAllNotes().filter(note => note.createdAt.startsWith(dateKey));
};

/** Get note count for a contact */
export const getNoteCountByContactId = (contactId: string): number => {
  return MOCK_NOTES.filter(n => n.contactId === contactId).length;
};

/** Get a note by ID */
export const getNoteById = (noteId: string): Note | undefined => {
  return MOCK_NOTES.find(n => n.id === noteId);
};

/** Get a note by title (case-insensitive match) */
export const findNoteByTitle = (title: string): Note | undefined => {
  return getNoteByTitle(title);
};

/** Outgoing linked notes (notes this note links to) */
export const getForwardLinkedNotes = (noteId: string): Note[] => {
  const outgoing = NOTE_LINKS.filter(link => link.sourceNoteId === noteId).map(l => l.targetNoteId);
  return getAllNotes().filter(n => outgoing.includes(n.id));
};

/** Incoming backlinks (notes that link to this note) */
export const getBacklinkedNotes = (noteId: string): Note[] => {
  const incoming = NOTE_LINKS.filter(link => link.targetNoteId === noteId).map(l => l.sourceNoteId);
  return getAllNotes().filter(n => incoming.includes(n.id));
};

/** Raw links (useful for UI badges) */
export const getNoteLinks = (): NoteLink[] => [...NOTE_LINKS];

/** Get all notes for autocomplete (filtered by search query) */
export const searchNotesByTitle = (query: string, limit: number = 10): Note[] => {
  const normalizedQuery = normalizeTitle(query);
  if (!normalizedQuery) return [];
  
  return getAllNotes()
    .filter(note => {
      const title = note.title || deriveTitleFromContent(note.content);
      return normalizeTitle(title).includes(normalizedQuery);
    })
    .slice(0, limit);
};

/** Get note by exact title match (case-insensitive) */
export const getNoteByExactTitle = (title: string): Note | undefined => {
  return getNoteByTitle(title);
};
