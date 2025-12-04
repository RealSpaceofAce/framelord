// =============================================================================
// COACHING STORE — Coaching candidates and applications
// =============================================================================
// Manages coaching upsell flow including candidate tracking, applications,
// and nudge notifications.
// =============================================================================

import type { 
  CoachingCandidate, 
  CoachingCandidateStatus,
  CoachingApplication,
  CoachingApplicationStatus,
  CoachingApplicationAiResult,
  FrameHealthSnapshot 
} from '../types/multiTenant';
import { coachingThresholds } from '../config/appConfig';
import { onFrameHealthChange } from './frameHealthStore';

const CANDIDATES_STORAGE_KEY = 'framelord_coaching_candidates';
const APPLICATIONS_STORAGE_KEY = 'framelord_coaching_applications';

// In-memory cache
let candidates: CoachingCandidate[] = [];
let applications: CoachingApplication[] = [];
let candidatesInitialized = false;
let applicationsInitialized = false;

// =============================================================================
// INITIALIZATION
// =============================================================================

function initCandidates(): void {
  if (candidatesInitialized) return;
  
  try {
    const stored = localStorage.getItem(CANDIDATES_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        candidates = parsed;
      }
    }
  } catch {
    console.warn('[CoachingStore] Failed to load candidates from localStorage');
  }
  
  candidatesInitialized = true;
}

function initApplications(): void {
  if (applicationsInitialized) return;
  
  try {
    const stored = localStorage.getItem(APPLICATIONS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        applications = parsed;
      }
    }
  } catch {
    console.warn('[CoachingStore] Failed to load applications from localStorage');
  }
  
  applicationsInitialized = true;
}

function persistCandidates(): void {
  try {
    localStorage.setItem(CANDIDATES_STORAGE_KEY, JSON.stringify(candidates));
  } catch {
    console.warn('[CoachingStore] Failed to persist candidates to localStorage');
  }
}

function persistApplications(): void {
  try {
    localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(applications));
  } catch {
    console.warn('[CoachingStore] Failed to persist applications to localStorage');
  }
}

// =============================================================================
// FRAME HEALTH LISTENER
// =============================================================================

/**
 * Initialize coaching candidate updates on frame health changes
 */
export function initCoachingHealthListener(): () => void {
  return onFrameHealthChange((snapshot) => {
    handleFrameHealthChange(snapshot);
  });
}

/**
 * Handle frame health change for coaching candidate logic
 */
function handleFrameHealthChange(snapshot: FrameHealthSnapshot): void {
  if (snapshot.level === 'GREEN') {
    // User is healthy, no action needed
    return;
  }
  
  // Get or create candidate
  let candidate = getCoachingCandidate(snapshot.tenantId, snapshot.userId);
  
  if (!candidate) {
    // Create new candidate in WATCHING status
    candidate = createCoachingCandidate(snapshot.tenantId, snapshot.userId, snapshot);
  } else {
    // Update existing candidate
    updateCoachingCandidate(candidate.id, {
      lastFrameHealth: snapshot,
      reasons: snapshot.reasons,
    });
  }
  
  // Check if should recommend coaching
  if (snapshot.level === 'RED' && candidate.status === 'WATCHING') {
    // Promote to RECOMMENDED and send nudge
    updateCoachingCandidateStatus(candidate.id, 'RECOMMENDED');
    sendCoachingNudge(candidate);
  }
}

// =============================================================================
// COACHING CANDIDATES
// =============================================================================

/**
 * Create a coaching candidate
 */
export function createCoachingCandidate(
  tenantId: string,
  userId: string,
  frameHealth: FrameHealthSnapshot
): CoachingCandidate {
  initCandidates();
  
  const candidate: CoachingCandidate = {
    id: `cc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    tenantId,
    userId,
    status: 'WATCHING',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastFrameHealth: frameHealth,
    reasons: frameHealth.reasons,
  };
  
  candidates = [candidate, ...candidates];
  persistCandidates();
  
  return candidate;
}

/**
 * Get coaching candidate
 */
export function getCoachingCandidate(
  tenantId: string,
  userId: string
): CoachingCandidate | null {
  initCandidates();
  return candidates.find(c => 
    c.tenantId === tenantId && c.userId === userId
  ) ?? null;
}

/**
 * Get coaching candidate by ID
 */
export function getCoachingCandidateById(id: string): CoachingCandidate | null {
  initCandidates();
  return candidates.find(c => c.id === id) ?? null;
}

/**
 * Update coaching candidate
 */
export function updateCoachingCandidate(
  id: string,
  updates: Partial<Pick<CoachingCandidate, 'lastFrameHealth' | 'reasons' | 'lastNotificationAt'>>
): CoachingCandidate | null {
  initCandidates();
  
  const index = candidates.findIndex(c => c.id === id);
  if (index < 0) return null;
  
  candidates[index] = {
    ...candidates[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  persistCandidates();
  
  return candidates[index];
}

/**
 * Update coaching candidate status
 */
export function updateCoachingCandidateStatus(
  id: string,
  status: CoachingCandidateStatus
): CoachingCandidate | null {
  initCandidates();
  
  const index = candidates.findIndex(c => c.id === id);
  if (index < 0) return null;
  
  candidates[index] = {
    ...candidates[index],
    status,
    updatedAt: new Date().toISOString(),
  };
  persistCandidates();
  
  // BACKEND TODO: Record status change in audit log
  console.log('[CoachingStore] BACKEND STUB: updateCoachingCandidateStatus', id, status);
  
  return candidates[index];
}

/**
 * Send coaching nudge
 */
function sendCoachingNudge(candidate: CoachingCandidate): void {
  // Update last notification time
  updateCoachingCandidate(candidate.id, {
    lastNotificationAt: new Date().toISOString(),
  });
  
  // BACKEND TODO: Send in-app notification
  // BACKEND TODO: Send email if preferences allow
  console.log('[CoachingStore] BACKEND STUB: sendCoachingNudge', candidate.userId);
}

/**
 * Manually send coaching nudge (Platform Admin)
 */
export function sendManualCoachingNudge(candidateId: string): boolean {
  const candidate = getCoachingCandidateById(candidateId);
  if (!candidate) return false;
  
  sendCoachingNudge(candidate);
  return true;
}

// =============================================================================
// COACHING APPLICATIONS
// =============================================================================

/**
 * Submit coaching application
 */
export function submitCoachingApplication(
  application: Omit<CoachingApplication, 'id' | 'submittedAt' | 'status'>
): CoachingApplication {
  initApplications();
  
  const app: CoachingApplication = {
    id: `ca_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    submittedAt: new Date().toISOString(),
    status: 'SUBMITTED',
    ...application,
  };
  
  applications = [app, ...applications];
  persistApplications();
  
  // Update candidate status if exists
  const candidate = getCoachingCandidate(app.tenantId, app.userId);
  if (candidate) {
    updateCoachingCandidateStatus(candidate.id, 'APPLIED');
  }
  
  // BACKEND TODO: Send confirmation email
  // BACKEND TODO: Trigger AI evaluation
  console.log('[CoachingStore] Application submitted:', app.id);
  
  return app;
}

/**
 * Get coaching application by ID
 */
export function getCoachingApplicationById(id: string): CoachingApplication | null {
  initApplications();
  return applications.find(a => a.id === id) ?? null;
}

/**
 * Get coaching applications for a user
 */
export function getCoachingApplicationsForUser(
  tenantId: string,
  userId: string
): CoachingApplication[] {
  initApplications();
  return applications.filter(a => 
    a.tenantId === tenantId && a.userId === userId
  );
}

/**
 * Update coaching application status
 */
export function updateCoachingApplicationStatus(
  id: string,
  status: CoachingApplicationStatus
): CoachingApplication | null {
  initApplications();
  
  const index = applications.findIndex(a => a.id === id);
  if (index < 0) return null;
  
  applications[index] = {
    ...applications[index],
    status,
  };
  persistApplications();
  
  // Update candidate status
  const app = applications[index];
  const candidate = getCoachingCandidate(app.tenantId, app.userId);
  if (candidate) {
    if (status === 'ACCEPTED') {
      updateCoachingCandidateStatus(candidate.id, 'ENROLLED');
    } else if (status === 'REJECTED') {
      updateCoachingCandidateStatus(candidate.id, 'REJECTED');
    }
  }
  
  // BACKEND TODO: Record in audit log
  // BACKEND TODO: Send notification email
  console.log('[CoachingStore] Application status updated:', id, status);
  
  return applications[index];
}

/**
 * Add AI evaluation to application
 * BACKEND STUB: This would call AI service
 */
export function evaluateCoachingApplicationStub(
  app: CoachingApplication
): CoachingApplicationAiResult | null {
  // BACKEND TODO: Call AI service with application data
  // BACKEND TODO: Use config/coaching_application_ai.json for prompt
  console.log('[CoachingStore] BACKEND STUB: evaluateCoachingApplication', app.id);
  
  // Return mock result for development
  return {
    score: 75,
    recommendation: 'REVIEW',
    reasoning: 'Application shows moderate fit. Manual review recommended.',
    strengthIndicators: [
      'Clear business context',
      'Specific frame challenges identified',
    ],
    riskIndicators: [
      'Limited commitment hours',
    ],
    suggestedNextSteps: [
      'Schedule discovery call',
      'Assess coaching readiness',
    ],
  };
}

// =============================================================================
// QUERY OPERATIONS
// =============================================================================

/**
 * Get all coaching candidates for a tenant
 */
export function getCoachingCandidatesForTenant(tenantId: string): CoachingCandidate[] {
  initCandidates();
  return candidates.filter(c => c.tenantId === tenantId);
}

/**
 * Get all coaching candidates (Platform Admin)
 */
export function getAllCoachingCandidates(): CoachingCandidate[] {
  initCandidates();
  return [...candidates];
}

/**
 * Get candidates by status
 */
export function getCandidatesByStatus(status: CoachingCandidateStatus): CoachingCandidate[] {
  initCandidates();
  return candidates.filter(c => c.status === status);
}

/**
 * Get all coaching applications (Platform Admin)
 */
export function getAllCoachingApplications(): CoachingApplication[] {
  initApplications();
  return [...applications];
}

/**
 * Get applications by status
 */
export function getApplicationsByStatus(
  status: CoachingApplicationStatus
): CoachingApplication[] {
  initApplications();
  return applications.filter(a => a.status === status);
}

// =============================================================================
// STATUS HELPERS
// =============================================================================

export function getCandidateStatusLabel(status: CoachingCandidateStatus): string {
  const labels: Record<CoachingCandidateStatus, string> = {
    WATCHING: 'Watching',
    RECOMMENDED: 'Recommended',
    INVITED: 'Invited',
    APPLIED: 'Applied',
    ENROLLED: 'Enrolled',
    REJECTED: 'Rejected',
  };
  return labels[status];
}

export function getApplicationStatusLabel(status: CoachingApplicationStatus): string {
  const labels: Record<CoachingApplicationStatus, string> = {
    SUBMITTED: 'Submitted',
    REVIEWED: 'Reviewed',
    ACCEPTED: 'Accepted',
    REJECTED: 'Rejected',
  };
  return labels[status];
}

// =============================================================================
// RESET (TESTING ONLY)
// =============================================================================

export function resetCoachingStore(): void {
  candidates = [];
  applications = [];
  candidatesInitialized = false;
  applicationsInitialized = false;
  localStorage.removeItem(CANDIDATES_STORAGE_KEY);
  localStorage.removeItem(APPLICATIONS_STORAGE_KEY);
}

