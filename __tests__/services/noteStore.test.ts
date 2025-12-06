// =============================================================================
// NOTE STORE TESTS
// =============================================================================
// Comprehensive test suite for noteStore.ts
// Tests core CRUD operations, search, journal entries, folders, and bulk operations
// =============================================================================

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  createNote,
  getNoteById,
  updateNote,
  deleteNote,
  getAllNotes,
  searchNotesFullText,
  getRecentNotes,
  createLogEntry,
  getLogEntriesByDate,
  getOrCreateJournalForDate,
  bulkCreateNotes,
  bulkUpdateNotes,
  bulkDeleteNotes,
  exportNotesToJSON,
  importNotesFromJSON,
  getNotesByFolder,
} from '../../services/noteStore';
import { Note } from '../../types';

// Mock CONTACT_ZERO
vi.mock('../../services/contactStore', () => ({
  CONTACT_ZERO: {
    id: 'contact_zero',
    fullName: 'Test User',
    relationshipDomain: 'personal',
    relationshipRole: 'self',
    status: 'active',
    frame: {
      currentScore: 100,
      trend: 'flat',
      lastScanAt: null,
    },
    tags: [],
  },
}));

// Mock topicStore to avoid circular dependencies
vi.mock('../../services/topicStore', () => ({
  getOrCreateTopic: vi.fn((label: string) => ({
    id: `topic-${label.toLowerCase()}`,
    label,
    slug: label.toLowerCase(),
  })),
  linkNoteToTopic: vi.fn(),
}));

describe('noteStore - Core CRUD Operations', () => {
  beforeEach(() => {
    // Reset the store by clearing all notes
    const allNotes = getAllNotes();
    allNotes.forEach(note => deleteNote(note.id));
  });

  describe('createNote', () => {
    it('should create a note with default values', () => {
      const note = createNote({
        content: 'Test note content',
      });

      expect(note).toBeDefined();
      expect(note.id).toBeDefined();
      expect(note.content).toBe('Test note content');
      expect(note.authorContactId).toBe('contact_zero');
      expect(note.kind).toBe('note');
      expect(note.isInbox).toBe(false);
      expect(note.isArchived).toBe(false);
      expect(note.sync_version).toBe(1);
      expect(note.last_synced_at).toBeUndefined();
    });

    it('should create a note with custom title', () => {
      const note = createNote({
        title: 'Custom Title',
        content: 'Test content',
      });

      expect(note.title).toBe('Custom Title');
    });

    it('should create a note with tags', () => {
      const note = createNote({
        content: 'Test content',
        tags: ['important', 'work'],
      });

      expect(note.tags).toEqual(['important', 'work']);
    });

    it('should create a note with target contacts', () => {
      const note = createNote({
        content: 'Test content',
        targetContactIds: ['contact1', 'contact2'],
      });

      expect(note.targetContactIds).toEqual(['contact1', 'contact2']);
    });

    it('should set default folderId to inbox', () => {
      const note = createNote({
        content: 'Test content',
      });

      expect(note.folderId).toBe('inbox');
    });

    it('should create a note with custom folder', () => {
      const note = createNote({
        content: 'Test content',
        folderId: 'projects',
      });

      expect(note.folderId).toBe('projects');
    });
  });

  describe('getNoteById (getNote)', () => {
    it('should retrieve a note by ID', () => {
      const created = createNote({
        content: 'Find me',
      });

      const found = getNoteById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.content).toBe('Find me');
    });

    it('should return undefined for non-existent note', () => {
      const found = getNoteById('non-existent-id');
      expect(found).toBeUndefined();
    });
  });

  describe('updateNote', () => {
    it('should update note content', () => {
      const created = createNote({
        content: 'Original content',
      });

      const updated = updateNote(created.id, {
        content: 'Updated content',
      });

      expect(updated).toBeDefined();
      expect(updated?.content).toBe('Updated content');
    });

    it('should increment sync_version on update', () => {
      const created = createNote({
        content: 'Original',
      });

      const initialVersion = created.sync_version;

      const updated = updateNote(created.id, {
        content: 'Updated',
      });

      expect(updated?.sync_version).toBe(initialVersion + 1);
    });

    it('should update title', () => {
      const created = createNote({
        title: 'Original Title',
        content: 'Content',
      });

      const updated = updateNote(created.id, {
        title: 'New Title',
      });

      expect(updated?.title).toBe('New Title');
    });

    it('should update tags', () => {
      const created = createNote({
        content: 'Content',
        tags: ['old'],
      });

      const updated = updateNote(created.id, {
        tags: ['new', 'updated'],
      });

      expect(updated?.tags).toEqual(['new', 'updated']);
    });

    it('should update folder', () => {
      const created = createNote({
        content: 'Content',
        folderId: 'inbox',
      });

      const updated = updateNote(created.id, {
        folderId: 'projects',
      });

      expect(updated?.folderId).toBe('projects');
    });

    it('should update archived status', () => {
      const created = createNote({
        content: 'Content',
      });

      const updated = updateNote(created.id, {
        isArchived: true,
      });

      expect(updated?.isArchived).toBe(true);
    });

    it('should return null for non-existent note', () => {
      const updated = updateNote('non-existent-id', {
        content: 'New content',
      });

      expect(updated).toBeNull();
    });

    it('should update updatedAt timestamp', async () => {
      const created = createNote({
        content: 'Content',
      });

      const originalUpdatedAt = created.updatedAt;

      // Wait a bit to ensure timestamp is different
      await new Promise(resolve => setTimeout(resolve, 10));

      const updated = updateNote(created.id, {
        content: 'Updated',
      });

      expect(updated?.updatedAt).not.toBe(originalUpdatedAt);
    });
  });

  describe('deleteNote', () => {
    it('should delete a note', () => {
      const created = createNote({
        content: 'To be deleted',
      });

      const result = deleteNote(created.id);

      expect(result).toBe(true);

      const found = getNoteById(created.id);
      expect(found).toBeUndefined();
    });

    it('should return false when deleting non-existent note', () => {
      const result = deleteNote('non-existent-id');
      expect(result).toBe(false);
    });
  });
});

describe('noteStore - Search and Retrieval', () => {
  beforeEach(() => {
    const allNotes = getAllNotes();
    allNotes.forEach(note => deleteNote(note.id));
  });

  describe('searchNotesFullText (searchNotes)', () => {
    it('should find notes by content', () => {
      createNote({
        content: 'This contains the word UNIQUE',
      });

      createNote({
        content: 'This is different',
      });

      const results = searchNotesFullText('UNIQUE');

      expect(results.length).toBe(1);
      expect(results[0].content).toContain('UNIQUE');
    });

    it('should find notes by title', () => {
      createNote({
        title: 'FINDME',
        content: 'Content',
      });

      createNote({
        title: 'Other',
        content: 'Content',
      });

      const results = searchNotesFullText('FINDME');

      expect(results.length).toBe(1);
      expect(results[0].title).toBe('FINDME');
    });

    it('should be case-insensitive', () => {
      createNote({
        content: 'Test CONTENT',
      });

      const results = searchNotesFullText('test content');

      expect(results.length).toBe(1);
    });

    it('should return empty array for no matches', () => {
      createNote({
        content: 'Something',
      });

      const results = searchNotesFullText('nonexistent');

      expect(results.length).toBe(0);
    });
  });

  describe('getAllNotes (getRecentNotes)', () => {
    it('should return all notes sorted by creation date', () => {
      const note1 = createNote({ content: 'First' });
      const note2 = createNote({ content: 'Second' });
      const note3 = createNote({ content: 'Third' });

      const all = getAllNotes();

      expect(all.length).toBe(3);
      // Most recent first
      expect(all[0].id).toBe(note3.id);
      expect(all[1].id).toBe(note2.id);
      expect(all[2].id).toBe(note1.id);
    });

    it('should return empty array when no notes exist', () => {
      const all = getAllNotes();
      expect(all).toEqual([]);
    });
  });

  describe('getNotesByFolder', () => {
    it('should return notes in specific folder', () => {
      createNote({
        content: 'In inbox',
        folderId: 'inbox',
      });

      createNote({
        content: 'In projects',
        folderId: 'projects',
      });

      createNote({
        content: 'Also in projects',
        folderId: 'projects',
      });

      const projectNotes = getNotesByFolder('projects');

      expect(projectNotes.length).toBe(2);
      projectNotes.forEach(note => {
        expect(note.folderId).toBe('projects');
      });
    });

    it('should not return archived notes', () => {
      const note = createNote({
        content: 'In projects',
        folderId: 'projects',
      });

      updateNote(note.id, { isArchived: true });

      const projectNotes = getNotesByFolder('projects');

      expect(projectNotes.length).toBe(0);
    });
  });
});

describe('noteStore - Journal Entries', () => {
  beforeEach(() => {
    const allNotes = getAllNotes();
    allNotes.forEach(note => deleteNote(note.id));
  });

  describe('createLogEntry (createJournalEntry)', () => {
    it('should create a log entry for a specific date', () => {
      const dateKey = '2024-01-15';
      const entry = createLogEntry(dateKey, 'Journal content');

      expect(entry.kind).toBe('log');
      expect(entry.dateKey).toBe(dateKey);
      expect(entry.content).toBe('Journal content');
      expect(entry.isInbox).toBe(false);
    });

    it('should create a log entry with empty content', () => {
      const dateKey = '2024-01-15';
      const entry = createLogEntry(dateKey);

      expect(entry.kind).toBe('log');
      expect(entry.dateKey).toBe(dateKey);
      expect(entry.content).toBe('');
    });
  });

  describe('getLogEntriesByDate (getJournalEntry)', () => {
    it('should retrieve log entries for a specific date', () => {
      const dateKey = '2024-01-15';

      createLogEntry(dateKey, 'First entry');
      createLogEntry(dateKey, 'Second entry');
      createLogEntry('2024-01-16', 'Different day');

      const entries = getLogEntriesByDate(dateKey);

      expect(entries.length).toBe(2);
      entries.forEach(entry => {
        expect(entry.dateKey).toBe(dateKey);
        expect(entry.kind).toBe('log');
      });
    });

    it('should not return archived log entries', () => {
      const dateKey = '2024-01-15';
      const entry = createLogEntry(dateKey, 'Entry');

      updateNote(entry.id, { isArchived: true });

      const entries = getLogEntriesByDate(dateKey);

      expect(entries.length).toBe(0);
    });

    it('should return empty array for date with no entries', () => {
      const entries = getLogEntriesByDate('2024-01-15');
      expect(entries).toEqual([]);
    });
  });

  describe('getOrCreateJournalForDate', () => {
    it('should create a new journal if none exists', () => {
      const date = new Date('2024-01-15');
      const journal = getOrCreateJournalForDate(date);

      expect(journal.kind).toBe('log');
      expect(journal.dateKey).toBe('2024-01-15');
      expect(journal.title).toBeDefined();
    });

    it('should return existing journal if one exists', () => {
      const date = new Date('2024-01-15');

      const first = getOrCreateJournalForDate(date);
      const second = getOrCreateJournalForDate(date);

      expect(first.id).toBe(second.id);
    });
  });
});

describe('noteStore - Bulk Operations', () => {
  beforeEach(() => {
    const allNotes = getAllNotes();
    allNotes.forEach(note => deleteNote(note.id));
  });

  describe('bulkCreateNotes', () => {
    it('should create multiple notes at once', () => {
      const notesData = [
        { content: 'Note 1' },
        { content: 'Note 2' },
        { content: 'Note 3' },
      ];

      const created = bulkCreateNotes(notesData);

      expect(created.length).toBe(3);
      expect(created[0].content).toBe('Note 1');
      expect(created[1].content).toBe('Note 2');
      expect(created[2].content).toBe('Note 3');
    });

    it('should create notes with different properties', () => {
      const notesData = [
        { content: 'Note 1', tags: ['tag1'] },
        { content: 'Note 2', folderId: 'projects' },
        { content: 'Note 3', title: 'Custom Title' },
      ];

      const created = bulkCreateNotes(notesData);

      expect(created[0].tags).toEqual(['tag1']);
      expect(created[1].folderId).toBe('projects');
      expect(created[2].title).toBe('Custom Title');
    });

    it('should return empty array for empty input', () => {
      const created = bulkCreateNotes([]);
      expect(created).toEqual([]);
    });
  });

  describe('bulkUpdateNotes', () => {
    it('should update multiple notes at once', () => {
      const note1 = createNote({ content: 'Original 1' });
      const note2 = createNote({ content: 'Original 2' });

      const updates = [
        { noteId: note1.id, updates: { content: 'Updated 1' } },
        { noteId: note2.id, updates: { content: 'Updated 2' } },
      ];

      const updated = bulkUpdateNotes(updates);

      expect(updated.length).toBe(2);
      expect(updated[0]?.content).toBe('Updated 1');
      expect(updated[1]?.content).toBe('Updated 2');
    });

    it('should increment sync_version for all updated notes', () => {
      const note1 = createNote({ content: 'Original 1' });
      const note2 = createNote({ content: 'Original 2' });

      // Verify initial sync_version
      expect(note1.sync_version).toBe(1);
      expect(note2.sync_version).toBe(1);

      const updates = [
        { noteId: note1.id, updates: { content: 'Updated 1' } },
        { noteId: note2.id, updates: { content: 'Updated 2' } },
      ];

      const updated = bulkUpdateNotes(updates);

      // After one update, sync_version should be 2
      expect(updated[0]?.sync_version).toBe(2);
      expect(updated[1]?.sync_version).toBe(2);
    });

    it('should return null for non-existent notes', () => {
      const updates = [
        { noteId: 'non-existent', updates: { content: 'Updated' } },
      ];

      const updated = bulkUpdateNotes(updates);

      expect(updated[0]).toBeNull();
    });
  });

  describe('bulkDeleteNotes', () => {
    it('should delete multiple notes at once', () => {
      const note1 = createNote({ content: 'Note 1' });
      const note2 = createNote({ content: 'Note 2' });
      const note3 = createNote({ content: 'Note 3' });

      // Verify all notes exist before deletion
      expect(getNoteById(note1.id)).toBeDefined();
      expect(getNoteById(note2.id)).toBeDefined();
      expect(getNoteById(note3.id)).toBeDefined();

      const results = bulkDeleteNotes([note1.id, note2.id]);

      expect(results).toEqual([true, true]);

      const remaining = getAllNotes();
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe(note3.id);
    });

    it('should return false for non-existent notes', () => {
      const results = bulkDeleteNotes(['non-existent-1', 'non-existent-2']);
      expect(results).toEqual([false, false]);
    });

    it('should handle mixed existent and non-existent notes', () => {
      const note = createNote({ content: 'Note' });

      const results = bulkDeleteNotes([note.id, 'non-existent']);

      expect(results).toEqual([true, false]);
    });
  });
});

describe('noteStore - Export/Import', () => {
  beforeEach(() => {
    const allNotes = getAllNotes();
    allNotes.forEach(note => deleteNote(note.id));
  });

  describe('exportNotesToJSON', () => {
    it('should export all notes to JSON', () => {
      createNote({ content: 'Note 1' });
      createNote({ content: 'Note 2' });

      const json = exportNotesToJSON();
      const data = JSON.parse(json);

      expect(data.version).toBe('1.0');
      expect(data.noteCount).toBe(2);
      expect(data.notes).toHaveLength(2);
      expect(data.exportedAt).toBeDefined();
    });

    it('should export specific notes by ID', () => {
      // Ensure clean state
      const initialNotes = getAllNotes();
      expect(initialNotes.length).toBe(0);

      const note1 = createNote({ content: 'Note 1' });
      const note2 = createNote({ content: 'Note 2' });
      const note3 = createNote({ content: 'Note 3' });

      const json = exportNotesToJSON([note1.id, note2.id]);
      const data = JSON.parse(json);

      expect(data.noteCount).toBe(2);
      expect(data.notes).toHaveLength(2);

      // Verify it's the right notes
      const exportedIds = data.notes.map((n: Note) => n.id);
      expect(exportedIds).toContain(note1.id);
      expect(exportedIds).toContain(note2.id);
      expect(exportedIds).not.toContain(note3.id);
    });

    it('should export empty array when no notes exist', () => {
      const json = exportNotesToJSON();
      const data = JSON.parse(json);

      expect(data.noteCount).toBe(0);
      expect(data.notes).toEqual([]);
    });

    it('should preserve all note properties', () => {
      const note = createNote({
        title: 'Test Note',
        content: 'Test content',
        tags: ['tag1', 'tag2'],
        folderId: 'projects',
      });

      const json = exportNotesToJSON([note.id]);
      const data = JSON.parse(json);

      const exported = data.notes[0];
      expect(exported.title).toBe('Test Note');
      expect(exported.content).toBe('Test content');
      expect(exported.tags).toEqual(['tag1', 'tag2']);
      expect(exported.folderId).toBe('projects');
      expect(exported.sync_version).toBe(1);
    });
  });

  describe('importNotesFromJSON', () => {
    it('should import notes from valid JSON', () => {
      const note = createNote({ content: 'Original' });
      const json = exportNotesToJSON([note.id]);

      // Clear store
      deleteNote(note.id);

      const imported = importNotesFromJSON(json);

      expect(imported.length).toBe(1);
      expect(imported[0].content).toBe('Original');
    });

    it('should throw error for invalid JSON', () => {
      expect(() => {
        importNotesFromJSON('invalid json');
      }).toThrow('Invalid JSON format');
    });

    it('should throw error for missing notes array', () => {
      const invalidData = JSON.stringify({ version: '1.0' });

      expect(() => {
        importNotesFromJSON(invalidData);
      }).toThrow('Invalid export format: missing notes array');
    });

    it('should skip existing notes by default', () => {
      const note = createNote({ content: 'Original' });
      const json = exportNotesToJSON([note.id]);

      // Try to import while note exists
      const imported = importNotesFromJSON(json);

      expect(imported.length).toBe(0);

      // Original note should be unchanged
      const existing = getNoteById(note.id);
      expect(existing?.content).toBe('Original');
    });

    it('should overwrite existing notes when overwrite=true', () => {
      const note = createNote({ content: 'Original' });
      const json = exportNotesToJSON([note.id]);

      // Modify the note
      updateNote(note.id, { content: 'Modified' });

      // Import with overwrite
      const imported = importNotesFromJSON(json, { overwrite: true });

      expect(imported.length).toBe(1);

      const existing = getNoteById(note.id);
      expect(existing?.content).toBe('Original');
    });

    it('should generate new IDs when generateNewIds=true', () => {
      // Clean state
      const before = getAllNotes();
      before.forEach(n => deleteNote(n.id));

      const note = createNote({ content: 'Original' });
      const originalId = note.id;

      // Verify we only have one note
      expect(getAllNotes().length).toBe(1);

      const json = exportNotesToJSON([note.id]);

      // Verify export contains the note
      const exportData = JSON.parse(json);
      expect(exportData.notes.length).toBe(1);
      expect(exportData.notes[0].id).toBe(originalId);
      expect(exportData.notes[0].content).toBe('Original');

      const imported = importNotesFromJSON(json, { generateNewIds: true });

      expect(imported.length).toBe(1);
      expect(imported[0]).toBeDefined();
      expect(imported[0].id).not.toBe(originalId);
      expect(imported[0].content).toBe('Original');
      expect(imported[0].sync_version).toBe(1);

      // Both notes should exist
      const all = getAllNotes();
      expect(all.length).toBe(2);
    });

    it('should reset sync tracking when generateNewIds=true', () => {
      // Clean state
      const before = getAllNotes();
      before.forEach(n => deleteNote(n.id));

      const note = createNote({ content: 'Original' });
      updateNote(note.id, { content: 'Updated' }); // Increment sync_version

      const json = exportNotesToJSON([note.id]);
      const imported = importNotesFromJSON(json, { generateNewIds: true });

      expect(imported.length).toBe(1);
      expect(imported[0]).toBeDefined();
      expect(imported[0].sync_version).toBe(1);
      expect(imported[0].last_synced_at).toBeUndefined();
    });
  });
});
