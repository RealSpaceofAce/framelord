// =============================================================================
// STRIPE CHECKOUT — Create checkout sessions via Vercel serverless
// =============================================================================
// Endpoint: POST https://www.framelord.com/api/stripe/checkout
// =============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

// =============================================================================
// CONFIGURATION
// =============================================================================

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PRICE_BASIC = process.env.STRIPE_PRICE_BASIC || '';
const STRIPE_PRICE_PRO = process.env.STRIPE_PRICE_PRO || '';
const STRIPE_PRICE_ELITE = process.env.STRIPE_PRICE_ELITE || '';

const PRICE_IDS: Record<string, string> = {
  basic: STRIPE_PRICE_BASIC,
  pro: STRIPE_PRICE_PRO,
  elite: STRIPE_PRICE_ELITE,
};

const BASE_URL = 'https://www.framelord.com';

// =============================================================================
// TYPES
// =============================================================================

interface CheckoutRequest {
  plan: 'basic' | 'pro' | 'elite';
  email: string;
  tenantId: string;
  userId: string;
  successUrl?: string;
  cancelUrl?: string;
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

  const body = req.body as CheckoutRequest;
  const { plan, email, tenantId, userId } = body;

  // Validate required fields
  if (!plan || !email || !tenantId || !userId) {
    res.status(400).json({ error: 'Missing required fields: plan, email, tenantId, userId' });
    return;
  }

  // Get price ID
  const priceId = PRICE_IDS[plan];
  if (!priceId) {
    res.status(400).json({ error: `No price configured for plan: ${plan}` });
    return;
  }

  const successUrl = body.successUrl || `${BASE_URL}/dashboard?checkout=success`;
  const cancelUrl = body.cancelUrl || `${BASE_URL}/dashboard?checkout=canceled`;

  try {
    // Create checkout session via Stripe REST API
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        mode: 'subscription',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: email,
        'metadata[tenantId]': tenantId,
        'metadata[userId]': userId,
        'metadata[plan]': plan,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[StripeCheckout] API error:', data.error?.message);
      res.status(response.status).json({ error: data.error?.message || 'Stripe error' });
      return;
    }

    console.log('[StripeCheckout] Session created:', data.id);

    res.status(200).json({
      sessionId: data.id,
      url: data.url,
    });
  } catch (error: any) {
    console.error('[StripeCheckout] Error:', error);
    res.status(500).json({ error: error?.message || 'Internal error' });
  }
}
