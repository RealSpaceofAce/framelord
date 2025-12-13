// =============================================================================
// TWILIO SMS — Send SMS via Vercel serverless
// =============================================================================
// Endpoint: POST https://www.framelord.com/api/twilio-sms
// =============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

// =============================================================================
// CONFIGURATION
// =============================================================================

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_FROM_NUMBER = process.env.TWILIO_PHONE_NUMBER || process.env.TWILIO_FROM_NUMBER || '';

// =============================================================================
// TYPES
// =============================================================================

interface SmsRequest {
  to: string;      // E.164 format: +1234567890
  body: string;    // Max 1600 characters
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Validate E.164 phone number format
 */
function isValidE164(phone: string): boolean {
  return /^\+[1-9]\d{1,14}$/.test(phone);
}

/**
 * Normalize phone number to E.164 format
 */
function normalizePhoneNumber(phone: string): string | null {
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

  // Can't normalize
  return null;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Check Twilio is configured
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_FROM_NUMBER) {
    res.status(500).json({ error: 'Twilio not configured' });
    return;
  }

  const body = req.body as SmsRequest;
  const { to, body: messageBody } = body;

  // Validate required fields
  if (!to || !messageBody) {
    res.status(400).json({ error: 'Missing required fields: to, body' });
    return;
  }

  // Normalize phone number
  const normalizedTo = normalizePhoneNumber(to);
  if (!normalizedTo) {
    res.status(400).json({ error: `Invalid phone number format: ${to}` });
    return;
  }

  // Validate message length
  if (messageBody.length > 1600) {
    res.status(400).json({ error: 'Message exceeds 1600 character limit' });
    return;
  }

  try {
    // Send via Twilio REST API
    const authString = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${authString}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: normalizedTo,
          From: TWILIO_FROM_NUMBER,
          Body: messageBody,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.message || data.error_message || 'Twilio API error';
      console.error('[Twilio] API error:', errorMessage);
      res.status(response.status).json({ error: errorMessage });
      return;
    }

    // Mask phone for logging
    const maskedPhone = normalizedTo.slice(0, 4) + '****' + normalizedTo.slice(-2);
    console.log('[Twilio] SMS sent:', { to: maskedPhone, sid: data.sid });

    res.status(200).json({
      success: true,
      sid: data.sid,
    });
  } catch (error: any) {
    console.error('[Twilio] Error:', error);
    res.status(500).json({ error: error?.message || 'Internal error' });
  }
}
