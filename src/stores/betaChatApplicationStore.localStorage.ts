// =============================================================================
// BETA CHAT APPLICATION STORE — Chat-based beta application storage
// =============================================================================
// Stores chat-based beta applications from the BetaPage component.
// Different from applicationStore.ts which uses form-based applications.
// =============================================================================

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
  timestamp: number;
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

// =============================================================================
// STORAGE
// =============================================================================

const STORAGE_KEY = 'framelord_beta_chat_applications';

let applications: BetaChatApplication[] = [];
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
    console.warn('[BetaChatApplicationStore] Failed to load applications');
  }

  initialized = true;
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(applications));
  } catch {
    console.warn('[BetaChatApplicationStore] Failed to persist applications');
  }
}

// =============================================================================
// EXTRACTION HELPERS
// =============================================================================

/**
 * Extract name from conversation if provided
 */
function extractNameFromConversation(history: ChatMessage[]): string {
  // Look for user messages that might contain their name
  for (const msg of history) {
    if (msg.role === 'user') {
      // Check for patterns like "My name is X" or "I'm X"
      const namePatterns = [
        /my name is\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
        /i'm\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
        /i am\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
        /call me\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)/i,
      ];

      for (const pattern of namePatterns) {
        const match = msg.content.match(pattern);
        if (match && match[1]) {
          return match[1].trim();
        }
      }
    }
  }

  return 'Unknown';
}

/**
 * Extract email from conversation if provided
 */
function extractEmailFromConversation(history: ChatMessage[]): string {
  for (const msg of history) {
    if (msg.role === 'user') {
      const emailPattern = /[\w.-]+@[\w.-]+\.\w+/;
      const match = msg.content.match(emailPattern);
      if (match) {
        return match[0].toLowerCase();
      }
    }
  }

  return 'unknown@unknown.com';
}

// =============================================================================
// PUBLIC API
// =============================================================================

/**
 * Submit a chat-based beta application
 */
export async function submitBetaChatApplication(
  conversationHistory: ChatMessage[]
): Promise<BetaChatApplication> {
  init();

  const id = `bca_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const name = extractNameFromConversation(conversationHistory);
  const email = extractEmailFromConversation(conversationHistory);

  const application: BetaChatApplication = {
    id,
    email,
    name,
    conversationHistory,
    status: 'applied',
    createdAt: new Date().toISOString(),
  };

  applications = [application, ...applications];
  persist();

  // Send admin notification
  const notificationData: BetaApplicationData = {
    id,
    email,
    name,
    conversationHistory: conversationHistory.map(m => ({
      role: m.role,
      content: m.content,
    })),
    submittedAt: application.createdAt,
  };

  await onBetaApplicationSubmitted(notificationData);

  console.log(`[BetaChatApplicationStore] Application submitted: ${id}`);

  return application;
}

/**
 * Get all chat-based beta applications
 */
export function getAllBetaChatApplications(): BetaChatApplication[] {
  init();
  return [...applications];
}

/**
 * Get a single application by ID
 */
export function getBetaChatApplicationById(id: string): BetaChatApplication | null {
  init();
  return applications.find(a => a.id === id) ?? null;
}

/**
 * Get applications by status
 */
export function getBetaChatApplicationsByStatus(
  status: BetaChatApplicationStatus
): BetaChatApplication[] {
  init();
  return applications.filter(a => a.status === status);
}

/**
 * Update application status (for admin approval flow)
 */
export function updateBetaChatApplicationStatus(
  id: string,
  status: BetaChatApplicationStatus,
  reviewerId?: string,
  notes?: string
): BetaChatApplication | null {
  init();

  const index = applications.findIndex(a => a.id === id);
  if (index < 0) return null;

  applications[index] = {
    ...applications[index],
    status,
    reviewedAt: new Date().toISOString(),
    reviewerId,
    notes: notes ?? applications[index].notes,
  };

  persist();

  return applications[index];
}

/**
 * Approve a beta application and create user account
 * Returns the updated application
 */
export async function approveBetaApplication(
  id: string,
  reviewerId: string,
  notes?: string
): Promise<BetaChatApplication | null> {
  const application = updateBetaChatApplicationStatus(id, 'approved', reviewerId, notes);

  if (!application) {
    return null;
  }

  // TODO: Create Supabase auth user and send invite email
  // For now, just log that this would happen
  console.log('[BetaChatApplicationStore] BACKEND TODO: Create user account and send invite email', {
    email: application.email,
    name: application.name,
  });

  return application;
}

/**
 * Mark application as needing a case call
 */
export function markNeedsCaseCall(
  id: string,
  reviewerId: string,
  notes?: string
): BetaChatApplication | null {
  return updateBetaChatApplicationStatus(id, 'needs_case_call', reviewerId, notes);
}

/**
 * Reject a beta application
 */
export function rejectBetaApplication(
  id: string,
  reviewerId: string,
  notes?: string
): BetaChatApplication | null {
  return updateBetaChatApplicationStatus(id, 'rejected', reviewerId, notes);
}

/**
 * Get application count by status
 */
export function getBetaChatApplicationCounts(): Record<BetaChatApplicationStatus, number> {
  init();

  const counts: Record<BetaChatApplicationStatus, number> = {
    applied: 0,
    approved: 0,
    rejected: 0,
    needs_case_call: 0,
  };

  for (const app of applications) {
    counts[app.status]++;
  }

  return counts;
}

/**
 * Reset store (for testing)
 */
export function resetBetaChatApplicationStore(): void {
  applications = [];
  initialized = false;
  localStorage.removeItem(STORAGE_KEY);
}
