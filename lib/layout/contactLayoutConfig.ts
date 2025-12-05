// =============================================================================
// CONTACT LAYOUT CONFIG — Widget ordering and visibility for contact dashboards
// =============================================================================
// Defines the available widgets and their default order for both Contact Zero
// and regular contact dashboards. Supports per-contact customization.
// =============================================================================

/**
 * Widget identifiers for contact dashboards
 */
export type ContactWidgetId =
  | 'summary'        // Header/profile summary
  | 'frame'          // Frame profile and score
  | 'notes'          // Notes section
  | 'tasks'          // Tasks section
  | 'interactions'   // Interaction timeline
  | 'timeline'       // Broader timeline
  | 'files'          // Attachments/files
  | 'tags'           // Tags section
  | 'projects'       // Projects section
  | 'pipeline'       // Pipeline/stage info
  | 'keyDates'       // Key dates (birthdays, etc.)
  | 'statsSummary'   // Stats summary tile
  | 'openTasksOwed'  // Contact Zero only: tasks you owe others
  | 'upcomingTasks'  // Contact Zero only: upcoming tasks
  | 'topics'         // Contact Zero only: topics overview
  | 'activityFeed'   // Contact Zero only: recent activity
  | 'lastInteractions'; // Contact Zero only: last interactions

/**
 * Layout configuration for a contact's dashboard
 */
export interface ContactLayoutConfig {
  contactId: string | 'contactZero' | 'default';
  widgetOrder: ContactWidgetId[];
}

/**
 * Default widget order for Contact Zero
 */
export const defaultContactZeroLayout: ContactLayoutConfig = {
  contactId: 'contactZero',
  widgetOrder: [
    'summary',
    'frame',
    'statsSummary',
    'openTasksOwed',
    'upcomingTasks',
    'topics',
    'notes',
    'tasks',
    'activityFeed',
    'timeline',
  ],
};

/**
 * Default widget order for regular contacts
 */
export const defaultContactLayout: ContactLayoutConfig = {
  contactId: 'default',
  widgetOrder: [
    'summary',
    'frame',
    'pipeline',
    'notes',
    'tasks',
    'interactions',
    'timeline',
    'keyDates',
    'files',
    'tags',
    'projects',
  ],
};

/**
 * Get human-readable label for a widget
 */
export const WIDGET_LABELS: Record<ContactWidgetId, string> = {
  summary: 'Profile Summary',
  frame: 'Frame Profile',
  notes: 'Notes',
  tasks: 'Tasks',
  interactions: 'Interactions',
  timeline: 'Timeline',
  files: 'Files & Attachments',
  tags: 'Tags',
  projects: 'Projects',
  pipeline: 'Pipeline',
  keyDates: 'Key Dates',
  statsSummary: 'Stats Summary',
  openTasksOwed: 'Tasks You Owe',
  upcomingTasks: 'Upcoming Tasks',
  topics: 'Topics',
  activityFeed: 'Activity Feed',
  lastInteractions: 'Last Interactions',
};

/**
 * Widgets that are only available for Contact Zero
 */
export const CONTACT_ZERO_ONLY_WIDGETS: ContactWidgetId[] = [
  'openTasksOwed',
  'upcomingTasks',
  'topics',
  'activityFeed',
  'lastInteractions',
  'statsSummary',
];

/**
 * Check if a widget is available for a given contact type
 */
export function isWidgetAvailable(widgetId: ContactWidgetId, isContactZero: boolean): boolean {
  if (CONTACT_ZERO_ONLY_WIDGETS.includes(widgetId)) {
    return isContactZero;
  }
  return true;
}




