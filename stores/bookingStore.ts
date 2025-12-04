// =============================================================================
// BOOKING STORE — Scheduling and booking management
// =============================================================================
// Manages call bookings for coaching and beta applications.
// Enforces timing constraints and handles approval workflow.
// =============================================================================

import type {
  Booking,
  BookingType,
  BookingStatus,
  BookingConstraints,
  TimeSlot,
  DEFAULT_BOOKING_CONSTRAINTS,
} from '../types/applicationTypes';

const STORAGE_KEY = 'framelord_bookings';

// In-memory cache
let bookings: Booking[] = [];
let initialized = false;

// =============================================================================
// INITIALIZATION
// =============================================================================

function init(): void {
  if (initialized) return;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        bookings = parsed;
      }
    }
  } catch {
    console.warn('[BookingStore] Failed to load from localStorage');
  }
  
  initialized = true;
}

function persist(): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  } catch {
    console.warn('[BookingStore] Failed to persist to localStorage');
  }
}

// =============================================================================
// BOOKING CONSTRAINTS
// =============================================================================

let constraints: BookingConstraints = {
  coachingCallDurationMinutes: 45,
  betaCallDurationMinutes: 10,
  maxDaysOut: 2,
  minHourOfDay: 12,
  maxHourOfDay: 20,
  minMinutesBetweenCalls: 60,
  minProposedSlots: 2,
  ownerTimezone: 'America/New_York',
};

export function getBookingConstraints(): BookingConstraints {
  return { ...constraints };
}

export function updateBookingConstraints(updates: Partial<BookingConstraints>): void {
  constraints = { ...constraints, ...updates };
}

// =============================================================================
// SLOT GENERATION
// =============================================================================

/**
 * Generate available time slots for booking
 * Considers existing bookings and constraints
 */
export function generateAvailableSlots(
  bookingType: BookingType,
  fromTimezone?: string
): TimeSlot[] {
  init();
  
  const duration = bookingType === 'COACHING' 
    ? constraints.coachingCallDurationMinutes 
    : constraints.betaCallDurationMinutes;
  
  const now = new Date();
  const maxDate = new Date(now.getTime() + constraints.maxDaysOut * 24 * 60 * 60 * 1000);
  
  const slots: TimeSlot[] = [];
  
  // Get all non-cancelled bookings for collision detection
  const activeBookings = bookings.filter(b => 
    b.status === 'PENDING_APPROVAL' || 
    b.status === 'CONFIRMED'
  );
  
  // Generate slots for each day
  const currentDate = new Date(now);
  currentDate.setMinutes(0, 0, 0);
  
  // Start from next hour if within today
  if (currentDate.getHours() < constraints.minHourOfDay) {
    currentDate.setHours(constraints.minHourOfDay);
  } else {
    currentDate.setHours(currentDate.getHours() + 1);
  }
  
  while (currentDate < maxDate) {
    const hour = currentDate.getHours();
    
    // Only during allowed hours
    if (hour >= constraints.minHourOfDay && hour < constraints.maxHourOfDay) {
      const slotStart = new Date(currentDate);
      const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);
      
      // Check for conflicts with existing bookings
      const hasConflict = activeBookings.some(booking => {
        const existingStart = new Date(booking.slot.start).getTime();
        const existingEnd = new Date(booking.slot.end).getTime();
        const newStart = slotStart.getTime();
        const newEnd = slotEnd.getTime();
        
        // Add buffer time
        const buffer = constraints.minMinutesBetweenCalls * 60 * 1000;
        const bufferedStart = existingStart - buffer;
        const bufferedEnd = existingEnd + buffer;
        
        // Check overlap
        return (newStart < bufferedEnd && newEnd > bufferedStart);
      });
      
      if (!hasConflict && slotStart > now) {
        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
        });
      }
    }
    
    // Move to next 30-minute slot
    currentDate.setMinutes(currentDate.getMinutes() + 30);
    
    // If we've gone past allowed hours, move to next day
    if (currentDate.getHours() >= constraints.maxHourOfDay) {
      currentDate.setDate(currentDate.getDate() + 1);
      currentDate.setHours(constraints.minHourOfDay, 0, 0, 0);
    }
  }
  
  return slots;
}

// =============================================================================
// SLOT VALIDATION
// =============================================================================

export interface SlotValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validate a proposed slot against constraints
 */
export function validateSlot(
  slot: TimeSlot,
  bookingType: BookingType
): SlotValidationResult {
  init();
  
  const errors: string[] = [];
  const now = new Date();
  const start = new Date(slot.start);
  const end = new Date(slot.end);
  
  const duration = bookingType === 'COACHING'
    ? constraints.coachingCallDurationMinutes
    : constraints.betaCallDurationMinutes;
  
  // Check if in the past
  if (start <= now) {
    errors.push('Slot is in the past');
  }
  
  // Check max days out
  const maxDate = new Date(now.getTime() + constraints.maxDaysOut * 24 * 60 * 60 * 1000);
  if (start > maxDate) {
    errors.push(`Slot must be within ${constraints.maxDaysOut} days`);
  }
  
  // Check hours
  const hour = start.getHours();
  if (hour < constraints.minHourOfDay || hour >= constraints.maxHourOfDay) {
    errors.push(`Slot must be between ${constraints.minHourOfDay}:00 and ${constraints.maxHourOfDay}:00`);
  }
  
  // Check duration
  const actualDuration = (end.getTime() - start.getTime()) / (60 * 1000);
  if (Math.abs(actualDuration - duration) > 1) {
    errors.push(`Duration must be ${duration} minutes`);
  }
  
  // Check for conflicts
  const activeBookings = bookings.filter(b =>
    b.status === 'PENDING_APPROVAL' ||
    b.status === 'CONFIRMED'
  );
  
  const hasConflict = activeBookings.some(booking => {
    const existingStart = new Date(booking.slot.start).getTime();
    const existingEnd = new Date(booking.slot.end).getTime();
    const newStart = start.getTime();
    const newEnd = end.getTime();
    
    const buffer = constraints.minMinutesBetweenCalls * 60 * 1000;
    const bufferedStart = existingStart - buffer;
    const bufferedEnd = existingEnd + buffer;
    
    return (newStart < bufferedEnd && newEnd > bufferedStart);
  });
  
  if (hasConflict) {
    errors.push('Slot conflicts with an existing booking');
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Validate multiple slots
 */
export function validateSlots(
  slots: TimeSlot[],
  bookingType: BookingType
): SlotValidationResult {
  const errors: string[] = [];
  
  if (slots.length < constraints.minProposedSlots) {
    errors.push(`Must propose at least ${constraints.minProposedSlots} time slots`);
  }
  
  for (const slot of slots) {
    const result = validateSlot(slot, bookingType);
    if (!result.valid) {
      errors.push(...result.errors.map(e => `Slot ${slot.start}: ${e}`));
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// BOOKING CRUD
// =============================================================================

/**
 * Create booking proposals for an application
 */
export function createBookingProposals(
  tenantId: string,
  userId: string,
  applicationId: string,
  bookingType: BookingType,
  slots: TimeSlot[],
  phone: string,
  email: string
): Booking[] {
  init();
  
  const newBookings: Booking[] = slots.map(slot => ({
    id: `bk_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    tenantId,
    userId,
    applicationId,
    bookingType,
    status: 'PENDING_APPROVAL' as BookingStatus,
    slot,
    phone,
    email,
    createdAt: new Date().toISOString(),
  }));
  
  bookings = [...newBookings, ...bookings];
  persist();
  
  // BACKEND TODO: Send notification to owner about new booking proposals
  console.log('[BookingStore] Created booking proposals:', newBookings.map(b => b.id));
  
  return newBookings;
}

/**
 * Get booking by ID
 */
export function getBookingById(id: string): Booking | null {
  init();
  return bookings.find(b => b.id === id) ?? null;
}

/**
 * Get bookings for an application
 */
export function getBookingsForApplication(applicationId: string): Booking[] {
  init();
  return bookings.filter(b => b.applicationId === applicationId);
}

/**
 * Get all pending bookings
 */
export function getPendingBookings(): Booking[] {
  init();
  return bookings.filter(b => b.status === 'PENDING_APPROVAL');
}

/**
 * Get all confirmed bookings
 */
export function getConfirmedBookings(): Booking[] {
  init();
  return bookings.filter(b => b.status === 'CONFIRMED');
}

/**
 * Get bookings by type
 */
export function getBookingsByType(bookingType: BookingType): Booking[] {
  init();
  return bookings.filter(b => b.bookingType === bookingType);
}

/**
 * Get all bookings (admin)
 */
export function getAllBookings(): Booking[] {
  init();
  return [...bookings];
}

// =============================================================================
// BOOKING APPROVAL WORKFLOW
// =============================================================================

/**
 * Approve a booking slot (admin action)
 * Also marks other proposals for the same application as superseded
 */
export function approveBooking(bookingId: string): Booking | null {
  init();
  
  const index = bookings.findIndex(b => b.id === bookingId);
  if (index < 0) return null;
  
  const booking = bookings[index];
  
  if (booking.status !== 'PENDING_APPROVAL') {
    console.warn('[BookingStore] Cannot approve booking with status:', booking.status);
    return null;
  }
  
  // Update this booking to confirmed
  bookings[index] = {
    ...booking,
    status: 'CONFIRMED',
    confirmedAt: new Date().toISOString(),
  };
  
  // Mark other proposals for same application as superseded
  bookings = bookings.map(b => {
    if (
      b.applicationId === booking.applicationId &&
      b.id !== bookingId &&
      b.status === 'PENDING_APPROVAL'
    ) {
      return { ...b, status: 'SUPERSEDED' as BookingStatus };
    }
    return b;
  });
  
  persist();
  
  // BACKEND TODO: Send confirmation email to applicant
  // BACKEND TODO: Send confirmation SMS to applicant
  // BACKEND TODO: Schedule reminders (24h and 1h before)
  scheduleCallReminders(bookings[index]);
  
  console.log('[BookingStore] Approved booking:', bookingId);
  
  return bookings[index];
}

/**
 * Cancel a booking
 */
export function cancelBooking(bookingId: string, reason?: string): Booking | null {
  init();
  
  const index = bookings.findIndex(b => b.id === bookingId);
  if (index < 0) return null;
  
  bookings[index] = {
    ...bookings[index],
    status: 'CANCELLED',
    cancelledAt: new Date().toISOString(),
    notes: reason,
  };
  
  persist();
  
  // BACKEND TODO: Send cancellation notification
  console.log('[BookingStore] Cancelled booking:', bookingId);
  
  return bookings[index];
}

/**
 * Mark booking as completed
 */
export function completeBooking(bookingId: string, notes?: string): Booking | null {
  init();
  
  const index = bookings.findIndex(b => b.id === bookingId);
  if (index < 0) return null;
  
  bookings[index] = {
    ...bookings[index],
    status: 'COMPLETED',
    completedAt: new Date().toISOString(),
    notes: notes ?? bookings[index].notes,
  };
  
  persist();
  
  console.log('[BookingStore] Completed booking:', bookingId);
  
  return bookings[index];
}

/**
 * Mark booking as no-show
 */
export function markNoShow(bookingId: string): Booking | null {
  init();
  
  const index = bookings.findIndex(b => b.id === bookingId);
  if (index < 0) return null;
  
  bookings[index] = {
    ...bookings[index],
    status: 'NO_SHOW',
    completedAt: new Date().toISOString(),
  };
  
  persist();
  
  console.log('[BookingStore] Marked no-show:', bookingId);
  
  return bookings[index];
}

// =============================================================================
// REMINDER SCHEDULING (STUBS)
// =============================================================================

/**
 * Schedule call reminders
 * BACKEND STUB: This would integrate with a job scheduler
 */
export function scheduleCallReminders(booking: Booking): void {
  const callTime = new Date(booking.slot.start);
  const twentyFourHourBefore = new Date(callTime.getTime() - 24 * 60 * 60 * 1000);
  const oneHourBefore = new Date(callTime.getTime() - 60 * 60 * 1000);
  
  // BACKEND TODO: Schedule job to send 24h reminder
  // BACKEND TODO: Schedule job to send 1h reminder
  // BACKEND TODO: Use notification system and SMS provider
  
  console.log('[BookingStore] BACKEND STUB: scheduleCallReminders', {
    bookingId: booking.id,
    callTime: callTime.toISOString(),
    twentyFourHourReminder: twentyFourHourBefore.toISOString(),
    oneHourReminder: oneHourBefore.toISOString(),
  });
}

/**
 * Dispatch SMS reminder
 * BACKEND STUB: This would integrate with Twilio or similar
 */
export function dispatchSmsReminder(
  phone: string,
  message: string
): { success: boolean; error?: string } {
  // BACKEND TODO: Integrate with Twilio or SMS provider
  // BACKEND TODO: Handle phone number formatting
  // BACKEND TODO: Record delivery status
  
  console.log('[BookingStore] BACKEND STUB: dispatchSmsReminder', {
    phone,
    message: message.slice(0, 50) + '...',
  });
  
  return { success: true };
}

/**
 * Dispatch email reminder
 * BACKEND STUB: This would integrate with email provider
 */
export function dispatchEmailReminder(
  email: string,
  subject: string,
  body: string
): { success: boolean; error?: string } {
  // BACKEND TODO: Integrate with SendGrid, SES, or email provider
  // BACKEND TODO: Use email templates
  // BACKEND TODO: Record delivery status
  
  console.log('[BookingStore] BACKEND STUB: dispatchEmailReminder', {
    email,
    subject,
  });
  
  return { success: true };
}

/**
 * Record that a reminder was sent
 */
export function recordReminderSent(
  bookingId: string,
  reminderType: 'twentyFourHour' | 'oneHour'
): void {
  init();
  
  const index = bookings.findIndex(b => b.id === bookingId);
  if (index < 0) return;
  
  bookings[index] = {
    ...bookings[index],
    remindersSent: {
      ...bookings[index].remindersSent,
      [reminderType]: new Date().toISOString(),
    },
  };
  
  persist();
}

// =============================================================================
// QUERY HELPERS
// =============================================================================

/**
 * Get upcoming confirmed calls (for admin dashboard)
 */
export function getUpcomingCalls(): Booking[] {
  init();
  const now = new Date();
  return bookings
    .filter(b => 
      b.status === 'CONFIRMED' && 
      new Date(b.slot.start) > now
    )
    .sort((a, b) => 
      new Date(a.slot.start).getTime() - new Date(b.slot.start).getTime()
    );
}

/**
 * Get bookings for a tenant
 */
export function getBookingsForTenant(tenantId: string): Booking[] {
  init();
  return bookings.filter(b => b.tenantId === tenantId);
}

/**
 * Get bookings needing reminders
 */
export function getBookingsNeedingReminders(): Booking[] {
  init();
  const now = new Date();
  const twentyFourHoursFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);
  
  return bookings.filter(b => {
    if (b.status !== 'CONFIRMED') return false;
    
    const callTime = new Date(b.slot.start);
    
    // Needs 24h reminder
    if (
      callTime <= twentyFourHoursFromNow &&
      callTime > oneHourFromNow &&
      !b.remindersSent?.twentyFourHour
    ) {
      return true;
    }
    
    // Needs 1h reminder
    if (
      callTime <= oneHourFromNow &&
      callTime > now &&
      !b.remindersSent?.oneHour
    ) {
      return true;
    }
    
    return false;
  });
}

// =============================================================================
// RESET (TESTING ONLY)
// =============================================================================

export function resetBookingStore(): void {
  bookings = [];
  initialized = false;
  localStorage.removeItem(STORAGE_KEY);
}

