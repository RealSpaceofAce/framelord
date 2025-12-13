// =============================================================================
// BETA CHAT APPLICATION STORE — Supabase Version
// =============================================================================
// Stores beta program applications submitted via the AI chat interface.
// This version uses Supabase for persistence instead of localStorage.
// =============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabase/client';
import { onBetaApplicationSubmitted, type BetaApplicationData } from '../services/intakeNotificationService';

// =============================================================================
// TYPES
// =============================================================================

export type BetaChatApplicationStatus =
  | 'applied'
  | 'approved'
  | 'rejected'
  | 'needs_case_call';

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
}

export interface BetaChatApplication {
  id: string;
  email: string;
  name: string;
  conversationHistory: ChatMessage[];
  status: BetaChatApplicationStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewerId?: string;
  notes?: string;
}

// Database row type (snake_case)
interface BetaChatApplicationRow {
  id: string;
  email: string;
  name: string;
  conversation_history: ChatMessage[];
  status: BetaChatApplicationStatus;
  created_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
  notes: string | null;
}

// =============================================================================
// HELPERS
// =============================================================================

function rowToApplication(row: BetaChatApplicationRow): BetaChatApplication {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    conversationHistory: row.conversation_history,
    status: row.status,
    createdAt: row.created_at,
    reviewedAt: row.reviewed_at || undefined,
    reviewerId: row.reviewer_id || undefined,
    notes: row.notes || undefined,
  };
}

// =============================================================================
// LOCAL STORAGE FALLBACK
// =============================================================================

const STORAGE_KEY = 'framelord_beta_chat_applications';
let localApplications: BetaChatApplication[] = [];
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
    console.warn('[BetaChatApplicationStore] Failed to load from localStorage');
  }
  localInitialized = true;
}

function persistLocal(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localApplications));
  } catch {
    console.warn('[BetaChatApplicationStore] Failed to persist to localStorage');
  }
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Submit a beta chat application
 * Extracts name/email from conversation and stores the full chat history
 */
export async function submitBetaChatApplication(
  conversationHistory: ChatMessage[]
): Promise<BetaChatApplication> {
  // Extract email and name from conversation
  let email = '';
  let name = '';

  for (const msg of conversationHistory) {
    if (msg.role === 'user') {
      const content = msg.content.toLowerCase();
      // Look for email pattern
      const emailMatch = msg.content.match(/[\w.-]+@[\w.-]+\.\w+/);
      if (emailMatch) {
        email = emailMatch[0];
      }
      // Look for name (usually first substantive response)
      if (!name && msg.content.length > 1 && msg.content.length < 50 && !msg.content.includes('@')) {
        name = msg.content.trim();
      }
    }
  }

  // Fallback values
  if (!name) name = 'Unknown';
  if (!email) email = 'not-provided@unknown.com';

  const application: BetaChatApplication = {
    id: `bca_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    email,
    name,
    conversationHistory,
    status: 'applied',
    createdAt: new Date().toISOString(),
  };

  // Try Supabase first
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('beta_chat_applications')
        .insert({
          email: application.email,
          name: application.name,
          conversation_history: application.conversationHistory,
          status: application.status,
        })
        .select()
        .single();

      if (error) {
        console.error('[BetaChatApplicationStore] Supabase insert failed:', error);
        throw error;
      }

      if (data) {
        const saved = rowToApplication(data);
        console.log(`[BetaChatApplicationStore] Application saved to Supabase: ${saved.id}`);

        // Fire notification hook
        const notificationData: BetaApplicationData = {
          id: saved.id,
          email: saved.email,
          name: saved.name,
          conversationHistory: saved.conversationHistory,
          submittedAt: saved.createdAt,
        };
        await onBetaApplicationSubmitted(notificationData);

        return saved;
      }
    } catch (e) {
      console.warn('[BetaChatApplicationStore] Falling back to localStorage');
    }
  }

  // Fallback to localStorage
  initLocal();
  localApplications = [application, ...localApplications];
  persistLocal();

  // Fire notification hook
  const notificationData: BetaApplicationData = {
    id: application.id,
    email: application.email,
    name: application.name,
    conversationHistory: application.conversationHistory,
    submittedAt: application.createdAt,
  };
  await onBetaApplicationSubmitted(notificationData);

  console.log(`[BetaChatApplicationStore] Application saved to localStorage: ${application.id}`);
  return application;
}

/**
 * Get all beta chat applications (admin only - Supabase RLS enforces this)
 */
export async function getAllBetaChatApplications(): Promise<BetaChatApplication[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('beta_chat_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[BetaChatApplicationStore] Supabase fetch failed:', error);
        throw error;
      }

      if (data) {
        return data.map(rowToApplication);
      }
    } catch (e) {
      console.warn('[BetaChatApplicationStore] Falling back to localStorage');
    }
  }

  // Fallback to localStorage
  initLocal();
  return [...localApplications];
}

/**
 * Get applications by status
 */
export async function getBetaChatApplicationsByStatus(
  status: BetaChatApplicationStatus
): Promise<BetaChatApplication[]> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('beta_chat_applications')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) return data.map(rowToApplication);
    } catch (e) {
      console.warn('[BetaChatApplicationStore] Falling back to localStorage');
    }
  }

  initLocal();
  return localApplications.filter(a => a.status === status);
}

/**
 * Get a single application by ID
 */
export async function getBetaChatApplicationById(id: string): Promise<BetaChatApplication | null> {
  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('beta_chat_applications')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      if (data) return rowToApplication(data);
    } catch (e) {
      console.warn('[BetaChatApplicationStore] Falling back to localStorage');
    }
  }

  initLocal();
  return localApplications.find(a => a.id === id) ?? null;
}

/**
 * Approve a beta application
 */
export async function approveBetaApplication(
  id: string,
  reviewerId: string
): Promise<BetaChatApplication | null> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('beta_chat_applications')
        .update({
          status: 'approved',
          reviewed_at: now,
          reviewer_id: reviewerId,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (data) {
        console.log(`[BetaChatApplicationStore] Application approved: ${id}`);
        return rowToApplication(data);
      }
    } catch (e) {
      console.warn('[BetaChatApplicationStore] Falling back to localStorage');
    }
  }

  // Fallback to localStorage
  initLocal();
  const index = localApplications.findIndex(a => a.id === id);
  if (index < 0) return null;

  localApplications[index] = {
    ...localApplications[index],
    status: 'approved',
    reviewedAt: now,
    reviewerId,
  };
  persistLocal();
  return localApplications[index];
}

/**
 * Reject a beta application
 */
export async function rejectBetaApplication(
  id: string,
  reviewerId: string,
  reason?: string
): Promise<BetaChatApplication | null> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('beta_chat_applications')
        .update({
          status: 'rejected',
          reviewed_at: now,
          reviewer_id: reviewerId,
          notes: reason,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (data) return rowToApplication(data);
    } catch (e) {
      console.warn('[BetaChatApplicationStore] Falling back to localStorage');
    }
  }

  initLocal();
  const index = localApplications.findIndex(a => a.id === id);
  if (index < 0) return null;

  localApplications[index] = {
    ...localApplications[index],
    status: 'rejected',
    reviewedAt: now,
    reviewerId,
    notes: reason,
  };
  persistLocal();
  return localApplications[index];
}

/**
 * Mark application as needing a case call
 */
export async function markNeedsCaseCall(
  id: string,
  reviewerId: string
): Promise<BetaChatApplication | null> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured()) {
    try {
      const { data, error } = await supabase
        .from('beta_chat_applications')
        .update({
          status: 'needs_case_call',
          reviewed_at: now,
          reviewer_id: reviewerId,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      if (data) return rowToApplication(data);
    } catch (e) {
      console.warn('[BetaChatApplicationStore] Falling back to localStorage');
    }
  }

  initLocal();
  const index = localApplications.findIndex(a => a.id === id);
  if (index < 0) return null;

  localApplications[index] = {
    ...localApplications[index],
    status: 'needs_case_call',
    reviewedAt: now,
    reviewerId,
  };
  persistLocal();
  return localApplications[index];
}

/**
 * Get application counts by status
 */
export async function getBetaChatApplicationCounts(): Promise<Record<BetaChatApplicationStatus, number>> {
  const apps = await getAllBetaChatApplications();

  const counts: Record<BetaChatApplicationStatus, number> = {
    applied: 0,
    approved: 0,
    rejected: 0,
    needs_case_call: 0,
  };

  for (const app of apps) {
    counts[app.status]++;
  }

  return counts;
}

/**
 * Reset store (for testing)
 */
export function resetBetaChatApplicationStore(): void {
  localApplications = [];
  localInitialized = false;
  localStorage.removeItem(STORAGE_KEY);
}
