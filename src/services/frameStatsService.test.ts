// =============================================================================
// FRAME STATS SERVICE TESTS — Unit tests for dashboard metric selectors
// =============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  getContactWeeklyStats,
  getFrameScoreSnapshot,
  getOverviewKpis,
  getOverviewTimeline,
  getActiveWorkloadContacts,
  getThingsDueToday,
  getLeaderboard,
  getFrameIntegrityMetrics,
} from './frameStatsService';
import { CONTACT_ZERO } from './contactStore';

// =============================================================================
// TESTS
// =============================================================================

describe('frameStatsService', () => {
  // --- Weekly Points Calculation ---
  describe('getContactWeeklyStats', () => {
    it('should return weekly stats structure for Contact Zero', () => {
      const stats = getContactWeeklyStats('default', CONTACT_ZERO.id);

      expect(stats).toHaveProperty('contactId', CONTACT_ZERO.id);
      expect(stats).toHaveProperty('weekStart');
      expect(stats).toHaveProperty('scansCompleted');
      expect(stats).toHaveProperty('actionsCompleted');
      expect(stats).toHaveProperty('leaksResolved');
      expect(stats).toHaveProperty('weeklyPoints');
      expect(typeof stats.weeklyPoints).toBe('number');
    });

    it('should calculate weeklyPoints using the formula: scans*3 + actions*1 + leaks*2', () => {
      const stats = getContactWeeklyStats('default', CONTACT_ZERO.id);

      // weeklyPoints should equal scans*3 + actions*1 + leaksResolved*2
      const expectedPoints =
        stats.scansCompleted * 3 +
        stats.actionsCompleted * 1 +
        stats.leaksResolved * 2;

      expect(stats.weeklyPoints).toBe(expectedPoints);
    });

    it('should accept a custom week start date', () => {
      const customWeekStart = '2025-01-01';
      const stats = getContactWeeklyStats('default', CONTACT_ZERO.id, customWeekStart);

      expect(stats.weekStart).toBe(customWeekStart);
    });
  });

  // --- Frame Score Snapshot ---
  describe('getFrameScoreSnapshot', () => {
    it('should return frame score snapshot for Contact Zero', () => {
      const snapshot = getFrameScoreSnapshot(CONTACT_ZERO.id);

      expect(snapshot).toHaveProperty('contactId', CONTACT_ZERO.id);
      expect(snapshot).toHaveProperty('currentScore');
      expect(snapshot).toHaveProperty('trend');
      expect(snapshot).toHaveProperty('scansCount');
      expect(snapshot).toHaveProperty('lastScanAt');
    });

    it('should return valid trend value (up, down, or flat)', () => {
      const snapshot = getFrameScoreSnapshot(CONTACT_ZERO.id);

      expect(['up', 'down', 'flat']).toContain(snapshot.trend);
    });

    it('should return score in range 0-100', () => {
      const snapshot = getFrameScoreSnapshot(CONTACT_ZERO.id);

      expect(snapshot.currentScore).toBeGreaterThanOrEqual(0);
      expect(snapshot.currentScore).toBeLessThanOrEqual(100);
    });
  });

  // --- Overview KPIs ---
  describe('getOverviewKpis', () => {
    it('should return KPI structure for Contact Zero', () => {
      const kpis = getOverviewKpis(CONTACT_ZERO.id, 'week');

      expect(kpis).toHaveProperty('scansCompleted');
      expect(kpis).toHaveProperty('scansLabel');
      expect(kpis).toHaveProperty('frameLeaks');
      expect(kpis).toHaveProperty('leaksLabel');
      expect(kpis).toHaveProperty('actionsDue');
      expect(kpis).toHaveProperty('streakWeeks');
    });

    it('should return "COMPLETED" scansLabel when scans > 0, "PENDING" otherwise', () => {
      const kpis = getOverviewKpis(CONTACT_ZERO.id, 'week');

      if (kpis.scansCompleted > 0) {
        expect(kpis.scansLabel).toBe('COMPLETED');
      } else {
        expect(kpis.scansLabel).toBe('PENDING');
      }
    });

    it('should return "INCONGRUENT" leaksLabel when leaks > 0, "SEALED" otherwise', () => {
      const kpis = getOverviewKpis(CONTACT_ZERO.id, 'week');

      if (kpis.frameLeaks > 0) {
        expect(kpis.leaksLabel).toBe('INCONGRUENT');
      } else {
        expect(kpis.leaksLabel).toBe('SEALED');
      }
    });

    it('should accept different range values', () => {
      const weekKpis = getOverviewKpis(CONTACT_ZERO.id, 'week');
      const monthKpis = getOverviewKpis(CONTACT_ZERO.id, 'month');
      const yearKpis = getOverviewKpis(CONTACT_ZERO.id, 'year');

      // All should return valid KPI structures
      expect(weekKpis).toHaveProperty('scansCompleted');
      expect(monthKpis).toHaveProperty('scansCompleted');
      expect(yearKpis).toHaveProperty('scansCompleted');
    });
  });

  // --- Timeline Aggregation ---
  describe('getOverviewTimeline', () => {
    it('should return 7 data points for week range', () => {
      const timeline = getOverviewTimeline(CONTACT_ZERO.id, 'week');

      expect(timeline.length).toBe(7);
    });

    it('should return 30 data points for month range', () => {
      const timeline = getOverviewTimeline(CONTACT_ZERO.id, 'month');

      expect(timeline.length).toBe(30);
    });

    it('should return 12 data points for year range', () => {
      const timeline = getOverviewTimeline(CONTACT_ZERO.id, 'year');

      expect(timeline.length).toBe(12);
    });

    it('should return timeline data with correct structure', () => {
      const timeline = getOverviewTimeline(CONTACT_ZERO.id, 'week');

      timeline.forEach(point => {
        expect(point).toHaveProperty('ts');
        expect(point).toHaveProperty('label');
        expect(point).toHaveProperty('scans');
        expect(point).toHaveProperty('actions');
        expect(point).toHaveProperty('score');
        expect(typeof point.ts).toBe('number');
        expect(typeof point.scans).toBe('number');
        expect(typeof point.actions).toBe('number');
        expect(typeof point.score).toBe('number');
      });
    });

    it('should have timestamps in ascending order', () => {
      const timeline = getOverviewTimeline(CONTACT_ZERO.id, 'week');

      for (let i = 1; i < timeline.length; i++) {
        expect(timeline[i].ts).toBeGreaterThan(timeline[i - 1].ts);
      }
    });
  });

  // --- Active Workload Selection ---
  describe('getActiveWorkloadContacts', () => {
    it('should return array of workload contacts', () => {
      const workload = getActiveWorkloadContacts('default');

      expect(Array.isArray(workload)).toBe(true);
    });

    it('should exclude Contact Zero from workload', () => {
      const workload = getActiveWorkloadContacts('default');

      const hasContactZero = workload.some(w => w.contact.id === CONTACT_ZERO.id);
      expect(hasContactZero).toBe(false);
    });

    it('should return contacts with needsAttention=true', () => {
      const workload = getActiveWorkloadContacts('default');

      workload.forEach(w => {
        expect(w.needsAttention).toBe(true);
      });
    });

    it('should include workload metadata for each contact', () => {
      const workload = getActiveWorkloadContacts('default');

      workload.forEach(w => {
        expect(w).toHaveProperty('contact');
        expect(w).toHaveProperty('frameScore');
        expect(w).toHaveProperty('trend');
        expect(w).toHaveProperty('lastContactAt');
        expect(w).toHaveProperty('nextActionAt');
        expect(w).toHaveProperty('hasActiveLeak');
        expect(w).toHaveProperty('hasDueTask');
        expect(w).toHaveProperty('needsAttention');
      });
    });
  });

  // --- Things Due Today ---
  describe('getThingsDueToday', () => {
    it('should return array of due items', () => {
      const items = getThingsDueToday(CONTACT_ZERO.id);

      expect(Array.isArray(items)).toBe(true);
    });

    it('should return items with correct structure', () => {
      const items = getThingsDueToday(CONTACT_ZERO.id);

      items.forEach(item => {
        expect(item).toHaveProperty('id');
        expect(item).toHaveProperty('title');
        expect(item).toHaveProperty('time');
        expect(item).toHaveProperty('type');
        expect(item).toHaveProperty('sortTime');
        expect(item.type).toBe('task'); // Currently only tasks are supported
      });
    });

    it('should return items sorted by sortTime', () => {
      const items = getThingsDueToday(CONTACT_ZERO.id);

      for (let i = 1; i < items.length; i++) {
        expect(items[i].sortTime).toBeGreaterThanOrEqual(items[i - 1].sortTime);
      }
    });
  });

  // --- Leaderboard ---
  describe('getLeaderboard', () => {
    it('should return max 5 entries (top 5)', () => {
      const leaderboard = getLeaderboard('default');

      expect(leaderboard.length).toBeLessThanOrEqual(5);
    });

    it('should exclude Contact Zero from leaderboard', () => {
      const leaderboard = getLeaderboard('default');

      const hasContactZero = leaderboard.some(e => e.contact.id === CONTACT_ZERO.id);
      expect(hasContactZero).toBe(false);
    });

    it('should return entries sorted by weeklyPoints descending', () => {
      const leaderboard = getLeaderboard('default');

      for (let i = 1; i < leaderboard.length; i++) {
        expect(leaderboard[i].weeklyPoints).toBeLessThanOrEqual(leaderboard[i - 1].weeklyPoints);
      }
    });

    it('should include statusLabel for each entry', () => {
      const leaderboard = getLeaderboard('default');

      leaderboard.forEach(entry => {
        expect(entry).toHaveProperty('statusLabel');
        expect(['NEW REBEL', 'REBEL']).toContain(entry.statusLabel);
      });
    });
  });

  // --- Frame Integrity Metrics ---
  describe('getFrameIntegrityMetrics', () => {
    it('should return frame integrity metrics for Contact Zero', () => {
      const metrics = getFrameIntegrityMetrics(CONTACT_ZERO.id);

      expect(metrics).toHaveProperty('frameScore');
      expect(metrics).toHaveProperty('scansDone');
      expect(metrics).toHaveProperty('frameLeaks');
      expect(metrics).toHaveProperty('scansLabel');
      expect(metrics).toHaveProperty('leaksLabel');
    });

    it('should return valid score range', () => {
      const metrics = getFrameIntegrityMetrics(CONTACT_ZERO.id);

      expect(metrics.frameScore).toBeGreaterThanOrEqual(0);
      expect(metrics.frameScore).toBeLessThanOrEqual(100);
    });

    it('should return non-negative values', () => {
      const metrics = getFrameIntegrityMetrics(CONTACT_ZERO.id);

      expect(metrics.frameScore).toBeGreaterThanOrEqual(0);
      expect(metrics.scansDone).toBeGreaterThanOrEqual(0);
      expect(metrics.frameLeaks).toBeGreaterThanOrEqual(0);
    });
  });
});
