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

export interface Note {
  id: string;
  contactId: string;              // REQUIRED — who the note is ABOUT
  authorContactId: string;        // REQUIRED — who WROTE the note (typically CONTACT_ZERO)
  content: string;
  createdAt: string;              // ISO timestamp
  updatedAt?: string | null;
  tags?: string[];
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

export interface Group {
  id: string;
  name: string;
  description: string;
  bannerUrl?: string;
  contactIds: string[];
  frameScore: number;
  notes?: string;
  lastScanAt?: number;
}

export interface Project {
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
