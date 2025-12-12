// =============================================================================
// STRIPE API — Checkout and billing API layer
// =============================================================================
// Frontend-callable API functions for Stripe integration.
//
// DEVELOPMENT MODE:
// - If Stripe keys are not configured, returns stub responses
// - Allows full flow testing without real Stripe account
//
// PRODUCTION MODE:
// - Calls actual Stripe API via stripeClient
// - Requires STRIPE_SECRET_KEY, VITE_STRIPE_PUBLIC_KEY, STRIPE_WEBHOOK_SECRET
//
// API ROUTES (for Vercel serverless when deployed):
// - POST /api/stripe/create-checkout-session
// - POST /api/stripe/create-portal-session
// - POST /api/stripe/webhook
// =============================================================================

import type { PlanTier } from '../types/multiTenant';
import type { ProductionTier } from '../config/planConfig';
import {
  createCheckoutSession,
  createPortalSession,
  isStripeEnabled,
  type StripeResult,
} from '../lib/stripe/stripeClient';
import {
  STRIPE_PRICE_IDS,
  isBetaTier,
  betaToProductionTier,
} from '../config/planConfig';
import {
  updateBillingFromCheckout,
  getTenantBilling,
} from '../services/billingStore';

// =============================================================================
// TYPES
// =============================================================================

export interface CreateCheckoutSessionRequest {
  tenantId: string;
  userId: string;
  email: string;
  targetTier: PlanTier;
  successUrl?: string;
  cancelUrl?: string;
}

export interface CreateCheckoutSessionResponse {
  success: boolean;
  checkoutUrl?: string;
  sessionId?: string;
  error?: string;
}

export interface CreatePortalSessionRequest {
  tenantId: string;
  userId: string;
  returnUrl?: string;
}

export interface CreatePortalSessionResponse {
  success: boolean;
  portalUrl?: string;
  error?: string;
}

// =============================================================================
// CHECKOUT SESSION
// =============================================================================

/**
 * Create a Stripe checkout session for plan upgrade
 *
 * Flow:
 * 1. Resolve target tier to production tier (for beta users)
 * 2. Get the Stripe price ID from planConfig
 * 3. Create checkout session via stripeClient
 * 4. Return checkout URL for redirect
 *
 * In development without Stripe keys:
 * - Returns a stub URL that simulates successful checkout
 */
export async function createCheckoutSessionApi(
  request: CreateCheckoutSessionRequest
): Promise<CreateCheckoutSessionResponse> {
  const {
    tenantId,
    userId,
    email,
    targetTier,
    successUrl = `${window.location.origin}/settings/billing?success=true`,
    cancelUrl = `${window.location.origin}/settings/billing?canceled=true`,
  } = request;

  // Validate request
  if (!tenantId || !userId || !email) {
    return {
      success: false,
      error: 'Missing required fields: tenantId, userId, email',
    };
  }

  // Resolve beta tier to production tier for Stripe
  let productionTier: ProductionTier;
  if (isBetaTier(targetTier)) {
    productionTier = betaToProductionTier(targetTier);
  } else if (targetTier === 'basic' || targetTier === 'pro' || targetTier === 'elite') {
    productionTier = targetTier;
  } else {
    return {
      success: false,
      error: `Invalid target tier: ${targetTier}`,
    };
  }

  // Check if Stripe is configured
  if (!isStripeEnabled()) {
    console.log('[StripeApi] Stripe not configured - returning stub checkout');
    // In dev mode, simulate successful checkout
    const stubSessionId = `stub_cs_${Date.now()}`;
    return {
      success: true,
      checkoutUrl: `${successUrl}&session_id=${stubSessionId}&tier=${productionTier}`,
      sessionId: stubSessionId,
    };
  }

  // Create real checkout session
  const result = await createCheckoutSession({
    tenantId,
    userId,
    email,
    plan: productionTier,
    successUrl,
    cancelUrl,
  });

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error || 'Failed to create checkout session',
    };
  }

  return {
    success: true,
    checkoutUrl: result.data.url,
    sessionId: result.data.sessionId,
  };
}

// =============================================================================
// CUSTOMER PORTAL
// =============================================================================

/**
 * Create a Stripe customer portal session for billing management
 *
 * Allows users to:
 * - Update payment method
 * - View billing history
 * - Cancel subscription
 */
export async function createPortalSessionApi(
  request: CreatePortalSessionRequest
): Promise<CreatePortalSessionResponse> {
  const {
    tenantId,
    userId,
    returnUrl = `${window.location.origin}/settings/billing`,
  } = request;

  // Validate request
  if (!tenantId || !userId) {
    return {
      success: false,
      error: 'Missing required fields: tenantId, userId',
    };
  }

  // Get billing state to find Stripe customer ID
  const billing = getTenantBilling(tenantId);
  if (!billing.stripeCustomerId) {
    return {
      success: false,
      error: 'No active subscription found',
    };
  }

  // Check if Stripe is configured
  if (!isStripeEnabled()) {
    console.log('[StripeApi] Stripe not configured - returning stub portal');
    return {
      success: true,
      portalUrl: `${returnUrl}?portal=stub`,
    };
  }

  // Create real portal session
  const result = await createPortalSession(
    { tenantId, userId, returnUrl },
    billing.stripeCustomerId
  );

  if (!result.success || !result.data) {
    return {
      success: false,
      error: result.error || 'Failed to create portal session',
    };
  }

  return {
    success: true,
    portalUrl: result.data.url,
  };
}

// =============================================================================
// CHECKOUT COMPLETION HANDLER
// =============================================================================

/**
 * Handle successful checkout completion
 * Called after user returns from Stripe checkout
 *
 * In production: This would be handled by webhook
 * In development: Called directly from UI after redirect
 */
export function handleCheckoutSuccess(
  tenantId: string,
  sessionId: string,
  tier: PlanTier
): void {
  // For stub sessions, update local billing state
  if (sessionId.startsWith('stub_')) {
    updateBillingFromCheckout(tenantId, {
      stripeCustomerId: `stub_cus_${tenantId}`,
      stripeSubscriptionId: `stub_sub_${Date.now()}`,
      planTier: tier,
      status: 'active',
    });
    console.log('[StripeApi] Stub checkout completed:', { tenantId, tier });
    return;
  }

  // For real sessions, billing state is updated via webhook
  console.log('[StripeApi] Real checkout completed - awaiting webhook:', { sessionId });
}

// =============================================================================
// UTILITIES
// =============================================================================

/**
 * Get Stripe public key for client-side use
 */
export function getStripePublicKey(): string {
  return import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';
}

/**
 * Check if Stripe is available for the client
 */
export function isStripeAvailable(): boolean {
  return !!getStripePublicKey() || !import.meta.env.PROD;
}

/**
 * Get available upgrade tiers for a given current tier
 */
export function getAvailableUpgrades(currentTier: PlanTier): ProductionTier[] {
  const tierOrder: ProductionTier[] = ['basic', 'pro', 'elite'];

  // Map current tier to production equivalent
  let currentProductionTier: ProductionTier;
  if (isBetaTier(currentTier)) {
    currentProductionTier = betaToProductionTier(currentTier);
  } else if (currentTier === 'basic' || currentTier === 'pro' || currentTier === 'elite') {
    currentProductionTier = currentTier;
  } else {
    // Unknown tier, show all upgrades
    return tierOrder;
  }

  // Return tiers higher than current
  const currentIndex = tierOrder.indexOf(currentProductionTier);
  return tierOrder.slice(currentIndex + 1);
}
