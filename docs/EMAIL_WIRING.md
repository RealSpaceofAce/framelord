# Email Wiring Documentation

This document describes the email integration for FrameLord's notification and authentication systems.

---

## Overview

FrameLord uses email for three main purposes:

1. **Admin Notifications** - Alerts when new applications are submitted
2. **User Invitations** - Welcome emails when beta applicants are approved
3. **Authentication** - Magic links, password resets, email verification

---

## Email Provider Options

### SendGrid (Primary)

SendGrid is the primary email provider for transactional emails.

**Setup:**
```bash
supabase secrets set SENDGRID_API_KEY=your_sendgrid_api_key
```

**Required DNS Records:**
- CNAME: `em.framelord.com` → SendGrid verification
- TXT: SPF record allowing SendGrid
- DKIM: SendGrid-provided keys

### Resend (Fallback)

Resend serves as the fallback if SendGrid fails.

**Setup:**
```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key
```

---

## Admin Notification Flow

When a new application is submitted:

```
User submits application
    ↓
Supabase INSERT trigger fires
    ↓
notify_beta_application() or notify_case_call_application()
    ↓
Row inserted into admin_notification_log (status: 'pending')
    ↓
Edge Function (send-admin-notification) picks up pending rows
    ↓
Email sent via SendGrid or Resend
    ↓
admin_notification_log updated (status: 'sent' or 'failed')
```

### Notification Types

| Event Type | Trigger | Recipient |
|------------|---------|-----------|
| `BETA_APPLICATION_SUBMITTED` | Beta chat completed | realaaronernst@gmail.com |
| `CASE_CALL_APPLICATION_SUBMITTED` | Case call form submitted | realaaronernst@gmail.com |
| `INTAKE_SESSION_COMPLETED` | Tier 1/2 intake finished | realaaronernst@gmail.com |

### Edge Function Invocation

**Option 1: Cron Job (Recommended)**
```sql
SELECT cron.schedule(
  'process-admin-notifications',
  '* * * * *',  -- Every minute
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT.supabase.co/functions/v1/send-admin-notification',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  )
  $$
);
```

**Option 2: Database Webhook**
Configure a webhook in Supabase Dashboard to call the edge function on INSERT to `admin_notification_log`.

**Option 3: Manual Invocation**
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/send-admin-notification \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

---

## User Invitation Flow (Beta Approval)

When an admin approves a beta application:

```
Admin clicks "Approve" in Platform Admin
    ↓
updateBetaChatApplicationStatus(id, 'approved')
    ↓
Supabase auth.admin.createUser() called
    ↓
Invitation email sent via Supabase Auth
    ↓
User clicks link → sets password → lands on dashboard
```

### Supabase Auth Email Settings

Configure in Supabase Dashboard → Authentication → Email Templates:

**From Address:** `support@framelord.com`
**From Name:** `FrameLord`

**Invite Template:**
```html
<h2>Welcome to FrameLord</h2>
<p>You've been approved for the FrameLord beta!</p>
<p>Click below to set your password and access the platform:</p>
<p><a href="{{ .ConfirmationURL }}">Set Password & Enter</a></p>
<p>This link expires in 24 hours.</p>
```

**Magic Link Template:**
```html
<h2>Sign in to FrameLord</h2>
<p>Click below to sign in:</p>
<p><a href="{{ .ConfirmationURL }}">Sign In</a></p>
<p>This link expires in 1 hour.</p>
```

---

## Email Configuration Checklist

### Supabase Secrets Required

```bash
# Email providers (at least one required)
supabase secrets set SENDGRID_API_KEY=sg_...
supabase secrets set RESEND_API_KEY=re_...

# Already set by Supabase
# SUPABASE_URL
# SUPABASE_SERVICE_ROLE_KEY
```

### DNS Configuration

| Record Type | Host | Value | Purpose |
|-------------|------|-------|---------|
| TXT | @ | `v=spf1 include:sendgrid.net ~all` | SPF for SendGrid |
| CNAME | `em` | SendGrid verification | Domain verification |
| CNAME | `s1._domainkey` | SendGrid DKIM | Email signing |
| CNAME | `s2._domainkey` | SendGrid DKIM | Email signing |

### Supabase Auth Settings

1. Go to Supabase Dashboard → Authentication → Settings
2. Set **Site URL**: `https://www.framelord.com`
3. Set **Redirect URLs**:
   - `https://www.framelord.com/dashboard`
   - `http://localhost:3001/dashboard` (for dev)
4. Go to Email Templates → customize all templates
5. Set From Address in SMTP settings if using custom SMTP

---

## Testing Emails

### Test Admin Notification

1. Submit a test beta application at `/beta`
2. Check `admin_notification_log` table for pending row
3. Invoke edge function manually:
   ```bash
   curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/send-admin-notification \
     -H "Authorization: Bearer YOUR_ANON_KEY"
   ```
4. Check email inbox
5. Verify `admin_notification_log` status updated to 'sent'

### Test User Invitation

1. Approve a beta application in Platform Admin
2. Check Supabase Auth → Users for new user
3. Check email for invitation
4. Click link, set password
5. Verify login works

### Debug Email Issues

**Check notification log:**
```sql
SELECT * FROM admin_notification_log
ORDER BY created_at DESC
LIMIT 10;
```

**Check for failures:**
```sql
SELECT * FROM admin_notification_log
WHERE status = 'failed'
ORDER BY created_at DESC;
```

**Check edge function logs:**
```bash
supabase functions logs send-admin-notification
```

---

## Error Handling

### SendGrid Failures

The edge function tries SendGrid first, then falls back to Resend:

```typescript
let sent = await sendViaSendGrid(recipient, subject, html);
if (!sent) {
  sent = await sendViaResend(recipient, subject, html);
}
```

### Retry Logic

Failed notifications remain in `pending` or `failed` status. The cron job will retry pending notifications on next run. Failed notifications need manual intervention or a separate retry mechanism.

### Monitoring

Set up alerts for:
- `admin_notification_log` rows with `status = 'failed'`
- Edge function errors in Supabase logs
- Email delivery rate in SendGrid/Resend dashboards

---

## Security Considerations

1. **Service Role Key** - Only used in edge functions (server-side)
2. **Anon Key** - Safe to expose in client, RLS enforces access
3. **Email Content** - Don't include sensitive data in notification emails
4. **Rate Limiting** - SendGrid/Resend have built-in rate limits
5. **Verification** - Use double opt-in for marketing emails (not needed for admin notifications)

---

## Files Reference

| File | Purpose |
|------|---------|
| `supabase/migrations/20241213_intake_applications.sql` | Tables, triggers, RLS |
| `supabase/functions/send-admin-notification/index.ts` | Email sending logic |
| `src/stores/betaChatApplicationStore.supabase.ts` | Beta app CRUD with Supabase |
| `src/stores/caseCallApplicationStore.supabase.ts` | Case call CRUD with Supabase |
| `docs/SUPABASE_SETUP_PROMPT.md` | Setup instructions for Supabase MCP |
