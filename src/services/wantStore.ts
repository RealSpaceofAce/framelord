// =============================================================================
// WANT STORE — Sovereign desires and long-range outcomes
// =============================================================================
// Wants represent the user's sovereign desires. All tasks, metrics, actions,
// and congruency calculations attach to a Want. Wants sit above tasks.
//
// DYNAMIC METRICS: metricTypes defines the columns, metrics stores values.
// VALIDATION: Shoulds are rejected, only true Wants are allowed.
// DIRECTNESS: Wants attached to contacts must have direct causal relevance.
// =============================================================================

import { CONTACT_ZERO } from './contactStore';

// =============================================================================
// TYPES
// =============================================================================

export type WantStatus = 'not_started' | 'in_progress' | 'done';
export type WantOriginType = 'want' | 'should_rejected';

// =============================================================================
// CUSTOM STAGES — User-definable pipeline stages for the Board view
// =============================================================================

export interface WantStage {
  id: string;
  label: string;
  color: string;
  order: number;
  isDefault: boolean;
  /** Maps to WantStatus for backward compatibility */
  mappedStatus: WantStatus;
}

export interface WantStep {
  id: string;
  title: string;
  description?: string;
  deadline: string | null;
  status: WantStatus;
  createdAt: string;
  completedAt?: string | null;
}

/**
 * Dynamic metric entry - stores values for arbitrary metric names.
 * Values can be number, string, or boolean.
 */
export interface WantMetricEntry {
  date: string;
  values: Record<string, number | string | boolean | null>;
}

export interface WantIteration {
  date: string;
  feedback: string;
  source?: 'user' | 'little_lord';
}

/**
 * Validation result for should vs want check.
 */
export interface WantValidation {
  isValidWant: boolean;
  reason: string;
}

/**
 * Directness check for contact attachment.
 */
export interface WantDirectness {
  isDirect: boolean;
  failingReason?: string;
}

export interface Want {
  id: string;
  contactId: string; // Always Contact Zero ("0")
  title: string;
  reason: string;
  deadline: string | null;
  status: WantStatus;
  createdAt: string;
  updatedAt: string;
  congruencyScore: number | null;

  // Cover image for visual display
  coverImageUrl?: string | null;

  // Steps
  steps: WantStep[];

  // Dynamic metrics
  metricTypes: string[]; // User-defined metric names
  metrics: WantMetricEntry[]; // Dynamic metric values by date

  // Contact attachment
  primaryContactId: string | null;
  relatedContactIds: string[];

  // Validation
  originType: WantOriginType;
  validation: WantValidation;
  directness: WantDirectness;

  // Iteration data for accountability
  iterations: WantIteration[];
}

// =============================================================================
// CHART RULES — Define which metrics get charts and how they're styled
// =============================================================================

export interface ChartRule {
  type: 'line' | 'bar' | 'area';
  color: string;
  label?: string;
}

export const chartRules: Record<string, ChartRule> = {
  income: { type: 'line', color: '#4433FF', label: 'Income' },
  weight: { type: 'line', color: '#888888', label: 'Weight' },
  calories: { type: 'line', color: '#FF6B6B', label: 'Calories' },
  sleep: { type: 'bar', color: '#22C55E', label: 'Sleep (hrs)' },
  hours_worked: { type: 'bar', color: '#F59E0B', label: 'Hours Worked' },
};

/**
 * Add a chart rule for a metric.
 */
export const addChartRule = (metricName: string, rule: ChartRule): void => {
  const normalizedName = metricName.toLowerCase().replace(/\s+/g, '_');
  chartRules[normalizedName] = rule;
};

/**
 * Get chart rule for a metric (if exists).
 */
export const getChartRule = (metricName: string): ChartRule | null => {
  const normalizedName = metricName.toLowerCase().replace(/\s+/g, '_');
  return chartRules[normalizedName] || null;
};

/**
 * Check if a metric has a chart rule.
 */
export const hasChartRule = (metricName: string): boolean => {
  const normalizedName = metricName.toLowerCase().replace(/\s+/g, '_');
  return normalizedName in chartRules;
};

// =============================================================================
// STORE STATE
// =============================================================================

let WANTS: Want[] = [];
let listeners: Array<() => void> = [];

// Notify all subscribers when state changes
const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

/**
 * Subscribe to store changes (for React reactivity).
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
export const getSnapshot = (): Want[] => WANTS;

// =============================================================================
// STAGE STATE — Custom stages for Kanban board
// =============================================================================

const DEFAULT_STAGES: WantStage[] = [
  { id: 'not_started', label: 'Not Started', color: '#666666', order: 0, isDefault: true, mappedStatus: 'not_started' },
  { id: 'in_progress', label: 'In Progress', color: '#F59E0B', order: 1, isDefault: true, mappedStatus: 'in_progress' },
  { id: 'done', label: 'Done', color: '#22C55E', order: 2, isDefault: true, mappedStatus: 'done' },
];

let STAGES: WantStage[] = [...DEFAULT_STAGES];
let stageListeners: Array<() => void> = [];

const notifyStageListeners = () => {
  stageListeners.forEach(listener => listener());
};

/**
 * Subscribe to stage changes.
 */
export const subscribeToStages = (listener: () => void): (() => void) => {
  stageListeners.push(listener);
  return () => {
    stageListeners = stageListeners.filter(l => l !== listener);
  };
};

/**
 * Get current stages snapshot.
 */
export const getStagesSnapshot = (): WantStage[] => STAGES;

/**
 * Get all stages sorted by order.
 */
export const getAllStages = (): WantStage[] => {
  return [...STAGES].sort((a, b) => a.order - b.order);
};

/**
 * Get a stage by ID.
 */
export const getStageById = (stageId: string): WantStage | undefined => {
  return STAGES.find(s => s.id === stageId);
};

/**
 * Add a new stage.
 */
export const addStage = (params: {
  label: string;
  color?: string;
  mappedStatus?: WantStatus;
  insertAfter?: string; // ID of stage to insert after
}): WantStage => {
  const id = `stage_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  // Determine order
  let order = STAGES.length;
  if (params.insertAfter) {
    const afterStage = STAGES.find(s => s.id === params.insertAfter);
    if (afterStage) {
      order = afterStage.order + 0.5;
      // Rebalance orders
      STAGES = STAGES.map(s => ({
        ...s,
        order: s.order >= order ? s.order + 1 : s.order,
      }));
    }
  }

  const newStage: WantStage = {
    id,
    label: params.label,
    color: params.color || '#666666',
    order,
    isDefault: false,
    mappedStatus: params.mappedStatus || 'in_progress',
  };

  STAGES = [...STAGES, newStage];
  console.log('[WantStore] Added stage:', newStage.label);
  notifyStageListeners();
  return newStage;
};

/**
 * Update a stage.
 */
export const updateStage = (
  stageId: string,
  updates: Partial<Pick<WantStage, 'label' | 'color' | 'order' | 'mappedStatus'>>
): WantStage | null => {
  const index = STAGES.findIndex(s => s.id === stageId);
  if (index === -1) return null;

  STAGES[index] = { ...STAGES[index], ...updates };
  console.log('[WantStore] Updated stage:', stageId);
  notifyStageListeners();
  return STAGES[index];
};

/**
 * Delete a stage (cannot delete default stages).
 */
export const deleteStage = (stageId: string): boolean => {
  const stage = STAGES.find(s => s.id === stageId);
  if (!stage || stage.isDefault) return false;

  STAGES = STAGES.filter(s => s.id !== stageId);
  console.log('[WantStore] Deleted stage:', stageId);
  notifyStageListeners();
  return true;
};

/**
 * Reset stages to defaults.
 */
export const resetStagesToDefaults = (): void => {
  STAGES = [...DEFAULT_STAGES];
  notifyStageListeners();
};

// =============================================================================
// ID GENERATION
// =============================================================================

const generateWantId = (): string => `want_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
const generateStepId = (): string => `step_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

// =============================================================================
// WANT OPERATIONS
// =============================================================================

/**
 * Get all Wants for Contact Zero.
 */
export const getAllWants = (): Want[] => {
  return [...WANTS];
};

/**
 * Get a Want by ID.
 */
export const getWantById = (wantId: string): Want | undefined => {
  return WANTS.find(w => w.id === wantId);
};

/**
 * Alias for getWantById.
 */
export const getWant = getWantById;

/**
 * Get Wants by status.
 */
export const getWantsByStatus = (status: WantStatus): Want[] => {
  return WANTS.filter(w => w.status === status);
};

/**
 * Get Wants by primary contact.
 */
export const getWantsByPrimaryContact = (contactId: string): Want[] => {
  return WANTS.filter(w => w.primaryContactId === contactId);
};

/**
 * Get Wants that are inert (no iteration logs).
 */
export const getInertWants = (): Want[] => {
  return WANTS.filter(w => w.iterations.length === 0 && w.status !== 'done');
};

/**
 * Create a new Want.
 */
export const createWant = (params: {
  title: string;
  reason: string;
  deadline?: string | null;
  status?: WantStatus;
  primaryContactId?: string | null;
  metricTypes?: string[];
  validation?: WantValidation;
  directness?: WantDirectness;
  originType?: WantOriginType;
  coverImageUrl?: string | null;
}): Want => {
  const now = new Date().toISOString();
  const newWant: Want = {
    id: generateWantId(),
    contactId: '0', // Always Contact Zero
    title: params.title,
    reason: params.reason,
    deadline: params.deadline || null,
    status: params.status || 'not_started',
    createdAt: now,
    updatedAt: now,
    congruencyScore: null,
    coverImageUrl: params.coverImageUrl || null,
    steps: [],
    metricTypes: params.metricTypes || [],
    metrics: [],
    primaryContactId: params.primaryContactId || null,
    relatedContactIds: [],
    originType: params.originType || 'want',
    validation: params.validation || { isValidWant: true, reason: 'Created directly' },
    directness: params.directness || { isDirect: true },
    iterations: [],
  };

  WANTS = [newWant, ...WANTS];
  console.log('[WantStore] Created Want:', newWant.title);
  notifyListeners();
  return newWant;
};

/**
 * Create a rejected "should" (for tracking purposes).
 */
export const createRejectedShould = (params: {
  title: string;
  reason: string;
  rejectionReason: string;
}): Want => {
  return createWant({
    title: params.title,
    reason: params.reason,
    status: 'not_started',
    originType: 'should_rejected',
    validation: {
      isValidWant: false,
      reason: params.rejectionReason,
    },
  });
};

/**
 * Update a Want.
 */
export const updateWant = (
  wantId: string,
  updates: Partial<Pick<Want,
    'title' | 'reason' | 'deadline' | 'status' | 'congruencyScore' |
    'validation' | 'directness' | 'originType' | 'coverImageUrl'
  >>
): Want | null => {
  const index = WANTS.findIndex(w => w.id === wantId);
  if (index === -1) return null;

  WANTS[index] = {
    ...WANTS[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  console.log('[WantStore] Updated Want:', wantId);
  notifyListeners();
  return WANTS[index];
};

/**
 * Delete a Want.
 */
export const deleteWant = (wantId: string): boolean => {
  const initialLength = WANTS.length;
  WANTS = WANTS.filter(w => w.id !== wantId);
  const deleted = WANTS.length < initialLength;
  if (deleted) {
    console.log('[WantStore] Deleted Want:', wantId);
    notifyListeners();
  }
  return deleted;
};

// =============================================================================
// CONTACT ATTACHMENT OPERATIONS
// =============================================================================

/**
 * Attach a primary contact to a Want.
 */
export const attachPrimaryContact = (
  wantId: string,
  contactId: string,
  directnessCheck?: WantDirectness
): Want | null => {
  const index = WANTS.findIndex(w => w.id === wantId);
  if (index === -1) return null;

  WANTS[index].primaryContactId = contactId;
  if (directnessCheck) {
    WANTS[index].directness = directnessCheck;
  }
  WANTS[index].updatedAt = new Date().toISOString();

  console.log('[WantStore] Attached primary contact:', contactId, 'to Want:', wantId);
  notifyListeners();
  return WANTS[index];
};

/**
 * Detach primary contact from a Want.
 */
export const detachPrimaryContact = (wantId: string): Want | null => {
  const index = WANTS.findIndex(w => w.id === wantId);
  if (index === -1) return null;

  WANTS[index].primaryContactId = null;
  WANTS[index].directness = { isDirect: true }; // Reset directness
  WANTS[index].updatedAt = new Date().toISOString();

  console.log('[WantStore] Detached primary contact from Want:', wantId);
  notifyListeners();
  return WANTS[index];
};

/**
 * Add a related contact to a Want.
 */
export const addRelatedContact = (wantId: string, contactId: string): boolean => {
  const index = WANTS.findIndex(w => w.id === wantId);
  if (index === -1) return false;

  if (!WANTS[index].relatedContactIds.includes(contactId)) {
    WANTS[index].relatedContactIds.push(contactId);
    WANTS[index].updatedAt = new Date().toISOString();
    notifyListeners();
  }
  return true;
};

/**
 * Remove a related contact from a Want.
 */
export const removeRelatedContact = (wantId: string, contactId: string): boolean => {
  const index = WANTS.findIndex(w => w.id === wantId);
  if (index === -1) return false;

  const initialLength = WANTS[index].relatedContactIds.length;
  WANTS[index].relatedContactIds = WANTS[index].relatedContactIds.filter(c => c !== contactId);

  if (WANTS[index].relatedContactIds.length < initialLength) {
    WANTS[index].updatedAt = new Date().toISOString();
    notifyListeners();
    return true;
  }
  return false;
};

// =============================================================================
// STEP OPERATIONS
// =============================================================================

/**
 * Add a step to a Want.
 */
export const addStep = (
  wantId: string,
  params: {
    title: string;
    description?: string;
    deadline?: string | null;
    status?: WantStatus;
  }
): WantStep | null => {
  const index = WANTS.findIndex(w => w.id === wantId);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const newStep: WantStep = {
    id: generateStepId(),
    title: params.title,
    description: params.description,
    deadline: params.deadline || null,
    status: params.status || 'not_started',
    createdAt: now,
    completedAt: null,
  };

  WANTS[index].steps.push(newStep);
  WANTS[index].updatedAt = now;

  console.log('[WantStore] Added step to Want:', wantId, newStep.title);
  notifyListeners();
  return newStep;
};

/**
 * Update a step.
 */
export const updateStep = (
  wantId: string,
  stepId: string,
  updates: Partial<Pick<WantStep, 'title' | 'description' | 'deadline' | 'status'>>
): WantStep | null => {
  const wantIndex = WANTS.findIndex(w => w.id === wantId);
  if (wantIndex === -1) return null;

  const stepIndex = WANTS[wantIndex].steps.findIndex(s => s.id === stepId);
  if (stepIndex === -1) return null;

  const now = new Date().toISOString();
  const currentStep = WANTS[wantIndex].steps[stepIndex];

  // Track completedAt when status changes to done
  let completedAt = currentStep.completedAt;
  if (updates.status === 'done' && currentStep.status !== 'done') {
    completedAt = now;
  } else if (updates.status && updates.status !== 'done') {
    completedAt = null;
  }

  WANTS[wantIndex].steps[stepIndex] = {
    ...currentStep,
    ...updates,
    completedAt,
  };
  WANTS[wantIndex].updatedAt = now;

  console.log('[WantStore] Updated step:', stepId);
  notifyListeners();
  return WANTS[wantIndex].steps[stepIndex];
};

/**
 * Delete a step.
 */
export const deleteStep = (wantId: string, stepId: string): boolean => {
  const wantIndex = WANTS.findIndex(w => w.id === wantId);
  if (wantIndex === -1) return false;

  const initialLength = WANTS[wantIndex].steps.length;
  WANTS[wantIndex].steps = WANTS[wantIndex].steps.filter(s => s.id !== stepId);
  const deleted = WANTS[wantIndex].steps.length < initialLength;

  if (deleted) {
    WANTS[wantIndex].updatedAt = new Date().toISOString();
    console.log('[WantStore] Deleted step:', stepId);
    notifyListeners();
  }
  return deleted;
};

/**
 * Move a step to a different status (for DnD).
 */
export const moveStep = (
  wantId: string,
  stepId: string,
  newStatus: WantStatus
): WantStep | null => {
  return updateStep(wantId, stepId, { status: newStatus });
};

/**
 * Reorder steps within a Want (for DnD).
 */
export const reorderSteps = (wantId: string, stepIds: string[]): boolean => {
  const wantIndex = WANTS.findIndex(w => w.id === wantId);
  if (wantIndex === -1) return false;

  const stepsMap = new Map(WANTS[wantIndex].steps.map(s => [s.id, s]));
  const reorderedSteps = stepIds
    .map(id => stepsMap.get(id))
    .filter((s): s is WantStep => s !== undefined);

  if (reorderedSteps.length !== WANTS[wantIndex].steps.length) {
    return false; // Invalid step IDs
  }

  WANTS[wantIndex].steps = reorderedSteps;
  WANTS[wantIndex].updatedAt = new Date().toISOString();
  notifyListeners();
  return true;
};

// =============================================================================
// DYNAMIC METRIC OPERATIONS
// =============================================================================

/**
 * Add a new metric type to a Want.
 * Creates a new column for tracking.
 */
export const addMetricType = (wantId: string, metricName: string): boolean => {
  const index = WANTS.findIndex(w => w.id === wantId);
  if (index === -1) return false;

  // Normalize metric name (lowercase, underscores)
  const normalizedName = metricName.toLowerCase().replace(/\s+/g, '_');

  // Don't add duplicates
  if (WANTS[index].metricTypes.includes(normalizedName)) {
    return false;
  }

  WANTS[index].metricTypes.push(normalizedName);
  WANTS[index].updatedAt = new Date().toISOString();

  console.log('[WantStore] Added metric type:', normalizedName, 'to Want:', wantId);
  notifyListeners();
  return true;
};

/**
 * Remove a metric type from a Want.
 */
export const removeMetricType = (wantId: string, metricName: string): boolean => {
  const index = WANTS.findIndex(w => w.id === wantId);
  if (index === -1) return false;

  const normalizedName = metricName.toLowerCase().replace(/\s+/g, '_');
  const initialLength = WANTS[index].metricTypes.length;
  WANTS[index].metricTypes = WANTS[index].metricTypes.filter(m => m !== normalizedName);

  if (WANTS[index].metricTypes.length < initialLength) {
    WANTS[index].updatedAt = new Date().toISOString();
    console.log('[WantStore] Removed metric type:', normalizedName);
    notifyListeners();
    return true;
  }
  return false;
};

/**
 * Log a metric value for a specific date.
 */
export const logMetricValue = (
  wantId: string,
  date: string,
  metricName: string,
  value: number | string | boolean | null
): boolean => {
  const index = WANTS.findIndex(w => w.id === wantId);
  if (index === -1) return false;

  const normalizedName = metricName.toLowerCase().replace(/\s+/g, '_');

  // Auto-add metric type if it doesn't exist
  if (!WANTS[index].metricTypes.includes(normalizedName)) {
    WANTS[index].metricTypes.push(normalizedName);
  }

  // Find or create metric entry for this date
  const dateKey = date.split('T')[0]; // Normalize to YYYY-MM-DD
  let entryIndex = WANTS[index].metrics.findIndex(m => m.date === dateKey);

  if (entryIndex === -1) {
    // Create new entry
    WANTS[index].metrics.push({
      date: dateKey,
      values: { [normalizedName]: value },
    });
    // Sort by date descending
    WANTS[index].metrics.sort((a, b) => b.date.localeCompare(a.date));
  } else {
    // Update existing entry
    WANTS[index].metrics[entryIndex].values[normalizedName] = value;
  }

  WANTS[index].updatedAt = new Date().toISOString();
  console.log('[WantStore] Logged metric:', normalizedName, '=', value, 'on', dateKey);
  notifyListeners();
  return true;
};

/**
 * Get metrics for a Want.
 */
export const getMetrics = (wantId: string): WantMetricEntry[] => {
  const want = WANTS.find(w => w.id === wantId);
  return want?.metrics || [];
};

/**
 * Get metric types for a Want.
 */
export const getMetricTypes = (wantId: string): string[] => {
  const want = WANTS.find(w => w.id === wantId);
  return want?.metricTypes || [];
};

// =============================================================================
// LEGACY METRIC SUPPORT
// =============================================================================

/**
 * Log metrics using the old fixed schema (backward compatibility).
 * Converts to dynamic metric format.
 */
export const logMetrics = (
  wantId: string,
  metrics: {
    date?: string;
    hoursWorked?: number | null;
    income?: number | null;
    sleep?: number | null;
    workout?: boolean | null;
    carbs?: number | null;
    protein?: number | null;
    fat?: number | null;
    calories?: number | null;
    caloriesBurned?: number | null;
    deficit?: number | null;
    weight?: number | null;
  }
): boolean => {
  const date = metrics.date || new Date().toISOString().split('T')[0];

  const metricMap: Record<string, number | boolean | null> = {
    hours_worked: metrics.hoursWorked ?? null,
    income: metrics.income ?? null,
    sleep: metrics.sleep ?? null,
    workout: metrics.workout ?? null,
    carbs: metrics.carbs ?? null,
    protein: metrics.protein ?? null,
    fat: metrics.fat ?? null,
    calories: metrics.calories ?? null,
    calories_burned: metrics.caloriesBurned ?? null,
    deficit: metrics.deficit ?? null,
    weight: metrics.weight ?? null,
  };

  let success = false;
  for (const [name, value] of Object.entries(metricMap)) {
    if (value !== null) {
      logMetricValue(wantId, date, name, value);
      success = true;
    }
  }

  return success;
};

// =============================================================================
// ITERATION OPERATIONS
// =============================================================================

/**
 * Log an iteration/feedback for a Want.
 */
export const logIteration = (
  wantId: string,
  feedback: string,
  source: 'user' | 'little_lord' = 'user',
  date?: string
): WantIteration | null => {
  const index = WANTS.findIndex(w => w.id === wantId);
  if (index === -1) return null;

  const iteration: WantIteration = {
    date: date || new Date().toISOString(),
    feedback,
    source,
  };

  WANTS[index].iterations.push(iteration);
  // Sort by date descending
  WANTS[index].iterations.sort((a, b) => b.date.localeCompare(a.date));
  WANTS[index].updatedAt = new Date().toISOString();

  console.log('[WantStore] Logged iteration for Want:', wantId, '(source:', source, ')');
  notifyListeners();
  return iteration;
};

/**
 * Get iterations for a Want.
 */
export const getIterations = (wantId: string): WantIteration[] => {
  const want = WANTS.find(w => w.id === wantId);
  return want?.iterations || [];
};

/**
 * Check if a Want is inert (no iteration logs).
 */
export const isWantInert = (wantId: string): boolean => {
  const want = WANTS.find(w => w.id === wantId);
  return want ? want.iterations.length === 0 && want.status !== 'done' : true;
};

// =============================================================================
// COMPUTED HELPERS
// =============================================================================

/**
 * Calculate step completion percentage for a Want.
 */
export const getStepCompletionPercentage = (wantId: string): number => {
  const want = WANTS.find(w => w.id === wantId);
  if (!want || want.steps.length === 0) return 0;

  const completed = want.steps.filter(s => s.status === 'done').length;
  return Math.round((completed / want.steps.length) * 100);
};

/**
 * Get aggregate stats for a numeric metric.
 */
export const getMetricStats = (wantId: string, metricName: string): {
  count: number;
  sum: number;
  avg: number;
  min: number | null;
  max: number | null;
  latest: number | string | boolean | null;
} => {
  const want = WANTS.find(w => w.id === wantId);
  const defaultStats = { count: 0, sum: 0, avg: 0, min: null, max: null, latest: null };

  if (!want) return defaultStats;

  const normalizedName = metricName.toLowerCase().replace(/\s+/g, '_');
  const values = want.metrics
    .map(m => m.values[normalizedName])
    .filter((v): v is number => typeof v === 'number');

  if (values.length === 0) {
    // Check for latest non-numeric value
    const latestEntry = want.metrics.find(m => m.values[normalizedName] != null);
    return {
      ...defaultStats,
      latest: latestEntry?.values[normalizedName] ?? null,
    };
  }

  return {
    count: values.length,
    sum: values.reduce((a, b) => a + b, 0),
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    latest: values[0],
  };
};

/**
 * Get aggregate metrics for a Want (legacy format).
 */
export const getAggregateMetrics = (wantId: string): {
  totalHoursWorked: number;
  totalIncome: number;
  avgSleep: number;
  workoutDays: number;
  avgCalories: number;
  avgWeight: number;
  latestWeight: number | null;
} => {
  const hoursStats = getMetricStats(wantId, 'hours_worked');
  const incomeStats = getMetricStats(wantId, 'income');
  const sleepStats = getMetricStats(wantId, 'sleep');
  const caloriesStats = getMetricStats(wantId, 'calories');
  const weightStats = getMetricStats(wantId, 'weight');

  // Count workout days (boolean true values)
  const want = WANTS.find(w => w.id === wantId);
  const workoutDays = want?.metrics.filter(m => m.values.workout === true).length || 0;

  return {
    totalHoursWorked: hoursStats.sum,
    totalIncome: incomeStats.sum,
    avgSleep: sleepStats.avg,
    workoutDays,
    avgCalories: caloriesStats.avg,
    avgWeight: weightStats.avg,
    latestWeight: typeof weightStats.latest === 'number' ? weightStats.latest : null,
  };
};

/**
 * Get all Wants with their completion stats.
 */
export const getAllWantsWithStats = (): Array<Want & { completionPercentage: number; isInert: boolean }> => {
  return WANTS.map(want => ({
    ...want,
    completionPercentage: getStepCompletionPercentage(want.id),
    isInert: isWantInert(want.id),
  }));
};

/**
 * Get chart data for a metric (for Recharts).
 */
export const getMetricChartData = (
  wantId: string,
  metricName: string
): Array<{ date: string; value: number }> => {
  const want = WANTS.find(w => w.id === wantId);
  if (!want) return [];

  const normalizedName = metricName.toLowerCase().replace(/\s+/g, '_');

  return want.metrics
    .filter(m => typeof m.values[normalizedName] === 'number')
    .map(m => ({
      date: m.date,
      value: m.values[normalizedName] as number,
    }))
    .sort((a, b) => a.date.localeCompare(b.date)); // Ascending for charts
};

/**
 * Get all chartable metrics for a Want.
 */
export const getChartableMetrics = (wantId: string): string[] => {
  const want = WANTS.find(w => w.id === wantId);
  if (!want) return [];

  return want.metricTypes.filter(m => hasChartRule(m));
};

/**
 * Check if a Want has valid validation.
 */
export const isWantValid = (wantId: string): boolean => {
  const want = WANTS.find(w => w.id === wantId);
  return want?.validation.isValidWant ?? false;
};

/**
 * Check if a Want has direct contact attachment.
 */
export const isWantDirect = (wantId: string): boolean => {
  const want = WANTS.find(w => w.id === wantId);
  return want?.directness.isDirect ?? true;
};

// =============================================================================
// SCOPE VIEW CALCULATIONS
// =============================================================================

export interface DailyMetricRow {
  date: string;
  dayOfWeek: string;
  values: Record<string, number | string | boolean | null>;
  deficit: number | null;  // Derived: calories - caloriesBurned
}

/**
 * Get daily metric rows for the Scope table.
 * One row per day, sorted by date descending.
 */
export const getDailyRows = (wantId: string): DailyMetricRow[] => {
  const want = WANTS.find(w => w.id === wantId);
  if (!want) return [];

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return want.metrics.map(entry => {
    const dateObj = new Date(entry.date + 'T00:00:00');
    const dayOfWeek = dayNames[dateObj.getDay()];

    // Calculate deficit if both calories and calories_burned exist
    const calories = typeof entry.values.calories === 'number' ? entry.values.calories : null;
    const caloriesBurned = typeof entry.values.calories_burned === 'number' ? entry.values.calories_burned : null;
    const deficit = (calories !== null && caloriesBurned !== null)
      ? calories - caloriesBurned
      : null;

    return {
      date: entry.date,
      dayOfWeek,
      values: entry.values,
      deficit,
    };
  });
};

/**
 * Calculate averages for all numeric metrics.
 */
export const calculateAverages = (wantId: string): Record<string, number> => {
  const want = WANTS.find(w => w.id === wantId);
  if (!want) return {};

  const averages: Record<string, number> = {};

  for (const metricName of want.metricTypes) {
    const values = want.metrics
      .map(m => m.values[metricName])
      .filter((v): v is number => typeof v === 'number');

    if (values.length > 0) {
      averages[metricName] = values.reduce((a, b) => a + b, 0) / values.length;
    }
  }

  // Also calculate average deficit
  const deficits = want.metrics
    .map(m => {
      const cal = typeof m.values.calories === 'number' ? m.values.calories : null;
      const burn = typeof m.values.calories_burned === 'number' ? m.values.calories_burned : null;
      return (cal !== null && burn !== null) ? cal - burn : null;
    })
    .filter((v): v is number => v !== null);

  if (deficits.length > 0) {
    averages.deficit = deficits.reduce((a, b) => a + b, 0) / deficits.length;
  }

  return averages;
};

/**
 * Calculate sums for applicable metrics.
 * Sum metrics: income, hours_worked, calories, calories_burned
 */
export const calculateSums = (wantId: string): Record<string, number> => {
  const want = WANTS.find(w => w.id === wantId);
  if (!want) return {};

  const sumMetrics = ['income', 'hours_worked', 'calories', 'calories_burned'];
  const sums: Record<string, number> = {};

  for (const metricName of sumMetrics) {
    if (want.metricTypes.includes(metricName)) {
      const values = want.metrics
        .map(m => m.values[metricName])
        .filter((v): v is number => typeof v === 'number');

      sums[metricName] = values.reduce((a, b) => a + b, 0);
    }
  }

  return sums;
};

/**
 * Calculate derived metrics.
 */
export const calculateDerivedMetrics = (wantId: string): {
  avgDeficit: number | null;
  totalDeficit: number | null;
  workoutPct: number;
  workoutDays: number;
  totalDays: number;
} => {
  const want = WANTS.find(w => w.id === wantId);
  if (!want) {
    return { avgDeficit: null, totalDeficit: null, workoutPct: 0, workoutDays: 0, totalDays: 0 };
  }

  const totalDays = want.metrics.length;

  // Calculate deficits
  const deficits = want.metrics
    .map(m => {
      const cal = typeof m.values.calories === 'number' ? m.values.calories : null;
      const burn = typeof m.values.calories_burned === 'number' ? m.values.calories_burned : null;
      return (cal !== null && burn !== null) ? cal - burn : null;
    })
    .filter((v): v is number => v !== null);

  const avgDeficit = deficits.length > 0
    ? deficits.reduce((a, b) => a + b, 0) / deficits.length
    : null;

  const totalDeficit = deficits.length > 0
    ? deficits.reduce((a, b) => a + b, 0)
    : null;

  // Calculate workout percentage
  const workoutDays = want.metrics.filter(m => m.values.workout === true).length;
  const workoutPct = totalDays > 0 ? Math.round((workoutDays / totalDays) * 100) : 0;

  return {
    avgDeficit,
    totalDeficit,
    workoutPct,
    workoutDays,
    totalDays,
  };
};

// =============================================================================
// COVER IMAGE OPERATIONS
// =============================================================================

/**
 * Update the cover image URL for a Want.
 * TEMP_DEV: Currently stores data URLs directly. Will migrate to proper storage.
 */
export const updateWantCoverImage = (wantId: string, url: string | null): Want | null => {
  return updateWant(wantId, { coverImageUrl: url });
};

// =============================================================================
// GLOBAL STEPS BOARD HELPERS
// =============================================================================

/**
 * Step with parent Want info for global board view.
 */
export interface StepWithWant extends WantStep {
  wantId: string;
  wantTitle: string;
}

/**
 * Get all steps across all Wants, grouped by status.
 * Used for the global Steps Board view.
 */
export const getAllStepsGrouped = (): Record<WantStatus, StepWithWant[]> => {
  const result: Record<WantStatus, StepWithWant[]> = {
    not_started: [],
    in_progress: [],
    done: [],
  };

  for (const want of WANTS) {
    for (const step of want.steps) {
      result[step.status].push({
        ...step,
        wantId: want.id,
        wantTitle: want.title,
      });
    }
  }

  // Sort each group by createdAt descending (newest first)
  for (const status of Object.keys(result) as WantStatus[]) {
    result[status].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  return result;
};

/**
 * Get all steps as a flat array with Want info.
 */
export const getAllSteps = (): StepWithWant[] => {
  const steps: StepWithWant[] = [];

  for (const want of WANTS) {
    for (const step of want.steps) {
      steps.push({
        ...step,
        wantId: want.id,
        wantTitle: want.title,
      });
    }
  }

  return steps.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
};

/**
 * Move a step from one Want to another.
 * Used for cross-Want DnD in global Steps Board.
 */
export const moveStepToWant = (
  stepId: string,
  fromWantId: string,
  toWantId: string,
  newStatus?: WantStatus
): WantStep | null => {
  // Find source Want
  const fromIndex = WANTS.findIndex(w => w.id === fromWantId);
  if (fromIndex === -1) return null;

  // Find step in source Want
  const stepIndex = WANTS[fromIndex].steps.findIndex(s => s.id === stepId);
  if (stepIndex === -1) return null;

  // Extract the step
  const [step] = WANTS[fromIndex].steps.splice(stepIndex, 1);
  WANTS[fromIndex].updatedAt = new Date().toISOString();

  // If same Want, just reinsert (shouldn't happen but handle it)
  if (fromWantId === toWantId) {
    const updatedStep = newStatus ? { ...step, status: newStatus } : step;
    WANTS[fromIndex].steps.push(updatedStep);
    notifyListeners();
    return updatedStep;
  }

  // Find target Want
  const toIndex = WANTS.findIndex(w => w.id === toWantId);
  if (toIndex === -1) {
    // Put the step back if target doesn't exist
    WANTS[fromIndex].steps.push(step);
    return null;
  }

  // Add to target Want
  const now = new Date().toISOString();
  const updatedStep: WantStep = {
    ...step,
    status: newStatus || step.status,
    completedAt: newStatus === 'done' && step.status !== 'done' ? now : step.completedAt,
  };

  WANTS[toIndex].steps.push(updatedStep);
  WANTS[toIndex].updatedAt = now;

  console.log('[WantStore] Moved step', stepId, 'from', fromWantId, 'to', toWantId);
  notifyListeners();
  return updatedStep;
};

// =============================================================================
// STEP QUERY HELPERS
// =============================================================================

/**
 * Get overdue steps for a Want (past deadline, not done).
 * Used for congruency calculations.
 */
export const getOverdueSteps = (wantId: string): WantStep[] => {
  const want = WANTS.find(w => w.id === wantId);
  if (!want) return [];

  const now = new Date().toISOString().split('T')[0];

  return want.steps.filter(step =>
    step.status !== 'done' &&
    step.deadline &&
    step.deadline < now
  );
};

/**
 * Get steps by status for a specific Want.
 */
export const getStepsByStatus = (wantId: string, status: WantStatus): WantStep[] => {
  const want = WANTS.find(w => w.id === wantId);
  if (!want) return [];

  return want.steps.filter(s => s.status === status);
};

/**
 * Get step counts by status for a Want.
 */
export const getStepCounts = (wantId: string): Record<WantStatus, number> => {
  const want = WANTS.find(w => w.id === wantId);
  if (!want) return { not_started: 0, in_progress: 0, done: 0 };

  return {
    not_started: want.steps.filter(s => s.status === 'not_started').length,
    in_progress: want.steps.filter(s => s.status === 'in_progress').length,
    done: want.steps.filter(s => s.status === 'done').length,
  };
};

/**
 * Get recently completed steps across all Wants.
 * Useful for activity feed / progress view.
 */
export const getRecentlyCompletedSteps = (limit: number = 10): StepWithWant[] => {
  const completedSteps: StepWithWant[] = [];

  for (const want of WANTS) {
    for (const step of want.steps) {
      if (step.status === 'done' && step.completedAt) {
        completedSteps.push({
          ...step,
          wantId: want.id,
          wantTitle: want.title,
        });
      }
    }
  }

  return completedSteps
    .sort((a, b) => (b.completedAt || '').localeCompare(a.completedAt || ''))
    .slice(0, limit);
};
