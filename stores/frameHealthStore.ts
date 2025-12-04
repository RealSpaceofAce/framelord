// =============================================================================
// FRAME HEALTH STORE — User frame health tracking and computation
// =============================================================================
// Computes and stores frame health snapshots using thresholds from appConfig.
// Triggers coaching candidate updates when health changes.
// =============================================================================

import type { FrameHealthSnapshot, FrameHealthLevel } from '../types/multiTenant';
import { frameHealthThresholds } from '../config/appConfig';
import { getEventsInWindow, findRepeatedTopics } from './littleLordEventStore';

const STORAGE_KEY = 'framelord_frame_health';

// In-memory cache
let snapshots: FrameHealthSnapshot[] = [];
let initialized = false;

// Event listeners for coaching candidate updates
type HealthChangeListener = (snapshot: FrameHealthSnapshot) => void;
const listeners: HealthChangeListener[] = [];

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
        snapshots = parsed;
      }
    }
  } catch {
    console.warn('[FrameHealthStore] Failed to load from localStorage');
  }
  
  initialized = true;
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshots));
  } catch {
    console.warn('[FrameHealthStore] Failed to persist to localStorage');
  }
}

// =============================================================================
// FRAME HEALTH COMPUTATION
// =============================================================================

/**
 * Compute frame health for a user
 * Uses thresholds from appConfig
 */
export function computeFrameHealth(
  tenantId: string,
  userId: string,
  metrics: {
    taskCompletionRate: number;
    overdueTaskCount: number;
    missedDailyCheckins: number;
    frameScanAverage: number | null;
  }
): FrameHealthSnapshot {
  const thresholds = frameHealthThresholds;
  
  // Calculate time window
  const now = new Date();
  const periodEnd = now.toISOString();
  const periodStart = new Date(
    now.getTime() - thresholds.rollingWindowDays * 24 * 60 * 60 * 1000
  ).toISOString();
  
  // Get Little Lord events in window
  const events = getEventsInWindow(tenantId, userId, periodStart, periodEnd);
  const littleLordFlags = events.length;
  
  // Find repeated topics
  const repeatedTopics = findRepeatedTopics(
    tenantId, 
    userId, 
    periodStart, 
    periodEnd,
    thresholds.repeatedTopicsThreshold
  );
  
  // Determine health level and reasons
  const reasons: string[] = [];
  let level: FrameHealthLevel = 'GREEN';
  
  // Helper to escalate level (never downgrade from RED)
  const escalateToYellow = () => { if (level === 'GREEN') level = 'YELLOW'; };
  const escalateToRed = () => { level = 'RED'; };

  // Check task completion rate
  if (metrics.taskCompletionRate < thresholds.taskCompletionRateRed) {
    escalateToRed();
    reasons.push(`Task completion rate critically low (${Math.round(metrics.taskCompletionRate * 100)}%)`);
  } else if (metrics.taskCompletionRate < thresholds.taskCompletionRateYellow) {
    escalateToYellow();
    reasons.push(`Task completion rate below target (${Math.round(metrics.taskCompletionRate * 100)}%)`);
  }
  
  // Check overdue tasks
  if (metrics.overdueTaskCount >= thresholds.overdueTaskCountRed) {
    escalateToRed();
    reasons.push(`${metrics.overdueTaskCount} overdue tasks`);
  } else if (metrics.overdueTaskCount >= thresholds.overdueTaskCountYellow) {
    escalateToYellow();
    reasons.push(`${metrics.overdueTaskCount} overdue tasks`);
  }
  
  // Check missed checkins
  if (metrics.missedDailyCheckins >= thresholds.missedCheckinsRed) {
    escalateToRed();
    reasons.push(`${metrics.missedDailyCheckins} missed daily checkins`);
  } else if (metrics.missedDailyCheckins >= thresholds.missedCheckinsYellow) {
    escalateToYellow();
    reasons.push(`${metrics.missedDailyCheckins} missed daily checkins`);
  }
  
  // Check frame scan average
  if (metrics.frameScanAverage !== null) {
    if (metrics.frameScanAverage < thresholds.frameScanAverageRed) {
      escalateToRed();
      reasons.push(`Frame scan average critically low (${Math.round(metrics.frameScanAverage)})`);
    } else if (metrics.frameScanAverage < thresholds.frameScanAverageYellow) {
      escalateToYellow();
      reasons.push(`Frame scan average below target (${Math.round(metrics.frameScanAverage)})`);
    }
  }
  
  // Check Little Lord flags
  if (littleLordFlags >= thresholds.littleLordFlagsRed) {
    escalateToRed();
    reasons.push(`${littleLordFlags} frame struggle events detected`);
  } else if (littleLordFlags >= thresholds.littleLordFlagsYellow) {
    escalateToYellow();
    reasons.push(`${littleLordFlags} frame struggle events detected`);
  }
  
  // Check repeated topics
  if (repeatedTopics.length > 0) {
    escalateToYellow();
    reasons.push(`Recurring struggles in: ${repeatedTopics.join(', ')}`);
  }
  
  // If no issues found
  if (reasons.length === 0) {
    reasons.push('All metrics within healthy range');
  }
  
  const snapshot: FrameHealthSnapshot = {
    tenantId,
    userId,
    periodStart,
    periodEnd,
    taskCompletionRate: metrics.taskCompletionRate,
    overdueTaskCount: metrics.overdueTaskCount,
    missedDailyCheckins: metrics.missedDailyCheckins,
    frameScanAverage: metrics.frameScanAverage,
    littleLordFlags,
    repeatedTopics,
    level,
    reasons,
    computedAt: new Date().toISOString(),
  };
  
  return snapshot;
}

/**
 * Save a frame health snapshot
 */
export function saveFrameHealthSnapshot(snapshot: FrameHealthSnapshot): void {
  init();
  
  // Remove old snapshots for this user (keep only latest per user)
  snapshots = snapshots.filter(s => 
    !(s.tenantId === snapshot.tenantId && s.userId === snapshot.userId)
  );
  
  snapshots = [snapshot, ...snapshots];
  persist();
  
  // Notify listeners (for coaching candidate updates)
  listeners.forEach(listener => {
    try {
      listener(snapshot);
    } catch (error) {
      console.error('[FrameHealthStore] Listener error:', error);
    }
  });
  
  // BACKEND TODO: Store in database
  console.log('[FrameHealthStore] Snapshot saved:', snapshot.userId, snapshot.level);
}

/**
 * Compute and save frame health
 */
export function updateFrameHealth(
  tenantId: string,
  userId: string,
  metrics: {
    taskCompletionRate: number;
    overdueTaskCount: number;
    missedDailyCheckins: number;
    frameScanAverage: number | null;
  }
): FrameHealthSnapshot {
  const snapshot = computeFrameHealth(tenantId, userId, metrics);
  saveFrameHealthSnapshot(snapshot);
  return snapshot;
}

/**
 * Subscribe to health changes
 */
export function onFrameHealthChange(listener: HealthChangeListener): () => void {
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
 * Get latest frame health for a user
 */
export function getLatestFrameHealth(
  tenantId: string,
  userId: string
): FrameHealthSnapshot | null {
  init();
  return snapshots.find(s => 
    s.tenantId === tenantId && s.userId === userId
  ) ?? null;
}

/**
 * Get all snapshots for a user
 */
export function getFrameHealthHistory(
  tenantId: string,
  userId: string
): FrameHealthSnapshot[] {
  init();
  return snapshots.filter(s => 
    s.tenantId === tenantId && s.userId === userId
  );
}

/**
 * Get users with specific health level in a tenant
 */
export function getUsersByHealthLevel(
  tenantId: string,
  level: FrameHealthLevel
): FrameHealthSnapshot[] {
  init();
  return snapshots.filter(s => 
    s.tenantId === tenantId && s.level === level
  );
}

/**
 * Get all struggling users (YELLOW or RED) in a tenant
 */
export function getStrugglingUsersInTenant(tenantId: string): FrameHealthSnapshot[] {
  init();
  return snapshots.filter(s => 
    s.tenantId === tenantId && (s.level === 'YELLOW' || s.level === 'RED')
  );
}

/**
 * Get all struggling users across all tenants (Platform Admin)
 */
export function getAllStrugglingUsers(): FrameHealthSnapshot[] {
  init();
  return snapshots.filter(s => s.level === 'YELLOW' || s.level === 'RED');
}

// =============================================================================
// HEALTH LEVEL HELPERS
// =============================================================================

export function getHealthLevelLabel(level: FrameHealthLevel): string {
  const labels: Record<FrameHealthLevel, string> = {
    GREEN: 'Healthy',
    YELLOW: 'Needs Attention',
    RED: 'Struggling',
  };
  return labels[level];
}

export function getHealthLevelColor(level: FrameHealthLevel): string {
  const colors: Record<FrameHealthLevel, string> = {
    GREEN: 'text-green-400',
    YELLOW: 'text-yellow-400',
    RED: 'text-red-400',
  };
  return colors[level];
}

export function getHealthLevelBgColor(level: FrameHealthLevel): string {
  const colors: Record<FrameHealthLevel, string> = {
    GREEN: 'bg-green-500/20 border-green-500/30',
    YELLOW: 'bg-yellow-500/20 border-yellow-500/30',
    RED: 'bg-red-500/20 border-red-500/30',
  };
  return colors[level];
}

// =============================================================================
// RESET (TESTING ONLY)
// =============================================================================

export function resetFrameHealthStore(): void {
  snapshots = [];
  initialized = false;
  localStorage.removeItem(STORAGE_KEY);
}

