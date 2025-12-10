// =============================================================================
// TELEMETRY SERVICE — Event tracking stubs for analytics
// =============================================================================
// Stub implementation for analytics and event tracking.
// All events are logged to console in development.
//
// TODO: Connect to analytics provider (Mixpanel, Amplitude, PostHog)
// TODO: Add server-side event forwarding for critical events
// TODO: Implement user identification and session tracking
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

export type TelemetryEventName =
  // FrameScan Events
  | 'framescan_started'
  | 'framescan_completed'
  | 'framescan_failed'
  | 'framescan_result_viewed'
  // Little Lord Events
  | 'littlelord_opened'
  | 'littlelord_closed'
  | 'littlelord_message_sent'
  | 'littlelord_suggestion_accepted'
  | 'littlelord_suggestion_rejected'
  // Upsell Events
  | 'upsell_trigger_fired'
  | 'upsell_dismissed'
  | 'upsell_cta_clicked'
  // Credit Events
  | 'credits_used'
  | 'credits_purchased'
  | 'credits_low_warning'
  // Navigation Events
  | 'page_viewed'
  | 'feature_accessed'
  | 'legal_page_viewed'
  // User Events
  | 'user_signed_up'
  | 'user_logged_in'
  | 'user_logged_out'
  | 'user_profile_updated'
  // Error Events
  | 'error_occurred'
  | 'api_error';

export interface TelemetryEvent {
  name: TelemetryEventName;
  timestamp: string;
  properties?: Record<string, unknown>;
  userId?: string;
  sessionId?: string;
}

export interface TelemetryConfig {
  /** Whether telemetry is enabled */
  enabled: boolean;
  /** Whether to log events to console */
  debugMode: boolean;
  /** User ID for event attribution */
  userId?: string;
  /** Session ID for session tracking */
  sessionId?: string;
  /** Custom properties to include with all events */
  globalProperties?: Record<string, unknown>;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

let config: TelemetryConfig = {
  enabled: true,
  debugMode: import.meta.env.DEV,
  sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
};

/**
 * Initialize telemetry with user context.
 */
export const initTelemetry = (userId?: string, globalProps?: Record<string, unknown>): void => {
  config.userId = userId;
  config.globalProperties = globalProps;

  if (config.debugMode) {
    console.log('[Telemetry] Initialized', { userId, sessionId: config.sessionId });
  }
};

/**
 * Update telemetry configuration.
 */
export const setTelemetryConfig = (newConfig: Partial<TelemetryConfig>): void => {
  config = { ...config, ...newConfig };
};

/**
 * Disable telemetry (for privacy/testing).
 */
export const disableTelemetry = (): void => {
  config.enabled = false;
};

/**
 * Enable telemetry.
 */
export const enableTelemetry = (): void => {
  config.enabled = true;
};

// =============================================================================
// EVENT QUEUE (for batching)
// =============================================================================

let eventQueue: TelemetryEvent[] = [];
const MAX_QUEUE_SIZE = 50;

/**
 * Get queued events (for debugging or manual flush).
 */
export const getEventQueue = (): TelemetryEvent[] => [...eventQueue];

/**
 * Clear event queue.
 */
export const clearEventQueue = (): void => {
  eventQueue = [];
};

// =============================================================================
// CORE TRACKING
// =============================================================================

/**
 * Track a telemetry event.
 * This is the core function - all other track functions call this.
 */
export const trackEvent = (
  name: TelemetryEventName,
  properties?: Record<string, unknown>
): void => {
  if (!config.enabled) return;

  const event: TelemetryEvent = {
    name,
    timestamp: new Date().toISOString(),
    properties: {
      ...config.globalProperties,
      ...properties,
    },
    userId: config.userId,
    sessionId: config.sessionId,
  };

  // Add to queue
  eventQueue.push(event);
  if (eventQueue.length > MAX_QUEUE_SIZE) {
    eventQueue.shift(); // Remove oldest event
  }

  // Log in debug mode
  if (config.debugMode) {
    console.log(`[Telemetry] ${name}`, properties || {});
  }

  // TODO: Send to analytics provider
  // sendToAnalyticsProvider(event);
};

// =============================================================================
// FRAMESCAN EVENTS
// =============================================================================

/**
 * Track FrameScan started.
 */
export const trackFrameScanStarted = (
  modality: 'text' | 'image',
  domain?: string,
  tier?: 'basic' | 'detailed'
): void => {
  trackEvent('framescan_started', { modality, domain, tier });
};

/**
 * Track FrameScan completed.
 */
export const trackFrameScanCompleted = (
  modality: 'text' | 'image',
  frameScore: number,
  domain?: string,
  durationMs?: number
): void => {
  trackEvent('framescan_completed', {
    modality,
    frameScore,
    domain,
    durationMs,
    scoreRange: frameScore < 40 ? 'low' : frameScore < 70 ? 'medium' : 'high',
  });
};

/**
 * Track FrameScan failed.
 */
export const trackFrameScanFailed = (
  modality: 'text' | 'image',
  errorType: string,
  errorMessage?: string
): void => {
  trackEvent('framescan_failed', { modality, errorType, errorMessage });
};

// =============================================================================
// LITTLE LORD EVENTS
// =============================================================================

/**
 * Track Little Lord opened.
 */
export const trackLittleLordOpened = (viewId?: string): void => {
  trackEvent('littlelord_opened', { viewId });
};

/**
 * Track Little Lord closed.
 */
export const trackLittleLordClosed = (
  messagesExchanged: number,
  sessionDurationMs: number
): void => {
  trackEvent('littlelord_closed', { messagesExchanged, sessionDurationMs });
};

/**
 * Track Little Lord message sent.
 */
export const trackLittleLordMessageSent = (messageLength: number): void => {
  trackEvent('littlelord_message_sent', { messageLength });
};

// =============================================================================
// UPSELL EVENTS
// =============================================================================

/**
 * Track upsell trigger fired.
 */
export const trackUpsellTriggerFired = (
  triggerType: string,
  priority: string,
  metadata?: Record<string, unknown>
): void => {
  trackEvent('upsell_trigger_fired', { triggerType, priority, ...metadata });
};

/**
 * Track upsell dismissed.
 */
export const trackUpsellDismissed = (
  triggerType: string,
  triggerId: string
): void => {
  trackEvent('upsell_dismissed', { triggerType, triggerId });
};

/**
 * Track upsell CTA clicked.
 */
export const trackUpsellCtaClicked = (
  triggerType: string,
  ctaAction: string
): void => {
  trackEvent('upsell_cta_clicked', { triggerType, ctaAction });
};

// =============================================================================
// CREDIT EVENTS
// =============================================================================

/**
 * Track credits used.
 */
export const trackCreditsUsed = (
  amount: number,
  purpose: string,
  remaining: number
): void => {
  trackEvent('credits_used', { amount, purpose, remaining });
};

/**
 * Track credits purchased.
 */
export const trackCreditsPurchased = (
  packageId: string,
  credits: number,
  priceInCents: number
): void => {
  trackEvent('credits_purchased', { packageId, credits, priceInCents });
};

// =============================================================================
// NAVIGATION EVENTS
// =============================================================================

/**
 * Track page viewed.
 */
export const trackPageViewed = (pageName: string, properties?: Record<string, unknown>): void => {
  trackEvent('page_viewed', { pageName, ...properties });
};

/**
 * Track legal page viewed.
 */
export const trackLegalPageViewed = (pageType: 'terms' | 'privacy' | 'acceptable-use' | 'dpa'): void => {
  trackEvent('legal_page_viewed', { pageType });
};

/**
 * Track feature accessed.
 */
export const trackFeatureAccessed = (featureName: string, properties?: Record<string, unknown>): void => {
  trackEvent('feature_accessed', { featureName, ...properties });
};

// =============================================================================
// ERROR EVENTS
// =============================================================================

/**
 * Track error occurred.
 */
export const trackError = (
  errorType: string,
  errorMessage: string,
  context?: Record<string, unknown>
): void => {
  trackEvent('error_occurred', { errorType, errorMessage, ...context });
};

/**
 * Track API error.
 */
export const trackApiError = (
  endpoint: string,
  statusCode: number,
  errorMessage?: string
): void => {
  trackEvent('api_error', { endpoint, statusCode, errorMessage });
};
