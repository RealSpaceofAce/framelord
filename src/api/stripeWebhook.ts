// =============================================================================
// STRIPE WEBHOOK HANDLER — Process Stripe subscription events
// =============================================================================
// Handles webhook events from Stripe for subscription lifecycle management.
//
// DEPLOYMENT NOTE:
// This file contains the webhook processing logic. For Vercel deployment,
// create `/api/stripe/webhook.ts` that imports and calls processStripeWebhook().
//
// EVENTS HANDLED:
// - checkout.session.completed: New subscription created
// - customer.subscription.created: Subscription activated
// - customer.subscription.updated: Plan changed, status changed
// - customer.subscription.deleted: Subscription canceled/expired
// - invoice.payment_failed: Payment failed
// - invoice.paid: Payment succeeded
//
// SECURITY:
// - Validates webhook signature using STRIPE_WEBHOOK_SECRET
// - Uses idempotency to prevent duplicate processing
// =============================================================================

import type { PlanTier, StripeSubscriptionStatus } from '../types/multiTenant';
import type { ProductionTier } from '../config/planConfig';
import { verifyWebhookSignature } from '../lib/stripe/stripeClient';
import {
  isBetaTier,
  isProductionTier,
  STRIPE_PRICE_IDS,
} from '../config/planConfig';
import {
  updateBillingFromCheckout,
  updateSubscriptionStatus,
  updatePlanTier,
  handleSubscriptionCanceled,
  downgradeToFreeTier,
} from '../services/billingStore';
import { addLogEntry } from '../services/systemLogStore';
import { createPaymentFailedNotification } from '../services/taskReminderService';

// =============================================================================
// TYPES
// =============================================================================

export interface WebhookProcessResult {
  success: boolean;
  eventId?: string;
  eventType?: string;
  error?: string;
}

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
// PROCESSED EVENTS TRACKING (Idempotency)
// =============================================================================

const processedEvents = new Set<string>();

function isEventProcessed(eventId: string): boolean {
  return processedEvents.has(eventId);
}

function markEventProcessed(eventId: string): void {
  processedEvents.add(eventId);
  // Cleanup old events after 1 hour (in production, use database)
  setTimeout(() => processedEvents.delete(eventId), 60 * 60 * 1000);
}

// =============================================================================
// MAIN WEBHOOK PROCESSOR
// =============================================================================

/**
 * Process a Stripe webhook event
 *
 * @param payload - Raw webhook payload body
 * @param signature - Stripe-Signature header value
 * @returns Processing result
 */
export async function processStripeWebhook(
  payload: string,
  signature: string
): Promise<WebhookProcessResult> {
  // Verify signature
  const event = await verifyWebhookSignature(payload, signature);

  if (!event) {
    return {
      success: false,
      error: 'Invalid webhook signature',
    };
  }

  const stripeEvent = event as unknown as StripeEvent;

  // Idempotency check
  if (isEventProcessed(stripeEvent.id)) {
    console.log('[StripeWebhook] Event already processed:', stripeEvent.id);
    return {
      success: true,
      eventId: stripeEvent.id,
      eventType: stripeEvent.type,
    };
  }

  console.log('[StripeWebhook] Processing event:', stripeEvent.type, stripeEvent.id);

  try {
    // Route to appropriate handler
    switch (stripeEvent.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(stripeEvent.data.object);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(stripeEvent.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(stripeEvent.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(stripeEvent.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(stripeEvent.data.object);
        break;

      case 'invoice.paid':
        await handlePaymentSucceeded(stripeEvent.data.object);
        break;

      default:
        console.log('[StripeWebhook] Unhandled event type:', stripeEvent.type);
    }

    markEventProcessed(stripeEvent.id);

    return {
      success: true,
      eventId: stripeEvent.id,
      eventType: stripeEvent.type,
    };
  } catch (error: any) {
    console.error('[StripeWebhook] Error processing event:', error);
    return {
      success: false,
      eventId: stripeEvent.id,
      eventType: stripeEvent.type,
      error: error?.message || 'Unknown error',
    };
  }
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Handle checkout.session.completed
 * Called when a customer completes checkout
 */
async function handleCheckoutSessionCompleted(session: StripeEventObject): Promise<void> {
  const { metadata, customer, subscription } = session;

  if (!metadata?.tenantId || !customer || !subscription) {
    console.warn('[StripeWebhook] checkout.session.completed missing required fields');
    return;
  }

  const tenantId = metadata.tenantId;
  const planTier = resolvePlanTierFromMetadata(metadata);

  updateBillingFromCheckout(tenantId, {
    stripeCustomerId: customer,
    stripeSubscriptionId: subscription as string,
    planTier,
    status: 'active',
  });

  logBillingEvent('checkout_completed', {
    tenantId,
    planTier,
    customerId: customer,
    subscriptionId: subscription,
  });
}

/**
 * Handle customer.subscription.created
 * Called when a subscription is first created
 */
async function handleSubscriptionCreated(subscription: StripeEventObject): Promise<void> {
  const { metadata, status, customer } = subscription;

  if (!metadata?.tenantId) {
    console.warn('[StripeWebhook] subscription.created missing tenantId in metadata');
    return;
  }

  const tenantId = metadata.tenantId;
  const subscriptionStatus = mapStripeStatus(status);
  const planTier = resolvePlanTierFromPriceId(subscription);

  updateSubscriptionStatus(tenantId, subscriptionStatus);
  if (planTier) {
    updatePlanTier(tenantId, planTier);
  }

  logBillingEvent('subscription_created', {
    tenantId,
    status: subscriptionStatus,
    planTier,
  });
}

/**
 * Handle customer.subscription.updated
 * Called when subscription changes (plan change, status change, etc.)
 */
async function handleSubscriptionUpdated(subscription: StripeEventObject): Promise<void> {
  const { metadata, status, current_period_end, cancel_at_period_end } = subscription;

  if (!metadata?.tenantId) {
    console.warn('[StripeWebhook] subscription.updated missing tenantId in metadata');
    return;
  }

  const tenantId = metadata.tenantId;
  const subscriptionStatus = mapStripeStatus(status);
  const planTier = resolvePlanTierFromPriceId(subscription);
  const validUntil = current_period_end
    ? new Date(current_period_end * 1000).toISOString()
    : undefined;

  // Handle cancellation scheduled
  if (cancel_at_period_end && subscriptionStatus === 'active') {
    handleSubscriptionCanceled(tenantId, validUntil || new Date().toISOString());
    logBillingEvent('subscription_canceled_scheduled', { tenantId, validUntil });
    return;
  }

  updateSubscriptionStatus(tenantId, subscriptionStatus, validUntil);

  if (planTier) {
    updatePlanTier(tenantId, planTier);
  }

  logBillingEvent('subscription_updated', {
    tenantId,
    status: subscriptionStatus,
    planTier,
  });
}

/**
 * Handle customer.subscription.deleted
 * Called when subscription is fully deleted/expired
 */
async function handleSubscriptionDeleted(subscription: StripeEventObject): Promise<void> {
  const { metadata } = subscription;

  if (!metadata?.tenantId) {
    console.warn('[StripeWebhook] subscription.deleted missing tenantId in metadata');
    return;
  }

  const tenantId = metadata.tenantId;

  // Downgrade to free tier
  downgradeToFreeTier(tenantId);

  logBillingEvent('subscription_deleted', { tenantId });
}

/**
 * Handle invoice.payment_failed
 * Called when a payment attempt fails
 */
async function handlePaymentFailed(invoice: StripeEventObject): Promise<void> {
  const { metadata, customer } = invoice;

  // Try to get tenantId from metadata or customer
  const tenantId = metadata?.tenantId;
  if (!tenantId) {
    console.warn('[StripeWebhook] payment_failed - cannot identify tenant');
    return;
  }

  updateSubscriptionStatus(tenantId, 'past_due');

  logBillingEvent('payment_failed', {
    tenantId,
    customerId: customer,
  });

  // Send payment failure notification to user
  createPaymentFailedNotification();
}

/**
 * Handle invoice.paid
 * Called when payment succeeds
 */
async function handlePaymentSucceeded(invoice: StripeEventObject): Promise<void> {
  const { metadata } = invoice;

  const tenantId = metadata?.tenantId;
  if (!tenantId) {
    return; // Not all invoices have our metadata
  }

  // Re-activate if was past_due
  updateSubscriptionStatus(tenantId, 'active');

  logBillingEvent('payment_succeeded', { tenantId });
}

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Map Stripe status string to our StripeSubscriptionStatus type
 */
function mapStripeStatus(status?: string): StripeSubscriptionStatus {
  const statusMap: Record<string, StripeSubscriptionStatus> = {
    trialing: 'trialing',
    active: 'active',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'unpaid',
    incomplete: 'incomplete',
    incomplete_expired: 'incomplete_expired',
  };
  return statusMap[status || ''] || 'active';
}

/**
 * Resolve plan tier from checkout metadata
 */
function resolvePlanTierFromMetadata(metadata: Record<string, string>): PlanTier {
  const plan = metadata.plan as ProductionTier | undefined;
  if (plan && isProductionTier(plan)) {
    return plan;
  }
  // Default to basic if not specified
  return 'basic';
}

/**
 * Resolve plan tier from subscription price ID
 */
function resolvePlanTierFromPriceId(subscription: StripeEventObject): PlanTier | null {
  const priceId = subscription.items?.data?.[0]?.price?.id;
  if (!priceId) return null;

  // Reverse lookup from STRIPE_PRICE_IDS
  for (const [tier, id] of Object.entries(STRIPE_PRICE_IDS)) {
    if (id === priceId) {
      return tier as PlanTier;
    }
  }

  return null;
}

/**
 * Log billing event to system log
 */
function logBillingEvent(event: string, details: Record<string, unknown>): void {
  addLogEntry({
    type: 'system',
    title: `Billing: ${event}`,
    message: JSON.stringify(details),
    isRead: false,
    severity: 'info',
    source: 'system',
  });
}

// =============================================================================
// VERCEL SERVERLESS ENTRYPOINT TEMPLATE
// =============================================================================
/**
 * For Vercel deployment, create `/api/stripe/webhook.ts`:
 *
 * ```typescript
 * import type { VercelRequest, VercelResponse } from '@vercel/node';
 * import { processStripeWebhook } from '../../src/api/stripeWebhook';
 *
 * export const config = {
 *   api: {
 *     bodyParser: false, // Stripe requires raw body
 *   },
 * };
 *
 * export default async function handler(req: VercelRequest, res: VercelResponse) {
 *   if (req.method !== 'POST') {
 *     res.setHeader('Allow', 'POST');
 *     return res.status(405).end('Method Not Allowed');
 *   }
 *
 *   const signature = req.headers['stripe-signature'] as string;
 *   const chunks: Buffer[] = [];
 *
 *   for await (const chunk of req) {
 *     chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
 *   }
 *   const payload = Buffer.concat(chunks).toString('utf8');
 *
 *   const result = await processStripeWebhook(payload, signature);
 *
 *   if (result.success) {
 *     return res.status(200).json({ received: true, eventId: result.eventId });
 *   } else {
 *     return res.status(400).json({ error: result.error });
 *   }
 * }
 * ```
 */
