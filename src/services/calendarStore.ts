// =============================================================================
// CALENDAR STORE — External calendar integration abstraction
// =============================================================================
// Provides unified interface for local tasks and external calendar events
// Currently uses mock Google Calendar data - ready for real API integration
// =============================================================================

export type CalendarEventSource = 'google' | 'local';

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  source: CalendarEventSource;
  description?: string;
  location?: string;
  isAllDay?: boolean;
}

// --- MOCK GOOGLE CALENDAR EVENTS ---
// TODO: Replace with real Google Calendar API integration
// Integration point: https://developers.google.com/calendar/api/v3/reference/events

let MOCK_GOOGLE_EVENTS: CalendarEvent[] = [
  {
    id: 'gcal_001',
    title: 'Team Standup',
    start: new Date(new Date().setHours(9, 0, 0, 0)),
    end: new Date(new Date().setHours(9, 30, 0, 0)),
    source: 'google',
    description: 'Daily team sync',
    isAllDay: false,
  },
  {
    id: 'gcal_002',
    title: 'Client Meeting - Acme Corp',
    start: new Date(new Date().setHours(14, 0, 0, 0)),
    end: new Date(new Date().setHours(15, 0, 0, 0)),
    source: 'google',
    description: 'Q4 planning discussion',
    location: 'Zoom',
    isAllDay: false,
  },
  {
    id: 'gcal_003',
    title: 'Frame Review Session',
    start: new Date(new Date().setHours(16, 30, 0, 0)),
    end: new Date(new Date().setHours(17, 0, 0, 0)),
    source: 'google',
    isAllDay: false,
  },
];

// --- GETTERS ---

/**
 * Get all events for a specific date (both local tasks and external calendar)
 * Combines taskStore appointments and Google Calendar events
 */
export const getEventsForDate = (date: Date): CalendarEvent[] => {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const nextDay = new Date(targetDate);
  nextDay.setDate(nextDay.getDate() + 1);

  // Filter Google Calendar events for this date
  const googleEvents = MOCK_GOOGLE_EVENTS.filter(event => {
    const eventDate = new Date(event.start);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate.getTime() === targetDate.getTime();
  });

  // In a real implementation, also fetch from taskStore where type === 'appointment'
  // For now, just return Google events
  return googleEvents.sort((a, b) => a.start.getTime() - b.start.getTime());
};

/**
 * Get events for today
 */
export const getTodayEvents = (): CalendarEvent[] => {
  return getEventsForDate(new Date());
};

/**
 * Get upcoming events (next 7 days)
 */
export const getUpcomingEvents = (days: number = 7): CalendarEvent[] => {
  const now = new Date();
  const future = new Date();
  future.setDate(future.getDate() + days);

  return MOCK_GOOGLE_EVENTS
    .filter(event => event.start >= now && event.start <= future)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
};

// --- GOOGLE CALENDAR INTEGRATION HOOKS ---

/**
 * Sync Google Calendar (STUB for future OAuth integration)
 *
 * TODO: Implement Google Calendar API OAuth flow
 * 1. User clicks "Link Google Calendar" in Settings → Integrations
 * 2. Redirect to Google OAuth consent screen
 * 3. Receive access token
 * 4. Call this function to fetch events
 * 5. Store events in MOCK_GOOGLE_EVENTS (or separate store)
 * 6. Set up periodic sync (every 15 minutes)
 *
 * API Reference: https://developers.google.com/calendar/api/v3/reference/events/list
 */
export const syncGoogleCalendar = async (): Promise<void> => {
  // STUB: Simulate API call
  await new Promise(resolve => setTimeout(resolve, 500));

  // In production, this would:
  // 1. Check for valid OAuth token
  // 2. Fetch events from Google Calendar API
  // 3. Transform to CalendarEvent format
  // 4. Update MOCK_GOOGLE_EVENTS

  console.log('[STUB] Google Calendar sync complete');
};

/**
 * Check if Google Calendar is linked
 * In production, check for valid OAuth token in localStorage or backend
 */
export const isGoogleCalendarLinked = (): boolean => {
  // STUB: Check localStorage for mock connection state
  const linked = localStorage.getItem('framelord_google_cal_linked');
  return linked === 'true';
};

/**
 * Link Google Calendar (trigger OAuth flow)
 */
export const linkGoogleCalendar = async (): Promise<boolean> => {
  // STUB: In production, redirect to Google OAuth
  // window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?...`;

  // For now, just mark as linked
  localStorage.setItem('framelord_google_cal_linked', 'true');

  // Simulate initial sync
  await syncGoogleCalendar();

  return true;
};

/**
 * Unlink Google Calendar
 */
export const unlinkGoogleCalendar = (): void => {
  localStorage.removeItem('framelord_google_cal_linked');
  // In production, also revoke OAuth token
};

// --- HELPERS ---

/**
 * Format time range for display
 */
export const formatTimeRange = (start: Date, end: Date): string => {
  const startTime = start.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const endTime = end.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${startTime} - ${endTime}`;
};

/**
 * Format single time for display
 */
export const formatTime = (date: Date): string => {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};
