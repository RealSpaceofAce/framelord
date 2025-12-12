// =============================================================================
// AI MEMORY ADAPTERS — Wire existing AI systems to the memory store
// =============================================================================
// This file contains adapter functions that create AIMemoryRecord entries
// from the outputs of existing AI systems:
//
// 1. FrameScan reports (text, image, audio)
// 2. Little Lord exchanges
// 3. Psychometric profile updates
// 4. Want tracking penalty calculations
// 5. Application chat turns
// 6. Beta chat turns
// 7. Call analysis (planned - stub)
// 8. Custom test definitions and responses (planned - stub)
//
// Each adapter:
// - Extracts relevant data from the source record
// - Generates appropriate tags and summary
// - Calculates importance score
// - Creates an AIMemoryRecord via aiMemoryStore
//
// Usage: Call these functions after the core AI operation completes.
// =============================================================================

import { aiMemoryStore } from './aiMemoryStore';
import type {
  AIMemoryRecordInput,
  AISystemId,
  AIMemoryKind,
  FrameScanMemoryPayload,
  LittleLordMemoryPayload,
  PsychometricMemoryPayload,
  WantTrackingMemoryPayload,
  CallAnalysisMemoryPayload,
  CustomTestDefinitionPayload,
  CustomTestResponsePayload,
  ApplicationChatMemoryPayload,
  BetaChatMemoryPayload,
} from '../types/aiMemory';
import type { FrameScanReport } from './frameScanReportStore';
import type { PsychometricProfile } from '../types/psychometrics';
import type { WantTrackingPenaltyBreakdown } from '../lib/frameScan/wantTrackingPenalty';

// =============================================================================
// LOGGING
// =============================================================================

const LOG_PREFIX = '[aiMemoryAdapter]';

function log(...args: unknown[]) {
  console.log(LOG_PREFIX, ...args);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Truncate text for summary display.
 */
function truncate(text: string, maxLength: number = 50): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + '...';
}

/**
 * Extract topics from text using simple keyword extraction.
 * This is a placeholder - could be enhanced with NLP later.
 */
function extractTopicsFromText(text: string): string[] {
  const topics: string[] = [];

  // Extract hashtags
  const hashtagMatches = text.match(/#\w+/g);
  if (hashtagMatches) {
    topics.push(...hashtagMatches.map(h => h.slice(1).toLowerCase()));
  }

  // Extract @mentions (just the name part)
  const mentionMatches = text.match(/@\w+/g);
  if (mentionMatches) {
    topics.push(...mentionMatches.map(m => `contact_${m.slice(1).toLowerCase()}`));
  }

  return topics;
}

/**
 * Determine frame strength bucket from score.
 */
function getFrameStrengthBucket(score: number): string {
  if (score >= 80) return 'strong';
  if (score >= 65) return 'solid';
  if (score >= 50) return 'mixed';
  if (score >= 35) return 'weak';
  return 'critical';
}

// =============================================================================
// FRAMESCAN ADAPTER
// =============================================================================

/**
 * Create a memory record from a FrameScan report.
 *
 * Call this after a FrameScan report is created and stored.
 *
 * @param report - The FrameScan report from frameScanReportStore
 * @returns The created AIMemoryRecord
 */
export function addFrameScanReportToMemory(report: FrameScanReport) {
  const contactId = report.subjectContactIds[0] ?? null;
  const strengthBucket = getFrameStrengthBucket(report.score.frameScore);

  // Build tags
  const tags: string[] = [
    report.domain,
    report.modality,
    strengthBucket,
    `score_${Math.round(report.score.frameScore / 10) * 10}`, // Bucket: score_70, score_80, etc.
  ];

  // Add domain-specific tags if available
  if (report.customDomainTags) {
    tags.push(...report.customDomainTags);
  }

  // Extract topics from the report content
  if (report.rawResult?.diagnostics?.primaryPatterns?.[0]) {
    tags.push(report.rawResult.diagnostics.primaryPatterns[0].toLowerCase().replace(/\s+/g, '_'));
  }

  // Build summary
  const summary = `${report.score.frameScore}/100 ${report.domain} scan (${strengthBucket})`;

  // Calculate importance - high scores or very low scores are more important
  const importanceScore =
    report.score.frameScore >= 80 || report.score.frameScore <= 30 ? 0.9 :
    report.score.frameScore >= 70 || report.score.frameScore <= 40 ? 0.7 : 0.5;

  // Build payload - extract correction shifts as strings
  const correctionStrings = report.rawResult?.corrections?.topShifts?.map(s => s.shift) ?? [];

  const payload: FrameScanMemoryPayload = {
    reportId: report.id,
    score: {
      frameScore: report.score.frameScore,
      overallFrame: report.score.overallFrame,
    },
    domain: report.domain,
    modality: report.modality,
    subjectContactIds: report.subjectContactIds,
    corrections: correctionStrings,
  };

  const record: AIMemoryRecordInput = {
    kind: 'framescan_report',
    contactId,
    tenantId: null, // Future: extract from context
    source: { system: 'framescan', key: report.id },
    summary,
    tags: [...new Set(tags)], // Dedupe
    importanceScore,
    rawPayload: payload,
  };

  const memory = aiMemoryStore.addMemory(record);
  log('Added FrameScan report to memory:', memory.id, '| Score:', report.score.frameScore);

  return memory;
}

// =============================================================================
// LITTLE LORD ADAPTER
// =============================================================================

/**
 * Input type for Little Lord exchange adapter.
 */
export interface LittleLordExchangeInput {
  userMessage: string;
  aiReply: string;
  event: { type: string; payload: unknown } | null;
  validation: { isValidWant: boolean; reason: string } | null;
  guardrail: { kind: string; message: string; blocked: boolean } | null;
  targetContactId: string | null;
}

/**
 * Create a memory record from a Little Lord exchange.
 *
 * Call this after runLittleLord() completes and the response is parsed.
 *
 * @param exchange - The user message and AI response
 * @returns The created AIMemoryRecord
 */
export function addLittleLordExchangeToMemory(exchange: LittleLordExchangeInput) {
  // Default to Contact Zero
  const contactId = exchange.targetContactId ?? 'contact_zero';

  // Build tags
  const tags: string[] = ['coaching'];

  if (exchange.event) {
    tags.push(`event_${exchange.event.type.replace('.', '_')}`);
  }

  if (exchange.guardrail) {
    tags.push('guardrail_triggered', `guardrail_${exchange.guardrail.kind}`);
  } else {
    tags.push('clean');
  }

  if (exchange.validation) {
    tags.push(exchange.validation.isValidWant ? 'want_validated' : 'should_rejected');
  }

  // Extract topics from user message
  tags.push(...extractTopicsFromText(exchange.userMessage));

  // Build summary
  const summary = `${truncate(exchange.userMessage, 40)} → ${truncate(exchange.aiReply, 40)}`;

  // Calculate importance - events and guardrails are more important
  const importanceScore =
    exchange.guardrail ? 0.9 :
    exchange.event ? 0.8 :
    exchange.validation ? 0.7 : 0.5;

  // Build payload
  const payload: LittleLordMemoryPayload = {
    userMessage: exchange.userMessage,
    aiReply: exchange.aiReply,
    event: exchange.event,
    validation: exchange.validation,
    guardrail: exchange.guardrail,
    targetContactId: exchange.targetContactId,
  };

  const record: AIMemoryRecordInput = {
    kind: 'little_lord_exchange',
    contactId,
    tenantId: null,
    source: { system: 'little_lord', key: `exc_${Date.now()}` },
    summary,
    tags: [...new Set(tags)],
    importanceScore,
    rawPayload: payload,
  };

  const memory = aiMemoryStore.addMemory(record);
  log('Added Little Lord exchange to memory:', memory.id);

  return memory;
}

// =============================================================================
// PSYCHOMETRIC ADAPTER
// =============================================================================

/**
 * Create a memory record from a psychometric profile update.
 *
 * Call this after a profile is updated in psychometricStore.
 *
 * @param profile - The updated psychometric profile
 * @param updateType - Which profile type was updated
 * @returns The created AIMemoryRecord
 */
export function addPsychometricProfileToMemory(
  profile: PsychometricProfile,
  updateType: 'big_five' | 'mbti' | 'disc' | 'dark_traits' | 'all'
) {
  // Build tags
  const tags: string[] = [`${updateType}_update`, `status_${profile.status}`];

  if (profile.bigFive) {
    tags.push(`bigfive_conf_${profile.bigFive.confidence}`);
  }

  if (profile.mbti?.primaryType) {
    tags.push(`mbti_${profile.mbti.primaryType.toLowerCase()}`);
  }

  if (profile.disc?.type) {
    tags.push(`disc_${profile.disc.type.toLowerCase()}`);
  }

  if (profile.darkTraits && profile.darkTraits.overallRisk !== 'insufficient') {
    tags.push(`risk_${profile.darkTraits.overallRisk}`);
  }

  // Build summary
  let summary = `Profile update: ${profile.status}`;
  if (updateType === 'big_five' && profile.bigFive) {
    summary = `Big Five update (${profile.bigFive.confidence} confidence)`;
  } else if (updateType === 'mbti' && profile.mbti?.primaryType) {
    summary = `MBTI: ${profile.mbti.primaryType} (${profile.mbti.confidence})`;
  } else if (updateType === 'disc' && profile.disc?.type) {
    summary = `DISC: ${profile.disc.type} (${profile.disc.confidence})`;
  } else if (updateType === 'dark_traits' && profile.darkTraits) {
    summary = `Dark Traits: ${profile.darkTraits.overallRisk} risk`;
  }

  // Calculate importance based on status and confidence
  const importanceScore =
    profile.status === 'confirmed' ? 0.9 :
    profile.status === 'speculative' ? 0.6 : 0.3;

  // Build payload
  const payload: PsychometricMemoryPayload = {
    contactId: profile.contactId,
    status: profile.status,
    bigFive: profile.bigFive ? {
      openness: profile.bigFive.openness,
      conscientiousness: profile.bigFive.conscientiousness,
      extraversion: profile.bigFive.extraversion,
      agreeableness: profile.bigFive.agreeableness,
      neuroticism: profile.bigFive.neuroticism,
      confidence: profile.bigFive.confidence,
    } : undefined,
    mbti: profile.mbti ? {
      primaryType: profile.mbti.primaryType,
      candidateTypes: profile.mbti.candidateTypes,
      confidence: profile.mbti.confidence,
    } : undefined,
    disc: profile.disc ? {
      type: profile.disc.type,
      confidence: profile.disc.confidence,
    } : undefined,
    darkTraits: profile.darkTraits ? {
      narcissism: profile.darkTraits.narcissism,
      machiavellianism: profile.darkTraits.machiavellianism,
      psychopathy: profile.darkTraits.psychopathy,
      overallRisk: profile.darkTraits.overallRisk,
      confidence: profile.darkTraits.confidence,
    } : undefined,
  };

  const record: AIMemoryRecordInput = {
    kind: 'psychometric_profile_snapshot',
    contactId: profile.contactId,
    tenantId: null,
    source: { system: 'psychometrics', key: `${profile.contactId}_${Date.now()}` },
    summary,
    tags: [...new Set(tags)],
    importanceScore,
    rawPayload: payload,
  };

  const memory = aiMemoryStore.addMemory(record);
  log('Added psychometric profile to memory:', memory.id, '| Contact:', profile.contactId);

  return memory;
}

// =============================================================================
// WANT TRACKING PENALTY ADAPTER
// =============================================================================

/**
 * Create a memory record from a want tracking penalty calculation.
 *
 * Call this when wantTrackingPenalty is calculated for Contact Zero.
 *
 * @param breakdown - The penalty breakdown from calculateWantTrackingPenalty()
 * @returns The created AIMemoryRecord
 */
export function addWantTrackingPenaltyToMemory(breakdown: WantTrackingPenaltyBreakdown) {
  // Build tags
  const tags: string[] = [];

  if (breakdown.totalPenalty === 0) {
    tags.push('no_penalty', 'compliant');
  } else if (breakdown.totalPenalty <= 5) {
    tags.push('low_penalty');
  } else if (breakdown.totalPenalty <= 10) {
    tags.push('moderate_penalty');
  } else {
    tags.push('high_penalty');
  }

  // Add tags for failing metrics (using metricSlug and finalPenalty from actual type)
  for (const mp of breakdown.metricPenalties) {
    if (mp.finalPenalty > 0) {
      tags.push(`metric_failing_${mp.metricSlug}`);
    }
  }

  // Build summary
  const summary = breakdown.totalPenalty === 0
    ? 'No penalty - all metrics compliant'
    : `Penalty: ${breakdown.totalPenalty} pts (${breakdown.metricPenalties.length} metrics below threshold)`;

  // Calculate importance - high penalties are important
  const importanceScore = breakdown.totalPenalty > 10 ? 0.9 :
    breakdown.totalPenalty > 5 ? 0.7 :
    breakdown.totalPenalty > 0 ? 0.5 : 0.3;

  // Calculate tracked days from metrics (max of all)
  const trackedDays = breakdown.metricPenalties.length > 0
    ? Math.max(...breakdown.metricPenalties.map(m => m.trackedDays))
    : 0;

  // Build payload - map from actual type to memory payload
  const payload: WantTrackingMemoryPayload = {
    calculatedAt: new Date().toISOString(),
    totalPenalty: breakdown.totalPenalty,
    metricPenalties: breakdown.metricPenalties.map(mp => ({
      slug: mp.metricSlug,
      complianceRate: mp.complianceRate,
      penaltyPoints: mp.finalPenalty,
    })),
    lookbackDays: 14, // From LOOKBACK_DAYS constant
    trackedDays,
  };

  const record: AIMemoryRecordInput = {
    kind: 'want_tracking_snapshot',
    contactId: 'contact_zero',
    tenantId: null,
    source: { system: 'wants', key: `penalty_${Date.now()}` },
    summary,
    tags: [...new Set(tags)],
    importanceScore,
    rawPayload: payload,
  };

  const memory = aiMemoryStore.addMemory(record);
  log('Added want tracking penalty to memory:', memory.id, '| Penalty:', breakdown.totalPenalty);

  return memory;
}

// =============================================================================
// APPLICATION CHAT ADAPTER
// =============================================================================

/**
 * Input for application chat turn adapter.
 */
export interface ApplicationChatTurnInput {
  turnIndex: number;
  userMessage: string;
  aiResponse: string;
  conversationPhase?: string;
}

/**
 * Create a memory record from an application chat turn.
 *
 * @param turn - The chat turn data
 * @returns The created AIMemoryRecord
 */
export function addApplicationChatTurnToMemory(turn: ApplicationChatTurnInput) {
  // Simple sentiment detection (placeholder)
  const sentiment = detectSimpleSentiment(turn.aiResponse);

  // Build tags
  const tags: string[] = [
    'screening',
    `sentiment_${sentiment}`,
    `turn_${turn.turnIndex}`,
  ];

  if (turn.conversationPhase) {
    tags.push(`phase_${turn.conversationPhase}`);
  }

  // Build summary
  const summary = `Turn ${turn.turnIndex}: "${truncate(turn.userMessage, 30)}" → "${truncate(turn.aiResponse, 30)}"`;

  // Build payload
  const payload: ApplicationChatMemoryPayload = {
    turnIndex: turn.turnIndex,
    userMessage: turn.userMessage,
    aiResponse: turn.aiResponse,
    sentiment,
    conversationPhase: turn.conversationPhase ?? 'unknown',
  };

  const record: AIMemoryRecordInput = {
    kind: 'application_chat_turn',
    contactId: null, // Applicants don't have contacts yet
    tenantId: null,
    source: { system: 'application_chat', key: `app_turn_${Date.now()}` },
    summary,
    tags,
    importanceScore: 0.4, // Application turns are moderately important
    rawPayload: payload,
  };

  const memory = aiMemoryStore.addMemory(record);
  log('Added application chat turn to memory:', memory.id);

  return memory;
}

// =============================================================================
// BETA CHAT ADAPTER
// =============================================================================

/**
 * Input for beta chat turn adapter.
 */
export interface BetaChatTurnInput {
  turnIndex: number;
  userMessage: string;
  aiResponse: string;
}

/**
 * Create a memory record from a beta chat turn.
 *
 * @param turn - The chat turn data
 * @returns The created AIMemoryRecord
 */
export function addBetaChatTurnToMemory(turn: BetaChatTurnInput) {
  const sentiment = detectSimpleSentiment(turn.aiResponse);

  const tags: string[] = [
    'beta_screening',
    `sentiment_${sentiment}`,
    `turn_${turn.turnIndex}`,
  ];

  const summary = `Beta turn ${turn.turnIndex}: "${truncate(turn.userMessage, 30)}"`;

  const payload: BetaChatMemoryPayload = {
    turnIndex: turn.turnIndex,
    userMessage: turn.userMessage,
    aiResponse: turn.aiResponse,
    sentiment,
  };

  const record: AIMemoryRecordInput = {
    kind: 'beta_chat_turn',
    contactId: null,
    tenantId: null,
    source: { system: 'beta_chat', key: `beta_turn_${Date.now()}` },
    summary,
    tags,
    importanceScore: 0.4,
    rawPayload: payload,
  };

  const memory = aiMemoryStore.addMemory(record);
  log('Added beta chat turn to memory:', memory.id);

  return memory;
}

/**
 * Simple sentiment detection from AI response text.
 * This is a placeholder - could be enhanced with actual sentiment analysis.
 */
function detectSimpleSentiment(
  text: string
): 'positive' | 'neutral' | 'negative' | 'unknown' {
  const lower = text.toLowerCase();

  const positiveIndicators = ['welcome', 'great', 'excellent', 'approved', 'qualified', 'proceed'];
  const negativeIndicators = ['unfortunately', 'sorry', 'rejected', 'not qualified', 'cannot'];

  const positiveCount = positiveIndicators.filter(ind => lower.includes(ind)).length;
  const negativeCount = negativeIndicators.filter(ind => lower.includes(ind)).length;

  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  if (positiveCount > 0 || negativeCount > 0) return 'neutral';
  return 'unknown';
}

// =============================================================================
// CALL ANALYSIS ADAPTER (PLANNED - STUB)
// =============================================================================

/**
 * Input for call analysis adapter.
 * This is a stub for the planned Calls module.
 */
export interface CallAnalysisInput {
  callId: string;
  contactId: string;
  duration: number;
  transcriptSummary: string;
  overallFrameScore: number;
  segments: Array<{
    startTime: number;
    endTime: number;
    severity: 'green' | 'yellow' | 'red';
    issueType: string;
    coachingNote: string;
  }>;
  salesInsights?: string[];
}

/**
 * Create a memory record from call analysis.
 * STUB: Implement when Calls module is built.
 *
 * @param analysis - The call analysis data
 * @returns The created AIMemoryRecord
 */
export function addCallAnalysisToMemory(analysis: CallAnalysisInput) {
  const strengthBucket = getFrameStrengthBucket(analysis.overallFrameScore);

  const tags: string[] = [
    'call_analysis',
    `${strengthBucket}_call`,
    `duration_${analysis.duration > 600 ? 'long' : analysis.duration > 180 ? 'medium' : 'short'}`,
  ];

  // Add tags for red/yellow segments
  const redSegments = analysis.segments.filter(s => s.severity === 'red');
  const yellowSegments = analysis.segments.filter(s => s.severity === 'yellow');

  if (redSegments.length > 0) {
    tags.push('has_red_flags');
    redSegments.forEach(s => tags.push(`issue_${s.issueType.toLowerCase().replace(/\s+/g, '_')}`));
  }

  if (yellowSegments.length > 0) {
    tags.push('has_warnings');
  }

  const durationMinutes = Math.round(analysis.duration / 60);
  const summary = `${durationMinutes}m call: ${analysis.overallFrameScore}/100 (${redSegments.length} issues, ${yellowSegments.length} warnings)`;

  const importanceScore = redSegments.length > 0 ? 0.9 :
    yellowSegments.length > 0 ? 0.7 :
    analysis.overallFrameScore <= 50 ? 0.8 : 0.5;

  const payload: CallAnalysisMemoryPayload = {
    callId: analysis.callId,
    contactId: analysis.contactId,
    duration: analysis.duration,
    overallFrameScore: analysis.overallFrameScore,
    transcriptSummary: analysis.transcriptSummary,
    segments: analysis.segments,
    salesInsights: analysis.salesInsights,
  };

  const record: AIMemoryRecordInput = {
    kind: 'framescan_call_analysis',
    contactId: analysis.contactId,
    tenantId: null,
    source: { system: 'calls', key: analysis.callId },
    summary,
    tags: [...new Set(tags)],
    importanceScore,
    rawPayload: payload,
  };

  const memory = aiMemoryStore.addMemory(record);
  log('Added call analysis to memory:', memory.id, '| Score:', analysis.overallFrameScore);

  return memory;
}

// =============================================================================
// CUSTOM TEST ADAPTERS (PLANNED - STUB)
// =============================================================================

/**
 * Input for custom test definition adapter.
 */
export interface CustomTestDefinitionInput {
  testId: string;
  title: string;
  description: string;
  questionCount: number;
  createdBy: string;
  publicLink?: string;
}

/**
 * Create a memory record when a custom test is defined.
 * STUB: Implement when Custom Tests module is built.
 */
export function addCustomTestDefinitionToMemory(test: CustomTestDefinitionInput) {
  const tags: string[] = [
    'test_definition',
    `questions_${test.questionCount}`,
  ];

  const summary = `Test: "${test.title}" (${test.questionCount} questions)`;

  const payload: CustomTestDefinitionPayload = {
    testId: test.testId,
    title: test.title,
    description: test.description,
    questionCount: test.questionCount,
    createdBy: test.createdBy,
    publicLink: test.publicLink,
  };

  const record: AIMemoryRecordInput = {
    kind: 'custom_test_definition',
    contactId: 'contact_zero', // Tests are owned by Contact Zero
    tenantId: null,
    source: { system: 'custom_tests', key: test.testId },
    summary,
    tags,
    importanceScore: 0.7,
    rawPayload: payload,
  };

  const memory = aiMemoryStore.addMemory(record);
  log('Added custom test definition to memory:', memory.id);

  return memory;
}

/**
 * Input for custom test response adapter.
 */
export interface CustomTestResponseInput {
  testId: string;
  respondentId: string | null;
  contactId: string | null;
  overallScore: number;
  flags: string[];
  answerSummary: string;
}

/**
 * Create a memory record when a custom test response is analyzed.
 * STUB: Implement when Custom Tests module is built.
 */
export function addCustomTestResponseToMemory(response: CustomTestResponseInput) {
  const fitBucket =
    response.overallScore >= 70 ? 'high_fit' :
    response.overallScore >= 50 ? 'medium_fit' : 'low_fit';

  const tags: string[] = [
    'test_response',
    fitBucket,
    response.contactId ? 'linked_contact' : 'anonymous',
    ...response.flags,
  ];

  const summary = `Test response: ${response.overallScore}/100 (${fitBucket.replace('_', ' ')})`;

  const payload: CustomTestResponsePayload = {
    testId: response.testId,
    respondentId: response.respondentId,
    contactId: response.contactId,
    overallScore: response.overallScore,
    flags: response.flags,
    answerSummary: response.answerSummary,
  };

  const record: AIMemoryRecordInput = {
    kind: 'custom_test_response',
    contactId: response.contactId,
    tenantId: null,
    source: { system: 'custom_tests', key: `${response.testId}_${response.respondentId ?? 'anon'}_${Date.now()}` },
    summary,
    tags: [...new Set(tags)],
    importanceScore: response.flags.includes('red_flag') ? 0.9 : 0.5,
    rawPayload: payload,
  };

  const memory = aiMemoryStore.addMemory(record);
  log('Added custom test response to memory:', memory.id);

  return memory;
}
