// =============================================================================
// LITTLE LORD USER PROFILE — Persistent user preferences and coaching patterns
// =============================================================================
// Stores user preferences and detected patterns that Little Lord uses for
// personalized coaching. This enables:
// - Persistent coaching tone preferences
// - Pattern memory across sessions
// - Writing style preferences for assistance
// - Goals and focus areas
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

/**
 * User's preferred coaching tone from Little Lord.
 */
export type LittleLordCoachingTone =
  | 'direct'       // Blunt, no-nonsense feedback
  | 'supportive'   // Encouraging with gentle corrections
  | 'socratic'     // Question-based guidance
  | 'default';     // Balanced approach

/**
 * User's coaching tier (determines access level and features).
 */
export type LittleLordCoachingTier =
  | 'none'         // No coaching (free tier)
  | 'foundation'   // Foundation tier
  | 'accelerator'  // Accelerator tier
  | 'elite';       // Elite tier (full access)

/**
 * User's writing assistant tier (determines writing help access).
 */
export type LittleLordWritingAssistantTier =
  | 'locked'       // No access (hasn't purchased book)
  | 'basic'        // Basic writing help (book owners)
  | 'full';        // Full writing assistant (higher tiers)

/**
 * User's preferred writing style when Little Lord assists with drafts.
 */
export type LittleLordWritingStyle =
  | 'formal'       // Professional, structured
  | 'casual'       // Conversational, relaxed
  | 'concise'      // Brief, to the point
  | 'elaborate'    // Detailed, comprehensive
  | 'default';     // Match context

/**
 * A detected pattern from user interactions.
 */
export interface LittleLordDetectedPattern {
  /** Unique identifier */
  id: string;
  /** Pattern type category */
  type: 'strength' | 'weakness' | 'habit' | 'trigger';
  /** Description of the pattern */
  description: string;
  /** Number of times detected */
  occurrenceCount: number;
  /** When first detected */
  firstDetectedAt: string;
  /** When last observed */
  lastObservedAt: string;
  /** Whether user has acknowledged this pattern */
  acknowledged: boolean;
}

/**
 * A goal the user is working toward.
 */
export interface LittleLordUserGoal {
  /** Unique identifier */
  id: string;
  /** Goal description */
  description: string;
  /** Whether the goal is currently active */
  isActive: boolean;
  /** Progress percentage (0-100) */
  progress: number;
  /** When the goal was set */
  createdAt: string;
  /** Target completion date (optional) */
  targetDate?: string;
  /** Related frame axes this goal addresses */
  relatedAxes?: string[];
}

/**
 * A user-provided fact that Little Lord should remember.
 */
export interface LittleLordUserMemory {
  /** Unique identifier */
  id: string;
  /** The memory category (e.g., 'ownership', 'preference', 'context') */
  category: 'ownership' | 'preference' | 'context' | 'correction' | 'other';
  /** What the user said/declared */
  content: string;
  /** When this was recorded */
  recordedAt: string;
}

/**
 * Complete user profile for Little Lord personalization.
 */
export interface LittleLordUserProfile {
  /** User ID this profile belongs to */
  userId: string;
  /** Tenant ID for multi-tenant isolation */
  tenantId: string;
  /** Preferred coaching tone */
  coachingTone: LittleLordCoachingTone;
  /** Preferred writing style for assistance */
  writingStyle: LittleLordWritingStyle;
  /** User's name/nickname for personalization (optional) */
  preferredName?: string;
  /** Primary focus areas for coaching */
  focusAreas: string[];
  /** Detected patterns over time */
  detectedPatterns: LittleLordDetectedPattern[];
  /** User's active goals */
  goals: LittleLordUserGoal[];
  /** Topics to avoid or be sensitive about */
  sensitivities: string[];
  /** User-declared facts and memories */
  userMemories: LittleLordUserMemory[];

  // =========================================================================
  // TIER & ACCESS FIELDS
  // =========================================================================

  /** Whether user owns the Apex book */
  hasApexBook: boolean;
  /** Whether user has completed the Case Call (sales call) */
  hasCompletedCaseCall: boolean;
  /** User's coaching tier (determines feature access) */
  coachingTier: LittleLordCoachingTier;
  /** User's writing assistant tier (determines writing help access) */
  writingAssistantTier: LittleLordWritingAssistantTier;

  // =========================================================================
  // TIMESTAMPS
  // =========================================================================

  /** When the profile was created */
  createdAt: string;
  /** When the profile was last updated */
  updatedAt: string;
}

// =============================================================================
// IN-MEMORY STORE WITH LOCALSTORAGE PERSISTENCE
// =============================================================================

const STORAGE_KEY = 'framelord_little_lord_profiles';

// Load profiles from localStorage on init
const loadProfilesFromStorage = (): Map<string, LittleLordUserProfile> => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return new Map(Object.entries(parsed));
    }
  } catch (err) {
    console.warn('[LittleLord] Failed to load profiles from localStorage:', err);
  }
  return new Map();
};

// Save profiles to localStorage
const saveProfilesToStorage = (profiles: Map<string, LittleLordUserProfile>): void => {
  try {
    const obj: Record<string, LittleLordUserProfile> = {};
    profiles.forEach((profile, key) => {
      obj[key] = profile;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch (err) {
    console.warn('[LittleLord] Failed to save profiles to localStorage:', err);
  }
};

let PROFILES: Map<string, LittleLordUserProfile> = loadProfilesFromStorage();

// =============================================================================
// ID GENERATION
// =============================================================================

const generatePatternId = (): string => {
  return `llp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const generateGoalId = (): string => {
  return `llg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Key format: tenantId:userId
const getProfileKey = (tenantId: string, userId: string): string => {
  return `${tenantId}:${userId}`;
};

// =============================================================================
// CRUD OPERATIONS
// =============================================================================

/**
 * Get a user profile, creating a default one if it doesn't exist.
 */
export const getUserProfile = (tenantId: string, userId: string): LittleLordUserProfile => {
  const key = getProfileKey(tenantId, userId);
  const existing = PROFILES.get(key);

  if (existing) {
    return existing;
  }

  // Create default profile
  const newProfile: LittleLordUserProfile = {
    userId,
    tenantId,
    coachingTone: 'default',
    writingStyle: 'default',
    focusAreas: [],
    detectedPatterns: [],
    goals: [],
    sensitivities: [],
    userMemories: [],
    // Tier & Access fields - default to free/locked state
    hasApexBook: false,
    hasCompletedCaseCall: false,
    coachingTier: 'none',
    writingAssistantTier: 'locked',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  PROFILES.set(key, newProfile);
  saveProfilesToStorage(PROFILES);
  return newProfile;
};

/**
 * Update user profile preferences.
 */
export const updateUserProfile = (
  tenantId: string,
  userId: string,
  updates: Partial<Pick<LittleLordUserProfile,
    | 'coachingTone'
    | 'writingStyle'
    | 'preferredName'
    | 'focusAreas'
    | 'sensitivities'
    | 'hasApexBook'
    | 'hasCompletedCaseCall'
    | 'coachingTier'
    | 'writingAssistantTier'
  >>
): LittleLordUserProfile => {
  const profile = getUserProfile(tenantId, userId);
  const key = getProfileKey(tenantId, userId);

  const updated: LittleLordUserProfile = {
    ...profile,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  PROFILES.set(key, updated);
  saveProfilesToStorage(PROFILES);
  return updated;
};

// =============================================================================
// PATTERN OPERATIONS
// =============================================================================

/**
 * Add or update a detected pattern.
 */
export const recordPattern = (
  tenantId: string,
  userId: string,
  pattern: Omit<LittleLordDetectedPattern, 'id' | 'occurrenceCount' | 'firstDetectedAt' | 'lastObservedAt' | 'acknowledged'>
): LittleLordDetectedPattern => {
  const profile = getUserProfile(tenantId, userId);
  const key = getProfileKey(tenantId, userId);

  // Check if pattern already exists (by description match)
  const existing = profile.detectedPatterns.find(
    p => p.type === pattern.type && p.description === pattern.description
  );

  if (existing) {
    // Update existing pattern
    const updated: LittleLordDetectedPattern = {
      ...existing,
      occurrenceCount: existing.occurrenceCount + 1,
      lastObservedAt: new Date().toISOString(),
    };

    profile.detectedPatterns = profile.detectedPatterns.map(
      p => p.id === existing.id ? updated : p
    );
    profile.updatedAt = new Date().toISOString();
    PROFILES.set(key, profile);
    saveProfilesToStorage(PROFILES);

    return updated;
  }

  // Create new pattern
  const newPattern: LittleLordDetectedPattern = {
    ...pattern,
    id: generatePatternId(),
    occurrenceCount: 1,
    firstDetectedAt: new Date().toISOString(),
    lastObservedAt: new Date().toISOString(),
    acknowledged: false,
  };

  profile.detectedPatterns.push(newPattern);
  profile.updatedAt = new Date().toISOString();
  PROFILES.set(key, profile);
  saveProfilesToStorage(PROFILES);

  return newPattern;
};

/**
 * Mark a pattern as acknowledged by the user.
 */
export const acknowledgePattern = (
  tenantId: string,
  userId: string,
  patternId: string
): boolean => {
  const profile = getUserProfile(tenantId, userId);
  const key = getProfileKey(tenantId, userId);

  const pattern = profile.detectedPatterns.find(p => p.id === patternId);
  if (!pattern) return false;

  pattern.acknowledged = true;
  profile.updatedAt = new Date().toISOString();
  PROFILES.set(key, profile);
  saveProfilesToStorage(PROFILES);

  return true;
};

/**
 * Get unacknowledged patterns for a user.
 */
export const getUnacknowledgedPatterns = (
  tenantId: string,
  userId: string
): LittleLordDetectedPattern[] => {
  const profile = getUserProfile(tenantId, userId);
  return profile.detectedPatterns.filter(p => !p.acknowledged);
};

// =============================================================================
// GOAL OPERATIONS
// =============================================================================

/**
 * Add a new goal.
 */
export const addGoal = (
  tenantId: string,
  userId: string,
  goal: Omit<LittleLordUserGoal, 'id' | 'createdAt' | 'progress'>
): LittleLordUserGoal => {
  const profile = getUserProfile(tenantId, userId);
  const key = getProfileKey(tenantId, userId);

  const newGoal: LittleLordUserGoal = {
    ...goal,
    id: generateGoalId(),
    progress: 0,
    createdAt: new Date().toISOString(),
  };

  profile.goals.push(newGoal);
  profile.updatedAt = new Date().toISOString();
  PROFILES.set(key, profile);
  saveProfilesToStorage(PROFILES);

  return newGoal;
};

/**
 * Update goal progress.
 */
export const updateGoalProgress = (
  tenantId: string,
  userId: string,
  goalId: string,
  progress: number
): boolean => {
  const profile = getUserProfile(tenantId, userId);
  const key = getProfileKey(tenantId, userId);

  const goal = profile.goals.find(g => g.id === goalId);
  if (!goal) return false;

  goal.progress = Math.max(0, Math.min(100, progress));
  profile.updatedAt = new Date().toISOString();
  PROFILES.set(key, profile);
  saveProfilesToStorage(PROFILES);

  return true;
};

/**
 * Toggle goal active status.
 */
export const toggleGoalActive = (
  tenantId: string,
  userId: string,
  goalId: string
): boolean => {
  const profile = getUserProfile(tenantId, userId);
  const key = getProfileKey(tenantId, userId);

  const goal = profile.goals.find(g => g.id === goalId);
  if (!goal) return false;

  goal.isActive = !goal.isActive;
  profile.updatedAt = new Date().toISOString();
  PROFILES.set(key, profile);
  saveProfilesToStorage(PROFILES);

  return true;
};

/**
 * Get active goals for a user.
 */
export const getActiveGoals = (
  tenantId: string,
  userId: string
): LittleLordUserGoal[] => {
  const profile = getUserProfile(tenantId, userId);
  return profile.goals.filter(g => g.isActive);
};

// =============================================================================
// USER MEMORY OPERATIONS
// =============================================================================

const generateMemoryId = (): string => {
  return `llm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Record a user-declared fact or memory.
 * Used for things like "I already own the book", "I prefer X", etc.
 */
export const recordUserMemory = (
  tenantId: string,
  userId: string,
  category: LittleLordUserMemory['category'],
  content: string
): LittleLordUserMemory => {
  const profile = getUserProfile(tenantId, userId);
  const key = getProfileKey(tenantId, userId);

  const newMemory: LittleLordUserMemory = {
    id: generateMemoryId(),
    category,
    content,
    recordedAt: new Date().toISOString(),
  };

  // Initialize userMemories if it doesn't exist (for legacy profiles)
  if (!profile.userMemories) {
    profile.userMemories = [];
  }

  profile.userMemories.push(newMemory);
  profile.updatedAt = new Date().toISOString();
  PROFILES.set(key, profile);
  saveProfilesToStorage(PROFILES);

  return newMemory;
};

/**
 * Get all user memories.
 */
export const getUserMemories = (
  tenantId: string,
  userId: string
): LittleLordUserMemory[] => {
  const profile = getUserProfile(tenantId, userId);
  return profile.userMemories || [];
};

/**
 * Get user memories by category.
 */
export const getUserMemoriesByCategory = (
  tenantId: string,
  userId: string,
  category: LittleLordUserMemory['category']
): LittleLordUserMemory[] => {
  const profile = getUserProfile(tenantId, userId);
  return (profile.userMemories || []).filter(m => m.category === category);
};

/**
 * Check if user has a specific ownership memory (e.g., owns the book).
 */
export const hasOwnershipMemory = (
  tenantId: string,
  userId: string,
  searchTerm: string
): boolean => {
  const memories = getUserMemoriesByCategory(tenantId, userId, 'ownership');
  const lowerSearch = searchTerm.toLowerCase();
  return memories.some(m => m.content.toLowerCase().includes(lowerSearch));
};

/**
 * Delete a user memory.
 */
export const deleteUserMemory = (
  tenantId: string,
  userId: string,
  memoryId: string
): boolean => {
  const profile = getUserProfile(tenantId, userId);
  const key = getProfileKey(tenantId, userId);

  if (!profile.userMemories) return false;

  const initialLength = profile.userMemories.length;
  profile.userMemories = profile.userMemories.filter(m => m.id !== memoryId);

  if (profile.userMemories.length < initialLength) {
    profile.updatedAt = new Date().toISOString();
    PROFILES.set(key, profile);
    saveProfilesToStorage(PROFILES);
    return true;
  }

  return false;
};

// =============================================================================
// TIER & ACCESS OPERATIONS
// =============================================================================

/**
 * Set book ownership status.
 * When user owns the book, automatically unlock basic writing assistant.
 */
export const setHasApexBook = (
  tenantId: string,
  userId: string,
  hasBook: boolean
): LittleLordUserProfile => {
  const profile = getUserProfile(tenantId, userId);
  const key = getProfileKey(tenantId, userId);

  profile.hasApexBook = hasBook;

  // Automatically unlock basic writing assistant when book is owned
  if (hasBook && profile.writingAssistantTier === 'locked') {
    profile.writingAssistantTier = 'basic';
  }

  // Record as memory for context
  if (hasBook) {
    recordUserMemory(tenantId, userId, 'ownership', 'Owns the Apex book');
  }

  profile.updatedAt = new Date().toISOString();
  PROFILES.set(key, profile);
  saveProfilesToStorage(PROFILES);

  return profile;
};

/**
 * Set whether user has completed the Case Call.
 */
export const setHasCompletedCaseCall = (
  tenantId: string,
  userId: string,
  hasCompleted: boolean
): LittleLordUserProfile => {
  const profile = getUserProfile(tenantId, userId);
  const key = getProfileKey(tenantId, userId);

  profile.hasCompletedCaseCall = hasCompleted;

  profile.updatedAt = new Date().toISOString();
  PROFILES.set(key, profile);
  saveProfilesToStorage(PROFILES);

  return profile;
};

/**
 * Set the user's coaching tier.
 * Higher tiers may unlock additional features.
 */
export const setCoachingTier = (
  tenantId: string,
  userId: string,
  tier: LittleLordCoachingTier
): LittleLordUserProfile => {
  const profile = getUserProfile(tenantId, userId);
  const key = getProfileKey(tenantId, userId);

  profile.coachingTier = tier;

  // Higher coaching tiers unlock full writing assistant
  if (tier === 'accelerator' || tier === 'elite') {
    profile.writingAssistantTier = 'full';
  } else if (tier === 'foundation' && profile.hasApexBook) {
    profile.writingAssistantTier = 'basic';
  }

  profile.updatedAt = new Date().toISOString();
  PROFILES.set(key, profile);
  saveProfilesToStorage(PROFILES);

  return profile;
};

/**
 * Set the user's writing assistant tier directly.
 * Usually set automatically based on book ownership and coaching tier.
 */
export const setWritingAssistantTier = (
  tenantId: string,
  userId: string,
  tier: LittleLordWritingAssistantTier
): LittleLordUserProfile => {
  const profile = getUserProfile(tenantId, userId);
  const key = getProfileKey(tenantId, userId);

  profile.writingAssistantTier = tier;

  profile.updatedAt = new Date().toISOString();
  PROFILES.set(key, profile);
  saveProfilesToStorage(PROFILES);

  return profile;
};

/**
 * Check if user has access to writing assistant.
 */
export const canAccessWritingAssistant = (
  tenantId: string,
  userId: string
): boolean => {
  const profile = getUserProfile(tenantId, userId);
  return profile.writingAssistantTier !== 'locked';
};

/**
 * Check if user has full writing assistant access.
 */
export const hasFullWritingAssistant = (
  tenantId: string,
  userId: string
): boolean => {
  const profile = getUserProfile(tenantId, userId);
  return profile.writingAssistantTier === 'full';
};

/**
 * Get the user's current tier summary.
 */
export const getUserTierSummary = (
  tenantId: string,
  userId: string
): {
  hasApexBook: boolean;
  hasCompletedCaseCall: boolean;
  coachingTier: LittleLordCoachingTier;
  writingAssistantTier: LittleLordWritingAssistantTier;
  canAccessWritingAssistant: boolean;
} => {
  const profile = getUserProfile(tenantId, userId);
  return {
    hasApexBook: profile.hasApexBook,
    hasCompletedCaseCall: profile.hasCompletedCaseCall,
    coachingTier: profile.coachingTier,
    writingAssistantTier: profile.writingAssistantTier,
    canAccessWritingAssistant: profile.writingAssistantTier !== 'locked',
  };
};

// =============================================================================
// PERSISTENCE HELPERS (for future localStorage/server sync)
// =============================================================================

/**
 * Export a user profile as JSON string.
 */
export const exportProfileToJSON = (tenantId: string, userId: string): string => {
  const profile = getUserProfile(tenantId, userId);
  return JSON.stringify(profile, null, 2);
};

/**
 * Import a user profile from JSON string.
 */
export const importProfileFromJSON = (json: string): boolean => {
  try {
    const parsed = JSON.parse(json) as LittleLordUserProfile;
    if (parsed.tenantId && parsed.userId) {
      const key = getProfileKey(parsed.tenantId, parsed.userId);
      PROFILES.set(key, parsed);
      saveProfilesToStorage(PROFILES);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to import Little Lord user profile:', err);
    return false;
  }
};

/**
 * Clear all profiles (use for testing/reset).
 */
export const clearAllProfiles = (): void => {
  PROFILES = new Map();
  localStorage.removeItem(STORAGE_KEY);
};
