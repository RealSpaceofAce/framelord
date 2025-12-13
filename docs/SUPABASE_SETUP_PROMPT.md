# Supabase Setup Prompt for Intake Applications

Use this prompt with a Claude that has Supabase MCP access.

---

## Task Overview

Set up Supabase tables, RLS policies, and email notification triggers for FrameLord's beta and case call application system.

## Files Already Prepared

The following files have been created and need to be applied:

### 1. SQL Migration
**File:** `supabase/migrations/20241213_intake_applications.sql`

This migration creates:
- `beta_chat_applications` table
- `case_call_applications` table
- `admin_notification_log` table
- RLS policies for admin-only access
- Triggers for logging notifications
- Adds `staff_role` column to users table (if not exists)

### 2. Updated Stores (Supabase versions)
**Files:**
- `src/stores/betaChatApplicationStore.supabase.ts`
- `src/stores/caseCallApplicationStore.supabase.ts`

These are drop-in replacements that use Supabase with localStorage fallback.

### 3. Edge Function for Email Notifications
**File:** `supabase/functions/send-admin-notification/index.ts`

This function sends emails via SendGrid or Resend when new applications are submitted.

---

## Instructions for Claude with Supabase MCP

### Step 1: Run the Migration

Execute the SQL in `supabase/migrations/20241213_intake_applications.sql`:

```sql
-- Run the entire migration file
-- This creates tables, RLS policies, triggers, and notification logging
```

### Step 2: Verify Tables Created

Check that these tables exist:
- `public.beta_chat_applications`
- `public.case_call_applications`
- `public.admin_notification_log`

### Step 3: Verify RLS Policies

Confirm these policies are active:
- `beta_chat_applications`: INSERT for anon/authenticated, SELECT/UPDATE/DELETE for admins only
- `case_call_applications`: INSERT for anon/authenticated, SELECT/UPDATE/DELETE for admins only

### Step 4: Set Admin Email in User Record

Make sure `realaaronernst@gmail.com` has admin access. Either:

Option A: Add to super admin emails in RLS policy (already done in migration)

Option B: Set staff_role in users table:
```sql
UPDATE public.users
SET staff_role = 'SUPER_ADMIN'
WHERE email = 'realaaronernst@gmail.com';
```

### Step 5: Deploy Edge Function

Deploy the email notification function:
```bash
supabase functions deploy send-admin-notification
```

Set required secrets:
```bash
supabase secrets set SENDGRID_API_KEY=your_sendgrid_key
# OR
supabase secrets set RESEND_API_KEY=your_resend_key
```

### Step 6: Set Up Cron Job (Optional)

Create a cron job to process notifications every minute:
```sql
SELECT cron.schedule(
  'process-admin-notifications',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/send-admin-notification',
    headers := '{"Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb
  )
  $$
);
```

### Step 7: Replace Store Files

After Supabase is set up, replace the localStorage stores:

```bash
# Backup originals
mv src/stores/betaChatApplicationStore.ts src/stores/betaChatApplicationStore.localStorage.ts
mv src/stores/caseCallApplicationStore.ts src/stores/caseCallApplicationStore.localStorage.ts

# Use Supabase versions
mv src/stores/betaChatApplicationStore.supabase.ts src/stores/betaChatApplicationStore.ts
mv src/stores/caseCallApplicationStore.supabase.ts src/stores/caseCallApplicationStore.ts
```

### Step 8: Update Admin Panel to Use Async Functions

The admin panels need to be updated to handle async store functions. Key changes:

```typescript
// Before (synchronous)
const applications = getAllBetaChatApplications();

// After (async)
const [applications, setApplications] = useState<BetaChatApplication[]>([]);
useEffect(() => {
  getAllBetaChatApplications().then(setApplications);
}, []);
```

---

## Testing

### Test Public Submission
1. Go to `/beta` and complete the chat
2. Check Supabase `beta_chat_applications` table for new row
3. Check `admin_notification_log` for notification entry

### Test Admin Access
1. Log in as `realaaronernst@gmail.com`
2. Go to Platform Admin > Beta Apps
3. Verify applications are visible

### Test Email Notifications
1. Manually invoke the edge function:
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/send-admin-notification \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```
2. Check email inbox
3. Check `admin_notification_log` for status update

---

## Environment Variables Needed

```env
# .env.local
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Supabase Secrets (for edge functions)
SENDGRID_API_KEY=your-sendgrid-key
# OR
RESEND_API_KEY=your-resend-key
```

---

## Summary of Changes

| Component | Before | After |
|-----------|--------|-------|
| Beta Applications | localStorage | Supabase + localStorage fallback |
| Case Call Applications | localStorage | Supabase + localStorage fallback |
| Admin Notifications | Console log only | Database log + Email via Edge Function |
| Admin Access | Dev mode only | RLS-protected, email allowlist |
