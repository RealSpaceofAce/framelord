// =============================================================================
// WANT SCOPE STORE — Iteration tracking and doctrine notes
// =============================================================================
// Each Want has a Scope that tracks:
// - Doctrinal notes from Little Lord
// - Iteration entries (user feedback, revisions, resistance, external feedback)
// - Automatically flags Wants as inert when no iteration logs exist
// =============================================================================

import { getWantById, getAllWants, type Want } from './wantStore';

// =============================================================================
// TYPES
// =============================================================================

export type IterationSource = 'user' | 'little_lord';
export type IterationAction =
  | 'feedback'
  | 'revision'
  | 'resistance'
  | 'external_feedback'
  | 'milestone'
  | 'reflection'
  | 'course_correction'
  | 'covert_contract_blocked'
  | 'bad_frame_corrected';

// =============================================================================
// DOSSIER TYPE — AI-generated strategic analysis for a Want
// =============================================================================

export interface WantDossier {
  wantId: string;
  createdAt: string;
  updatedAt: string;
  /** Executive summary of the Want */
  summary: string;
  /** Why this Want matters to the user */
  why_it_matters: string;
  /** Timeline expectations and milestones */
  intended_timeline: string;
  /** How achieving this Want benefits all parties */
  win_win_frame: string;
  /** Potential risks, costs, or trade-offs */
  risks_or_costs: string;
  /** Detected covert contracts or hidden expectations */
  covert_contract_flags: string[];
  /** Notes on alignment with user's values and goals */
  congruence_notes: string;
  /** Source of the dossier (little_lord or manual) */
  source: 'little_lord' | 'manual';
}

export interface ScopeIterationEntry {
  id: string;
  date: string;
  action: IterationAction;
  feedback: string;
  consequence: string;  // Required: what resulted from this action
  source: IterationSource;
  relatedStepId?: string;
  relatedMetricName?: string;
}

export interface WantScope {
  wantId: string;
  createdAt: string;
  updatedAt: string;
  objective: string;  // The Want's stated objective
  doctrineNotes: string[];
  iterationEntries: ScopeIterationEntry[];
  congruencyScore: number;  // 0-100 based on alignment and activity
  isInert: boolean;
  lastActivityDate: string | null;
}

// =============================================================================
// STORE STATE
// =============================================================================

let SCOPES: Map<string, WantScope> = new Map();
let DOSSIERS: Map<string, WantDossier> = new Map();
let listeners: Array<() => void> = [];

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

/**
 * Subscribe to store changes (for React reactivity).
 */
export const subscribe = (listener: () => void): (() => void) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
};

/**
 * Get current snapshot (for useSyncExternalStore).
 */
export const getSnapshot = (): Map<string, WantScope> => SCOPES;

/**
 * Get dossiers snapshot (for useSyncExternalStore).
 */
export const getDossiersSnapshot = (): Map<string, WantDossier> => DOSSIERS;

/**
 * Get all scopes as array.
 */
export const getAllScopes = (): WantScope[] => {
  return Array.from(SCOPES.values());
};

// =============================================================================
// ID GENERATION
// =============================================================================

const generateIterationId = (): string =>
  `iter_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

// =============================================================================
// SCOPE OPERATIONS
// =============================================================================

/**
 * Get or create a Scope for a Want.
 */
export const getOrCreateScope = (wantId: string): WantScope | null => {
  const want = getWantById(wantId);
  if (!want) return null;

  if (!SCOPES.has(wantId)) {
    const now = new Date().toISOString();
    const newScope: WantScope = {
      wantId,
      createdAt: now,
      updatedAt: now,
      objective: want.reason || want.title,  // Default to Want's reason or title
      doctrineNotes: [],
      iterationEntries: [],
      congruencyScore: 0,  // Start at 0, updated via calculateCongruencyScore
      isInert: true,
      lastActivityDate: null,
    };
    SCOPES.set(wantId, newScope);
    notifyListeners();
  }

  return SCOPES.get(wantId)!;
};

/**
 * Create a Scope for a Want (explicit creation, used after want.create).
 */
export const createScopeForWant = (wantId: string): WantScope | null => {
  const want = getWantById(wantId);
  if (!want) return null;

  const now = new Date().toISOString();
  const newScope: WantScope = {
    wantId,
    createdAt: now,
    updatedAt: now,
    objective: want.reason || want.title,
    doctrineNotes: [],
    iterationEntries: [],
    congruencyScore: 0,
    isInert: true,
    lastActivityDate: null,
  };
  SCOPES.set(wantId, newScope);
  console.log('[WantScopeStore] Created scope for Want:', wantId);
  notifyListeners();
  return newScope;
};

/**
 * Get Scope for a Want (returns undefined if doesn't exist).
 */
export const getScope = (wantId: string): WantScope | undefined => {
  return SCOPES.get(wantId);
};

/**
 * Delete Scope for a Want.
 */
export const deleteScope = (wantId: string): boolean => {
  const deleted = SCOPES.delete(wantId);
  if (deleted) {
    notifyListeners();
  }
  return deleted;
};

// =============================================================================
// DOCTRINE NOTES
// =============================================================================

/**
 * Add a doctrine note to a Scope.
 */
export const addDoctrineNote = (wantId: string, note: string): boolean => {
  const scope = getOrCreateScope(wantId);
  if (!scope) return false;

  scope.doctrineNotes.push(note);
  scope.updatedAt = new Date().toISOString();
  notifyListeners();
  return true;
};

/**
 * Clear all doctrine notes from a Scope.
 */
export const clearDoctrineNotes = (wantId: string): boolean => {
  const scope = SCOPES.get(wantId);
  if (!scope) return false;

  scope.doctrineNotes = [];
  scope.updatedAt = new Date().toISOString();
  notifyListeners();
  return true;
};

/**
 * Get doctrine notes for a Want.
 */
export const getDoctrineNotes = (wantId: string): string[] => {
  const scope = SCOPES.get(wantId);
  return scope?.doctrineNotes || [];
};

// =============================================================================
// ITERATION ENTRIES
// =============================================================================

/**
 * Log an iteration entry to a Scope.
 */
export const logIterationEntry = (
  wantId: string,
  params: {
    action: IterationAction;
    feedback: string;
    consequence?: string;  // What resulted from this action
    source: IterationSource;
    relatedStepId?: string;
    relatedMetricName?: string;
    date?: string;
  }
): ScopeIterationEntry | null => {
  const scope = getOrCreateScope(wantId);
  if (!scope) return null;

  const entry: ScopeIterationEntry = {
    id: generateIterationId(),
    date: params.date || new Date().toISOString(),
    action: params.action,
    feedback: params.feedback,
    consequence: params.consequence || '',  // Default to empty string
    source: params.source,
    relatedStepId: params.relatedStepId,
    relatedMetricName: params.relatedMetricName,
  };

  scope.iterationEntries.push(entry);
  // Sort by date descending
  scope.iterationEntries.sort((a, b) => b.date.localeCompare(a.date));
  scope.updatedAt = new Date().toISOString();
  scope.lastActivityDate = entry.date;
  scope.isInert = false;

  // Recalculate congruency after each iteration
  updateCongruency(wantId);

  console.log('[WantScopeStore] Logged iteration:', entry.action, 'for Want:', wantId);
  notifyListeners();
  return entry;
};

/**
 * Log user feedback.
 */
export const logUserFeedback = (wantId: string, feedback: string): ScopeIterationEntry | null => {
  return logIterationEntry(wantId, {
    action: 'feedback',
    feedback,
    source: 'user',
  });
};

/**
 * Log user revision.
 */
export const logUserRevision = (wantId: string, feedback: string): ScopeIterationEntry | null => {
  return logIterationEntry(wantId, {
    action: 'revision',
    feedback,
    source: 'user',
  });
};

/**
 * Log resistance encountered.
 */
export const logResistance = (
  wantId: string,
  feedback: string,
  source: IterationSource = 'user'
): ScopeIterationEntry | null => {
  return logIterationEntry(wantId, {
    action: 'resistance',
    feedback,
    source,
  });
};

/**
 * Log external feedback.
 */
export const logExternalFeedback = (wantId: string, feedback: string): ScopeIterationEntry | null => {
  return logIterationEntry(wantId, {
    action: 'external_feedback',
    feedback,
    source: 'user',
  });
};

/**
 * Log Little Lord insight.
 */
export const logLittleLordInsight = (
  wantId: string,
  feedback: string,
  action: IterationAction = 'feedback'
): ScopeIterationEntry | null => {
  return logIterationEntry(wantId, {
    action,
    feedback,
    source: 'little_lord',
  });
};

/**
 * Get iteration entries for a Want.
 */
export const getIterationEntries = (wantId: string): ScopeIterationEntry[] => {
  const scope = SCOPES.get(wantId);
  return scope?.iterationEntries || [];
};

/**
 * Get iteration entries by source.
 */
export const getIterationsBySource = (
  wantId: string,
  source: IterationSource
): ScopeIterationEntry[] => {
  const entries = getIterationEntries(wantId);
  return entries.filter(e => e.source === source);
};

/**
 * Get iteration entries by action type.
 */
export const getIterationsByAction = (
  wantId: string,
  action: IterationAction
): ScopeIterationEntry[] => {
  const entries = getIterationEntries(wantId);
  return entries.filter(e => e.action === action);
};

// =============================================================================
// INERT DETECTION
// =============================================================================

/**
 * Check if a Want's Scope is inert (no recent activity).
 */
export const isScopeInert = (wantId: string): boolean => {
  const scope = SCOPES.get(wantId);
  if (!scope) return true;
  return scope.isInert;
};

/**
 * Get all inert Scopes (Wants without iteration activity).
 */
export const getInertScopes = (): WantScope[] => {
  return Array.from(SCOPES.values()).filter(s => s.isInert);
};

/**
 * Get Wants that are inert (no Scope or inert Scope).
 */
export const getInertWantIds = (): string[] => {
  const allWants = getAllWants();
  return allWants
    .filter(w => {
      const scope = SCOPES.get(w.id);
      return !scope || scope.isInert;
    })
    .map(w => w.id);
};

/**
 * Mark a Scope as active (not inert).
 */
export const markScopeActive = (wantId: string): boolean => {
  const scope = SCOPES.get(wantId);
  if (!scope) return false;

  scope.isInert = false;
  scope.lastActivityDate = new Date().toISOString();
  scope.updatedAt = new Date().toISOString();
  notifyListeners();
  return true;
};

/**
 * Mark a Scope as inert (no activity).
 */
export const markScopeInert = (wantId: string): boolean => {
  const scope = SCOPES.get(wantId);
  if (!scope) return false;

  scope.isInert = true;
  scope.updatedAt = new Date().toISOString();
  notifyListeners();
  return true;
};

// =============================================================================
// COMPUTED HELPERS
// =============================================================================

/**
 * Get Scope statistics.
 */
export const getScopeStats = (wantId: string): {
  totalIterations: number;
  userIterations: number;
  littleLordIterations: number;
  resistanceCount: number;
  revisionCount: number;
  lastActivity: string | null;
  isInert: boolean;
} => {
  const scope = SCOPES.get(wantId);
  const defaultStats = {
    totalIterations: 0,
    userIterations: 0,
    littleLordIterations: 0,
    resistanceCount: 0,
    revisionCount: 0,
    lastActivity: null,
    isInert: true,
  };

  if (!scope) return defaultStats;

  return {
    totalIterations: scope.iterationEntries.length,
    userIterations: scope.iterationEntries.filter(e => e.source === 'user').length,
    littleLordIterations: scope.iterationEntries.filter(e => e.source === 'little_lord').length,
    resistanceCount: scope.iterationEntries.filter(e => e.action === 'resistance').length,
    revisionCount: scope.iterationEntries.filter(e => e.action === 'revision').length,
    lastActivity: scope.lastActivityDate,
    isInert: scope.isInert,
  };
};

/**
 * Get full Scope data with Want info.
 */
export const getScopeWithWant = (wantId: string): (WantScope & { want: Want }) | null => {
  const scope = getOrCreateScope(wantId);
  const want = getWantById(wantId);

  if (!scope || !want) return null;

  return {
    ...scope,
    want,
  };
};

// =============================================================================
// AUTOMATIC SCOPE CREATION FOR EXISTING WANTS
// =============================================================================

/**
 * Ensure all existing Wants have Scopes.
 */
export const ensureAllScopesExist = (): void => {
  const allWants = getAllWants();
  for (const want of allWants) {
    getOrCreateScope(want.id);
  }
};

/**
 * Sync Scopes with Wants (remove orphaned Scopes).
 */
export const syncScopesWithWants = (): void => {
  const allWants = getAllWants();
  const wantIds = new Set(allWants.map(w => w.id));

  // Remove Scopes for deleted Wants
  for (const [wantId] of SCOPES) {
    if (!wantIds.has(wantId)) {
      SCOPES.delete(wantId);
    }
  }

  // Ensure all Wants have Scopes
  ensureAllScopesExist();
  notifyListeners();
};

// =============================================================================
// OBJECTIVE MANAGEMENT
// =============================================================================

/**
 * Update the objective for a Want's Scope.
 */
export const updateObjective = (wantId: string, text: string): boolean => {
  const scope = getOrCreateScope(wantId);
  if (!scope) return false;

  scope.objective = text;
  scope.updatedAt = new Date().toISOString();
  console.log('[WantScopeStore] Updated objective for Want:', wantId);
  notifyListeners();
  return true;
};

/**
 * Get the objective for a Want.
 */
export const getObjective = (wantId: string): string => {
  const scope = SCOPES.get(wantId);
  return scope?.objective || '';
};

// =============================================================================
// CONGRUENCY SCORE
// =============================================================================

/**
 * Calculate the congruency score for a Want.
 * Formula:
 * - (+5) per iteration entry
 * - (+15) per completed step
 * - (+3) per doctrine note
 * - (-10) per resistance entry
 * - (-2) per day inert (since last activity)
 * Clamped to 0-100
 */
export const calculateCongruencyScore = (wantId: string): number => {
  const scope = SCOPES.get(wantId);
  const want = getWantById(wantId);
  if (!scope || !want) return 0;

  let score = 0;

  // (+5) per iteration entry
  score += scope.iterationEntries.length * 5;

  // (+15) per completed step
  const completedSteps = want.steps.filter(s => s.status === 'done').length;
  score += completedSteps * 15;

  // (+3) per doctrine note
  score += scope.doctrineNotes.length * 3;

  // (-10) per resistance entry
  const resistanceCount = scope.iterationEntries.filter(e => e.action === 'resistance').length;
  score -= resistanceCount * 10;

  // (-2) per day inert (since last activity)
  if (scope.lastActivityDate) {
    const lastActivity = new Date(scope.lastActivityDate);
    const now = new Date();
    const daysInert = Math.floor((now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));
    if (daysInert > 0) {
      score -= daysInert * 2;
    }
  } else {
    // No activity at all, penalize
    score -= 20;
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
};

/**
 * Update the congruency score for a Want.
 */
export const updateCongruency = (wantId: string): number => {
  const scope = SCOPES.get(wantId);
  if (!scope) return 0;

  const newScore = calculateCongruencyScore(wantId);
  scope.congruencyScore = newScore;
  scope.updatedAt = new Date().toISOString();
  // Don't notify here to avoid recursion - caller will notify
  return newScore;
};

/**
 * Get the congruency score for a Want.
 */
export const getCongruencyScore = (wantId: string): number => {
  const scope = SCOPES.get(wantId);
  return scope?.congruencyScore || 0;
};

// =============================================================================
// DOSSIER OPERATIONS
// =============================================================================

/**
 * Get a Dossier for a Want.
 */
export const getDossierForWant = (wantId: string): WantDossier | undefined => {
  return DOSSIERS.get(wantId);
};

/**
 * Get all dossiers as array.
 */
export const getAllDossiers = (): WantDossier[] => {
  return Array.from(DOSSIERS.values());
};

/**
 * Create or update a Dossier for a Want.
 */
export const createDossierForWant = (
  wantId: string,
  dossier: Omit<WantDossier, 'wantId' | 'createdAt' | 'updatedAt'>
): WantDossier | null => {
  const want = getWantById(wantId);
  if (!want) return null;

  const now = new Date().toISOString();
  const existing = DOSSIERS.get(wantId);

  const newDossier: WantDossier = {
    ...dossier,
    wantId,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  DOSSIERS.set(wantId, newDossier);
  console.log('[WantScopeStore] Created/updated dossier for Want:', wantId);
  notifyListeners();
  return newDossier;
};

/**
 * Update a Dossier for a Want.
 */
export const updateDossier = (
  wantId: string,
  updates: Partial<Omit<WantDossier, 'wantId' | 'createdAt' | 'updatedAt'>>
): WantDossier | null => {
  const existing = DOSSIERS.get(wantId);
  if (!existing) return null;

  const updatedDossier: WantDossier = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  DOSSIERS.set(wantId, updatedDossier);
  console.log('[WantScopeStore] Updated dossier for Want:', wantId);
  notifyListeners();
  return updatedDossier;
};

/**
 * Delete a Dossier for a Want.
 */
export const deleteDossier = (wantId: string): boolean => {
  const deleted = DOSSIERS.delete(wantId);
  if (deleted) {
    console.log('[WantScopeStore] Deleted dossier for Want:', wantId);
    notifyListeners();
  }
  return deleted;
};

/**
 * Check if a Want has a Dossier.
 */
export const hasDossier = (wantId: string): boolean => {
  return DOSSIERS.has(wantId);
};

/**
 * Sync Dossiers with Wants (remove orphaned Dossiers).
 */
export const syncDossiersWithWants = (): void => {
  const allWants = getAllWants();
  const wantIds = new Set(allWants.map(w => w.id));

  // Remove Dossiers for deleted Wants
  for (const [wantId] of DOSSIERS) {
    if (!wantIds.has(wantId)) {
      DOSSIERS.delete(wantId);
    }
  }
  notifyListeners();
};
