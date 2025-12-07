// =============================================================================
// BETA PROGRAM STORE — Beta user tracking and applications
// =============================================================================
// Manages beta program including usage tracking, warnings, and applications.
// Uses thresholds from appConfig for usage evaluation.
// =============================================================================

import type { 
  BetaUserRecord, 
  BetaStatus, 
  BetaUsageStatus,
  UsageMetrics,
  BetaApplication,
  BetaApplicationStatus,
  BetaApplicationAiResult
} from '../types/multiTenant';
import { betaUsageThresholds } from '../config/appConfig';

const USERS_STORAGE_KEY = 'framelord_beta_users';
const APPLICATIONS_STORAGE_KEY = 'framelord_beta_applications';

// In-memory cache
let betaUsers: BetaUserRecord[] = [];
let applications: BetaApplication[] = [];
let usersInitialized = false;
let applicationsInitialized = false;

// =============================================================================
// INITIALIZATION
// =============================================================================

function initUsers(): void {
  if (usersInitialized) return;
  
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        betaUsers = parsed;
      }
    }
  } catch {
    console.warn('[BetaProgramStore] Failed to load users from localStorage');
  }
  
  usersInitialized = true;
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
    console.warn('[BetaProgramStore] Failed to load applications from localStorage');
  }
  
  applicationsInitialized = true;
}

function persistUsers(): void {
  try {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(betaUsers));
  } catch {
    console.warn('[BetaProgramStore] Failed to persist users to localStorage');
  }
}

function persistApplications(): void {
  try {
    localStorage.setItem(APPLICATIONS_STORAGE_KEY, JSON.stringify(applications));
  } catch {
    console.warn('[BetaProgramStore] Failed to persist applications to localStorage');
  }
}

// =============================================================================
// USAGE METRICS COMPUTATION
// =============================================================================

/**
 * Compute usage status from metrics
 */
export function computeUsageStatus(metrics: UsageMetrics): BetaUsageStatus {
  const thresholds = betaUsageThresholds;
  
  // Check for INACTIVE (no logins in threshold period)
  if (metrics.logins === 0) {
    return 'INACTIVE';
  }
  
  // Check for WARNING level activity
  if (
    metrics.logins < thresholds.warningLoginsPerWeek ||
    metrics.notesCreated < thresholds.warningNotesPerWeek
  ) {
    return 'WARNING';
  }
  
  // Check for HEALTHY level
  if (
    metrics.logins >= thresholds.minLoginsPerWeek &&
    metrics.notesCreated >= thresholds.minNotesPerWeek &&
    metrics.tasksCreated >= thresholds.minTasksPerWeek
  ) {
    return 'HEALTHY';
  }
  
  return 'WARNING';
}

/**
 * Create empty metrics for a time window
 */
export function createEmptyMetrics(
  tenantId: string,
  userId: string
): UsageMetrics {
  const now = new Date();
  const windowStart = new Date(
    now.getTime() - betaUsageThresholds.rollingWindowDays * 24 * 60 * 60 * 1000
  );
  
  return {
    tenantId,
    userId,
    windowStart: windowStart.toISOString(),
    windowEnd: now.toISOString(),
    logins: 0,
    notesCreated: 0,
    tasksCreated: 0,
    tasksCompleted: 0,
    frameScansRun: 0,
    interactionsLogged: 0,
  };
}

// =============================================================================
// BETA USER MANAGEMENT
// =============================================================================

/**
 * Get beta user record
 */
export function getBetaUser(tenantId: string, userId: string): BetaUserRecord | null {
  initUsers();
  return betaUsers.find(u => 
    u.tenantId === tenantId && u.userId === userId
  ) ?? null;
}

/**
 * Create or update beta user record
 */
export function upsertBetaUser(
  tenantId: string,
  userId: string,
  betaStatus: BetaStatus,
  metrics?: UsageMetrics
): BetaUserRecord {
  initUsers();
  
  const existingIndex = betaUsers.findIndex(u => 
    u.tenantId === tenantId && u.userId === userId
  );
  
  const finalMetrics = metrics ?? createEmptyMetrics(tenantId, userId);
  const usageStatus = computeUsageStatus(finalMetrics);
  
  const record: BetaUserRecord = {
    tenantId,
    userId,
    betaStatus,
    usageStatus,
    metrics: finalMetrics,
    updatedAt: new Date().toISOString(),
  };
  
  if (existingIndex >= 0) {
    // Preserve lastWarningAt if exists
    record.lastWarningAt = betaUsers[existingIndex].lastWarningAt;
    betaUsers[existingIndex] = record;
  } else {
    betaUsers = [record, ...betaUsers];
  }
  
  persistUsers();
  return record;
}

/**
 * Update beta user metrics
 */
export function updateBetaUserMetrics(
  tenantId: string,
  userId: string,
  metrics: UsageMetrics
): BetaUserRecord | null {
  initUsers();
  
  const index = betaUsers.findIndex(u => 
    u.tenantId === tenantId && u.userId === userId
  );
  
  if (index < 0) return null;
  
  const usageStatus = computeUsageStatus(metrics);
  
  betaUsers[index] = {
    ...betaUsers[index],
    metrics,
    usageStatus,
    updatedAt: new Date().toISOString(),
  };
  
  // Check if should send warning
  if (usageStatus === 'WARNING' || usageStatus === 'INACTIVE') {
    checkAndSendBetaWarning(betaUsers[index]);
  }
  
  persistUsers();
  return betaUsers[index];
}

/**
 * Change beta status
 */
export function changeBetaStatus(
  tenantId: string,
  userId: string,
  newStatus: BetaStatus
): BetaUserRecord | null {
  initUsers();
  
  const index = betaUsers.findIndex(u => 
    u.tenantId === tenantId && u.userId === userId
  );
  
  if (index < 0) return null;
  
  betaUsers[index] = {
    ...betaUsers[index],
    betaStatus: newStatus,
    updatedAt: new Date().toISOString(),
  };
  
  persistUsers();
  
  // BACKEND TODO: Record in audit log
  // BACKEND TODO: Send notification
  console.log('[BetaProgramStore] Beta status changed:', userId, newStatus);
  
  return betaUsers[index];
}

/**
 * Check and send beta warning if needed
 */
function checkAndSendBetaWarning(user: BetaUserRecord): void {
  const thresholds = betaUsageThresholds;
  
  // Don't warn if already revoked
  if (user.betaStatus === 'BETA_REVOKED') return;
  
  // Check if enough time since last warning
  if (user.lastWarningAt) {
    const lastWarning = new Date(user.lastWarningAt).getTime();
    const now = Date.now();
    const daysSinceWarning = (now - lastWarning) / (24 * 60 * 60 * 1000);
    
    if (daysSinceWarning < thresholds.daysBetweenWarnings) {
      return; // Too soon for another warning
    }
  }
  
  // Update status to WARNING if not already
  if (user.betaStatus === 'BETA_ACTIVE') {
    const index = betaUsers.findIndex(u => 
      u.tenantId === user.tenantId && u.userId === user.userId
    );
    
    if (index >= 0) {
      betaUsers[index] = {
        ...betaUsers[index],
        betaStatus: 'BETA_WARNING',
        lastWarningAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      persistUsers();
      
      // BACKEND TODO: Send warning notification
      // BACKEND TODO: Send warning email
      console.log('[BetaProgramStore] BACKEND STUB: sendBetaWarning', user.userId);
    }
  }
}

/**
 * Extend beta for a user (Platform Admin)
 */
export function extendBeta(
  tenantId: string,
  userId: string
): BetaUserRecord | null {
  return changeBetaStatus(tenantId, userId, 'BETA_ACTIVE');
}

/**
 * Revoke beta for a user (Platform Admin)
 */
export function revokeBeta(
  tenantId: string,
  userId: string
): BetaUserRecord | null {
  const result = changeBetaStatus(tenantId, userId, 'BETA_REVOKED');
  
  // BACKEND TODO: Send revocation email
  console.log('[BetaProgramStore] BACKEND STUB: sendBetaRevocationEmail', userId);
  
  return result;
}

/**
 * Send manual beta nudge (Platform Admin)
 */
export function sendManualBetaNudge(tenantId: string, userId: string): boolean {
  const user = getBetaUser(tenantId, userId);
  if (!user) return false;
  
  // Update last warning time
  const index = betaUsers.findIndex(u => 
    u.tenantId === tenantId && u.userId === userId
  );
  
  if (index >= 0) {
    betaUsers[index] = {
      ...betaUsers[index],
      lastWarningAt: new Date().toISOString(),
    };
    persistUsers();
  }
  
  // BACKEND TODO: Send notification
  // BACKEND TODO: Send email
  console.log('[BetaProgramStore] BACKEND STUB: sendManualBetaNudge', userId);
  
  return true;
}

// =============================================================================
// BETA APPLICATIONS
// =============================================================================

/**
 * Submit beta application
 */
export function submitBetaApplication(
  application: Omit<BetaApplication, 'id' | 'submittedAt' | 'status'>
): BetaApplication {
  initApplications();
  
  const app: BetaApplication = {
    id: `ba_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    submittedAt: new Date().toISOString(),
    status: 'SUBMITTED',
    ...application,
  };
  
  applications = [app, ...applications];
  persistApplications();
  
  // BACKEND TODO: Send confirmation email
  // BACKEND TODO: Trigger AI evaluation
  console.log('[BetaProgramStore] Application submitted:', app.id);
  
  return app;
}

/**
 * Get beta application by ID
 */
export function getBetaApplicationById(id: string): BetaApplication | null {
  initApplications();
  return applications.find(a => a.id === id) ?? null;
}

/**
 * Get beta applications for a user
 */
export function getBetaApplicationsForUser(
  tenantId: string,
  userId: string
): BetaApplication[] {
  initApplications();
  return applications.filter(a => 
    a.tenantId === tenantId && a.userId === userId
  );
}

/**
 * Update beta application status
 */
export function updateBetaApplicationStatus(
  id: string,
  status: BetaApplicationStatus
): BetaApplication | null {
  initApplications();
  
  const index = applications.findIndex(a => a.id === id);
  if (index < 0) return null;
  
  applications[index] = {
    ...applications[index],
    status,
  };
  persistApplications();
  
  // If approved, create beta user record
  if (status === 'APPROVED') {
    const app = applications[index];
    upsertBetaUser(app.tenantId, app.userId, 'BETA_ACTIVE');
  }
  
  // BACKEND TODO: Record in audit log
  // BACKEND TODO: Send notification email
  console.log('[BetaProgramStore] Application status updated:', id, status);
  
  return applications[index];
}

/**
 * Add AI evaluation to application
 * BACKEND STUB: This would call AI service
 */
export function evaluateBetaApplicationStub(
  app: BetaApplication
): BetaApplicationAiResult | null {
  // BACKEND TODO: Call AI service with application data
  // BACKEND TODO: Use config/beta_program_ai.json for prompt
  console.log('[BetaProgramStore] BACKEND STUB: evaluateBetaApplication', app.id);
  
  // Return mock result for development
  return {
    score: 80,
    recommendation: 'APPROVE',
    reasoning: 'Strong motivation and clear use case. Good fit for beta program.',
    commitmentScore: 85,
    fitScore: 75,
  };
}

// =============================================================================
// QUERY OPERATIONS
// =============================================================================

/**
 * Get all beta users (Platform Admin)
 */
export function getAllBetaUsers(): BetaUserRecord[] {
  initUsers();
  return [...betaUsers];
}

/**
 * Get beta users for a tenant
 */
export function getBetaUsersForTenant(tenantId: string): BetaUserRecord[] {
  initUsers();
  return betaUsers.filter(u => u.tenantId === tenantId);
}

/**
 * Get active beta users
 */
export function getActiveBetaUsers(): BetaUserRecord[] {
  initUsers();
  return betaUsers.filter(u => u.betaStatus === 'BETA_ACTIVE');
}

/**
 * Get beta users with warnings
 */
export function getBetaUsersWithWarnings(): BetaUserRecord[] {
  initUsers();
  return betaUsers.filter(u => u.betaStatus === 'BETA_WARNING');
}

/**
 * Get all beta applications (Platform Admin)
 */
export function getAllBetaApplications(): BetaApplication[] {
  initApplications();
  return [...applications];
}

/**
 * Get applications by status
 */
export function getBetaApplicationsByStatus(
  status: BetaApplicationStatus
): BetaApplication[] {
  initApplications();
  return applications.filter(a => a.status === status);
}

// =============================================================================
// STATUS HELPERS
// =============================================================================

export function getBetaStatusLabel(status: BetaStatus): string {
  const labels: Record<BetaStatus, string> = {
    NONE: 'Not in Beta',
    BETA_ACTIVE: 'Active',
    BETA_WARNING: 'Warning',
    BETA_REVOKED: 'Revoked',
  };
  return labels[status];
}

export function getUsageStatusLabel(status: BetaUsageStatus): string {
  const labels: Record<BetaUsageStatus, string> = {
    HEALTHY: 'Healthy',
    WARNING: 'Low Usage',
    INACTIVE: 'Inactive',
  };
  return labels[status];
}

export function getBetaApplicationStatusLabel(status: BetaApplicationStatus): string {
  const labels: Record<BetaApplicationStatus, string> = {
    SUBMITTED: 'Submitted',
    APPROVED: 'Approved',
    DECLINED: 'Declined',
  };
  return labels[status];
}

// =============================================================================
// RESET (TESTING ONLY)
// =============================================================================

export function resetBetaProgramStore(): void {
  betaUsers = [];
  applications = [];
  usersInitialized = false;
  applicationsInitialized = false;
  localStorage.removeItem(USERS_STORAGE_KEY);
  localStorage.removeItem(APPLICATIONS_STORAGE_KEY);
}







