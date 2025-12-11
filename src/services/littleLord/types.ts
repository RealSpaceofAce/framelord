// =============================================================================
// LITTLE LORD TYPES — TypeScript types for Little Lord invocation
// =============================================================================

import type {
  LittleLordEventTopic,
  LittleLordEventPattern,
  LittleLordEventSeverity,
  FrameHealthSnapshot,
} from '../../types/multiTenant';

// =============================================================================
// VIEW ID TYPE
// =============================================================================

/**
 * The app view ID from which Little Lord was invoked.
 * Used for view-aware behavior gating.
 */
export type LittleLordViewId =
  | 'home'
  | 'contacts'
  | 'contact_dossier'
  | 'notes'
  | 'tasks'
  | 'calendar'
  | 'pipelines'
  | 'projects'
  | 'groups'
  | 'framescan'
  | 'wants'
  | 'want_detail'
  | 'settings'
  | 'landing'
  | 'application'
  | 'beta'
  | 'booking';

// =============================================================================
// REQUEST TYPES
// =============================================================================

/**
 * Contextual payload that can be passed to Little Lord for enriched coaching.
 */
export interface LittleLordContext {
  /** The app view from which Little Lord was invoked */
  viewId?: LittleLordViewId | null;
  /** Current frame health snapshot if available */
  frameHealthSnapshot?: FrameHealthSnapshot | null;
  /** Recent tasks for context */
  recentTasks?: Array<{
    id: string;
    content: string;
    status: string;
    dueDate?: string;
  }> | null;
  /** Recent notes for context */
  recentNotes?: Array<{
    id: string;
    content: string;
    createdAt: string;
  }> | null;
  /** Selected contact if invoked from contact view */
  selectedContactId?: string | null;
  /** Current editor content if invoked from editor */
  editorContent?: string | null;
  /** Active pipeline item if invoked from pipeline */
  activePipelineItemId?: string | null;
  /** Active project if invoked from project */
  activeProjectId?: string | null;
  /** Any other contextual data */
  [key: string]: unknown;
}

/**
 * Complete input to Little Lord invocation.
 */
export interface LittleLordRequest {
  /** Tenant ID for multi-tenant isolation */
  tenantId: string;
  /** User ID making the request */
  userId: string;
  /** The user's message/question */
  userMessage: string;
  /** Optional contextual data */
  recentContext?: LittleLordContext | null;
}

// =============================================================================
// RESPONSE TYPES
// =============================================================================

/**
 * Event data to be emitted when Little Lord detects patterns.
 */
export interface LittleLordEventData {
  /** Event topic category */
  topic: LittleLordEventTopic;
  /** Specific pattern detected */
  pattern: LittleLordEventPattern;
  /** Severity level */
  severity: LittleLordEventSeverity;
  /** Admin-facing summary (1-3 sentences) */
  summary: string;
}

/**
 * Want tracking action to log daily entries.
 */
export interface LittleLordWantTracking {
  /** Date in YYYY-MM-DD format */
  date: string;
  /** Map of metric slug to value */
  entries: Record<string, number | boolean>;
}

/**
 * Psychometric profile update (partial, merged with existing)
 */
export interface LittleLordPsychometricUpdate {
  communicationStyle?: string;
  decisionMakingStyle?: string;
  motivators?: string[];
  values?: string[];
  traits?: string[];
  frameTendencies?: {
    apexSignals?: string[];
    slaveSignals?: string[];
  };
  relationshipDynamics?: string;
  pressureResponse?: string;
  trustMarkers?: {
    builders?: string[];
    breakers?: string[];
  };
  negotiationStyle?: string;
  goals?: string[];
  painPoints?: string[];
}

/**
 * Contact update action - creates note and/or updates psychometric profile.
 */
export interface LittleLordContactUpdate {
  /** ID of the contact to update */
  contactId: string;
  /** Note to create about this contact */
  note?: {
    content: string;
    title?: string;
  } | null;
  /** Psychometric profile updates to merge */
  psychometric?: LittleLordPsychometricUpdate | null;
}

/**
 * Response from Little Lord.
 */
export interface LittleLordResponse {
  /** The reply text shown to the user */
  reply: string;
  /** Optional event data for metrics/analytics */
  event?: LittleLordEventData | null;
  /** Optional want tracking data to log */
  want_tracking?: LittleLordWantTracking | null;
  /** Optional contact update action */
  contact_update?: LittleLordContactUpdate | null;
}

// =============================================================================
// CONVERSATION TYPES
// =============================================================================

/**
 * Role in a Little Lord conversation.
 */
export type LittleLordRole = 'user' | 'assistant';

/**
 * A single message in a Little Lord conversation.
 */
export interface LittleLordMessage {
  role: LittleLordRole;
  content: string;
  timestamp?: string;
}

/**
 * Conversation history for Little Lord.
 */
export interface LittleLordConversation {
  id: string;
  tenantId: string;
  userId: string;
  messages: LittleLordMessage[];
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// INVOCATION SOURCE TYPES
// =============================================================================

/**
 * Where Little Lord was invoked from.
 */
export type LittleLordInvocationSource =
  | 'global_command'
  | 'contact_zero_dashboard'
  | 'notes_panel'
  | 'tasks_view'
  | 'calendar_view'
  | 'contact_dossier'
  | 'interactions_timeline'
  | 'pipeline_view'
  | 'project_view'
  | 'floating_button'
  | 'keyboard_shortcut'
  | 'wants_board'
  | 'want_detail';

/**
 * Metadata about a Little Lord invocation.
 */
export interface LittleLordInvocation {
  source: LittleLordInvocationSource;
  timestamp: string;
  context: LittleLordContext;
}
