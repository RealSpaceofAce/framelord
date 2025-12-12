// =============================================================================
// NOTIFICATION CONFIG — Environment and feature flag configuration
// =============================================================================
// Central configuration for SendGrid (email) and Twilio (SMS) notifications.
//
// !! SECURITY WARNING !!
// This file reads sensitive API keys from environment variables.
// It MUST only be imported in server-side code (API routes, server functions).
// NEVER import this file in client-side React components.
//
// To verify you're server-side: typeof window === 'undefined'
// =============================================================================

// =============================================================================
// ENVIRONMENT DETECTION
// =============================================================================

/**
 * Check if code is running server-side
 */
export const isServerRuntime = (): boolean => {
  return typeof window === 'undefined' && typeof process !== 'undefined';
};

/**
 * Check if we're in development mode
 */
export const isDevelopment = (): boolean => {
  if (!isServerRuntime()) return true; // Assume dev if client-side
  return process.env.NODE_ENV === 'development';
};

// =============================================================================
// SENDGRID CONFIGURATION
// =============================================================================

export interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName: string;
  enabled: boolean;
}

/**
 * Get SendGrid configuration from environment
 * Returns safe defaults if keys are missing
 */
export const getSendGridConfig = (): SendGridConfig => {
  if (!isServerRuntime()) {
    console.warn('[NotificationConfig] getSendGridConfig called from client-side. Returning disabled config.');
    return {
      apiKey: '',
      fromEmail: '',
      fromName: 'FrameLord',
      enabled: false,
    };
  }

  const apiKey = process.env.SENDGRID_API_KEY || '';
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@framelord.app';
  const fromName = process.env.SENDGRID_FROM_NAME || 'FrameLord';

  // Email is enabled only if API key is present
  const enabled = Boolean(apiKey) && apiKey.length > 10;

  return {
    apiKey,
    fromEmail,
    fromName,
    enabled,
  };
};

// =============================================================================
// TWILIO CONFIGURATION
// =============================================================================

export interface TwilioConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
  enabled: boolean;
}

/**
 * Get Twilio configuration from environment
 * Returns safe defaults if keys are missing
 */
export const getTwilioConfig = (): TwilioConfig => {
  if (!isServerRuntime()) {
    console.warn('[NotificationConfig] getTwilioConfig called from client-side. Returning disabled config.');
    return {
      accountSid: '',
      authToken: '',
      fromNumber: '',
      enabled: false,
    };
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
  const authToken = process.env.TWILIO_AUTH_TOKEN || '';
  const fromNumber = process.env.TWILIO_FROM_NUMBER || '';

  // SMS is enabled only if all credentials are present
  const enabled = Boolean(accountSid) && Boolean(authToken) && Boolean(fromNumber);

  return {
    accountSid,
    authToken,
    fromNumber,
    enabled,
  };
};

// =============================================================================
// GLOBAL NOTIFICATION FEATURE FLAGS
// =============================================================================

export interface NotificationFlags {
  /** Master switch for all notifications */
  notificationsEnabled: boolean;
  /** Email notifications via SendGrid */
  emailEnabled: boolean;
  /** SMS notifications via Twilio */
  smsEnabled: boolean;
  /** In-app notifications (always available) */
  inAppEnabled: boolean;
  /** Log all notification attempts for debugging */
  logNotifications: boolean;
}

/**
 * Get notification feature flags
 * Combines environment checks with manual overrides
 */
export const getNotificationFlags = (): NotificationFlags => {
  // In development without keys, notifications are "enabled" but providers are stubbed
  const isDev = isDevelopment();

  const sendGridConfig = getSendGridConfig();
  const twilioConfig = getTwilioConfig();

  // Master switch - can be disabled via env var
  const masterEnabled = isServerRuntime()
    ? process.env.NOTIFICATIONS_ENABLED !== 'false'
    : false;

  return {
    notificationsEnabled: masterEnabled,
    emailEnabled: masterEnabled && sendGridConfig.enabled,
    smsEnabled: masterEnabled && twilioConfig.enabled,
    inAppEnabled: true, // Always available
    logNotifications: isDev || process.env.LOG_NOTIFICATIONS === 'true',
  };
};

// =============================================================================
// CONVENIENCE GETTERS
// =============================================================================

/**
 * Check if email notifications are available
 */
export const isEmailEnabled = (): boolean => {
  return getNotificationFlags().emailEnabled;
};

/**
 * Check if SMS notifications are available
 */
export const isSmsEnabled = (): boolean => {
  return getNotificationFlags().smsEnabled;
};

/**
 * Check if any notifications are enabled
 */
export const isNotificationsEnabled = (): boolean => {
  return getNotificationFlags().notificationsEnabled;
};

// =============================================================================
// ENVIRONMENT VARIABLE REFERENCE
// =============================================================================

/**
 * Required environment variables for full notification support:
 *
 * SendGrid (Email):
 * - SENDGRID_API_KEY: Your SendGrid API key
 * - SENDGRID_FROM_EMAIL: Verified sender email address
 * - SENDGRID_FROM_NAME: Sender display name (optional, defaults to "FrameLord")
 *
 * Twilio (SMS):
 * - TWILIO_ACCOUNT_SID: Your Twilio Account SID
 * - TWILIO_AUTH_TOKEN: Your Twilio Auth Token
 * - TWILIO_FROM_NUMBER: Your Twilio phone number (E.164 format)
 *
 * Optional:
 * - NOTIFICATIONS_ENABLED: Set to "false" to disable all notifications
 * - LOG_NOTIFICATIONS: Set to "true" to log all notification attempts
 */
export const REQUIRED_ENV_VARS = {
  sendgrid: ['SENDGRID_API_KEY', 'SENDGRID_FROM_EMAIL'],
  twilio: ['TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN', 'TWILIO_FROM_NUMBER'],
  optional: ['NOTIFICATIONS_ENABLED', 'LOG_NOTIFICATIONS', 'SENDGRID_FROM_NAME'],
} as const;

/**
 * Log current notification configuration (safe for logging, no secrets)
 */
export const logNotificationConfig = (): void => {
  if (!isServerRuntime()) {
    console.log('[NotificationConfig] Client-side - notifications disabled');
    return;
  }

  const flags = getNotificationFlags();
  console.log('[NotificationConfig] Current configuration:');
  console.log('  Notifications enabled:', flags.notificationsEnabled);
  console.log('  Email enabled:', flags.emailEnabled);
  console.log('  SMS enabled:', flags.smsEnabled);
  console.log('  In-app enabled:', flags.inAppEnabled);
  console.log('  Log notifications:', flags.logNotifications);
};
