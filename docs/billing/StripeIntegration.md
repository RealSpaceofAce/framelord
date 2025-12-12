# FrameLord Stripe Integration

This document describes the Stripe subscription billing system for FrameLord.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           CLIENT                                        │
├─────────────────────────────────────────────────────────────────────────┤
│  Pricing Page         │  Settings/Billing    │  Upgrade Prompts        │
│  - Plan comparison    │  - Current plan      │  - Feature gates        │
│  - Subscribe CTA      │  - Manage billing    │  - Upgrade modals       │
└───────────┬───────────┴──────────┬───────────┴───────────┬──────────────┘
            │                      │                       │
            ▼                      ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         API ROUTES                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  /api/checkout        │  /api/portal         │  /api/webhooks/stripe   │
│  - Create session     │  - Create portal     │  - Handle events        │
│  - Return URL         │  - Return URL        │  - Update subscription  │
└───────────┬───────────┴──────────┬───────────┴───────────┬──────────────┘
            │                      │                       │
            ▼                      ▼                       ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      STRIPE CLIENT                                      │
│  src/lib/stripe/stripeClient.ts                                        │
│                                                                         │
│  • createCheckoutSession()                                              │
│  • createPortalSession()                                                │
│  • verifyWebhookSignature()                                             │
│  • getSubscription() / cancelSubscription()                             │
└─────────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
                          ┌───────────────┐
                          │    STRIPE     │
                          │     API       │
                          └───────────────┘
```

---

## Configuration

### Environment Variables

```bash
# Stripe API Keys
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxx          # Secret key (server only)
VITE_STRIPE_PUBLIC_KEY=pk_test_xxxxxxxxxxxxx     # Public key (client)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx        # Webhook signing secret

# Stripe Price IDs (create in Stripe dashboard)
STRIPE_PRICE_BASIC=price_xxxxxxxxxxxxx           # Basic plan ($29/mo)
STRIPE_PRICE_PRO=price_xxxxxxxxxxxxx             # Pro plan ($79/mo)
STRIPE_PRICE_ELITE=price_xxxxxxxxxxxxx           # Elite plan ($199/mo)
```

### Stripe Dashboard Setup

1. **Create Products**:
   - Basic Plan: $29/month
   - Pro Plan: $79/month
   - Elite Plan: $199/month

2. **Create Customer Portal**:
   - Enable in Stripe Dashboard > Settings > Billing > Customer Portal
   - Configure allowed actions (cancel, upgrade/downgrade)

3. **Set Up Webhooks**:
   - Endpoint URL: `https://your-domain.com/api/webhooks/stripe`
   - Events to listen for:
     - `checkout.session.completed`
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`

---

## Plan Tiers

### Production Tiers

| Tier | Price | Level | Key Features |
|------|-------|-------|--------------|
| **Basic** | $29/mo | 1 | Text scans, CRM, basic FrameScore |
| **Pro** | $79/mo | 2 | + Call transcripts, AI coaching, email integration |
| **Elite** | $199/mo | 3 | + API access, team features, priority support |

### Beta to Production Migration

| Beta Tier | Production Tier |
|-----------|-----------------|
| beta_free | basic (special pricing) |
| beta_plus | basic |
| ultra_beta | pro |
| enterprise_beta | elite |

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/config/planConfig.ts` | Plan tiers, levels, pricing, feature gating |
| `src/types/billing.ts` | TypeScript types for billing |
| `src/lib/stripe/stripeClient.ts` | Stripe API wrapper |
| `src/stores/billingStore.ts` | Client-side billing state (TODO) |
| `src/api/checkout.ts` | Checkout session API route (TODO) |
| `src/api/portal.ts` | Customer portal API route (TODO) |
| `src/api/webhooks/stripe.ts` | Webhook handler (TODO) |

---

## API Usage

### Creating a Checkout Session

```typescript
// Server-side only (API route)
import { createCheckoutSession } from '@/lib/stripe/stripeClient';

const result = await createCheckoutSession({
  tenantId: 'tenant_123',
  userId: 'user_456',
  email: 'user@example.com',
  plan: 'pro',
  successUrl: 'https://app.framelord.app/settings/billing?success=true',
  cancelUrl: 'https://app.framelord.app/settings/billing?canceled=true',
});

if (result.success) {
  // Redirect user to result.data.url
}
```

### Creating a Customer Portal Session

```typescript
// Server-side only (API route)
import { createPortalSession } from '@/lib/stripe/stripeClient';

const result = await createPortalSession(
  {
    tenantId: 'tenant_123',
    userId: 'user_456',
    returnUrl: 'https://app.framelord.app/settings/billing',
  },
  'cus_xxxxxxxxxxxxx' // Stripe customer ID
);

if (result.success) {
  // Redirect user to result.data.url
}
```

### Handling Webhooks

```typescript
// Server-side only (API route)
import { verifyWebhookSignature } from '@/lib/stripe/stripeClient';

// In webhook handler:
const event = await verifyWebhookSignature(rawBody, signatureHeader);

if (!event) {
  return { status: 400, body: 'Invalid signature' };
}

switch (event.type) {
  case 'checkout.session.completed':
    // Create subscription record, update user plan
    break;
  case 'customer.subscription.updated':
    // Update subscription status
    break;
  case 'customer.subscription.deleted':
    // Downgrade user to free tier
    break;
  case 'invoice.payment_failed':
    // Send payment failed notification
    break;
}
```

---

## Feature Gating

Use `canUseFeature()` from planConfig to gate features:

```typescript
import { canUseFeature, getCurrentUserPlan } from '@/config/planConfig';

const plan = getCurrentUserPlan(); // Returns user's current tier

if (canUseFeature(plan, 'api_access')) {
  // Show API access UI
} else {
  // Show upgrade prompt
}
```

### Feature to Tier Mapping

| Feature | Required Tier |
|---------|---------------|
| Basic CRM, Tasks, Notes | basic |
| SMS Notifications | basic |
| Network Health, Radar | basic |
| Personality Tests | pro |
| AI Next Move | pro |
| Call Analyzer | elite |
| API Access | elite |
| Team Collaboration | elite |

---

## Database Schema (Future)

When adding persistence, create these tables:

```sql
-- Billing customers (linked to Stripe)
CREATE TABLE billing_customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES users(id),
  stripe_customer_id VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(tenant_id, user_id)
);

-- Subscriptions
CREATE TABLE billing_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES billing_customers(id),
  stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
  stripe_price_id VARCHAR(255) NOT NULL,
  plan VARCHAR(50) NOT NULL, -- basic, pro, elite
  status VARCHAR(50) NOT NULL, -- active, canceled, past_due, etc.
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  trial_end TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook idempotency tracking
CREATE TABLE processed_webhooks (
  event_id VARCHAR(255) PRIMARY KEY, -- Stripe event ID
  event_type VARCHAR(100) NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  result VARCHAR(50) NOT NULL, -- success, error
  error TEXT
);

-- Index for fast lookups
CREATE INDEX idx_subscriptions_customer ON billing_subscriptions(customer_id);
CREATE INDEX idx_subscriptions_status ON billing_subscriptions(status);
CREATE INDEX idx_customers_stripe ON billing_customers(stripe_customer_id);
```

---

## Development Mode

Without Stripe API keys, the system operates in stub mode:

1. **Checkout sessions**: Returns fake session IDs, redirects to success URL
2. **Portal sessions**: Returns mock portal URL
3. **Webhooks**: Parses payload without signature verification

This allows local development without a Stripe account.

---

## Security Considerations

1. **Never expose secret key**: Only use in server-side code
2. **Always verify webhooks**: Check signature in production
3. **Use idempotency keys**: Prevent duplicate processing
4. **Log all billing events**: Audit trail for disputes
5. **Handle payment failures gracefully**: Don't lock users out immediately

---

## Testing

### Stripe Test Cards

| Card Number | Result |
|-------------|--------|
| 4242424242424242 | Successful payment |
| 4000000000000341 | Attaches but fails |
| 4000000000009995 | Insufficient funds |

### Test Webhook Events

Use Stripe CLI to forward events locally:

```bash
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

---

## Implementation Status

- [x] Plan config with production tiers
- [x] Billing types
- [x] Stripe client wrapper
- [ ] Checkout API route
- [ ] Portal API route
- [ ] Webhook handler
- [ ] Billing store
- [ ] Billing UI in Settings
- [ ] Database schema migration
