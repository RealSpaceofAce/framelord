// =============================================================================
// PLAN CONFIG — Beta tier system and feature gating
// =============================================================================
// Defines the plan tiers for the beta period and feature access control.
// All features check against this config via canUseFeature().
// =============================================================================

// =============================================================================
// PLAN TIERS (Beta Period)
// =============================================================================

export type PlanTier = 'beta_free' | 'beta_plus' | 'ultra_beta' | 'enterprise_beta';

/**
 * Numeric levels for plan comparison.
 * Higher number = more access.
 */
export const PLAN_LEVELS: Record<PlanTier, number> = {
  beta_free: 0,
  beta_plus: 1,
  ultra_beta: 2,
  enterprise_beta: 3,
};

/**
 * Human-readable plan names for display.
 */
export const PLAN_NAMES: Record<PlanTier, string> = {
  beta_free: 'Beta Free',
  beta_plus: 'Beta Plus',
  ultra_beta: 'Ultra Beta',
  enterprise_beta: 'Enterprise Beta',
};

/**
 * Plan descriptions for upgrade prompts.
 */
export const PLAN_DESCRIPTIONS: Record<PlanTier, string> = {
  beta_free: 'Basic access to core features',
  beta_plus: 'Enhanced features with AI insights',
  ultra_beta: 'Full access to all beta features',
  enterprise_beta: 'Enterprise-grade features with priority support',
};

// =============================================================================
// FEATURE KEYS
// =============================================================================

export type FeatureKey =
  // Contact Zero View Features
  | 'preflight_briefing'
  | 'things_due_today'
  | 'network_health'
  | 'radar_widget'
  | 'live_feed'
  | 'wants_streaks'
  | 'frame_analytics'
  // Contact Dossier View Features
  | 'timeline_tab'
  | 'notes_tab'
  | 'tasks_tab'
  | 'framescan_tab'
  | 'personal_intel_card'
  | 'mini_graph_card'
  | 'personality_tests_card'
  | 'next_move_card'
  | 'call_analyzer_card'
  // AI Features
  | 'ai_briefing_expanded'
  | 'ai_talking_points'
  | 'ai_next_move_suggestions'
  | 'ai_personality_inference'
  | 'ai_call_analysis'
  // Advanced Features
  | 'custom_domains'
  | 'api_access'
  | 'export_data'
  | 'team_collaboration';

// =============================================================================
// FEATURE REQUIREMENTS
// =============================================================================

/**
 * Minimum plan required for each feature.
 * Features not listed default to 'beta_free' (available to all).
 */
export const FEATURE_REQUIREMENTS: Record<FeatureKey, PlanTier> = {
  // Contact Zero View Features
  preflight_briefing: 'beta_free',
  things_due_today: 'beta_free',
  network_health: 'beta_plus',
  radar_widget: 'beta_plus',
  live_feed: 'beta_free',
  wants_streaks: 'beta_plus',
  frame_analytics: 'beta_free',

  // Contact Dossier View Features
  timeline_tab: 'beta_free',
  notes_tab: 'beta_free',
  tasks_tab: 'beta_free',
  framescan_tab: 'beta_free',
  personal_intel_card: 'beta_plus',
  mini_graph_card: 'beta_plus',
  personality_tests_card: 'ultra_beta',
  next_move_card: 'ultra_beta',
  call_analyzer_card: 'enterprise_beta',

  // AI Features
  ai_briefing_expanded: 'beta_plus',
  ai_talking_points: 'ultra_beta',
  ai_next_move_suggestions: 'ultra_beta',
  ai_personality_inference: 'ultra_beta',
  ai_call_analysis: 'enterprise_beta',

  // Advanced Features
  custom_domains: 'beta_plus',
  api_access: 'enterprise_beta',
  export_data: 'beta_plus',
  team_collaboration: 'enterprise_beta',
};

// =============================================================================
// FEATURE GATING HELPERS
// =============================================================================

/**
 * Check if a plan has access to a feature.
 * @param plan - The user's current plan tier
 * @param featureKey - The feature to check
 * @returns true if the plan has access to the feature
 */
export const canUseFeature = (plan: PlanTier, featureKey: FeatureKey): boolean => {
  const requiredTier = FEATURE_REQUIREMENTS[featureKey];
  return PLAN_LEVELS[plan] >= PLAN_LEVELS[requiredTier];
};

/**
 * Get the required plan for a feature.
 * @param featureKey - The feature to check
 * @returns The minimum plan tier required
 */
export const getRequiredPlan = (featureKey: FeatureKey): PlanTier => {
  return FEATURE_REQUIREMENTS[featureKey];
};

/**
 * Check if a plan level meets a required tier.
 * @param currentPlan - The user's current plan
 * @param requiredPlan - The minimum required plan
 * @returns true if current plan meets or exceeds required
 */
export const meetsRequirement = (currentPlan: PlanTier, requiredPlan: PlanTier): boolean => {
  return PLAN_LEVELS[currentPlan] >= PLAN_LEVELS[requiredPlan];
};

/**
 * Get the upgrade path from one plan to the next.
 * @param currentPlan - The user's current plan
 * @returns The next available plan tier, or null if at max
 */
export const getNextPlan = (currentPlan: PlanTier): PlanTier | null => {
  const currentLevel = PLAN_LEVELS[currentPlan];
  const plans = Object.entries(PLAN_LEVELS) as [PlanTier, number][];
  const nextPlan = plans.find(([, level]) => level === currentLevel + 1);
  return nextPlan ? nextPlan[0] : null;
};

/**
 * Get all features available at a given plan level.
 * @param plan - The plan tier to check
 * @returns Array of feature keys available at this plan
 */
export const getFeaturesForPlan = (plan: PlanTier): FeatureKey[] => {
  return (Object.entries(FEATURE_REQUIREMENTS) as [FeatureKey, PlanTier][])
    .filter(([, requiredPlan]) => meetsRequirement(plan, requiredPlan))
    .map(([featureKey]) => featureKey);
};

/**
 * Get features locked at a given plan level (available in higher tiers).
 * @param plan - The plan tier to check
 * @returns Array of feature keys locked at this plan
 */
export const getLockedFeatures = (plan: PlanTier): FeatureKey[] => {
  return (Object.entries(FEATURE_REQUIREMENTS) as [FeatureKey, PlanTier][])
    .filter(([, requiredPlan]) => !meetsRequirement(plan, requiredPlan))
    .map(([featureKey]) => featureKey);
};

// =============================================================================
// LOCKED FEATURE TEASER CONFIG
// =============================================================================

export interface LockedFeatureTeaser {
  title: string;
  description: string;
  requiredPlan: PlanTier;
}

/**
 * Teaser text for locked features.
 * Shown when a user tries to access a feature they don't have.
 */
export const LOCKED_FEATURE_TEASERS: Partial<Record<FeatureKey, LockedFeatureTeaser>> = {
  network_health: {
    title: 'Network Health Monitor',
    description: 'Track relationship health across your network. See who needs attention.',
    requiredPlan: 'beta_plus',
  },
  radar_widget: {
    title: 'Radar Alerts',
    description: 'Get real-time alerts on overdue tasks, low FrameScores, and relationship gaps.',
    requiredPlan: 'beta_plus',
  },
  wants_streaks: {
    title: 'Wants & Streaks',
    description: 'Track your daily habits and maintain streaks. See compliance trends.',
    requiredPlan: 'beta_plus',
  },
  personal_intel_card: {
    title: 'Personal Intel',
    description: 'AI-derived insights about communication style, triggers, and preferences.',
    requiredPlan: 'beta_plus',
  },
  mini_graph_card: {
    title: 'Network Graph',
    description: 'Visualize this contact\'s connections in your network.',
    requiredPlan: 'beta_plus',
  },
  personality_tests_card: {
    title: 'Personality Profile',
    description: 'Big Five, MBTI, and DISC profiles inferred from interactions.',
    requiredPlan: 'ultra_beta',
  },
  next_move_card: {
    title: 'Next Move AI',
    description: 'AI-powered suggestions for what to do next with this contact.',
    requiredPlan: 'ultra_beta',
  },
  call_analyzer_card: {
    title: 'Call Analyzer',
    description: 'AI analysis of call transcripts with frame dynamics and talking points.',
    requiredPlan: 'enterprise_beta',
  },
  ai_talking_points: {
    title: 'AI Talking Points',
    description: 'Auto-generated conversation starters based on recent activity.',
    requiredPlan: 'ultra_beta',
  },
};

// =============================================================================
// CURRENT USER PLAN (placeholder - will come from auth/tenant context)
// =============================================================================

/**
 * Get the current user's plan.
 * TODO: Replace with actual auth/tenant context lookup.
 */
export const getCurrentUserPlan = (): PlanTier => {
  // For development, default to 'beta_plus' to show most features
  // In production, this will come from the user's subscription data
  return 'beta_plus';
};

/**
 * Set the current user's plan (for testing/development).
 * TODO: Remove this in production - plan should come from server.
 */
let _devPlan: PlanTier = 'beta_plus';

export const setDevPlan = (plan: PlanTier): void => {
  _devPlan = plan;
  console.log('[PlanConfig] Dev plan set to:', plan);
};

export const getDevPlan = (): PlanTier => _devPlan;
