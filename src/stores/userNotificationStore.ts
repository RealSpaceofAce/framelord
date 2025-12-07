// =============================================================================
// USER NOTIFICATION STORE — In-app notifications
// =============================================================================
// Manages user notifications for coaching nudges, beta warnings, reminders, etc.
// Links with email dispatch stubs for external notifications.
// =============================================================================

import type { 
  Notification, 
  NotificationType, 
  NotificationSource,
  ProductEmailType,
  EmailPreferences 
} from '../types/multiTenant';

const STORAGE_KEY = 'framelord_user_notifications';
const PREFS_STORAGE_KEY = 'framelord_email_preferences';

// In-memory cache
let notifications: Notification[] = [];
let emailPrefs: Map<string, EmailPreferences> = new Map();
let notificationsInitialized = false;
let prefsInitialized = false;

// =============================================================================
// INITIALIZATION
// =============================================================================

function initNotifications(): void {
  if (notificationsInitialized) return;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        notifications = parsed;
      }
    }
  } catch {
    console.warn('[UserNotificationStore] Failed to load notifications from localStorage');
  }
  
  notificationsInitialized = true;
}

function initPrefs(): void {
  if (prefsInitialized) return;
  
  try {
    const stored = localStorage.getItem(PREFS_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (typeof parsed === 'object') {
        Object.entries(parsed).forEach(([key, value]) => {
          emailPrefs.set(key, value as EmailPreferences);
        });
      }
    }
  } catch {
    console.warn('[UserNotificationStore] Failed to load prefs from localStorage');
  }
  
  prefsInitialized = true;
}

function persistNotifications(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
  } catch {
    console.warn('[UserNotificationStore] Failed to persist notifications');
  }
}

function persistPrefs(): void {
  try {
    const obj: Record<string, EmailPreferences> = {};
    emailPrefs.forEach((v, k) => { obj[k] = v; });
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(obj));
  } catch {
    console.warn('[UserNotificationStore] Failed to persist prefs');
  }
}

// =============================================================================
// DEFAULT EMAIL PREFERENCES
// =============================================================================

export function getDefaultEmailPreferences(): EmailPreferences {
  return {
    productUpdates: true,
    onboardingTips: true,
    taskReminders: true,
    coachingOffers: true,
    betaReminders: true,
    marketingOffers: false,
    surveyRequests: true,
  };
}

// =============================================================================
// IN-APP NOTIFICATIONS
// =============================================================================

/**
 * Create and send an in-app notification
 */
export function notifyUserInApp(
  tenantId: string,
  userId: string,
  data: Omit<Notification, 'id' | 'createdAt' | 'tenantId' | 'userId'>
): Notification {
  initNotifications();
  
  const notification: Notification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    tenantId,
    userId,
    createdAt: new Date().toISOString(),
    ...data,
  };
  
  notifications = [notification, ...notifications];
  persistNotifications();
  
  // BACKEND TODO: Push via WebSocket if user is online
  console.log('[UserNotificationStore] Notification created:', notification.id);
  
  return notification;
}

/**
 * Get notifications for a user
 */
export function getNotificationsForUser(
  tenantId: string,
  userId: string
): Notification[] {
  initNotifications();
  return notifications.filter(n => 
    n.tenantId === tenantId && n.userId === userId
  );
}

/**
 * Get unread notifications for a user
 */
export function getUnreadNotificationsForUser(
  tenantId: string,
  userId: string
): Notification[] {
  return getNotificationsForUser(tenantId, userId).filter(n => !n.readAt);
}

/**
 * Get unread count for a user
 */
export function getUnreadNotificationCount(
  tenantId: string,
  userId: string
): number {
  return getUnreadNotificationsForUser(tenantId, userId).length;
}

/**
 * Mark notification as read
 */
export function markNotificationRead(notificationId: string): Notification | null {
  initNotifications();
  
  const index = notifications.findIndex(n => n.id === notificationId);
  if (index < 0) return null;
  
  notifications[index] = {
    ...notifications[index],
    readAt: new Date().toISOString(),
  };
  persistNotifications();
  
  return notifications[index];
}

/**
 * Mark all notifications as read for a user
 */
export function markAllNotificationsRead(tenantId: string, userId: string): number {
  initNotifications();
  
  let count = 0;
  notifications = notifications.map(n => {
    if (n.tenantId === tenantId && n.userId === userId && !n.readAt) {
      count++;
      return { ...n, readAt: new Date().toISOString() };
    }
    return n;
  });
  
  persistNotifications();
  return count;
}

/**
 * Delete a notification
 */
export function deleteNotification(notificationId: string): boolean {
  initNotifications();
  
  const lengthBefore = notifications.length;
  notifications = notifications.filter(n => n.id !== notificationId);
  
  if (notifications.length < lengthBefore) {
    persistNotifications();
    return true;
  }
  return false;
}

// =============================================================================
// EMAIL PREFERENCES
// =============================================================================

/**
 * Get email preferences for a user
 */
export function getEmailPreferences(userId: string): EmailPreferences {
  initPrefs();
  return emailPrefs.get(userId) ?? getDefaultEmailPreferences();
}

/**
 * Update email preferences for a user
 */
export function updateEmailPreferences(
  userId: string,
  prefs: Partial<EmailPreferences>
): EmailPreferences {
  initPrefs();
  
  const current = getEmailPreferences(userId);
  const updated = { ...current, ...prefs };
  emailPrefs.set(userId, updated);
  persistPrefs();
  
  // BACKEND TODO: Record in audit log
  console.log('[UserNotificationStore] Email prefs updated:', userId);
  
  return updated;
}

/**
 * Check if user wants specific email type
 */
function checkEmailPreference(
  userId: string,
  emailType: ProductEmailType
): boolean {
  const prefs = getEmailPreferences(userId);
  
  const mapping: Record<ProductEmailType, keyof EmailPreferences> = {
    WELCOME: 'productUpdates',
    ONBOARDING: 'onboardingTips',
    TASK_REMINDER: 'taskReminders',
    COACHING_NUDGE: 'coachingOffers',
    BETA_WARNING: 'betaReminders',
    BETA_REVOKE: 'betaReminders',
    FEATURE_ANNOUNCEMENT: 'productUpdates',
  };
  
  const prefKey = mapping[emailType];
  return prefs[prefKey] ?? true;
}

// =============================================================================
// EMAIL DISPATCH STUB
// =============================================================================

/**
 * Dispatch a product email
 * BACKEND STUB: This would integrate with email service
 */
export function dispatchProductEmailStub(
  tenantId: string,
  userId: string,
  type: ProductEmailType,
  payload: Record<string, any>
): { sent: boolean; reason?: string } {
  // Check user preferences
  if (!checkEmailPreference(userId, type)) {
    console.log('[UserNotificationStore] Email blocked by user prefs:', type);
    return { sent: false, reason: 'User opted out of this email type' };
  }
  
  // BACKEND TODO: Get user email from auth system
  // BACKEND TODO: Render email template based on type
  // BACKEND TODO: Send via email service (SendGrid, SES, etc.)
  // BACKEND TODO: Record email sent event for analytics
  
  console.log('[UserNotificationStore] BACKEND STUB: dispatchProductEmail', {
    tenantId,
    userId,
    type,
    payload,
  });
  
  return { sent: true };
}

// =============================================================================
// NOTIFICATION + EMAIL HELPERS
// =============================================================================

/**
 * Send coaching nudge notification (in-app + email)
 */
export function sendCoachingNudgeNotification(
  tenantId: string,
  userId: string,
  reasons: string[]
): void {
  // In-app notification
  notifyUserInApp(tenantId, userId, {
    type: 'COACHING_NUDGE',
    title: 'Personalized Coaching Available',
    body: `We noticed you might benefit from personalized coaching. ${reasons[0] || 'Let us help you improve your frame.'}`,
    source: 'AI',
  });
  
  // Email
  dispatchProductEmailStub(tenantId, userId, 'COACHING_NUDGE', {
    reasons,
  });
}

/**
 * Send beta warning notification (in-app + email)
 */
export function sendBetaWarningNotification(
  tenantId: string,
  userId: string,
  usageStatus: string
): void {
  // In-app notification
  notifyUserInApp(tenantId, userId, {
    type: 'BETA_WARNING',
    title: 'Beta Status Warning',
    body: 'Your beta access may be revoked due to low usage. Keep using FrameLord to maintain your beta status.',
    source: 'SYSTEM',
  });
  
  // Email
  dispatchProductEmailStub(tenantId, userId, 'BETA_WARNING', {
    usageStatus,
  });
}

/**
 * Send beta revoke notification (in-app + email)
 */
export function sendBetaRevokeNotification(
  tenantId: string,
  userId: string
): void {
  // In-app notification
  notifyUserInApp(tenantId, userId, {
    type: 'BETA_REVOKE',
    title: 'Beta Access Revoked',
    body: 'Your beta access has been revoked due to inactivity. You can re-apply for beta access.',
    source: 'SYSTEM',
  });
  
  // Email
  dispatchProductEmailStub(tenantId, userId, 'BETA_REVOKE', {});
}

/**
 * Send task reminder notification (in-app only by default)
 */
export function sendTaskReminderNotification(
  tenantId: string,
  userId: string,
  taskTitle: string,
  dueAt: string
): void {
  notifyUserInApp(tenantId, userId, {
    type: 'TASK_REMINDER',
    title: 'Task Due Soon',
    body: `"${taskTitle}" is due ${dueAt}`,
    source: 'SYSTEM',
  });
  
  // Email (respects preferences)
  dispatchProductEmailStub(tenantId, userId, 'TASK_REMINDER', {
    taskTitle,
    dueAt,
  });
}

// =============================================================================
// NOTIFICATION TYPE HELPERS
// =============================================================================

export function getNotificationTypeLabel(type: NotificationType): string {
  const labels: Record<NotificationType, string> = {
    COACHING_NUDGE: 'Coaching',
    BETA_WARNING: 'Beta Warning',
    BETA_REVOKE: 'Beta Revoked',
    TASK_REMINDER: 'Task Reminder',
    GENERAL: 'General',
  };
  return labels[type];
}

export function getNotificationTypeIcon(type: NotificationType): string {
  const icons: Record<NotificationType, string> = {
    COACHING_NUDGE: '🎯',
    BETA_WARNING: '⚠️',
    BETA_REVOKE: '🚫',
    TASK_REMINDER: '📋',
    GENERAL: '📢',
  };
  return icons[type];
}

// =============================================================================
// BROADCAST NOTIFICATIONS (ADMIN)
// =============================================================================

export interface BroadcastRequest {
  scope: 'GLOBAL' | 'TENANT' | 'USER';
  tenantId: string | null;
  userId: string | null;
  title: string;
  body: string;
  createdBy: string;
}

/**
 * Enqueue a broadcast notification from admin
 * BACKEND TODO: POST /api/admin/broadcast to actually deliver these
 */
export function enqueueBroadcastNotification(
  request: BroadcastRequest
): { success: boolean; error?: string; deliveredCount?: number } {
  initNotifications();
  
  try {
    // Validate request
    if (!request.title.trim() || !request.body.trim()) {
      return { success: false, error: 'Title and body are required' };
    }
    
    if (request.scope === 'TENANT' && !request.tenantId) {
      return { success: false, error: 'Tenant ID required for tenant scope' };
    }
    
    if (request.scope === 'USER' && !request.userId) {
      return { success: false, error: 'User ID required for user scope' };
    }
    
    // For now, we create notifications locally based on scope
    // BACKEND TODO: This should POST to /api/admin/broadcast which handles
    // actual delivery to all recipients, tracks delivery counts, etc.
    
    let deliveredCount = 0;
    
    if (request.scope === 'GLOBAL') {
      // Create a single notification that will be visible to all users
      // BACKEND TODO: Actually fan out to all users
      const notification: Notification = {
        id: `broadcast_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        tenantId: 'GLOBAL', // Special marker for global notifications
        userId: 'ALL',
        type: 'GENERAL',
        title: request.title,
        body: request.body,
        createdAt: new Date().toISOString(),
        source: 'ADMIN',
      };
      notifications.push(notification);
      deliveredCount = 1; // Placeholder - backend would return actual count
    } else if (request.scope === 'TENANT' && request.tenantId) {
      // Create notification for all users in tenant
      // BACKEND TODO: Fan out to all tenant users
      const notification: Notification = {
        id: `broadcast_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        tenantId: request.tenantId,
        userId: 'ALL_IN_TENANT',
        type: 'GENERAL',
        title: request.title,
        body: request.body,
        createdAt: new Date().toISOString(),
        source: 'ADMIN',
      };
      notifications.push(notification);
      deliveredCount = 1; // Placeholder
    } else if (request.scope === 'USER' && request.userId && request.tenantId) {
      // Create notification for specific user
      const notification: Notification = {
        id: `broadcast_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        tenantId: request.tenantId,
        userId: request.userId,
        type: 'GENERAL',
        title: request.title,
        body: request.body,
        createdAt: new Date().toISOString(),
        source: 'ADMIN',
      };
      notifications.push(notification);
      deliveredCount = 1;
    }
    
    persistNotifications();
    
    console.log('[UserNotificationStore] Broadcast notification created:', {
      scope: request.scope,
      title: request.title,
      createdBy: request.createdBy,
      deliveredCount,
    });
    
    return { success: true, deliveredCount };
  } catch (error) {
    console.error('[UserNotificationStore] Failed to create broadcast:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

// =============================================================================
// RESET (TESTING ONLY)
// =============================================================================

export function resetUserNotificationStore(): void {
  notifications = [];
  emailPrefs = new Map();
  notificationsInitialized = false;
  prefsInitialized = false;
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(PREFS_STORAGE_KEY);
}

