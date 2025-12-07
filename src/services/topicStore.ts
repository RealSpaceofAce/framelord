// =============================================================================
// TOPIC STORE — In-memory data source for Hashtag Topics
// =============================================================================
// Topics are lightweight tags created via #hashtag syntax in notes.
// They link notes and contacts together for organization and discovery.
// =============================================================================

import { Topic, NoteTopic, Note } from '../types';
import { getNotesByContactId, getNotesByAuthorId, getAllNotes } from './noteStore';

// =============================================================================
// HELPER: Ensure topic has CRM linkage fields
// =============================================================================

const ensureTopicCRMFields = (topic: Partial<Topic>): Topic => ({
  ...topic,
  createdAt: topic.createdAt || new Date().toISOString(),
  updatedAt: topic.updatedAt || new Date().toISOString(),
  noteIds: topic.noteIds || [],
  contactIds: topic.contactIds || [],
} as Topic);

// --- IN-MEMORY STORES ---

let TOPICS: Topic[] = [
  // Sample topics with CRM linkage
  ensureTopicCRMFields({ id: 'topic-sales', label: 'Sales', slug: 'sales' }),
  ensureTopicCRMFields({ id: 'topic-marketing', label: 'Marketing', slug: 'marketing' }),
  ensureTopicCRMFields({ id: 'topic-engineering', label: 'Engineering', slug: 'engineering' }),
  ensureTopicCRMFields({ id: 'topic-product', label: 'Product', slug: 'product' }),
  ensureTopicCRMFields({ id: 'topic-ideas', label: 'Ideas', slug: 'ideas' }),
];
let NOTE_TOPICS: NoteTopic[] = [];

// --- HELPER: Normalize slug ---

const normalizeSlug = (label: string): string => {
  return label
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')      // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove special characters
    .replace(/-+/g, '-');       // Collapse multiple hyphens
};

// --- HELPER: Generate topic ID ---

const generateTopicId = (): string => {
  return `topic-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
};

// --- EXPORTS ---

/**
 * Get or create a topic by label.
 * If a topic with the normalized slug exists, return it.
 * Otherwise, create a new topic.
 */
export const getOrCreateTopic = (label: string): Topic => {
  const trimmedLabel = label.trim();
  if (!trimmedLabel) {
    throw new Error('Topic label cannot be empty');
  }

  const slug = normalizeSlug(trimmedLabel);
  
  // Check if topic already exists
  const existing = TOPICS.find(t => t.slug === slug);
  if (existing) {
    return existing;
  }

  // Create new topic with CRM fields
  const now = new Date().toISOString();
  const newTopic: Topic = {
    id: generateTopicId(),
    label: trimmedLabel,
    slug,
    createdAt: now,
    updatedAt: now,
    noteIds: [],
    contactIds: [],
  };

  TOPICS.push(newTopic);
  return newTopic;
};

/**
 * Link a note to a topic.
 * Ensures no duplicate entries.
 */
export const linkNoteToTopic = (noteId: string, topic: Topic): void => {
  const exists = NOTE_TOPICS.some(
    nt => nt.noteId === noteId && nt.topicId === topic.id
  );

  if (!exists) {
    NOTE_TOPICS.push({ noteId, topicId: topic.id });
  }
};

/**
 * Get all topics linked to a specific note.
 */
export const getTopicsForNote = (noteId: string): Topic[] => {
  const topicIds = NOTE_TOPICS
    .filter(nt => nt.noteId === noteId)
    .map(nt => nt.topicId);

  return TOPICS.filter(t => topicIds.includes(t.id));
};

/**
 * Get all topics for notes ABOUT a specific contact.
 * Gathers topics from all notes where note.contactId === contactId.
 */
export const getTopicsForContact = (contactId: string): Topic[] => {
  const notes = getNotesByContactId(contactId);
  const noteIds = notes.map(n => n.id);

  const topicIds = new Set<string>();
  NOTE_TOPICS
    .filter(nt => noteIds.includes(nt.noteId))
    .forEach(nt => topicIds.add(nt.topicId));

  return TOPICS.filter(t => topicIds.has(t.id));
};

/**
 * Get all topics for notes written BY a specific author.
 * Gathers topics from all notes where note.authorContactId === authorContactId.
 */
export const getTopicsForAuthor = (authorContactId: string): Topic[] => {
  const notes = getNotesByAuthorId(authorContactId);
  const noteIds = notes.map(n => n.id);

  const topicIds = new Set<string>();
  NOTE_TOPICS
    .filter(nt => noteIds.includes(nt.noteId))
    .forEach(nt => topicIds.add(nt.topicId));

  return TOPICS.filter(t => topicIds.has(t.id));
};

/**
 * Get all notes linked to a specific topic.
 */
export const getNotesForTopic = (topicId: string): Note[] => {
  const noteIds = NOTE_TOPICS
    .filter(nt => nt.topicId === topicId)
    .map(nt => nt.noteId);

  // Get all notes and filter by matching IDs
  const allNotes = getAllNotes();
  return allNotes
    .filter(n => noteIds.includes(n.id))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

/**
 * Get a topic by its ID.
 */
export const getTopicById = (topicId: string): Topic | undefined => {
  return TOPICS.find(t => t.id === topicId);
};

/**
 * Get a topic by its slug.
 */
export const getTopicBySlug = (slug: string): Topic | undefined => {
  return TOPICS.find(t => t.slug === slug);
};

/**
 * Get all topics.
 */
export const getAllTopics = (): Topic[] => {
  return [...TOPICS].sort((a, b) => a.label.localeCompare(b.label));
};

/**
 * Get count of notes for a topic.
 */
export const getNoteCountForTopic = (topicId: string): number => {
  return NOTE_TOPICS.filter(nt => nt.topicId === topicId).length;
};

/**
 * Get unique contacts for a topic (from notes about those contacts).
 */
export const getContactIdsForTopic = (topicId: string): string[] => {
  const topic = getTopicById(topicId);
  if (topic?.contactIds?.length) {
    return [...topic.contactIds];
  }
  // Fallback to legacy method
  const notes = getNotesForTopic(topicId);
  const contactIds = new Set<string>();
  notes.forEach(n => {
    if (n.contactId) contactIds.add(n.contactId);
  });
  return Array.from(contactIds);
};

// =============================================================================
// HASHTAG SEARCH FUNCTIONS
// =============================================================================

/**
 * Search topics by label (for # autocomplete).
 * @param query - Search query
 * @param limit - Maximum results
 */
export const searchTopicsByLabel = (query: string, limit = 8): Topic[] => {
  if (!query || query.trim().length === 0) return [];

  const q = query.toLowerCase().trim();

  let results = TOPICS.filter(t =>
    t.label.toLowerCase().includes(q)
  );

  // Sort by relevance: starts with query first
  results.sort((a, b) => {
    const aStarts = a.label.toLowerCase().startsWith(q) ? 0 : 1;
    const bStarts = b.label.toLowerCase().startsWith(q) ? 0 : 1;
    return aStarts - bStarts;
  });

  return results.slice(0, limit);
};

/**
 * Find a topic by exact label match (case-insensitive).
 */
export const findTopicByLabel = (label: string): Topic | undefined => {
  const normalizedLabel = label.trim().toLowerCase();
  return TOPICS.find(t => t.label.toLowerCase() === normalizedLabel);
};

/**
 * Create a topic from a hashtag if it doesn't exist.
 * @param label - The hashtag label (without #)
 * @returns The topic (existing or new)
 */
export const createTopicFromHashtag = (label: string): Topic => {
  const existing = findTopicByLabel(label);
  if (existing) return existing;

  const topic = getOrCreateTopic(label);
  return ensureTopicCRMFields(topic);
};

// =============================================================================
// CRM LINKAGE SYNC FUNCTIONS
// =============================================================================

/**
 * Add a note to a topic's noteIds.
 * @param topicId - The topic
 * @param noteId - The note to add
 */
export const addNoteToTopic = (topicId: string, noteId: string): void => {
  const topic = getTopicById(topicId);
  if (!topic) return;

  if (!topic.noteIds) topic.noteIds = [];
  if (!topic.noteIds.includes(noteId)) {
    topic.noteIds.push(noteId);
    topic.updatedAt = new Date().toISOString();
  }
};

/**
 * Remove a note from a topic's noteIds.
 * @param topicId - The topic
 * @param noteId - The note to remove
 */
export const removeNoteFromTopic = (topicId: string, noteId: string): void => {
  const topic = getTopicById(topicId);
  if (!topic || !topic.noteIds) return;

  topic.noteIds = topic.noteIds.filter(id => id !== noteId);
  topic.updatedAt = new Date().toISOString();
};

/**
 * Add a contact to a topic's contactIds.
 * @param topicId - The topic
 * @param contactId - The contact to add
 */
export const addContactToTopic = (topicId: string, contactId: string): void => {
  const topic = getTopicById(topicId);
  if (!topic) return;

  if (!topic.contactIds) topic.contactIds = [];
  if (!topic.contactIds.includes(contactId)) {
    topic.contactIds.push(contactId);
    topic.updatedAt = new Date().toISOString();
  }
};

/**
 * Sync topic-contact relationships based on note mentions.
 * @param topicId - The topic to sync
 * @param contactIds - All contact IDs mentioned in notes with this topic
 */
export const syncTopicContacts = (topicId: string, contactIds: string[]): void => {
  const topic = getTopicById(topicId);
  if (!topic) return;

  topic.contactIds = [...new Set(contactIds)];
  topic.updatedAt = new Date().toISOString();
};








