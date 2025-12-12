# Security Notes — FrameLord Beta

**Last Reviewed**: 2025-12-12
**Status**: Cleared for Closed Beta (with remediation required)

---

## CRITICAL: 2025-12-12 Audit Findings

### Issue #1: .env Files Tracked in Git (CRITICAL)

**Status**: REMEDIATED

- `.env` and `.env.local.backup` were accidentally committed to git
- `.env` contained a real OpenAI API key
- **Actions Taken**:
  1. Removed files from git tracking via `git rm --cached`
  2. Updated `.gitignore` to include `.env*.backup`, `.env.production`, `.env.development`
  3. Files remain on disk for local use

**Required User Action**:
- **ROTATE YOUR OPENAI API KEY IMMEDIATELY**
- Go to https://platform.openai.com/api-keys
- Revoke the exposed key and generate a new one

### Issue #2: PII in Console Logs (LOW)

**Status**: Acceptable for Beta

Found PII exposure in server-side logs:
- `authStore.ts:176` - Logs email on login
- `intakeNotificationService.ts:436` - Logs contact name/email

**Recommendation**: Mask PII before GA launch

---

## Authentication Model

### Current Implementation (Mock Auth)
- **Type**: In-memory mock authentication with localStorage persistence
- **File**: `src/services/authStore.ts`
- **Session**: Stored in `framelord_auth` localStorage key

### Auth Functions
| Function | Security Notes |
|----------|----------------|
| `loginWithEmailMock()` | Mock login - any email/password combo works (min 6 chars) |
| `loginAsSuperAdminDev()` | **DEV ONLY** - Gated by `import.meta.env.DEV` |
| `loginWithScope()` | For testing different roles - not exposed in production UI |

### Production Checklist
- [ ] Replace mock auth with real backend (Supabase, Auth0, etc.)
- [ ] Add proper session management with tokens
- [ ] Implement password hashing (bcrypt/argon2)
- [ ] Add rate limiting on login attempts
- [ ] Add MFA support for admin accounts

---

## Role Model

### Staff Roles (Platform-wide)
| Role | Access Level |
|------|--------------|
| `SUPER_ADMIN` | Full platform access, all tenants |
| `ADMIN` | Platform admin features |
| `EMPLOYEE` | Limited admin access |
| `SUPPORT` | Support-only features |
| `NONE` | Regular user |

### Tenant Roles (Per-organization)
| Role | Access Level |
|------|--------------|
| `OWNER` | Full tenant control, billing |
| `MANAGER` | User management, settings |
| `MEMBER` | Standard CRM access |
| `VIEWER` | Read-only access |

### Role Enforcement
- **File**: `src/stores/tenantUserStore.ts`
- SUPER_ADMIN can never be demoted (protected by `SUPER_ADMIN_USER_ID`)
- Only SUPER_ADMIN can assign/revoke ADMIN role
- Platform admin portal requires staff role check

---

## Billing / Webhook Model

### Stripe Integration
- **Files**: `src/lib/stripe/stripeClient.ts`, `src/api/stripeWebhook.ts`
- All Stripe operations use environment variables:
  - `STRIPE_SECRET_KEY` (server-side only)
  - `STRIPE_WEBHOOK_SECRET` (webhook signature verification)
  - `VITE_STRIPE_PUBLIC_KEY` (client-side)

### Webhook Security
- Validates Stripe signature using HMAC-SHA256
- Idempotency tracking prevents duplicate processing
- Only handles specific event types:
  - `checkout.session.completed`
  - `customer.subscription.created/updated/deleted`
  - `invoice.payment_failed/paid`

### Development Mode
- When `STRIPE_SECRET_KEY` is not set, returns stub sessions
- When `STRIPE_WEBHOOK_SECRET` is not set, allows unverified webhooks (dev only)

---

## Notification Model

### Email Provider
- Currently: SendGrid (planned)
- **Env**: `SENDGRID_API_KEY`
- Templates in `src/lib/email/emailTemplates.ts`

### SMS Provider
- Currently: Twilio (planned)
- **Env**: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`
- Templates in `src/lib/sms/smsTemplates.ts`

### Rate Limiting
- Task reminder scheduler runs every 30 minutes
- Duplicate notification prevention via `notificationExistsToday()`
- SMS gated by plan tier (`beta_plus` and above)

---

## Environment Variables

### Required for Production
```bash
# Stripe Billing
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
VITE_STRIPE_PUBLIC_KEY=pk_live_xxx

# Email (SendGrid)
SENDGRID_API_KEY=SG.xxx

# SMS (Twilio)
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_PHONE_NUMBER=+1xxx

# AI Services
VITE_OPENAI_API_KEY=sk-xxx
```

### Configuration Files
- `.env.example` — Template with all variables documented
- `.env` — Local overrides (gitignored)
- `.env.local` — Additional local overrides (gitignored)

---

## Dev Backdoors Status

### Removed/Secured
| Item | Status | Notes |
|------|--------|-------|
| SUPER_ADMIN button | SECURED | Only shown when `import.meta.env.DEV` |
| localhost auth bypass | REMOVED | Was in authStore, now removed |
| Dev routes | SECURED | `enableDevRoutes` now uses `import.meta.env.DEV` |

### Known Dev Features
- FrameReportDemoPage — Only accessible when `enableDevRoutes` is true
- Dev footer links — Gated by `import.meta.env.DEV` in App.tsx

---

## CORS / CSRF Notes

### Current Architecture
- **Frontend-only SPA** — No custom backend server
- All authenticated operations use:
  - Stripe API (token-based)
  - OpenAI API (API key in env)
  - SendGrid/Twilio (API keys in env)

### CSRF Surface
- Limited since all API calls use token-based auth
- Stripe webhooks verified with signatures
- No cookie-based session auth (uses localStorage)

### Future Considerations
- [ ] Add CSRF tokens if implementing custom backend
- [ ] Add request origin validation for webhooks

---

## Security Review Summary

### Issues Found & Fixed
1. **localhost bypass in auth** — Removed hostname checks, now only uses `import.meta.env.DEV`
2. **Dev routes hardcoded** — Changed `enableDevRoutes` to use `import.meta.env.DEV`

### Verified Secure
- No hardcoded API keys or secrets found
- Stripe webhook signature validation implemented
- Plan tier gating properly enforced
- Admin routes require role checks
- Notification services have rate limiting

### Known Limitations (Acceptable for Closed Beta)
1. **No rate limiting on API calls** — Will add before public launch
2. **Mock authentication** — Replace with real auth before production
3. **No audit logs** — Add before enterprise features
4. **No 2FA** — Add for admin accounts before production

---

## File Reference

| File | Security Role |
|------|---------------|
| `src/services/authStore.ts` | Authentication state |
| `src/stores/tenantUserStore.ts` | Role management |
| `src/config/planConfig.ts` | Feature/tier gating |
| `src/lib/stripe/stripeClient.ts` | Stripe API wrapper |
| `src/api/stripeWebhook.ts` | Webhook handler |
| `src/services/notificationService.ts` | Notification routing |
| `src/config/appConfig.ts` | Feature flags |
