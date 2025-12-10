// =============================================================================
// LITTLE LORD VIEW BEHAVIOR — View-aware behavior configuration
// =============================================================================
// Configures how Little Lord behaves differently based on the current app view.
// This enables:
// - View-specific coaching prompts
// - Writing assistant gating (only enabled in certain views)
// - Context-aware suggestions
// =============================================================================

import type { LittleLordViewId } from './types';

// =============================================================================
// VIEW CAPABILITY CONFIGURATION
// =============================================================================

/**
 * Capabilities that can be enabled/disabled per view.
 */
export interface LittleLordViewCapabilities {
  /** Whether Little Lord can offer to write/draft content */
  writingAssistant: boolean;
  /** Whether Little Lord should proactively offer FrameScan */
  suggestFrameScan: boolean;
  /** Whether Little Lord can create/edit notes */
  noteOperations: boolean;
  /** Whether Little Lord can create/edit tasks */
  taskOperations: boolean;
  /** Whether Little Lord should provide coaching focus hints */
  coachingFocus: boolean;
}

/**
 * View-specific behavior configuration.
 */
export interface LittleLordViewConfig {
  /** Human-readable view name */
  displayName: string;
  /** Capabilities enabled for this view */
  capabilities: LittleLordViewCapabilities;
  /** Default coaching focus areas for this view */
  coachingHints: string[];
  /** System prompt additions for this view context */
  systemPromptAddition?: string;
}

// =============================================================================
// VIEW CONFIGURATION MAP
// =============================================================================

const VIEW_CONFIGS: Record<LittleLordViewId, LittleLordViewConfig> = {
  home: {
    displayName: 'Home Dashboard',
    capabilities: {
      writingAssistant: false,
      suggestFrameScan: true,
      noteOperations: true,
      taskOperations: true,
      coachingFocus: true,
    },
    coachingHints: ['daily priorities', 'frame health overview', 'quick wins'],
    systemPromptAddition: 'The user is viewing their home dashboard. Focus on daily priorities and overall frame health.',
  },
  contacts: {
    displayName: 'Contacts List',
    capabilities: {
      writingAssistant: false,
      suggestFrameScan: false,
      noteOperations: false,
      taskOperations: false,
      coachingFocus: true,
    },
    coachingHints: ['relationship management', 'contact prioritization'],
  },
  contact_dossier: {
    displayName: 'Contact Dossier',
    capabilities: {
      writingAssistant: true,
      suggestFrameScan: true,
      noteOperations: true,
      taskOperations: true,
      coachingFocus: true,
    },
    coachingHints: ['relationship dynamics', 'communication strategy', 'frame analysis'],
    systemPromptAddition: 'The user is viewing a specific contact\'s dossier. Provide context-aware coaching about the relationship.',
  },
  notes: {
    displayName: 'Notes',
    capabilities: {
      writingAssistant: true,
      suggestFrameScan: true,
      noteOperations: true,
      taskOperations: false,
      coachingFocus: true,
    },
    coachingHints: ['note organization', 'frame patterns in writing', 'documentation'],
    systemPromptAddition: 'The user is in the notes view. They may be drafting content - offer writing assistance if appropriate.',
  },
  tasks: {
    displayName: 'Tasks',
    capabilities: {
      writingAssistant: false,
      suggestFrameScan: false,
      noteOperations: false,
      taskOperations: true,
      coachingFocus: true,
    },
    coachingHints: ['task prioritization', 'deadline management', 'action planning'],
  },
  calendar: {
    displayName: 'Calendar',
    capabilities: {
      writingAssistant: false,
      suggestFrameScan: false,
      noteOperations: false,
      taskOperations: true,
      coachingFocus: false,
    },
    coachingHints: ['time management', 'meeting preparation'],
  },
  pipelines: {
    displayName: 'Pipelines',
    capabilities: {
      writingAssistant: true,
      suggestFrameScan: true,
      noteOperations: true,
      taskOperations: true,
      coachingFocus: true,
    },
    coachingHints: ['deal progression', 'sales strategy', 'follow-up timing'],
    systemPromptAddition: 'The user is in pipeline view. Focus on sales/deal progression and strategic communication.',
  },
  projects: {
    displayName: 'Projects',
    capabilities: {
      writingAssistant: true,
      suggestFrameScan: false,
      noteOperations: true,
      taskOperations: true,
      coachingFocus: true,
    },
    coachingHints: ['project planning', 'milestone tracking', 'team communication'],
  },
  groups: {
    displayName: 'Groups',
    capabilities: {
      writingAssistant: false,
      suggestFrameScan: false,
      noteOperations: false,
      taskOperations: false,
      coachingFocus: false,
    },
    coachingHints: ['group organization'],
  },
  framescan: {
    displayName: 'FrameScan',
    capabilities: {
      writingAssistant: true,
      suggestFrameScan: false, // Already in FrameScan view
      noteOperations: false,
      taskOperations: false,
      coachingFocus: true,
    },
    coachingHints: ['frame analysis', 'communication improvement', 'Apex positioning'],
    systemPromptAddition: 'The user is in FrameScan view actively analyzing their communication. Provide deep frame coaching.',
  },
  wants: {
    displayName: 'Wants Board',
    capabilities: {
      writingAssistant: false,
      suggestFrameScan: false,
      noteOperations: false,
      taskOperations: false,
      coachingFocus: true,
    },
    coachingHints: ['goal clarity', 'desire alignment', 'priority management'],
  },
  want_detail: {
    displayName: 'Want Detail',
    capabilities: {
      writingAssistant: false,
      suggestFrameScan: false,
      noteOperations: true,
      taskOperations: true,
      coachingFocus: true,
    },
    coachingHints: ['goal pursuit', 'action steps', 'obstacle removal'],
  },
  settings: {
    displayName: 'Settings',
    capabilities: {
      writingAssistant: false,
      suggestFrameScan: false,
      noteOperations: false,
      taskOperations: false,
      coachingFocus: false,
    },
    coachingHints: [],
  },
  landing: {
    displayName: 'Landing Page',
    capabilities: {
      writingAssistant: false,
      suggestFrameScan: true,
      noteOperations: false,
      taskOperations: false,
      coachingFocus: false,
    },
    coachingHints: [],
  },
  application: {
    displayName: 'Application',
    capabilities: {
      writingAssistant: false,
      suggestFrameScan: false,
      noteOperations: false,
      taskOperations: false,
      coachingFocus: false,
    },
    coachingHints: [],
  },
  beta: {
    displayName: 'Beta Program',
    capabilities: {
      writingAssistant: false,
      suggestFrameScan: false,
      noteOperations: false,
      taskOperations: false,
      coachingFocus: false,
    },
    coachingHints: [],
  },
  booking: {
    displayName: 'Booking',
    capabilities: {
      writingAssistant: false,
      suggestFrameScan: false,
      noteOperations: false,
      taskOperations: false,
      coachingFocus: false,
    },
    coachingHints: [],
  },
};

// =============================================================================
// VIEW BEHAVIOR FUNCTIONS
// =============================================================================

/**
 * Get the configuration for a specific view.
 */
export function getViewConfig(viewId: LittleLordViewId): LittleLordViewConfig {
  return VIEW_CONFIGS[viewId];
}

/**
 * Check if a specific capability is enabled for a view.
 */
export function isCapabilityEnabled(
  viewId: LittleLordViewId,
  capability: keyof LittleLordViewCapabilities
): boolean {
  return VIEW_CONFIGS[viewId].capabilities[capability];
}

/**
 * Check if the writing assistant should be available.
 * This is the main gating function for writing features.
 */
export function canOfferWritingAssistance(viewId: LittleLordViewId | null | undefined): boolean {
  if (!viewId) return false;
  return VIEW_CONFIGS[viewId]?.capabilities.writingAssistant ?? false;
}

/**
 * Check if Little Lord should suggest a FrameScan.
 */
export function shouldSuggestFrameScan(viewId: LittleLordViewId | null | undefined): boolean {
  if (!viewId) return false;
  return VIEW_CONFIGS[viewId]?.capabilities.suggestFrameScan ?? false;
}

/**
 * Get coaching hints for the current view.
 */
export function getCoachingHints(viewId: LittleLordViewId | null | undefined): string[] {
  if (!viewId) return [];
  return VIEW_CONFIGS[viewId]?.coachingHints ?? [];
}

/**
 * Get system prompt addition for a view.
 */
export function getViewSystemPromptAddition(viewId: LittleLordViewId | null | undefined): string | undefined {
  if (!viewId) return undefined;
  return VIEW_CONFIGS[viewId]?.systemPromptAddition;
}

/**
 * Get all views where writing assistant is enabled.
 */
export function getWritingEnabledViews(): LittleLordViewId[] {
  return (Object.keys(VIEW_CONFIGS) as LittleLordViewId[])
    .filter(viewId => VIEW_CONFIGS[viewId].capabilities.writingAssistant);
}

/**
 * Get all views where FrameScan suggestion is enabled.
 */
export function getFrameScanSuggestionViews(): LittleLordViewId[] {
  return (Object.keys(VIEW_CONFIGS) as LittleLordViewId[])
    .filter(viewId => VIEW_CONFIGS[viewId].capabilities.suggestFrameScan);
}
