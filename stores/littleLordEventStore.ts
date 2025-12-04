// =============================================================================
// LITTLE LORD EVENT STORE — Frame struggle event tracking
// =============================================================================
// Records frame struggle events detected by AI or user input.
// Each event triggers frame health recomputation.
// =============================================================================

import type { 
  LittleLordEvent, 
  LittleLordEventTopic, 
  LittleLordEventPattern, 
  LittleLordEventSeverity 
} from '../types/multiTenant';

const STORAGE_KEY = 'framelord_little_lord_events';

// In-memory cache
let events: LittleLordEvent[] = [];
let initialized = false;

// Event listeners for frame health recomputation
type EventListener = (event: LittleLordEvent) => void;
const listeners: EventListener[] = [];

// =============================================================================
// INITIALIZATION
// =============================================================================

function init(): void {
  if (initialized) return;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        events = parsed;
      }
    }
  } catch {
    console.warn('[LittleLordEventStore] Failed to load from localStorage');
  }
  
  initialized = true;
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    console.warn('[LittleLordEventStore] Failed to persist to localStorage');
  }
}

// =============================================================================
// EVENT RECORDING
// =============================================================================

/**
 * Record a Little Lord event
 * This triggers frame health recomputation via listeners
 */
export function recordLittleLordEvent(
  eventData: Omit<LittleLordEvent, 'id'>
): LittleLordEvent {
  init();
  
  const event: LittleLordEvent = {
    id: `lle_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    ...eventData,
  };
  
  events = [event, ...events];
  persist();
  
  // Notify listeners (for frame health recomputation)
  listeners.forEach(listener => {
    try {
      listener(event);
    } catch (error) {
      console.error('[LittleLordEventStore] Listener error:', error);
    }
  });
  
  // BACKEND TODO: Store in database
  // BACKEND TODO: Trigger frame health computation job
  console.log('[LittleLordEventStore] Event recorded:', event.id);
  
  return event;
}

/**
 * Subscribe to new events
 */
export function onLittleLordEvent(listener: EventListener): () => void {
  listeners.push(listener);
  return () => {
    const index = listeners.indexOf(listener);
    if (index >= 0) listeners.splice(index, 1);
  };
}

// =============================================================================
// QUERY OPERATIONS
// =============================================================================

/**
 * Get all events for a user within a tenant
 */
export function getEventsForUser(tenantId: string, userId: string): LittleLordEvent[] {
  init();
  return events.filter(e => e.tenantId === tenantId && e.userId === userId);
}

/**
 * Get events in a time window
 */
export function getEventsInWindow(
  tenantId: string,
  userId: string,
  startDate: string,
  endDate: string
): LittleLordEvent[] {
  init();
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  
  return events.filter(e => {
    if (e.tenantId !== tenantId || e.userId !== userId) return false;
    const timestamp = new Date(e.timestamp).getTime();
    return timestamp >= start && timestamp <= end;
  });
}

/**
 * Get events by topic
 */
export function getEventsByTopic(
  tenantId: string,
  userId: string,
  topic: LittleLordEventTopic
): LittleLordEvent[] {
  init();
  return events.filter(e => 
    e.tenantId === tenantId && 
    e.userId === userId && 
    e.topic === topic
  );
}

/**
 * Get events by severity
 */
export function getEventsBySeverity(
  tenantId: string,
  userId: string,
  severity: LittleLordEventSeverity
): LittleLordEvent[] {
  init();
  return events.filter(e => 
    e.tenantId === tenantId && 
    e.userId === userId && 
    e.severity === severity
  );
}

/**
 * Get recent events
 */
export function getRecentEvents(
  tenantId: string,
  userId: string,
  count: number = 10
): LittleLordEvent[] {
  const userEvents = getEventsForUser(tenantId, userId);
  return userEvents
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, count);
}

/**
 * Count events in window by topic
 */
export function countEventsByTopic(
  tenantId: string,
  userId: string,
  startDate: string,
  endDate: string
): Record<LittleLordEventTopic, number> {
  const windowEvents = getEventsInWindow(tenantId, userId, startDate, endDate);
  
  const counts: Record<LittleLordEventTopic, number> = {
    RELATIONSHIP: 0,
    LEADERSHIP: 0,
    BUSINESS: 0,
    SELF_REGULATION: 0,
  };
  
  windowEvents.forEach(e => {
    counts[e.topic]++;
  });
  
  return counts;
}

/**
 * Find repeated topics (same topic appearing multiple times)
 */
export function findRepeatedTopics(
  tenantId: string,
  userId: string,
  startDate: string,
  endDate: string,
  threshold: number = 2
): LittleLordEventTopic[] {
  const counts = countEventsByTopic(tenantId, userId, startDate, endDate);
  
  return (Object.entries(counts) as [LittleLordEventTopic, number][])
    .filter(([_, count]) => count >= threshold)
    .map(([topic, _]) => topic);
}

// =============================================================================
// ALL TENANTS QUERIES (Platform Admin)
// =============================================================================

/**
 * Get all events across all tenants
 */
export function getAllEvents(): LittleLordEvent[] {
  init();
  return [...events];
}

/**
 * Get events for a tenant
 */
export function getEventsForTenant(tenantId: string): LittleLordEvent[] {
  init();
  return events.filter(e => e.tenantId === tenantId);
}

// =============================================================================
// TOPIC AND PATTERN HELPERS
// =============================================================================

export function getTopicLabel(topic: LittleLordEventTopic): string {
  const labels: Record<LittleLordEventTopic, string> = {
    RELATIONSHIP: 'Relationship',
    LEADERSHIP: 'Leadership',
    BUSINESS: 'Business',
    SELF_REGULATION: 'Self-Regulation',
  };
  return labels[topic];
}

export function getPatternLabel(pattern: LittleLordEventPattern): string {
  const labels: Record<LittleLordEventPattern, string> = {
    RECURRING_STUCK: 'Recurring Stuck Pattern',
    FRAME_COLLAPSE: 'Frame Collapse',
    NEEDY_BEHAVIOR: 'Needy Behavior',
    AVOIDANCE: 'Avoidance Pattern',
  };
  return labels[pattern];
}

export function getSeverityLabel(severity: LittleLordEventSeverity): string {
  const labels: Record<LittleLordEventSeverity, string> = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
  };
  return labels[severity];
}

// =============================================================================
// RESET (TESTING ONLY)
// =============================================================================

export function resetLittleLordEventStore(): void {
  events = [];
  initialized = false;
  localStorage.removeItem(STORAGE_KEY);
}

