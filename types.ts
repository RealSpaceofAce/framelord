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

// --- CONTACT (THE SPINE) ---

export type RelationshipDomain = 'business' | 'personal' | 'hybrid';
export type ContactStatus = 'active' | 'dormant' | 'blocked' | 'testing' | 'archived';

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

export interface Note {
  id: string;
  contactId: string;              // REQUIRED — who the note is ABOUT (legacy, kept for backward compatibility)
  authorContactId: string;        // REQUIRED — who WROTE the note (always CONTACT_ZERO)
  targetContactId?: string;       // Optional — explicit target contact for this note
  mentionedContactIds?: string[];  // Optional — contacts mentioned via @mention in the note
  title?: string;                 // Optional title for backlinking / Obsidian-style links
  content: string;                // Legacy field - kept for backward compatibility
  entries: NoteEntry[];           // Bullet-based entries with embedded content
  attachments?: NoteAttachment[]; // Direct attachments on the note (in addition to entry attachments)
  isPinned: boolean;              // Whether note is pinned to top
  createdAt: string;              // ISO timestamp
  updatedAt?: string | null;
  tags?: string[];
}

/**
 * NoteLink - bi-directional note graph edges
 * sourceNoteId -> targetNoteId represents a [[Target]] link inside Source content
 */
export interface NoteLink {
  sourceNoteId: string;
  targetNoteId: string;
}

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

// --- TOPIC (OBSIDIAN-STYLE [[TOPIC]] LINKS) ---

export interface Topic {
  id: string;
  label: string;                  // Human-facing name, e.g. "Sales"
  slug: string;                   // Normalized key, e.g. "sales"
}

export interface NoteTopic {
  noteId: string;
  topicId: string;
}

// --- INTERACTION ---

export type InteractionType = 'call' | 'meeting' | 'message' | 'email' | 'dm' | 'other';

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
