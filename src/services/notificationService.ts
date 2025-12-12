// =============================================================================
// NOTIFICATION SERVICE — Central notification abstraction
// =============================================================================
// Unified interface for sending notifications via email, SMS, or in-app.
// The rest of the app calls this service without knowing about providers.
//
// Features:
// - Automatic channel selection based on notification type
// - Respects user preferences and opt-in status
// - Plan tier gating for advanced notifications
// - Comprehensive logging of all notification attempts
// - Graceful degradation when providers are unavailable
//
// !! This service can be imported anywhere (client or server) !!
// Server-only operations (email/SMS) will gracefully degrade client-side.
// =============================================================================

import { getNotificationFlags, isEmailEnabled, isSmsEnabled } from '../config/notificationConfig';
import { canUseFeature, type PlanTier, type FeatureKey } from '../config/planConfig';
import { addLogEntry } from './systemLogStore';
import { notifyUserInApp } from '../stores/userNotificationStore';

// Import email functions (will gracefully degrade client-side)
import {
  sendWelcomeEmail,
  sendIntakeCompletedEmail,
  sendBetaAcceptedEmail,
  sendBetaRejectedEmail,
  sendCaseCallReminderEmail,
  type UserProfile,
  type CallDetails,
} from '../lib/email/emailTemplates';

// Import SMS functions (will gracefully degrade client-side)
import { sendCaseCallReminderSms, sendBetaOnboardingSms } from '../lib/sms/smsTemplates';
import type { SmsContact } from '../lib/sms/smsClient';

// =============================================================================
// TYPES
// =============================================================================

export type NotificationChannel = 'email' | 'sms' | 'in_app';

export type NotificationType =
  | 'welcome'
  | 'intake_completed'
  | 'beta_accepted'
  | 'beta_rejected'
  | 'case_call_reminder'
  | 'task_reminder'
  | 'frame_alert';

export interface NotificationPayload {
  callDetails?: CallDetails;
  taskTitle?: string;
  taskDueTime?: string;
  relatedContactName?: string;
  customTitle?: string;
  customBody?: string;
}

export interface NotificationResult {
  notificationType: NotificationType;
  channelsAttempted: NotificationChannel[];
  results: {
    channel: NotificationChannel;
    success: boolean;
    error?: string;
    messageId?: string;
  }[];
  overallSuccess: boolean;
  timestamp: string;
}

export interface ContactForNotification {
  id: string;
  fullName: string;
  email?: string;
  phone?: string;
  smsOptIn?: boolean;
}

export interface UserForNotification extends UserProfile {
  id: string;
  tenantId?: string;
  planTier?: PlanTier;
  phone?: string;
  smsOptIn?: boolean;
}

// =============================================================================
// CHANNEL CONFIGURATION
// =============================================================================

/**
 * Default channels for each notification type
 * Order matters: first available channel is preferred
 */
const NOTIFICATION_CHANNELS: Record<NotificationType, NotificationChannel[]> = {
  welcome: ['email', 'in_app'],
  intake_completed: ['email', 'in_app'],
  beta_accepted: ['email', 'in_app'],
  beta_rejected: ['email'],
  case_call_reminder: ['sms', 'email', 'in_app'],
  task_reminder: ['in_app', 'email'],
  frame_alert: ['in_app'],
};

/**
 * Feature keys required for certain notification types
 * If not listed, notification is available to all tiers
 */
const NOTIFICATION_FEATURE_GATES: Partial<Record<NotificationType, FeatureKey>> = {
  case_call_reminder: 'case_call_reminders',
  task_reminder: 'task_reminders',
};

// =============================================================================
// INTERNAL HELPERS
// =============================================================================

/**
 * Check if user's plan allows this notification type
 */
const canSendNotification = (
  planTier: PlanTier | undefined,
  notificationType: NotificationType
): boolean => {
  const featureKey = NOTIFICATION_FEATURE_GATES[notificationType];
  if (!featureKey) return true; // No gate = available to all

  // Default to beta_free if no plan specified
  const plan = planTier || 'beta_free';

  // Use canUseFeature from planConfig for proper tier checking
  return canUseFeature(plan, featureKey);
};

/**
 * Determine which channels to use for a notification
 * Also checks plan tier for channel-specific gating (e.g., SMS requires beta_plus)
 */
const getAvailableChannels = (
  notificationType: NotificationType,
  user: UserForNotification | ContactForNotification,
  planTier?: PlanTier
): NotificationChannel[] => {
  const flags = getNotificationFlags();
  const defaultChannels = NOTIFICATION_CHANNELS[notificationType];
  const available: NotificationChannel[] = [];
  const plan = planTier || ('planTier' in user ? user.planTier : undefined) || 'beta_free';

  for (const channel of defaultChannels) {
    if (channel === 'email') {
      // Email available if enabled and user has email
      if (flags.emailEnabled && 'email' in user && user.email) {
        available.push('email');
      }
    } else if (channel === 'sms') {
      // SMS available if enabled, user has phone, opted in, AND plan allows SMS
      if (
        flags.smsEnabled &&
        user.phone &&
        user.smsOptIn &&
        canUseFeature(plan, 'sms_notifications')
      ) {
        available.push('sms');
      }
    } else if (channel === 'in_app') {
      // In-app always available
      if (flags.inAppEnabled) {
        available.push('in_app');
      }
    }
  }

  return available;
};

/**
 * Log notification attempt for analytics/debugging
 */
const logNotificationAttempt = (result: NotificationResult): void => {
  const channelSummary = result.results
    .map(r => `${r.channel}:${r.success ? 'ok' : 'fail'}`)
    .join(', ');

  addLogEntry({
    type: 'system',
    title: result.overallSuccess ? 'Notification Sent' : 'Notification Failed',
    message: `${result.notificationType} via [${channelSummary}]`,
    isRead: false,
    severity: result.overallSuccess ? 'info' : 'warning',
    source: 'system',
  });
};

/**
 * Get in-app notification content for a notification type
 */
const getInAppContent = (
  notificationType: NotificationType,
  payload?: NotificationPayload
): { title: string; body: string } => {
  switch (notificationType) {
    case 'welcome':
      return {
        title: 'Welcome to FrameLord',
        body: 'Your account is ready. Complete your intake to unlock all features.',
      };
    case 'intake_completed':
      return {
        title: 'Intake Complete',
        body: 'Your profile is set up. Explore your dashboard and run your first FrameScan.',
      };
    case 'beta_accepted':
      return {
        title: '🎉 Beta Access Granted',
        body: "You're in! Welcome to the FrameLord V2.0 Vanguard Protocol.",
      };
    case 'beta_rejected':
      return {
        title: 'Beta Application Update',
        body: 'Thank you for your interest. Check your email for details.',
      };
    case 'case_call_reminder':
      return {
        title: 'Call Reminder',
        body: payload?.callDetails
          ? `Upcoming call with ${payload.callDetails.contactName}`
          : 'You have an upcoming call scheduled.',
      };
    case 'task_reminder':
      return {
        title: 'Task Due',
        body: payload?.taskTitle
          ? `"${payload.taskTitle}" is due${payload.taskDueTime ? ` at ${payload.taskDueTime}` : ' soon'}.`
          : 'You have a task due soon.',
      };
    case 'frame_alert':
      return {
        title: 'Frame Alert',
        body: payload?.relatedContactName
          ? `Review your recent interaction with ${payload.relatedContactName}.`
          : 'A recent interaction may need your attention.',
      };
    default:
      return {
        title: payload?.customTitle || 'Notification',
        body: payload?.customBody || '',
      };
  }
};

// =============================================================================
// MAIN NOTIFICATION FUNCTIONS
// =============================================================================

/**
 * Send notification to a user
 * Automatically routes to appropriate channels based on type and availability
 */
export const notifyUser = async (
  user: UserForNotification,
  notificationType: NotificationType,
  payload?: NotificationPayload
): Promise<NotificationResult> => {
  const timestamp = new Date().toISOString();
  const results: NotificationResult['results'] = [];

  // Check plan gating
  if (!canSendNotification(user.planTier, notificationType)) {
    console.log(`[NotificationService] ${notificationType} blocked by plan tier`);
    return {
      notificationType,
      channelsAttempted: [],
      results: [{
        channel: 'email',
        success: false,
        error: 'Notification type requires higher plan tier',
      }],
      overallSuccess: false,
      timestamp,
    };
  }

  // Determine available channels
  const channels = getAvailableChannels(notificationType, user, user.planTier);

  if (channels.length === 0) {
    console.log(`[NotificationService] No channels available for ${notificationType}`);
    return {
      notificationType,
      channelsAttempted: [],
      results: [{
        channel: 'in_app',
        success: false,
        error: 'No notification channels available',
      }],
      overallSuccess: false,
      timestamp,
    };
  }

  // Send via each available channel
  for (const channel of channels) {
    try {
      if (channel === 'email' && user.email) {
        const emailResult = await sendEmailByType(user, notificationType, payload);
        results.push({
          channel: 'email',
          success: emailResult.success,
          error: emailResult.error,
          messageId: emailResult.messageId,
        });
      } else if (channel === 'sms' && user.phone && user.smsOptIn) {
        const smsResult = await sendSmsByType(
          { phone: user.phone, smsOptIn: user.smsOptIn },
          notificationType,
          payload
        );
        results.push({
          channel: 'sms',
          success: smsResult.success,
          error: smsResult.error,
          messageId: smsResult.sid,
        });
      } else if (channel === 'in_app') {
        const { title, body } = getInAppContent(notificationType, payload);
        notifyUserInApp(
          user.tenantId || 'default',
          user.id,
          {
            type: 'GENERAL',
            title,
            body,
            source: 'SYSTEM',
          }
        );
        results.push({
          channel: 'in_app',
          success: true,
        });
      }
    } catch (error: any) {
      results.push({
        channel,
        success: false,
        error: error?.message || 'Unknown error',
      });
    }
  }

  const overallSuccess = results.some(r => r.success);

  const result: NotificationResult = {
    notificationType,
    channelsAttempted: channels,
    results,
    overallSuccess,
    timestamp,
  };

  // Log the notification attempt
  logNotificationAttempt(result);

  return result;
};

/**
 * Send notification to a contact (not the user themselves)
 * Used for external notifications like reminders
 */
export const notifyContact = async (
  contact: ContactForNotification,
  notificationType: NotificationType,
  payload?: NotificationPayload,
  senderPlanTier?: PlanTier
): Promise<NotificationResult> => {
  const timestamp = new Date().toISOString();
  const results: NotificationResult['results'] = [];

  // Check plan gating based on sender's plan
  if (!canSendNotification(senderPlanTier, notificationType)) {
    console.log(`[NotificationService] ${notificationType} blocked by plan tier`);
    return {
      notificationType,
      channelsAttempted: [],
      results: [{
        channel: 'email',
        success: false,
        error: 'Notification type requires higher plan tier',
      }],
      overallSuccess: false,
      timestamp,
    };
  }

  // Determine available channels (use sender's plan tier for permission checking)
  const channels = getAvailableChannels(notificationType, contact, senderPlanTier);

  if (channels.length === 0) {
    console.log(`[NotificationService] No channels available for ${notificationType} to contact`);
    return {
      notificationType,
      channelsAttempted: [],
      results: [{
        channel: 'email',
        success: false,
        error: 'No notification channels available for contact',
      }],
      overallSuccess: false,
      timestamp,
    };
  }

  // Send via each available channel (contacts don't get in-app)
  for (const channel of channels) {
    if (channel === 'in_app') continue; // Skip in-app for external contacts

    try {
      if (channel === 'email' && contact.email) {
        const userProfile: UserProfile = {
          id: contact.id,
          email: contact.email,
          fullName: contact.fullName,
        };
        const emailResult = await sendEmailByType(userProfile, notificationType, payload);
        results.push({
          channel: 'email',
          success: emailResult.success,
          error: emailResult.error,
          messageId: emailResult.messageId,
        });
      } else if (channel === 'sms' && contact.phone && contact.smsOptIn) {
        const smsResult = await sendSmsByType(
          { phone: contact.phone, smsOptIn: contact.smsOptIn },
          notificationType,
          payload
        );
        results.push({
          channel: 'sms',
          success: smsResult.success,
          error: smsResult.error,
          messageId: smsResult.sid,
        });
      }
    } catch (error: any) {
      results.push({
        channel,
        success: false,
        error: error?.message || 'Unknown error',
      });
    }
  }

  const overallSuccess = results.some(r => r.success);

  const result: NotificationResult = {
    notificationType,
    channelsAttempted: channels.filter(c => c !== 'in_app'),
    results,
    overallSuccess,
    timestamp,
  };

  logNotificationAttempt(result);

  return result;
};

// =============================================================================
// INTERNAL DISPATCH HELPERS
// =============================================================================

/**
 * Route email to correct template function
 */
async function sendEmailByType(
  user: UserProfile,
  notificationType: NotificationType,
  payload?: NotificationPayload
) {
  switch (notificationType) {
    case 'welcome':
      return sendWelcomeEmail(user);
    case 'intake_completed':
      return sendIntakeCompletedEmail(user);
    case 'beta_accepted':
      return sendBetaAcceptedEmail(user);
    case 'beta_rejected':
      return sendBetaRejectedEmail(user);
    case 'case_call_reminder':
      if (!payload?.callDetails) {
        return { success: false, error: 'Missing call details', provider: 'stub' as const, timestamp: new Date().toISOString() };
      }
      return sendCaseCallReminderEmail(user, payload.callDetails);
    default:
      return { success: false, error: `Unsupported email type: ${notificationType}`, provider: 'stub' as const, timestamp: new Date().toISOString() };
  }
}

/**
 * Route SMS to correct template function
 */
async function sendSmsByType(
  contact: SmsContact,
  notificationType: NotificationType,
  payload?: NotificationPayload
) {
  switch (notificationType) {
    case 'case_call_reminder':
      if (!payload?.callDetails) {
        return { success: false, error: 'Missing call details', provider: 'stub' as const, timestamp: new Date().toISOString() };
      }
      return sendCaseCallReminderSms(contact, payload.callDetails);
    case 'welcome':
    case 'beta_accepted':
      return sendBetaOnboardingSms(contact);
    default:
      return { success: false, error: `Unsupported SMS type: ${notificationType}`, provider: 'stub' as const, timestamp: new Date().toISOString() };
  }
}

// =============================================================================
// REMINDER SYSTEM (STUB FOR FUTURE CRON)
// =============================================================================

export interface ScheduledReminder {
  id: string;
  contactId: string;
  type: 'case_call';
  dueAt: string;
  payload: NotificationPayload;
  status: 'pending' | 'sent' | 'failed';
  createdAt: string;
  sentAt?: string;
}

// In-memory reminder storage (would be DB table in production)
let scheduledReminders: ScheduledReminder[] = [];

/**
 * Schedule a case call reminder
 * In production, this would write to a reminders table
 */
export const scheduleCaseCallReminder = (
  contactId: string,
  callDetails: CallDetails,
  reminderTime: string
): ScheduledReminder => {
  const reminder: ScheduledReminder = {
    id: `reminder-${Date.now()}`,
    contactId,
    type: 'case_call',
    dueAt: reminderTime,
    payload: { callDetails },
    status: 'pending',
    createdAt: new Date().toISOString(),
  };

  scheduledReminders.push(reminder);
  console.log(`[NotificationService] Scheduled reminder: ${reminder.id} for ${reminderTime}`);

  return reminder;
};

/**
 * Get pending reminders that are due now
 */
export const getDueReminders = (): ScheduledReminder[] => {
  const now = new Date().toISOString();
  return scheduledReminders.filter(r => r.status === 'pending' && r.dueAt <= now);
};

/**
 * Run all due reminders
 * This would be called by a cron job in production
 */
export const runRemindersDueNow = async (
  getContactById: (id: string) => ContactForNotification | undefined,
  senderPlanTier?: PlanTier
): Promise<{ processed: number; succeeded: number; failed: number }> => {
  const dueReminders = getDueReminders();
  let succeeded = 0;
  let failed = 0;

  for (const reminder of dueReminders) {
    const contact = getContactById(reminder.contactId);
    if (!contact) {
      console.warn(`[NotificationService] Contact ${reminder.contactId} not found for reminder`);
      reminder.status = 'failed';
      failed++;
      continue;
    }

    const result = await notifyContact(
      contact,
      'case_call_reminder',
      reminder.payload,
      senderPlanTier
    );

    if (result.overallSuccess) {
      reminder.status = 'sent';
      reminder.sentAt = new Date().toISOString();
      succeeded++;
    } else {
      reminder.status = 'failed';
      failed++;
    }
  }

  return { processed: dueReminders.length, succeeded, failed };
};

/**
 * Get all scheduled reminders (for debugging/admin)
 */
export const getAllReminders = (): ScheduledReminder[] => {
  return [...scheduledReminders];
};

/**
 * Clear a specific reminder
 */
export const cancelReminder = (reminderId: string): boolean => {
  const index = scheduledReminders.findIndex(r => r.id === reminderId);
  if (index >= 0) {
    scheduledReminders.splice(index, 1);
    return true;
  }
  return false;
};
