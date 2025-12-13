// =============================================================================
// PLAN CONFIG — Plan tier system and feature gating
// =============================================================================
// Defines plan tiers for both beta period and production.
// All features check against this config via canUseFeature().
//
// Two tier systems:
// 1. Beta tiers (beta_free, beta_plus, ultra_beta, enterprise_beta)
// 2. Production tiers (basic, pro, elite)
//
// Beta users will be migrated to production tiers post-beta.
// =============================================================================

// =============================================================================
// PLAN TIERS
// =============================================================================

// Beta period tiers (pre-launch)
export type BetaTier = 'beta_free' | 'beta_plus' | 'ultra_beta' | 'enterprise_beta';

// Production tiers (post-launch)
export type ProductionTier = 'basic' | 'pro' | 'elite';

// Combined tier type
export type PlanTier = BetaTier | ProductionTier;

/**
 * Numeric levels for plan comparison.
 * Higher number = more access.
 * Beta and production tiers are mapped to comparable levels.
 */
export const PLAN_LEVELS: Record<PlanTier, number> = {
  // Beta tiers
  beta_free: 0,
  beta_plus: 1,
  ultra_beta: 2,
  enterprise_beta: 3,
  // Production tiers (mapped to equivalent beta levels)
  basic: 1,   // Equivalent to beta_plus
  pro: 2,     // Equivalent to ultra_beta
  elite: 3,   // Equivalent to enterprise_beta
};

/**
 * Human-readable plan names for display.
 */
export const PLAN_NAMES: Record<PlanTier, string> = {
  // Beta tiers
  beta_free: 'Beta Free',
  beta_plus: 'Beta Plus',
  ultra_beta: 'Ultra Beta',
  enterprise_beta: 'Enterprise Beta',
  // Production tiers
  basic: 'Basic',
  pro: 'Pro',
  elite: 'Elite',
};

/**
 * Plan descriptions for upgrade prompts.
 */
export const PLAN_DESCRIPTIONS: Record<PlanTier, string> = {
  // Beta tiers
  beta_free: 'Basic access to core features',
  beta_plus: 'Enhanced features with AI insights',
  ultra_beta: 'Full access to all beta features',
  enterprise_beta: 'Enterprise-grade features with priority support',
  // Production tiers
  basic: 'Unlimited text scans, basic FrameScore, CRM essentials',
  pro: 'Call transcripts, email integration, advanced AI coaching',
  elite: 'Unlimited everything, API access, priority support, team features',
};

/**
 * Monthly prices for production tiers (in cents for Stripe)
 */
export const PLAN_PRICES: Partial<Record<PlanTier, number>> = {
  basic: 2900,   // $29/mo
  pro: 7900,     // $79/mo
  elite: 19900,  // $199/mo
};

/**
 * Stripe Price IDs (set from environment or configure in Stripe dashboard)
 */
export const STRIPE_PRICE_IDS: Partial<Record<PlanTier, string>> = {
  basic: process.env.STRIPE_PRICE_BASIC || '',
  pro: process.env.STRIPE_PRICE_PRO || '',
  elite: process.env.STRIPE_PRICE_ELITE || '',
};

/**
 * Check if a tier is a beta tier
 */
export const isBetaTier = (tier: PlanTier): tier is BetaTier => {
  return ['beta_free', 'beta_plus', 'ultra_beta', 'enterprise_beta'].includes(tier);
};

/**
 * Check if a tier is a production tier
 */
export const isProductionTier = (tier: PlanTier): tier is ProductionTier => {
  return ['basic', 'pro', 'elite'].includes(tier);
};

/**
 * Get the production tier equivalent of a beta tier (for migration)
 */
export const betaToProductionTier = (betaTier: BetaTier): ProductionTier => {
  const mapping: Record<BetaTier, ProductionTier> = {
    beta_free: 'basic',      // Upgrade free users to basic
    beta_plus: 'basic',      // beta_plus -> basic
    ultra_beta: 'pro',       // ultra_beta -> pro
    enterprise_beta: 'elite', // enterprise_beta -> elite
  };
  return mapping[betaTier];
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
  | 'apex_blueprint'
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
  | 'team_collaboration'
  // Notification Features
  | 'sms_notifications'
  | 'case_call_reminders'
  | 'task_reminders'
  // Integration Features
  | 'calendar_integration';

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
  apex_blueprint: 'beta_free', // Tier 2 intake available to all beta users

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

  // Notification Features
  sms_notifications: 'beta_plus',       // SMS requires paid tier
  case_call_reminders: 'beta_plus',     // Reminders require paid tier
  task_reminders: 'beta_free',          // Basic task reminders for all

  // Integration Features
  calendar_integration: 'beta_plus',    // Calendar sync requires paid tier
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
  sms_notifications: {
    title: 'SMS Notifications',
    description: 'Receive text message reminders for calls, tasks, and important alerts.',
    requiredPlan: 'beta_plus',
  },
  case_call_reminders: {
    title: 'Call Reminders',
    description: 'Automated email and SMS reminders before scheduled calls.',
    requiredPlan: 'beta_plus',
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

// =============================================================================
// USAGE QUOTAS PER PLAN
// =============================================================================

/**
 * Monthly quotas for AI-intensive features
 */
export const PLAN_QUOTAS: Record<PlanTier, {
  frameScanDaily: number;        // Daily FrameScan limit
  frameScanMonthly: number;      // Monthly FrameScan limit
  callAnalyzerMinutes: number;   // Monthly call analyzer minutes
  aiQueriesDaily: number;        // Daily AI assistant queries
  contactsLimit: number;         // Max contacts (0 = unlimited)
}> = {
  // Beta tiers
  beta_free: {
    frameScanDaily: 3,
    frameScanMonthly: 30,
    callAnalyzerMinutes: 0,
    aiQueriesDaily: 10,
    contactsLimit: 50,
  },
  beta_plus: {
    frameScanDaily: 10,
    frameScanMonthly: 100,
    callAnalyzerMinutes: 30,
    aiQueriesDaily: 50,
    contactsLimit: 200,
  },
  ultra_beta: {
    frameScanDaily: 25,
    frameScanMonthly: 500,
    callAnalyzerMinutes: 120,
    aiQueriesDaily: 200,
    contactsLimit: 0, // Unlimited
  },
  enterprise_beta: {
    frameScanDaily: 100,
    frameScanMonthly: 2000,
    callAnalyzerMinutes: 500,
    aiQueriesDaily: 1000,
    contactsLimit: 0,
  },
  // Production tiers
  basic: {
    frameScanDaily: 10,
    frameScanMonthly: 100,
    callAnalyzerMinutes: 0,
    aiQueriesDaily: 30,
    contactsLimit: 100,
  },
  pro: {
    frameScanDaily: 30,
    frameScanMonthly: 500,
    callAnalyzerMinutes: 120,
    aiQueriesDaily: 200,
    contactsLimit: 0,
  },
  elite: {
    frameScanDaily: 100,
    frameScanMonthly: 2000,
    callAnalyzerMinutes: 500,
    aiQueriesDaily: 1000,
    contactsLimit: 0,
  },
};

// =============================================================================
// PLAN GATING CONVENIENCE FUNCTIONS
// =============================================================================

/**
 * Check if plan can use FrameScan
 */
export const canUseFrameScan = (plan: PlanTier): boolean => {
  return PLAN_QUOTAS[plan].frameScanMonthly > 0;
};

/**
 * Get FrameScan quota for plan
 */
export const getFrameScanQuota = (plan: PlanTier): { daily: number; monthly: number } => {
  const quotas = PLAN_QUOTAS[plan];
  return { daily: quotas.frameScanDaily, monthly: quotas.frameScanMonthly };
};

/**
 * Check if plan can use Call Analyzer
 */
export const canUseCallAnalyzer = (plan: PlanTier): boolean => {
  return canUseFeature(plan, 'call_analyzer_card') && PLAN_QUOTAS[plan].callAnalyzerMinutes > 0;
};

/**
 * Get Call Analyzer monthly minutes limit
 */
export const getCallAnalyzerMinutes = (plan: PlanTier): number => {
  return PLAN_QUOTAS[plan].callAnalyzerMinutes;
};

/**
 * Check if plan can send SMS reminders
 */
export const canUseSmsReminders = (plan: PlanTier): boolean => {
  return canUseFeature(plan, 'sms_notifications');
};

/**
 * Check if plan can use personality tests/inference
 */
export const canUsePersonalityTests = (plan: PlanTier): boolean => {
  return canUseFeature(plan, 'personality_tests_card');
};

/**
 * Check if plan has AI Next Move suggestions
 */
export const canUseNextMove = (plan: PlanTier): boolean => {
  return canUseFeature(plan, 'next_move_card');
};

/**
 * Check if plan has API access
 */
export const canUseApi = (plan: PlanTier): boolean => {
  return canUseFeature(plan, 'api_access');
};

/**
 * Check if plan has team collaboration
 */
export const canUseTeamFeatures = (plan: PlanTier): boolean => {
  return canUseFeature(plan, 'team_collaboration');
};

/**
 * Get contacts limit for plan (0 = unlimited)
 */
export const getContactsLimit = (plan: PlanTier): number => {
  return PLAN_QUOTAS[plan].contactsLimit;
};

/**
 * Check if adding more contacts is allowed
 */
export const canAddMoreContacts = (plan: PlanTier, currentCount: number): boolean => {
  const limit = getContactsLimit(plan);
  return limit === 0 || currentCount < limit;
};

/**
 * Get AI queries limit for plan
 */
export const getAiQueriesLimit = (plan: PlanTier): number => {
  return PLAN_QUOTAS[plan].aiQueriesDaily;
};
