// =============================================================================
// AI MEMORY STORE — Unified storage for AI interactions and feedback
// =============================================================================
// This store is the single front-end for the self-improving AI memory layer.
// It stores all AI interactions and user feedback in a queryable format.
//
// Design:
// - In-memory storage (same pattern as other stores)
// - Can be backed by Supabase later without changing API
// - Supports search, filtering, and feedback scoring
// - Integrates with useSyncExternalStore for React
//
// Usage:
// - Other stores/adapters call addMemory() after AI operations
// - UI components call addFeedback() for user ratings
// - AI systems call searchMemories() for context retrieval
// =============================================================================

import type {
  AIMemoryRecord,
  AIMemoryRecordInput,
  AIFeedbackRecord,
  AIFeedbackRecordInput,
  AIMemoryKind,
  AISystemId,
  AIMemorySearchOptions,
  AIMemorySearchResult,
  AIMemoryStoreInterface,
} from '../types/aiMemory';

// =============================================================================
// LOGGING
// =============================================================================

const LOG_PREFIX = '[aiMemory]';

function log(...args: unknown[]) {
  console.log(LOG_PREFIX, ...args);
}

function logWarn(...args: unknown[]) {
  console.warn(LOG_PREFIX, ...args);
}

// =============================================================================
// ID GENERATION
// =============================================================================

const generateMemoryId = (): string =>
  `mem_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const generateFeedbackId = (): string =>
  `fb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

// =============================================================================
// STORE STATE
// =============================================================================

let MEMORIES: AIMemoryRecord[] = [];
let FEEDBACK: AIFeedbackRecord[] = [];

// =============================================================================
// SUBSCRIPTION (for useSyncExternalStore)
// =============================================================================

let listeners: Set<() => void> = new Set();

const emitChange = () => {
  listeners.forEach(listener => listener());
};

/**
 * Subscribe to store changes (for useSyncExternalStore).
 */
export const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  log('New subscriber, total listeners:', listeners.size);
  return () => {
    listeners.delete(listener);
    log('Unsubscribed, remaining listeners:', listeners.size);
  };
};

/**
 * Get current snapshot (for useSyncExternalStore).
 */
export const getSnapshot = (): { memories: AIMemoryRecord[]; feedback: AIFeedbackRecord[] } => ({
  memories: MEMORIES,
  feedback: FEEDBACK,
});

// =============================================================================
// MEMORY OPERATIONS
// =============================================================================

/**
 * Add a new memory record to the store.
 *
 * @param record - Memory record without id and createdAt
 * @returns The created memory record with generated id and timestamp
 */
export const addMemory = (record: AIMemoryRecordInput): AIMemoryRecord => {
  const newMemory: AIMemoryRecord = {
    ...record,
    id: generateMemoryId(),
    createdAt: new Date().toISOString(),
  };

  MEMORIES = [newMemory, ...MEMORIES];

  log(
    'Added memory',
    newMemory.kind,
    'for contact',
    newMemory.contactId ?? 'null',
    '| Total memories:',
    MEMORIES.length
  );

  emitChange();
  return newMemory;
};

/**
 * Get a memory by ID.
 */
export const getMemoryById = (id: string): AIMemoryRecord | undefined => {
  return MEMORIES.find(m => m.id === id);
};

/**
 * List all memories for a specific contact.
 * Sorted by createdAt descending (most recent first).
 */
export const listMemoriesForContact = (contactId: string): AIMemoryRecord[] => {
  return MEMORIES
    .filter(m => m.contactId === contactId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

/**
 * List all memories of a specific kind.
 * Sorted by createdAt descending (most recent first).
 */
export const listMemoriesByKind = (kind: AIMemoryKind): AIMemoryRecord[] => {
  return MEMORIES
    .filter(m => m.kind === kind)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

/**
 * Delete a memory by ID.
 */
export const deleteMemory = (id: string): boolean => {
  const initialLength = MEMORIES.length;
  MEMORIES = MEMORIES.filter(m => m.id !== id);
  const deleted = MEMORIES.length < initialLength;

  if (deleted) {
    log('Deleted memory:', id);
    // Also delete associated feedback
    FEEDBACK = FEEDBACK.filter(f => f.memoryId !== id);
    emitChange();
  }

  return deleted;
};

// =============================================================================
// SEARCH OPERATIONS
// =============================================================================

/**
 * Calculate feedback score for a memory.
 * Range: -1 (all negative) to +1 (all positive)
 */
export const getFeedbackScore = (memoryId: string): number => {
  const feedbackList = FEEDBACK.filter(f => f.memoryId === memoryId);
  if (feedbackList.length === 0) return 0;

  const positiveKinds = ['thumbs_up', 'action_taken', 'follow_up', 'copied', 'shared'];
  const negativeKinds = ['thumbs_down', 'action_ignored', 'regenerate', 'dismissed'];

  let score = 0;
  for (const fb of feedbackList) {
    if (positiveKinds.includes(fb.kind)) {
      score += fb.rating ? fb.rating / 5 : 0.5;
    } else if (negativeKinds.includes(fb.kind)) {
      score -= fb.rating ? (6 - fb.rating) / 5 : 0.5;
    }
  }

  // Normalize to -1 to +1 range
  return Math.max(-1, Math.min(1, score / feedbackList.length));
};

/**
 * Calculate relevance score for search ranking.
 */
function calculateRelevanceScore(
  memory: AIMemoryRecord,
  options: AIMemorySearchOptions
): number {
  let score = 0;

  // Same contact: +0.3
  if (options.contactId && memory.contactId === options.contactId) {
    score += 0.3;
  }

  // Same kind: +0.2
  if (options.kind && memory.kind === options.kind) {
    score += 0.2;
  }

  // Same system: +0.1
  if (options.system && memory.source.system === options.system) {
    score += 0.1;
  }

  // Tag overlap: +0.1 per matching tag
  if (options.tags && options.tags.length > 0) {
    const matchingTags = memory.tags.filter(t => options.tags!.includes(t));
    score += matchingTags.length * 0.1;
  }

  // Recency: +0.2 for last 7 days, decaying
  const age = Date.now() - new Date(memory.createdAt).getTime();
  const daysOld = age / (1000 * 60 * 60 * 24);
  score += Math.max(0, 0.2 - (daysOld * 0.02));

  // Importance: weight by importanceScore
  score += memory.importanceScore * 0.2;

  return score;
}

/**
 * Search memories with various filters and return ranked results.
 */
export const searchMemories = (options: AIMemorySearchOptions): AIMemorySearchResult[] => {
  let filtered = [...MEMORIES];

  // Apply filters
  if (options.kind) {
    filtered = filtered.filter(m => m.kind === options.kind);
  }

  if (options.contactId) {
    filtered = filtered.filter(m => m.contactId === options.contactId);
  }

  if (options.tenantId) {
    filtered = filtered.filter(m => m.tenantId === options.tenantId);
  }

  if (options.system) {
    filtered = filtered.filter(m => m.source.system === options.system);
  }

  if (options.tag) {
    filtered = filtered.filter(m => m.tags.includes(options.tag!));
  }

  if (options.tags && options.tags.length > 0) {
    filtered = filtered.filter(m =>
      options.tags!.every(tag => m.tags.includes(tag))
    );
  }

  if (options.minImportance !== undefined) {
    filtered = filtered.filter(m => m.importanceScore >= options.minImportance!);
  }

  if (options.createdAfter) {
    const afterTime = new Date(options.createdAfter).getTime();
    filtered = filtered.filter(m => new Date(m.createdAt).getTime() >= afterTime);
  }

  if (options.createdBefore) {
    const beforeTime = new Date(options.createdBefore).getTime();
    filtered = filtered.filter(m => new Date(m.createdAt).getTime() <= beforeTime);
  }

  // Apply feedback filters
  if (options.onlyPositiveFeedback) {
    filtered = filtered.filter(m => getFeedbackScore(m.id) > 0);
  }

  if (options.excludeNegativeFeedback) {
    filtered = filtered.filter(m => getFeedbackScore(m.id) >= 0);
  }

  // Calculate scores and create results
  const results: AIMemorySearchResult[] = filtered.map(memory => ({
    memory,
    relevanceScore: calculateRelevanceScore(memory, options),
    feedbackScore: getFeedbackScore(memory.id),
  }));

  // Sort results
  const sortBy = options.sortBy ?? 'createdAt';
  const sortOrder = options.sortOrder ?? 'desc';

  results.sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'createdAt':
        comparison = new Date(a.memory.createdAt).getTime() - new Date(b.memory.createdAt).getTime();
        break;
      case 'importanceScore':
        comparison = a.memory.importanceScore - b.memory.importanceScore;
        break;
      case 'feedbackScore':
        comparison = a.feedbackScore - b.feedbackScore;
        break;
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  // Apply pagination
  let paginated = results;
  if (options.offset) {
    paginated = paginated.slice(options.offset);
  }
  if (options.limit) {
    paginated = paginated.slice(0, options.limit);
  }

  return paginated;
};

// =============================================================================
// FEEDBACK OPERATIONS
// =============================================================================

/**
 * Add feedback for an AI memory.
 *
 * @param record - Feedback record without id and createdAt
 * @returns The created feedback record
 */
export const addFeedback = (record: AIFeedbackRecordInput): AIFeedbackRecord => {
  const newFeedback: AIFeedbackRecord = {
    ...record,
    id: generateFeedbackId(),
    createdAt: new Date().toISOString(),
  };

  FEEDBACK = [newFeedback, ...FEEDBACK];

  log(
    'Added feedback',
    newFeedback.kind,
    'for memory',
    newFeedback.memoryId ?? 'null',
    '| Rating:',
    newFeedback.rating ?? 'N/A'
  );

  emitChange();
  return newFeedback;
};

/**
 * List all feedback for a specific memory.
 * Sorted by createdAt descending.
 */
export const listFeedbackForMemory = (memoryId: string): AIFeedbackRecord[] => {
  return FEEDBACK
    .filter(f => f.memoryId === memoryId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
};

/**
 * List all feedback by kind.
 */
export const listFeedbackByKind = (kind: AIFeedbackRecord['kind']): AIFeedbackRecord[] => {
  return FEEDBACK.filter(f => f.kind === kind);
};

// =============================================================================
// COMPUTED HELPERS
// =============================================================================

/**
 * Get recent memories across all kinds.
 */
export const getRecentMemories = (limit: number): AIMemoryRecord[] => {
  return [...MEMORIES]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);
};

/**
 * Get high-quality examples for a specific kind.
 * Prioritizes memories with positive feedback and high importance.
 */
export const getHighQualityExamples = (
  kind: AIMemoryKind,
  limit: number
): AIMemoryRecord[] => {
  const memoriesOfKind = listMemoriesByKind(kind);

  // Calculate quality score for each
  const withScores = memoriesOfKind.map(memory => {
    const feedbackScore = getFeedbackScore(memory.id);
    // Quality = feedback weight (0.6) + importance weight (0.4)
    const qualityScore = (feedbackScore + 1) / 2 * 0.6 + memory.importanceScore * 0.4;
    return { memory, qualityScore };
  });

  // Sort by quality descending, take top N
  return withScores
    .sort((a, b) => b.qualityScore - a.qualityScore)
    .slice(0, limit)
    .map(ws => ws.memory);
};

/**
 * Get count of memories by kind.
 */
export const getMemoryCountByKind = (): Record<AIMemoryKind, number> => {
  const counts: Partial<Record<AIMemoryKind, number>> = {};
  for (const memory of MEMORIES) {
    counts[memory.kind] = (counts[memory.kind] ?? 0) + 1;
  }
  return counts as Record<AIMemoryKind, number>;
};

/**
 * Get total feedback stats.
 */
export const getFeedbackStats = (): {
  total: number;
  positive: number;
  negative: number;
  neutral: number;
} => {
  const positiveKinds = ['thumbs_up', 'action_taken', 'follow_up', 'copied', 'shared'];
  const negativeKinds = ['thumbs_down', 'action_ignored', 'regenerate', 'dismissed'];

  let positive = 0;
  let negative = 0;
  let neutral = 0;

  for (const fb of FEEDBACK) {
    if (positiveKinds.includes(fb.kind)) {
      positive++;
    } else if (negativeKinds.includes(fb.kind)) {
      negative++;
    } else {
      neutral++;
    }
  }

  return { total: FEEDBACK.length, positive, negative, neutral };
};

// =============================================================================
// IMPORT/EXPORT (for persistence/debugging)
// =============================================================================

/**
 * Export all data as JSON string.
 */
export const exportToJSON = (): string => {
  return JSON.stringify({ memories: MEMORIES, feedback: FEEDBACK }, null, 2);
};

/**
 * Import data from JSON string.
 * Warning: This replaces all current data.
 */
export const importFromJSON = (json: string): void => {
  try {
    const data = JSON.parse(json);
    if (Array.isArray(data.memories) && Array.isArray(data.feedback)) {
      MEMORIES = data.memories;
      FEEDBACK = data.feedback;
      log('Imported', MEMORIES.length, 'memories and', FEEDBACK.length, 'feedback records');
      emitChange();
    } else {
      logWarn('Invalid import data structure');
    }
  } catch (err) {
    logWarn('Failed to import data:', err);
  }
};

/**
 * Clear all data (for testing/reset).
 */
export const clearAll = (): void => {
  MEMORIES = [];
  FEEDBACK = [];
  log('Cleared all memories and feedback');
  emitChange();
};

// =============================================================================
// STATS AND DEBUGGING
// =============================================================================

/**
 * Get summary stats for debugging.
 */
export const getStats = (): {
  totalMemories: number;
  totalFeedback: number;
  memoriesByKind: Record<string, number>;
  feedbackStats: ReturnType<typeof getFeedbackStats>;
  oldestMemory: string | null;
  newestMemory: string | null;
} => {
  const sortedByDate = [...MEMORIES].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  return {
    totalMemories: MEMORIES.length,
    totalFeedback: FEEDBACK.length,
    memoriesByKind: getMemoryCountByKind(),
    feedbackStats: getFeedbackStats(),
    oldestMemory: sortedByDate[0]?.createdAt ?? null,
    newestMemory: sortedByDate[sortedByDate.length - 1]?.createdAt ?? null,
  };
};

// =============================================================================
// STORE OBJECT (for interface compliance)
// =============================================================================

/**
 * Store object that implements AIMemoryStoreInterface.
 * Can be used for dependency injection or testing.
 */
export const aiMemoryStore: AIMemoryStoreInterface = {
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
  subscribe,
  getSnapshot,
};

export default aiMemoryStore;
