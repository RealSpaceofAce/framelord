// =============================================================================
// LITTLE LORD EVENT DISPATCH — Event routing and metrics recording
// =============================================================================
// Handles LittleLordEvent emission, storage, and routing to:
// - Contact notes
// - Frame health aggregated metrics
// - Admin analytics dashboard
// =============================================================================

import type {
  LittleLordEvent,
  LittleLordEventTopic,
  LittleLordEventPattern,
  LittleLordEventSeverity,
} from '../../types/multiTenant';
import type { LittleLordEventData } from './types';
import { createNote } from '../noteStore';
import { CONTACT_ZERO } from '../contactStore';

// =============================================================================
// IN-MEMORY EVENT STORE
// =============================================================================
// In production, these would be persisted to a database

let LITTLE_LORD_EVENTS: LittleLordEvent[] = [];

// =============================================================================
// EVENT ID GENERATION
// =============================================================================

function generateEventId(): string {
  return `ll_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// =============================================================================
// EVENT DISPATCH
// =============================================================================

/**
 * Dispatch a Little Lord event.
 *
 * This function:
 * 1. Creates a complete LittleLordEvent record
 * 2. Stores it in the event log
 * 3. Creates a note on Contact Zero for the user
 * 4. Updates frame health metrics (future: aggregate to FrameHealthSnapshot)
 * 5. Routes to admin analytics (future: admin dashboard query endpoint)
 *
 * @param tenantId - Tenant ID
 * @param userId - User ID (Contact ID for Contact Zero)
 * @param eventData - The event data from Little Lord response
 */
export function dispatchLittleLordEvent(
  tenantId: string,
  userId: string,
  eventData: LittleLordEventData
): LittleLordEvent {
  const event: LittleLordEvent = {
    id: generateEventId(),
    tenantId,
    userId,
    timestamp: new Date().toISOString(),
    topic: eventData.topic,
    pattern: eventData.pattern,
    severity: eventData.severity,
    summary: eventData.summary,
  };

  // Store event
  LITTLE_LORD_EVENTS.push(event);

  // Create a note on Contact Zero for tracking
  try {
    createNote({
      contactId: CONTACT_ZERO.id,
      content: `[Little Lord Event]\nTopic: ${event.topic}\nPattern: ${event.pattern}\nSeverity: ${event.severity}\n\n${event.summary}`,
      tags: [
        'little-lord',
        `topic:${event.topic.toLowerCase()}`,
        `pattern:${event.pattern.toLowerCase()}`,
        `severity:${event.severity.toLowerCase()}`,
      ],
    });
  } catch (error) {
    console.error('Failed to create note for Little Lord event:', error);
  }

  // TODO: Update FrameHealthSnapshot aggregates
  // TODO: Route to admin analytics dashboard

  return event;
}

// =============================================================================
// EVENT QUERIES
// =============================================================================

/**
 * Get all Little Lord events for a user.
 */
export function getLittleLordEventsForUser(
  tenantId: string,
  userId: string
): LittleLordEvent[] {
  return LITTLE_LORD_EVENTS.filter(
    event => event.tenantId === tenantId && event.userId === userId
  );
}

/**
 * Get recent Little Lord events for a user.
 */
export function getRecentLittleLordEvents(
  tenantId: string,
  userId: string,
  limit: number = 10
): LittleLordEvent[] {
  const events = getLittleLordEventsForUser(tenantId, userId);
  return events
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, limit);
}

/**
 * Get Little Lord events by topic.
 */
export function getLittleLordEventsByTopic(
  tenantId: string,
  userId: string,
  topic: LittleLordEventTopic
): LittleLordEvent[] {
  return LITTLE_LORD_EVENTS.filter(
    event =>
      event.tenantId === tenantId &&
      event.userId === userId &&
      event.topic === topic
  );
}

/**
 * Get Little Lord events by pattern.
 */
export function getLittleLordEventsByPattern(
  tenantId: string,
  userId: string,
  pattern: LittleLordEventPattern
): LittleLordEvent[] {
  return LITTLE_LORD_EVENTS.filter(
    event =>
      event.tenantId === tenantId &&
      event.userId === userId &&
      event.pattern === pattern
  );
}

/**
 * Get Little Lord events by severity.
 */
export function getLittleLordEventsBySeverity(
  tenantId: string,
  userId: string,
  severity: LittleLordEventSeverity
): LittleLordEvent[] {
  return LITTLE_LORD_EVENTS.filter(
    event =>
      event.tenantId === tenantId &&
      event.userId === userId &&
      event.severity === severity
  );
}

/**
 * Get count of recurring patterns for a user.
 *
 * This helps identify if a user is stuck in the same pattern repeatedly.
 */
export function getPatternRecurrenceCount(
  tenantId: string,
  userId: string,
  pattern: LittleLordEventPattern,
  withinDays: number = 30
): number {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - withinDays);

  return LITTLE_LORD_EVENTS.filter(
    event =>
      event.tenantId === tenantId &&
      event.userId === userId &&
      event.pattern === pattern &&
      new Date(event.timestamp) >= cutoffDate
  ).length;
}

/**
 * Get aggregated metrics for admin dashboard.
 */
export function getAggregatedEventMetrics(tenantId: string, userId: string): {
  totalEvents: number;
  byTopic: Record<LittleLordEventTopic, number>;
  byPattern: Record<LittleLordEventPattern, number>;
  bySeverity: Record<LittleLordEventSeverity, number>;
  recentHighSeverityCount: number;
} {
  const events = getLittleLordEventsForUser(tenantId, userId);

  const byTopic: Record<LittleLordEventTopic, number> = {
    RELATIONSHIP: 0,
    LEADERSHIP: 0,
    BUSINESS: 0,
    SELF_REGULATION: 0,
  };

  const byPattern: Record<LittleLordEventPattern, number> = {
    RECURRING_STUCK: 0,
    FRAME_COLLAPSE: 0,
    NEEDY_BEHAVIOR: 0,
    AVOIDANCE: 0,
  };

  const bySeverity: Record<LittleLordEventSeverity, number> = {
    LOW: 0,
    MEDIUM: 0,
    HIGH: 0,
  };

  events.forEach(event => {
    byTopic[event.topic]++;
    byPattern[event.pattern]++;
    bySeverity[event.severity]++;
  });

  const recentHighSeverity = events.filter(event => {
    const isRecent = new Date(event.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return isRecent && event.severity === 'HIGH';
  });

  return {
    totalEvents: events.length,
    byTopic,
    byPattern,
    bySeverity,
    recentHighSeverityCount: recentHighSeverity.length,
  };
}

// =============================================================================
// ADMIN QUERIES
// =============================================================================

/**
 * Get all high-severity events across all tenants (SUPER_ADMIN only).
 */
export function getAllHighSeverityEvents(): LittleLordEvent[] {
  return LITTLE_LORD_EVENTS.filter(event => event.severity === 'HIGH').sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Get users with recurring patterns (coaching triage).
 */
export function getUsersWithRecurringPatterns(
  pattern: LittleLordEventPattern,
  minOccurrences: number = 3,
  withinDays: number = 30
): Array<{ tenantId: string; userId: string; count: number }> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - withinDays);

  const userCounts = new Map<string, { tenantId: string; userId: string; count: number }>();

  LITTLE_LORD_EVENTS.filter(
    event => event.pattern === pattern && new Date(event.timestamp) >= cutoffDate
  ).forEach(event => {
    const key = `${event.tenantId}:${event.userId}`;
    const existing = userCounts.get(key);

    if (existing) {
      existing.count++;
    } else {
      userCounts.set(key, {
        tenantId: event.tenantId,
        userId: event.userId,
        count: 1,
      });
    }
  });

  return Array.from(userCounts.values())
    .filter(user => user.count >= minOccurrences)
    .sort((a, b) => b.count - a.count);
}
