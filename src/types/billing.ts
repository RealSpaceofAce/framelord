// =============================================================================
// BILLING TYPES — Stripe subscription and payment types
// =============================================================================
// Type definitions for the billing system.
// =============================================================================

import type { ProductionTier } from '../config/planConfig';

// =============================================================================
// SUBSCRIPTION STATUS
// =============================================================================

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid'
  | 'trialing'
  | 'incomplete'
  | 'incomplete_expired';

// =============================================================================
// CUSTOMER RECORD
// =============================================================================

export interface BillingCustomer {
  id: string;                     // Internal customer ID
  tenantId: string;               // FrameLord tenant ID
  userId: string;                 // FrameLord user ID
  stripeCustomerId: string;       // Stripe customer ID (cus_xxx)
  email: string;
  name?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// SUBSCRIPTION RECORD
// =============================================================================

export interface BillingSubscription {
  id: string;                           // Internal subscription ID
  customerId: string;                   // Internal customer ID
  stripeSubscriptionId: string;         // Stripe subscription ID (sub_xxx)
  stripePriceId: string;                // Stripe price ID (price_xxx)
  plan: ProductionTier;                 // FrameLord plan tier
  status: SubscriptionStatus;
  currentPeriodStart: string;           // ISO date
  currentPeriodEnd: string;             // ISO date
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;                  // ISO date if canceled
  trialEnd?: string;                    // ISO date if trialing
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// CHECKOUT SESSION
// =============================================================================

export interface CheckoutSessionRequest {
  tenantId: string;
  userId: string;
  email: string;
  plan: ProductionTier;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResponse {
  sessionId: string;              // Stripe checkout session ID
  url: string;                    // Redirect URL for checkout
}

// =============================================================================
// PORTAL SESSION
// =============================================================================

export interface PortalSessionRequest {
  tenantId: string;
  userId: string;
  returnUrl: string;
}

export interface PortalSessionResponse {
  url: string;                    // Redirect URL for customer portal
}

// =============================================================================
// WEBHOOK EVENTS
// =============================================================================

export type StripeWebhookEventType =
  | 'checkout.session.completed'
  | 'customer.subscription.created'
  | 'customer.subscription.updated'
  | 'customer.subscription.deleted'
  | 'invoice.paid'
  | 'invoice.payment_failed';

export interface WebhookEvent {
  id: string;
  type: StripeWebhookEventType;
  data: {
    object: Record<string, unknown>;
  };
  created: number;
}

// =============================================================================
// IDEMPOTENCY
// =============================================================================

export interface ProcessedWebhook {
  eventId: string;                // Stripe event ID (evt_xxx)
  eventType: string;
  processedAt: string;            // ISO date
  result: 'success' | 'error';
  error?: string;
}

// =============================================================================
// BILLING STATE (For UI)
// =============================================================================

export interface BillingState {
  isLoading: boolean;
  customer: BillingCustomer | null;
  subscription: BillingSubscription | null;
  error: string | null;
}

// =============================================================================
// PLAN COMPARISON (For UI)
// =============================================================================

export interface PlanFeature {
  name: string;
  included: boolean;
  limit?: string;                 // e.g., "100/month", "Unlimited"
}

export interface PlanDisplay {
  tier: ProductionTier;
  name: string;
  description: string;
  priceMonthly: number;           // In dollars
  features: PlanFeature[];
  highlighted?: boolean;          // For "Most Popular" badge
  ctaText: string;
}
