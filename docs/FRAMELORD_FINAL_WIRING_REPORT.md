# FrameLord Final Wiring Report

**Generated**: 2025-12-11
**Status**: Beta Pre-Flight Check Complete

---

## Executive Summary

FrameLord is a multi-tenant AI-powered authority diagnostics platform with:
- Full authentication system (mock, production-ready architecture)
- Stripe billing integration with plan gating
- Multi-view CRM dashboard with Contact Zero spine
- Calendar integration service (stubbed for OAuth)
- Savage Mode toggle with audio feedback

All core systems are wired and functional for beta launch.

---

## 1. Authentication System

**File**: `src/services/authStore.ts`

### Status: COMPLETE

| Feature | Status | Notes |
|---------|--------|-------|
| Email login (mock) | ✅ | `loginWithEmailMock(email, password)` |
| Super Admin dev login | ✅ | `loginAsSuperAdminDev()` - localhost only |
| Logout | ✅ | Clears all auth state |
| Session persistence | ✅ | localStorage: `framelord_auth` |
| Role checking | ✅ | `isPlatformStaff()`, `isSuperAdmin()`, `isTenantAdmin()` |
| Reactive subscriptions | ✅ | `subscribeAuth(callback)` |

### User Scope Model

```typescript
interface UserScope {
  userId: string;
  tenantId: string;
  tenantRole: 'OWNER' | 'MANAGER' | 'MEMBER' | 'VIEWER';
  staffRole: 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE' | 'SUPPORT' | 'NONE';
  tenantContactZeroId: string;
}
```

### Integration Points

- `App.tsx`: Auth state tracking, login/logout navigation
- `Dashboard.tsx`: `effectiveUserScope` for admin portal access
- `SettingsView.tsx`: Profile management
- `PlatformAdminPortal.tsx`: SUPER_ADMIN gating

---

## 2. Billing System

### Files
- `src/services/billingStore.ts` - State management
- `src/config/planConfig.ts` - Plan tiers and feature gating
- `src/api/stripeApi.ts` - Frontend API
- `src/api/stripeWebhook.ts` - Webhook handler

### Status: COMPLETE

| Feature | Status | Notes |
|---------|--------|-------|
| Plan tiers (beta) | ✅ | beta_free, beta_plus, ultra_beta, enterprise_beta |
| Plan tiers (production) | ✅ | basic ($29), pro ($79), elite ($199) |
| Feature gating | ✅ | 28 feature keys with tier requirements |
| Usage quotas | ✅ | FrameScan, AI queries, contacts, call minutes |
| Checkout sessions | ✅ | Stripe integration with stub mode for dev |
| Customer portal | ✅ | Self-service billing management |
| Webhook processing | ✅ | Idempotent event handling |
| localStorage persistence | ✅ | Key: `framelord_billing` |

### Plan Tier Hierarchy

```
Level 0: beta_free
Level 1: beta_plus / basic ($29/mo)
Level 2: ultra_beta / pro ($79/mo)
Level 3: enterprise_beta / elite ($199/mo)
```

### Key Gating Functions

```typescript
canUseFeature(plan, featureKey)  // Check feature access
canUseFrameScan(tenantId)        // FrameScan access
canUseCallAnalyzer(tenantId)     // Call analyzer access
canUseCalendarIntegration(tenantId) // Calendar sync access
```

### Environment Variables Required

```bash
VITE_STRIPE_PUBLIC_KEY=pk_xxx    # Client-side
STRIPE_SECRET_KEY=sk_xxx         # Server-side only
STRIPE_WEBHOOK_SECRET=whsec_xxx  # Webhook verification
```

---

## 3. Navigation System

### App-Level Views (`App.tsx`)

| View | Description | Access |
|------|-------------|--------|
| `landing` | Customer marketing page | DEFAULT |
| `login` | Authentication page | Public |
| `dashboard` | CRM OS interface | Gated by Tier 1 intake |
| `intake` | Tier 1 gateway flow | Required before dashboard |
| `application` | Coaching application | Public |
| `beta` | Beta program application | Public |
| `booking` | Session booking | Coming soon |

### Dashboard Views (`Dashboard.tsx`)

| View | Component | Description |
|------|-----------|-------------|
| `OVERVIEW` | DashboardOverview | Contact Zero home |
| `DOSSIER` | ContactDossierView | Full contact record |
| `NOTES` | AffineNotes | BlockSuite editor with PARA |
| `SCAN` | ScanView | Frame analysis interface |
| `FRAMESCAN` | FrameScanPage | Report list |
| `WANTS` | WantsPage | Goal tracking system |
| `GRAPH` | FrameGraphView | Contact relationships |
| `CONTACTS` | ContactsView | Contact management |
| `TASKS` | TasksView | Task list by contact |
| `CALENDAR` | CalendarView | Monthly view (task-driven) |
| `ACTIVITY` | ActivityView | Interaction timeline |
| `SETTINGS` | SettingsView | User preferences |
| `PLATFORM_ADMIN` | PlatformAdminPortal | Staff only |

### Contact Zero Access

1. **Left sidebar** → "Contact Zero" nav item → DOSSIER view
2. **ContactZeroView** component with quick actions:
   - Navigate to Tasks
   - Navigate to Wants
   - Navigate to FrameScan
   - Navigate to Contacts
   - Navigate to Calendar

### Settings Tabs

| Tab | Features |
|-----|----------|
| Profile | Name, email, phone, company, social links |
| Billing | Plan display, usage quotas, upgrade options |
| Appearance | Dark/light theme, compact mode |
| Notifications | Email preferences, system log settings |
| Integrations | API keys, Google Calendar linking |
| Privacy | Data sharing, analytics preferences |
| Help | Documentation and resources |

---

## 4. Calendar Integration

**File**: `src/services/calendarIntegrationService.ts`

### Status: STUB IMPLEMENTATION (Production-Ready Architecture)

| Feature | Status | Notes |
|---------|--------|-------|
| Plan gating | ✅ | Requires beta_plus+ |
| Google Calendar | ✅ | Primary provider (OAuth stubbed) |
| Outlook Calendar | ⏳ | Coming soon |
| Apple Calendar | ⏳ | Coming soon |
| Connection state management | ✅ | localStorage persistence |
| Sync toggle | ✅ | Enable/disable sync |
| Reactive subscriptions | ✅ | `subscribeCalendarIntegration()` |

### Connection Flow (Stubbed)

```typescript
connectCalendar(provider, options)  // 1s simulated OAuth delay
disconnectCalendar(provider)        // Immediate
syncAllCalendars()                  // 500ms delay, returns mock count
```

---

## 5. Savage Mode

**File**: `src/stores/savageModeStore.ts`

### Status: COMPLETE

| Feature | Status | Notes |
|---------|--------|-------|
| Toggle state | ✅ | localStorage: `framelord_savage_mode` |
| CSS class management | ✅ | `.savage-mode` on document root |
| Audio playback | ✅ | Lightsaber sound on enable |
| Prompt modifier | ✅ | Harsh feedback for Little Lord |
| Accent color helpers | ✅ | Blue → Red color shift |
| Reactive subscriptions | ✅ | `useSyncExternalStore` compatible |

### Audio Integration

- Sound file: `/public/lightsaber-ignition-6816.mp3`
- Volume: 50%
- Plays on enable only (not disable)
- Graceful fallback if audio blocked

---

## 6. Wants Module

### Status: COMPLETE (Minor UI fixes applied)

| Component | Status | Notes |
|-----------|--------|-------|
| WantsPage | ✅ | Main container with nav tabs |
| WantBoardView | ✅ | DnD-kit kanban board |
| WantDetailView | ✅ | Full want dashboard |
| WantStepsBoardView | ✅ | Per-want steps kanban |
| WantTrackingBoard | ✅ | Daily metrics grid |
| WantProgressView | ✅ | Progress charts and stats |
| ConfigureWantsPanel | ✅ | Metrics configuration |

### UI Fixes Applied (2025-12-11)

1. **Button visibility fix**: Changed toggle buttons from `variant="ghost"` to `variant="brand-outline"` for consistent blue text visibility
   - `WantDetailView.tsx`: Kanban/List toggle
   - `WantProgressView.tsx`: Grid/Timeline toggle
   - `WantDetailView.tsx`: Add Metric button

---

## 7. Pre-Launch Checklist

### Code Quality
- [x] Build passes (`npm run build` - 6.78s)
- [x] No blocking TypeScript errors
- [x] Auth system wired to App.tsx and Dashboard.tsx
- [x] Billing section in Settings functional
- [x] Admin portal access gated by SUPER_ADMIN role

### Stripe Configuration (Required for Production)
- [ ] Create Stripe account
- [ ] Create Products: Basic ($29), Pro ($79), Elite ($199)
- [ ] Update price IDs in `src/config/planConfig.ts`
- [ ] Configure webhook endpoint: `/api/stripe/webhook`
- [ ] Test checkout flow in Stripe test mode

### Environment Variables
- [x] `.env.example` template exists
- [ ] Copy to `.env` and fill in API keys:
  - `VITE_OPENAI_API_KEY` (required)
  - `VITE_STRIPE_PUBLIC_KEY` (for billing)
  - `STRIPE_SECRET_KEY` (server-side)
  - `STRIPE_WEBHOOK_SECRET` (webhooks)

### Deployment (Vercel)
- [ ] Create `/api/stripe/webhook.ts` using template in `stripeWebhook.ts`
- [ ] Set environment variables in Vercel dashboard
- [ ] Configure webhook URL in Stripe to production domain

---

## 8. File Reference

### Core Systems
| System | File |
|--------|------|
| Auth Store | `src/services/authStore.ts` |
| Billing Store | `src/services/billingStore.ts` |
| Plan Config | `src/config/planConfig.ts` |
| Stripe API | `src/api/stripeApi.ts` |
| Stripe Webhook | `src/api/stripeWebhook.ts` |
| Calendar Integration | `src/services/calendarIntegrationService.ts` |
| Savage Mode | `src/stores/savageModeStore.ts` |

### Navigation
| Component | File |
|-----------|------|
| App Router | `src/App.tsx` |
| Dashboard Router | `src/components/Dashboard.tsx` |
| Settings View | `src/components/crm/SettingsView.tsx` |
| Login Page | `src/components/auth/LoginPage.tsx` |

### Wants Module
| Component | File |
|-----------|------|
| Wants Page | `src/components/wants/WantsPage.tsx` |
| Want Detail View | `src/components/wants/WantDetailView.tsx` |
| Want Board View | `src/components/wants/WantBoardView.tsx` |
| Want Progress View | `src/components/wants/WantProgressView.tsx` |
| Want Tracking Board | `src/components/wants/WantTrackingBoard.tsx` |

---

## 9. Known Issues / Notes

### Non-Blocking
- `_legacy/` folder has module resolution errors (deprecated code)
- Chunk size warning (4.8MB) - code splitting recommended for production
- Some dynamic import warnings - not affecting functionality

### Clarification Needed
- "Erroneous box" in Wants module - user reported a UI element appearing incorrectly but no specific component identified. May require screenshot to diagnose.

---

## 10. Post-Launch Tasks

- [ ] Monitor Stripe webhook delivery
- [ ] Set up billing alerts email
- [ ] Configure error monitoring (Sentry)
- [ ] Set up analytics tracking
- [ ] Create user onboarding flow
- [ ] Implement actual OAuth for calendar providers

---

**Report Generated By**: Claude Code
**Branch**: `feature/obsidian-graph-module`
