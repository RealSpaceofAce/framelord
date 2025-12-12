// =============================================================================
// CALENDAR INTEGRATION SERVICE — Multi-provider calendar connections
// =============================================================================
// Manages connections to external calendars (Google, Outlook, Apple).
// Includes plan gating - calendar sync requires beta_plus or higher.
//
// FUTURE: Implement actual OAuth flows for each provider.
// =============================================================================

import { canUseFeature, type PlanTier, PLAN_NAMES } from '../config/planConfig';
import { getTenantBilling } from './billingStore';

// =============================================================================
// TYPES
// =============================================================================

export type CalendarProvider = 'google' | 'outlook' | 'apple';

export type CalendarConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface CalendarConnection {
  provider: CalendarProvider;
  status: CalendarConnectionStatus;
  email?: string;
  lastSyncAt?: string;
  error?: string;
}

export interface CalendarIntegrationState {
  connections: Record<CalendarProvider, CalendarConnection>;
  syncEnabled: boolean;
  lastSyncAt?: string;
}

// =============================================================================
// STORAGE
// =============================================================================

const STORAGE_KEY = 'framelord_calendar_integration';

function getDefaultState(): CalendarIntegrationState {
  return {
    connections: {
      google: { provider: 'google', status: 'disconnected' },
      outlook: { provider: 'outlook', status: 'disconnected' },
      apple: { provider: 'apple', status: 'disconnected' },
    },
    syncEnabled: false,
  };
}

function loadState(): CalendarIntegrationState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[CalendarIntegration] Failed to load state:', e);
  }
  return getDefaultState();
}

function saveState(state: CalendarIntegrationState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[CalendarIntegration] Failed to save state:', e);
  }
}

// State
let state = loadState();

// Subscribers
const subscribers = new Set<() => void>();

function notifySubscribers(): void {
  subscribers.forEach((cb) => cb());
}

// =============================================================================
// PLAN GATING
// =============================================================================

/**
 * Check if calendar integration is available for the current plan
 */
export function canUseCalendarIntegration(tenantId?: string): boolean {
  const billing = getTenantBilling(tenantId || 'default');
  const plan = billing?.currentPlanTier || 'beta_free';
  return canUseFeature(plan, 'calendar_integration');
}

/**
 * Get the required plan for calendar integration
 */
export function getRequiredPlanForCalendar(): string {
  return PLAN_NAMES['beta_plus']; // Calendar requires beta_plus (Basic in production)
}

// =============================================================================
// GETTERS
// =============================================================================

/**
 * Get the current calendar integration state
 */
export function getCalendarIntegrationState(): CalendarIntegrationState {
  return { ...state };
}

/**
 * Get connection state for a specific provider
 */
export function getConnectionState(provider: CalendarProvider): CalendarConnection {
  return { ...state.connections[provider] };
}

/**
 * Check if any calendar is connected
 */
export function hasAnyCalendarConnected(): boolean {
  return Object.values(state.connections).some((c) => c.status === 'connected');
}

/**
 * Get list of connected calendars
 */
export function getConnectedCalendars(): CalendarConnection[] {
  return Object.values(state.connections).filter((c) => c.status === 'connected');
}

/**
 * Subscribe to state changes
 */
export function subscribeCalendarIntegration(callback: () => void): () => void {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

// =============================================================================
// ACTIONS
// =============================================================================

/**
 * Connect to a calendar provider (starts OAuth flow)
 * STUB: In production, this would redirect to OAuth
 */
export async function connectCalendar(
  provider: CalendarProvider,
  options?: { email?: string }
): Promise<{ success: boolean; error?: string }> {
  // Update status to connecting
  state.connections[provider] = {
    ...state.connections[provider],
    status: 'connecting',
  };
  saveState(state);
  notifySubscribers();

  // Simulate OAuth flow delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  // STUB: Simulate successful connection
  // In production, this would:
  // 1. Redirect to provider OAuth consent screen
  // 2. Receive callback with auth code
  // 3. Exchange for access/refresh tokens
  // 4. Store tokens securely
  // 5. Fetch calendar list and initial events

  state.connections[provider] = {
    provider,
    status: 'connected',
    email: options?.email || `user@${provider}.com`,
    lastSyncAt: new Date().toISOString(),
  };
  state.syncEnabled = true;
  state.lastSyncAt = new Date().toISOString();

  saveState(state);
  notifySubscribers();

  console.log(`[CalendarIntegration] Connected to ${provider}`);
  return { success: true };
}

/**
 * Disconnect from a calendar provider
 */
export function disconnectCalendar(provider: CalendarProvider): void {
  state.connections[provider] = {
    provider,
    status: 'disconnected',
    email: undefined,
    lastSyncAt: undefined,
  };

  // Check if any calendars still connected
  state.syncEnabled = hasAnyCalendarConnected();

  saveState(state);
  notifySubscribers();

  console.log(`[CalendarIntegration] Disconnected from ${provider}`);
}

/**
 * Sync events from all connected calendars
 * STUB: In production, this would fetch events from provider APIs
 */
export async function syncAllCalendars(): Promise<{ success: boolean; eventsCount: number }> {
  const connectedCalendars = getConnectedCalendars();
  if (connectedCalendars.length === 0) {
    return { success: false, eventsCount: 0 };
  }

  // Simulate sync delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Update last sync time
  state.lastSyncAt = new Date().toISOString();
  connectedCalendars.forEach((calendar) => {
    state.connections[calendar.provider].lastSyncAt = state.lastSyncAt;
  });

  saveState(state);
  notifySubscribers();

  // STUB: Return mock event count
  console.log('[CalendarIntegration] Sync complete');
  return { success: true, eventsCount: 15 };
}

/**
 * Toggle sync enabled/disabled
 */
export function setSyncEnabled(enabled: boolean): void {
  if (enabled && !hasAnyCalendarConnected()) {
    console.warn('[CalendarIntegration] Cannot enable sync without connected calendars');
    return;
  }

  state.syncEnabled = enabled;
  saveState(state);
  notifySubscribers();
}

// =============================================================================
// PROVIDER INFO
// =============================================================================

export interface CalendarProviderInfo {
  id: CalendarProvider;
  name: string;
  icon: string; // Lucide icon name
  description: string;
  comingSoon?: boolean;
}

export const CALENDAR_PROVIDERS: CalendarProviderInfo[] = [
  {
    id: 'google',
    name: 'Google Calendar',
    icon: 'Calendar',
    description: 'Sync with Google Calendar for two-way event management',
  },
  {
    id: 'outlook',
    name: 'Outlook Calendar',
    icon: 'Mail',
    description: 'Connect Microsoft Outlook for calendar sync',
    comingSoon: true,
  },
  {
    id: 'apple',
    name: 'Apple Calendar',
    icon: 'Apple',
    description: 'Sync with iCloud Calendar',
    comingSoon: true,
  },
];

/**
 * Get provider info by ID
 */
export function getProviderInfo(provider: CalendarProvider): CalendarProviderInfo | undefined {
  return CALENDAR_PROVIDERS.find((p) => p.id === provider);
}
