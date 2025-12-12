// =============================================================================
// EMAIL CLIENT — SendGrid email service wrapper
// =============================================================================
// Thin wrapper around SendGrid for transactional emails.
//
// !! SERVER-SIDE ONLY !!
// This module MUST only be imported in server-side code.
// It uses SendGrid API keys from environment variables.
//
// All send operations are wrapped to:
// 1. Check if email is enabled
// 2. Gracefully handle errors (log, don't crash)
// 3. Return consistent result objects
// =============================================================================

import { getSendGridConfig, isServerRuntime, isEmailEnabled } from '../../config/notificationConfig';
import { addLogEntry } from '../../services/systemLogStore';

// =============================================================================
// TYPES
// =============================================================================

export interface EmailSendParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
  replyTo?: string;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider: 'sendgrid' | 'stub';
  timestamp: string;
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Log email send attempt to system log
 */
const logEmailAttempt = (
  to: string,
  subject: string,
  result: EmailSendResult
): void => {
  addLogEntry({
    type: 'system',
    title: result.success ? 'Email Sent' : 'Email Failed',
    message: result.success
      ? `Email "${subject}" sent to ${to}`
      : `Failed to send "${subject}" to ${to}: ${result.error}`,
    isRead: false,
    severity: result.success ? 'info' : 'warning',
    source: 'system',
  });
};

// =============================================================================
// MAIN EMAIL FUNCTIONS
// =============================================================================

/**
 * Send an email using SendGrid
 *
 * Safe to call from anywhere - will gracefully degrade if:
 * - Called from client-side (returns stub result)
 * - Email is disabled (returns stub result)
 * - SendGrid fails (catches error, returns failure result)
 */
export const sendEmail = async (params: EmailSendParams): Promise<EmailSendResult> => {
  const timestamp = new Date().toISOString();

  // Guard: Server-side only
  if (!isServerRuntime()) {
    console.warn('[EmailClient] sendEmail called from client-side. Returning stub.');
    return {
      success: false,
      error: 'Email sending only available server-side',
      provider: 'stub',
      timestamp,
    };
  }

  // Guard: Check if email is enabled
  if (!isEmailEnabled()) {
    console.log('[EmailClient] Email disabled. Logging stub send:', params.subject);
    return {
      success: true,
      messageId: `stub-${Date.now()}`,
      provider: 'stub',
      timestamp,
    };
  }

  const config = getSendGridConfig();

  try {
    // Dynamic import to avoid bundling in client code
    const sgMail = (await import('@sendgrid/mail')).default;
    sgMail.setApiKey(config.apiKey);

    const msg: any = {
      to: params.to,
      from: {
        email: config.fromEmail,
        name: config.fromName,
      },
      subject: params.subject,
      html: params.html,
    };

    // Add optional fields
    if (params.text) {
      msg.text = params.text;
    }
    if (params.replyTo) {
      msg.replyTo = params.replyTo;
    }
    if (params.templateId) {
      msg.templateId = params.templateId;
      msg.dynamicTemplateData = params.dynamicTemplateData || {};
    }

    const [response] = await sgMail.send(msg);
    const messageId = (response.headers['x-message-id'] as string) || `sg-${Date.now()}`;

    const result: EmailSendResult = {
      success: true,
      messageId,
      provider: 'sendgrid',
      timestamp,
    };

    logEmailAttempt(params.to, params.subject, result);
    console.log(`[EmailClient] Email sent successfully: ${messageId}`);

    return result;
  } catch (error: any) {
    const errorMessage =
      error?.response?.body?.errors?.[0]?.message ||
      error?.message ||
      'Unknown SendGrid error';

    const result: EmailSendResult = {
      success: false,
      error: errorMessage,
      provider: 'sendgrid',
      timestamp,
    };

    logEmailAttempt(params.to, params.subject, result);
    console.error('[EmailClient] SendGrid error:', errorMessage);

    return result;
  }
};

/**
 * Send email using a SendGrid dynamic template
 */
export const sendTemplateEmail = async (
  to: string,
  templateId: string,
  dynamicTemplateData: Record<string, any>,
  options?: { replyTo?: string }
): Promise<EmailSendResult> => {
  const timestamp = new Date().toISOString();

  // Guard: Server-side only
  if (!isServerRuntime()) {
    console.warn('[EmailClient] sendTemplateEmail called from client-side. Returning stub.');
    return {
      success: false,
      error: 'Email sending only available server-side',
      provider: 'stub',
      timestamp,
    };
  }

  // Guard: Check if email is enabled
  if (!isEmailEnabled()) {
    console.log('[EmailClient] Email disabled. Logging stub template send:', templateId);
    return {
      success: true,
      messageId: `stub-template-${Date.now()}`,
      provider: 'stub',
      timestamp,
    };
  }

  const config = getSendGridConfig();

  try {
    const sgMail = (await import('@sendgrid/mail')).default;
    sgMail.setApiKey(config.apiKey);

    const msg: any = {
      to,
      from: {
        email: config.fromEmail,
        name: config.fromName,
      },
      templateId,
      dynamicTemplateData,
    };

    if (options?.replyTo) {
      msg.replyTo = options.replyTo;
    }

    const [response] = await sgMail.send(msg);
    const messageId = (response.headers['x-message-id'] as string) || `sg-${Date.now()}`;

    const result: EmailSendResult = {
      success: true,
      messageId,
      provider: 'sendgrid',
      timestamp,
    };

    console.log(`[EmailClient] Template email sent successfully: ${messageId}`);

    return result;
  } catch (error: any) {
    const errorMessage =
      error?.response?.body?.errors?.[0]?.message ||
      error?.message ||
      'Unknown SendGrid error';

    console.error('[EmailClient] SendGrid template error:', errorMessage);

    return {
      success: false,
      error: errorMessage,
      provider: 'sendgrid',
      timestamp,
    };
  }
};

/**
 * Verify SendGrid configuration is valid
 * Useful for health checks
 */
export const verifyEmailConfig = (): { valid: boolean; issues: string[] } => {
  const issues: string[] = [];

  if (!isServerRuntime()) {
    issues.push('Not running server-side');
    return { valid: false, issues };
  }

  const config = getSendGridConfig();

  if (!config.apiKey) {
    issues.push('SENDGRID_API_KEY not set');
  } else if (config.apiKey.length < 20) {
    issues.push('SENDGRID_API_KEY appears invalid (too short)');
  }

  if (!config.fromEmail) {
    issues.push('SENDGRID_FROM_EMAIL not set');
  } else if (!config.fromEmail.includes('@')) {
    issues.push('SENDGRID_FROM_EMAIL appears invalid');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
};
