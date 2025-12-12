// =============================================================================
// STRIPE CLIENT — Stripe API wrapper
// =============================================================================
// Thin wrapper around Stripe for subscription billing.
//
// !! SERVER-SIDE ONLY !!
// This module MUST only be imported in server-side code (API routes).
// It uses Stripe secret key from environment variables.
//
// Stripe operations:
// 1. Create checkout sessions for new subscriptions
// 2. Create customer portal sessions for self-service
// 3. Handle webhooks for subscription lifecycle events
// =============================================================================

import type {
  CheckoutSessionRequest,
  CheckoutSessionResponse,
  PortalSessionRequest,
  PortalSessionResponse,
  BillingCustomer,
  BillingSubscription,
  SubscriptionStatus,
} from '../../types/billing';
import type { ProductionTier } from '../../config/planConfig';
import { STRIPE_PRICE_IDS, PLAN_NAMES } from '../../config/planConfig';
import { addLogEntry } from '../../services/systemLogStore';

// =============================================================================
// CONFIGURATION
// =============================================================================

/**
 * Get Stripe configuration from environment
 */
export const getStripeConfig = () => ({
  secretKey: process.env.STRIPE_SECRET_KEY || '',
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
  publicKey: process.env.VITE_STRIPE_PUBLIC_KEY || '',
});

/**
 * Check if we're running in a server environment
 */
const isServerRuntime = (): boolean => {
  return typeof window === 'undefined' && typeof process !== 'undefined';
};

/**
 * Check if Stripe is enabled (has secret key)
 */
export const isStripeEnabled = (): boolean => {
  const config = getStripeConfig();
  return !!config.secretKey && config.secretKey.startsWith('sk_');
};

// =============================================================================
// RESULT TYPES
// =============================================================================

export interface StripeResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// =============================================================================
// CHECKOUT SESSION
// =============================================================================

/**
 * Create a Stripe checkout session for a new subscription
 *
 * In production, this calls Stripe API.
 * In development without keys, returns a stub.
 */
export const createCheckoutSession = async (
  request: CheckoutSessionRequest
): Promise<StripeResult<CheckoutSessionResponse>> => {
  if (!isServerRuntime()) {
    console.warn('[StripeClient] createCheckoutSession called from client-side');
    return {
      success: false,
      error: 'Stripe operations only available server-side',
    };
  }

  if (!isStripeEnabled()) {
    console.log('[StripeClient] Stripe not configured. Returning stub session.');
    return {
      success: true,
      data: {
        sessionId: `stub_cs_${Date.now()}`,
        url: `${request.successUrl}?session_id=stub_cs_${Date.now()}`,
      },
    };
  }

  const config = getStripeConfig();
  const priceId = STRIPE_PRICE_IDS[request.plan];

  if (!priceId) {
    return {
      success: false,
      error: `No Stripe price ID configured for plan: ${request.plan}`,
    };
  }

  try {
    // Use Stripe REST API directly (no SDK required)
    const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        mode: 'subscription',
        'line_items[0][price]': priceId,
        'line_items[0][quantity]': '1',
        success_url: request.successUrl,
        cancel_url: request.cancelUrl,
        customer_email: request.email,
        'metadata[tenantId]': request.tenantId,
        'metadata[userId]': request.userId,
        'metadata[plan]': request.plan,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.error?.message || 'Stripe API error';
      logStripeEvent('checkout_error', { error: errorMessage });
      return {
        success: false,
        error: errorMessage,
      };
    }

    logStripeEvent('checkout_created', {
      sessionId: data.id,
      plan: request.plan,
    });

    return {
      success: true,
      data: {
        sessionId: data.id,
        url: data.url,
      },
    };
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown Stripe error';
    console.error('[StripeClient] Checkout error:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
};

// =============================================================================
// CUSTOMER PORTAL
// =============================================================================

/**
 * Create a Stripe customer portal session for self-service billing management
 */
export const createPortalSession = async (
  request: PortalSessionRequest,
  stripeCustomerId: string
): Promise<StripeResult<PortalSessionResponse>> => {
  if (!isServerRuntime()) {
    console.warn('[StripeClient] createPortalSession called from client-side');
    return {
      success: false,
      error: 'Stripe operations only available server-side',
    };
  }

  if (!isStripeEnabled()) {
    console.log('[StripeClient] Stripe not configured. Returning stub portal.');
    return {
      success: true,
      data: {
        url: `${request.returnUrl}?portal=stub`,
      },
    };
  }

  const config = getStripeConfig();

  try {
    const response = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.secretKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        customer: stripeCustomerId,
        return_url: request.returnUrl,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMessage = data.error?.message || 'Stripe API error';
      return {
        success: false,
        error: errorMessage,
      };
    }

    return {
      success: true,
      data: {
        url: data.url,
      },
    };
  } catch (error: any) {
    const errorMessage = error?.message || 'Unknown Stripe error';
    console.error('[StripeClient] Portal error:', errorMessage);
    return {
      success: false,
      error: errorMessage,
    };
  }
};

// =============================================================================
// SUBSCRIPTION MANAGEMENT
// =============================================================================

/**
 * Get subscription details from Stripe
 */
export const getSubscription = async (
  stripeSubscriptionId: string
): Promise<StripeResult<BillingSubscription>> => {
  if (!isServerRuntime() || !isStripeEnabled()) {
    return {
      success: false,
      error: 'Stripe not available',
    };
  }

  const config = getStripeConfig();

  try {
    const response = await fetch(
      `https://api.stripe.com/v1/subscriptions/${stripeSubscriptionId}`,
      {
        headers: {
          'Authorization': `Bearer ${config.secretKey}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || 'Failed to get subscription',
      };
    }

    return {
      success: true,
      data: mapStripeSubscription(data),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Unknown error',
    };
  }
};

/**
 * Cancel subscription at period end
 */
export const cancelSubscription = async (
  stripeSubscriptionId: string
): Promise<StripeResult<BillingSubscription>> => {
  if (!isServerRuntime() || !isStripeEnabled()) {
    return {
      success: false,
      error: 'Stripe not available',
    };
  }

  const config = getStripeConfig();

  try {
    const response = await fetch(
      `https://api.stripe.com/v1/subscriptions/${stripeSubscriptionId}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.secretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          cancel_at_period_end: 'true',
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error?.message || 'Failed to cancel subscription',
      };
    }

    logStripeEvent('subscription_canceled', {
      subscriptionId: stripeSubscriptionId,
    });

    return {
      success: true,
      data: mapStripeSubscription(data),
    };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || 'Unknown error',
    };
  }
};

// =============================================================================
// WEBHOOK VERIFICATION
// =============================================================================

/**
 * Verify webhook signature
 * Returns the parsed event if valid, null if invalid
 */
export const verifyWebhookSignature = async (
  payload: string,
  signature: string
): Promise<Record<string, unknown> | null> => {
  const config = getStripeConfig();

  if (!config.webhookSecret) {
    console.warn('[StripeClient] No webhook secret configured');
    // In development, allow unverified webhooks
    try {
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }

  // Verify signature using Stripe's algorithm
  // This is a simplified version - in production, use proper HMAC verification
  try {
    const crypto = await import('crypto');
    const [timestamp, v1Sig] = parseSignature(signature);

    const signedPayload = `${timestamp}.${payload}`;
    const expectedSig = crypto
      .createHmac('sha256', config.webhookSecret)
      .update(signedPayload)
      .digest('hex');

    if (expectedSig !== v1Sig) {
      console.error('[StripeClient] Invalid webhook signature');
      return null;
    }

    return JSON.parse(payload);
  } catch (error) {
    console.error('[StripeClient] Webhook verification error:', error);
    return null;
  }
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

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Map Stripe subscription object to our BillingSubscription type
 */
const mapStripeSubscription = (stripeData: any): BillingSubscription => {
  const planFromMetadata = stripeData.metadata?.plan as ProductionTier | undefined;
  const plan = planFromMetadata || 'basic';

  return {
    id: `sub_${stripeData.id}`,
    customerId: stripeData.customer,
    stripeSubscriptionId: stripeData.id,
    stripePriceId: stripeData.items?.data?.[0]?.price?.id || '',
    plan,
    status: stripeData.status as SubscriptionStatus,
    currentPeriodStart: new Date(stripeData.current_period_start * 1000).toISOString(),
    currentPeriodEnd: new Date(stripeData.current_period_end * 1000).toISOString(),
    cancelAtPeriodEnd: stripeData.cancel_at_period_end,
    canceledAt: stripeData.canceled_at
      ? new Date(stripeData.canceled_at * 1000).toISOString()
      : undefined,
    trialEnd: stripeData.trial_end
      ? new Date(stripeData.trial_end * 1000).toISOString()
      : undefined,
    createdAt: new Date(stripeData.created * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

/**
 * Log Stripe event to system log
 */
const logStripeEvent = (
  event: string,
  details: Record<string, unknown>
): void => {
  addLogEntry({
    type: 'system',
    title: `Stripe: ${event}`,
    message: JSON.stringify(details),
    isRead: false,
    severity: 'info',
    source: 'system',
  });
};

// =============================================================================
// PRICE HELPERS (For UI)
// =============================================================================

/**
 * Format price in dollars
 */
export const formatPrice = (cents: number): string => {
  return `$${(cents / 100).toFixed(0)}`;
};

/**
 * Get all production plans with pricing for display
 */
export const getProductionPlans = (): Array<{
  tier: ProductionTier;
  name: string;
  priceMonthly: string;
  priceId: string;
}> => {
  const plans: ProductionTier[] = ['basic', 'pro', 'elite'];

  return plans.map((tier) => ({
    tier,
    name: PLAN_NAMES[tier],
    priceMonthly: formatPrice(
      tier === 'basic' ? 2900 : tier === 'pro' ? 7900 : 19900
    ),
    priceId: STRIPE_PRICE_IDS[tier] || '',
  }));
};
