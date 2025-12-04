// =============================================================================
// MULTI-TENANT TYPES — Core type definitions for tenant isolation
// =============================================================================
// All tenant-facing operations must use these types to ensure proper isolation.
// Contact spine centrality is maintained through tenantContactZeroId.
// =============================================================================

// =============================================================================
// TENANT MODEL
// =============================================================================

export type TenantStatus = 'TRIAL' | 'ACTIVE' | 'CANCELLED' | 'SUSPENDED';

export interface Tenant {
  tenantId: string;
  name: string;
  createdAt: string;
  status: TenantStatus;
  planName: string;
  ownerUserId: string;           // Platform user ID
  tenantContactZeroId: string;   // Contact ID representing the tenant owner (Contact Zero)
}

// =============================================================================
// TENANT USER MODEL
// =============================================================================

export type TenantRole = 'OWNER' | 'MANAGER' | 'MEMBER' | 'VIEWER';

export type StaffRole = 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE' | 'SUPPORT' | 'NONE';

export interface TenantUser {
  userId: string;          // Auth ID
  tenantId: string;
  contactId: string;       // Contact ID inside tenant graph
  email: string;
  displayName: string;
  tenantRole: TenantRole;
  staffRole: StaffRole;
  createdAt: string;
  lastLoginAt?: string;
  isActive: boolean;
}

// =============================================================================
// USER SCOPE MODEL
// =============================================================================

export interface UserScope {
  userId: string;
  tenantId: string;
  tenantRole: TenantRole;
  staffRole: StaffRole;
  tenantContactZeroId: string;
}

// =============================================================================
// LITTLE LORD EVENT MODEL (Frame Struggle Engine)
// =============================================================================

export type LittleLordEventTopic = 'RELATIONSHIP' | 'LEADERSHIP' | 'BUSINESS' | 'SELF_REGULATION';

export type LittleLordEventPattern = 'RECURRING_STUCK' | 'FRAME_COLLAPSE' | 'NEEDY_BEHAVIOR' | 'AVOIDANCE';

export type LittleLordEventSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface LittleLordEvent {
  id: string;
  tenantId: string;
  userId: string;
  timestamp: string;
  topic: LittleLordEventTopic;
  pattern: LittleLordEventPattern;
  severity: LittleLordEventSeverity;
  summary: string;
}

// =============================================================================
// FRAME HEALTH MODEL
// =============================================================================

export type FrameHealthLevel = 'GREEN' | 'YELLOW' | 'RED';

export interface FrameHealthSnapshot {
  tenantId: string;
  userId: string;
  periodStart: string;
  periodEnd: string;
  taskCompletionRate: number;
  overdueTaskCount: number;
  missedDailyCheckins: number;
  frameScanAverage: number | null;
  littleLordFlags: number;
  repeatedTopics: string[];
  level: FrameHealthLevel;
  reasons: string[];
  computedAt: string;
}

// =============================================================================
// COACHING MODELS
// =============================================================================

export type CoachingCandidateStatus = 
  | 'WATCHING' 
  | 'RECOMMENDED' 
  | 'INVITED' 
  | 'APPLIED' 
  | 'ENROLLED' 
  | 'REJECTED';

export interface CoachingCandidate {
  id: string;
  tenantId: string;
  userId: string;
  status: CoachingCandidateStatus;
  createdAt: string;
  updatedAt: string;
  lastNotificationAt?: string;
  lastFrameHealth: FrameHealthSnapshot;
  reasons: string[];
}

export type CoachingApplicationStatus = 'SUBMITTED' | 'REVIEWED' | 'ACCEPTED' | 'REJECTED';

export interface CoachingApplicationForm {
  name: string;
  email: string;
  businessContext: string;
  frameChallenges: string;
  goals: string;
  commitmentHoursPerWeek?: number;
  incomeBand?: string;
}

export interface CoachingApplicationAiResult {
  score: number;
  recommendation: 'ACCEPT' | 'REVIEW' | 'DECLINE';
  reasoning: string;
  strengthIndicators: string[];
  riskIndicators: string[];
  suggestedNextSteps: string[];
}

export interface CoachingApplication {
  id: string;
  tenantId: string;
  userId: string;
  submittedAt: string;
  status: CoachingApplicationStatus;
  form: CoachingApplicationForm;
  frameHealthSnapshot?: FrameHealthSnapshot;
  aiEvaluation?: CoachingApplicationAiResult;
}

// =============================================================================
// BETA PROGRAM MODELS
// =============================================================================

export type BetaStatus = 'NONE' | 'BETA_ACTIVE' | 'BETA_WARNING' | 'BETA_REVOKED';

export type BetaUsageStatus = 'HEALTHY' | 'WARNING' | 'INACTIVE';

export interface UsageMetrics {
  tenantId: string;
  userId: string;
  windowStart: string;
  windowEnd: string;
  logins: number;
  notesCreated: number;
  tasksCreated: number;
  tasksCompleted: number;
  frameScansRun: number;
  interactionsLogged: number;
}

export interface BetaUserRecord {
  tenantId: string;
  userId: string;
  betaStatus: BetaStatus;
  usageStatus: BetaUsageStatus;
  metrics: UsageMetrics;
  lastWarningAt?: string;
  updatedAt: string;
}

export type BetaApplicationStatus = 'SUBMITTED' | 'APPROVED' | 'DECLINED';

export interface BetaApplicationForm {
  motivation: string;
  expectedUsagePerWeek: number;
  businessContext: string;
  acceptsUseItOrLoseIt: boolean;
}

export interface BetaApplicationAiResult {
  score: number;
  recommendation: 'APPROVE' | 'REVIEW' | 'DECLINE';
  reasoning: string;
  commitmentScore: number;
  fitScore: number;
}

export interface BetaApplication {
  id: string;
  tenantId: string;
  userId: string;
  submittedAt: string;
  status: BetaApplicationStatus;
  form: BetaApplicationForm;
  aiEvaluation?: BetaApplicationAiResult;
}

// =============================================================================
// NOTIFICATION MODELS
// =============================================================================

export type NotificationType =
  | 'COACHING_NUDGE'
  | 'BETA_WARNING'
  | 'BETA_REVOKE'
  | 'TASK_REMINDER'
  | 'GENERAL';

export type NotificationSource = 'SYSTEM' | 'ADMIN' | 'AI';

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  createdAt: string;
  readAt?: string;
  source: NotificationSource;
}

// =============================================================================
// EMAIL PREFERENCES MODEL
// =============================================================================

export interface EmailPreferences {
  productUpdates: boolean;
  onboardingTips: boolean;
  taskReminders: boolean;
  coachingOffers: boolean;
  betaReminders: boolean;
  marketingOffers: boolean;
  surveyRequests: boolean;
}

// =============================================================================
// DATA REQUEST MODELS
// =============================================================================

export type DataRequestType = 'EXPORT' | 'DELETE';

export type DataRequestStatus = 'REQUESTED' | 'IN_PROGRESS' | 'COMPLETED' | 'DECLINED';

export interface DataRequest {
  id: string;
  tenantId: string;
  userId: string;
  type: DataRequestType;
  status: DataRequestStatus;
  requestedAt: string;
  resolvedAt?: string;
  note?: string;
}

// =============================================================================
// AUDIT LOG MODELS
// =============================================================================

export type AdminActionType =
  | 'TENANT_PLAN_CHANGE'
  | 'TENANT_STATUS_CHANGE'
  | 'STAFF_ROLE_CHANGE'
  | 'TENANT_ROLE_CHANGE'
  | 'ACCOUNT_SUSPEND'
  | 'ACCOUNT_UNSUSPEND'
  | 'EMAIL_PREF_CHANGE'
  | 'COACHING_STATUS_CHANGE'
  | 'BETA_STATUS_CHANGE'
  | 'MANUAL_NOTIFICATION'
  | 'DATA_REQUEST_STATUS_CHANGE';

export interface AdminAction {
  id: string;
  timestamp: string;
  actorUserId: string;
  actorStaffRole: StaffRole;
  scopeTenantId?: string;
  targetUserId?: string;
  actionType: AdminActionType;
  metadata?: Record<string, any>;
}

// =============================================================================
// COOKIE CONSENT MODEL
// =============================================================================

export interface CookieConsent {
  accepted: boolean;
  acceptedAt: string;
  version: number;
}

// =============================================================================
// EMAIL DISPATCH TYPES
// =============================================================================

export type ProductEmailType =
  | 'WELCOME'
  | 'ONBOARDING'
  | 'TASK_REMINDER'
  | 'COACHING_NUDGE'
  | 'BETA_WARNING'
  | 'BETA_REVOKE'
  | 'FEATURE_ANNOUNCEMENT';

