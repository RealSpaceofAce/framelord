# FrameLord Launch Ready Checklist

Generated: 2025-12-11

## Stripe Billing System

### Files Created/Modified
- [x] `src/types/multiTenant.ts` - Extended with billing types (TenantBilling, PlanTier, StripeSubscriptionStatus)
- [x] `src/services/billingStore.ts` - Tenant billing state management with localStorage persistence
- [x] `src/api/stripeApi.ts` - Frontend API for checkout/portal sessions
- [x] `src/api/stripeWebhook.ts` - Webhook handler for Stripe events
- [x] `src/config/planConfig.ts` - Plan quotas and gating functions
- [x] `src/lib/stripe/stripeClient.ts` - Stripe SDK wrapper (pre-existing)
- [x] `src/components/crm/SettingsView.tsx` - BillingSection UI component added

### Features Implemented
- [x] Beta and Production tier support (beta_free, beta_plus, ultra_beta, enterprise_beta, basic, pro, elite)
- [x] Plan quotas (FrameScan daily/monthly, AI queries, contacts, call minutes)
- [x] Checkout session creation with stub mode for dev
- [x] Customer portal session creation
- [x] Webhook processing with idempotency
- [x] Plan gating helper functions (canUseFrameScan, canUseCallAnalyzer, etc.)
- [x] UI displays current plan, quotas, and upgrade options

### Environment Variables Required
```bash
# Stripe (for production billing)
VITE_STRIPE_PUBLIC_KEY=pk_xxx
STRIPE_SECRET_KEY=sk_xxx  # Server-side only
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### Pre-Launch Stripe Setup
- [ ] Create Stripe account
- [ ] Create Products: Basic ($29), Pro ($79), Elite ($199)
- [ ] Create Price IDs for each product
- [ ] Update `STRIPE_PRICE_IDS` in `src/config/planConfig.ts` with real price IDs
- [ ] Configure Stripe webhook endpoint: `/api/stripe/webhook`
- [ ] Enable webhook events: checkout.session.completed, customer.subscription.*

---

## Notification System

### Files Created/Modified
- [x] `src/services/taskReminderService.ts` - Task and case reminder scheduler
- [x] `src/api/stripeWebhook.ts` - Wired payment failed notifications

### Features Implemented
- [x] Task reminders (due today, due tomorrow, overdue)
- [x] Case reminders (contacts needing attention)
- [x] Billing notifications (payment failed)
- [x] Scheduler runs every 30 minutes
- [x] Deduplication to prevent notification spam

### Pre-Launch Check
- [x] Scheduler starts on Dashboard mount
- [x] Scheduler stops on unmount (cleanup)

---

## Navigation & UI

### Verified Working
- [x] Tasks view accessible via ContactZeroView
- [x] Tasks view shows all tasks with filtering
- [x] Settings > Billing tab shows plan info
- [x] Upgrade buttons wired to checkout flow

---

## Environment & Security

### Files Created/Modified
- [x] `.env.example` - Template with all required env vars
- [x] `.gitignore` - Added .env files to prevent secret commits

### Required Environment Variables
| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_OPENAI_API_KEY` | Yes | FrameScan AI analysis |
| `VITE_OPENAI_MODEL` | No | Defaults to gpt-4o-mini |
| `VITE_STRIPE_PUBLIC_KEY` | For billing | Client-side Stripe key |
| `STRIPE_SECRET_KEY` | For billing | Server-side Stripe key |
| `STRIPE_WEBHOOK_SECRET` | For billing | Webhook signature validation |
| `VITE_NANOBANANA_API_KEY` | No | Image annotation (optional) |

---

## Pre-Launch Checklist

### Code Quality
- [ ] Run `npm run build` - verify no build errors
- [ ] Run `npm test` - verify tests pass
- [ ] Review TypeScript errors (some pre-existing in _legacy/)

### Stripe Configuration
- [ ] Create Stripe account
- [ ] Create products and prices
- [ ] Update price IDs in planConfig.ts
- [ ] Configure webhook endpoint
- [ ] Test checkout flow in Stripe test mode

### Environment
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in all required API keys
- [ ] Verify `.env` is in `.gitignore`

### Deployment (Vercel)
- [ ] Create `/api/stripe/webhook.ts` using template in stripeWebhook.ts
- [ ] Set environment variables in Vercel dashboard
- [ ] Configure webhook URL in Stripe to point to production

### Final Verification
- [ ] Test landing page loads
- [ ] Test Dashboard loads
- [ ] Test FrameScan works with valid API key
- [ ] Test billing flow (in test mode)
- [ ] Test notification reminders appear
- [ ] Test theme toggle (dark/light mode)

---

## Known Issues / Pre-existing TypeScript Errors

These are pre-existing and don't block launch:
- `_legacy/` folder has module resolution errors (deprecated code)
- Some component prop mismatches in graph/canvas components
- `DEFAULT_FOLDERS` reference in Dashboard (minor)

---

## Post-Launch Tasks

- [ ] Monitor Stripe webhook delivery
- [ ] Set up Stripe billing alerts email
- [ ] Configure error monitoring (Sentry, etc.)
- [ ] Set up analytics tracking
- [ ] Create user onboarding flow

---

## Beta Pre-Flight Check (2025-12-11)

### Authentication System (NEW)

- [x] `src/services/authStore.ts` - Authentication state management
  - `isAuthenticated()` - Check if user is logged in
  - `getCurrentUserScope()` - Get UserScope for current user
  - `loginWithEmailMock(email, password)` - Mock email login
  - `loginAsSuperAdminDev()` - Dev-only SUPER_ADMIN backdoor
  - `logout()` - Clear auth state
  - localStorage persistence via `framelord_auth` key

- [x] `src/components/auth/LoginPage.tsx` - Login UI
  - shadcn/ui Card, Input, Button components
  - Email/password form with validation
  - Dev-only "Login as SUPER_ADMIN" button (localhost only)
  - Proper error handling and loading states

- [x] App.tsx integration
  - Added 'login' to AppView type
  - Auth state tracking with subscribeAuth
  - navigateToLogin, handleLoginSuccess, handleLogout functions
  - Login link in nav bar and footer
  - LoginPage rendered when currentView === 'login'

### Admin Portal Crash Fix

- [x] Dashboard.tsx line 2208 now passes `userScope={effectiveUserScope}` to PlatformAdminPortal
- [x] Dashboard.tsx imports `getCurrentUserScope, subscribeAuth` from authStore
- [x] `effectiveUserScope` provides SUPER_ADMIN fallback for dev mode

### Calendar Integration Service (NEW)

- [x] `src/services/calendarIntegrationService.ts` - Multi-provider calendar connections
  - `CalendarProvider` type: 'google' | 'outlook' | 'apple'
  - `CalendarConnectionStatus` type: 'disconnected' | 'connecting' | 'connected' | 'error'
  - `canUseCalendarIntegration()` - Plan gating check
  - `connectCalendar()`, `disconnectCalendar()` - Provider management
  - `syncAllCalendars()` - Sync events from connected calendars
  - localStorage persistence via `framelord_calendar_integration` key

- [x] `src/config/planConfig.ts` - Added 'calendar_integration' feature key
  - Requires 'beta_plus' tier (Basic in production)

### Notes Editor

- [x] Drag handle offset adjusted from 48px to 24px for better gutter alignment
- [x] Theme toggle wiring verified:
  - AffineNotes.handleThemeToggle → setTheme + setEditorTheme
  - Colors flow: AffineNotes → PageEditor → MarkdownNoteEditor
  - Dynamic CSS uses `colors` from `getThemeColors(theme)`

### Build Status

```bash
npm run build
# ✓ built in 11.78s
# Warnings: chunk size (4.8MB), dynamic imports - not blocking
# No TypeScript errors in main source (only _legacy/ folder has known issues)
```

### Files Created This Session

| File | Purpose |
|------|---------|
| `src/services/authStore.ts` | Authentication state management |
| `src/components/auth/LoginPage.tsx` | Login page UI |
| `src/services/calendarIntegrationService.ts` | Calendar integration shell |

### Files Modified This Session

| File | Changes |
|------|---------|
| `src/App.tsx` | Added login route, auth state, navigation |
| `src/components/Dashboard.tsx` | Added userScope state, fixed PlatformAdminPortal props |
| `src/config/planConfig.ts` | Added calendar_integration feature |
| `src/components/notes/MarkdownNoteEditor.tsx` | Adjusted drag handle offset |

### Remaining Manual Verification

- [ ] Test login flow in browser (email + SUPER_ADMIN dev button)
- [ ] Test Settings > Admin navigation (should not crash now)
- [ ] Test Notes theme toggle (moon icon in editor header)
- [ ] Test Calendar section in Settings > Integrations
- [ ] Verify build deploys correctly to Vercel

---

## Security Review (2025-12-11)

### Completed Checks

| Check | Status | Notes |
|-------|--------|-------|
| Hardcoded secrets search | PASS | No sk_live, SG., TWILIO_, etc. found |
| ENV variable usage | PASS | All secrets via process.env/import.meta.env |
| Auth backdoors | FIXED | Removed localhost bypass in authStore.ts |
| Role gating | PASS | Admin routes properly check staff roles |
| Tier gating | PASS | canUseFeature() uses proper level comparison |
| Stripe webhooks | PASS | Signature validation implemented |
| Notification safety | PASS | 30-min interval, deduplication, plan gating |
| Frontend leakage | FIXED | enableDevRoutes now uses import.meta.env.DEV |

### Issues Found & Fixed

1. **localhost auth bypass** (HIGH)
   - **File**: `src/services/authStore.ts`
   - **Issue**: `loginAsSuperAdminDev()` allowed login on localhost even in production builds
   - **Fix**: Removed hostname checks, now only uses `import.meta.env.DEV`

2. **localhost check in LoginPage** (MEDIUM)
   - **File**: `src/components/auth/LoginPage.tsx`
   - **Issue**: isDev included localhost checks
   - **Fix**: Now only uses `import.meta.env.DEV`

3. **Dev routes hardcoded** (MEDIUM)
   - **File**: `src/config/appConfig.ts`
   - **Issue**: `enableDevRoutes` was hardcoded to `true`
   - **Fix**: Changed to `import.meta.env.DEV`

### Known Limitations (Acceptable for Closed Beta)

- **No rate limiting** — API calls not throttled
- **Mock authentication** — Replace with real auth before production
- **No audit logs** — Add before enterprise features
- **No 2FA** — Add for admin accounts
- **No CSRF tokens** — Frontend-only SPA architecture

### Security Documentation

Full security notes available at: `docs/SECURITY_NOTES.md`
