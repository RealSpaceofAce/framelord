// =============================================================================
// APPLICATION STORE — AI-powered application management
// =============================================================================
// Manages coaching and beta applications with AI evaluation.
// Designed to be reusable as a standalone product.
// =============================================================================

import type {
  CoachingApplicationV2,
  CoachingApplicationFormV2,
  CoachingAiEvaluationV2,
  CoachingApplicationStatusV2,
  BetaApplicationV2,
  BetaApplicationFormV2,
  BetaAiEvaluationV2,
  BetaApplicationStatusV2,
  SubmitApplicationRequest,
  SubmitApplicationResponse,
  OwnerNotificationData,
  TimeSlot,
} from '../types/applicationTypes';
import { callOpenAIChat } from '../lib/llm/openaiClient';
import coachingAiConfig from '../config/coaching_application_ai.json';
import betaAiConfig from '../config/beta_program_ai.json';

const COACHING_STORAGE_KEY = 'framelord_coaching_applications_v2';
const BETA_STORAGE_KEY = 'framelord_beta_applications_v2';

// In-memory cache
let coachingApplications: CoachingApplicationV2[] = [];
let betaApplications: BetaApplicationV2[] = [];
let coachingInitialized = false;
let betaInitialized = false;

// =============================================================================
// INITIALIZATION
// =============================================================================

function initCoaching(): void {
  if (coachingInitialized) return;
  
  try {
    const stored = localStorage.getItem(COACHING_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        coachingApplications = parsed;
      }
    }
  } catch {
    console.warn('[ApplicationStore] Failed to load coaching applications');
  }
  
  coachingInitialized = true;
}

function initBeta(): void {
  if (betaInitialized) return;
  
  try {
    const stored = localStorage.getItem(BETA_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        betaApplications = parsed;
      }
    }
  } catch {
    console.warn('[ApplicationStore] Failed to load beta applications');
  }
  
  betaInitialized = true;
}

function persistCoaching(): void {
  try {
    localStorage.setItem(COACHING_STORAGE_KEY, JSON.stringify(coachingApplications));
  } catch {
    console.warn('[ApplicationStore] Failed to persist coaching applications');
  }
}

function persistBeta(): void {
  try {
    localStorage.setItem(BETA_STORAGE_KEY, JSON.stringify(betaApplications));
  } catch {
    console.warn('[ApplicationStore] Failed to persist beta applications');
  }
}

// =============================================================================
// AI EVALUATION
// =============================================================================

/**
 * Build system prompt for coaching evaluation
 */
function buildCoachingSystemPrompt(): string {
  const config = coachingAiConfig;
  return `${config.system_instructions.identity}

${config.system_instructions.loyalty}

PRINCIPLES:
${config.system_instructions.principles.map((p: string) => `- ${p}`).join('\n')}

FORBIDDEN BEHAVIORS:
${config.system_instructions.forbidden_behaviors.map((f: string) => `- ${f}`).join('\n')}

You must evaluate the application and return a JSON object matching this schema:
${JSON.stringify(config.output_schema, null, 2)}

Return ONLY valid JSON. No markdown, no explanation outside the JSON.`;
}

/**
 * Build system prompt for beta evaluation
 */
function buildBetaSystemPrompt(): string {
  const config = betaAiConfig;
  return `${config.system_instructions.identity}

${config.system_instructions.loyalty}

PRINCIPLES:
${config.system_instructions.principles.map((p: string) => `- ${p}`).join('\n')}

FORBIDDEN BEHAVIORS:
${config.system_instructions.forbidden_behaviors.map((f: string) => `- ${f}`).join('\n')}

You must evaluate the application and return a JSON object matching this schema:
${JSON.stringify(config.output_schema, null, 2)}

Return ONLY valid JSON. No markdown, no explanation outside the JSON.`;
}

/**
 * Evaluate coaching application with AI
 */
export async function evaluateCoachingApplication(
  form: CoachingApplicationFormV2,
  frameSignals?: Record<string, any>
): Promise<CoachingAiEvaluationV2> {
  const systemPrompt = buildCoachingSystemPrompt();
  const userPrompt = JSON.stringify({
    ...form,
    frameSignalsFromApp: frameSignals ?? null,
  }, null, 2);
  
  try {
    const response = await callOpenAIChat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Evaluate this coaching application:\n\n${userPrompt}` },
    ]);
    
    const rawText = response.rawText ?? '';
    
    // Parse JSON from response
    let parsed: CoachingAiEvaluationV2;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      // Try to extract JSON from markdown
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }
    
    // Validate required fields
    if (typeof parsed.fitScore !== 'number') {
      throw new Error('Missing fitScore in AI response');
    }
    
    return parsed;
  } catch (error) {
    console.error('[ApplicationStore] AI evaluation failed:', error);
    
    // Return fallback evaluation
    return generateFallbackCoachingEvaluation(form);
  }
}

/**
 * Evaluate beta application with AI
 */
export async function evaluateBetaApplication(
  form: BetaApplicationFormV2
): Promise<BetaAiEvaluationV2> {
  const systemPrompt = buildBetaSystemPrompt();
  const userPrompt = JSON.stringify(form, null, 2);
  
  try {
    const response = await callOpenAIChat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Evaluate this beta application:\n\n${userPrompt}` },
    ]);
    
    const rawText = response.rawText ?? '';
    
    let parsed: BetaAiEvaluationV2;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Failed to parse AI response as JSON');
      }
    }
    
    if (typeof parsed.betaFitScore !== 'number') {
      throw new Error('Missing betaFitScore in AI response');
    }
    
    return parsed;
  } catch (error) {
    console.error('[ApplicationStore] Beta AI evaluation failed:', error);
    
    return generateFallbackBetaEvaluation(form);
  }
}

/**
 * Fallback coaching evaluation when AI fails
 */
function generateFallbackCoachingEvaluation(
  form: CoachingApplicationFormV2
): CoachingAiEvaluationV2 {
  // Basic heuristic scoring
  let fitScore = 50;
  let moneyReadinessScore = 50;
  let decisionPowerScore = 50;
  let seriousnessScore = 50;
  
  // Budget readiness
  if (form.budgetReadiness === 'CAN_PAY_IN_FULL') moneyReadinessScore = 90;
  else if (form.budgetReadiness === 'CAN_PAY_WITH_FINANCING') moneyReadinessScore = 70;
  else if (form.budgetReadiness === 'NEED_TO_MOVE_MONEY_FIRST') moneyReadinessScore = 40;
  else moneyReadinessScore = 20;
  
  // Decision maker
  if (form.decisionMakerStatus === 'SOLE_DECISION_MAKER') decisionPowerScore = 90;
  else if (form.decisionMakerStatus === 'JOINT_DECISION_MAKER') decisionPowerScore = 60;
  else decisionPowerScore = 30;
  
  // Timeline
  if (form.startTimeline === 'IMMEDIATELY') seriousnessScore = 90;
  else if (form.startTimeline === 'WITHIN_30_DAYS') seriousnessScore = 70;
  else if (form.startTimeline === 'WITHIN_90_DAYS') seriousnessScore = 50;
  else seriousnessScore = 30;
  
  // Overall fit based on content length
  const contentLength = (
    form.mainFrameProblems.length +
    form.whyNow.length +
    form.businessModel.length
  );
  if (contentLength > 500) fitScore = 70;
  else if (contentLength > 200) fitScore = 50;
  else fitScore = 30;
  
  const avgScore = (fitScore + moneyReadinessScore + decisionPowerScore + seriousnessScore) / 4;
  
  let recommendedOutcome: CoachingAiEvaluationV2['recommendedOutcome'];
  if (avgScore >= 70 && moneyReadinessScore >= 60 && decisionPowerScore >= 60) {
    recommendedOutcome = 'ACCEPT_HIGH_TICKET_CALL';
  } else if (avgScore >= 50) {
    recommendedOutcome = 'ACCEPT_BUT_POSITION_LOWER_TIER';
  } else if (avgScore >= 35) {
    recommendedOutcome = 'HOLD_AND_NURTURE';
  } else {
    recommendedOutcome = 'REJECT_NOT_A_FIT';
  }
  
  return {
    fitScore,
    urgencyScore: seriousnessScore,
    moneyReadinessScore,
    decisionPowerScore,
    seriousnessScore,
    victimhoodRiskScore: 30,
    recommendedOutcome,
    flags: ['AI evaluation fallback - manual review recommended'],
    strengthSignals: ['Application submitted'],
    coachBriefing: `Fallback evaluation for ${form.name}. Budget: ${form.budgetReadiness}. Decision maker: ${form.decisionMakerStatus}. Timeline: ${form.startTimeline}. Manual review required.`,
    callFocus: ['Verify budget readiness', 'Assess decision-making authority', 'Clarify goals'],
  };
}

/**
 * Fallback beta evaluation when AI fails
 */
function generateFallbackBetaEvaluation(
  form: BetaApplicationFormV2
): BetaAiEvaluationV2 {
  let betaFitScore = 50;
  let expectedEngagementScore = 50;
  
  // Expected sessions
  if (form.expectedSessionsPerWeek >= 5) expectedEngagementScore = 80;
  else if (form.expectedSessionsPerWeek >= 3) expectedEngagementScore = 60;
  else expectedEngagementScore = 40;
  
  // Use it or lose it acceptance
  if (!form.acceptsUseItOrLoseIt) {
    expectedEngagementScore -= 20;
  }
  
  // Content quality
  if (form.reasonForBeta.length > 100 && form.usageIntent.length > 100) {
    betaFitScore = 70;
  }
  
  const avgScore = (betaFitScore + expectedEngagementScore) / 2;
  
  return {
    betaFitScore,
    expectedEngagementScore,
    feedbackQualityScore: 50,
    riskOfChurnScore: 100 - expectedEngagementScore,
    accept: avgScore >= 50 && form.acceptsUseItOrLoseIt,
    tier: avgScore >= 70 ? 'PRIORITY_BETA' : avgScore >= 50 ? 'STANDARD_BETA' : 'DECLINE',
    productOwnerNote: `Fallback evaluation for ${form.name}. Expected ${form.expectedSessionsPerWeek} sessions/week. Manual review recommended.`,
    followUpQuestions: ['Verify commitment to active usage', 'Understand specific use case'],
  };
}

// =============================================================================
// COACHING APPLICATION CRUD
// =============================================================================

/**
 * Submit a coaching application
 */
export async function submitCoachingApplicationV2(
  tenantId: string,
  userId: string,
  form: CoachingApplicationFormV2,
  frameSignals?: Record<string, any>
): Promise<SubmitApplicationResponse> {
  initCoaching();
  
  const id = `ca2_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  
  // Create application record
  const application: CoachingApplicationV2 = {
    id,
    tenantId,
    userId,
    submittedAt: new Date().toISOString(),
    status: 'SUBMITTED',
    form,
    frameSignalsFromApp: frameSignals,
  };
  
  coachingApplications = [application, ...coachingApplications];
  persistCoaching();
  
  // Run AI evaluation
  const aiEvaluation = await evaluateCoachingApplication(form, frameSignals);
  
  // Update with AI result
  const index = coachingApplications.findIndex(a => a.id === id);
  if (index >= 0) {
    coachingApplications[index] = {
      ...coachingApplications[index],
      aiEvaluation,
      status: 'AI_EVALUATED',
    };
    persistCoaching();
  }
  
  // Notify owner
  await notifyOwnerOfApplication('coaching', application, aiEvaluation);
  
  return {
    success: true,
    applicationId: id,
    aiSummary: {
      recommendedOutcome: aiEvaluation.recommendedOutcome,
      fitScore: aiEvaluation.fitScore,
    },
  };
}

/**
 * Get coaching application by ID
 */
export function getCoachingApplicationByIdV2(id: string): CoachingApplicationV2 | null {
  initCoaching();
  return coachingApplications.find(a => a.id === id) ?? null;
}

/**
 * Get all coaching applications
 */
export function getAllCoachingApplicationsV2(): CoachingApplicationV2[] {
  initCoaching();
  return [...coachingApplications];
}

/**
 * Get coaching applications for a tenant
 */
export function getCoachingApplicationsForTenant(tenantId: string): CoachingApplicationV2[] {
  initCoaching();
  return coachingApplications.filter(a => a.tenantId === tenantId);
}

/**
 * Update coaching application status
 */
export function updateCoachingApplicationStatusV2(
  id: string,
  status: CoachingApplicationStatusV2,
  updates?: Partial<CoachingApplicationV2>
): CoachingApplicationV2 | null {
  initCoaching();
  
  const index = coachingApplications.findIndex(a => a.id === id);
  if (index < 0) return null;
  
  coachingApplications[index] = {
    ...coachingApplications[index],
    ...updates,
    status,
  };
  persistCoaching();
  
  return coachingApplications[index];
}

/**
 * Link bookings to coaching application
 */
export function linkBookingsToCoachingApplication(
  applicationId: string,
  bookingIds: string[]
): CoachingApplicationV2 | null {
  return updateCoachingApplicationStatusV2(applicationId, 'SCHEDULING_COMPLETE', {
    bookingIds,
  });
}

// =============================================================================
// BETA APPLICATION CRUD
// =============================================================================

/**
 * Submit a beta application
 */
export async function submitBetaApplicationV2(
  tenantId: string,
  userId: string,
  form: BetaApplicationFormV2
): Promise<SubmitApplicationResponse> {
  initBeta();
  
  const id = `ba2_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  
  const application: BetaApplicationV2 = {
    id,
    tenantId,
    userId,
    submittedAt: new Date().toISOString(),
    status: 'SUBMITTED',
    form,
  };
  
  betaApplications = [application, ...betaApplications];
  persistBeta();
  
  // Run AI evaluation
  const aiEvaluation = await evaluateBetaApplication(form);
  
  // Update with AI result
  const index = betaApplications.findIndex(a => a.id === id);
  if (index >= 0) {
    betaApplications[index] = {
      ...betaApplications[index],
      aiEvaluation,
      status: 'AI_EVALUATED',
    };
    persistBeta();
  }
  
  // Notify owner
  await notifyOwnerOfApplication('beta', application, aiEvaluation);
  
  return {
    success: true,
    applicationId: id,
    aiSummary: {
      tier: aiEvaluation.tier,
      fitScore: aiEvaluation.betaFitScore,
    },
  };
}

/**
 * Get beta application by ID
 */
export function getBetaApplicationByIdV2(id: string): BetaApplicationV2 | null {
  initBeta();
  return betaApplications.find(a => a.id === id) ?? null;
}

/**
 * Get all beta applications
 */
export function getAllBetaApplicationsV2(): BetaApplicationV2[] {
  initBeta();
  return [...betaApplications];
}

/**
 * Get beta applications for a tenant
 */
export function getBetaApplicationsForTenant(tenantId: string): BetaApplicationV2[] {
  initBeta();
  return betaApplications.filter(a => a.tenantId === tenantId);
}

/**
 * Update beta application status
 */
export function updateBetaApplicationStatusV2(
  id: string,
  status: BetaApplicationStatusV2,
  updates?: Partial<BetaApplicationV2>
): BetaApplicationV2 | null {
  initBeta();
  
  const index = betaApplications.findIndex(a => a.id === id);
  if (index < 0) return null;
  
  betaApplications[index] = {
    ...betaApplications[index],
    ...updates,
    status,
  };
  persistBeta();
  
  return betaApplications[index];
}

/**
 * Link bookings to beta application
 */
export function linkBookingsToBetaApplication(
  applicationId: string,
  bookingIds: string[]
): BetaApplicationV2 | null {
  return updateBetaApplicationStatusV2(applicationId, 'SCHEDULING_COMPLETE', {
    bookingIds,
  });
}

// =============================================================================
// OWNER NOTIFICATION
// =============================================================================

/**
 * Notify owner of new application
 * BACKEND STUB: This would send email
 */
async function notifyOwnerOfApplication(
  type: 'coaching' | 'beta',
  application: CoachingApplicationV2 | BetaApplicationV2,
  aiEvaluation: CoachingAiEvaluationV2 | BetaAiEvaluationV2
): Promise<void> {
  const form = application.form as any;
  
  const notificationData: OwnerNotificationData = {
    applicationType: type,
    applicationId: application.id,
    applicantName: form.name,
    applicantEmail: form.email,
    applicantPhone: form.phone || 'Not provided',
    submittedAt: application.submittedAt,
    formData: application.form,
    aiEvaluation,
  };
  
  // BACKEND TODO: Send email to owner with full application data
  // BACKEND TODO: Include AI scores and briefing
  // BACKEND TODO: Include link to admin portal
  
  console.log('[ApplicationStore] BACKEND STUB: notifyOwnerOfApplication', {
    type,
    applicationId: application.id,
    applicantName: form.name,
  });
  
  // Update notification timestamp
  if (type === 'coaching') {
    const idx = coachingApplications.findIndex(a => a.id === application.id);
    if (idx >= 0) {
      coachingApplications[idx].ownerNotifiedAt = new Date().toISOString();
      persistCoaching();
    }
  } else {
    const idx = betaApplications.findIndex(a => a.id === application.id);
    if (idx >= 0) {
      betaApplications[idx].ownerNotifiedAt = new Date().toISOString();
      persistBeta();
    }
  }
}

/**
 * Send booking confirmation to applicant
 * BACKEND STUB: Would send email and SMS
 */
export async function sendBookingConfirmation(
  applicationType: 'coaching' | 'beta',
  applicationId: string,
  confirmedSlot: TimeSlot,
  phone: string,
  email: string
): Promise<void> {
  const callDuration = applicationType === 'coaching' ? '45 minutes' : '10 minutes';
  const callType = applicationType === 'coaching' ? 'Apex Coaching Discovery Call' : 'FrameLord Beta Call';
  
  const message = `Your ${callType} has been confirmed for ${new Date(confirmedSlot.start).toLocaleString()}. This will be a ${callDuration} phone call to the number: ${phone}. Please make sure you are available at that time.`;
  
  // BACKEND TODO: Send confirmation email
  // BACKEND TODO: Send confirmation SMS
  console.log('[ApplicationStore] BACKEND STUB: sendBookingConfirmation', {
    email,
    phone,
    message: message.slice(0, 100) + '...',
  });
}

// =============================================================================
// QUERY HELPERS
// =============================================================================

/**
 * Get applications pending scheduling
 */
export function getApplicationsPendingScheduling(): {
  coaching: CoachingApplicationV2[];
  beta: BetaApplicationV2[];
} {
  initCoaching();
  initBeta();
  
  return {
    coaching: coachingApplications.filter(a => 
      a.status === 'AI_EVALUATED' || a.status === 'PENDING_SCHEDULING'
    ),
    beta: betaApplications.filter(a => 
      a.status === 'AI_EVALUATED' || a.status === 'PENDING_SCHEDULING'
    ),
  };
}

/**
 * Get applications with pending call approval
 */
export function getApplicationsWithPendingApproval(): {
  coaching: CoachingApplicationV2[];
  beta: BetaApplicationV2[];
} {
  initCoaching();
  initBeta();
  
  return {
    coaching: coachingApplications.filter(a => a.status === 'SCHEDULING_COMPLETE'),
    beta: betaApplications.filter(a => a.status === 'SCHEDULING_COMPLETE'),
  };
}

// =============================================================================
// RESET (TESTING ONLY)
// =============================================================================

export function resetApplicationStore(): void {
  coachingApplications = [];
  betaApplications = [];
  coachingInitialized = false;
  betaInitialized = false;
  localStorage.removeItem(COACHING_STORAGE_KEY);
  localStorage.removeItem(BETA_STORAGE_KEY);
}

