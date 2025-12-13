// =============================================================================
// NOTIFICATION STORE — In-memory data source for System Log / Notifications
// =============================================================================
// Manages intelligent notification stream shown in System Log panel
// Entries can be filtered based on user preferences in Settings → Notifications
// =============================================================================

import { SystemLogEntry, NotificationSettings } from '../types';

// --- DEMO DATA GATING ---
const DEMO_ENABLED_KEY = 'framelord_demo_logs_enabled';

let demoLogsEnabled = (() => {
  const stored = localStorage.getItem(DEMO_ENABLED_KEY);
  // Default to true for backwards compatibility, false when explicitly disabled
  return stored !== 'false';
})();

export const isDemoLogsEnabled = (): boolean => demoLogsEnabled;

export const setDemoLogsEnabled = (enabled: boolean): void => {
  demoLogsEnabled = enabled;
  localStorage.setItem(DEMO_ENABLED_KEY, enabled.toString());
};

// --- DEMO SYSTEM LOG ENTRIES ---
const DEMO_LOG_ENTRIES: SystemLogEntry[] = [
  // Billing notices (mandatory / high priority)
  {
    id: 'log_001',
    type: 'billing',
    title: 'Subscription Renewal',
    message: 'Your subscription renews in 3 days.',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    severity: 'warning',
    source: 'system',
  },
  {
    id: 'log_002',
    type: 'billing',
    title: 'Payment Method Updated',
    message: 'Your payment method was successfully updated.',
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    severity: 'info',
    source: 'system',
  },
  // Owner announcements
  {
    id: 'log_003',
    type: 'announcement',
    title: 'New Frame Scan Features',
    message: 'New Frame Scan features available: Multi-language support and voice tone analysis.',
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    severity: 'info',
    source: 'owner',
  },
  {
    id: 'log_004',
    type: 'announcement',
    title: 'Weekly Office Hours',
    message: 'Join us for weekly office hours every Thursday at 2 PM EST.',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    severity: 'info',
    source: 'owner',
  },
  // System events
  {
    id: 'log_005',
    type: 'system',
    title: 'Data Sync Complete',
    message: 'All your data has been successfully synced across devices.',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    isRead: false,
    severity: 'info',
    source: 'system',
  },
  {
    id: 'log_006',
    type: 'system',
    title: 'Analysis Complete',
    message: 'Contact "Sarah Chen" frame score updated.',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    severity: 'info',
    source: 'system',
  },
  // Task reminders
  {
    id: 'log_007',
    type: 'task',
    title: 'Action Required',
    message: 'Review pending case files.',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    severity: 'warning',
    source: 'system',
  },
  {
    id: 'log_008',
    type: 'task',
    title: 'Task Due Soon',
    message: 'Prepare demo for Dec 5 meeting is due tomorrow.',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    isRead: true,
    severity: 'warning',
    source: 'system',
  },
  // Custom user rules
  {
    id: 'log_009',
    type: 'custom',
    title: 'Frame Score Alert',
    message: 'Your weekly average frame score improved by 12 points.',
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    isRead: false,
    severity: 'info',
    source: 'userRule',
  },
];

// Real log entries (empty initially, populated by actual app events)
let REAL_LOG_ENTRIES: SystemLogEntry[] = [];

// Getter that combines based on demo mode
const getLogEntries = (): SystemLogEntry[] => {
  if (demoLogsEnabled) {
    return [...REAL_LOG_ENTRIES, ...DEMO_LOG_ENTRIES];
  }
  return [...REAL_LOG_ENTRIES];
};

// --- NOTIFICATION SETTINGS ---

let NOTIFICATION_SETTINGS: NotificationSettings = {
  showAnnouncements: true,
  showSystemEvents: true,
  showTasks: true,
  showBillingAlerts: true, // Mandatory - always shown regardless of setting
  showCustom: true,
};

// --- GETTERS ---

export const getAllLogEntries = (): SystemLogEntry[] => {
  return getLogEntries().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

export const getUnreadLogEntries = (): SystemLogEntry[] => {
  return getAllLogEntries().filter((entry) => !entry.isRead);
};

/**
 * Get filtered log entries based on user notification settings
 * Billing alerts are always shown (mandatory)
 */
export const getFilteredLogEntries = (): SystemLogEntry[] => {
  const settings = getNotificationSettings();
  const allEntries = getAllLogEntries();

  return allEntries.filter((entry) => {
    // Billing alerts are ALWAYS shown (mandatory)
    if (entry.type === 'billing') return true;

    // Filter based on user preferences
    switch (entry.type) {
      case 'announcement':
        return settings.showAnnouncements;
      case 'system':
        return settings.showSystemEvents;
      case 'task':
        return settings.showTasks;
      case 'custom':
        return settings.showCustom;
      default:
        return true;
    }
  });
};

export const getLogEntryById = (id: string): SystemLogEntry | undefined => {
  return getLogEntries().find((entry) => entry.id === id);
};

export const getNotificationSettings = (): NotificationSettings => {
  return { ...NOTIFICATION_SETTINGS };
};

// --- MUTATIONS ---

export const addLogEntry = (entry: Omit<SystemLogEntry, 'id' | 'createdAt'>): SystemLogEntry => {
  const newEntry: SystemLogEntry = {
    ...entry,
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
  };

  REAL_LOG_ENTRIES.unshift(newEntry);
  return newEntry;
};

/**
 * Helper function for app owner to add announcements
 *
 * FUTURE: This is where backend integration or admin UI will hook in
 * to allow app owners to push announcements to all users.
 */
export const addOwnerAnnouncement = (
  title: string,
  message: string,
  severity: 'info' | 'warning' | 'urgent' = 'info'
): SystemLogEntry => {
  return addLogEntry({
    type: 'announcement',
    title,
    message,
    isRead: false,
    severity,
    source: 'owner',
  });
};

export const markLogEntryRead = (id: string): void => {
  // Check real entries first
  const realEntry = REAL_LOG_ENTRIES.find((e) => e.id === id);
  if (realEntry) {
    realEntry.isRead = true;
    return;
  }
  // Also check demo entries if enabled
  if (demoLogsEnabled) {
    const demoEntry = DEMO_LOG_ENTRIES.find((e) => e.id === id);
    if (demoEntry) {
      demoEntry.isRead = true;
    }
  }
};

export const markAllLogEntriesRead = (): void => {
  REAL_LOG_ENTRIES.forEach((entry) => {
    entry.isRead = true;
  });
  if (demoLogsEnabled) {
    DEMO_LOG_ENTRIES.forEach((entry) => {
      entry.isRead = true;
    });
  }
};

export const updateNotificationSettings = (
  settings: Partial<NotificationSettings>
): NotificationSettings => {
  NOTIFICATION_SETTINGS = {
    ...NOTIFICATION_SETTINGS,
    ...settings,
  };
  return { ...NOTIFICATION_SETTINGS };
};

// --- HELPERS ---

export const getUnreadCount = (): number => {
  return getUnreadLogEntries().length;
};

export const getUnreadCountByType = (type: SystemLogEntry['type']): number => {
  return getUnreadLogEntries().filter((entry) => entry.type === type).length;
};
