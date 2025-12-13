// =============================================================================
// STRIPE WEBHOOK — Vercel serverless function
// =============================================================================
// Handles Stripe webhook events for subscription lifecycle management.
// Endpoint: POST https://www.framelord.com/api/stripe/webhook
// =============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

// =============================================================================
// CONFIGURATION
// =============================================================================

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

// =============================================================================
// TYPES
// =============================================================================

interface StripeEventObject {
  id: string;
  customer?: string;
  subscription?: string;
  status?: string;
  metadata?: Record<string, string>;
  current_period_end?: number;
  cancel_at_period_end?: boolean;
  items?: {
    data?: Array<{
      price?: {
        id?: string;
      };
    }>;
  };
}

interface StripeEvent {
  id: string;
  type: string;
  data: {
    object: StripeEventObject;
  };
  created: number;
}

// =============================================================================
// SIGNATURE VERIFICATION
// =============================================================================

async function verifySignature(
  payload: string,
  signature: string
): Promise<StripeEvent | null> {
  if (!STRIPE_WEBHOOK_SECRET) {
    console.warn('[StripeWebhook] No webhook secret configured');
    // In development, allow unverified webhooks
    try {
      return JSON.parse(payload) as StripeEvent;
    } catch {
      return null;
    }
  }

  try {
    const crypto = await import('crypto');

    // Parse signature header
    const parts = signature.split(',');
    let timestamp = '';
    let v1Sig = '';

    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 't') timestamp = value;
      if (key === 'v1') v1Sig = value;
    }

    // Verify signature
    const signedPayload = `${timestamp}.${payload}`;
    const expectedSig = crypto
      .createHmac('sha256', STRIPE_WEBHOOK_SECRET)
      .update(signedPayload)
      .digest('hex');

    if (expectedSig !== v1Sig) {
      console.error('[StripeWebhook] Invalid signature');
      return null;
    }

    return JSON.parse(payload) as StripeEvent;
  } catch (error) {
    console.error('[StripeWebhook] Signature verification error:', error);
    return null;
  }
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

async function handleCheckoutCompleted(session: StripeEventObject): Promise<void> {
  const { metadata, customer, subscription } = session;

  if (!metadata?.tenantId || !customer || !subscription) {
    console.warn('[StripeWebhook] checkout.session.completed missing required fields');
    return;
  }

  console.log('[StripeWebhook] Checkout completed:', {
    tenantId: metadata.tenantId,
    plan: metadata.plan,
    customerId: customer,
  });

  // TODO: Update tenant billing status in Supabase
  // await supabase.from('tenants').update({
  //   stripe_customer_id: customer,
  //   stripe_subscription_id: subscription,
  //   plan_tier: metadata.plan,
  //   subscription_status: 'active'
  // }).eq('id', metadata.tenantId);
}

async function handleSubscriptionUpdated(subscription: StripeEventObject): Promise<void> {
  const { metadata, status, cancel_at_period_end } = subscription;

  if (!metadata?.tenantId) {
    console.warn('[StripeWebhook] subscription.updated missing tenantId');
    return;
  }

  console.log('[StripeWebhook] Subscription updated:', {
    tenantId: metadata.tenantId,
    status,
    cancelAtPeriodEnd: cancel_at_period_end,
  });

  // TODO: Update tenant subscription status in Supabase
}

async function handleSubscriptionDeleted(subscription: StripeEventObject): Promise<void> {
  const { metadata } = subscription;

  if (!metadata?.tenantId) {
    console.warn('[StripeWebhook] subscription.deleted missing tenantId');
    return;
  }

  console.log('[StripeWebhook] Subscription deleted:', {
    tenantId: metadata.tenantId,
  });

  // TODO: Downgrade tenant to free tier in Supabase
}

async function handlePaymentFailed(invoice: StripeEventObject): Promise<void> {
  const { metadata } = invoice;

  console.log('[StripeWebhook] Payment failed:', {
    tenantId: metadata?.tenantId,
  });

  // TODO: Update tenant status to past_due, send notification
}

async function handlePaymentSucceeded(invoice: StripeEventObject): Promise<void> {
  const { metadata } = invoice;

  console.log('[StripeWebhook] Payment succeeded:', {
    tenantId: metadata?.tenantId,
  });

  // TODO: Reactivate tenant if was past_due
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

  // Get signature header
  const signature = req.headers['stripe-signature'] as string;
  if (!signature) {
    res.status(400).json({ error: 'Missing stripe-signature header' });
    return;
  }

  // Read raw body
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  const payload = Buffer.concat(chunks).toString('utf8');

  // Verify signature
  const event = await verifySignature(payload, signature);
  if (!event) {
    res.status(400).json({ error: 'Invalid signature' });
    return;
  }

  console.log('[StripeWebhook] Processing event:', event.type, event.id);

  try {
    // Route to handler
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      case 'invoice.paid':
        await handlePaymentSucceeded(event.data.object);
        break;

      default:
        console.log('[StripeWebhook] Unhandled event type:', event.type);
    }

    res.status(200).json({ received: true, eventId: event.id });
  } catch (error: any) {
    console.error('[StripeWebhook] Error processing event:', error);
    res.status(500).json({ error: error?.message || 'Internal error' });
  }
}

// Disable body parsing - Stripe requires raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
