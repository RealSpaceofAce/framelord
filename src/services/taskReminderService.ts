// =============================================================================
// TASK REMINDER SERVICE — Scheduled task and case reminders
// =============================================================================
// Generates notifications for:
// - Tasks due today
// - Tasks due tomorrow
// - Overdue tasks
// - Case-related calls (contacts needing attention)
// =============================================================================

import { addLogEntry, getAllLogEntries } from './systemLogStore';
import { getAllOpenTasks, getTasksByContactId } from './taskStore';
import { getContactById } from './contactStore';
import { getActiveWorkloadContacts } from './frameStatsService';
import type { Task } from '../types';

// Track last run to avoid duplicate notifications
let lastReminderRun: string | null = null;
let reminderIntervalId: ReturnType<typeof setInterval> | null = null;

// =============================================================================
// HELPERS
// =============================================================================

/**
 * Get today's date as YYYY-MM-DD
 */
function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get tomorrow's date as YYYY-MM-DD
 */
function getTomorrowString(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
}

/**
 * Extract date portion from ISO string
 */
function getDateString(isoString: string): string {
  return isoString.split('T')[0];
}

/**
 * Check if a notification with similar content already exists today
 */
function notificationExistsToday(title: string, message: string): boolean {
  const today = getTodayString();
  const entries = getAllLogEntries();

  return entries.some(entry => {
    const entryDate = getDateString(entry.createdAt);
    return entryDate === today && entry.title === title && entry.message === message;
  });
}

// =============================================================================
// TASK REMINDERS
// =============================================================================

/**
 * Get tasks due today
 */
export function getTasksDueToday(): Task[] {
  const today = getTodayString();
  return getAllOpenTasks().filter(task => {
    if (!task.dueAt) return false;
    return getDateString(task.dueAt) === today;
  });
}

/**
 * Get tasks due tomorrow
 */
export function getTasksDueTomorrow(): Task[] {
  const tomorrow = getTomorrowString();
  return getAllOpenTasks().filter(task => {
    if (!task.dueAt) return false;
    return getDateString(task.dueAt) === tomorrow;
  });
}

/**
 * Get overdue tasks
 */
export function getOverdueTasks(): Task[] {
  const today = getTodayString();
  return getAllOpenTasks().filter(task => {
    if (!task.dueAt) return false;
    return getDateString(task.dueAt) < today;
  });
}

/**
 * Create notification for a task
 */
function createTaskNotification(
  task: Task,
  type: 'due_today' | 'due_tomorrow' | 'overdue'
): void {
  const contact = getContactById(task.contactId);
  const contactName = contact?.fullName || 'Unknown';

  let title: string;
  let severity: 'info' | 'warning' | 'urgent';

  switch (type) {
    case 'due_today':
      title = 'Task Due Today';
      severity = 'warning';
      break;
    case 'due_tomorrow':
      title = 'Task Due Tomorrow';
      severity = 'info';
      break;
    case 'overdue':
      title = 'Overdue Task';
      severity = 'urgent';
      break;
  }

  const message = `"${task.title}" for ${contactName}`;

  // Avoid duplicate notifications
  if (notificationExistsToday(title, message)) {
    return;
  }

  addLogEntry({
    type: 'task',
    title,
    message,
    isRead: false,
    severity,
    source: 'system',
  });
}

// =============================================================================
// CASE REMINDERS
// =============================================================================

/**
 * Create notifications for contacts needing attention
 */
function createCaseReminders(): void {
  try {
    const workloadContacts = getActiveWorkloadContacts('default');

    for (const { contact, nextActionAt } of workloadContacts) {
      if (!nextActionAt) continue;

      const today = getTodayString();
      const actionDate = getDateString(nextActionAt);

      // Create reminder for actions due today
      if (actionDate === today) {
        const title = 'Case Action Due Today';
        const message = `${contact.fullName} requires attention`;

        if (!notificationExistsToday(title, message)) {
          addLogEntry({
            type: 'task',
            title,
            message,
            isRead: false,
            severity: 'warning',
            source: 'system',
          });
        }
      }

      // Create reminder for overdue actions
      if (actionDate < today) {
        const title = 'Overdue Case Action';
        const message = `${contact.fullName} action is overdue`;

        if (!notificationExistsToday(title, message)) {
          addLogEntry({
            type: 'task',
            title,
            message,
            isRead: false,
            severity: 'urgent',
            source: 'system',
          });
        }
      }
    }
  } catch (error) {
    console.error('[TaskReminderService] Error creating case reminders:', error);
  }
}

// =============================================================================
// SCHEDULER
// =============================================================================

/**
 * Run all reminder checks
 */
export function runReminderChecks(): void {
  const now = new Date().toISOString();

  // Don't run more than once per hour
  if (lastReminderRun) {
    const lastRunTime = new Date(lastReminderRun).getTime();
    const nowTime = new Date(now).getTime();
    const hourInMs = 60 * 60 * 1000;

    if (nowTime - lastRunTime < hourInMs) {
      return;
    }
  }

  console.log('[TaskReminderService] Running reminder checks...');

  // Task reminders
  const overdue = getOverdueTasks();
  const dueToday = getTasksDueToday();
  const dueTomorrow = getTasksDueTomorrow();

  overdue.forEach(task => createTaskNotification(task, 'overdue'));
  dueToday.forEach(task => createTaskNotification(task, 'due_today'));
  dueTomorrow.forEach(task => createTaskNotification(task, 'due_tomorrow'));

  // Case reminders
  createCaseReminders();

  lastReminderRun = now;

  console.log('[TaskReminderService] Reminder checks complete:', {
    overdue: overdue.length,
    dueToday: dueToday.length,
    dueTomorrow: dueTomorrow.length,
  });
}

/**
 * Start the reminder scheduler
 * Runs checks every 30 minutes
 */
export function startReminderScheduler(): void {
  if (reminderIntervalId) {
    console.log('[TaskReminderService] Scheduler already running');
    return;
  }

  // Run immediately on start
  runReminderChecks();

  // Schedule to run every 30 minutes
  const thirtyMinutes = 30 * 60 * 1000;
  reminderIntervalId = setInterval(runReminderChecks, thirtyMinutes);

  console.log('[TaskReminderService] Scheduler started');
}

/**
 * Stop the reminder scheduler
 */
export function stopReminderScheduler(): void {
  if (reminderIntervalId) {
    clearInterval(reminderIntervalId);
    reminderIntervalId = null;
    console.log('[TaskReminderService] Scheduler stopped');
  }
}

/**
 * Check if scheduler is running
 */
export function isSchedulerRunning(): boolean {
  return reminderIntervalId !== null;
}

// =============================================================================
// BILLING REMINDERS
// =============================================================================

/**
 * Create billing reminder notification
 * Called from billing events
 */
export function createBillingReminder(
  title: string,
  message: string,
  severity: 'info' | 'warning' | 'urgent' = 'warning'
): void {
  addLogEntry({
    type: 'billing',
    title,
    message,
    isRead: false,
    severity,
    source: 'system',
  });
}

/**
 * Create subscription renewal reminder
 */
export function createRenewalReminder(daysUntilRenewal: number): void {
  if (daysUntilRenewal <= 0) return;

  let severity: 'info' | 'warning' | 'urgent' = 'info';
  if (daysUntilRenewal <= 3) severity = 'warning';
  if (daysUntilRenewal <= 1) severity = 'urgent';

  const title = 'Subscription Renewal';
  const message = daysUntilRenewal === 1
    ? 'Your subscription renews tomorrow.'
    : `Your subscription renews in ${daysUntilRenewal} days.`;

  if (!notificationExistsToday(title, message)) {
    createBillingReminder(title, message, severity);
  }
}

/**
 * Create payment failed notification
 */
export function createPaymentFailedNotification(): void {
  createBillingReminder(
    'Payment Failed',
    'Your payment could not be processed. Please update your payment method.',
    'urgent'
  );
}

// =============================================================================
// EXPORTS SUMMARY
// =============================================================================
// - startReminderScheduler(): Start automatic reminders
// - stopReminderScheduler(): Stop automatic reminders
// - runReminderChecks(): Manually trigger reminder checks
// - createBillingReminder(): Create billing notification
// - createRenewalReminder(): Create subscription renewal reminder
// - createPaymentFailedNotification(): Create payment failure notification
// - getTasksDueToday/Tomorrow/Overdue(): Query task status
// =============================================================================
