// =============================================================================
// BILLING STORE — Tenant billing state management
// =============================================================================
// Central store for managing tenant billing state.
// In development: Uses in-memory storage with localStorage persistence.
// In production: State is managed via Stripe webhooks + database.
// =============================================================================

import type {
  TenantBilling,
  PlanTier,
  StripeSubscriptionStatus,
} from '../types/multiTenant';
import { DEFAULT_TENANT_BILLING } from '../types/multiTenant';

// =============================================================================
// STORAGE
// =============================================================================

const BILLING_STORAGE_KEY = 'framelord_billing';

// In-memory billing state (keyed by tenantId)
let billingState: Map<string, TenantBilling> = new Map();

// Load from localStorage on init
function loadFromStorage(): void {
  try {
    const stored = localStorage.getItem(BILLING_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      billingState = new Map(Object.entries(parsed));
    }
  } catch (err) {
    console.warn('[BillingStore] Failed to load from storage:', err);
  }
}

// Save to localStorage
function saveToStorage(): void {
  try {
    const obj: Record<string, TenantBilling> = {};
    billingState.forEach((billing, tenantId) => {
      obj[tenantId] = billing;
    });
    localStorage.setItem(BILLING_STORAGE_KEY, JSON.stringify(obj));
  } catch (err) {
    console.warn('[BillingStore] Failed to save to storage:', err);
  }
}

// Initialize on module load
if (typeof window !== 'undefined') {
  loadFromStorage();
}

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get billing state for a tenant
 */
export function getTenantBilling(tenantId: string): TenantBilling {
  return billingState.get(tenantId) || { ...DEFAULT_TENANT_BILLING };
}

/**
 * Get current plan tier for a tenant
 */
export function getCurrentPlanTier(tenantId: string): PlanTier {
  const billing = getTenantBilling(tenantId);
  return billing.currentPlanTier;
}

/**
 * Check if tenant has an active subscription
 */
export function hasActiveSubscription(tenantId: string): boolean {
  const billing = getTenantBilling(tenantId);
  return billing.billingStatus === 'active' || billing.billingStatus === 'trialing';
}

/**
 * Check if tenant subscription is past due
 */
export function isPastDue(tenantId: string): boolean {
  const billing = getTenantBilling(tenantId);
  return billing.billingStatus === 'past_due';
}

/**
 * Check if tenant subscription is canceled but still valid
 */
export function isCanceledButValid(tenantId: string): boolean {
  const billing = getTenantBilling(tenantId);
  if (billing.billingStatus !== 'canceled') return false;
  if (!billing.validUntil) return false;
  return new Date(billing.validUntil) > new Date();
}

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Initialize billing state for a new tenant
 */
export function initializeTenantBilling(
  tenantId: string,
  initialTier: PlanTier = 'beta_free'
): TenantBilling {
  const billing: TenantBilling = {
    currentPlanTier: initialTier,
    billingStatus: 'none',
  };
  billingState.set(tenantId, billing);
  saveToStorage();
  return billing;
}

/**
 * Update billing state after Stripe checkout completion
 */
export function updateBillingFromCheckout(
  tenantId: string,
  data: {
    stripeCustomerId: string;
    stripeSubscriptionId: string;
    planTier: PlanTier;
    status: StripeSubscriptionStatus;
    validUntil?: string;
  }
): TenantBilling {
  const billing: TenantBilling = {
    stripeCustomerId: data.stripeCustomerId,
    stripeSubscriptionId: data.stripeSubscriptionId,
    currentPlanTier: data.planTier,
    billingStatus: data.status,
    validUntil: data.validUntil,
    subscribedAt: new Date().toISOString(),
    lastBillingEventAt: new Date().toISOString(),
  };
  billingState.set(tenantId, billing);
  saveToStorage();
  console.log('[BillingStore] Updated billing from checkout:', { tenantId, billing });
  return billing;
}

/**
 * Update subscription status (from webhook events)
 */
export function updateSubscriptionStatus(
  tenantId: string,
  status: StripeSubscriptionStatus,
  validUntil?: string
): void {
  const billing = getTenantBilling(tenantId);
  billing.billingStatus = status;
  billing.lastBillingEventAt = new Date().toISOString();
  if (validUntil) {
    billing.validUntil = validUntil;
  }
  billingState.set(tenantId, billing);
  saveToStorage();
  console.log('[BillingStore] Updated subscription status:', { tenantId, status });
}

/**
 * Update plan tier (from subscription change)
 */
export function updatePlanTier(tenantId: string, planTier: PlanTier): void {
  const billing = getTenantBilling(tenantId);
  billing.currentPlanTier = planTier;
  billing.lastBillingEventAt = new Date().toISOString();
  billingState.set(tenantId, billing);
  saveToStorage();
  console.log('[BillingStore] Updated plan tier:', { tenantId, planTier });
}

/**
 * Handle subscription cancellation
 */
export function handleSubscriptionCanceled(
  tenantId: string,
  validUntil: string
): void {
  const billing = getTenantBilling(tenantId);
  billing.billingStatus = 'canceled';
  billing.validUntil = validUntil;
  billing.lastBillingEventAt = new Date().toISOString();
  billingState.set(tenantId, billing);
  saveToStorage();
  console.log('[BillingStore] Subscription canceled:', { tenantId, validUntil });
}

/**
 * Downgrade to free tier (when subscription fully expires)
 */
export function downgradeToFreeTier(tenantId: string): void {
  const billing = getTenantBilling(tenantId);
  billing.currentPlanTier = 'beta_free';
  billing.billingStatus = 'none';
  billing.stripeSubscriptionId = undefined;
  billing.validUntil = undefined;
  billing.lastBillingEventAt = new Date().toISOString();
  billingState.set(tenantId, billing);
  saveToStorage();
  console.log('[BillingStore] Downgraded to free tier:', { tenantId });
}

// =============================================================================
// DEV HELPERS
// =============================================================================

/**
 * Reset billing state for development/testing
 */
export function resetBillingState(): void {
  billingState.clear();
  localStorage.removeItem(BILLING_STORAGE_KEY);
  console.log('[BillingStore] Reset billing state');
}

/**
 * Set billing state directly (for development/testing)
 */
export function setDevBillingState(tenantId: string, billing: TenantBilling): void {
  billingState.set(tenantId, billing);
  saveToStorage();
  console.log('[BillingStore] Dev: Set billing state:', { tenantId, billing });
}
