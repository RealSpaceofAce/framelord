// =============================================================================
// WANT TRACKING STORE — Daily metrics tracking board
// =============================================================================
// The Want Tracking board is a Notion-style tracker with spreadsheet logic.
// Users define metrics (things they want to track) and log daily values.
//
// Key concepts:
// - WantMetric: A trackable thing (Hours Worked, Income, Workout, etc.)
// - WantDayEntry: A single day's values across all metrics
// - Goal types: at_least, at_most, exact, boolean_days_per_week
//
// This store is the single source of truth. UI components read from here
// and dispatch updates through the exposed functions.
// =============================================================================

import { WantMetric, WantDayEntry, WantTrackingBoard, WantGoalType, WantMetricType } from '../types';

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

const generateId = (): string =>
  `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

/**
 * Generate a slug from a name (lowercase, underscores)
 */
const slugify = (name: string): string =>
  name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');

/**
 * Get today's date in YYYY-MM-DD format (local time)
 */
const getTodayDate = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

/**
 * Get current month in YYYY-MM format
 */
const getCurrentMonth = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// =============================================================================
// STORE STATE
// =============================================================================

let BOARD: WantTrackingBoard = {
  metrics: [],
  days: [],
  selectedMonth: getCurrentMonth(),
  showWeekends: true,
  updatedAt: new Date().toISOString(),
};

let listeners: Array<() => void> = [];

const notifyListeners = () => {
  BOARD.updatedAt = new Date().toISOString();
  listeners.forEach(listener => listener());
};

// =============================================================================
// SUBSCRIBE API (for React integration with useSyncExternalStore)
// =============================================================================

/**
 * Subscribe to store changes.
 */
export const subscribe = (listener: () => void): (() => void) => {
  listeners.push(listener);
  return () => {
    listeners = listeners.filter(l => l !== listener);
  };
};

/**
 * Get current snapshot (for useSyncExternalStore).
 */
export const getSnapshot = (): WantTrackingBoard => BOARD;

// =============================================================================
// METRIC OPERATIONS
// =============================================================================

/**
 * Get all metrics, sorted by sortOrder.
 */
export const getMetrics = (): WantMetric[] => {
  return [...BOARD.metrics].sort((a, b) => a.sortOrder - b.sortOrder);
};

/**
 * Get active metrics only, sorted by sortOrder.
 */
export const getActiveMetrics = (): WantMetric[] => {
  return BOARD.metrics
    .filter(m => m.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder);
};

/**
 * Get a metric by ID.
 */
export const getMetricById = (metricId: string): WantMetric | undefined => {
  return BOARD.metrics.find(m => m.id === metricId);
};

/**
 * Get a metric by slug.
 */
export const getMetricBySlug = (slug: string): WantMetric | undefined => {
  return BOARD.metrics.find(m => m.slug === slug);
};

/**
 * Upsert a metric (create or update).
 * If id is provided and exists, updates. Otherwise creates new.
 */
export const upsertMetric = (params: {
  id?: string;
  name: string;
  type: WantMetricType;
  unit?: string;
  goalType: WantGoalType;
  goalValue: number;
  isActive?: boolean;
  sortOrder?: number;
  color?: string;
}): WantMetric => {
  const now = new Date().toISOString();
  const existingIndex = params.id
    ? BOARD.metrics.findIndex(m => m.id === params.id)
    : -1;

  if (existingIndex !== -1) {
    // Update existing
    const existing = BOARD.metrics[existingIndex];
    const updated: WantMetric = {
      ...existing,
      name: params.name,
      slug: slugify(params.name),
      type: params.type,
      unit: params.unit,
      goalType: params.goalType,
      goalValue: params.goalValue,
      isActive: params.isActive ?? existing.isActive,
      sortOrder: params.sortOrder ?? existing.sortOrder,
      color: params.color ?? existing.color,
      updatedAt: now,
    };
    BOARD.metrics[existingIndex] = updated;
    console.log('[WantTrackingStore] Updated metric:', updated.name);
    notifyListeners();
    return updated;
  }

  // Create new
  const maxOrder = Math.max(0, ...BOARD.metrics.map(m => m.sortOrder));
  const newMetric: WantMetric = {
    id: generateId(),
    name: params.name,
    slug: slugify(params.name),
    type: params.type,
    unit: params.unit,
    goalType: params.goalType,
    goalValue: params.goalValue,
    isActive: params.isActive ?? true,
    sortOrder: params.sortOrder ?? maxOrder + 1,
    color: params.color,
    createdAt: now,
    updatedAt: now,
  };

  BOARD.metrics = [...BOARD.metrics, newMetric];
  console.log('[WantTrackingStore] Created metric:', newMetric.name);
  notifyListeners();
  return newMetric;
};

/**
 * Delete a metric by ID.
 * Note: This does NOT delete historical data in day entries.
 * Prefer setting isActive: false to hide metrics without losing data.
 */
export const deleteMetric = (metricId: string): boolean => {
  const initialLength = BOARD.metrics.length;
  BOARD.metrics = BOARD.metrics.filter(m => m.id !== metricId);

  const deleted = BOARD.metrics.length < initialLength;
  if (deleted) {
    console.log('[WantTrackingStore] Deleted metric:', metricId);
    notifyListeners();
  }
  return deleted;
};

/**
 * Toggle metric active state.
 */
export const toggleMetricActive = (metricId: string): boolean => {
  const metric = BOARD.metrics.find(m => m.id === metricId);
  if (!metric) return false;

  metric.isActive = !metric.isActive;
  metric.updatedAt = new Date().toISOString();
  notifyListeners();
  return metric.isActive;
};

/**
 * Reorder metrics by providing an array of metric IDs in desired order.
 */
export const reorderMetrics = (metricIds: string[]): void => {
  metricIds.forEach((id, index) => {
    const metric = BOARD.metrics.find(m => m.id === id);
    if (metric) {
      metric.sortOrder = index;
      metric.updatedAt = new Date().toISOString();
    }
  });
  notifyListeners();
};

// =============================================================================
// DAY ENTRY OPERATIONS
// =============================================================================

/**
 * Get all day entries.
 */
export const getDays = (): WantDayEntry[] => {
  return [...BOARD.days].sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Get day entries within a date range (inclusive).
 */
export const getDaysInRange = (startDate: string, endDate: string): WantDayEntry[] => {
  return BOARD.days
    .filter(d => d.date >= startDate && d.date <= endDate)
    .sort((a, b) => a.date.localeCompare(b.date));
};

/**
 * Get day entry for a specific date.
 */
export const getDayEntry = (date: string): WantDayEntry | undefined => {
  return BOARD.days.find(d => d.date === date);
};

/**
 * Add a day entry (creates empty entry if date doesn't exist).
 * Returns the existing or newly created entry.
 */
export const addDay = (date: string): WantDayEntry => {
  const existing = getDayEntry(date);
  if (existing) return existing;

  const now = new Date().toISOString();
  const newEntry: WantDayEntry = {
    id: generateId(),
    date,
    values: {},
    createdAt: now,
    updatedAt: now,
  };

  BOARD.days = [...BOARD.days, newEntry].sort((a, b) => a.date.localeCompare(b.date));
  console.log('[WantTrackingStore] Added day:', date);
  notifyListeners();
  return newEntry;
};

/**
 * Upsert day entry values. Creates the day if it doesn't exist.
 * Merges new values with existing values (doesn't replace entire record).
 */
export const upsertDayEntry = (
  date: string,
  updates: Record<string, number | boolean | null>
): WantDayEntry => {
  const now = new Date().toISOString();
  const existingIndex = BOARD.days.findIndex(d => d.date === date);

  if (existingIndex !== -1) {
    // Update existing
    const existing = BOARD.days[existingIndex];
    BOARD.days[existingIndex] = {
      ...existing,
      values: { ...existing.values, ...updates },
      updatedAt: now,
    };
    console.log('[WantTrackingStore] Updated day entry:', date, updates);
    notifyListeners();
    return BOARD.days[existingIndex];
  }

  // Create new
  const newEntry: WantDayEntry = {
    id: generateId(),
    date,
    values: updates,
    createdAt: now,
    updatedAt: now,
  };

  BOARD.days = [...BOARD.days, newEntry].sort((a, b) => a.date.localeCompare(b.date));
  console.log('[WantTrackingStore] Created day entry:', date, updates);
  notifyListeners();
  return newEntry;
};

/**
 * Set a single value for a specific date and metric.
 */
export const setValue = (
  date: string,
  metricSlug: string,
  value: number | boolean | null
): void => {
  upsertDayEntry(date, { [metricSlug]: value });
};

/**
 * Clear a value for a specific date and metric.
 */
export const clearValue = (date: string, metricSlug: string): void => {
  setValue(date, metricSlug, null);
};

// =============================================================================
// MONTH NAVIGATION
// =============================================================================

/**
 * Get the currently selected month (YYYY-MM format).
 */
export const getSelectedMonth = (): string => {
  return BOARD.selectedMonth || getCurrentMonth();
};

/**
 * Set the selected month.
 */
export const setSelectedMonth = (month: string): void => {
  BOARD.selectedMonth = month;
  notifyListeners();
};

/**
 * Get all dates in a month as array of YYYY-MM-DD strings.
 */
export const getMonthDates = (month?: string): string[] => {
  const targetMonth = month || getSelectedMonth();
  const [year, monthNum] = targetMonth.split('-').map(Number);
  const daysInMonth = new Date(year, monthNum, 0).getDate();

  const dates: string[] = [];
  for (let day = 1; day <= daysInMonth; day++) {
    dates.push(`${year}-${String(monthNum).padStart(2, '0')}-${String(day).padStart(2, '0')}`);
  }
  return dates;
};

/**
 * Ensure day entries exist for all dates in the current month.
 * Called when displaying the board to pre-populate rows.
 */
export const ensureMonthDays = (month?: string): void => {
  const dates = getMonthDates(month);
  let added = false;

  dates.forEach(date => {
    if (!getDayEntry(date)) {
      const now = new Date().toISOString();
      BOARD.days.push({
        id: generateId(),
        date,
        values: {},
        createdAt: now,
        updatedAt: now,
      });
      added = true;
    }
  });

  if (added) {
    BOARD.days.sort((a, b) => a.date.localeCompare(b.date));
    notifyListeners();
  }
};

// =============================================================================
// COMPUTED STATISTICS
// =============================================================================

/**
 * Calculate statistics for a metric within a date range.
 */
export const getMetricStats = (metricSlug: string, startDate: string, endDate: string): {
  sum: number;
  avg: number;
  count: number;
  checkedCount: number;
  totalDays: number;
} => {
  const days = getDaysInRange(startDate, endDate);
  const metric = getMetricBySlug(metricSlug);
  const today = getTodayDate();

  let sum = 0;
  let count = 0;
  let checkedCount = 0;
  let totalDays = 0;

  days.forEach(day => {
    // Only count days up to today
    if (day.date <= today) {
      totalDays++;
      const value = day.values[metricSlug];

      if (metric?.type === 'boolean') {
        if (value === true) {
          checkedCount++;
        }
      } else if (typeof value === 'number') {
        sum += value;
        count++;
      }
    }
  });

  return {
    sum,
    avg: count > 0 ? sum / count : 0,
    count,
    checkedCount,
    totalDays,
  };
};

/**
 * Get streak for a metric (consecutive days with value).
 */
export const getStreak = (metricSlug: string): number => {
  const metric = getMetricBySlug(metricSlug);
  if (!metric) return 0;

  const days = getDays().sort((a, b) => b.date.localeCompare(a.date));
  const today = getTodayDate();

  let streak = 0;
  let expectedDate = new Date(today + 'T00:00:00');

  for (const day of days) {
    if (day.date > today) continue;

    const dayDate = new Date(day.date + 'T00:00:00');
    const diffDays = Math.floor(
      (expectedDate.getTime() - dayDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    const value = day.values[metricSlug];
    const hasValue = metric.type === 'boolean'
      ? value === true
      : typeof value === 'number' && value > 0;

    if (diffDays === 0 && hasValue) {
      streak++;
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (diffDays === 1 && streak === 0 && hasValue) {
      // Allow starting from yesterday
      streak++;
      expectedDate = new Date(dayDate);
      expectedDate.setDate(expectedDate.getDate() - 1);
    } else if (diffDays <= 1 && !hasValue) {
      break;
    } else {
      break;
    }
  }

  return streak;
};

// =============================================================================
// BOARD DATA FOR UI
// =============================================================================

/**
 * Get complete board data for the current month, ready for rendering.
 */
export const getBoardData = (month?: string): {
  dates: string[];
  metrics: WantMetric[];
  days: WantDayEntry[];
} => {
  const targetMonth = month || getSelectedMonth();
  const dates = getMonthDates(targetMonth);
  const metrics = getActiveMetrics();

  // Ensure all days exist
  ensureMonthDays(targetMonth);

  const days = getDaysInRange(dates[0], dates[dates.length - 1]);

  return { dates, metrics, days };
};

// =============================================================================
// DEFAULT SEED DATA
// =============================================================================

/**
 * Default metrics for new users (Launch Month template).
 */
const DEFAULT_METRICS: Array<{
  name: string;
  type: WantMetricType;
  unit?: string;
  goalType: WantGoalType;
  goalValue: number;
  color: string;
}> = [
  { name: 'Hours Worked', type: 'number', unit: 'hrs', goalType: 'at_least', goalValue: 8, color: '#6366f1' },
  { name: 'Income', type: 'number', unit: '$', goalType: 'at_least', goalValue: 500, color: '#22c55e' },
  { name: 'Hours of Sleep', type: 'number', unit: 'hrs', goalType: 'exact', goalValue: 7, color: '#8b5cf6' },
  { name: 'Workout', type: 'boolean', goalType: 'boolean_days_per_week', goalValue: 5, color: '#ef4444' },
  { name: 'Calories', type: 'number', unit: '', goalType: 'at_most', goalValue: 2000, color: '#f59e0b' },
  { name: 'Weight', type: 'number', unit: 'lbs', goalType: 'exact', goalValue: 180, color: '#14b8a6' },
];

/**
 * Seed the store with default metrics if empty.
 * Only runs once when there are no metrics defined.
 */
export const seedDefaultMetrics = (): void => {
  if (BOARD.metrics.length > 0) {
    console.log('[WantTrackingStore] Store already has metrics, skipping seed');
    return;
  }

  DEFAULT_METRICS.forEach((m, index) => {
    const now = new Date().toISOString();
    const metric: WantMetric = {
      id: generateId(),
      name: m.name,
      slug: slugify(m.name),
      type: m.type,
      unit: m.unit,
      goalType: m.goalType,
      goalValue: m.goalValue,
      isActive: true,
      sortOrder: index,
      color: m.color,
      createdAt: now,
      updatedAt: now,
    };
    BOARD.metrics.push(metric);
  });

  console.log('[WantTrackingStore] Seeded default metrics:', BOARD.metrics.length);
  notifyListeners();
};

// =============================================================================
// GOAL MET DERIVATION (for FrameScore integration)
// =============================================================================
// These functions determine whether a metric's goal was met on a given day.
// The logic matches the Want Tracking board's own rules for each metric type.
// =============================================================================

/**
 * Determine if a metric's goal was met on a specific day.
 * Uses the Want Tracking board's native rules for each goal type.
 *
 * @param metric - The metric definition
 * @param value - The recorded value for that day (or null/undefined if not tracked)
 * @returns true if goal was met, false otherwise
 */
export const isGoalMet = (
  metric: WantMetric,
  value: number | boolean | null | undefined
): boolean => {
  // No value recorded = goal not met
  if (value === null || value === undefined) {
    return false;
  }

  // Boolean metric: true = met, false = not met
  if (metric.type === 'boolean') {
    return value === true;
  }

  // Numeric metrics: compare against goalValue based on goalType
  if (typeof value !== 'number') {
    return false;
  }

  switch (metric.goalType) {
    case 'at_least':
      return value >= metric.goalValue;
    case 'at_most':
      return value <= metric.goalValue;
    case 'exact':
      // Allow small tolerance for exact goals
      return Math.abs(value - metric.goalValue) < 0.001;
    case 'boolean_days_per_week':
      // For weekly goals, boolean true = met for that day
      // The weekly aggregation is handled separately
      return value > 0 || value === true;
    default:
      return false;
  }
};

/**
 * Get goal met status for a metric across a date range.
 * Returns an array of { date, goalMet } for FrameScore calculation.
 *
 * @param metricSlug - The metric slug to check
 * @param startDate - Start of date range (YYYY-MM-DD)
 * @param endDate - End of date range (YYYY-MM-DD)
 * @returns Array of { date, goalMet } for each day in range
 */
export const getGoalMetHistory = (
  metricSlug: string,
  startDate: string,
  endDate: string
): Array<{ date: string; goalMet: boolean }> => {
  const metric = getMetricBySlug(metricSlug);
  if (!metric) return [];

  const days = getDaysInRange(startDate, endDate);
  const today = getTodayDate();

  return days
    .filter(day => day.date <= today) // Only count days up to today
    .map(day => ({
      date: day.date,
      goalMet: isGoalMet(metric, day.values[metricSlug]),
    }));
};

/**
 * Compliance data for a single metric over a date range.
 * Used by FrameScore calculation.
 */
export interface MetricComplianceData {
  metricId: string;
  metricSlug: string;
  trackedDays: number;      // Days where metric is active in the window
  completedDays: number;    // Days where goalMet is true
  complianceRate: number;   // completedDays / trackedDays (0-1)
  frameScoreWeight: number; // Weight for FrameScore calculation
}

/**
 * Get compliance data for all weighted metrics over a date range.
 * Only includes metrics with frameScoreWeight > 0.
 *
 * @param startDate - Start of date range (YYYY-MM-DD)
 * @param endDate - End of date range (YYYY-MM-DD)
 * @returns Array of compliance data for each weighted metric
 */
export const getWeightedMetricsCompliance = (
  startDate: string,
  endDate: string
): MetricComplianceData[] => {
  const metrics = getActiveMetrics();
  const today = getTodayDate();

  return metrics
    .filter(m => (m.frameScoreWeight ?? 0) > 0) // Only weighted metrics
    .map(metric => {
      const history = getGoalMetHistory(metric.slug, startDate, endDate);

      // Count tracked days (days with any value recorded, up to today)
      const days = getDaysInRange(startDate, endDate);
      const trackedDays = days.filter(day => {
        if (day.date > today) return false;
        const value = day.values[metric.slug];
        return value !== null && value !== undefined;
      }).length;

      // Count completed days (where goal was met)
      const completedDays = history.filter(h => h.goalMet).length;

      // Calculate compliance rate
      const complianceRate = trackedDays > 0 ? completedDays / trackedDays : 0;

      return {
        metricId: metric.id,
        metricSlug: metric.slug,
        trackedDays,
        completedDays,
        complianceRate,
        frameScoreWeight: metric.frameScoreWeight ?? 0,
      };
    });
};

// =============================================================================
// RESET
// =============================================================================

/**
 * Reset the store to empty state.
 */
export const reset = (): void => {
  BOARD = {
    metrics: [],
    days: [],
    selectedMonth: getCurrentMonth(),
    showWeekends: true,
    updatedAt: new Date().toISOString(),
  };
  notifyListeners();
};

// =============================================================================
// LITTLE LORD INTEGRATION
// =============================================================================

/**
 * Event types for Little Lord notifications.
 * Little Lord can dispatch these events to update the Want Tracking board.
 */
export type WantTrackingEvent =
  | {
      type: 'want_tracking.log_day';
      payload: {
        date: string;
        entries: Record<string, number | boolean>;
      };
    }
  | {
      type: 'want_tracking.define_metric';
      payload: {
        name: string;
        type: WantMetricType;
        unit?: string;
        goalType: WantGoalType;
        goalValue: number;
      };
    };

let eventListeners: Array<(event: WantTrackingEvent) => void> = [];

/**
 * Subscribe to Want Tracking events (for Little Lord).
 */
export const subscribeToEvents = (
  listener: (event: WantTrackingEvent) => void
): (() => void) => {
  eventListeners.push(listener);
  return () => {
    eventListeners = eventListeners.filter(l => l !== listener);
  };
};

/**
 * Emit an event to all listeners.
 */
export const emitEvent = (event: WantTrackingEvent): void => {
  eventListeners.forEach(listener => listener(event));
};

/**
 * Handle a Little Lord event.
 * Call this from the Little Lord event handler when want_tracking events arrive.
 */
export const handleLittleLordEvent = (event: WantTrackingEvent): void => {
  switch (event.type) {
    case 'want_tracking.log_day': {
      const { date, entries } = event.payload;
      upsertDayEntry(date, entries);
      console.log('[WantTrackingStore] Little Lord logged day:', date, entries);
      break;
    }
    case 'want_tracking.define_metric': {
      const { name, type, unit, goalType, goalValue } = event.payload;
      upsertMetric({ name, type, unit, goalType, goalValue });
      console.log('[WantTrackingStore] Little Lord defined metric:', name);
      break;
    }
  }
};
