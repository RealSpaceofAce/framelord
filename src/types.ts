// =============================================================================
// FRAMELORD CRM — CORE TYPES
// =============================================================================
// The Contact is the canonical spine. All other entities (Notes, Tasks,
// Interactions) attach to a Contact via contactId. No orphan data.
// =============================================================================

// --- FRAME METRICS ---

export interface ContactFrameMetrics {
  currentScore: number;           // 0-100
  trend: 'up' | 'down' | 'flat';
  lastScanAt: string | null;      // ISO timestamp
}

// --- PSYCHOMETRIC PROFILE ---

/**
 * Psychometric profile for a contact.
 * Captured through conversation with Little Lord and FrameScan analysis.
 */
export interface ContactPsychometricProfile {
  /** Communication style (direct, indirect, analytical, emotional) */
  communicationStyle?: string;
  /** Decision-making pattern (quick, deliberate, consensus-seeking) */
  decisionMakingStyle?: string;
  /** Primary motivators (achievement, affiliation, power, security) */
  motivators?: string[];
  /** Values and priorities */
  values?: string[];
  /** Personality traits observed */
  traits?: string[];
  /** Frame tendencies (Apex vs Slave signals observed) */
  frameTendencies?: {
    apexSignals?: string[];
    slaveSignals?: string[];
  };
  /** Relationship dynamics (how they relate to authority, peers, subordinates) */
  relationshipDynamics?: string;
  /** Pressure responses (how they behave under stress) */
  pressureResponse?: string;
  /** Trust markers (what builds/breaks trust with them) */
  trustMarkers?: {
    builders?: string[];
    breakers?: string[];
  };
  /** Negotiation style and tendencies */
  negotiationStyle?: string;
  /** Goals and aspirations mentioned */
  goals?: string[];
  /** Pain points and frustrations */
  painPoints?: string[];
  /** Last updated timestamp */
  updatedAt?: string;
  /** Source notes (note IDs that contributed to this profile) */
  sourceNoteIds?: string[];
}

// --- CONTACT (THE SPINE) ---

export type RelationshipDomain = 'business' | 'personal' | 'hybrid';
export type ContactStatus = 'active' | 'dormant' | 'blocked' | 'testing' | 'archived';

/** Engagement event types for contact timeline */
export type EngagementEventType = 'note-mention' | 'interaction' | 'task-created' | 'contact-created';

/** Engagement event for contact timeline */
export interface EngagementEvent {
  id: string;
  type: EngagementEventType;
  noteId?: string;                // For note-mention events
  interactionId?: string;         // For interaction events
  taskId?: string;                // For task events
  timestamp: string;              // ISO timestamp
  description?: string;           // Human-readable description
}

/**
 * Contact profile gathered during intake assessment.
 * Stored on Contact Zero to personalize the system.
 * Extended to capture full Tier 1 intake data.
 */
export interface ContactIntakeProfile {
  /** Brief bio statement from intake (t1_identity) */
  bio?: string;
  /** Work context description from intake (t1_work_context) */
  workContext?: string;
  /** Primary vision/outcome from want discovery (t1_want_discovery_1) */
  primaryVision?: string;
  /** List of wants/outcomes from want discovery (t1_want_discovery_2) */
  wants?: string[];
  /** Key constraint or blocker (t1_constraint) */
  keyConstraint?: string;
  /** Additional notes from closing question (t1_closing) */
  notes?: string;
  /** Self-rated frame score 1-10 (t1_self_rating) */
  selfRating?: number;
  /** When this profile was created */
  createdAt?: string;
  /** When this profile was last updated */
  updatedAt?: string;
}

export interface Contact {
  id: string;
  fullName: string;
  /**
   * Avatar URL can be either:
   * - An external URL (http/https), or
   * - A Data URL (data:image/...) from file upload
   */
  avatarUrl?: string;
  email?: string;
  phone?: string;
  relationshipDomain: RelationshipDomain;
  relationshipRole: string;       // e.g., "prospect", "client", "friend", "manager"
  status: ContactStatus;
  frame: ContactFrameMetrics;
  lastContactAt?: string | null;  // ISO timestamp
  nextActionAt?: string | null;   // ISO timestamp
  tags: string[];
  // Richer profile fields
  company?: string;
  title?: string;                 // job title or role label
  location?: string;
  linkedinUrl?: string;
  xHandle?: string;               // X / Twitter handle
  // CRM Linkage - @mention system
  mentionedInNotes: string[];     // Note IDs where this contact is @mentioned
  engagementEvents: EngagementEvent[]; // Timeline of engagement events
  linkedTopics: string[];         // Topic IDs associated with this contact
  // Psychometric profile (populated by Little Lord observations)
  psychometricProfile?: ContactPsychometricProfile;
  // Intake-gathered profile (populated during intake assessment)
  contactProfile?: ContactIntakeProfile;
  // Initial wants extracted from intake want discovery questions
  initialWants?: string[];
  // Intake gateway - timestamp of first Tier 1 completion (null means not completed)
  firstIntakeCompletedAt?: string | null;
  // Personal intel - user-editable intelligence about this contact
  personalIntel?: ContactPersonalIntel;
}

/**
 * Personal intelligence about a contact.
 * User-editable fields for capturing insights about how to interact with them.
 */
export interface ContactPersonalIntel {
  /** How they communicate (style, pace, preferences) */
  howTheySpeak?: string;
  /** What to watch for (triggers, sensitivities) */
  watchFor?: string;
  /** What they want (goals, desires) */
  whatTheyWant?: string;
  /** Additional notes or observations */
  notes?: string;
  /** Last updated timestamp */
  updatedAt?: string;
}

/** Contact Zero is the user's own record */
export type ContactZero = Contact & { id: 'contact_zero' };

// --- NOTE (SYNCS TO CONTACT) ---

export type NoteAttachmentType = 'image' | 'audio' | 'file';

export interface NoteAttachment {
  id: string;
  type: NoteAttachmentType;
  dataUrl: string;                // Data URL for the attachment
  filename?: string;
  mimeType?: string;
  createdAt: string;              // ISO timestamp
  transcript?: string;            // For audio: transcribed text (stub for future integration)
}

export interface NoteEntry {
  id: string;
  text: string;                   // The bullet point text content
  attachments: NoteAttachment[];  // Media embedded in this entry
  createdAt: string;              // ISO timestamp
}

// Note classification type
export type NoteKind = 'log' | 'note' | 'system';

// Note view mode
export type NoteViewMode = 'doc' | 'canvas';

export interface Note {
  // Core identification
  id: string;
  title: string | null;           // null for untitled notes

  // BlockSuite document (unified storage for text AND canvas)
  blocksuiteDocId?: string;       // BlockSuite Doc ID (optional during migration)
  blocksuiteSerialized?: unknown; // Optional serialized snapshot for backup

  // Timestamps
  createdAt: string;              // ISO timestamp
  updatedAt: string;              // ISO timestamp (now required)

  // Authorship (Contact Zero centrality)
  authorContactId: string;        // ALWAYS Contact Zero for user-created notes

  // Contact associations
  targetContactIds: string[];     // Contacts mentioned or attached to this note

  // Note classification
  kind: NoteKind;                 // log = daily journal, note = general, system = auto-generated
  dateKey: string | null;         // 'YYYY-MM-DD' for log entries, null otherwise

  // Organization
  folderId: string | null;        // PARA folder or custom folder
  isInbox: boolean;               // Quick capture inbox
  topics: string[];               // Topic IDs (from #hashtag syntax)
  tags: string[];                 // User tags
  mentions: string[];             // Contact IDs mentioned via @mention

  // Display preferences
  preferredView: NoteViewMode;    // Last used view mode
  isPinnedHome: boolean;          // Pin to home (deprecated, keep for migration)
  isPinned: boolean;              // Pin within view
  icon?: string;                  // Emoji icon for the note

  // Archive
  isArchived: boolean;

  // Sync tracking
  sync_version: number;           // Incremented on each update for conflict resolution
  last_synced_at?: string;        // ISO timestamp of last successful sync

  // Legacy fields (for backwards compatibility during migration)
  content?: string;               // OLD plain text content
  entries?: NoteEntry[];          // OLD bullet entries
  attachments?: NoteAttachment[]; // OLD direct attachments
  contactId?: string;             // OLD single contact link (who note is ABOUT)
  targetContactId?: string;       // OLD explicit target contact
  mentionedContactIds?: string[]; // OLD contacts mentioned via @mention
}

/**
 * NoteLink - bi-directional note graph edges
 * sourceNoteId -> targetNoteId represents a [[Target]] link inside Source content
 */
export interface NoteLink {
  sourceNoteId: string;
  targetNoteId: string;
}

// --- FOLDER (PARA-STYLE ORGANIZATION) ---

/**
 * Folder - PARA-style organization for notes
 * Default folders: Projects, Areas, Resources, Archive
 */
export interface Folder {
  id: string;
  name: string;
  parentId: string | null;        // For nested folders
  createdAt: string;              // ISO timestamp
  updatedAt: string;              // ISO timestamp
  order: number;                  // Display order
  color?: string;                 // Optional color tag
  icon?: string;                  // Optional icon
}

/**
 * Default folder IDs (constants)
 * These folders are created automatically and cannot be deleted
 */
export const DEFAULT_FOLDERS = {
  PROJECTS: 'folder-projects',
  AREAS: 'folder-areas',
  RESOURCES: 'folder-resources',
  ARCHIVE: 'folder-archive',
} as const;

export type DefaultFolderId = typeof DEFAULT_FOLDERS[keyof typeof DEFAULT_FOLDERS];

// --- DAILY NOTES & STANDALONE PAGES (OBSIDIAN-STYLE) ---

/**
 * DailyNote - Daily journal entry, bullet-point based
 * Can reference contacts via [[Contact Name]] syntax
 * Can be standalone or linked to a specific date
 */
export interface DailyNote {
  id: string;
  date: string;                   // YYYY-MM-DD format
  authorContactId: string;        // Typically CONTACT_ZERO
  content: string;                // Markdown with bullet points and [[links]]
  createdAt: string;              // ISO timestamp
  updatedAt?: string | null;
}

/**
 * NotePage - Standalone note page (like Obsidian pages)
 * Created when [[Page Name]] is referenced but doesn't exist yet
 * Supports bi-directional linking
 */
export interface NotePage {
  id: string;
  title: string;                  // Page title (unique)
  slug: string;                   // URL-safe slug
  content: string;                // Markdown content
  authorContactId: string;
  linkedFromIds: string[];        // IDs of notes/pages that link here
  linkedToIds: string[];          // IDs of notes/pages this links to
  createdAt: string;
  updatedAt?: string | null;
}

// --- TOPIC (HASHTAG SYSTEM) ---

export interface Topic {
  id: string;
  label: string;                  // Human-facing name, e.g. "Sales"
  slug: string;                   // Normalized key, e.g. "sales"
  createdAt: string;              // ISO timestamp
  updatedAt: string;              // ISO timestamp
  // CRM Linkage
  noteIds: string[];              // Notes that use this topic
  contactIds: string[];           // Contacts frequently co-mentioned with this topic
}

export interface NoteTopic {
  noteId: string;
  topicId: string;
}

// --- INTERACTION ---

export type InteractionType = 'call' | 'meeting' | 'message' | 'email' | 'dm' | 'other';
export type InteractionDirection = 'inbound' | 'outbound' | 'outbound_draft';
export type InteractionSource = 'quick_action' | 'manual' | 'system';

export interface InteractionAttachment {
  id: string;
  interactionId: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;                 // Data URL (data:image/... or data:application/pdf;base64,...)
  createdAt: string;               // ISO timestamp
}

export interface Interaction {
  id: string;
  contactId: string;              // REQUIRED — who the interaction was WITH
  authorContactId: string;        // REQUIRED — who performed/logged it (typically CONTACT_ZERO)
  type: InteractionType;
  occurredAt: string;             // ISO timestamp
  summary: string;
  direction?: InteractionDirection;  // Direction of the interaction
  source?: InteractionSource;        // How the interaction was logged
  isNotable?: boolean;               // Flag for important interactions
  affectsFrame?: boolean;            // Whether this interaction affects frame dynamics
  attachments?: InteractionAttachment[];
}

// --- TASK ---

export type TaskStatus = 'open' | 'done' | 'blocked';

export interface Task {
  id: string;
  contactId: string;              // REQUIRED — who the task is ABOUT
  title: string;
  dueAt?: string | null;          // ISO timestamp
  status: TaskStatus;
  createdAt: string;              // ISO timestamp
  wantId?: string | null;         // Optional link to a Want (sovereign desire)
}

// =============================================================================
// LEGACY TYPES (kept for backward compatibility with existing components)
// =============================================================================

export interface FrameAnalysisResult {
  score: number;
  developing_frame?: boolean;
  subscores: {
    authority: number;
    magnetism: number;
    boundaries: number;
    energy: number;
    clarity: number;
    emotional_tone: number;
    brand_congruence: number;
    sales_strength: number;
  };
  critical_signal: {
    title: string;
    description: string;
    quotes: string[];
  };
  corrections: string[];
  transcription?: string;
}

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  timestamp: number;
}

// --- CONTAINERS (Organizing Layers) ---

// DEPRECATED - Old Group schema, replaced by new Group interface below
// Kept for backward compatibility only
export interface LegacyGroup {
  id: string;
  name: string;
  description: string;
  bannerUrl?: string;
  contactIds: string[];
  frameScore: number;
  notes?: string;
  lastScanAt?: number;
}

// DEPRECATED - Replaced by new Project types below (see line 256+)
// Kept for backward compatibility only
export interface LegacyProject {
  id: string;
  name: string;
  description: string;
  bannerUrl?: string;
  status: 'active' | 'onHold' | 'completed';
  contactIds: string[];
  taskIds: string[];
  layoutOrder?: string[];
  linkedPipelineStage?: string;
  linkedPipelineId?: string;
  notes?: string;
  actions?: ActionItem[];
  files?: FileAttachment[];
  frameScore?: number;
  lastScanAt?: number;
}

export interface PipelineStageConfig {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface Pipeline {
  id: string;
  name: string;
}

export interface ActionItem {
  id: string;
  text: string;
  isCompleted: boolean;
}

export interface FileAttachment {
  id: string;
  name: string;
  url?: string;
}

export interface Plan {
  name: string;
  price: string;
  features: string[];
  isPopular?: boolean;
}

// --- PIPELINE ---

export interface PipelineStageTemplate {
  id: string;
  name: string;
  order: number; // 0..N left to right
  color?: string; // simple string like "green" or hex, optional
  autoTaskTitle?: string; // if set, create a task when item enters this stage
  autoTaskDueInDays?: number; // days from now for due date when autoTaskTitle is used
}

export interface PipelineTemplate {
  id: string;
  name: string;
  description?: string;
  domain: 'business' | 'personal' | 'hybrid';
  isDefault?: boolean;
  stages: PipelineStageTemplate[];
  createdAt: string;
  updatedAt: string;
}

export interface PipelineItem {
  id: string;
  templateId: string;
  contactId: string;
  label?: string; // optional free text (deal name / case name)
  currentStageId: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string | null;
  status: 'open' | 'won' | 'lost' | 'archived';
  value?: number; // optional numeric value for later analytics
}

// --- GROUP ---

export interface Group {
  id: string;
  name: string;
  description?: string;
  bannerUrl?: string;               // Banner image URL or Data URL (Notion-style)
  createdAt: string;
  updatedAt: string;
}

export interface GroupMembership {
  groupId: string;
  contactId: string;
  joinedAt: string;
}

// --- PROJECTS (ASANA-STYLE) ---

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived';
export type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * ProjectAttachment - File attachments for projects (similar to InteractionAttachment)
 */
export interface ProjectAttachment {
  id: string;
  projectId: string;
  fileName: string;
  mimeType: string;
  dataUrl: string;                  // Data URL (data:image/... or data:application/pdf;base64,...)
  uploadedBy: string;               // Contact ID of uploader
  createdAt: string;                // ISO timestamp
}

/**
 * Project - Asana-style project management aligned with Contact spine
 * A Project always has a primaryContactId (the main contact it's about)
 * and can have additional relatedContactIds
 */
export interface Project {
  id: string;
  name: string;
  isGroupProject: boolean;        // If true, treat this project as a group workspace
  groupMemberIds: string[];       // Contacts participating in the group project
  groupGoals: string[];           // Simple goal checklist for the group/project
  description?: string;
  bannerUrl?: string;               // Banner image URL or Data URL (Notion-style)
  primaryContactId: string;        // REQUIRED — the main contact this project is about
  relatedContactIds: string[];     // Other contacts involved in the project
  status: ProjectStatus;
  priority: ProjectPriority;
  createdAt: string;                // ISO timestamp
  updatedAt: string;                // ISO timestamp
  startDate?: string | null;        // ISO date string (YYYY-MM-DD)
  dueDate?: string | null;          // ISO date string (YYYY-MM-DD)
  sectionIds: string[];             // Ordered list of section IDs for display
  topicIds: string[];               // Linked topics
  groupIds: string[];               // Linked groups (if relevant)
  attachments: ProjectAttachment[]; // File attachments
}

/**
 * ProjectSection - Vertical sections within a project (like "Backlog", "In Progress", "Done")
 * Tasks are organized under sections
 */
export interface ProjectSection {
  id: string;
  projectId: string;
  name: string;
  sortOrder: number;                // 0-based ordering for display
  createdAt: string;                // ISO timestamp
}

/**
 * ProjectTaskLink - Links existing tasks from taskStore into project sections
 * Tasks are never duplicated - we only create links
 */
export interface ProjectTaskLink {
  id: string;
  projectId: string;
  sectionId: string;
  taskId: string;                   // References a Task from taskStore
  sortOrder: number;                // 0-based ordering within the section
  createdAt: string;                // ISO timestamp
}

/**
 * Section name to task status mapping
 * When a task is moved to a section, we can auto-update its status
 */
export interface SectionStatusMapping {
  sectionName: string;
  taskStatus: TaskStatus;
}

// =============================================================================
// SYSTEM LOG / NOTIFICATIONS
// =============================================================================

export type SystemLogType = 'billing' | 'announcement' | 'task' | 'system' | 'custom';
export type SystemLogSeverity = 'info' | 'warning' | 'urgent';
export type SystemLogSource = 'owner' | 'system' | 'userRule';

/**
 * SystemLogEntry - Intelligent notification stream entries
 * Appears in the System Log panel on the right sidebar
 * Can be filtered based on user preferences in Settings → Notifications
 */
export interface SystemLogEntry {
  id: string;
  type: SystemLogType;
  title: string;
  message: string;
  createdAt: string;              // ISO timestamp
  isRead: boolean;
  severity: SystemLogSeverity;
  source: SystemLogSource;
}

/**
 * NotificationSettings - User preferences for System Log filtering
 * Stored in settings and controls which notification types are shown
 */
export interface NotificationSettings {
  showAnnouncements: boolean;
  showSystemEvents: boolean;
  showTasks: boolean;
  showBillingAlerts: boolean;      // May be mandatory depending on policy
  showCustom: boolean;
}

// =============================================================================
// WANT TRACKING — Daily metrics and goal tracking system
// =============================================================================

/**
 * Goal type for Want metrics - determines how progress is measured
 */
export type WantGoalType = 'at_least' | 'at_most' | 'exact' | 'boolean_days_per_week';

/**
 * Metric value type - number for quantities, boolean for yes/no tracking
 */
export type WantMetricType = 'number' | 'boolean';

/**
 * WantMetric - A trackable metric/goal defined by the user
 * Examples: "Hours Worked", "Income", "Workout", "Water"
 *
 * The Want Tracking board displays columns for each active metric.
 * Users can define goals and track daily values against them.
 */
export interface WantMetric {
  id: string;
  /** Human-readable name (e.g., "Hours Worked", "Income") */
  name: string;
  /** Stable key derived from name, used as key in day entries */
  slug: string;
  /** Type of value: number for quantities, boolean for yes/no */
  type: WantMetricType;
  /** Unit of measurement (e.g., "hrs", "$", "lbs", "cal") */
  unit?: string;
  /** How goal progress is measured */
  goalType: WantGoalType;
  /** Goal value - meaning depends on goalType */
  goalValue: number;
  /** Whether this metric is currently active/visible */
  isActive: boolean;
  /** Display order in the board */
  sortOrder: number;
  /** Color for the metric (hex or CSS color) */
  color?: string;
  /**
   * FrameScore weight (0-1). Determines how much this metric affects Contact Zero's FrameScore.
   * - 0 or undefined: Informational only, no impact on FrameScore
   * - 0.1-1.0: Contributes to FrameScore penalty when below goal
   * Metrics with frameScoreWeight participate in the tracking penalty calculation.
   */
  frameScoreWeight?: number;
  /** Created timestamp */
  createdAt: string;
  /** Last modified timestamp */
  updatedAt: string;
}

/**
 * WantDayEntry - A single day's recorded values across all metrics
 *
 * Values are stored in a Record keyed by metric.slug.
 * This allows flexible addition/removal of metrics without data loss.
 */
export interface WantDayEntry {
  id: string;
  /** Date in YYYY-MM-DD format (local time) */
  date: string;
  /** Values for each metric: { [metric.slug]: number | boolean | null } */
  values: Record<string, number | boolean | null>;
  /** Created timestamp */
  createdAt: string;
  /** Last modified timestamp */
  updatedAt: string;
}

/**
 * WantTrackingBoard - Container for metrics and day entries
 *
 * This is the Want Tracking module's data model. It replaces the old
 * "Success Tracking" concept with a proper, editable tracking board.
 */
export interface WantTrackingBoard {
  /** All defined metrics */
  metrics: WantMetric[];
  /** All day entries - one per date with values for all metrics */
  days: WantDayEntry[];
  /** Currently selected month for display (YYYY-MM format) */
  selectedMonth?: string;
  /** Whether to show weekends in the board */
  showWeekends: boolean;
  /** Last updated timestamp */
  updatedAt: string;
}
