// =============================================================================
// STRIPE CUSTOMER PORTAL — Create portal sessions via Vercel serverless
// =============================================================================
// Endpoint: POST https://www.framelord.com/api/stripe/portal
// =============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

// =============================================================================
// CONFIGURATION
// =============================================================================

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const BASE_URL = 'https://www.framelord.com';

// =============================================================================
// TYPES
// =============================================================================

interface PortalRequest {
  stripeCustomerId: string;
  returnUrl?: string;
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

  // Check Stripe is configured
  if (!STRIPE_SECRET_KEY || !STRIPE_SECRET_KEY.startsWith('sk_')) {
    res.status(500).json({ error: 'Stripe not configured' });
    return;
  }

  const body = req.body as PortalRequest;
  const { stripeCustomerId } = body;

  // Validate required fields
  if (!stripeCustomerId) {
    res.status(400).json({ error: 'Missing required field: stripeCustomerId' });
    return;
  }

  const returnUrl = body.returnUrl || `${BASE_URL}/dashboard`;

  try {
    // Create portal session via Stripe REST API
    const response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: stripeCustomerId,
        return_url: returnUrl,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[StripePortal] API error:', data.error?.message);
      res.status(response.status).json({ error: data.error?.message || 'Stripe error' });
      return;
    }

    console.log('[StripePortal] Session created for customer:', stripeCustomerId);

    res.status(200).json({
      url: data.url,
    });
  } catch (error: any) {
    console.error('[StripePortal] Error:', error);
    res.status(500).json({ error: error?.message || 'Internal error' });
  }
}
