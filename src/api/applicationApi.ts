// =============================================================================
// APPLICATION API — API route stubs for application + booking flow
// =============================================================================
// Frontend-callable functions that wrap store operations.
// In production, these would be actual HTTP API calls.
// =============================================================================

import type {
  CoachingApplicationFormV2,
  BetaApplicationFormV2,
  SubmitApplicationResponse,
  BookSlotsRequest,
  BookSlotsResponse,
  SuggestSlotsRequest,
  SuggestSlotsResponse,
  TimeSlot,
  BookingType,
} from '../types/applicationTypes';
import {
  submitCoachingApplicationV2,
  submitBetaApplicationV2,
  getCoachingApplicationByIdV2,
  getBetaApplicationByIdV2,
  linkBookingsToCoachingApplication,
  linkBookingsToBetaApplication,
  updateCoachingApplicationStatusV2,
  updateBetaApplicationStatusV2,
} from '../stores/applicationStore';
import {
  generateAvailableSlots,
  validateSlots,
  createBookingProposals,
  getBookingConstraints,
  approveBooking,
  getBookingsForApplication,
} from '../stores/bookingStore';

// =============================================================================
// POST /api/apply/coaching
// =============================================================================

/**
 * Submit a coaching application
 * 
 * This is the main entry point for the coaching application flow.
 * It validates the form, persists the application, runs AI evaluation,
 * and notifies the owner.
 * 
 * BACKEND IMPLEMENTATION:
 * - Validate payload against input_schema from coaching_application_ai.json
 * - Call applicationStore.submitCoachingApplicationV2()
 * - Return applicationId and aiSummary
 */
export async function submitCoachingApplicationApi(
  tenantId: string,
  userId: string,
  form: CoachingApplicationFormV2,
  frameSignals?: Record<string, any>
): Promise<SubmitApplicationResponse> {
  // Validate required fields
  const requiredFields = [
    'name',
    'email',
    'businessModel',
    'currentMonthlyRevenue',
    'targetMonthlyRevenue',
    'mainFrameProblems',
    'decisionMakerStatus',
    'budgetReadiness',
    'startTimeline',
    'whyNow',
  ];
  
  for (const field of requiredFields) {
    if (!form[field as keyof CoachingApplicationFormV2]) {
      return {
        success: false,
        applicationId: '',
        error: `Missing required field: ${field}`,
      };
    }
  }
  
  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    return {
      success: false,
      applicationId: '',
      error: 'Invalid email format',
    };
  }
  
  try {
    const result = await submitCoachingApplicationV2(tenantId, userId, form, frameSignals);
    return result;
  } catch (error: any) {
    console.error('[ApplicationAPI] submitCoachingApplication error:', error);
    return {
      success: false,
      applicationId: '',
      error: error.message || 'Failed to submit application',
    };
  }
}

// =============================================================================
// POST /api/apply/beta
// =============================================================================

/**
 * Submit a beta application
 * 
 * Similar to coaching but for beta program applications.
 * 
 * BACKEND IMPLEMENTATION:
 * - Validate payload against input_schema from beta_program_ai.json
 * - Call applicationStore.submitBetaApplicationV2()
 * - Return applicationId and aiSummary
 */
export async function submitBetaApplicationApi(
  tenantId: string,
  userId: string,
  form: BetaApplicationFormV2
): Promise<SubmitApplicationResponse> {
  // Validate required fields
  const requiredFields = [
    'name',
    'email',
    'reasonForBeta',
    'usageIntent',
    'expectedSessionsPerWeek',
  ];
  
  for (const field of requiredFields) {
    const value = form[field as keyof BetaApplicationFormV2];
    if (value === undefined || value === null || value === '') {
      return {
        success: false,
        applicationId: '',
        error: `Missing required field: ${field}`,
      };
    }
  }
  
  if (!form.acceptsUseItOrLoseIt) {
    return {
      success: false,
      applicationId: '',
      error: 'You must accept the use-it-or-lose-it policy',
    };
  }
  
  // Validate email format
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
    return {
      success: false,
      applicationId: '',
      error: 'Invalid email format',
    };
  }
  
  try {
    const result = await submitBetaApplicationV2(tenantId, userId, form);
    return result;
  } catch (error: any) {
    console.error('[ApplicationAPI] submitBetaApplication error:', error);
    return {
      success: false,
      applicationId: '',
      error: error.message || 'Failed to submit application',
    };
  }
}

// =============================================================================
// POST /api/scheduling/suggest-slots
// =============================================================================

/**
 * Get suggested available time slots
 * 
 * Returns available slots based on constraints and existing bookings.
 * 
 * BACKEND IMPLEMENTATION:
 * - Check existing confirmed and pending bookings
 * - Generate slots within constraints
 * - Return filtered available slots
 */
export function suggestSlotsApi(request: SuggestSlotsRequest): SuggestSlotsResponse {
  const slots = generateAvailableSlots(request.bookingType, request.timezone);
  const constraints = getBookingConstraints();
  
  return {
    slots,
    constraints,
  };
}

// =============================================================================
// POST /api/scheduling/book
// =============================================================================

/**
 * Book proposed time slots for an application
 * 
 * Creates booking proposals that require admin approval.
 * 
 * BACKEND IMPLEMENTATION:
 * - Validate applicationId exists
 * - Validate selectedSlots.length >= minProposedSlots
 * - Validate each slot against constraints
 * - Create booking records with status PENDING_APPROVAL
 * - Link bookings to application
 * - Send notification to owner
 */
export function bookSlotsApi(request: BookSlotsRequest): BookSlotsResponse {
  const {
    applicationId,
    bookingType,
    selectedSlots,
    phone,
    email,
    phoneConfirmed,
  } = request;
  
  // Validate phone confirmed
  if (!phoneConfirmed) {
    return {
      success: false,
      error: 'You must confirm that the phone number is correct',
    };
  }
  
  // Validate slots
  const validation = validateSlots(selectedSlots, bookingType);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.errors.join('; '),
    };
  }
  
  // Find application
  const coachingApp = getCoachingApplicationByIdV2(applicationId);
  const betaApp = getBetaApplicationByIdV2(applicationId);
  const application = coachingApp || betaApp;
  
  if (!application) {
    return {
      success: false,
      error: 'Application not found',
    };
  }
  
  // Create booking proposals
  const bookings = createBookingProposals(
    application.tenantId,
    application.userId,
    applicationId,
    bookingType,
    selectedSlots,
    phone,
    email
  );
  
  const bookingIds = bookings.map(b => b.id);
  
  // Link bookings to application
  if (coachingApp) {
    linkBookingsToCoachingApplication(applicationId, bookingIds);
  } else if (betaApp) {
    linkBookingsToBetaApplication(applicationId, bookingIds);
  }
  
  return {
    success: true,
    bookingIds,
    message: 'Your time proposals have been submitted. We will review and confirm via text and email.',
  };
}

// =============================================================================
// POST /api/scheduling/approve (Admin)
// =============================================================================

/**
 * Approve a booking slot (admin only)
 * 
 * Confirms one slot and marks others as superseded.
 * Triggers notifications to applicant.
 * 
 * BACKEND IMPLEMENTATION:
 * - Verify admin access
 * - Call approveBooking()
 * - Update application status to CALL_CONFIRMED
 * - Send confirmation email and SMS
 * - Schedule reminders
 */
export function approveBookingApi(
  bookingId: string,
  adminUserId: string
): { success: boolean; error?: string } {
  const booking = approveBooking(bookingId);
  
  if (!booking) {
    return {
      success: false,
      error: 'Booking not found or cannot be approved',
    };
  }
  
  // Update application status
  const coachingApp = getCoachingApplicationByIdV2(booking.applicationId);
  const betaApp = getBetaApplicationByIdV2(booking.applicationId);
  
  if (coachingApp) {
    updateCoachingApplicationStatusV2(booking.applicationId, 'CALL_CONFIRMED', {
      confirmedBookingId: bookingId,
    });
  } else if (betaApp) {
    updateBetaApplicationStatusV2(booking.applicationId, 'CALL_CONFIRMED', {
      confirmedBookingId: bookingId,
    });
  }
  
  // BACKEND TODO: Log admin action
  console.log('[ApplicationAPI] Booking approved by admin:', adminUserId, bookingId);
  
  return { success: true };
}

// =============================================================================
// GET /api/applications/:id
// =============================================================================

/**
 * Get application details with bookings
 */
export function getApplicationWithBookings(applicationId: string): {
  application: any;
  bookings: any[];
} | null {
  const coachingApp = getCoachingApplicationByIdV2(applicationId);
  const betaApp = getBetaApplicationByIdV2(applicationId);
  const application = coachingApp || betaApp;
  
  if (!application) {
    return null;
  }
  
  const bookings = getBookingsForApplication(applicationId);
  
  return {
    application,
    bookings,
  };
}

// =============================================================================
// HELPER: Format slot for display
// =============================================================================

export function formatSlotForDisplay(slot: TimeSlot, timezone?: string): string {
  const start = new Date(slot.start);
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  };
  
  if (timezone) {
    options.timeZone = timezone;
  }
  
  return start.toLocaleString('en-US', options);
}

/**
 * Calculate slot duration in minutes
 */
export function getSlotDuration(slot: TimeSlot): number {
  const start = new Date(slot.start).getTime();
  const end = new Date(slot.end).getTime();
  return Math.round((end - start) / (60 * 1000));
}

