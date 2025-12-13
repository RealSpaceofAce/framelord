// =============================================================================
// CASE CALL APPLICATION STORE — Supabase Version
// =============================================================================
// Stores case call booking applications submitted at /case-call
// This version uses Supabase for persistence instead of localStorage.
// =============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
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

// Database row type (snake_case)
interface CaseCallApplicationRow {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  answers: { question: string; answer: string }[];
  contact_id: string | null;
  status: CaseCallApplicationStatus;
  created_at: string;
  reviewed_at: string | null;
  scheduled_at: string | null;
  notes: string | null;
}

// =============================================================================
// HELPERS
// =============================================================================

function rowToApplication(row: CaseCallApplicationRow): CaseCallApplication {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    phone: row.phone || undefined,
    answers: row.answers,
    contactId: row.contact_id || undefined,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at || undefined,
    scheduledAt: row.scheduled_at || undefined,
    notes: row.notes || undefined,
  };
}

// =============================================================================
// LOCAL STORAGE FALLBACK
// =============================================================================

const STORAGE_KEY = 'framelord_case_call_applications';
let localApplications: CaseCallApplication[] = [];
let localInitialized = false;

function initLocal(): void {
  if (localInitialized) return;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        localApplications = parsed;
      }
    }
  } catch {
    console.warn('[CaseCallApplicationStore] Failed to load from localStorage');
  }
  localInitialized = true;
}

function persistLocal(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localApplications));
  } catch {
    console.warn('[CaseCallApplicationStore] Failed to persist to localStorage');
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
  const application: CaseCallApplication = {
    id: `cca_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    email: input.email,
    name: input.name,
    phone: input.phone,
    answers: input.answers,
    contactId: input.contactId,
    status: 'submitted',
    createdAt: new Date().toISOString(),
  };

  // Try Supabase first
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('case_call_applications')
        .insert({
          email: application.email,
          name: application.name,
          phone: application.phone || null,
          answers: application.answers,
          contact_id: application.contactId || null,
          status: application.status,
        })
        .select()
        .single();

      if (error) {
        console.error('[CaseCallApplicationStore] Supabase insert failed:', error);
        throw error;
      }

      if (data) {
        const saved = rowToApplication(data);
        console.log(`[CaseCallApplicationStore] Application saved to Supabase: ${saved.id}`);

        // Fire notification hook
        const notificationData: CaseCallApplicationData = {
          id: saved.id,
          email: saved.email,
          name: saved.name,
          phone: saved.phone,
          answers: saved.answers,
          contactId: saved.contactId,
          submittedAt: saved.createdAt,
        };
        await onCaseCallApplicationSubmitted(notificationData);

        return saved;
      }
    } catch (e) {
      console.warn('[CaseCallApplicationStore] Falling back to localStorage');
    }
  }

  // Fallback to localStorage
  initLocal();
  localApplications = [application, ...localApplications];
  persistLocal();

  // Fire notification hook
  const notificationData: CaseCallApplicationData = {
    id: application.id,
    email: application.email,
    name: application.name,
    phone: application.phone,
    answers: application.answers,
    contactId: application.contactId,
    submittedAt: application.createdAt,
  };
  await onCaseCallApplicationSubmitted(notificationData);

  console.log(`[CaseCallApplicationStore] Application saved to localStorage: ${application.id}`);
  return application;
}

/**
 * Get all case call applications (admin only - Supabase RLS enforces this)
 */
export async function getAllCaseCallApplications(): Promise<CaseCallApplication[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('case_call_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[CaseCallApplicationStore] Supabase fetch failed:', error);
        throw error;
      }

      if (data) {
        return data.map(rowToApplication);
      }
    } catch (e) {
      console.warn('[CaseCallApplicationStore] Falling back to localStorage');
    }
  }

  initLocal();
  return [...localApplications];
}

/**
 * Get a single application by ID
 */
export async function getCaseCallApplicationById(id: string): Promise<CaseCallApplication | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('case_call_applications')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) return rowToApplication(data);
    } catch (e) {
      console.warn('[CaseCallApplicationStore] Falling back to localStorage');
    }
  }

  initLocal();
  return localApplications.find(a => a.id === id) ?? null;
}

/**
 * Get applications by status
 */
export async function getCaseCallApplicationsByStatus(
  status: CaseCallApplicationStatus
): Promise<CaseCallApplication[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('case_call_applications')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) return data.map(rowToApplication);
    } catch (e) {
      console.warn('[CaseCallApplicationStore] Falling back to localStorage');
    }
  }

  initLocal();
  return localApplications.filter(a => a.status === status);
}

/**
 * Update application status
 */
export async function updateCaseCallApplicationStatus(
  id: string,
  status: CaseCallApplicationStatus,
  notes?: string
): Promise<CaseCallApplication | null> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      const updateData: Record<string, unknown> = {
        status,
        reviewed_at: now,
      };
      if (notes !== undefined) {
        updateData.notes = notes;
      }

      const { data, error } = await supabase
        .from('case_call_applications')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (data) return rowToApplication(data);
    } catch (e) {
      console.warn('[CaseCallApplicationStore] Falling back to localStorage');
    }
  }

  initLocal();
  const index = localApplications.findIndex(a => a.id === id);
  if (index < 0) return null;

  localApplications[index] = {
    ...localApplications[index],
    status,
    reviewedAt: now,
    notes: notes ?? localApplications[index].notes,
  };
  persistLocal();
  return localApplications[index];
}

/**
 * Mark application as scheduled
 */
export async function markCaseCallScheduled(
  id: string,
  scheduledTime?: string
): Promise<CaseCallApplication | null> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('case_call_applications')
        .update({
          status: 'scheduled',
          scheduled_at: scheduledTime || now,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (data) return rowToApplication(data);
    } catch (e) {
      console.warn('[CaseCallApplicationStore] Falling back to localStorage');
    }
  }

  initLocal();
  const index = localApplications.findIndex(a => a.id === id);
  if (index < 0) return null;

  localApplications[index] = {
    ...localApplications[index],
    status: 'scheduled',
    scheduledAt: scheduledTime || now,
  };
  persistLocal();
  return localApplications[index];
}

/**
 * Get application counts by status
 */
export async function getCaseCallApplicationCounts(): Promise<Record<CaseCallApplicationStatus, number>> {
  const apps = await getAllCaseCallApplications();

  const counts: Record<CaseCallApplicationStatus, number> = {
    submitted: 0,
    reviewed: 0,
    scheduled: 0,
    completed: 0,
    cancelled: 0,
  };

  for (const app of apps) {
    counts[app.status]++;
  }

  return counts;
}

/**
 * Reset store (for testing)
 */
export function resetCaseCallApplicationStore(): void {
  localApplications = [];
  localInitialized = false;
  localStorage.removeItem(STORAGE_KEY);
}
