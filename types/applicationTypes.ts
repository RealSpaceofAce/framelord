// =============================================================================
// APPLICATION & BOOKING TYPES — AI-powered application + booking flow
// =============================================================================
// Types for coaching and beta applications with AI evaluation and scheduling.
// These types are designed to be reusable for a standalone product.
// =============================================================================

// =============================================================================
// DECISION MAKER & BUDGET ENUMS
// =============================================================================

export type DecisionMakerStatus = 
  | 'SOLE_DECISION_MAKER' 
  | 'JOINT_DECISION_MAKER' 
  | 'NOT_DECISION_MAKER';

export type BudgetReadiness = 
  | 'CAN_PAY_IN_FULL' 
  | 'CAN_PAY_WITH_FINANCING' 
  | 'NEED_TO_MOVE_MONEY_FIRST' 
  | 'NO_ACTIVE_BUDGET';

export type StartTimeline = 
  | 'IMMEDIATELY' 
  | 'WITHIN_30_DAYS' 
  | 'WITHIN_90_DAYS' 
  | 'SOMEDAY_UNSPECIFIED';

// =============================================================================
// COACHING APPLICATION FORM (matches AI input_schema)
// =============================================================================

export interface CoachingApplicationFormV2 {
  name: string;
  email: string;
  phone: string;
  timezone?: string;
  businessModel: string;
  currentMonthlyRevenue: string;
  targetMonthlyRevenue: string;
  mainFrameProblems: string;
  topBusinessConstraints?: string;
  decisionMakerStatus: DecisionMakerStatus;
  budgetReadiness: BudgetReadiness;
  startTimeline: StartTimeline;
  previousCoachingExperience?: string;
  biggestRisksOrConcerns?: string;
  whyNow: string;
  dealBreakers?: string;
}

// =============================================================================
// COACHING AI EVALUATION RESULT (matches AI output_schema)
// =============================================================================

export type CoachingRecommendedOutcome = 
  | 'ACCEPT_HIGH_TICKET_CALL'
  | 'ACCEPT_BUT_POSITION_LOWER_TIER'
  | 'HOLD_AND_NURTURE'
  | 'REJECT_NOT_A_FIT';

export interface CoachingAiEvaluationV2 {
  fitScore: number;             // 0-100
  urgencyScore: number;         // 0-100
  moneyReadinessScore: number;  // 0-100
  decisionPowerScore: number;   // 0-100
  seriousnessScore: number;     // 0-100
  victimhoodRiskScore?: number; // 0-100, higher = more risk
  recommendedOutcome: CoachingRecommendedOutcome;
  flags: string[];
  strengthSignals?: string[];
  coachBriefing: string;
  callFocus?: string[];
}

// =============================================================================
// COACHING APPLICATION (full record)
// =============================================================================

export type CoachingApplicationStatusV2 = 
  | 'SUBMITTED'
  | 'AI_EVALUATED'
  | 'PENDING_SCHEDULING'
  | 'SCHEDULING_COMPLETE'
  | 'CALL_CONFIRMED'
  | 'CALL_COMPLETED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'DECLINED';

export interface CoachingApplicationV2 {
  id: string;
  tenantId: string;
  userId: string;
  submittedAt: string;
  status: CoachingApplicationStatusV2;
  form: CoachingApplicationFormV2;
  aiEvaluation?: CoachingAiEvaluationV2;
  frameSignalsFromApp?: Record<string, any>;
  bookingIds?: string[];        // Linked booking IDs
  confirmedBookingId?: string;  // The approved booking
  ownerNotifiedAt?: string;
  callCompletedAt?: string;
  notes?: string;               // Admin notes
}

// =============================================================================
// BETA APPLICATION FORM (matches AI input_schema)
// =============================================================================

export interface BetaApplicationFormV2 {
  name: string;
  email: string;
  phone: string;
  timezone?: string;
  role?: string;                // founder, solo coach, agency owner, etc.
  businessStage?: string;       // pre revenue, early revenue, established, scaling
  currentSystems?: string;      // What they use now
  reasonForBeta: string;
  usageIntent: string;
  expectedSessionsPerWeek: number;
  feedbackStyle?: string;
  acceptsUseItOrLoseIt: boolean;
}

// =============================================================================
// BETA AI EVALUATION RESULT (matches AI output_schema)
// =============================================================================

export type BetaTier = 'PRIORITY_BETA' | 'STANDARD_BETA' | 'DECLINE';

export interface BetaAiEvaluationV2 {
  betaFitScore: number;           // 0-100
  expectedEngagementScore: number; // 0-100
  feedbackQualityScore: number;    // 0-100
  riskOfChurnScore: number;        // 0-100, higher = more risk
  accept: boolean;
  tier: BetaTier;
  productOwnerNote: string;
  followUpQuestions?: string[];
}

// =============================================================================
// BETA APPLICATION (full record)
// =============================================================================

export type BetaApplicationStatusV2 = 
  | 'SUBMITTED'
  | 'AI_EVALUATED'
  | 'PENDING_SCHEDULING'
  | 'SCHEDULING_COMPLETE'
  | 'CALL_CONFIRMED'
  | 'CALL_COMPLETED'
  | 'APPROVED'
  | 'DECLINED';

export interface BetaApplicationV2 {
  id: string;
  tenantId: string;
  userId: string;
  submittedAt: string;
  status: BetaApplicationStatusV2;
  form: BetaApplicationFormV2;
  aiEvaluation?: BetaAiEvaluationV2;
  bookingIds?: string[];
  confirmedBookingId?: string;
  ownerNotifiedAt?: string;
  callCompletedAt?: string;
  notes?: string;
}

// =============================================================================
// BOOKING TYPES
// =============================================================================

export type BookingType = 'COACHING' | 'BETA';

export type BookingStatus = 
  | 'PENDING_APPROVAL'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED'
  | 'NO_SHOW'
  | 'SUPERSEDED';    // When another slot was chosen

export interface TimeSlot {
  start: string;  // ISO datetime
  end: string;    // ISO datetime
}

export interface Booking {
  id: string;
  tenantId: string;
  userId: string;
  applicationId: string;
  bookingType: BookingType;
  status: BookingStatus;
  slot: TimeSlot;
  phone: string;                // Confirmed phone for the call
  email: string;
  createdAt: string;
  confirmedAt?: string;
  cancelledAt?: string;
  completedAt?: string;
  remindersSent?: {
    twentyFourHour?: string;    // ISO datetime when sent
    oneHour?: string;
  };
  notes?: string;
}

// =============================================================================
// BOOKING CONSTRAINTS CONFIG
// =============================================================================

export interface BookingConstraints {
  coachingCallDurationMinutes: number;  // 45
  betaCallDurationMinutes: number;      // 10
  maxDaysOut: number;                   // 2
  minHourOfDay: number;                 // 12 (noon)
  maxHourOfDay: number;                 // 20 (8pm)
  minMinutesBetweenCalls: number;       // 60
  minProposedSlots: number;             // 2
  ownerTimezone: string;                // e.g., "America/New_York"
}

export const DEFAULT_BOOKING_CONSTRAINTS: BookingConstraints = {
  coachingCallDurationMinutes: 45,
  betaCallDurationMinutes: 10,
  maxDaysOut: 2,
  minHourOfDay: 12,
  maxHourOfDay: 20,
  minMinutesBetweenCalls: 60,
  minProposedSlots: 2,
  ownerTimezone: 'America/New_York',
};

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface SubmitApplicationRequest {
  tenantId: string;
  userId: string;
  form: CoachingApplicationFormV2 | BetaApplicationFormV2;
  type: 'coaching' | 'beta';
}

export interface SubmitApplicationResponse {
  success: boolean;
  applicationId: string;
  aiSummary?: {
    recommendedOutcome?: CoachingRecommendedOutcome;
    tier?: BetaTier;
    fitScore: number;
  };
  error?: string;
}

export interface BookSlotsRequest {
  applicationId: string;
  bookingType: BookingType;
  selectedSlots: TimeSlot[];
  phone: string;
  email: string;
  phoneConfirmed: boolean;
}

export interface BookSlotsResponse {
  success: boolean;
  bookingIds?: string[];
  error?: string;
  message?: string;
}

export interface SuggestSlotsRequest {
  bookingType: BookingType;
  timezone?: string;
}

export interface SuggestSlotsResponse {
  slots: TimeSlot[];
  constraints: BookingConstraints;
}

// =============================================================================
// APPLICATION STEP STATE (for UI state machine)
// =============================================================================

export type ApplicationStep = 
  | 'FORM'
  | 'SUBMITTING'
  | 'THANK_YOU'
  | 'SCHEDULING'
  | 'CONFIRMATION';

export interface ApplicationStepState {
  step: ApplicationStep;
  applicationId?: string;
  aiSummary?: SubmitApplicationResponse['aiSummary'];
  selectedSlots?: TimeSlot[];
  bookingIds?: string[];
  error?: string;
}

// =============================================================================
// OWNER NOTIFICATION DATA
// =============================================================================

export interface OwnerNotificationData {
  applicationType: 'coaching' | 'beta';
  applicationId: string;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  submittedAt: string;
  formData: CoachingApplicationFormV2 | BetaApplicationFormV2;
  aiEvaluation: CoachingAiEvaluationV2 | BetaAiEvaluationV2;
  proposedSlots?: TimeSlot[];
}

