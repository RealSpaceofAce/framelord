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
export type ContactStatus = 'active' | 'dormant' | 'blocked' | 'testing';

export interface Contact {
  id: string;
  fullName: string;
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
}

/** Contact Zero is the user's own record */
export type ContactZero = Contact & { id: 'contact_zero' };

// --- NOTE (SYNCS TO CONTACT) ---

export interface Note {
  id: string;
  contactId: string;              // REQUIRED — links to Contact.id
  content: string;
  createdAt: string;              // ISO timestamp
  updatedAt?: string | null;
  tags?: string[];
}

// --- INTERACTION ---

export type InteractionType = 'call' | 'meeting' | 'message' | 'other';

export interface Interaction {
  id: string;
  contactId: string;              // REQUIRED — links to Contact.id
  type: InteractionType;
  occurredAt: string;             // ISO timestamp
  summary: string;
}

// --- TASK ---

export type TaskStatus = 'open' | 'done' | 'blocked';

export interface Task {
  id: string;
  contactId: string;              // REQUIRED — links to Contact.id
  title: string;
  dueAt?: string | null;          // ISO timestamp
  status: TaskStatus;
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
