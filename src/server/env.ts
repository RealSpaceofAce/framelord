// =============================================================================
// SERVER-SIDE ENVIRONMENT CONFIGURATION
// =============================================================================
// !! SECURITY WARNING !!
// This file MUST ONLY be imported from server-side code (Node.js runtime).
// DO NOT import this file from any Vite/React client-side code.
//
// These environment variables should be set in your server runtime:
// - EMAIL_ENABLED           = "true" or "false"
// - SENDGRID_API_KEY        = your SendGrid API key
// - INTAKE_NOTIFY_EMAIL     = admin notification email address
// - EMAIL_FROM_ADDRESS      = verified sender address in SendGrid
// =============================================================================

/**
 * Whether email sending is enabled.
 * Set to "true" in server runtime to enable SendGrid integration.
 */
export const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';

/**
 * SendGrid API key.
 * NEVER expose this in client-side code or VITE_* variables.
 */
export const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';

/**
 * Admin email address to receive intake notifications.
 */
export const INTAKE_NOTIFY_EMAIL = process.env.INTAKE_NOTIFY_EMAIL || '';

/**
 * Email "from" address - must be a verified sender in SendGrid.
 */
export const EMAIL_FROM_ADDRESS =
  process.env.EMAIL_FROM_ADDRESS || 'FrameLord Intake <no-reply@framelord.app>';

/**
 * Check if email configuration is complete and valid.
 */
export const isEmailConfigured = (): boolean => {
  return Boolean(SENDGRID_API_KEY && INTAKE_NOTIFY_EMAIL);
};

/**
 * Runtime check to ensure this code is running server-side.
 * Returns true if we're in a Node.js environment.
 */
export const isServerRuntime = (): boolean => {
  return typeof window === 'undefined' && typeof process !== 'undefined';
};
