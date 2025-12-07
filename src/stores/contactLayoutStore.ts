// =============================================================================
// CONTACT LAYOUT STORE — Persistent storage for contact dashboard layouts
// =============================================================================
// Manages per-contact widget ordering with localStorage persistence.
// Falls back to default layouts when no custom layout is saved.
// =============================================================================

import type { 
  ContactLayoutConfig, 
  ContactWidgetId 
} from '../lib/layout/contactLayoutConfig';
import { 
  defaultContactLayout, 
  defaultContactZeroLayout 
} from '../lib/layout/contactLayoutConfig';
import { CONTACT_ZERO } from '../services/contactStore';

const STORAGE_KEY = 'framelord_contact_layouts';

// In-memory cache
let configs: ContactLayoutConfig[] = [];
let initialized = false;

/**
 * Initialize from localStorage
 */
function init(): void {
  if (initialized) return;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        configs = parsed;
      }
    }
  } catch {
    // Ignore parse errors, use defaults
  }
  
  initialized = true;
}

/**
 * Persist to localStorage
 */
function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  } catch {
    // localStorage may be full or blocked
  }
}

/**
 * Get layout config for a specific contact
 * Returns Contact Zero default, contact default, or custom layout
 */
export function getLayoutForContact(contactId: string): ContactLayoutConfig {
  init();
  
  // Check for custom layout for this contact
  const specific = configs.find(c => c.contactId === contactId);
  if (specific) {
    return specific;
  }
  
  // Return appropriate default
  if (contactId === CONTACT_ZERO.id || contactId === 'contactZero') {
    return defaultContactZeroLayout;
  }
  
  return defaultContactLayout;
}

/**
 * Update or create a layout for a specific contact
 */
export function updateLayoutForContact(
  contactId: string, 
  widgetOrder: ContactWidgetId[]
): ContactLayoutConfig {
  init();
  
  const existingIndex = configs.findIndex(c => c.contactId === contactId);
  const next: ContactLayoutConfig = { contactId, widgetOrder };
  
  if (existingIndex >= 0) {
    configs[existingIndex] = next;
  } else {
    configs = [...configs, next];
  }
  
  persist();
  return next;
}

/**
 * Reset a contact's layout to default
 */
export function resetLayoutForContact(contactId: string): ContactLayoutConfig {
  init();
  
  configs = configs.filter(c => c.contactId !== contactId);
  persist();
  
  // Return the default
  return getLayoutForContact(contactId);
}

/**
 * Move a widget up in the order
 */
export function moveWidgetUp(contactId: string, widgetId: ContactWidgetId): ContactLayoutConfig {
  const layout = getLayoutForContact(contactId);
  const order = [...layout.widgetOrder];
  const index = order.indexOf(widgetId);
  
  if (index > 0) {
    [order[index - 1], order[index]] = [order[index], order[index - 1]];
    return updateLayoutForContact(contactId, order);
  }
  
  return layout;
}

/**
 * Move a widget down in the order
 */
export function moveWidgetDown(contactId: string, widgetId: ContactWidgetId): ContactLayoutConfig {
  const layout = getLayoutForContact(contactId);
  const order = [...layout.widgetOrder];
  const index = order.indexOf(widgetId);
  
  if (index >= 0 && index < order.length - 1) {
    [order[index], order[index + 1]] = [order[index + 1], order[index]];
    return updateLayoutForContact(contactId, order);
  }
  
  return layout;
}

/**
 * Remove a widget from the layout
 */
export function removeWidget(contactId: string, widgetId: ContactWidgetId): ContactLayoutConfig {
  const layout = getLayoutForContact(contactId);
  const order = layout.widgetOrder.filter(id => id !== widgetId);
  return updateLayoutForContact(contactId, order);
}

/**
 * Add a widget to the layout (at the end)
 */
export function addWidget(contactId: string, widgetId: ContactWidgetId): ContactLayoutConfig {
  const layout = getLayoutForContact(contactId);
  if (layout.widgetOrder.includes(widgetId)) {
    return layout; // Already present
  }
  return updateLayoutForContact(contactId, [...layout.widgetOrder, widgetId]);
}

/**
 * Get all custom layouts (for debugging/export)
 */
export function getAllCustomLayouts(): ContactLayoutConfig[] {
  init();
  return [...configs];
}







