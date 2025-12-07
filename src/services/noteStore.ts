// =============================================================================
// NOTE STORE — In-memory data source for Notes
// =============================================================================
// INVARIANT: Every Note has an authorContactId (who wrote it) - always CONTACT_ZERO.
// Supports [[Topic]] syntax for Obsidian-style topic links.
// Adds Obsidian-style note-to-note backlinks via [[Note Title]].
// NEW: Unified Note model with BlockSuite document support and PARA organization.
// =============================================================================

import { Note, NoteLink, NoteKind, NoteViewMode } from '../types';
import { CONTACT_ZERO } from './contactStore';
import { getOrCreateTopic, linkNoteToTopic } from './topicStore';

// =============================================================================
// MIGRATION HELPERS
// =============================================================================

/**
 * Check if a note is using the legacy schema (pre-BlockSuite)
 * Legacy notes have content but no blocksuiteDocId
 */
export const isLegacyNote = (note: Note): boolean => {
  return !!note.content && !note.blocksuiteDocId;
};

/**
 * Check if a note has the new unified schema
 */
export const isUnifiedNote = (note: Note): boolean => {
  return note.kind !== undefined && note.targetContactIds !== undefined;
};

/**
 * Migrate a legacy note to the new unified schema
 * This is called lazily when a note is opened
 */
export const migrateLegacyNote = (note: Note): Note => {
  // If already migrated, return as-is
  if (isUnifiedNote(note)) return note;

  const now = new Date().toISOString();

  // Build targetContactIds from legacy fields
  const targetContactIds: string[] = [];
  if (note.contactId && note.contactId !== CONTACT_ZERO.id) {
    targetContactIds.push(note.contactId);
  }
  if (note.targetContactId && !targetContactIds.includes(note.targetContactId)) {
    targetContactIds.push(note.targetContactId);
  }
  if (note.mentionedContactIds) {
    for (const id of note.mentionedContactIds) {
      if (!targetContactIds.includes(id)) {
        targetContactIds.push(id);
      }
    }
  }

  // Migrate to new schema while preserving legacy fields
  return {
    ...note,
    // New required fields
    title: note.title || null,
    updatedAt: note.updatedAt || now,
    targetContactIds,
    kind: 'note' as NoteKind,
    dateKey: null,
    folderId: null,
    isInbox: false,
    topics: [],
    tags: note.tags || [],
    preferredView: 'doc' as NoteViewMode,
    isPinnedHome: false,
    isPinned: note.isPinned || false,
    isArchived: false,
    // Keep legacy fields for backward compatibility
    content: note.content,
    entries: note.entries,
    attachments: note.attachments,
    contactId: note.contactId,
    targetContactId: note.targetContactId,
    mentionedContactIds: note.mentionedContactIds,
  };
};

/**
 * Ensure a note has the unified schema
 * Updates the note in place if migration is needed
 */
export const ensureUnifiedNote = (note: Note): Note => {
  if (isUnifiedNote(note)) return note;

  const migrated = migrateLegacyNote(note);
  // Update in MOCK_NOTES array
  const index = MOCK_NOTES.findIndex(n => n.id === note.id);
  if (index !== -1) {
    MOCK_NOTES[index] = migrated;
  }
  return migrated;
};

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
  // Get content from legacy field or empty string
  const content = note.content || '';
  if (!content) return;

  const topicLabels = extractTopicLabelsFromContent(content);

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
  _authorContactId: string
): Note => {
  const existing = getNoteByTitle(label);
  if (existing) return existing;

  const now = new Date().toISOString();

  // Build targetContactIds from context
  const targetContactIds: string[] = contextContactId && contextContactId !== CONTACT_ZERO.id
    ? [contextContactId]
    : [];

  // Create a lightweight note with the unified schema
  // NOTE: We don't call createNote here to avoid circular calls
  // (ensureNoteForLink <- processNoteLinks <- createNote)
  const newNote: Note = {
    // Core identification
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: label.trim(),

    // BlockSuite document (will be set when editor initializes)
    blocksuiteDocId: undefined,
    blocksuiteSerialized: undefined,

    // Timestamps
    createdAt: now,
    updatedAt: now,

    // Authorship
    authorContactId: CONTACT_ZERO.id,

    // Contact associations
    targetContactIds,

    // Note classification
    kind: 'note',
    dateKey: null,

    // Organization
    folderId: null,
    isInbox: false,
    topics: [],
    tags: [],

    // Display preferences
    preferredView: 'doc',
    isPinnedHome: false,
    isPinned: false,

    // Archive
    isArchived: false,

    // Sync tracking
    sync_version: 1,
    last_synced_at: undefined,

    // Legacy fields
    content: '',
    entries: [],
    attachments: [],
    contactId: targetContactIds[0] || CONTACT_ZERO.id,
  };

  MOCK_NOTES = [newNote, ...MOCK_NOTES];
  return newNote;
};

const processNoteLinks = (note: Note): void => {
  // Remove existing outgoing links for this note
  NOTE_LINKS = NOTE_LINKS.filter(link => link.sourceNoteId !== note.id);

  // Get content from legacy field or empty string
  const content = note.content || '';
  if (!content) return;

  const linkLabels = extractNoteLinkLabelsFromContent(content);
  for (const label of linkLabels) {
    // Use first targetContactId or legacy contactId or empty string
    const contextContactId = note.targetContactIds?.[0] || note.contactId || '';
    const targetNote = ensureNoteForLink(label, contextContactId, note.authorContactId);
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
 * Create a new note with the unified schema
 * Automatically parses [[Topic]] syntax, note [[links]], and creates graph links.
 * INVARIANT: authorContactId is always CONTACT_ZERO.id
 *
 * @param params.title - Optional title (null for untitled)
 * @param params.content - Optional legacy content (for backward compatibility)
 * @param params.kind - Note type: 'log' | 'note' | 'system' (default: 'note')
 * @param params.dateKey - YYYY-MM-DD for log entries (required if kind='log')
 * @param params.folderId - PARA folder ID or custom folder
 * @param params.isInbox - Quick capture inbox (default: false)
 * @param params.preferredView - 'doc' | 'canvas' (default: 'doc')
 * @param params.targetContactIds - Contacts associated with this note
 * @param params.tags - Optional tags
 *
 * Legacy params (for backward compatibility):
 * @param params.contactId - Who the note is ABOUT (maps to targetContactIds)
 * @param params.targetContactId - Explicit target contact (maps to targetContactIds)
 * @param params.mentionedContactIds - Mentioned contacts (maps to targetContactIds)
 */
export const createNote = (params: {
  // New unified schema params
  title?: string | null;
  content?: string;
  kind?: NoteKind;
  dateKey?: string | null;
  folderId?: string | null;
  isInbox?: boolean;
  preferredView?: NoteViewMode;
  targetContactIds?: string[];
  tags?: string[];
  // Legacy params (backward compatibility)
  contactId?: string;
  authorContactId?: string;
  targetContactId?: string;
  mentionedContactIds?: string[];
}): Note => {
  const now = new Date().toISOString();

  // Build targetContactIds from both new and legacy params
  const targetContactIds: string[] = params.targetContactIds ? [...params.targetContactIds] : [];

  // Add from legacy contactId
  if (params.contactId && params.contactId !== CONTACT_ZERO.id && !targetContactIds.includes(params.contactId)) {
    targetContactIds.push(params.contactId);
  }
  // Add from legacy targetContactId
  if (params.targetContactId && !targetContactIds.includes(params.targetContactId)) {
    targetContactIds.push(params.targetContactId);
  }
  // Add from legacy mentionedContactIds
  if (params.mentionedContactIds) {
    for (const id of params.mentionedContactIds) {
      if (!targetContactIds.includes(id)) {
        targetContactIds.push(id);
      }
    }
  }

  // Derive title from content if not provided
  const title = params.title !== undefined
    ? params.title
    : (params.content ? deriveTitleFromContent(params.content) : null);

  const newNote: Note = {
    // Core identification
    id: generateNoteId(),
    title,

    // BlockSuite document (will be set when editor initializes)
    blocksuiteDocId: undefined,
    blocksuiteSerialized: undefined,

    // Timestamps
    createdAt: now,
    updatedAt: now,

    // Authorship
    authorContactId: CONTACT_ZERO.id,

    // Contact associations
    targetContactIds,

    // Note classification
    kind: params.kind || 'note',
    dateKey: params.dateKey ?? null,

    // Organization - default to inbox folder
    folderId: params.folderId ?? 'inbox',
    isInbox: params.isInbox ?? false,
    topics: [],
    tags: params.tags || [],

    // Display preferences
    preferredView: params.preferredView || 'doc',
    isPinnedHome: false,
    isPinned: false,

    // Archive
    isArchived: false,

    // Sync tracking
    sync_version: 1,
    last_synced_at: undefined,

    // Legacy fields (for backward compatibility)
    content: params.content || '',
    entries: [],
    attachments: [],
    contactId: params.contactId || targetContactIds[0] || CONTACT_ZERO.id,
    targetContactId: params.targetContactId,
    mentionedContactIds: params.mentionedContactIds ? [...params.mentionedContactIds] : undefined,
  };

  MOCK_NOTES = [newNote, ...MOCK_NOTES];

  // Process [[Topic]] links from legacy content
  if (newNote.content) {
    processNoteTopics(newNote);
    processNoteLinks(newNote);
  }

  return newNote;
};

/**
 * Update an existing note
 * Supports both legacy and new unified schema fields
 */
export const updateNote = (
  noteId: string,
  updates: Partial<Pick<Note,
    // New unified schema fields
    | 'title'
    | 'preferredView'
    | 'kind'
    | 'dateKey'
    | 'folderId'
    | 'isInbox'
    | 'isArchived'
    | 'isPinned'
    | 'isPinnedHome'
    | 'targetContactIds'
    | 'topics'
    | 'tags'
    | 'blocksuiteDocId'
    | 'blocksuiteSerialized'
    // Legacy fields
    | 'content'
    | 'targetContactId'
    | 'mentionedContactIds'
  >>
): Note | null => {
  const index = MOCK_NOTES.findIndex(n => n.id === noteId);
  if (index === -1) return null;

  const currentNote = MOCK_NOTES[index];
  MOCK_NOTES[index] = {
    ...currentNote,
    ...updates,
    // Ensure arrays are new arrays if provided
    targetContactIds: updates.targetContactIds !== undefined
      ? [...updates.targetContactIds]
      : currentNote.targetContactIds,
    topics: updates.topics !== undefined
      ? [...updates.topics]
      : currentNote.topics,
    tags: updates.tags !== undefined
      ? [...updates.tags]
      : currentNote.tags,
    // Legacy field handling
    mentionedContactIds: updates.mentionedContactIds !== undefined
      ? [...updates.mentionedContactIds]
      : currentNote.mentionedContactIds,
    // Update sync tracking
    sync_version: (currentNote.sync_version || 0) + 1,
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

// =============================================================================
// NEW UNIFIED NOTE QUERIES
// =============================================================================

/**
 * Get log entries for a specific date (YYYY-MM-DD)
 * Returns notes with kind='log' and matching dateKey
 */
export const getLogEntriesByDate = (dateKey: string): Note[] => {
  return MOCK_NOTES
    .filter(note => note.kind === 'log' && note.dateKey === dateKey && !note.isArchived)
    .map(ensureUnifiedNote)
    .sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
};

/**
 * Get all log entries (daily journal notes)
 * Sorted by dateKey descending
 */
export const getAllLogEntries = (): Note[] => {
  return MOCK_NOTES
    .filter(note => note.kind === 'log' && !note.isArchived)
    .map(ensureUnifiedNote)
    .sort((a, b) => {
      // Sort by dateKey if available, otherwise by createdAt
      const dateA = a.dateKey || a.createdAt.split('T')[0];
      const dateB = b.dateKey || b.createdAt.split('T')[0];
      return dateB.localeCompare(dateA);
    });
};

/**
 * Get inbox notes (quick capture notes not yet filed)
 * Returns notes with isInbox=true and not archived
 */
export const getInboxNotes = (): Note[] => {
  return MOCK_NOTES
    .filter(note => note.isInbox === true && !note.isArchived)
    .map(ensureUnifiedNote)
    .sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
};

/**
 * Get notes by folder ID
 * Returns notes assigned to a specific PARA folder or custom folder
 */
export const getNotesByFolder = (folderId: string): Note[] => {
  return MOCK_NOTES
    .filter(note => note.folderId === folderId && !note.isArchived)
    .map(ensureUnifiedNote)
    .sort((a, b) =>
      new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );
};

/**
 * Get archived notes
 */
export const getArchivedNotes = (): Note[] => {
  return MOCK_NOTES
    .filter(note => note.isArchived === true)
    .map(ensureUnifiedNote)
    .sort((a, b) =>
      new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );
};

/**
 * Get notes for a specific contact (notes that mention this contact)
 * Looks at targetContactIds array
 */
export const getNotesForContact = (contactId: string): Note[] => {
  return MOCK_NOTES
    .filter(note => {
      // Check new targetContactIds array
      if (note.targetContactIds?.includes(contactId)) return true;
      // Fallback to legacy fields
      if (note.contactId === contactId) return true;
      if (note.targetContactId === contactId) return true;
      if (note.mentionedContactIds?.includes(contactId)) return true;
      return false;
    })
    .filter(note => !note.isArchived)
    .map(ensureUnifiedNote)
    .sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
};

/**
 * File a note to a folder (move from inbox or change folder)
 */
export const fileNoteToFolder = (noteId: string, folderId: string | null): Note | null => {
  return updateNote(noteId, {
    folderId,
    isInbox: false, // Remove from inbox when filing
  });
};

/**
 * Archive a note
 */
export const archiveNote = (noteId: string): Note | null => {
  return updateNote(noteId, { isArchived: true });
};

/**
 * Unarchive a note
 */
export const unarchiveNote = (noteId: string): Note | null => {
  return updateNote(noteId, { isArchived: false });
};

/**
 * Create a log entry for a specific date
 * Convenience function for daily journal entries
 */
export const createLogEntry = (dateKey: string, content?: string): Note => {
  return createNote({
    kind: 'log',
    dateKey,
    content: content || '',
    preferredView: 'doc',
    isInbox: false,
  });
};

/**
 * Create an inbox note (quick capture)
 */
export const createInboxNote = (content?: string): Note => {
  return createNote({
    kind: 'note',
    content: content || '',
    preferredView: 'doc',
    isInbox: true,
  });
};

/**
 * Get today's date key (YYYY-MM-DD)
 */
export const getTodayDateKey = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Get or create today's log entry
 * Returns existing log for today or creates a new one
 */
export const getOrCreateTodayLog = (): Note => {
  const today = getTodayDateKey();
  const existingLogs = getLogEntriesByDate(today);

  if (existingLogs.length > 0) {
    return existingLogs[0];
  }

  return createLogEntry(today);
};

/**
 * Get or create journal for a specific date
 * Returns existing journal for the date or creates a new one
 */
export const getOrCreateJournalForDate = (date: Date): Note => {
  const dateKey = date.toISOString().split('T')[0];
  const existingLogs = getLogEntriesByDate(dateKey);

  if (existingLogs.length > 0) {
    return existingLogs[0];
  }

  // Create new journal with formatted title
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return createNote({
    kind: 'log',
    dateKey,
    title: formattedDate,
    content: '',
    preferredView: 'doc',
    isInbox: false,
    folderId: 'inbox',
  });
};

/**
 * Get all dates that have journal entries
 * Returns array of date keys (YYYY-MM-DD) for dates with journals
 */
export const getJournalDates = (): string[] => {
  const journals = getAllLogEntries();
  const dateKeys = journals
    .map(note => note.dateKey)
    .filter((dateKey): dateKey is string => dateKey !== null);

  // Return unique date keys
  return Array.from(new Set(dateKeys)).sort();
};

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * Create multiple notes at once
 * Returns array of created notes
 */
export const bulkCreateNotes = (
  notesData: Array<Parameters<typeof createNote>[0]>
): Note[] => {
  const createdNotes: Note[] = [];

  for (const noteData of notesData) {
    const note = createNote(noteData);
    createdNotes.push(note);
  }

  return createdNotes;
};

/**
 * Update multiple notes at once
 * Returns array of updated notes (null for notes that don't exist)
 */
export const bulkUpdateNotes = (
  updates: Array<{ noteId: string; updates: Parameters<typeof updateNote>[1] }>
): Array<Note | null> => {
  const updatedNotes: Array<Note | null> = [];

  for (const { noteId, updates: noteUpdates } of updates) {
    const updated = updateNote(noteId, noteUpdates);
    updatedNotes.push(updated);
  }

  return updatedNotes;
};

/**
 * Delete multiple notes at once
 * Returns array of booleans indicating success for each deletion
 */
export const bulkDeleteNotes = (noteIds: string[]): boolean[] => {
  const results: boolean[] = [];

  for (const noteId of noteIds) {
    const result = deleteNote(noteId);
    results.push(result);
  }

  return results;
};

// =============================================================================
// EXPORT/IMPORT
// =============================================================================

/**
 * Export notes to JSON format
 * Optionally filter by note IDs
 */
export const exportNotesToJSON = (noteIds?: string[]): string => {
  let notesToExport: Note[];

  if (noteIds && noteIds.length > 0) {
    notesToExport = MOCK_NOTES.filter(note => noteIds.includes(note.id));
  } else {
    notesToExport = [...MOCK_NOTES];
  }

  const exportData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    noteCount: notesToExport.length,
    notes: notesToExport,
  };

  return JSON.stringify(exportData, null, 2);
};

/**
 * Import notes from JSON format
 * Options:
 * - overwrite: Replace existing notes with matching IDs (default: false)
 * - generateNewIds: Generate new IDs for all imported notes (default: false)
 * Returns array of imported notes
 */
export const importNotesFromJSON = (
  jsonString: string,
  options: { overwrite?: boolean; generateNewIds?: boolean } = {}
): Note[] => {
  const { overwrite = false, generateNewIds = false } = options;

  let importData: any;
  try {
    importData = JSON.parse(jsonString);
  } catch (error) {
    throw new Error('Invalid JSON format');
  }

  if (!importData.notes || !Array.isArray(importData.notes)) {
    throw new Error('Invalid export format: missing notes array');
  }

  const importedNotes: Note[] = [];
  const now = new Date().toISOString();

  for (const noteData of importData.notes) {
    let note: Note = { ...noteData };

    // Generate new ID if requested
    if (generateNewIds) {
      note.id = generateNoteId();
      note.createdAt = now;
      note.updatedAt = now;
      note.sync_version = 1;
      note.last_synced_at = undefined;
    }

    // Check if note already exists
    const existingIndex = MOCK_NOTES.findIndex(n => n.id === note.id);

    if (existingIndex !== -1) {
      if (overwrite) {
        // Replace existing note
        MOCK_NOTES[existingIndex] = note;
        importedNotes.push(note);
      }
      // If not overwriting, skip this note
    } else {
      // Add new note
      MOCK_NOTES = [note, ...MOCK_NOTES];
      importedNotes.push(note);
    }
  }

  // Reinitialize metadata for imported notes
  for (const note of importedNotes) {
    if (note.content) {
      processNoteTopics(note);
      processNoteLinks(note);
    }
  }

  return importedNotes;
};
