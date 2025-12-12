# FrameLord Notification System

This document describes the notification layer for FrameLord, supporting email (SendGrid), SMS (Twilio), and in-app notifications.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        APPLICATION LAYER                                │
├────────────────────────┬───────────────────┬────────────────────────────┤
│  IntakeFlow            │  BetaProgramStore │  Future Flows              │
│  - onIntakeCompleted() │  - updateStatus() │  - call reminders          │
│  - onTier2Completed()  │  - beta accept    │  - task reminders          │
│                        │  - beta reject    │  - frame alerts            │
└────────────────────────┴───────────────────┴────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    NOTIFICATION SERVICE (Central)                        │
│  src/services/notificationService.ts                                    │
│                                                                         │
│  • notifyUser(user, type, payload)                                      │
│  • notifyContact(contact, type, payload, senderPlan)                    │
│  • scheduleCaseCallReminder()                                           │
│  • runRemindersDueNow()                                                 │
└───────────────────────┬─────────────┬─────────────┬─────────────────────┘
                        │             │             │
                        ▼             ▼             ▼
              ┌─────────────┐ ┌─────────────┐ ┌───────────────┐
              │   EMAIL     │ │    SMS      │ │   IN-APP      │
              │  (SendGrid) │ │  (Twilio)   │ │ (Local Store) │
              └─────────────┘ └─────────────┘ └───────────────┘
```

---

## Configuration

### Environment Variables

Set these in your `.env` file:

```bash
# SendGrid Email
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=no-reply@framelord.app
SENDGRID_FROM_NAME=FrameLord

# Optional: SendGrid Dynamic Template IDs
SENDGRID_TEMPLATE_WELCOME=d-xxxxxxxxxx
SENDGRID_TEMPLATE_INTAKE_COMPLETED=d-xxxxxxxxxx
SENDGRID_TEMPLATE_BETA_ACCEPTED=d-xxxxxxxxxx
SENDGRID_TEMPLATE_BETA_REJECTED=d-xxxxxxxxxx
SENDGRID_TEMPLATE_CASE_CALL_REMINDER=d-xxxxxxxxxx

# Twilio SMS
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxx
TWILIO_FROM_NUMBER=+15551234567

# Feature Flags
ENABLE_EMAIL=true       # false to stub email sending
ENABLE_SMS=true         # false to stub SMS sending
ENABLE_IN_APP=true      # false to disable in-app notifications
```

### Configuration File

The notification config is at `src/config/notificationConfig.ts`:

```typescript
import { getNotificationFlags } from '../config/notificationConfig';

const flags = getNotificationFlags();
// { emailEnabled: boolean, smsEnabled: boolean, inAppEnabled: boolean }
```

---

## Notification Types

| Type | Email | SMS | In-App | Plan Gate |
|------|-------|-----|--------|-----------|
| `welcome` | ✓ | | ✓ | None |
| `intake_completed` | ✓ | | ✓ | None |
| `beta_accepted` | ✓ | ✓ | ✓ | None |
| `beta_rejected` | ✓ | | | None |
| `case_call_reminder` | ✓ | ✓ | ✓ | `case_call_reminders` (beta_plus) |
| `task_reminder` | ✓ | | ✓ | `task_reminders` (beta_free) |
| `frame_alert` | | | ✓ | None |

---

## Usage

### Sending User Notifications

```typescript
import { notifyUser, type UserForNotification } from '../services/notificationService';

const user: UserForNotification = {
  id: 'user_123',
  email: 'user@example.com',
  fullName: 'Jane Doe',
  firstName: 'Jane',
  tenantId: 'tenant_001',
  planTier: 'beta_plus', // Controls SMS access
  phone: '+15551234567',
  smsOptIn: true,
};

// Send intake completed notification
const result = await notifyUser(user, 'intake_completed');
console.log(result.overallSuccess); // true if at least one channel succeeded
```

### Sending Contact Notifications

```typescript
import { notifyContact, type ContactForNotification } from '../services/notificationService';

const contact: ContactForNotification = {
  id: 'contact_456',
  fullName: 'John Smith',
  email: 'john@example.com',
  phone: '+15559876543',
  smsOptIn: true,
};

// Send case call reminder
const result = await notifyContact(
  contact,
  'case_call_reminder',
  {
    callDetails: {
      scheduledAt: '2025-01-15T14:00:00Z',
      contactName: 'Jane Doe',
      notes: 'Discuss Q1 strategy',
    },
  },
  'beta_plus' // Sender's plan tier for gating
);
```

### Scheduling Reminders

```typescript
import { scheduleCaseCallReminder, runRemindersDueNow } from '../services/notificationService';
import { getContactById } from '../services/contactStore';

// Schedule a reminder
const reminder = scheduleCaseCallReminder(
  'contact_456',
  {
    scheduledAt: '2025-01-15T14:00:00Z',
    contactName: 'Jane Doe',
  },
  '2025-01-15T13:30:00Z' // Remind 30 mins before
);

// Later: Run due reminders (e.g., via cron)
const results = await runRemindersDueNow(getContactById, 'beta_plus');
console.log(`Processed: ${results.processed}, Succeeded: ${results.succeeded}`);
```

---

## Plan Tier Gating

SMS notifications and certain features require higher plan tiers:

| Feature Key | Required Tier |
|-------------|---------------|
| `sms_notifications` | `beta_plus` |
| `case_call_reminders` | `beta_plus` |
| `task_reminders` | `beta_free` |

```typescript
import { canUseFeature } from '../config/planConfig';

if (canUseFeature('beta_plus', 'sms_notifications')) {
  // User can receive SMS
}
```

---

## Files Reference

| File | Purpose |
|------|---------|
| `src/config/notificationConfig.ts` | Env vars, feature flags, provider config |
| `src/services/notificationService.ts` | Central notification abstraction |
| `src/lib/email/emailClient.ts` | SendGrid wrapper |
| `src/lib/email/emailTemplates.ts` | Email HTML templates and send functions |
| `src/lib/sms/smsClient.ts` | Twilio REST API wrapper |
| `src/lib/sms/smsTemplates.ts` | SMS message templates |
| `src/stores/userNotificationStore.ts` | In-app notification storage |
| `src/config/planConfig.ts` | Feature gating (includes notification features) |

---

## Server-Side Only

**Important**: Email and SMS clients are designed for server-side use only. They will gracefully degrade when called from the client:

- Email: Returns `{ success: false, error: 'Email sending only available server-side' }`
- SMS: Returns `{ success: false, error: 'SMS sending only available server-side' }`

In production, notification triggers should go through server-side API routes.

---

## Graceful Degradation

The notification system is designed to work without API keys:

1. **No SENDGRID_API_KEY**: Logs email content to console, returns stub success
2. **No TWILIO_* vars**: Logs SMS to console, returns stub success
3. **Client-side calls**: Returns stub results, logs warnings
4. **Contact without email/phone**: Skips that channel, tries others
5. **SMS without opt-in**: Skips SMS, falls back to email/in-app

This allows development without configuring external services.

---

## Testing Notifications

In development, all notifications log to console by default. To test real sending:

1. Set `ENABLE_EMAIL=true` and configure SendGrid
2. Set `ENABLE_SMS=true` and configure Twilio
3. Ensure code runs server-side (or via API route)

Check the browser console or server logs for:
- `[EmailClient] ...`
- `[SmsClient] ...`
- `[NotificationService] ...`

---

## Future Enhancements

- [ ] Email tracking (open/click webhooks)
- [ ] SMS delivery status webhooks
- [ ] Batch notification sending
- [ ] Notification preferences UI
- [ ] Digest emails (daily/weekly summaries)
- [ ] Push notifications (web/mobile)
