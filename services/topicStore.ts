// =============================================================================
// TOPIC STORE — In-memory data source for Topics (Obsidian-style [[Topic]] links)
// =============================================================================
// Topics are first-class objects tied to notes, contacts, and Contact Zero.
// Notes link to topics via NOTE_TOPICS join table.
// =============================================================================

import { Topic, NoteTopic, Note } from '../types';
import { getNotesByContactId, getNotesByAuthorId, getAllNotes } from './noteStore';

// --- IN-MEMORY STORES ---

let TOPICS: Topic[] = [];
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

  // Create new topic
  const newTopic: Topic = {
    id: generateTopicId(),
    label: trimmedLabel,
    slug,
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
  const notes = getNotesForTopic(topicId);
  const contactIds = new Set<string>();
  notes.forEach(n => contactIds.add(n.contactId));
  return Array.from(contactIds);
};







