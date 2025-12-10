// =============================================================================
// CREDIT STORE — In-memory credit management for scan tiers
// =============================================================================
// Stub implementation for credit-based scan gating.
// Text scans: Unlimited (no credits required)
// Image scans: Basic tier (free), Detailed tier (credits required)
//
// TODO: Connect to payment provider (Stripe) for credit purchases
// TODO: Mirror credit balance with server-side storage
// =============================================================================

// =============================================================================
// TYPES
// =============================================================================

export type ScanTier = 'basic' | 'detailed';

export interface CreditBalance {
  /** Current credit balance */
  credits: number;
  /** Bonus credits (e.g., from referrals) */
  bonusCredits: number;
  /** Total lifetime credits purchased */
  totalPurchased: number;
  /** Total lifetime credits used */
  totalUsed: number;
  /** Last updated timestamp */
  updatedAt: string;
}

export interface CreditTransaction {
  id: string;
  type: 'purchase' | 'use' | 'bonus' | 'refund';
  amount: number;
  description: string;
  createdAt: string;
  /** For 'use' transactions, which scan used the credit */
  scanReportId?: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number; // in cents
  currency: string;
  popular?: boolean;
}

// =============================================================================
// CREDIT COSTS
// =============================================================================

/** Credits required per scan type */
export const SCAN_CREDIT_COSTS: Record<ScanTier, number> = {
  basic: 0,      // Free basic image scans
  detailed: 5,   // Detailed image scan with annotations
};

/** Text scans are always free */
export const TEXT_SCAN_COST = 0;

// =============================================================================
// CREDIT PACKAGES (STUB)
// =============================================================================

export const CREDIT_PACKAGES: CreditPackage[] = [
  {
    id: 'pkg_starter',
    name: 'Starter Pack',
    credits: 10,
    price: 499, // $4.99
    currency: 'usd',
  },
  {
    id: 'pkg_standard',
    name: 'Standard Pack',
    credits: 30,
    price: 999, // $9.99
    currency: 'usd',
    popular: true,
  },
  {
    id: 'pkg_pro',
    name: 'Pro Pack',
    credits: 100,
    price: 2499, // $24.99
    currency: 'usd',
  },
  {
    id: 'pkg_unlimited',
    name: 'Unlimited Monthly',
    credits: 999999, // Effectively unlimited
    price: 4999, // $49.99/month
    currency: 'usd',
  },
];

// =============================================================================
// IN-MEMORY STORE
// =============================================================================

let creditBalance: CreditBalance = {
  credits: 10,        // Start with 10 free credits for demo
  bonusCredits: 0,
  totalPurchased: 0,
  totalUsed: 0,
  updatedAt: new Date().toISOString(),
};

let transactions: CreditTransaction[] = [];

// =============================================================================
// GETTERS
// =============================================================================

/**
 * Get current credit balance.
 */
export const getCreditBalance = (): CreditBalance => {
  return { ...creditBalance };
};

/**
 * Get total available credits (regular + bonus).
 */
export const getAvailableCredits = (): number => {
  return creditBalance.credits + creditBalance.bonusCredits;
};

/**
 * Get transaction history, sorted by date descending.
 */
export const getCreditTransactions = (): CreditTransaction[] => {
  return [...transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

/**
 * Check if user has enough credits for a scan tier.
 */
export const hasCreditsFor = (tier: ScanTier): boolean => {
  const cost = SCAN_CREDIT_COSTS[tier];
  return getAvailableCredits() >= cost;
};

/**
 * Get cost for a scan tier.
 */
export const getCostForTier = (tier: ScanTier): number => {
  return SCAN_CREDIT_COSTS[tier];
};

// =============================================================================
// MUTATIONS
// =============================================================================

const generateTransactionId = (): string => {
  return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Use credits for a scan.
 * Returns false if insufficient credits.
 */
export const useCreditsForScan = (
  tier: ScanTier,
  scanReportId?: string
): boolean => {
  const cost = SCAN_CREDIT_COSTS[tier];

  if (cost === 0) return true; // Free scan

  const available = getAvailableCredits();
  if (available < cost) return false;

  // Deduct from bonus credits first, then regular
  let remaining = cost;
  if (creditBalance.bonusCredits > 0) {
    const bonusUsed = Math.min(creditBalance.bonusCredits, remaining);
    creditBalance.bonusCredits -= bonusUsed;
    remaining -= bonusUsed;
  }
  creditBalance.credits -= remaining;
  creditBalance.totalUsed += cost;
  creditBalance.updatedAt = new Date().toISOString();

  // Log transaction
  transactions.push({
    id: generateTransactionId(),
    type: 'use',
    amount: -cost,
    description: `Detailed image scan`,
    createdAt: new Date().toISOString(),
    scanReportId,
  });

  return true;
};

/**
 * Add credits from a purchase (stub).
 * In production, this would be called after Stripe payment confirmation.
 */
export const addPurchasedCredits = (
  packageId: string,
  _paymentIntentId?: string
): boolean => {
  const pkg = CREDIT_PACKAGES.find(p => p.id === packageId);
  if (!pkg) return false;

  creditBalance.credits += pkg.credits;
  creditBalance.totalPurchased += pkg.credits;
  creditBalance.updatedAt = new Date().toISOString();

  transactions.push({
    id: generateTransactionId(),
    type: 'purchase',
    amount: pkg.credits,
    description: `Purchased ${pkg.name}`,
    createdAt: new Date().toISOString(),
  });

  return true;
};

/**
 * Add bonus credits (e.g., from referral, promo code).
 */
export const addBonusCredits = (amount: number, reason: string): void => {
  creditBalance.bonusCredits += amount;
  creditBalance.updatedAt = new Date().toISOString();

  transactions.push({
    id: generateTransactionId(),
    type: 'bonus',
    amount,
    description: reason,
    createdAt: new Date().toISOString(),
  });
};

/**
 * Refund credits for a failed scan or error.
 */
export const refundCredits = (amount: number, reason: string): void => {
  creditBalance.credits += amount;
  creditBalance.totalUsed -= amount;
  creditBalance.updatedAt = new Date().toISOString();

  transactions.push({
    id: generateTransactionId(),
    type: 'refund',
    amount,
    description: reason,
    createdAt: new Date().toISOString(),
  });
};

// =============================================================================
// RESET (for testing)
// =============================================================================

/**
 * Reset credit store to initial state (for testing).
 */
export const resetCreditStore = (): void => {
  creditBalance = {
    credits: 10,
    bonusCredits: 0,
    totalPurchased: 0,
    totalUsed: 0,
    updatedAt: new Date().toISOString(),
  };
  transactions = [];
};
