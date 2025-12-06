// =============================================================================
// FRAME SCAN THROTTLING — Client-side rate limiting for FrameScan calls
// =============================================================================
// This module provides simple in-memory session throttling for FrameScan.
// It limits the number of scans per browser session to prevent abuse.
//
// NOTE: For production, this should be mirrored with server-side throttling
// that enforces user-level limits tied to accounts, plans, and billing.
// The client-side throttle here is a first line of defense and UX hint only.
// =============================================================================

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Configuration for FrameScan throttling.
 */
export interface FrameThrottleConfig {
  /** Maximum number of scans allowed per session */
  maxScansPerSession: number;
}

/**
 * Default throttle configuration.
 * Can be overridden in function calls or via future config system.
 */
const DEFAULT_CONFIG: FrameThrottleConfig = {
  maxScansPerSession: 50, // Reasonable limit for development/free tier
};

// =============================================================================
// SESSION STATE
// =============================================================================

/** Current scan count for this session (resets on page reload) */
let scanCount = 0;

/** Timestamp of the first scan in this session */
let sessionStartTime: number | null = null;

// =============================================================================
// THROTTLE FUNCTIONS
// =============================================================================

/**
 * Increment the scan count after a successful scan.
 * Call this after each FrameScan completes.
 */
export function incrementScanCount(): void {
  if (sessionStartTime === null) {
    sessionStartTime = Date.now();
  }
  scanCount += 1;
}

/**
 * Get the current scan count for this session.
 */
export function getScanCount(): number {
  return scanCount;
}

/**
 * Get the number of remaining scans before hitting the limit.
 */
export function getRemainingScanCount(config: FrameThrottleConfig = DEFAULT_CONFIG): number {
  return Math.max(0, config.maxScansPerSession - scanCount);
}

/**
 * Check if another scan is allowed under the current throttle limits.
 *
 * @param config - Optional custom throttle config
 * @returns true if a scan can be performed, false if limit reached
 */
export function canRunAnotherScan(config: FrameThrottleConfig = DEFAULT_CONFIG): boolean {
  return scanCount < config.maxScansPerSession;
}

/**
 * Get the current throttle configuration.
 */
export function getThrottleConfig(): FrameThrottleConfig {
  return { ...DEFAULT_CONFIG };
}

/**
 * Get session statistics for display in UI.
 */
export function getSessionStats(): {
  scanCount: number;
  maxScans: number;
  remaining: number;
  sessionStartTime: number | null;
  sessionDurationMs: number;
} {
  const config = DEFAULT_CONFIG;
  return {
    scanCount,
    maxScans: config.maxScansPerSession,
    remaining: getRemainingScanCount(config),
    sessionStartTime,
    sessionDurationMs: sessionStartTime ? Date.now() - sessionStartTime : 0,
  };
}

/**
 * Reset the throttle state.
 * Primarily for testing - in production, session resets naturally on page reload.
 */
export function resetThrottle(): void {
  scanCount = 0;
  sessionStartTime = null;
}

/**
 * Check throttle and throw if limit exceeded.
 * Convenience function for use at the start of scan functions.
 *
 * @throws Error if the scan limit has been reached
 */
export function enforceThrottle(config: FrameThrottleConfig = DEFAULT_CONFIG): void {
  if (!canRunAnotherScan(config)) {
    throw new Error(
      `Frame scan limit reached for this session (${config.maxScansPerSession} scans). ` +
        "Please wait or upgrade your plan."
    );
  }
}






