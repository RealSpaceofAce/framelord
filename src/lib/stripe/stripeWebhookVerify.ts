// =============================================================================
// STRIPE WEBHOOK VERIFICATION — Server-side only
// =============================================================================
// This module handles webhook signature verification using Node's crypto.
//
// !! SERVER-SIDE ONLY !!
// This module MUST only be imported in server-side code (API routes).
// It uses Node's crypto module which is not available in the browser.
// =============================================================================

/**
 * Get webhook secret from environment
 */
const getWebhookSecret = (): string => {
  return process.env.STRIPE_WEBHOOK_SECRET || '';
};

/**
 * Parse Stripe signature header
 */
const parseSignature = (header: string): [string, string] => {
  const parts = header.split(',');
  let timestamp = '';
  let v1Sig = '';

  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = value;
    if (key === 'v1') v1Sig = value;
  }

  return [timestamp, v1Sig];
};

/**
 * Verify webhook signature
 * Returns the parsed event if valid, null if invalid
 *
 * NOTE: This function uses Node's crypto module and must only be called
 * from server-side code (e.g., Vercel API routes).
 */
export const verifyWebhookSignature = async (
  payload: string,
  signature: string
): Promise<Record<string, unknown> | null> => {
  const webhookSecret = getWebhookSecret();

  if (!webhookSecret) {
    console.warn('[StripeWebhookVerify] No webhook secret configured');
    // In development, allow unverified webhooks
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }

  // Verify signature using Stripe's algorithm
  try {
    const crypto = await import('crypto');
    const [timestamp, v1Sig] = parseSignature(signature);

    const signedPayload = `${timestamp}.${payload}`;
    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(signedPayload)
      .digest('hex');

    if (expectedSig !== v1Sig) {
      console.error('[StripeWebhookVerify] Invalid webhook signature');
      return null;
    }

    return JSON.parse(payload);
  } catch (error) {
    console.error('[StripeWebhookVerify] Webhook verification error:', error);
    return null;
  }
};
