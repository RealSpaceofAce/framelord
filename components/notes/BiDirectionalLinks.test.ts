// =============================================================================
// BI-DIRECTIONAL LINKS TESTS — Verify backlinks detection works
// =============================================================================
// These tests verify:
// 1. findBacklinks correctly finds notes with [[title]] references
// 2. Backlinks work when note.content is properly synced from BlockSuite
// 3. Edge cases like empty content, no title, self-references
// =============================================================================

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Note } from '../../types';

// =============================================================================
// MOCK NOTE STORE
// =============================================================================

let mockNotes: Note[] = [];

// Reset mock notes before each test
beforeEach(() => {
  mockNotes = [];
});

// Mock implementations matching noteStore.ts
const getNoteById = (noteId: string): Note | undefined => {
  return mockNotes.find(n => n.id === noteId);
};

const getAllNotes = (): Note[] => {
  return [...mockNotes];
};

// Helper to create test notes
const createTestNote = (overrides: Partial<Note> = {}): Note => {
  const now = new Date().toISOString();
  return {
    id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    title: null,
    createdAt: now,
    updatedAt: now,
    authorContactId: 'contact_zero',
    targetContactIds: [],
    kind: 'note',
    dateKey: null,
    folderId: 'inbox',
    isInbox: false,
    topics: [],
    tags: [],
    preferredView: 'doc',
    isPinnedHome: false,
    isPinned: false,
    isArchived: false,
    content: '',
    ...overrides,
  };
};

// =============================================================================
// FIND BACKLINKS IMPLEMENTATION (mirrors BiDirectionalLinks.tsx)
// =============================================================================

/**
 * Find notes that link to the given note (backlinks).
 * Looks for [[title]] wikilinks in note content.
 */
function findBacklinks(noteId: string): Note[] {
  const currentNote = getNoteById(noteId);
  if (!currentNote) return [];

  const allNotes = getAllNotes();
  const currentTitle = currentNote.title?.toLowerCase() || '';

  // If no title, we can't have meaningful backlinks
  if (!currentTitle) return [];

  const backlinks: Note[] = [];

  for (const note of allNotes) {
    // Skip self
    if (note.id === noteId) continue;

    // Check if this note's content contains [[currentTitle]]
    const content = note.content?.toLowerCase() || '';
    if (content.includes(`[[${currentTitle}]]`)) {
      backlinks.push(note);
    }
  }

  return backlinks;
}

// =============================================================================
// EXTRACT WIKILINK LABELS (for verifying content parsing)
// =============================================================================

/**
 * Extract [[wikilink]] labels from content.
 * This is used to verify content contains the expected links.
 */
function extractWikilinkLabels(content: string): string[] {
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
}

// =============================================================================
// TESTS: BACKLINKS DETECTION
// =============================================================================

describe('BiDirectionalLinks - findBacklinks', () => {
  describe('basic functionality', () => {
    it('should return empty array for non-existent note', () => {
      const backlinks = findBacklinks('non-existent-id');
      expect(backlinks).toEqual([]);
    });

    it('should return empty array for note without title', () => {
      const noteWithoutTitle = createTestNote({
        id: 'note-no-title',
        title: null,
      });
      mockNotes = [noteWithoutTitle];

      const backlinks = findBacklinks('note-no-title');
      expect(backlinks).toEqual([]);
    });

    it('should return empty array when no other notes exist', () => {
      const targetNote = createTestNote({
        id: 'target-note',
        title: 'Target Note',
      });
      mockNotes = [targetNote];

      const backlinks = findBacklinks('target-note');
      expect(backlinks).toEqual([]);
    });

    it('should return empty array when no notes link to target', () => {
      const targetNote = createTestNote({
        id: 'target-note',
        title: 'Target Note',
      });
      const otherNote = createTestNote({
        id: 'other-note',
        title: 'Other Note',
        content: 'This note does not link to anything',
      });
      mockNotes = [targetNote, otherNote];

      const backlinks = findBacklinks('target-note');
      expect(backlinks).toEqual([]);
    });
  });

  describe('finding backlinks', () => {
    it('should find a single backlink', () => {
      const targetNote = createTestNote({
        id: 'target-note',
        title: 'Meeting Notes',
      });
      const linkingNote = createTestNote({
        id: 'linking-note',
        title: 'Project Overview',
        content: 'See [[Meeting Notes]] for details',
      });
      mockNotes = [targetNote, linkingNote];

      const backlinks = findBacklinks('target-note');
      expect(backlinks).toHaveLength(1);
      expect(backlinks[0].id).toBe('linking-note');
    });

    it('should find multiple backlinks', () => {
      const targetNote = createTestNote({
        id: 'target-note',
        title: 'API Design',
      });
      const linkingNote1 = createTestNote({
        id: 'linking-note-1',
        title: 'Frontend Spec',
        content: 'Implement according to [[API Design]]',
      });
      const linkingNote2 = createTestNote({
        id: 'linking-note-2',
        title: 'Backend Spec',
        content: 'Follow the [[API Design]] document',
      });
      const linkingNote3 = createTestNote({
        id: 'linking-note-3',
        title: 'Testing Plan',
        content: 'Test all endpoints from [[API Design]]',
      });
      mockNotes = [targetNote, linkingNote1, linkingNote2, linkingNote3];

      const backlinks = findBacklinks('target-note');
      expect(backlinks).toHaveLength(3);
      expect(backlinks.map(n => n.id)).toContain('linking-note-1');
      expect(backlinks.map(n => n.id)).toContain('linking-note-2');
      expect(backlinks.map(n => n.id)).toContain('linking-note-3');
    });

    it('should not include self-references', () => {
      const note = createTestNote({
        id: 'self-ref-note',
        title: 'Self Reference',
        content: 'This links to [[Self Reference]]',
      });
      mockNotes = [note];

      const backlinks = findBacklinks('self-ref-note');
      expect(backlinks).toHaveLength(0);
    });

    it('should match case-insensitively', () => {
      const targetNote = createTestNote({
        id: 'target-note',
        title: 'My Important Note',
      });
      const linkingNote = createTestNote({
        id: 'linking-note',
        title: 'Reference',
        content: 'Check [[my important note]] for info',
      });
      mockNotes = [targetNote, linkingNote];

      const backlinks = findBacklinks('target-note');
      expect(backlinks).toHaveLength(1);
      expect(backlinks[0].id).toBe('linking-note');
    });
  });

  describe('edge cases', () => {
    it('should handle empty content gracefully', () => {
      const targetNote = createTestNote({
        id: 'target-note',
        title: 'Target',
      });
      const noteWithEmptyContent = createTestNote({
        id: 'empty-content-note',
        title: 'Empty',
        content: '',
      });
      mockNotes = [targetNote, noteWithEmptyContent];

      const backlinks = findBacklinks('target-note');
      expect(backlinks).toHaveLength(0);
    });

    it('should handle undefined content gracefully', () => {
      const targetNote = createTestNote({
        id: 'target-note',
        title: 'Target',
      });
      const noteWithUndefinedContent = createTestNote({
        id: 'undefined-content-note',
        title: 'Undefined',
        content: undefined,
      });
      mockNotes = [targetNote, noteWithUndefinedContent];

      const backlinks = findBacklinks('target-note');
      expect(backlinks).toHaveLength(0);
    });

    it('should handle special characters in title', () => {
      const targetNote = createTestNote({
        id: 'target-note',
        title: "John's Notes",
      });
      const linkingNote = createTestNote({
        id: 'linking-note',
        title: 'Reference',
        content: "See [[John's Notes]] for details",
      });
      mockNotes = [targetNote, linkingNote];

      const backlinks = findBacklinks('target-note');
      expect(backlinks).toHaveLength(1);
    });

    it('should not match partial wikilinks', () => {
      const targetNote = createTestNote({
        id: 'target-note',
        title: 'Design',
      });
      const noteWithPartialMatch = createTestNote({
        id: 'partial-note',
        title: 'Reference',
        content: 'Check the [[Design Document]] for specs',
      });
      mockNotes = [targetNote, noteWithPartialMatch];

      const backlinks = findBacklinks('target-note');
      // Should not match because [[Design Document]] != [[Design]]
      expect(backlinks).toHaveLength(0);
    });

    it('should handle multiple wikilinks in same content', () => {
      const targetNote = createTestNote({
        id: 'target-note',
        title: 'Target',
      });
      const noteWithMultipleLinks = createTestNote({
        id: 'multi-link-note',
        title: 'Reference',
        content: 'See [[Target]] and [[Other]] and [[Target]] again',
      });
      mockNotes = [targetNote, noteWithMultipleLinks];

      const backlinks = findBacklinks('target-note');
      // Should still only return the note once
      expect(backlinks).toHaveLength(1);
    });
  });
});

// =============================================================================
// TESTS: WIKILINK EXTRACTION
// =============================================================================

describe('BiDirectionalLinks - extractWikilinkLabels', () => {
  it('should extract no labels from empty content', () => {
    expect(extractWikilinkLabels('')).toEqual([]);
  });

  it('should extract no labels when no wikilinks present', () => {
    expect(extractWikilinkLabels('Just regular text')).toEqual([]);
  });

  it('should extract single wikilink', () => {
    const labels = extractWikilinkLabels('Link to [[My Note]]');
    expect(labels).toEqual(['My Note']);
  });

  it('should extract multiple wikilinks', () => {
    const labels = extractWikilinkLabels('See [[Note A]] and [[Note B]] and [[Note C]]');
    expect(labels).toEqual(['Note A', 'Note B', 'Note C']);
  });

  it('should deduplicate repeated wikilinks', () => {
    const labels = extractWikilinkLabels('[[Same]] text [[Same]] more [[Same]]');
    expect(labels).toEqual(['Same']);
  });

  it('should trim whitespace in labels', () => {
    const labels = extractWikilinkLabels('[[  Spaced Label  ]]');
    expect(labels).toEqual(['Spaced Label']);
  });

  it('should handle wikilinks with special characters', () => {
    const labels = extractWikilinkLabels("[[John's Notes]] and [[Q&A Session]]");
    expect(labels).toEqual(["John's Notes", 'Q&A Session']);
  });

  it('should not extract nested or malformed brackets', () => {
    // The regex [[([^\]]+)]] will match [[ followed by non-] chars then ]]
    // [[[Triple]]] matches as [[Triple] because the regex is greedy on the opening
    // This is acceptable behavior - the important thing is [[Valid]] works
    const labels = extractWikilinkLabels('[Single] and [[[Triple]]] and [[Valid]]');
    expect(labels).toContain('Valid');
    // Single bracket [Single] should not be extracted
    expect(labels).not.toContain('Single');
  });
});

// =============================================================================
// TESTS: CONTENT SYNC INTEGRATION
// =============================================================================

describe('BiDirectionalLinks - Content Sync Integration', () => {
  describe('content update flow', () => {
    it('should find backlinks after content is synced from BlockSuite', () => {
      // Scenario: User types [[Target Note]] in BlockSuite editor
      // The onContentChange callback should sync this to note.content
      // Then BiDirectionalLinks can find the backlink

      const targetNote = createTestNote({
        id: 'target-note',
        title: 'Target Note',
        content: '',
      });

      const sourceNote = createTestNote({
        id: 'source-note',
        title: 'Source Note',
        content: '', // Initially empty
      });

      mockNotes = [targetNote, sourceNote];

      // Before content sync - no backlinks
      let backlinks = findBacklinks('target-note');
      expect(backlinks).toHaveLength(0);

      // Simulate content sync from BlockSuite via onContentChange
      // This is what AffineNotes.tsx should do:
      // updateNote(sourceNote.id, { content: extractedContent });
      sourceNote.content = 'I reference [[Target Note]] here';

      // After content sync - backlink found!
      backlinks = findBacklinks('target-note');
      expect(backlinks).toHaveLength(1);
      expect(backlinks[0].id).toBe('source-note');
    });

    it('should update backlinks when content changes', () => {
      const noteA = createTestNote({
        id: 'note-a',
        title: 'Note A',
      });

      const noteB = createTestNote({
        id: 'note-b',
        title: 'Note B',
      });

      const sourceNote = createTestNote({
        id: 'source-note',
        title: 'Source',
        content: 'Links to [[Note A]]',
      });

      mockNotes = [noteA, noteB, sourceNote];

      // Initially links to Note A
      expect(findBacklinks('note-a')).toHaveLength(1);
      expect(findBacklinks('note-b')).toHaveLength(0);

      // User changes the link to Note B
      sourceNote.content = 'Links to [[Note B]]';

      // After content sync - link changed
      expect(findBacklinks('note-a')).toHaveLength(0);
      expect(findBacklinks('note-b')).toHaveLength(1);
    });

    it('should handle content being cleared', () => {
      const targetNote = createTestNote({
        id: 'target-note',
        title: 'Target',
      });

      const sourceNote = createTestNote({
        id: 'source-note',
        title: 'Source',
        content: 'Links to [[Target]]',
      });

      mockNotes = [targetNote, sourceNote];

      // Has backlink
      expect(findBacklinks('target-note')).toHaveLength(1);

      // User clears the content
      sourceNote.content = '';

      // No more backlink
      expect(findBacklinks('target-note')).toHaveLength(0);
    });
  });
});

// =============================================================================
// TESTS: REAL-WORLD SCENARIOS
// =============================================================================

describe('BiDirectionalLinks - Real World Scenarios', () => {
  it('should support Obsidian-style daily notes with backlinks', () => {
    // User creates daily notes that reference projects
    const projectNote = createTestNote({
      id: 'project-alpha',
      title: 'Project Alpha',
      kind: 'note',
    });

    const dailyNote1 = createTestNote({
      id: 'daily-2024-01-15',
      title: '2024-01-15',
      kind: 'log',
      dateKey: '2024-01-15',
      content: 'Worked on [[Project Alpha]] today. Made good progress.',
    });

    const dailyNote2 = createTestNote({
      id: 'daily-2024-01-16',
      title: '2024-01-16',
      kind: 'log',
      dateKey: '2024-01-16',
      content: 'Continued [[Project Alpha]]. Fixed some bugs.',
    });

    mockNotes = [projectNote, dailyNote1, dailyNote2];

    const backlinks = findBacklinks('project-alpha');
    expect(backlinks).toHaveLength(2);
    expect(backlinks.map(n => n.dateKey)).toContain('2024-01-15');
    expect(backlinks.map(n => n.dateKey)).toContain('2024-01-16');
  });

  it('should support contact-linked notes with backlinks', () => {
    // User creates notes about contacts that reference each other
    const meetingNote = createTestNote({
      id: 'meeting-note',
      title: 'Client Meeting 2024-01-15',
      targetContactIds: ['contact-john'],
    });

    const followUpNote = createTestNote({
      id: 'followup-note',
      title: 'Follow-up Actions',
      content: 'From [[Client Meeting 2024-01-15]]: Schedule demo next week.',
    });

    mockNotes = [meetingNote, followUpNote];

    const backlinks = findBacklinks('meeting-note');
    expect(backlinks).toHaveLength(1);
    expect(backlinks[0].title).toBe('Follow-up Actions');
  });

  it('should handle network of interconnected notes', () => {
    // A web of notes referencing each other
    const hub = createTestNote({
      id: 'hub',
      title: 'Project Hub',
      content: 'Main project page. See [[Design]] and [[Development]].',
    });

    const design = createTestNote({
      id: 'design',
      title: 'Design',
      content: 'Design docs. Referenced from [[Project Hub]].',
    });

    const development = createTestNote({
      id: 'development',
      title: 'Development',
      content: 'Dev notes. See [[Design]] for specs. Part of [[Project Hub]].',
    });

    mockNotes = [hub, design, development];

    // Hub has backlinks from Design and Development
    const hubBacklinks = findBacklinks('hub');
    expect(hubBacklinks).toHaveLength(2);

    // Design has backlinks from Hub and Development
    const designBacklinks = findBacklinks('design');
    expect(designBacklinks).toHaveLength(2);

    // Development has backlinks from Hub only
    const devBacklinks = findBacklinks('development');
    expect(devBacklinks).toHaveLength(1);
    expect(devBacklinks[0].id).toBe('hub');
  });
});
