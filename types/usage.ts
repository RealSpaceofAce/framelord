// =============================================================================
// USAGE TYPES — Derived metrics for admin dashboards
// =============================================================================
// These types represent aggregated usage data at global, tenant, and user levels.
// They are populated by selector functions that derive from existing stores.
// =============================================================================

/**
 * Global usage summary across all tenants and users
 * Used by Super Admin to monitor platform-wide metrics
 */
export interface GlobalUsageSummary {
  totalFrameCreditsToday: number;
  totalFrameCreditsThisWeek: number;
  totalFrameCreditsThisMonth: number;
  byActionType: Record<string, number>; // textScan, imageScan, audioMinutes, littleLordMessages, canvasEvents
  averageCostPerUser: number;
  peakUsageHours: Array<{ hour: number; credits: number }>;
  errorRateBlockedScans: number;
  totalTranscriptionMinutes: number;
  totalImageScans: number;
  totalInitialFrameScores: number;
  totalActiveUsers: number;
  totalActiveTenants: number;
}

/**
 * Distribution bin for frame score histogram
 */
export interface FrameScoreDistributionBin {
  rangeLabel: string; // "0-20", "21-40", "41-60", "61-80", "81-100"
  count: number;
  percentage: number;
}

/**
 * Global frame score analytics
 * Shows distribution and trends across the platform
 */
export interface GlobalFrameScoreAnalytics {
  averageFrameScore: number;
  medianFrameScore: number;
  bins: FrameScoreDistributionBin[];
  trendOverTime: Array<{ date: string; averageScore: number; scanCount: number }>;
  totalScansProcessed: number;
  improvementRate: number; // Percentage of users showing score improvement
}

/**
 * Tenant-level usage summary
 * Used by Super Admin to monitor individual tenant metrics
 */
export interface TenantUsageSummary {
  tenantId: string;
  tenantName: string;
  seats: number;
  activeUsers: number;
  creditsAllocated: number;
  creditsConsumed: number;
  creditsByActionType: Record<string, number>;
  averageFrameScore: number;
  struggleIndexCount: number; // Users flagged as struggling
  congruencyAverage: number;
  highUsageUserIds: string[];
  lastActivityAt: string | null;
  createdAt: string;
  planName: string;
}

/**
 * Trajectory direction for trends
 */
export type Trajectory = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';

/**
 * User-level usage summary
 * Used by both Super Admin and Tenant Admin to monitor individual users
 */
export interface UserUsageSummary {
  tenantId: string;
  userId: string;
  userName: string;
  email: string;
  creditsRemaining: number;
  creditsConsumed: number;
  creditsByCategory: Record<string, number>;
  frameScoreHistory: Array<{ date: string; score: number }>;
  congruencyTrend: Trajectory;
  struggleIndex: number;
  firstFrameScore: number | null;
  currentFrameScore: number | null;
  recentScanCount: number;
  lastScanAt: string | null;
  trajectory: Trajectory;
  isActive: boolean;
}

/**
 * Action types for credit consumption tracking
 */
export type UsageActionType = 
  | 'textScan'
  | 'imageScan'
  | 'audioMinutes'
  | 'littleLordMessages'
  | 'canvasEvents'
  | 'initialFrameScore'
  | 'transcription';

/**
 * Credit costs per action type (configurable)
 */
export const CREDIT_COSTS: Record<UsageActionType, number> = {
  textScan: 1,
  imageScan: 2,
  audioMinutes: 5, // per minute
  littleLordMessages: 0.5,
  canvasEvents: 0.1,
  initialFrameScore: 3,
  transcription: 10, // per minute
};

/**
 * Broadcast notification scope
 */
export type BroadcastScope = 'GLOBAL' | 'TENANT' | 'USER';

/**
 * Broadcast notification for admin-initiated messages
 */
export interface BroadcastNotification {
  id: string;
  scope: BroadcastScope;
  tenantId: string | null; // null for GLOBAL
  userId: string | null; // null for GLOBAL or TENANT
  title: string;
  body: string;
  createdAt: string;
  createdBy: string; // Admin user ID who sent it
  deliveredCount: number;
  readCount: number;
}




