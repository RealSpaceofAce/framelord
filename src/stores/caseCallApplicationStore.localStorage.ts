// =============================================================================
// CASE CALL APPLICATION STORE — Case call booking application storage
// =============================================================================
// Stores case call applications submitted at /case-call
// =============================================================================

import { onCaseCallApplicationSubmitted, type CaseCallApplicationData } from '../services/intakeNotificationService';

// =============================================================================
// TYPES
// =============================================================================

export type CaseCallApplicationStatus =
  | 'submitted'
  | 'reviewed'
  | 'scheduled'
  | 'completed'
  | 'cancelled';

export interface CaseCallApplication {
  id: string;
  email: string;
  name: string;
  phone?: string;
  answers: { question: string; answer: string }[];
  contactId?: string;
  status: CaseCallApplicationStatus;
  createdAt: string;
  reviewedAt?: string;
  scheduledAt?: string;
  notes?: string;
}

// =============================================================================
// STORAGE
// =============================================================================

const STORAGE_KEY = 'framelord_case_call_applications';

let applications: CaseCallApplication[] = [];
let initialized = false;

function init(): void {
  if (initialized) return;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        applications = parsed;
      }
    }
  } catch {
    console.warn('[CaseCallApplicationStore] Failed to load applications');
  }

  initialized = true;
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  } catch {
    console.warn('[CaseCallApplicationStore] Failed to persist applications');
  }
}

// =============================================================================
// CASE CALL FORM QUESTIONS
// =============================================================================

export const CASE_CALL_QUESTIONS = [
  {
    id: 'situation',
    question: "What's the primary situation you're dealing with right now?",
    placeholder: 'Describe the challenge or opportunity you want to discuss...',
    minLength: 50,
    maxLength: 500,
  },
  {
    id: 'tried',
    question: "What have you already tried to address this?",
    placeholder: "List the approaches, tools, or strategies you've attempted...",
    minLength: 30,
    maxLength: 400,
  },
  {
    id: 'ideal_outcome',
    question: "What would a successful outcome look like for you?",
    placeholder: 'Describe your ideal result from this call...',
    minLength: 30,
    maxLength: 400,
  },
  {
    id: 'timeline',
    question: "What's your timeline for resolving this?",
    placeholder: 'e.g., "Need to fix this within 2 weeks", "Long-term strategy"...',
    minLength: 10,
    maxLength: 200,
  },
];

// =============================================================================
// PUBLIC API
// =============================================================================

export interface SubmitCaseCallApplicationInput {
  email: string;
  name: string;
  phone?: string;
  answers: { question: string; answer: string }[];
  contactId?: string;
}

/**
 * Submit a case call application
 */
export async function submitCaseCallApplication(
  input: SubmitCaseCallApplicationInput
): Promise<CaseCallApplication> {
  init();

  const id = `cca_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const application: CaseCallApplication = {
    id,
    email: input.email,
    name: input.name,
    phone: input.phone,
    answers: input.answers,
    contactId: input.contactId,
    status: 'submitted',
    createdAt: new Date().toISOString(),
  };

  applications = [application, ...applications];
  persist();

  // Send admin notification
  const notificationData: CaseCallApplicationData = {
    id,
    email: input.email,
    name: input.name,
    phone: input.phone,
    answers: input.answers,
    contactId: input.contactId,
    submittedAt: application.createdAt,
  };

  await onCaseCallApplicationSubmitted(notificationData);

  console.log(`[CaseCallApplicationStore] Application submitted: ${id}`);

  return application;
}

/**
 * Get all case call applications
 */
export function getAllCaseCallApplications(): CaseCallApplication[] {
  init();
  return [...applications];
}

/**
 * Get a single application by ID
 */
export function getCaseCallApplicationById(id: string): CaseCallApplication | null {
  init();
  return applications.find(a => a.id === id) ?? null;
}

/**
 * Get applications by status
 */
export function getCaseCallApplicationsByStatus(
  status: CaseCallApplicationStatus
): CaseCallApplication[] {
  init();
  return applications.filter(a => a.status === status);
}

/**
 * Update application status
 */
export function updateCaseCallApplicationStatus(
  id: string,
  status: CaseCallApplicationStatus,
  notes?: string
): CaseCallApplication | null {
  init();

  const index = applications.findIndex(a => a.id === id);
  if (index < 0) return null;

  applications[index] = {
    ...applications[index],
    status,
    reviewedAt: new Date().toISOString(),
    notes: notes ?? applications[index].notes,
  };

  persist();

  return applications[index];
}

/**
 * Mark application as scheduled
 */
export function markCaseCallScheduled(
  id: string,
  scheduledTime?: string
): CaseCallApplication | null {
  init();

  const index = applications.findIndex(a => a.id === id);
  if (index < 0) return null;

  applications[index] = {
    ...applications[index],
    status: 'scheduled',
    scheduledAt: scheduledTime || new Date().toISOString(),
  };

  persist();

  return applications[index];
}

/**
 * Get application counts by status
 */
export function getCaseCallApplicationCounts(): Record<CaseCallApplicationStatus, number> {
  init();

  const counts: Record<CaseCallApplicationStatus, number> = {
    submitted: 0,
    reviewed: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const app of applications) {
    counts[app.status]++;
  }

  return counts;
}

/**
 * Reset store (for testing)
 */
export function resetCaseCallApplicationStore(): void {
  applications = [];
  initialized = false;
  localStorage.removeItem(STORAGE_KEY);
}
