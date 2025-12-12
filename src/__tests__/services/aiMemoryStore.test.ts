// =============================================================================
// AI MEMORY STORE TESTS
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  addMemory,
  getMemoryById,
  listMemoriesForContact,
  listMemoriesByKind,
  searchMemories,
  deleteMemory,
  addFeedback,
  listFeedbackForMemory,
  getFeedbackScore,
  getRecentMemories,
  getHighQualityExamples,
  clearAll,
} from '../../services/aiMemoryStore';
import type { AIMemoryRecordInput, AIFeedbackRecordInput } from '../../types/aiMemory';

// =============================================================================
// TEST HELPERS
// =============================================================================

const createTestMemory = (overrides: Partial<AIMemoryRecordInput> = {}): AIMemoryRecordInput => ({
  kind: 'framescan_report',
  contactId: 'contact_1',
  tenantId: null,
  source: { system: 'framescan', key: 'test_key' },
  summary: 'Test memory summary',
  tags: ['test', 'framescan'],
  importanceScore: 0.5,
  rawPayload: { test: true },
  ...overrides,
});

const createTestFeedback = (memoryId: string, overrides: Partial<AIFeedbackRecordInput> = {}): AIFeedbackRecordInput => ({
  memoryId,
  contactId: 'contact_1',
  kind: 'thumbs_up',
  rating: 5,
  comment: null,
  source: { system: 'framescan', key: 'test_key' },
  ...overrides,
});

// =============================================================================
// TESTS
// =============================================================================

describe('aiMemoryStore', () => {
  beforeEach(() => {
    clearAll();
  });

  describe('addMemory', () => {
    it('should add a memory and return it with id and createdAt', () => {
      const input = createTestMemory();
      const memory = addMemory(input);

      expect(memory.id).toBeDefined();
      expect(memory.id).toMatch(/^mem_/);
      expect(memory.createdAt).toBeDefined();
      expect(memory.kind).toBe('framescan_report');
      expect(memory.contactId).toBe('contact_1');
      expect(memory.summary).toBe('Test memory summary');
    });

    it('should add multiple memories', () => {
      addMemory(createTestMemory());
      addMemory(createTestMemory({ contactId: 'contact_2' }));
      addMemory(createTestMemory({ kind: 'little_lord_exchange' }));

      const memories = getRecentMemories(10);
      expect(memories.length).toBe(3);
    });
  });

  describe('getMemoryById', () => {
    it('should return the memory by id', () => {
      const added = addMemory(createTestMemory());
      const found = getMemoryById(added.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(added.id);
    });

    it('should return undefined for non-existent id', () => {
      const found = getMemoryById('non_existent_id');
      expect(found).toBeUndefined();
    });
  });

  describe('listMemoriesForContact', () => {
    it('should return memories for a specific contact', () => {
      addMemory(createTestMemory({ contactId: 'contact_1' }));
      addMemory(createTestMemory({ contactId: 'contact_1' }));
      addMemory(createTestMemory({ contactId: 'contact_2' }));

      const contact1Memories = listMemoriesForContact('contact_1');
      const contact2Memories = listMemoriesForContact('contact_2');

      expect(contact1Memories.length).toBe(2);
      expect(contact2Memories.length).toBe(1);
    });

    it('should return empty array for contact with no memories', () => {
      const memories = listMemoriesForContact('non_existent_contact');
      expect(memories).toEqual([]);
    });
  });

  describe('listMemoriesByKind', () => {
    it('should return memories filtered by kind', () => {
      addMemory(createTestMemory({ kind: 'framescan_report' }));
      addMemory(createTestMemory({ kind: 'framescan_report' }));
      addMemory(createTestMemory({ kind: 'little_lord_exchange' }));

      const frameScanMemories = listMemoriesByKind('framescan_report');
      const littleLordMemories = listMemoriesByKind('little_lord_exchange');

      expect(frameScanMemories.length).toBe(2);
      expect(littleLordMemories.length).toBe(1);
    });
  });

  describe('searchMemories', () => {
    it('should filter by kind', () => {
      addMemory(createTestMemory({ kind: 'framescan_report' }));
      addMemory(createTestMemory({ kind: 'little_lord_exchange' }));

      const results = searchMemories({ kind: 'framescan_report' });
      expect(results.length).toBe(1);
      expect(results[0].memory.kind).toBe('framescan_report');
    });

    it('should filter by contactId', () => {
      addMemory(createTestMemory({ contactId: 'contact_1' }));
      addMemory(createTestMemory({ contactId: 'contact_2' }));

      const results = searchMemories({ contactId: 'contact_1' });
      expect(results.length).toBe(1);
      expect(results[0].memory.contactId).toBe('contact_1');
    });

    it('should filter by tag', () => {
      addMemory(createTestMemory({ tags: ['urgent', 'sales'] }));
      addMemory(createTestMemory({ tags: ['support'] }));

      const results = searchMemories({ tag: 'urgent' });
      expect(results.length).toBe(1);
      expect(results[0].memory.tags).toContain('urgent');
    });

    it('should filter by multiple tags (all must match)', () => {
      addMemory(createTestMemory({ tags: ['urgent', 'sales', 'important'] }));
      addMemory(createTestMemory({ tags: ['urgent', 'support'] }));

      const results = searchMemories({ tags: ['urgent', 'sales'] });
      expect(results.length).toBe(1);
    });

    it('should filter by minImportance', () => {
      addMemory(createTestMemory({ importanceScore: 0.3 }));
      addMemory(createTestMemory({ importanceScore: 0.7 }));
      addMemory(createTestMemory({ importanceScore: 0.9 }));

      const results = searchMemories({ minImportance: 0.5 });
      expect(results.length).toBe(2);
    });

    it('should respect limit and offset', () => {
      for (let i = 0; i < 10; i++) {
        addMemory(createTestMemory());
      }

      const page1 = searchMemories({ limit: 3 });
      const page2 = searchMemories({ limit: 3, offset: 3 });

      expect(page1.length).toBe(3);
      expect(page2.length).toBe(3);
      expect(page1[0].memory.id).not.toBe(page2[0].memory.id);
    });

    it('should include relevance scores', () => {
      addMemory(createTestMemory({ contactId: 'contact_1' }));

      const results = searchMemories({ contactId: 'contact_1' });
      expect(results[0].relevanceScore).toBeGreaterThan(0);
    });
  });

  describe('deleteMemory', () => {
    it('should delete a memory by id', () => {
      const memory = addMemory(createTestMemory());
      expect(getMemoryById(memory.id)).toBeDefined();

      const deleted = deleteMemory(memory.id);
      expect(deleted).toBe(true);
      expect(getMemoryById(memory.id)).toBeUndefined();
    });

    it('should return false for non-existent memory', () => {
      const deleted = deleteMemory('non_existent_id');
      expect(deleted).toBe(false);
    });

    it('should also delete associated feedback', () => {
      const memory = addMemory(createTestMemory());
      addFeedback(createTestFeedback(memory.id));

      const feedbackBefore = listFeedbackForMemory(memory.id);
      expect(feedbackBefore.length).toBe(1);

      deleteMemory(memory.id);

      const feedbackAfter = listFeedbackForMemory(memory.id);
      expect(feedbackAfter.length).toBe(0);
    });
  });

  describe('addFeedback', () => {
    it('should add feedback and return it with id and createdAt', () => {
      const memory = addMemory(createTestMemory());
      const feedback = addFeedback(createTestFeedback(memory.id));

      expect(feedback.id).toBeDefined();
      expect(feedback.id).toMatch(/^fb_/);
      expect(feedback.createdAt).toBeDefined();
      expect(feedback.memoryId).toBe(memory.id);
      expect(feedback.kind).toBe('thumbs_up');
    });
  });

  describe('listFeedbackForMemory', () => {
    it('should return all feedback for a memory', () => {
      const memory = addMemory(createTestMemory());
      addFeedback(createTestFeedback(memory.id, { kind: 'thumbs_up' }));
      addFeedback(createTestFeedback(memory.id, { kind: 'comment', comment: 'Great!' }));

      const feedback = listFeedbackForMemory(memory.id);
      expect(feedback.length).toBe(2);
    });

    it('should return empty array for memory with no feedback', () => {
      const memory = addMemory(createTestMemory());
      const feedback = listFeedbackForMemory(memory.id);
      expect(feedback).toEqual([]);
    });
  });

  describe('getFeedbackScore', () => {
    it('should return 0 for memory with no feedback', () => {
      const memory = addMemory(createTestMemory());
      const score = getFeedbackScore(memory.id);
      expect(score).toBe(0);
    });

    it('should return positive score for thumbs_up', () => {
      const memory = addMemory(createTestMemory());
      addFeedback(createTestFeedback(memory.id, { kind: 'thumbs_up', rating: 5 }));

      const score = getFeedbackScore(memory.id);
      expect(score).toBeGreaterThan(0);
    });

    it('should return negative score for thumbs_down', () => {
      const memory = addMemory(createTestMemory());
      addFeedback(createTestFeedback(memory.id, { kind: 'thumbs_down', rating: 1 }));

      const score = getFeedbackScore(memory.id);
      expect(score).toBeLessThan(0);
    });

    it('should aggregate multiple feedback entries', () => {
      const memory = addMemory(createTestMemory());
      addFeedback(createTestFeedback(memory.id, { kind: 'thumbs_up', rating: 5 }));
      addFeedback(createTestFeedback(memory.id, { kind: 'thumbs_up', rating: 5 }));
      addFeedback(createTestFeedback(memory.id, { kind: 'thumbs_down', rating: 1 }));

      const score = getFeedbackScore(memory.id);
      // 2 positive + 1 negative = net positive
      expect(score).toBeGreaterThan(0);
    });
  });

  describe('getRecentMemories', () => {
    it('should return memories sorted by createdAt descending', () => {
      const m1 = addMemory(createTestMemory({ summary: 'first' }));
      const m2 = addMemory(createTestMemory({ summary: 'second' }));
      const m3 = addMemory(createTestMemory({ summary: 'third' }));

      const recent = getRecentMemories(3);

      // Most recent first (last added)
      expect(recent[0].summary).toBe('third');
      expect(recent[1].summary).toBe('second');
      expect(recent[2].summary).toBe('first');
    });

    it('should respect limit', () => {
      for (let i = 0; i < 10; i++) {
        addMemory(createTestMemory());
      }

      const recent = getRecentMemories(5);
      expect(recent.length).toBe(5);
    });
  });

  describe('getHighQualityExamples', () => {
    it('should return memories with best quality scores', () => {
      const m1 = addMemory(createTestMemory({ importanceScore: 0.9 }));
      const m2 = addMemory(createTestMemory({ importanceScore: 0.3 }));
      const m3 = addMemory(createTestMemory({ importanceScore: 0.6 }));

      // Add positive feedback to m1
      addFeedback(createTestFeedback(m1.id, { kind: 'thumbs_up', rating: 5 }));

      const examples = getHighQualityExamples('framescan_report', 2);

      expect(examples.length).toBe(2);
      // m1 should be first (high importance + positive feedback)
      expect(examples[0].id).toBe(m1.id);
    });
  });

  describe('searchMemories with feedback filters', () => {
    it('should filter to only positive feedback', () => {
      const m1 = addMemory(createTestMemory());
      const m2 = addMemory(createTestMemory());
      const m3 = addMemory(createTestMemory());

      addFeedback(createTestFeedback(m1.id, { kind: 'thumbs_up' }));
      addFeedback(createTestFeedback(m2.id, { kind: 'thumbs_down' }));
      // m3 has no feedback

      const results = searchMemories({ onlyPositiveFeedback: true });
      expect(results.length).toBe(1);
      expect(results[0].memory.id).toBe(m1.id);
    });

    it('should exclude negative feedback', () => {
      const m1 = addMemory(createTestMemory());
      const m2 = addMemory(createTestMemory());
      const m3 = addMemory(createTestMemory());

      addFeedback(createTestFeedback(m1.id, { kind: 'thumbs_up' }));
      addFeedback(createTestFeedback(m2.id, { kind: 'thumbs_down' }));
      // m3 has no feedback (neutral score = 0)

      const results = searchMemories({ excludeNegativeFeedback: true });
      // Should include m1 (positive) and m3 (neutral), exclude m2 (negative)
      expect(results.length).toBe(2);
      const ids = results.map(r => r.memory.id);
      expect(ids).toContain(m1.id);
      expect(ids).toContain(m3.id);
      expect(ids).not.toContain(m2.id);
    });
  });

  describe('clearAll', () => {
    it('should clear all memories and feedback', () => {
      const memory = addMemory(createTestMemory());
      addFeedback(createTestFeedback(memory.id));

      clearAll();

      expect(getRecentMemories(10)).toEqual([]);
      expect(listFeedbackForMemory(memory.id)).toEqual([]);
    });
  });
});
