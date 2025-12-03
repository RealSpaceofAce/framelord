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
    entries: [],
    isPinned: false,
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
 * INVARIANT: authorContactId is always CONTACT_ZERO.id
 * @param params.contactId - Who the note is ABOUT (legacy, defaults to CONTACT_ZERO if not provided)
 * @param params.authorContactId - Who is WRITING the note (defaults to CONTACT_ZERO, always set to CONTACT_ZERO)
 * @param params.targetContactId - Optional explicit target contact
 * @param params.mentionedContactIds - Optional array of mentioned contact IDs
 * @param params.content - The note content
 * @param params.title - Optional explicit title (otherwise derived from content)
 * @param params.tags - Optional tags
 */
export const createNote = (params: {
  contactId?: string;
  authorContactId?: string;
  targetContactId?: string;
  mentionedContactIds?: string[];
  content: string;
  title?: string;
  tags?: string[];
}): Note => {
  // Always set author to Contact Zero
  const authorId = CONTACT_ZERO.id;
  
  // Determine target contact: use targetContactId if provided, otherwise contactId, otherwise CONTACT_ZERO
  const targetContactId = params.targetContactId || params.contactId || CONTACT_ZERO.id;
  
  // For backward compatibility, also set contactId to targetContactId
  const contactId = targetContactId;
  
  const newNote: Note = {
    id: generateNoteId(),
    contactId, // Legacy field for backward compatibility
    authorContactId: authorId, // Always Contact Zero
    targetContactId: params.targetContactId,
    mentionedContactIds: params.mentionedContactIds ? [...params.mentionedContactIds] : undefined,
    title: params.title?.trim() || deriveTitleFromContent(params.content),
    content: params.content,
    entries: [], // Initialize empty entries array
    attachments: [], // Initialize empty attachments array
    isPinned: false, // New notes start unpinned
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
export const updateNote = (noteId: string, updates: Partial<Pick<Note, 'content' | 'tags' | 'title' | 'targetContactId' | 'mentionedContactIds'>>): Note | null => {
  const index = MOCK_NOTES.findIndex(n => n.id === noteId);
  if (index === -1) return null;
  
  MOCK_NOTES[index] = {
    ...MOCK_NOTES[index],
    ...updates,
    // Ensure mentionedContactIds is a new array if provided
    mentionedContactIds: updates.mentionedContactIds !== undefined 
      ? [...updates.mentionedContactIds] 
      : MOCK_NOTES[index].mentionedContactIds,
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

// =============================================================================
// NOTE ENTRIES, ATTACHMENTS, AND PINNING
// =============================================================================

import { NoteEntry, NoteAttachment } from '../types';

/** Pin or unpin a note */
export const toggleNotePin = (noteId: string): void => {
  const note = MOCK_NOTES.find(n => n.id === noteId);
  if (note) {
    note.isPinned = !note.isPinned;
    note.updatedAt = new Date().toISOString();
  }
};

/** Get notes sorted with pinned first, then by updatedAt */
export const getAllNotesSorted = (contactId?: string): Note[] => {
  let notes = contactId ? getNotesByContactId(contactId) : getAllNotes();
  return notes.sort((a, b) => {
    // Pinned notes first
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    // Then by updatedAt or createdAt
    const dateA = new Date(a.updatedAt || a.createdAt).getTime();
    const dateB = new Date(b.updatedAt || b.createdAt).getTime();
    return dateB - dateA;
  });
};

/** Add a new entry (bullet point) to a note */
export const addNoteEntry = (noteId: string, text: string): NoteEntry | null => {
  const note = MOCK_NOTES.find(n => n.id === noteId);
  if (!note) return null;

  const entry: NoteEntry = {
    id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    text,
    attachments: [],
    createdAt: new Date().toISOString(),
  };

  if (!note.entries) {
    note.entries = [];
  }
  note.entries.push(entry);
  note.updatedAt = new Date().toISOString();

  return entry;
};

/** Update an entry's text */
export const updateNoteEntry = (noteId: string, entryId: string, text: string): void => {
  const note = MOCK_NOTES.find(n => n.id === noteId);
  if (!note || !note.entries) return;

  const entry = note.entries.find(e => e.id === entryId);
  if (entry) {
    entry.text = text;
    note.updatedAt = new Date().toISOString();
  }
};

/** Delete an entry from a note */
export const deleteNoteEntry = (noteId: string, entryId: string): void => {
  const note = MOCK_NOTES.find(n => n.id === noteId);
  if (!note || !note.entries) return;

  note.entries = note.entries.filter(e => e.id !== entryId);
  note.updatedAt = new Date().toISOString();
};

/** Add attachment to an entry */
export const addAttachmentToEntry = (
  noteId: string,
  entryId: string,
  type: 'image' | 'audio' | 'file',
  dataUrl: string,
  filename?: string,
  mimeType?: string
): NoteAttachment | null => {
  const note = MOCK_NOTES.find(n => n.id === noteId);
  if (!note || !note.entries) return null;

  const entry = note.entries.find(e => e.id === entryId);
  if (!entry) return null;

  const attachment: NoteAttachment = {
    id: `attach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    dataUrl,
    filename,
    mimeType,
    createdAt: new Date().toISOString(),
  };

  entry.attachments.push(attachment);
  note.updatedAt = new Date().toISOString();

  return attachment;
};

/** Delete attachment from an entry */
export const deleteAttachment = (noteId: string, entryId: string, attachmentId: string): void => {
  const note = MOCK_NOTES.find(n => n.id === noteId);
  if (!note || !note.entries) return;

  const entry = note.entries.find(e => e.id === entryId);
  if (!entry) return;

  entry.attachments = entry.attachments.filter(a => a.id !== attachmentId);
  note.updatedAt = new Date().toISOString();
};

// =============================================================================
// NOTE-LEVEL ATTACHMENT MANAGEMENT
// =============================================================================

/**
 * Infer attachment type from mimeType
 */
const inferAttachmentType = (mimeType: string): 'image' | 'audio' | 'file' => {
  if (mimeType.startsWith('image/')) return 'image';
  if (mimeType.startsWith('audio/')) return 'audio';
  // PDFs and all other files map to 'file'
  return 'file';
};

/**
 * Add attachment directly to a note (not to an entry)
 */
export const addAttachmentToNote = (
  noteId: string,
  file: File
): Promise<NoteAttachment | null> => {
  return new Promise((resolve) => {
    const note = MOCK_NOTES.find(n => n.id === noteId);
    if (!note) {
      resolve(null);
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const attachmentType = inferAttachmentType(file.type);

      const attachment: NoteAttachment = {
        id: `attach_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: attachmentType,
        dataUrl,
        filename: file.name,
        mimeType: file.type,
        createdAt: new Date().toISOString(),
      };

      if (!note.attachments) {
        note.attachments = [];
      }
      note.attachments.push(attachment);
      note.updatedAt = new Date().toISOString();

      resolve(attachment);
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
};

/**
 * Remove attachment from a note
 */
export const removeAttachmentFromNote = (noteId: string, attachmentId: string): boolean => {
  const note = MOCK_NOTES.find(n => n.id === noteId);
  if (!note || !note.attachments) return false;

  const initialLength = note.attachments.length;
  note.attachments = note.attachments.filter(a => a.id !== attachmentId);
  note.updatedAt = new Date().toISOString();

  return note.attachments.length < initialLength;
};

// =============================================================================
// AUDIO TRANSCRIPTION STUB
// =============================================================================

/**
 * Transcribe audio attachment (STUB for future integration)
 *
 * TODO: Replace with real transcription service integration
 * - For web: Use Web Speech API or external service (Deepgram, AssemblyAI, Whisper API)
 * - For mobile: Use native speech recognition APIs
 *
 * Current implementation: Returns mock transcription for development
 */
export const transcribeAudio = async (attachmentId: string): Promise<string> => {
  // STUB: Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));

  // STUB: Return mock transcription
  // In production, this would:
  // 1. Upload audio Data URL to transcription service
  // 2. Wait for processing
  // 3. Return transcribed text
  return `[Mock transcription] This is a placeholder transcription for audio attachment ${attachmentId.slice(0, 8)}. Replace this function with real transcription service integration.`;
};

/** Update attachment with transcription */
export const updateAttachmentTranscript = (
  noteId: string,
  entryId: string,
  attachmentId: string,
  transcript: string
): void => {
  const note = MOCK_NOTES.find(n => n.id === noteId);
  if (!note || !note.entries) return;

  const entry = note.entries.find(e => e.id === entryId);
  if (!entry) return;

  const attachment = entry.attachments.find(a => a.id === attachmentId);
  if (attachment) {
    attachment.transcript = transcript;
    note.updatedAt = new Date().toISOString();
  }
};

// =============================================================================
// ENHANCED SEARCH (including transcripts)
// =============================================================================

/**
 * Search notes by text, including entry text and audio transcripts
 */
export const searchNotesFullText = (query: string, contactId?: string): Note[] => {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  let notes = contactId ? getNotesByContactId(contactId) : getAllNotes();

  return notes.filter(note => {
    // Search in title
    if (note.title && note.title.toLowerCase().includes(normalizedQuery)) {
      return true;
    }

    // Search in legacy content
    if (note.content && note.content.toLowerCase().includes(normalizedQuery)) {
      return true;
    }

    // Search in entries
    if (note.entries) {
      for (const entry of note.entries) {
        // Search in entry text
        if (entry.text.toLowerCase().includes(normalizedQuery)) {
          return true;
        }

        // Search in attachment transcripts
        for (const attachment of entry.attachments) {
          if (attachment.transcript && attachment.transcript.toLowerCase().includes(normalizedQuery)) {
            return true;
          }
        }
      }
    }

    return false;
  });
};

/**
 * Voice search transcription stub
 *
 * TODO: Integrate with Web Speech API or external service
 * - For web: Use navigator.mediaDevices.getUserMedia() + MediaRecorder
 * - Send audio to same transcription service as note audio
 */
export const transcribeVoiceSearch = async (audioBlob: Blob): Promise<string> => {
  // STUB: Convert blob to Data URL (for consistency with note attachments)
  const dataUrl = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(audioBlob);
  });

  // STUB: Use same transcription stub as note audio
  // In production, both would use the same transcription service
  return await transcribeAudio(`voice_search_${Date.now()}`);
};
