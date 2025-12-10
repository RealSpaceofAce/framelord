// =============================================================================
// UPSELL TRIGGERS — Event-driven upsell opportunities
// =============================================================================
// Monitors user behavior and fires upsell triggers at strategic moments.
// Integrates with LittleLordUserProfile to personalize triggers.
//
// Trigger Points:
// - Low frame score detected (coaching opportunity)
// - Credits running low (credit purchase)
// - Multiple basic scans (upgrade to detailed)
// - Recurring patterns detected (coaching program)
// - Free trial expiring (subscription upsell)
// =============================================================================

import type { FrameScore } from '../lib/frameScan/frameTypes';
import type { LittleLordUserProfile } from './littleLord/userProfile';
import { getAvailableCredits } from './creditStore';

// =============================================================================
// TYPES
// =============================================================================

export type UpsellTriggerType =
  | 'low_score_coaching'
  | 'credits_low'
  | 'upgrade_detailed'
  | 'recurring_pattern'
  | 'trial_expiring'
  | 'first_scan_complete'
  | 'high_usage';

export type UpsellPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface UpsellTrigger {
  id: string;
  type: UpsellTriggerType;
  priority: UpsellPriority;
  title: string;
  message: string;
  ctaText: string;
  ctaAction: string; // Route or action identifier
  dismissable: boolean;
  createdAt: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export interface UpsellConfig {
  /** Minimum frame score to trigger coaching upsell */
  lowScoreThreshold: number;
  /** Credit count to trigger low credits upsell */
  lowCreditsThreshold: number;
  /** Number of basic scans before suggesting detailed */
  basicScansBeforeUpgrade: number;
  /** Number of same pattern detections before coaching suggestion */
  patternRepeatThreshold: number;
  /** Whether to show upsells in the current session */
  enabled: boolean;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const DEFAULT_CONFIG: UpsellConfig = {
  lowScoreThreshold: 45,
  lowCreditsThreshold: 3,
  basicScansBeforeUpgrade: 3,
  patternRepeatThreshold: 2,
  enabled: true,
};

let config: UpsellConfig = { ...DEFAULT_CONFIG };

/**
 * Update upsell configuration.
 */
export const setUpsellConfig = (newConfig: Partial<UpsellConfig>): void => {
  config = { ...config, ...newConfig };
};

/**
 * Get current upsell configuration.
 */
export const getUpsellConfig = (): UpsellConfig => ({ ...config });

// =============================================================================
// TRIGGER STATE
// =============================================================================

let activeTriggers: UpsellTrigger[] = [];
let dismissedTriggerTypes: Set<UpsellTriggerType> = new Set();
let sessionScanCount = 0;
let sessionPatterns: Map<string, number> = new Map();

// =============================================================================
// TRIGGER GENERATORS
// =============================================================================

const generateTriggerId = (): string => {
  return `upsell_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
};

/**
 * Create a new upsell trigger.
 */
const createTrigger = (
  type: UpsellTriggerType,
  priority: UpsellPriority,
  title: string,
  message: string,
  ctaText: string,
  ctaAction: string,
  metadata?: Record<string, unknown>
): UpsellTrigger => ({
  id: generateTriggerId(),
  type,
  priority,
  title,
  message,
  ctaText,
  ctaAction,
  dismissable: priority !== 'urgent',
  createdAt: new Date().toISOString(),
  metadata,
});

// =============================================================================
// TRIGGER CHECKS
// =============================================================================

/**
 * Check and potentially fire upsell trigger for low frame score.
 */
export const checkLowScoreTrigger = (
  score: FrameScore,
  userProfile?: LittleLordUserProfile
): UpsellTrigger | null => {
  if (!config.enabled) return null;
  if (dismissedTriggerTypes.has('low_score_coaching')) return null;
  if (score.frameScore >= config.lowScoreThreshold) return null;

  // Personalize message based on user profile
  const focusArea = userProfile?.focusAreas?.[0] || 'communication';
  const coachingTone = userProfile?.coachingTone || 'direct';

  const messages: Record<string, string> = {
    direct: `Your frame score of ${score.frameScore} indicates significant leaks. Structured coaching could accelerate your improvement.`,
    supportive: `A score of ${score.frameScore} shows room for growth. Our coaching program can help you develop stronger frame patterns.`,
    challenging: `${score.frameScore}? That's weak. If you're serious about fixing this, our coaching program will rebuild your frame from the ground up.`,
  };

  const trigger = createTrigger(
    'low_score_coaching',
    score.frameScore < 30 ? 'high' : 'medium',
    'Coaching Recommended',
    messages[coachingTone],
    'Explore Coaching',
    '/coaching',
    { frameScore: score.frameScore, focusArea }
  );

  activeTriggers.push(trigger);
  return trigger;
};

/**
 * Check and potentially fire upsell trigger for low credits.
 */
export const checkLowCreditsTrigger = (): UpsellTrigger | null => {
  if (!config.enabled) return null;
  if (dismissedTriggerTypes.has('credits_low')) return null;

  const credits = getAvailableCredits();
  if (credits >= config.lowCreditsThreshold) return null;

  const trigger = createTrigger(
    'credits_low',
    credits === 0 ? 'urgent' : 'medium',
    credits === 0 ? 'Out of Credits' : 'Credits Running Low',
    credits === 0
      ? 'You\'ve used all your credits. Purchase more to continue detailed image analysis.'
      : `You have ${credits} credit${credits === 1 ? '' : 's'} remaining. Top up to keep analyzing.`,
    'Get Credits',
    '/credits',
    { creditsRemaining: credits }
  );

  activeTriggers.push(trigger);
  return trigger;
};

/**
 * Check and potentially fire upsell trigger for upgrading to detailed scans.
 */
export const checkUpgradeDetailedTrigger = (): UpsellTrigger | null => {
  if (!config.enabled) return null;
  if (dismissedTriggerTypes.has('upgrade_detailed')) return null;

  sessionScanCount++;
  if (sessionScanCount < config.basicScansBeforeUpgrade) return null;

  const trigger = createTrigger(
    'upgrade_detailed',
    'low',
    'Unlock Detailed Analysis',
    'You\'ve run several basic scans. Detailed scans include visual annotations and deeper analysis.',
    'Try Detailed Scan',
    '/scan?tier=detailed',
    { basicScansCompleted: sessionScanCount }
  );

  activeTriggers.push(trigger);
  return trigger;
};

/**
 * Check and potentially fire upsell trigger for recurring patterns.
 */
export const checkRecurringPatternTrigger = (
  patterns: string[]
): UpsellTrigger | null => {
  if (!config.enabled) return null;
  if (dismissedTriggerTypes.has('recurring_pattern')) return null;

  // Track pattern occurrences
  for (const pattern of patterns) {
    const normalized = pattern.toLowerCase().trim();
    const count = (sessionPatterns.get(normalized) || 0) + 1;
    sessionPatterns.set(normalized, count);

    if (count >= config.patternRepeatThreshold) {
      const trigger = createTrigger(
        'recurring_pattern',
        'high',
        'Recurring Pattern Detected',
        `We've detected "${pattern}" appearing multiple times. This may indicate a deeper issue that coaching could address.`,
        'Get Pattern Analysis',
        '/coaching/patterns',
        { pattern, occurrences: count }
      );

      activeTriggers.push(trigger);
      return trigger;
    }
  }

  return null;
};

/**
 * Fire trigger after first scan completion.
 */
export const fireFirstScanTrigger = (): UpsellTrigger | null => {
  if (!config.enabled) return null;
  if (dismissedTriggerTypes.has('first_scan_complete')) return null;

  const trigger = createTrigger(
    'first_scan_complete',
    'low',
    'First Scan Complete!',
    'Great start! Want to track your frame progress over time? Create a free account.',
    'Create Account',
    '/signup',
    { milestone: 'first_scan' }
  );

  activeTriggers.push(trigger);
  dismissedTriggerTypes.add('first_scan_complete'); // Only show once
  return trigger;
};

// =============================================================================
// TRIGGER MANAGEMENT
// =============================================================================

/**
 * Get all active upsell triggers.
 */
export const getActiveTriggers = (): UpsellTrigger[] => {
  // Filter out expired triggers
  const now = new Date().getTime();
  activeTriggers = activeTriggers.filter(t => {
    if (!t.expiresAt) return true;
    return new Date(t.expiresAt).getTime() > now;
  });
  return [...activeTriggers];
};

/**
 * Get highest priority active trigger.
 */
export const getTopTrigger = (): UpsellTrigger | null => {
  const triggers = getActiveTriggers();
  if (triggers.length === 0) return null;

  const priorityOrder: UpsellPriority[] = ['urgent', 'high', 'medium', 'low'];
  for (const priority of priorityOrder) {
    const match = triggers.find(t => t.priority === priority);
    if (match) return match;
  }
  return triggers[0];
};

/**
 * Dismiss a trigger by ID.
 */
export const dismissTrigger = (triggerId: string): void => {
  const trigger = activeTriggers.find(t => t.id === triggerId);
  if (trigger) {
    dismissedTriggerTypes.add(trigger.type);
  }
  activeTriggers = activeTriggers.filter(t => t.id !== triggerId);
};

/**
 * Dismiss all triggers of a type.
 */
export const dismissTriggerType = (type: UpsellTriggerType): void => {
  dismissedTriggerTypes.add(type);
  activeTriggers = activeTriggers.filter(t => t.type !== type);
};

/**
 * Clear all active triggers (for testing).
 */
export const clearAllTriggers = (): void => {
  activeTriggers = [];
};

/**
 * Reset session state (for testing or new session).
 */
export const resetUpsellSession = (): void => {
  activeTriggers = [];
  dismissedTriggerTypes.clear();
  sessionScanCount = 0;
  sessionPatterns.clear();
};

// =============================================================================
// EVENT HOOKS
// =============================================================================

/**
 * Hook to call after a FrameScan completes.
 * Checks all relevant triggers.
 */
export const onFrameScanComplete = (
  score: FrameScore,
  isFirst: boolean,
  userProfile?: LittleLordUserProfile
): UpsellTrigger[] => {
  const triggers: UpsellTrigger[] = [];

  // Check low score trigger
  const lowScoreTrigger = checkLowScoreTrigger(score, userProfile);
  if (lowScoreTrigger) triggers.push(lowScoreTrigger);

  // Check credits trigger
  const creditsTrigger = checkLowCreditsTrigger();
  if (creditsTrigger) triggers.push(creditsTrigger);

  // Check upgrade trigger
  const upgradeTrigger = checkUpgradeDetailedTrigger();
  if (upgradeTrigger) triggers.push(upgradeTrigger);

  // Check pattern trigger
  if (score.notes.length > 0) {
    const patternTrigger = checkRecurringPatternTrigger(score.notes);
    if (patternTrigger) triggers.push(patternTrigger);
  }

  // First scan trigger
  if (isFirst) {
    const firstTrigger = fireFirstScanTrigger();
    if (firstTrigger) triggers.push(firstTrigger);
  }

  return triggers;
};

/**
 * Hook to call when credits change.
 */
export const onCreditsChange = (): UpsellTrigger | null => {
  return checkLowCreditsTrigger();
};
