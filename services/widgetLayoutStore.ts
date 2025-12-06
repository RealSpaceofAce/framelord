// =============================================================================
// WIDGET LAYOUT STORE — Customize contact dossier widget layout
// =============================================================================
// Allows users to reorder and show/hide widgets, save per-contact or global layouts
// =============================================================================

export type WidgetId = 
  | 'timeline'
  | 'keyDates'
  | 'frameScan'
  | 'tasks'
  | 'projects'
  | 'notes'
  | 'tags'
  | 'attachments'
  | 'openTasksOwed' // Contact Zero only
  | 'upcomingTasks' // Contact Zero only
  | 'topics' // Contact Zero only
  | 'activityFeed' // Contact Zero only
  | 'lastInteractions' // Contact Zero only
  | 'statsSummary';

export interface WidgetConfig {
  id: WidgetId;
  visible: boolean;
  order: number;
}

export interface WidgetLayout {
  widgets: WidgetConfig[];
  isGlobal: boolean; // true = global default, false = per-contact
  contactId?: string; // only set if isGlobal is false
}

// Default widget order and visibility
const DEFAULT_WIDGETS: WidgetConfig[] = [
  { id: 'timeline', visible: true, order: 0 },
  { id: 'keyDates', visible: true, order: 1 },
  { id: 'frameScan', visible: true, order: 2 },
  { id: 'tasks', visible: true, order: 3 },
  { id: 'projects', visible: true, order: 4 },
  { id: 'notes', visible: true, order: 5 },
  { id: 'tags', visible: true, order: 6 },
  { id: 'attachments', visible: true, order: 7 },
  { id: 'openTasksOwed', visible: true, order: 8 },
  { id: 'upcomingTasks', visible: true, order: 9 },
  { id: 'topics', visible: true, order: 10 },
  { id: 'activityFeed', visible: true, order: 11 },
  { id: 'lastInteractions', visible: true, order: 12 },
  { id: 'statsSummary', visible: true, order: 13 },
];

// In-memory storage
let globalLayout: WidgetLayout | null = null;
const contactLayouts = new Map<string, WidgetLayout>();

/**
 * Get widget layout for a contact
 * Returns contact-specific layout if exists, otherwise global layout, otherwise default
 */
export const getWidgetLayout = (contactId: string): WidgetLayout => {
  // Check for contact-specific layout
  if (contactLayouts.has(contactId)) {
    return contactLayouts.get(contactId)!;
  }
  
  // Check for global layout
  if (globalLayout) {
    return globalLayout;
  }
  
  // Return default
  return {
    widgets: [...DEFAULT_WIDGETS],
    isGlobal: true,
  };
};

/**
 * Save widget layout (global or per-contact)
 */
export const saveWidgetLayout = (layout: WidgetLayout): void => {
  if (layout.isGlobal) {
    globalLayout = layout;
    // Persist to localStorage
    localStorage.setItem('framelord_widget_layout_global', JSON.stringify(layout));
  } else if (layout.contactId) {
    contactLayouts.set(layout.contactId, layout);
    // Persist to localStorage
    localStorage.setItem(`framelord_widget_layout_${layout.contactId}`, JSON.stringify(layout));
  }
};

/**
 * Update widget visibility
 */
export const toggleWidgetVisibility = (contactId: string, widgetId: WidgetId, isGlobal: boolean = false): void => {
  const layout = isGlobal 
    ? (globalLayout || { widgets: [...DEFAULT_WIDGETS], isGlobal: true })
    : getWidgetLayout(contactId);
  
  const widget = layout.widgets.find(w => w.id === widgetId);
  if (widget) {
    widget.visible = !widget.visible;
    layout.isGlobal = isGlobal;
    if (!isGlobal) {
      layout.contactId = contactId;
    }
    saveWidgetLayout(layout);
  }
};

/**
 * Reorder widgets
 */
export const reorderWidgets = (contactId: string, newOrder: WidgetId[], isGlobal: boolean = false): void => {
  const layout = isGlobal
    ? (globalLayout || { widgets: [...DEFAULT_WIDGETS], isGlobal: true })
    : getWidgetLayout(contactId);
  
  // Update order for each widget
  newOrder.forEach((widgetId, index) => {
    const widget = layout.widgets.find(w => w.id === widgetId);
    if (widget) {
      widget.order = index;
    }
  });
  
  // Sort widgets by order
  layout.widgets.sort((a, b) => a.order - b.order);
  
  layout.isGlobal = isGlobal;
  if (!isGlobal) {
    layout.contactId = contactId;
  }
  
  saveWidgetLayout(layout);
};

/**
 * Reset to default layout
 */
export const resetWidgetLayout = (contactId: string, isGlobal: boolean = false): void => {
  const layout: WidgetLayout = {
    widgets: [...DEFAULT_WIDGETS],
    isGlobal,
    contactId: isGlobal ? undefined : contactId,
  };
  saveWidgetLayout(layout);
};

/**
 * Load layouts from localStorage on app start
 */
export const loadWidgetLayouts = (): void => {
  // Load global layout
  const globalData = localStorage.getItem('framelord_widget_layout_global');
  if (globalData) {
    try {
      globalLayout = JSON.parse(globalData);
    } catch (e) {
      console.error('Failed to load global widget layout', e);
    }
  }
  
  // Load contact-specific layouts (scan all localStorage keys)
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('framelord_widget_layout_') && key !== 'framelord_widget_layout_global') {
      const contactId = key.replace('framelord_widget_layout_', '');
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const layout = JSON.parse(data);
          contactLayouts.set(contactId, layout);
        } catch (e) {
          console.error(`Failed to load widget layout for contact ${contactId}`, e);
        }
      }
    }
  }
};

// Initialize on module load
if (typeof window !== 'undefined') {
  loadWidgetLayouts();
}







