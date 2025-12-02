

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

// --- CORE SPINE: CONTACT ---

export interface Contact {
  id: string;
  isSelf?: boolean; // Contact Zero
  
  identity: {
    name: string;
    avatarUrl: string;
    socials: {
      linkedin?: string;
      twitter?: string;
      instagram?: string;
      website?: string;
      [key: string]: string | undefined;
    };
  };

  contactInfo: {
    email?: string;
    phone?: string;
  };

  classification: {
    domain: 'business' | 'personal';
    type: 'client' | 'prospect' | 'partner' | 'friend' | 'family' | 'dating' | 'ltr' | 'self' | 'none';
    roleDescription: string;
  };

  pipeline: {
    stage: string; // e.g., 'Lead', 'Negotiation', 'FriendZone', 'Committed'
    status: 'active' | 'stagnant' | 'archived' | 'closedWon' | 'closedLost';
    score: number; // FrameScore (0-100)
    trend: 'up' | 'down' | 'flat';
    lastScanAt: number;
  };

  goals: {
    topGoal: string;
    secondaryGoals: string[];
  };

  // Embedded Data (No parallel models)
  notes: Note[];
  tasks: Task[];
  interactions: Interaction[];
  history: TimelineEvent[];

  // AI Output
  aiModels: {
    insights: string[];
    summaries: string;
    forecasts: string;
    plans: string;
    recommendedActions: string[];
  };
}

export interface Note {
  id: string;
  content: string;
  timestamp: number;
  dateStr: string; // YYYY-MM-DD for grouping
  isSystem?: boolean; // Auto-generated
  topics: string[]; // [[Topic]]
}

export interface Task {
  id: string;
  text: string;
  isCompleted: boolean;
  createdAt: number;
  dueAt?: number;
}

export interface Interaction {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'dm' | 'scan' | 'note';
  summary: string;
  timestamp: number;
}

export interface TimelineEvent {
  id: string;
  type: 'scan' | 'stage_change' | 'note' | 'interaction';
  description: string;
  timestamp: number;
}

// --- CONTAINERS (Organizing Layers Only) ---

export interface Group {
  id: string;
  name: string;
  description: string;
  bannerUrl?: string;
  contactIds: string[]; // Reference only
  frameScore: number; // Aggregated from members
  notes?: string;
  lastScanAt?: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  bannerUrl?: string;
  status: 'active' | 'onHold' | 'completed';
  contactIds: string[]; // Reference only
  taskIds: string[]; // Reference to specific tasks inside contacts? Or Project-level tasks attached to Contact Zero?
                     // Per rules: "Tasks attach to a Contact." 
                     // So Project Tasks are likely tasks on Contact Zero tagged with this Project, or tasks on Members.
                     // For simplicity in this UI, we will view them as aggregated tasks.
  layoutOrder?: string[];
  linkedPipelineStage?: string; // Filter contacts by this stage?
  // Extended fields
  linkedPipelineId?: string;
  notes?: string;
  actions?: ActionItem[];
  files?: FileAttachment[];
  frameScore?: number;
  lastScanAt?: number;
}

// --- CONFIG ---

export interface PipelineStageConfig {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface Plan {
  name: string;
  price: string;
  features: string[];
  isPopular?: boolean;
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

export interface Pipeline {
  id: string;
  name: string;
}

// --- TYPE ALIASES ---

/** Contact Zero is the user's own record (isSelf = true) */
export type ContactZero = Contact & { isSelf: true };
