// =============================================================================
// APP CONFIG — Feature flags, thresholds, and configuration
// =============================================================================
// Controls which advanced features are enabled in the app.
// All frame health, beta, and coaching thresholds are centralized here.
// During development, most flags are true. In production, some may be false.
// =============================================================================

// =============================================================================
// FEATURE FLAGS
// =============================================================================

export interface FeatureFlags {
  /** Enable advanced API key settings in Settings → Integrations */
  enableAdvancedApiSettings: boolean;
  /** Enable public scan gating (one free scan per browser) */
  enablePublicScanGate: boolean;
  /** Enable dev-only routes like /dev/frame-report-demo */
  enableDevRoutes: boolean;
  /** Enable coaching upsell system */
  enableCoachingUpsell: boolean;
  /** Enable beta program tracking */
  enableBetaProgram: boolean;
  /** Enable platform admin portal */
  enablePlatformAdmin: boolean;
  /** Enable tenant admin portal */
  enableTenantAdmin: boolean;
}

export const featureFlags: FeatureFlags = {
  enableAdvancedApiSettings: true,
  enablePublicScanGate: true,
  // SECURITY: Dev routes should only be enabled in development
  enableDevRoutes: import.meta.env.DEV,
  enableCoachingUpsell: true,
  enableBetaProgram: true,
  enablePlatformAdmin: true,
  enableTenantAdmin: true,
};

// =============================================================================
// FRAME HEALTH THRESHOLDS
// =============================================================================

export interface FrameHealthThresholds {
  /** Rolling window in days for frame health computation */
  rollingWindowDays: number;
  
  // Task completion thresholds
  taskCompletionRateYellow: number;  // Below this → YELLOW
  taskCompletionRateRed: number;     // Below this → RED
  
  // Overdue task thresholds
  overdueTaskCountYellow: number;    // Above this → YELLOW
  overdueTaskCountRed: number;       // Above this → RED
  
  // Missed daily checkins thresholds
  missedCheckinsYellow: number;      // Above this → YELLOW
  missedCheckinsRed: number;         // Above this → RED
  
  // Frame scan average thresholds
  frameScanAverageYellow: number;    // Below this → YELLOW
  frameScanAverageRed: number;       // Below this → RED
  
  // Little Lord flags thresholds
  littleLordFlagsYellow: number;     // Above this → YELLOW
  littleLordFlagsRed: number;        // Above this → RED
  
  // Repeated topics threshold (same topic appearing multiple times)
  repeatedTopicsThreshold: number;
}

export const frameHealthThresholds: FrameHealthThresholds = {
  rollingWindowDays: 14,
  
  taskCompletionRateYellow: 0.7,   // 70%
  taskCompletionRateRed: 0.4,      // 40%
  
  overdueTaskCountYellow: 3,
  overdueTaskCountRed: 7,
  
  missedCheckinsYellow: 3,
  missedCheckinsRed: 7,
  
  frameScanAverageYellow: 50,
  frameScanAverageRed: 30,
  
  littleLordFlagsYellow: 2,
  littleLordFlagsRed: 5,
  
  repeatedTopicsThreshold: 3,
};

// =============================================================================
// BETA PROGRAM THRESHOLDS
// =============================================================================

export interface BetaUsageThresholds {
  /** Rolling window in days for usage computation */
  rollingWindowDays: number;
  
  // Minimum activity thresholds for HEALTHY status
  minLoginsPerWeek: number;
  minNotesPerWeek: number;
  minTasksPerWeek: number;
  minFrameScansPerWeek: number;
  
  // Warning thresholds (below this triggers WARNING)
  warningLoginsPerWeek: number;
  warningNotesPerWeek: number;
  
  // Days of inactivity before INACTIVE status
  inactiveDaysThreshold: number;
  
  // Days between beta warnings
  daysBetweenWarnings: number;
  
  // Max warnings before revocation
  maxWarningsBeforeRevoke: number;
}

export const betaUsageThresholds: BetaUsageThresholds = {
  rollingWindowDays: 7,
  
  minLoginsPerWeek: 3,
  minNotesPerWeek: 5,
  minTasksPerWeek: 3,
  minFrameScansPerWeek: 1,
  
  warningLoginsPerWeek: 1,
  warningNotesPerWeek: 2,
  
  inactiveDaysThreshold: 14,
  daysBetweenWarnings: 7,
  maxWarningsBeforeRevoke: 3,
};

// =============================================================================
// COACHING UPSELL THRESHOLDS
// =============================================================================

export interface CoachingThresholds {
  /** Days to watch before recommending */
  watchPeriodDays: number;
  
  /** Minimum RED flags to trigger recommendation */
  minRedFlagsForRecommendation: number;
  
  /** Days between coaching nudges */
  daysBetweenNudges: number;
  
  /** Max nudges before stopping */
  maxNudges: number;
}

export const coachingThresholds: CoachingThresholds = {
  watchPeriodDays: 7,
  minRedFlagsForRecommendation: 2,
  daysBetweenNudges: 7,
  maxNudges: 3,
};

// =============================================================================
// COOKIE CONSENT CONFIG
// =============================================================================

export const cookieConsentConfig = {
  currentVersion: 1,
  storageKey: 'framelord_cookie_consent',
};

// =============================================================================
// SUPER ADMIN CONFIG
// =============================================================================

/**
 * IMPORTANT: This is the ONLY Super Admin user ID.
 * This must be enforced at all times.
 * No one can demote or modify this user's SUPER_ADMIN role.
 */
export const SUPER_ADMIN_USER_ID = 'super_admin_owner';

// =============================================================================
// COMBINED APP CONFIG (Legacy compatibility)
// =============================================================================

export interface AppConfig {
  enableAdvancedApiSettings: boolean;
  enablePublicScanGate: boolean;
  enableDevRoutes: boolean;
}

export const appConfig: AppConfig = {
  enableAdvancedApiSettings: featureFlags.enableAdvancedApiSettings,
  enablePublicScanGate: featureFlags.enablePublicScanGate,
  enableDevRoutes: featureFlags.enableDevRoutes,
};

// =============================================================================
// HELPER TO GET ALL CONFIG
// =============================================================================

export function getAllConfig() {
  return {
    featureFlags,
    frameHealthThresholds,
    betaUsageThresholds,
    coachingThresholds,
    cookieConsentConfig,
    SUPER_ADMIN_USER_ID,
  };
}
