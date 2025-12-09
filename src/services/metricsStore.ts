// =============================================================================
// METRICS STORE — Centralized metrics tracking managed by Little Lord
// =============================================================================
// All metrics in FrameLord are written ONLY by Little Lord, never directly by UI.
// Little Lord analyzes user behavior, data, and patterns to update metrics.
// Metrics are domain-scoped (health, business, relationships, etc.) and can be
// displayed in domain-specific views or the unified Metrics Overview dashboard.
// =============================================================================

import { CONTACT_ZERO } from './contactStore';

// =============================================================================
// TYPES
// =============================================================================

export type MetricDomain = 'health' | 'business' | 'relationships' | 'productivity' | 'finance' | 'personal' | 'custom';
export type MetricType = 'number' | 'percentage' | 'currency' | 'duration' | 'boolean' | 'string';

/**
 * Definition of a metric type.
 * Metrics are defined with metadata about how they should be displayed and tracked.
 */
export interface MetricDefinition {
  id: string;
  name: string;
  description: string;
  domain: MetricDomain;
  type: MetricType;
  unit?: string; // e.g., 'kg', 'hrs', '$', '%'
  target?: number | string | boolean; // Optional target value
  isHigherBetter?: boolean; // For number/percentage metrics
  createdAt: string;
  updatedAt: string;
}

/**
 * A single metric data point.
 */
export interface MetricEntry {
  id: string;
  metricId: string;
  contactId: string; // Usually Contact Zero, but can track metrics for any contact
  value: number | string | boolean;
  timestamp: string; // ISO date string
  source: 'little_lord' | 'system'; // Only Little Lord or system can write metrics
  note?: string; // Optional context/note about this entry
}

/**
 * Aggregated metric summary for display.
 */
export interface MetricSummary {
  metricId: string;
  currentValue: number | string | boolean | null;
  previousValue: number | string | boolean | null;
  trend: 'up' | 'down' | 'stable' | 'unknown';
  changePercentage?: number; // For numeric metrics
  lastUpdated: string | null;
  entryCount: number;
}

// =============================================================================
// STORAGE KEYS
// =============================================================================

const STORAGE_KEY_METRIC_DEFINITIONS = 'framelord_metric_definitions';
const STORAGE_KEY_METRIC_ENTRIES = 'framelord_metric_entries';

// =============================================================================
// METRIC DEFINITIONS CRUD
// =============================================================================

/**
 * Get all metric definitions.
 */
export const getAllMetricDefinitions = (): MetricDefinition[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_METRIC_DEFINITIONS);
    return stored ? JSON.parse(stored) : getDefaultMetricDefinitions();
  } catch (e) {
    console.error('Failed to load metric definitions:', e);
    return getDefaultMetricDefinitions();
  }
};

/**
 * Get metric definitions by domain.
 */
export const getMetricDefinitionsByDomain = (domain: MetricDomain): MetricDefinition[] => {
  const all = getAllMetricDefinitions();
  return all.filter(m => m.domain === domain);
};

/**
 * Get a single metric definition by ID.
 */
export const getMetricDefinitionById = (id: string): MetricDefinition | null => {
  const all = getAllMetricDefinitions();
  return all.find(m => m.id === id) || null;
};

/**
 * Create a new metric definition.
 * IMPORTANT: This should only be called by Little Lord or system initialization.
 */
export const createMetricDefinition = (definition: Omit<MetricDefinition, 'id' | 'createdAt' | 'updatedAt'>): MetricDefinition => {
  const all = getAllMetricDefinitions();

  const newMetric: MetricDefinition = {
    ...definition,
    id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  all.push(newMetric);
  localStorage.setItem(STORAGE_KEY_METRIC_DEFINITIONS, JSON.stringify(all));

  return newMetric;
};

/**
 * Update a metric definition.
 */
export const updateMetricDefinition = (id: string, updates: Partial<Omit<MetricDefinition, 'id' | 'createdAt'>>): MetricDefinition | null => {
  const all = getAllMetricDefinitions();
  const index = all.findIndex(m => m.id === id);

  if (index === -1) return null;

  const updated: MetricDefinition = {
    ...all[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  all[index] = updated;
  localStorage.setItem(STORAGE_KEY_METRIC_DEFINITIONS, JSON.stringify(all));

  return updated;
};

/**
 * Delete a metric definition and all its entries.
 */
export const deleteMetricDefinition = (id: string): boolean => {
  const all = getAllMetricDefinitions();
  const filtered = all.filter(m => m.id !== id);

  if (filtered.length === all.length) return false;

  localStorage.setItem(STORAGE_KEY_METRIC_DEFINITIONS, JSON.stringify(filtered));

  // Also delete all entries for this metric
  const entries = getAllMetricEntries();
  const filteredEntries = entries.filter(e => e.metricId !== id);
  localStorage.setItem(STORAGE_KEY_METRIC_ENTRIES, JSON.stringify(filteredEntries));

  return true;
};

// =============================================================================
// METRIC ENTRIES CRUD
// =============================================================================

/**
 * Get all metric entries.
 */
export const getAllMetricEntries = (): MetricEntry[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_METRIC_ENTRIES);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Failed to load metric entries:', e);
    return [];
  }
};

/**
 * Get metric entries for a specific metric.
 */
export const getMetricEntries = (metricId: string, contactId: string = CONTACT_ZERO.id): MetricEntry[] => {
  const all = getAllMetricEntries();
  return all.filter(e => e.metricId === metricId && e.contactId === contactId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

/**
 * Get all metric entries for a contact (usually Contact Zero).
 */
export const getMetricEntriesByContact = (contactId: string = CONTACT_ZERO.id): MetricEntry[] => {
  const all = getAllMetricEntries();
  return all.filter(e => e.contactId === contactId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

/**
 * Get metric entries by domain.
 */
export const getMetricEntriesByDomain = (domain: MetricDomain, contactId: string = CONTACT_ZERO.id): MetricEntry[] => {
  const definitions = getMetricDefinitionsByDomain(domain);
  const metricIds = definitions.map(d => d.id);
  const all = getAllMetricEntries();

  return all.filter(e => metricIds.includes(e.metricId) && e.contactId === contactId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

/**
 * Create a new metric entry.
 * CRITICAL: This should ONLY be called by Little Lord or system processes.
 * UI components should NEVER directly write metrics.
 */
export const createMetricEntry = (entry: Omit<MetricEntry, 'id' | 'timestamp'>, timestamp?: string): MetricEntry => {
  const all = getAllMetricEntries();

  const newEntry: MetricEntry = {
    ...entry,
    id: `entry_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: timestamp || new Date().toISOString(),
  };

  all.push(newEntry);
  localStorage.setItem(STORAGE_KEY_METRIC_ENTRIES, JSON.stringify(all));

  return newEntry;
};

/**
 * Get the latest metric entry for a metric.
 */
export const getLatestMetricEntry = (metricId: string, contactId: string = CONTACT_ZERO.id): MetricEntry | null => {
  const entries = getMetricEntries(metricId, contactId);
  return entries[0] || null;
};

/**
 * Get metric summary for display.
 */
export const getMetricSummary = (metricId: string, contactId: string = CONTACT_ZERO.id): MetricSummary => {
  const entries = getMetricEntries(metricId, contactId);
  const definition = getMetricDefinitionById(metricId);

  if (entries.length === 0) {
    return {
      metricId,
      currentValue: null,
      previousValue: null,
      trend: 'unknown',
      lastUpdated: null,
      entryCount: 0,
    };
  }

  const current = entries[0];
  const previous = entries[1] || null;

  let trend: 'up' | 'down' | 'stable' | 'unknown' = 'unknown';
  let changePercentage: number | undefined;

  if (definition?.type === 'number' || definition?.type === 'percentage' || definition?.type === 'currency' || definition?.type === 'duration') {
    if (previous && typeof current.value === 'number' && typeof previous.value === 'number') {
      if (current.value > previous.value) {
        trend = 'up';
        changePercentage = ((current.value - previous.value) / previous.value) * 100;
      } else if (current.value < previous.value) {
        trend = 'down';
        changePercentage = ((current.value - previous.value) / previous.value) * 100;
      } else {
        trend = 'stable';
        changePercentage = 0;
      }
    }
  }

  return {
    metricId,
    currentValue: current.value,
    previousValue: previous?.value || null,
    trend,
    changePercentage,
    lastUpdated: current.timestamp,
    entryCount: entries.length,
  };
};

/**
 * Get all metric summaries for a domain.
 */
export const getMetricSummariesByDomain = (domain: MetricDomain, contactId: string = CONTACT_ZERO.id): MetricSummary[] => {
  const definitions = getMetricDefinitionsByDomain(domain);
  return definitions.map(d => getMetricSummary(d.id, contactId));
};

/**
 * Get all metric summaries (for Metrics Overview dashboard).
 */
export const getAllMetricSummaries = (contactId: string = CONTACT_ZERO.id): MetricSummary[] => {
  const definitions = getAllMetricDefinitions();
  return definitions.map(d => getMetricSummary(d.id, contactId));
};

// =============================================================================
// DEFAULT METRICS
// =============================================================================

/**
 * Get default metric definitions for initial setup.
 */
const getDefaultMetricDefinitions = (): MetricDefinition[] => {
  const now = new Date().toISOString();

  return [
    // Health metrics
    {
      id: 'metric_weight',
      name: 'Weight',
      description: 'Body weight tracking',
      domain: 'health',
      type: 'number',
      unit: 'kg',
      isHigherBetter: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'metric_sleep_hours',
      name: 'Sleep Hours',
      description: 'Hours of sleep per night',
      domain: 'health',
      type: 'duration',
      unit: 'hrs',
      target: 8,
      isHigherBetter: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'metric_exercise_minutes',
      name: 'Exercise Minutes',
      description: 'Minutes of exercise per day',
      domain: 'health',
      type: 'duration',
      unit: 'min',
      target: 30,
      isHigherBetter: true,
      createdAt: now,
      updatedAt: now,
    },

    // Business metrics
    {
      id: 'metric_revenue',
      name: 'Revenue',
      description: 'Monthly revenue',
      domain: 'business',
      type: 'currency',
      unit: '$',
      isHigherBetter: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'metric_client_meetings',
      name: 'Client Meetings',
      description: 'Number of client meetings',
      domain: 'business',
      type: 'number',
      unit: 'meetings',
      isHigherBetter: true,
      createdAt: now,
      updatedAt: now,
    },

    // Productivity metrics
    {
      id: 'metric_deep_work_hours',
      name: 'Deep Work Hours',
      description: 'Hours of focused deep work',
      domain: 'productivity',
      type: 'duration',
      unit: 'hrs',
      target: 4,
      isHigherBetter: true,
      createdAt: now,
      updatedAt: now,
    },

    // Relationship metrics
    {
      id: 'metric_quality_connections',
      name: 'Quality Connections',
      description: 'Meaningful interactions with key relationships',
      domain: 'relationships',
      type: 'number',
      unit: 'interactions',
      isHigherBetter: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format a metric value for display.
 */
export const formatMetricValue = (value: number | string | boolean, definition: MetricDefinition | null): string => {
  if (value === null || value === undefined) return '-';

  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string') return value;

  if (typeof value === 'number') {
    if (definition?.type === 'currency') {
      return `${definition.unit || '$'}${value.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
    }
    if (definition?.type === 'percentage') {
      return `${value.toFixed(1)}${definition.unit || '%'}`;
    }
    if (definition?.type === 'duration') {
      return `${value} ${definition.unit || 'hrs'}`;
    }
    return `${value} ${definition?.unit || ''}`.trim();
  }

  return String(value);
};

/**
 * Check if a metric is on track (compared to target).
 */
export const isMetricOnTrack = (summary: MetricSummary, definition: MetricDefinition | null): boolean | null => {
  if (!definition?.target || summary.currentValue === null) return null;

  if (typeof summary.currentValue === 'number' && typeof definition.target === 'number') {
    if (definition.isHigherBetter) {
      return summary.currentValue >= definition.target;
    } else {
      return summary.currentValue <= definition.target;
    }
  }

  if (typeof summary.currentValue === 'boolean' && typeof definition.target === 'boolean') {
    return summary.currentValue === definition.target;
  }

  if (typeof summary.currentValue === 'string' && typeof definition.target === 'string') {
    return summary.currentValue === definition.target;
  }

  return null;
};
