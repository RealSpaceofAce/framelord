// =============================================================================
// SMS CLIENT — Twilio SMS service wrapper
// =============================================================================
// Thin wrapper around Twilio for SMS notifications.
//
// !! SERVER-SIDE ONLY !!
// This module MUST only be imported in server-side code.
// It uses Twilio credentials from environment variables.
//
// Uses Twilio REST API directly (no SDK required).
// All send operations are wrapped to:
// 1. Check if SMS is enabled
// 2. Check contact's smsOptIn status
// 3. Gracefully handle errors (log, don't crash)
// 4. Return consistent result objects
// =============================================================================

import { getTwilioConfig, isServerRuntime, isSmsEnabled } from '../../config/notificationConfig';
import { addLogEntry } from '../../services/systemLogStore';

// =============================================================================
// TYPES
// =============================================================================

export interface SmsSendParams {
  to: string; // E.164 format: +1234567890
  body: string; // Max 1600 characters (concatenated messages)
}

export interface SmsSendResult {
  success: boolean;
  sid?: string; // Twilio Message SID
  error?: string;
  provider: 'twilio' | 'stub';
  timestamp: string;
}

export interface SmsContact {
  phone?: string;
  phoneNumber?: string; // Alias for phone
  smsOptIn?: boolean;
}

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Log SMS send attempt to system log
 */
const logSmsAttempt = (
  to: string,
  result: SmsSendResult
): void => {
  // Mask phone number for privacy
  const maskedPhone = to.slice(0, 4) + '****' + to.slice(-2);

  addLogEntry({
    type: 'system',
    title: result.success ? 'SMS Sent' : 'SMS Failed',
    message: result.success
      ? `SMS sent to ${maskedPhone}`
      : `Failed to send SMS to ${maskedPhone}: ${result.error}`,
    isRead: false,
    severity: result.success ? 'info' : 'warning',
    source: 'system',
  });
};

/**
 * Validate E.164 phone number format
 */
const isValidE164 = (phone: string): boolean => {
  return /^\+[1-9]\d{1,14}$/.test(phone);
};

/**
 * Normalize phone number to E.164 format
 * Attempts to add +1 prefix for US numbers if missing
 */
export const normalizePhoneNumber = (phone: string): string | null => {
  // Remove all non-digit characters except leading +
  let cleaned = phone.replace(/[^\d+]/g, '');

  // Already E.164 format
  if (cleaned.startsWith('+') && isValidE164(cleaned)) {
    return cleaned;
  }

  // US number without country code (10 digits)
  if (cleaned.length === 10 && !cleaned.startsWith('+')) {
    return `+1${cleaned}`;
  }

  // US number with 1 prefix but no +
  if (cleaned.length === 11 && cleaned.startsWith('1')) {
    return `+${cleaned}`;
  }

  // If starts with 00, replace with +
  if (cleaned.startsWith('00')) {
    cleaned = '+' + cleaned.slice(2);
    if (isValidE164(cleaned)) {
      return cleaned;
    }
  }

  // Can't normalize
  return null;
};

// =============================================================================
// MAIN SMS FUNCTIONS
// =============================================================================

/**
 * Send an SMS using Twilio REST API
 *
 * Safe to call from anywhere - will gracefully degrade if:
 * - Called from client-side (returns stub result)
 * - SMS is disabled (returns stub result)
 * - Twilio fails (catches error, returns failure result)
 */
export const sendSms = async (params: SmsSendParams): Promise<SmsSendResult> => {
  const timestamp = new Date().toISOString();

  // Guard: Server-side only
  if (!isServerRuntime()) {
    console.warn('[SmsClient] sendSms called from client-side. Returning stub.');
    return {
      success: false,
      error: 'SMS sending only available server-side',
      provider: 'stub',
      timestamp,
    };
  }

  // Guard: Check if SMS is enabled
  if (!isSmsEnabled()) {
    console.log('[SmsClient] SMS disabled. Logging stub send to:', params.to.slice(0, 4) + '****');
    return {
      success: true,
      sid: `stub-${Date.now()}`,
      provider: 'stub',
      timestamp,
    };
  }

  // Validate phone number
  const normalizedPhone = normalizePhoneNumber(params.to);
  if (!normalizedPhone) {
    const result: SmsSendResult = {
      success: false,
      error: `Invalid phone number format: ${params.to}`,
      provider: 'twilio',
      timestamp,
    };
    logSmsAttempt(params.to, result);
    return result;
  }

  // Validate message length
  if (params.body.length > 1600) {
    const result: SmsSendResult = {
      success: false,
      error: 'Message exceeds 1600 character limit',
      provider: 'twilio',
      timestamp,
    };
    logSmsAttempt(normalizedPhone, result);
    return result;
  }

  const config = getTwilioConfig();

  try {
    // Use Twilio REST API directly
    const authString = Buffer.from(`${config.accountSid}:${config.authToken}`).toString('base64');

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: normalizedPhone,
          From: config.fromNumber,
          Body: params.body,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.message || data.error_message || 'Twilio API error';
      const result: SmsSendResult = {
        success: false,
        error: errorMessage,
        provider: 'twilio',
        timestamp,
      };
      logSmsAttempt(normalizedPhone, result);
      console.error('[SmsClient] Twilio error:', errorMessage);
      return result;
    }

    const result: SmsSendResult = {
      success: true,
      sid: data.sid,
      provider: 'twilio',
      timestamp,
    };

    logSmsAttempt(normalizedPhone, result);
    console.log(`[SmsClient] SMS sent successfully: ${data.sid}`);

    return result;
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown Twilio error';
    const result: SmsSendResult = {
      success: false,
      error: errorMessage,
      provider: 'twilio',
      timestamp,
    };

    logSmsAttempt(normalizedPhone, result);
    console.error('[SmsClient] Twilio error:', errorMessage);

    return result;
  }
};

/**
 * Send SMS to a contact, respecting opt-in status
 */
export const sendSmsToContact = async (
  contact: SmsContact,
  body: string
): Promise<SmsSendResult> => {
  const timestamp = new Date().toISOString();

  // Check opt-in status
  if (!contact.smsOptIn) {
    console.log('[SmsClient] Contact has not opted in to SMS. Skipping.');
    return {
      success: false,
      error: 'Contact has not opted in to SMS',
      provider: 'stub',
      timestamp,
    };
  }

  // Check phone number exists (support both phone and phoneNumber)
  const phoneNumber = contact.phone || contact.phoneNumber;
  if (!phoneNumber) {
    console.log('[SmsClient] Contact has no phone number. Skipping.');
    return {
      success: false,
      error: 'Contact has no phone number',
      provider: 'stub',
      timestamp,
    };
  }

  return sendSms({
    to: phoneNumber,
    body,
  });
};

/**
 * Verify Twilio configuration is valid
 * Useful for health checks
 */
export const verifySmsConfig = (): { valid: boolean; issues: string[] } => {
  const issues: string[] = [];

  if (!isServerRuntime()) {
    issues.push('Not running server-side');
    return { valid: false, issues };
  }

  const config = getTwilioConfig();

  if (!config.accountSid) {
    issues.push('TWILIO_ACCOUNT_SID not set');
  } else if (!config.accountSid.startsWith('AC')) {
    issues.push('TWILIO_ACCOUNT_SID appears invalid (should start with AC)');
  }

  if (!config.authToken) {
    issues.push('TWILIO_AUTH_TOKEN not set');
  }

  if (!config.fromNumber) {
    issues.push('TWILIO_FROM_NUMBER not set');
  } else if (!isValidE164(config.fromNumber)) {
    issues.push('TWILIO_FROM_NUMBER should be in E.164 format (+1234567890)');
  }

  return {
    valid: issues.length === 0,
    issues,
  };
};
