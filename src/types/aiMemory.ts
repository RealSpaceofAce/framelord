// =============================================================================
// AI MEMORY TYPES — Core types for the self-improving AI layer
// =============================================================================
// This file defines the data structures for:
// 1. AIMemoryRecord - Stored AI interactions and outputs
// 2. AIFeedbackRecord - User feedback on AI outputs
// 3. Supporting types for retrieval and search
//
// These types power the unified memory system that allows FrameLord's AI
// to learn from past interactions and improve over time.
// =============================================================================

// =============================================================================
// SYSTEM IDENTIFIERS
// =============================================================================

/**
 * All AI systems that can create memories.
 */
export type AISystemId =
  | 'framescan'
  | 'little_lord'
  | 'psychometrics'
  | 'wants'
  | 'calls'
  | 'custom_tests'
  | 'application_chat'
  | 'beta_chat'
  | 'doctrine'
  | 'policy';

/**
 * Types of AI memory records.
 * Each kind represents a different type of AI interaction or output.
 */
export type AIMemoryKind =
  // FrameScan memories
  | 'framescan_report'           // Text/image/audio frame analysis
  | 'framescan_call_analysis'    // Call transcript analysis (planned)

  // Little Lord memories
  | 'little_lord_exchange'       // User message + AI response pair

  // Psychometric memories
  | 'psychometric_profile_snapshot'  // Profile update for a contact

  // Want tracking memories
  | 'want_tracking_snapshot'     // Compliance calculation result

  // Custom test memories (planned)
  | 'custom_test_definition'     // User-created diagnostic test
  | 'custom_test_response'       // Response to a custom test

  // Application/Beta chat memories
  | 'application_chat_turn'      // Coaching application conversation
  | 'beta_chat_turn'             // Beta screening conversation

  // System memories
  | 'doctrine_update'            // Change to frame doctrine
  | 'policy_decision';           // Policy rule application result

// =============================================================================
// AI MEMORY RECORD
// =============================================================================

/**
 * Source information for a memory record.
 * Tracks which system created this memory and the original record ID.
 */
export interface AIMemorySource {
  /** The AI system that created this memory */
  system: AISystemId;
  /** The original record ID in the source store (e.g., FrameScan report ID) */
  key: string;
}

/**
 * Core memory record storing an AI interaction or output.
 *
 * Every significant AI interaction creates one of these records.
 * They are stored in aiMemoryStore and used for:
 * - Retrieving relevant past experiences
 * - Providing few-shot examples in prompts
 * - Learning from feedback over time
 */
export interface AIMemoryRecord {
  /** Unique identifier for this memory */
  id: string;

  /** Type of memory (determines structure of rawPayload) */
  kind: AIMemoryKind;

  /** Link to contact spine (Contact Zero, another contact, or null for anonymous) */
  contactId: string | null;

  /** Future: tenant ID for multi-tenant isolation */
  tenantId: string | null;

  /** ISO timestamp when this memory was created */
  createdAt: string;

  /** Where this memory came from */
  source: AIMemorySource;

  /** Human-readable summary (for UI and quick retrieval) */
  summary: string;

  /** Searchable tags (domain, outcome, topics, etc.) */
  tags: string[];

  /** Priority for retrieval (0 to 1, higher = more important) */
  importanceScore: number;

  /** Future: vector embedding for semantic search */
  embeddingVector?: number[];

  /** Full structured payload at creation time (type depends on kind) */
  rawPayload: unknown;
}

// =============================================================================
// AI FEEDBACK TYPES
// =============================================================================

/**
 * Types of feedback that can be provided on AI outputs.
 */
export type AIFeedbackKind =
  // Explicit feedback
  | 'thumbs_up'          // User explicitly approved
  | 'thumbs_down'        // User explicitly disapproved
  | 'correction'         // User provided corrected output
  | 'comment'            // User added a comment/note

  // Implicit feedback (tracked automatically)
  | 'follow_up'          // User asked follow-up (implicit positive)
  | 'user_override'      // User manually changed AI output
  | 'user_edit'          // User edited AI-generated content
  | 'action_taken'       // User took suggested action (implicit positive)
  | 'action_ignored'     // User ignored suggestion (implicit negative)
  | 'regenerate'         // User asked to regenerate (implicit negative)
  | 'copied'             // User copied AI text (implicit positive)
  | 'shared'             // User shared/exported (implicit positive)
  | 'dismissed';         // User immediately dismissed (implicit negative)

/**
 * Feedback record for an AI output.
 *
 * Feedback is used to:
 * 1. Rank memories for retrieval (prefer positive, avoid negative)
 * 2. Select few-shot examples (prefer highly-rated)
 * 3. Track AI quality over time
 */
export interface AIFeedbackRecord {
  /** Unique identifier for this feedback */
  id: string;

  /** Which memory this feedback is about (null if not tied to specific memory) */
  memoryId: string | null;

  /** Contact context for this feedback */
  contactId: string | null;

  /** ISO timestamp when feedback was created */
  createdAt: string;

  /** Type of feedback */
  kind: AIFeedbackKind;

  /** Numeric rating (1-5) for detailed ratings, null for boolean feedback */
  rating: number | null;

  /** User's optional comment/explanation */
  comment: string | null;

  /** For 'correction' type: the user's corrected output */
  correctedOutput?: unknown;

  /** Where this feedback came from */
  source: AIMemorySource;
}

// =============================================================================
// SEARCH AND RETRIEVAL TYPES
// =============================================================================

/**
 * Options for searching memories.
 */
export interface AIMemorySearchOptions {
  /** Filter by memory kind */
  kind?: AIMemoryKind;

  /** Filter by contact ID */
  contactId?: string;

  /** Filter by tenant ID */
  tenantId?: string;

  /** Filter by source system */
  system?: AISystemId;

  /** Filter by tag (any match) */
  tag?: string;

  /** Filter by multiple tags (all must match) */
  tags?: string[];

  /** Minimum importance score */
  minImportance?: number;

  /** Created after this date */
  createdAfter?: string;

  /** Created before this date */
  createdBefore?: string;

  /** Only include memories with positive feedback */
  onlyPositiveFeedback?: boolean;

  /** Exclude memories with negative feedback */
  excludeNegativeFeedback?: boolean;

  /** Maximum number of results */
  limit?: number;

  /** Skip first N results (for pagination) */
  offset?: number;

  /** Sort field */
  sortBy?: 'createdAt' | 'importanceScore' | 'feedbackScore';

  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
}

/**
 * Result of a memory search with computed scores.
 */
export interface AIMemorySearchResult {
  /** The memory record */
  memory: AIMemoryRecord;

  /** Computed relevance score for this search (0-1) */
  relevanceScore: number;

  /** Computed feedback score (-1 to 1) */
  feedbackScore: number;
}

// =============================================================================
// MEMORY CREATION HELPERS
// =============================================================================

/**
 * Input for creating a new memory record.
 * ID and createdAt are generated automatically.
 */
export type AIMemoryRecordInput = Omit<AIMemoryRecord, 'id' | 'createdAt'>;

/**
 * Input for creating a new feedback record.
 * ID and createdAt are generated automatically.
 */
export type AIFeedbackRecordInput = Omit<AIFeedbackRecord, 'id' | 'createdAt'>;

// =============================================================================
// PAYLOAD TYPE HELPERS
// =============================================================================

/**
 * Type guard to narrow rawPayload based on memory kind.
 * Usage: if (isFrameScanMemory(memory)) { memory.rawPayload.score... }
 */
export function isMemoryOfKind<K extends AIMemoryKind>(
  memory: AIMemoryRecord,
  kind: K
): memory is AIMemoryRecord & { kind: K } {
  return memory.kind === kind;
}

// =============================================================================
// FRAMESCAN MEMORY PAYLOAD
// =============================================================================

/**
 * Expected payload structure for framescan_report memories.
 * This is the rawPayload when kind === 'framescan_report'.
 */
export interface FrameScanMemoryPayload {
  reportId: string;
  score: {
    frameScore: number;
    overallFrame: string;
  };
  domain: string;
  modality: 'text' | 'image' | 'mixed';
  subjectContactIds: string[];
  inputText?: string;
  corrections?: string[];
}

// =============================================================================
// LITTLE LORD MEMORY PAYLOAD
// =============================================================================

/**
 * Expected payload structure for little_lord_exchange memories.
 */
export interface LittleLordMemoryPayload {
  userMessage: string;
  aiReply: string;
  event: {
    type: string;
    payload: unknown;
  } | null;
  validation: {
    isValidWant: boolean;
    reason: string;
  } | null;
  guardrail: {
    kind: string;
    message: string;
    blocked: boolean;
  } | null;
  targetContactId: string | null;
}

// =============================================================================
// PSYCHOMETRIC MEMORY PAYLOAD
// =============================================================================

/**
 * Expected payload structure for psychometric_profile_snapshot memories.
 */
export interface PsychometricMemoryPayload {
  contactId: string;
  status: string;
  bigFive?: {
    openness: number;
    conscientiousness: number;
    extraversion: number;
    agreeableness: number;
    neuroticism: number;
    confidence: string;
  };
  mbti?: {
    primaryType: string | null;
    candidateTypes: string[];
    confidence: string;
  };
  disc?: {
    type: string | null;
    confidence: string;
  };
  darkTraits?: {
    narcissism: number;
    machiavellianism: number;
    psychopathy: number;
    overallRisk: string;
    confidence: string;
  };
}

// =============================================================================
// WANT TRACKING MEMORY PAYLOAD
// =============================================================================

/**
 * Expected payload structure for want_tracking_snapshot memories.
 */
export interface WantTrackingMemoryPayload {
  calculatedAt: string;
  totalPenalty: number;
  metricPenalties: Array<{
    slug: string;
    complianceRate: number;
    penaltyPoints: number;
  }>;
  lookbackDays: number;
  trackedDays: number;
}

// =============================================================================
// CALL ANALYSIS MEMORY PAYLOAD (PLANNED)
// =============================================================================

/**
 * Expected payload structure for framescan_call_analysis memories.
 */
export interface CallAnalysisMemoryPayload {
  callId: string;
  contactId: string;
  duration: number;
  overallFrameScore: number;
  transcriptSummary: string;
  segments: Array<{
    startTime: number;
    endTime: number;
    severity: 'green' | 'yellow' | 'red';
    issueType: string;
    coachingNote: string;
  }>;
  salesInsights?: string[];
}

// =============================================================================
// CUSTOM TEST MEMORY PAYLOADS (PLANNED)
// =============================================================================

/**
 * Expected payload structure for custom_test_definition memories.
 */
export interface CustomTestDefinitionPayload {
  testId: string;
  title: string;
  description: string;
  questionCount: number;
  createdBy: string;
  publicLink?: string;
}

/**
 * Expected payload structure for custom_test_response memories.
 */
export interface CustomTestResponsePayload {
  testId: string;
  respondentId: string | null;
  contactId: string | null;
  overallScore: number;
  flags: string[];
  answerSummary: string;
}

// =============================================================================
// APPLICATION/BETA CHAT MEMORY PAYLOADS
// =============================================================================

/**
 * Expected payload structure for application_chat_turn memories.
 */
export interface ApplicationChatMemoryPayload {
  turnIndex: number;
  userMessage: string;
  aiResponse: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'unknown';
  conversationPhase: string;
}

/**
 * Expected payload structure for beta_chat_turn memories.
 */
export interface BetaChatMemoryPayload {
  turnIndex: number;
  userMessage: string;
  aiResponse: string;
  sentiment: 'positive' | 'neutral' | 'negative' | 'unknown';
}

// =============================================================================
// POLICY DECISION MEMORY PAYLOAD
// =============================================================================

/**
 * Expected payload structure for policy_decision memories.
 */
export interface PolicyDecisionPayload {
  policyId: string;
  ruleName: string;
  ruleType: 'must' | 'should' | 'prefer' | 'avoid' | 'never';
  decision: 'applied' | 'skipped' | 'overridden';
  context: Record<string, unknown>;
  reason?: string;
}

// =============================================================================
// STORE INTERFACE
// =============================================================================

/**
 * Interface for the AI Memory Store.
 * Defines all operations available for managing memories and feedback.
 *
 * This interface is implemented by aiMemoryStore.ts and can later be
 * backed by Supabase without changing calling code.
 */
export interface AIMemoryStoreInterface {
  // Memory operations
  addMemory(record: AIMemoryRecordInput): AIMemoryRecord;
  getMemoryById(id: string): AIMemoryRecord | undefined;
  listMemoriesForContact(contactId: string): AIMemoryRecord[];
  listMemoriesByKind(kind: AIMemoryKind): AIMemoryRecord[];
  searchMemories(options: AIMemorySearchOptions): AIMemorySearchResult[];
  deleteMemory(id: string): boolean;

  // Feedback operations
  addFeedback(record: AIFeedbackRecordInput): AIFeedbackRecord;
  listFeedbackForMemory(memoryId: string): AIFeedbackRecord[];
  getFeedbackScore(memoryId: string): number;

  // Computed helpers
  getRecentMemories(limit: number): AIMemoryRecord[];
  getHighQualityExamples(kind: AIMemoryKind, limit: number): AIMemoryRecord[];

  // Subscription (for React integration)
  subscribe(listener: () => void): () => void;
  getSnapshot(): { memories: AIMemoryRecord[]; feedback: AIFeedbackRecord[] };
}
