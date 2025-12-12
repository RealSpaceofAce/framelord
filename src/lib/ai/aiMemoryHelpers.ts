// =============================================================================
// AI MEMORY HELPERS — Retrieval utilities for self-improving AI layer
// =============================================================================
// These helpers provide convenient ways to retrieve relevant memories for
// AI prompts. They handle the common patterns of context building.
//
// Usage:
//   const context = await getFrameScanContext(contactId);
//   const examples = await getFewShotExamples('framescan_report', 3);
//   const history = await getContactHistory(contactId);
// =============================================================================

import {
  searchMemories,
  getHighQualityExamples,
  listMemoriesForContact,
  listMemoriesByKind,
  getFeedbackScore,
} from '../../services/aiMemoryStore';
import type {
  AIMemoryRecord,
  AIMemoryKind,
  AISystemId,
  FrameScanMemoryPayload,
  LittleLordMemoryPayload,
  PsychometricMemoryPayload,
} from '../../types/aiMemory';

// =============================================================================
// RETRIEVAL HELPERS
// =============================================================================

/**
 * Get relevant FrameScan context for a contact.
 * Returns past scans with positive or neutral feedback, sorted by relevance.
 *
 * @param contactId - The contact to get context for
 * @param limit - Maximum number of memories to return (default: 5)
 * @returns Array of FrameScan memory records
 */
export function getFrameScanContext(
  contactId: string,
  limit: number = 5
): AIMemoryRecord[] {
  const results = searchMemories({
    kind: 'framescan_report',
    contactId,
    excludeNegativeFeedback: true,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    limit,
  });

  return results.map(r => r.memory);
}

/**
 * Get few-shot examples of high-quality AI outputs.
 * Uses feedback scores to select the best examples.
 *
 * @param kind - The memory kind to get examples for
 * @param limit - Maximum number of examples (default: 3)
 * @returns Array of high-quality memory records
 */
export function getFewShotExamples(
  kind: AIMemoryKind,
  limit: number = 3
): AIMemoryRecord[] {
  return getHighQualityExamples(kind, limit);
}

/**
 * Get contact history across all AI systems.
 * Useful for building comprehensive context about a contact.
 *
 * @param contactId - The contact to get history for
 * @param limit - Maximum number of memories (default: 10)
 * @returns Array of memory records sorted by date
 */
export function getContactHistory(
  contactId: string,
  limit: number = 10
): AIMemoryRecord[] {
  return listMemoriesForContact(contactId).slice(0, limit);
}

/**
 * Get recent Little Lord exchanges for conversation continuity.
 *
 * @param contactId - The contact context (optional)
 * @param limit - Maximum number of exchanges (default: 5)
 * @returns Array of Little Lord memory records
 */
export function getRecentLittleLordExchanges(
  contactId?: string,
  limit: number = 5
): AIMemoryRecord[] {
  if (contactId) {
    return searchMemories({
      kind: 'little_lord_exchange',
      contactId,
      sortBy: 'createdAt',
      sortOrder: 'desc',
      limit,
    }).map(r => r.memory);
  }

  return listMemoriesByKind('little_lord_exchange').slice(0, limit);
}

/**
 * Get the latest psychometric profile snapshot for a contact.
 *
 * @param contactId - The contact to get profile for
 * @returns The latest profile memory or null
 */
export function getLatestPsychometricSnapshot(
  contactId: string
): AIMemoryRecord | null {
  const results = searchMemories({
    kind: 'psychometric_profile_snapshot',
    contactId,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    limit: 1,
  });

  return results.length > 0 ? results[0].memory : null;
}

// =============================================================================
// CONTEXT BUILDERS
// =============================================================================

/**
 * Build a comprehensive context object for a contact.
 * Aggregates data from all AI systems for rich prompt context.
 *
 * @param contactId - The contact to build context for
 * @returns Context object with all available data
 */
export function buildContactContext(contactId: string): {
  frameScanHistory: FrameScanMemoryPayload[];
  littleLordHistory: LittleLordMemoryPayload[];
  psychometricProfile: PsychometricMemoryPayload | null;
  totalInteractions: number;
  averageFrameScore: number | null;
  topTags: string[];
} {
  // Get FrameScan history
  const frameScanMemories = getFrameScanContext(contactId, 10);
  const frameScanHistory = frameScanMemories.map(
    m => m.rawPayload as FrameScanMemoryPayload
  );

  // Get Little Lord history
  const littleLordMemories = getRecentLittleLordExchanges(contactId, 10);
  const littleLordHistory = littleLordMemories.map(
    m => m.rawPayload as LittleLordMemoryPayload
  );

  // Get psychometric profile
  const psychometricMemory = getLatestPsychometricSnapshot(contactId);
  const psychometricProfile = psychometricMemory
    ? (psychometricMemory.rawPayload as PsychometricMemoryPayload)
    : null;

  // Calculate aggregate stats
  const allMemories = listMemoriesForContact(contactId);
  const totalInteractions = allMemories.length;

  // Calculate average frame score from FrameScan history
  let averageFrameScore: number | null = null;
  if (frameScanHistory.length > 0) {
    const total = frameScanHistory.reduce((sum, fs) => sum + fs.score.frameScore, 0);
    averageFrameScore = Math.round(total / frameScanHistory.length);
  }

  // Extract top tags across all memories
  const tagCounts: Record<string, number> = {};
  for (const memory of allMemories) {
    for (const tag of memory.tags) {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    }
  }
  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([tag]) => tag);

  return {
    frameScanHistory,
    littleLordHistory,
    psychometricProfile,
    totalInteractions,
    averageFrameScore,
    topTags,
  };
}

/**
 * Build a minimal context string for prompts.
 * Formats key insights into a concise text block.
 *
 * @param contactId - The contact to build context for
 * @returns Formatted context string
 */
export function buildContextString(contactId: string): string {
  const context = buildContactContext(contactId);
  const lines: string[] = [];

  lines.push(`## Contact Context`);
  lines.push(`Total AI interactions: ${context.totalInteractions}`);

  if (context.averageFrameScore !== null) {
    lines.push(`Average FrameScore: ${context.averageFrameScore}/100`);
  }

  if (context.topTags.length > 0) {
    lines.push(`Key themes: ${context.topTags.join(', ')}`);
  }

  if (context.psychometricProfile) {
    const pp = context.psychometricProfile;
    lines.push(`\n### Psychometric Profile`);
    if (pp.mbti?.primaryType) {
      lines.push(`MBTI: ${pp.mbti.primaryType} (${pp.mbti.confidence} confidence)`);
    }
    if (pp.disc?.type) {
      lines.push(`DISC: ${pp.disc.type} (${pp.disc.confidence} confidence)`);
    }
    if (pp.darkTraits) {
      lines.push(`Dark Traits Risk: ${pp.darkTraits.overallRisk}`);
    }
  }

  if (context.frameScanHistory.length > 0) {
    lines.push(`\n### Recent FrameScans`);
    for (const fs of context.frameScanHistory.slice(0, 3)) {
      lines.push(`- Score: ${fs.score.frameScore}/100 (${fs.score.overallFrame}) - ${fs.domain}`);
    }
  }

  return lines.join('\n');
}

// =============================================================================
// FEEDBACK-AWARE RETRIEVAL
// =============================================================================

/**
 * Get memories that received positive feedback for training examples.
 * These are the "gold standard" outputs that should be emulated.
 *
 * @param kind - The memory kind to filter by (optional)
 * @param limit - Maximum number of memories (default: 10)
 * @returns Array of positively-rated memory records
 */
export function getPositiveFeedbackMemories(
  kind?: AIMemoryKind,
  limit: number = 10
): AIMemoryRecord[] {
  const results = searchMemories({
    kind,
    onlyPositiveFeedback: true,
    sortBy: 'feedbackScore',
    sortOrder: 'desc',
    limit,
  });

  return results.map(r => r.memory);
}

/**
 * Get memories that received corrections from users.
 * Useful for understanding common mistakes and improving prompts.
 *
 * @param system - The AI system to filter by (optional)
 * @param limit - Maximum number of memories (default: 10)
 * @returns Array of memory IDs with their correction feedback
 */
export function getCorrectedOutputs(
  system?: AISystemId,
  limit: number = 10
): Array<{ memoryId: string; feedbackScore: number }> {
  // Get all memories with negative feedback
  const results = searchMemories({
    system,
    sortBy: 'feedbackScore',
    sortOrder: 'asc',
    limit: limit * 2, // Get extra to filter
  });

  // Filter to only those with negative scores
  return results
    .filter(r => r.feedbackScore < 0)
    .slice(0, limit)
    .map(r => ({
      memoryId: r.memory.id,
      feedbackScore: r.feedbackScore,
    }));
}

// =============================================================================
// SYSTEM-SPECIFIC RETRIEVERS
// =============================================================================

/**
 * Get memories from a specific AI system.
 *
 * @param system - The AI system ID
 * @param limit - Maximum number of memories (default: 10)
 * @returns Array of memory records from that system
 */
export function getMemoriesBySystem(
  system: AISystemId,
  limit: number = 10
): AIMemoryRecord[] {
  const results = searchMemories({
    system,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    limit,
  });

  return results.map(r => r.memory);
}

/**
 * Get memories tagged with a specific tag.
 *
 * @param tag - The tag to search for
 * @param limit - Maximum number of memories (default: 10)
 * @returns Array of memory records with that tag
 */
export function getMemoriesByTag(
  tag: string,
  limit: number = 10
): AIMemoryRecord[] {
  const results = searchMemories({
    tag,
    sortBy: 'createdAt',
    sortOrder: 'desc',
    limit,
  });

  return results.map(r => r.memory);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  getFrameScanContext,
  getFewShotExamples,
  getContactHistory,
  getRecentLittleLordExchanges,
  getLatestPsychometricSnapshot,
  buildContactContext,
  buildContextString,
  getPositiveFeedbackMemories,
  getCorrectedOutputs,
  getMemoriesBySystem,
  getMemoriesByTag,
};
