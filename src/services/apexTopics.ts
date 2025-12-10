// =============================================================================
// APEX TOPICS REGISTRY — Canonical source of truth for Frame doctrine topics
// =============================================================================
// This registry defines all valid wikilink targets for FrameScan mini reports.
// Only topics in this registry will create graph edges when linked in notes.
//
// Categories:
// - 'frame': Core frame types (Apex, Slave, Mixed, Neutral)
// - 'axis': The 9 axes of frame analysis
// - 'state': Win-Win model states
// - 'metric': Scoring concepts
// =============================================================================

/**
 * Categories for organizing Apex topics
 */
export type ApexTopicCategory = 'frame' | 'axis' | 'state' | 'metric';

/**
 * An Apex topic represents a Frame doctrine concept that can be wikilinked
 */
export interface ApexTopic {
  /** Unique identifier (same as slug) */
  id: string;
  /** Display name for UI (e.g., "Apex Frame") */
  label: string;
  /** Normalized slug for wikilink matching (e.g., "apex-frame") */
  slug: string;
  /** Topic category for organization */
  category: ApexTopicCategory;
  /** Short description (doctrine-neutral, reusable across UI/prompts/help) */
  description: string;
}

/**
 * Normalize a label to a slug format
 * Examples:
 *   "Apex Frame" → "apex-frame"
 *   "Buyer Seller Position" → "buyer-seller-position"
 *   "Win-Win Integrity" → "win-win-integrity"
 */
export function normalizeTopicSlug(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

// =============================================================================
// APEX TOPICS REGISTRY
// =============================================================================

export const APEX_TOPICS: ApexTopic[] = [
  // ---------------------------------------------------------------------------
  // FRAME FUNDAMENTALS (category: 'frame')
  // ---------------------------------------------------------------------------
  {
    id: 'apex-frame',
    label: 'Apex Frame',
    slug: 'apex-frame',
    category: 'frame',
    description: 'High-status relational position characterized by outcome independence, genuine value, and win-win integrity.',
  },
  {
    id: 'slave-frame',
    label: 'Slave Frame',
    slug: 'slave-frame',
    category: 'frame',
    description: 'Low-status relational position characterized by neediness, approval-seeking, and permission-based behavior.',
  },
  {
    id: 'mixed-frame',
    label: 'Mixed Frame',
    slug: 'mixed-frame',
    category: 'frame',
    description: 'Inconsistent frame showing both apex and slave signals, often caused by tactical adjustments without structural change.',
  },
  {
    id: 'neutral-frame',
    label: 'Neutral Frame',
    slug: 'neutral-frame',
    category: 'frame',
    description: 'Frame-neutral communication with no clear status signals, typically informational or transactional.',
  },

  // ---------------------------------------------------------------------------
  // CORE AXES (category: 'axis')
  // ---------------------------------------------------------------------------
  {
    id: 'assumptive-state',
    label: 'Assumptive State',
    slug: 'assumptive-state',
    category: 'axis',
    description: 'The degree to which you assume baseline desirability versus seeking permission or approval.',
  },
  {
    id: 'buyer-seller-position',
    label: 'Buyer Seller Position',
    slug: 'buyer-seller-position',
    category: 'axis',
    description: 'Whether you are qualifying fit (buyer posture) or pitching value (seller posture).',
  },
  {
    id: 'identity-vs-tactic',
    label: 'Identity vs Tactic',
    slug: 'identity-vs-tactic',
    category: 'axis',
    description: 'Whether your frame is structural (who you are) or tactical (what you say/do to manipulate outcomes).',
  },
  {
    id: 'internal-sale',
    label: 'Internal Sale',
    slug: 'internal-sale',
    category: 'axis',
    description: 'Your level of conviction in your own value, independent of external validation.',
  },
  {
    id: 'win-win-integrity',
    label: 'Win-Win Integrity',
    slug: 'win-win-integrity',
    category: 'axis',
    description: 'The structural alignment toward mutual gain versus manipulation, extraction, or covert contracts.',
  },
  {
    id: 'persuasion-style',
    label: 'Persuasion Style',
    slug: 'persuasion-style',
    category: 'axis',
    description: 'How you influence: through indirect manipulation or direct, clean offers with genuine autonomy for the other party.',
  },
  {
    id: 'pedestalization',
    label: 'Pedestalization',
    slug: 'pedestalization',
    category: 'axis',
    description: 'The degree to which you place others on a pedestal, treating them as higher status or authority figures.',
  },
  {
    id: 'self-trust-vs-permission',
    label: 'Self Trust vs Permission',
    slug: 'self-trust-vs-permission',
    category: 'axis',
    description: 'Whether you act from self-trust and internal standards or seek permission and external validation.',
  },
  {
    id: 'field-strength',
    label: 'Field Strength',
    slug: 'field-strength',
    category: 'axis',
    description: 'The energetic presence and relational gravity you project through confidence, clarity, and congruence.',
  },

  // ---------------------------------------------------------------------------
  // WIN-WIN STATES (category: 'state')
  // ---------------------------------------------------------------------------
  {
    id: 'win-win',
    label: 'Win-Win',
    slug: 'win-win',
    category: 'state',
    description: 'Structural alignment where mutual gain is possible, clean, and available to both parties.',
  },
  {
    id: 'win-lose',
    label: 'Win-Lose',
    slug: 'win-lose',
    category: 'state',
    description: 'One party gains at the expense of the other, often through manipulation or extraction.',
  },
  {
    id: 'lose-lose',
    label: 'Lose-Lose',
    slug: 'lose-lose',
    category: 'state',
    description: 'Both parties experience net negative outcomes, often due to pride, stubbornness, or revenge dynamics.',
  },

  // ---------------------------------------------------------------------------
  // SCORING METRICS (category: 'metric')
  // ---------------------------------------------------------------------------
  {
    id: 'frame-score',
    label: 'Frame Score',
    slug: 'frame-score',
    category: 'metric',
    description: 'The 0-100 aggregate score representing overall frame positioning, computed from weighted axis scores.',
  },
  {
    id: 'frame-diagnostic',
    label: 'Frame Diagnostic',
    slug: 'frame-diagnostic',
    category: 'metric',
    description: 'The detailed analysis of frame patterns, weaknesses, and recommended corrections.',
  },
];

// =============================================================================
// LOOKUP HELPERS
// =============================================================================

/**
 * Get an Apex topic by its slug
 *
 * @param slug - The normalized slug (e.g., "apex-frame")
 * @returns The topic if found, undefined otherwise
 */
export function getApexTopicBySlug(slug: string): ApexTopic | undefined {
  return APEX_TOPICS.find(t => t.slug === slug);
}

/**
 * Check if a slug is a valid Apex topic
 *
 * @param slug - The normalized slug to check
 * @returns True if the slug exists in the registry
 */
export function isValidApexTopicSlug(slug: string): boolean {
  return APEX_TOPICS.some(t => t.slug === slug);
}

/**
 * Get all topics in a specific category
 *
 * @param category - The category to filter by
 * @returns Array of topics in that category
 */
export function getApexTopicsByCategory(category: ApexTopicCategory): ApexTopic[] {
  return APEX_TOPICS.filter(t => t.category === category);
}

/**
 * Get an Apex topic by its label (case-insensitive)
 * Useful for parsing wikilinks where users might not match exact case
 *
 * @param label - The topic label (e.g., "Apex Frame" or "apex frame")
 * @returns The topic if found, undefined otherwise
 */
export function getApexTopicByLabel(label: string): ApexTopic | undefined {
  const normalizedLabel = label.toLowerCase().trim();
  return APEX_TOPICS.find(t => t.label.toLowerCase() === normalizedLabel);
}

/**
 * Get all Apex topic slugs (useful for validation)
 *
 * @returns Array of all valid topic slugs
 */
export function getAllApexTopicSlugs(): string[] {
  return APEX_TOPICS.map(t => t.slug);
}

/**
 * Get all Apex topic labels (useful for autocomplete)
 *
 * @returns Array of all topic display labels
 */
export function getAllApexTopicLabels(): string[] {
  return APEX_TOPICS.map(t => t.label);
}
