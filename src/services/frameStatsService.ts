// =============================================================================
// FRAME STATS SERVICE — Pure selectors for dashboard metrics
// =============================================================================
// This module provides pure functions/selectors that read from existing stores
// to compute all dashboard metrics. No React hooks - just data transformations.
// All data flows from Contact Zero as the spine.
// =============================================================================

import { Contact } from '../types';
import {
  getAllContacts,
  getContactById,
  CONTACT_ZERO,
} from './contactStore';
import {
  getAllTasks,
  getTasksByContactId,
  getOpenTasksByDate,
  getTasksByDateRange,
} from './taskStore';
import {
  getAllInteractions,
  getInteractionsByContactId,
  getInteractionsByAuthorId,
} from './interactionStore';
import { getAllNotes } from './noteStore';
import {
  getContactZeroReports,
  getFrameScanReports,
  getReportsForContact,
  type FrameScanReport,
} from './frameScanReportStore';
import { computeCumulativeFrameProfileForContact } from '../lib/frameScan/frameProfile';

// =============================================================================
// TYPES
// =============================================================================

export interface ContactWeeklyStats {
  contactId: string;
  weekStart: string; // ISO date string
  scansCompleted: number;
  actionsCompleted: number;
  leaksResolved: number;
  weeklyPoints: number;
}

export interface FrameScoreSnapshot {
  contactId: string;
  currentScore: number;
  trend: 'up' | 'down' | 'flat';
  scansCount: number;
  lastScanAt: string | null;
}

export interface OverviewKpis {
  scansCompleted: number;
  scansLabel: string; // "COMPLETED" or "PENDING"
  frameLeaks: number;
  leaksLabel: string; // "INCONGRUENT" or "SEALED"
  actionsDue: number;
  streakWeeks: number;
}

export interface TimelineDataPoint {
  ts: number;
  label: string;
  scans: number;
  actions: number;
  score: number;
}

export interface WorkloadContact {
  contact: Contact;
  frameScore: number;
  trend: 'up' | 'down' | 'flat';
  lastContactAt: string | null;
  nextActionAt: string | null;
  hasActiveLeak: boolean;
  hasDueTask: boolean;
  needsAttention: boolean;
}

export interface LeaderboardEntry {
  contact: Contact;
  weeklyPoints: number;
  streak: number;
  isNew: boolean;
  statusLabel: string; // "NEW REBEL" or "REBEL"
}

export interface ThingsDueItem {
  id: string;
  title: string;
  time: string;
  type: 'task' | 'event';
  sortTime: number;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the start of a week (Monday) for a given date
 */
const getWeekStart = (date: Date): Date => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get date string in YYYY-MM-DD format
 */
const toDateString = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Check if a date is within a range
 */
const isWithinRange = (date: Date, start: Date, end: Date): boolean => {
  return date >= start && date <= end;
};

/**
 * Check if a contact was created within the last N days
 */
const isContactNew = (contact: Contact, days: number = 30): boolean => {
  // If contact has createdAt field, use it
  // For now, we'll assume contacts without explicit creation dates are not new
  // In a real implementation, this would check contact.createdAt
  return false; // TODO: Add createdAt field to Contact type
};

/**
 * Get reports for a specific contact within a date range
 */
const getReportsInRange = (
  contactId: string,
  startDate: Date,
  endDate: Date
): FrameScanReport[] => {
  const allReports = contactId === CONTACT_ZERO.id
    ? getContactZeroReports()
    : getReportsForContact(contactId);

  return allReports.filter(r => {
    const reportDate = new Date(r.createdAt);
    return isWithinRange(reportDate, startDate, endDate);
  });
};

/**
 * Calculate frame leaks for a contact
 * Frame leaks = overdue tasks + low frame score patterns
 */
const calculateFrameLeaks = (contactId: string): number => {
  const allTasks = getAllTasks();
  const now = new Date();

  // Overdue tasks (open tasks past due date)
  const overdueTasks = allTasks.filter(t =>
    t.contactId === contactId &&
    t.dueAt &&
    new Date(t.dueAt) < now &&
    t.status !== 'done'
  ).length;

  // Low frame score reports (validation traps)
  const reports = contactId === CONTACT_ZERO.id
    ? getContactZeroReports()
    : getReportsForContact(contactId);

  const lowFrameScoreReports = reports.filter(r =>
    r.score && r.score.frameScore && r.score.frameScore < 60
  ).length;

  return overdueTasks + lowFrameScoreReports;
};

/**
 * Calculate weekly completion streak
 */
const calculateStreakWeeks = (contactId: string): number => {
  const allTasks = getAllTasks();
  const now = new Date();
  let streak = 0;

  // Check each week going back up to 12 weeks
  for (let week = 0; week < 12; week++) {
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - (week * 7) - weekStart.getDay());
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekTasks = allTasks.filter(t =>
      t.contactId === contactId &&
      t.createdAt &&
      new Date(t.createdAt) >= weekStart &&
      new Date(t.createdAt) <= weekEnd
    );

    const completedThisWeek = weekTasks.filter(t => t.status === 'done').length;

    // Consider a week successful if at least 1 task was completed
    if (completedThisWeek >= 1) {
      streak++;
    } else if (week > 0) {
      // Break streak if no tasks completed (except current week)
      break;
    }
  }

  return streak;
};

// =============================================================================
// PUBLIC SELECTORS
// =============================================================================

/**
 * Get weekly stats for a contact
 * weeklyPoints = scansCompleted * 3 + actionsCompleted * 1 + leaksResolved * 2
 */
export const getContactWeeklyStats = (
  _tenantId: string,
  contactId: string,
  weekStartStr?: string
): ContactWeeklyStats => {
  const now = new Date();
  const weekStart = weekStartStr
    ? new Date(weekStartStr)
    : getWeekStart(now);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  // Scans completed this week
  const reports = getReportsInRange(contactId, weekStart, weekEnd);
  const scansCompleted = reports.length;

  // Actions (tasks) completed this week
  const allTasks = getTasksByContactId(contactId);
  const actionsCompleted = allTasks.filter(t => {
    if (t.status !== 'done') return false;
    // Assume task was completed recently if it's done
    // In a real implementation, we'd track completedAt timestamp
    const taskDate = t.dueAt ? new Date(t.dueAt) : new Date(t.createdAt);
    return isWithinRange(taskDate, weekStart, weekEnd);
  }).length;

  // Leaks resolved (for now, count low-score reports that were followed by higher scores)
  // Simplified: count as 0 for now
  const leaksResolved = 0; // TODO: Track leak resolution

  // Calculate weekly points
  const weeklyPoints = (scansCompleted * 3) + (actionsCompleted * 1) + (leaksResolved * 2);

  return {
    contactId,
    weekStart: toDateString(weekStart),
    scansCompleted,
    actionsCompleted,
    leaksResolved,
    weeklyPoints,
  };
};

/**
 * Get current frame score snapshot for a contact
 */
export const getFrameScoreSnapshot = (contactId: string): FrameScoreSnapshot => {
  const reports = contactId === CONTACT_ZERO.id
    ? getContactZeroReports()
    : getReportsForContact(contactId);

  const profile = computeCumulativeFrameProfileForContact(contactId, reports);

  // Determine trend from recent reports
  let trend: 'up' | 'down' | 'flat' = 'flat';
  if (reports.length >= 2) {
    const sortedReports = [...reports].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    const latest = sortedReports[0]?.score?.frameScore || 0;
    const previous = sortedReports[1]?.score?.frameScore || 0;
    if (latest > previous + 5) trend = 'up';
    else if (latest < previous - 5) trend = 'down';
  }

  const lastReport = reports.length > 0
    ? [...reports].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0]
    : null;

  return {
    contactId,
    currentScore: profile.currentFrameScore || 50,
    trend,
    scansCount: profile.scansCount || 0,
    lastScanAt: lastReport?.createdAt || null,
  };
};

/**
 * Get overview KPIs for the dashboard
 */
export const getOverviewKpis = (
  contactId: string,
  range: 'week' | 'month' | 'year' = 'week'
): OverviewKpis => {
  const now = new Date();
  const rangeStart = new Date(now);

  if (range === 'week') {
    rangeStart.setDate(rangeStart.getDate() - 7);
  } else if (range === 'month') {
    rangeStart.setDate(rangeStart.getDate() - 30);
  } else {
    rangeStart.setFullYear(rangeStart.getFullYear() - 1);
  }

  // Scans completed in range
  const reports = getReportsInRange(contactId, rangeStart, now);
  const scansCompleted = reports.length;
  const scansLabel = scansCompleted > 0 ? 'COMPLETED' : 'PENDING';

  // Frame leaks
  const frameLeaks = calculateFrameLeaks(contactId);
  const leaksLabel = frameLeaks > 0 ? 'INCONGRUENT' : 'SEALED';

  // Actions due (open tasks with due date <= end of today)
  const allTasks = getTasksByContactId(contactId);
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  const actionsDue = allTasks.filter(t =>
    t.status === 'open' &&
    t.dueAt &&
    new Date(t.dueAt) <= todayEnd
  ).length;

  // Streak calculation
  const streakWeeks = calculateStreakWeeks(contactId);

  return {
    scansCompleted,
    scansLabel,
    frameLeaks,
    leaksLabel,
    actionsDue,
    streakWeeks,
  };
};

/**
 * Get timeline data for the overview chart
 */
export const getOverviewTimeline = (
  contactId: string,
  range: 'week' | 'month' | 'year'
): TimelineDataPoint[] => {
  const now = new Date();
  const rangeStart = new Date(now);

  if (range === 'week') {
    rangeStart.setDate(rangeStart.getDate() - 6);
  } else if (range === 'month') {
    rangeStart.setDate(rangeStart.getDate() - 29);
  } else {
    rangeStart.setMonth(rangeStart.getMonth() - 11);
  }

  const bucketCount = range === 'year' ? 12 : range === 'month' ? 30 : 7;
  const dayMs = 24 * 60 * 60 * 1000;

  const buckets: TimelineDataPoint[] = [];

  for (let i = 0; i < bucketCount; i++) {
    const d = new Date(rangeStart);
    if (range === 'year') {
      d.setMonth(rangeStart.getMonth() + i);
    } else {
      d.setDate(rangeStart.getDate() + i);
    }

    buckets.push({
      ts: d.getTime(),
      label: range === 'year'
        ? d.toLocaleDateString('en-US', { month: 'short' })
        : `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`,
      scans: 0,
      actions: 0,
      score: 0,
    });
  }

  // Helper to find bucket index for a date
  const clampToBucket = (dateStr?: string | null): number => {
    if (!dateStr) return -1;
    const ts = new Date(dateStr).getTime();
    if (Number.isNaN(ts)) return -1;
    if (ts < rangeStart.getTime() || ts > now.getTime()) return -1;

    if (range === 'year') {
      const monthsDiff =
        (new Date(ts).getFullYear() - rangeStart.getFullYear()) * 12 +
        (new Date(ts).getMonth() - rangeStart.getMonth());
      return Math.min(Math.max(monthsDiff, 0), bucketCount - 1);
    }

    const daysDiff = Math.floor((ts - rangeStart.getTime()) / dayMs);
    return Math.min(Math.max(daysDiff, 0), bucketCount - 1);
  };

  // Aggregate scans from reports
  const reports = contactId === CONTACT_ZERO.id
    ? getContactZeroReports()
    : getReportsForContact(contactId);

  reports.forEach(report => {
    const idx = clampToBucket(report.createdAt);
    if (idx >= 0) {
      buckets[idx].scans += 1;
    }
  });

  // Aggregate actions from tasks and notes
  const tasks = getTasksByContactId(contactId);
  tasks.forEach(task => {
    const idx = clampToBucket(task.dueAt || task.createdAt);
    if (idx >= 0) {
      buckets[idx].actions += 1;
    }
  });

  const notes = getAllNotes().filter(n => n.contactId === contactId || n.authorContactId === contactId);
  notes.forEach(note => {
    const idx = clampToBucket(note.createdAt);
    if (idx >= 0) {
      buckets[idx].actions += 1;
    }
  });

  // Aggregate interactions as activity
  const interactions = contactId === CONTACT_ZERO.id
    ? getInteractionsByAuthorId(contactId)
    : getInteractionsByContactId(contactId);

  interactions.forEach(int => {
    const idx = clampToBucket(int.occurredAt);
    if (idx >= 0) {
      buckets[idx].scans += 1; // Count interactions as scans for activity
    }
  });

  // Calculate scores based on activity and frame score
  const contact = getContactById(contactId);
  const baseScore = contact?.frame?.currentScore || 50;

  buckets.forEach((bucket, i) => {
    // Score based on activity level and base frame score
    const activityBoost = (bucket.scans * 0.5 + bucket.actions * 0.3);
    const trendVariation = Math.sin(i * 0.3) * 5;

    let score = baseScore + activityBoost + trendVariation;
    score = Math.max(30, Math.min(100, score));
    bucket.score = Math.round(score);
  });

  return buckets;
};

/**
 * Get contacts that need attention for the Cases/Workload view
 */
export const getActiveWorkloadContacts = (_tenantId: string): WorkloadContact[] => {
  const contacts = getAllContacts().filter(c =>
    c.id !== CONTACT_ZERO.id &&
    c.status === 'active'
  );

  const now = new Date();
  const sevenDaysFromNow = new Date(now);
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  return contacts
    .map(contact => {
      const tasks = getTasksByContactId(contact.id);
      const interactions = getInteractionsByContactId(contact.id);

      // Check for tasks due in next 7 days
      const hasDueTask = tasks.some(t =>
        t.status === 'open' &&
        t.dueAt &&
        new Date(t.dueAt) <= sevenDaysFromNow
      );

      // Check for active leaks
      const hasActiveLeak = calculateFrameLeaks(contact.id) > 0;

      // Check for no recent interaction
      const lastInteraction = interactions.length > 0
        ? [...interactions].sort(
            (a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime()
          )[0]
        : null;
      const noRecentInteraction = !lastInteraction ||
        new Date(lastInteraction.occurredAt) < thirtyDaysAgo;

      // Needs attention if any condition is true
      const needsAttention = hasDueTask || hasActiveLeak || noRecentInteraction;

      // Get next action date from tasks
      const openTasks = tasks.filter(t => t.status === 'open' && t.dueAt);
      const nextTask = openTasks.length > 0
        ? openTasks.sort((a, b) =>
            new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime()
          )[0]
        : null;

      return {
        contact,
        frameScore: contact.frame?.currentScore || 50,
        trend: contact.frame?.trend || 'flat',
        lastContactAt: contact.lastContactAt,
        nextActionAt: nextTask?.dueAt || null,
        hasActiveLeak,
        hasDueTask,
        needsAttention,
      };
    })
    .filter(wc => wc.needsAttention)
    .sort((a, b) => {
      // Sort by urgency: leaks first, then due tasks, then no interaction
      if (a.hasActiveLeak !== b.hasActiveLeak) return a.hasActiveLeak ? -1 : 1;
      if (a.hasDueTask !== b.hasDueTask) return a.hasDueTask ? -1 : 1;
      return 0;
    });
};

/**
 * Get tasks and events due today for Contact Zero
 */
export const getThingsDueToday = (contactId: string): ThingsDueItem[] => {
  const today = new Date();
  const todayStr = toDateString(today);

  // Get tasks due today
  const tasks = getOpenTasksByDate(todayStr).filter(t => t.contactId === contactId);

  const items: ThingsDueItem[] = tasks.map(task => {
    const hasTime = task.dueAt?.includes('T');
    const timeStr = hasTime
      ? new Date(task.dueAt!).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      : 'No time set';

    return {
      id: task.id,
      title: task.title,
      time: timeStr,
      type: 'task' as const,
      sortTime: task.dueAt ? new Date(task.dueAt).getTime() : 0,
    };
  });

  // Sort by time
  items.sort((a, b) => a.sortTime - b.sortTime);

  return items;
};

/**
 * Get leaderboard for Rebels Ranking
 */
export const getLeaderboard = (_tenantId: string, weekStartStr?: string): LeaderboardEntry[] => {
  const contacts = getAllContacts().filter(c =>
    c.id !== CONTACT_ZERO.id &&
    c.status === 'active'
  );

  const now = new Date();
  const weekStart = weekStartStr
    ? new Date(weekStartStr)
    : getWeekStart(now);

  return contacts
    .map(contact => {
      const stats = getContactWeeklyStats('default', contact.id, toDateString(weekStart));
      const isNew = isContactNew(contact, 30);

      // Calculate streak based on weekly activity
      const allTasks = getTasksByContactId(contact.id);
      const completedTasks = allTasks.filter(t => t.status === 'done').length;
      const notes = getAllNotes().filter(n => n.contactId === contact.id);
      const interactions = getInteractionsByContactId(contact.id);

      // Simplified streak: based on total activity
      const totalActivity = completedTasks + notes.length + interactions.length;
      const streak = Math.min(Math.floor(totalActivity / 3), 52);

      return {
        contact,
        weeklyPoints: stats.weeklyPoints,
        streak,
        isNew,
        statusLabel: isNew ? 'NEW REBEL' : 'REBEL',
      };
    })
    .sort((a, b) => b.weeklyPoints - a.weeklyPoints)
    .slice(0, 5);
};

/**
 * Get Frame Integrity metrics for the widget
 */
export const getFrameIntegrityMetrics = (contactId: string): {
  frameScore: number;
  scansDone: number;
  frameLeaks: number;
  scansLabel: string;
  leaksLabel: string;
} => {
  const snapshot = getFrameScoreSnapshot(contactId);
  const leaks = calculateFrameLeaks(contactId);

  return {
    frameScore: snapshot.currentScore,
    scansDone: snapshot.scansCount,
    frameLeaks: leaks,
    scansLabel: snapshot.scansCount > 0 ? 'COMPLETED' : 'PENDING',
    leaksLabel: leaks > 0 ? 'INCONGRUENT' : 'SEALED',
  };
};
