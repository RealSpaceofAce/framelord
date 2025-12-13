// =============================================================================
// ADMIN NOTIFICATION SERVICE — SendGrid Email Integration
// =============================================================================
// Sends email notifications to platform admins for various events:
// - Tier 1 intake completion
// - Tier 2 (Apex Blueprint) module completion
// - Beta application submissions
// - Case call application submissions
//
// !! SECURITY WARNING !!
// This service is currently imported from client-side React code.
// Until this is moved to a server-side endpoint, EMAIL_ENABLED must remain FALSE.
//
// To enable email sending:
// 1. Create server-side API endpoints for each notification type
// 2. Have the client POST the payload to that endpoint
// 3. Set EMAIL_ENABLED in the server runtime (process.env.EMAIL_ENABLED = "true")
// 4. Configure these env vars on the server:
//    - SENDGRID_API_KEY
//    - INTAKE_NOTIFY_EMAIL (admin recipient)
//    - EMAIL_FROM_ADDRESS (default: support@framelord.com)
//
// DO NOT set EMAIL_ENABLED = true while this code runs client-side.
// =============================================================================

import type { IntakeSession, Answer, IntakeMetrics } from '../types/businessFrame';
import type { Contact, ContactIntakeProfile } from '../types';
import { getSessionById } from './intakeStore';
import { getContactById } from './contactStore';
import { IntakeTier } from '../types/businessFrame';
import { notifyUser, type UserForNotification } from './notificationService';
import { getCurrentUserPlan } from '../config/planConfig';

// --- TYPES ---

export interface IntakeEmailPayload {
  sessionId: string;
  contactId: string;
  contactName: string;
  contactEmail?: string;
  tier: number;
  module?: string; // For Tier 2: MONEY, AUTHORITY, OPERATIONS
  status: string;
  completedAt: string;
  answerCount: number;
  answers: {
    questionId: string;
    questionText: string;
    inputType: string;
    rawText: string;
  }[];
  metrics?: {
    overallFrameScore: number;
    frameType: string;
    selfRatedFrameScore?: number;
    activeFlags: string[];
  };
  profile?: {
    primaryVision?: string;
    wants?: string[];
    keyConstraint?: string;
  };
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  provider?: 'sendgrid' | 'console';
}

// --- CONFIGURATION ---

// !! SECURITY: This MUST be false while this code is bundled client-side !!
// Only enable when running in a Node.js server runtime.
const EMAIL_ENABLED = false;

// Fallback config - in production, use process.env from server/env.ts
const SENDGRID_API_KEY = '';
const INTAKE_NOTIFY_EMAIL = '';
// Future production From address: support@framelord.com
const EMAIL_FROM_ADDRESS = 'FrameLord <support@framelord.com>';

// =============================================================================
// ADMIN NOTIFICATION TYPES (for beta, case-call, and other events)
// =============================================================================

export type AdminNotificationEventType =
  | 'BETA_APPLICATION_SUBMITTED'
  | 'TIER_1_INTAKE_COMPLETED'
  | 'INTAKE_SESSION_COMPLETED'
  | 'CASE_CALL_APPLICATION_SUBMITTED';

export interface AdminNotificationPayload {
  eventType: AdminNotificationEventType;
  route: string;
  contactId?: string;
  userId?: string;
  name: string;
  email?: string;
  timestamp: string;
  answers: {
    question: string;
    answer: string;
  }[];
  metadata?: Record<string, unknown>;
}

export interface BetaApplicationData {
  id: string;
  email: string;
  name: string;
  conversationHistory: { role: 'user' | 'ai'; content: string }[];
  submittedAt: string;
}

export interface CaseCallApplicationData {
  id: string;
  email: string;
  name: string;
  phone?: string;
  answers: { question: string; answer: string }[];
  contactId?: string;
  submittedAt: string;
}

// --- HELPER FUNCTIONS ---

/**
 * Check if we're running in a server environment
 */
const isServerRuntime = (): boolean => {
  return typeof window === 'undefined' && typeof process !== 'undefined';
};

/**
 * Format an intake session into an email payload
 */
export const formatIntakeEmailPayload = (sessionId: string): IntakeEmailPayload | null => {
  const session = getSessionById(sessionId);
  if (!session) {
    console.warn(`[IntakeNotification] Session ${sessionId} not found`);
    return null;
  }

  const contact = getContactById(session.contactId);
  const contactName = contact?.fullName || 'Unknown Contact';
  const contactEmail = contact?.email;

  const payload: IntakeEmailPayload = {
    sessionId: session.id,
    contactId: session.contactId,
    contactName,
    contactEmail,
    tier: session.tier,
    module: session.module, // Include module for Tier 2
    status: session.status,
    completedAt: session.completedAt || new Date().toISOString(),
    answerCount: session.answers.length,
    answers: session.answers.map(a => ({
      questionId: a.questionId,
      questionText: a.questionText,
      inputType: a.inputType,
      rawText: a.rawText,
    })),
  };

  // Add metrics if available
  if (session.metrics) {
    payload.metrics = {
      overallFrameScore: session.metrics.overallFrameScore,
      frameType: session.metrics.frameType,
      selfRatedFrameScore: session.metrics.selfRatedFrameScore,
      activeFlags: session.metrics.activeFlags.map(f => f.code),
    };
  }

  // Add profile data if available
  if (contact?.contactProfile) {
    payload.profile = {
      primaryVision: contact.contactProfile.primaryVision,
      wants: contact.contactProfile.wants,
      keyConstraint: contact.contactProfile.keyConstraint,
    };
  }

  return payload;
};

/**
 * Generate HTML email content from payload
 */
const generateEmailHtml = (payload: IntakeEmailPayload): string => {
  const answersHtml = payload.answers
    .map(
      (a, i) => `
      <div style="margin-bottom: 16px; padding: 12px; background: #f5f5f5; border-radius: 8px;">
        <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
          Q${i + 1}: ${escapeHtml(a.questionId)} (${escapeHtml(a.inputType)})
        </div>
        <div style="font-size: 14px; color: #333; margin-bottom: 8px;">
          ${escapeHtml(a.questionText)}
        </div>
        <div style="font-size: 14px; color: #000; background: #fff; padding: 8px; border-radius: 4px; border: 1px solid #ddd;">
          ${escapeHtml(a.rawText)}
        </div>
      </div>
    `
    )
    .join('');

  const metricsHtml = payload.metrics
    ? `
      <div style="margin-top: 24px; padding: 16px; background: #e8f4f8; border-radius: 8px;">
        <h3 style="margin: 0 0 12px; font-size: 14px; color: #333;">Analysis Metrics</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 8px 0;">
              <div style="font-size: 12px; color: #666;">Frame Score</div>
              <div style="font-size: 24px; font-weight: bold; color: #4433FF;">${payload.metrics.overallFrameScore}</div>
            </td>
            <td style="padding: 8px 0;">
              <div style="font-size: 12px; color: #666;">Frame Type</div>
              <div style="font-size: 16px; font-weight: 500; color: #333; text-transform: capitalize;">${escapeHtml(payload.metrics.frameType)}</div>
            </td>
            <td style="padding: 8px 0;">
              <div style="font-size: 12px; color: #666;">Self Rating</div>
              <div style="font-size: 24px; font-weight: bold; color: #333;">${payload.metrics.selfRatedFrameScore ?? '—'}</div>
            </td>
          </tr>
        </table>
        ${
          payload.metrics.activeFlags.length > 0
            ? `
          <div style="margin-top: 12px;">
            <div style="font-size: 12px; color: #666; margin-bottom: 4px;">Active Flags</div>
            <div>${payload.metrics.activeFlags.map(f => `<span style="display: inline-block; margin-right: 4px; margin-bottom: 4px; padding: 2px 8px; background: #ff4433; color: #fff; border-radius: 4px; font-size: 11px;">${escapeHtml(f)}</span>`).join('')}</div>
          </div>
        `
            : ''
        }
      </div>
    `
    : '';

  const profileHtml = payload.profile
    ? `
      <div style="margin-top: 24px; padding: 16px; background: #f0f0f0; border-radius: 8px;">
        <h3 style="margin: 0 0 12px; font-size: 14px; color: #333;">Profile Insights</h3>
        ${payload.profile.primaryVision ? `
          <div style="margin-bottom: 12px;">
            <div style="font-size: 12px; color: #666;">Primary Vision</div>
            <div style="font-size: 14px; color: #333;">${escapeHtml(payload.profile.primaryVision)}</div>
          </div>
        ` : ''}
        ${payload.profile.wants && payload.profile.wants.length > 0 ? `
          <div style="margin-bottom: 12px;">
            <div style="font-size: 12px; color: #666;">Wants</div>
            <ul style="margin: 4px 0; padding-left: 20px;">
              ${payload.profile.wants.map(w => `<li style="font-size: 14px; color: #333;">${escapeHtml(w)}</li>`).join('')}
            </ul>
          </div>
        ` : ''}
        ${payload.profile.keyConstraint ? `
          <div>
            <div style="font-size: 12px; color: #666;">Key Constraint</div>
            <div style="font-size: 14px; color: #333;">${escapeHtml(payload.profile.keyConstraint)}</div>
          </div>
        ` : ''}
      </div>
    `
    : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Intake Session Completed</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff;">
      <div style="background: #0A0A0A; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
        <h1 style="margin: 0; color: #fff; font-size: 18px;">[FrameLord Intake] Session Completed</h1>
        <p style="margin: 8px 0 0; color: #888; font-size: 14px;">Tier ${payload.tier} intake for ${escapeHtml(payload.contactName)}</p>
      </div>

      <div style="background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #eee;">
        <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
          <div style="font-size: 12px; color: #666;">Contact</div>
          <div style="font-size: 16px; font-weight: 500; color: #333;">${escapeHtml(payload.contactName)}</div>
          ${payload.contactEmail ? `<div style="font-size: 14px; color: #666;">${escapeHtml(payload.contactEmail)}</div>` : ''}
        </div>

        <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
          <div style="font-size: 12px; color: #666;">Session Details</div>
          <div style="font-size: 14px; color: #333;">
            Tier ${payload.tier} &bull; ${payload.answerCount} answers &bull; Completed ${formatDate(payload.completedAt)}
          </div>
          <div style="font-size: 12px; color: #888; font-family: monospace; margin-top: 4px;">${escapeHtml(payload.sessionId)}</div>
        </div>

        ${profileHtml}
        ${metricsHtml}

        <h2 style="font-size: 14px; color: #333; margin: 24px 0 12px; padding-top: 20px; border-top: 1px solid #eee;">Full Questions & Answers</h2>
        ${answersHtml}
      </div>

      <div style="margin-top: 20px; padding: 12px; text-align: center; color: #888; font-size: 12px;">
        Sent from FrameLord Intake System
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate plain text email content from payload
 */
const generateEmailText = (payload: IntakeEmailPayload): string => {
  const answersText = payload.answers
    .map((a, i) => `Q${i + 1} (${a.questionId}): ${a.questionText}\nA: ${a.rawText}\n`)
    .join('\n');

  let metricsText = '';
  if (payload.metrics) {
    metricsText = `
ANALYSIS METRICS
----------------
- Frame Score: ${payload.metrics.overallFrameScore}
- Frame Type: ${payload.metrics.frameType}
- Self Rating: ${payload.metrics.selfRatedFrameScore ?? 'N/A'}
- Active Flags: ${payload.metrics.activeFlags.join(', ') || 'None'}
`;
  }

  let profileText = '';
  if (payload.profile) {
    const parts: string[] = [];
    if (payload.profile.primaryVision) {
      parts.push(`Primary Vision: ${payload.profile.primaryVision}`);
    }
    if (payload.profile.wants && payload.profile.wants.length > 0) {
      parts.push(`Wants:\n${payload.profile.wants.map(w => `  - ${w}`).join('\n')}`);
    }
    if (payload.profile.keyConstraint) {
      parts.push(`Key Constraint: ${payload.profile.keyConstraint}`);
    }
    if (parts.length > 0) {
      profileText = `
PROFILE INSIGHTS
----------------
${parts.join('\n')}
`;
    }
  }

  return `
[FRAMELORD INTAKE] SESSION COMPLETED
====================================

Contact: ${payload.contactName}${payload.contactEmail ? ` (${payload.contactEmail})` : ''}
Tier: ${payload.tier}
Answers: ${payload.answerCount}
Completed: ${formatDate(payload.completedAt)}
Session ID: ${payload.sessionId}
${profileText}${metricsText}
FULL QUESTIONS & ANSWERS
------------------------
${answersText}
---
Sent from FrameLord Intake System
  `.trim();
};

/**
 * Helper to escape HTML special characters
 */
const escapeHtml = (str: string): string => {
  const htmlEscapes: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return str.replace(/[&<>"']/g, char => htmlEscapes[char] || char);
};

/**
 * Format date for display
 */
const formatDate = (isoString: string): string => {
  try {
    return new Date(isoString).toLocaleString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  } catch {
    return isoString;
  }
};

// --- EMAIL SENDING ---

/**
 * Internal helper to send email
 * NOTE: SendGrid integration removed from client bundle.
 * When server-side email is needed, implement via API route.
 */
const sendEmail = async (
  subject: string,
  _html: string,
  _text: string,
  _apiKey: string,
  toEmail: string,
  _fromEmail: string
): Promise<EmailSendResult> => {
  console.log(`[IntakeNotification] Email sending requires server-side implementation`);
  console.log(`  To: ${toEmail}`);
  console.log(`  Subject: ${subject}`);

  return {
    success: false,
    error: 'Email sending requires server-side API route',
    provider: 'console',
  };
};

/**
 * Send intake completion email
 *
 * @param sessionId - The completed intake session ID
 * @returns Result of the email send operation
 */
export const sendIntakeCompletionEmail = async (
  sessionId: string
): Promise<EmailSendResult> => {
  const payload = formatIntakeEmailPayload(sessionId);
  if (!payload) {
    return {
      success: false,
      error: 'Failed to format email payload - session not found',
      provider: 'console',
    };
  }

  // Build subject line - include module name for Tier 2
  const tierLabel = payload.module
    ? `Tier ${payload.tier} (${payload.module})`
    : `Tier ${payload.tier}`;
  const subject = `[FrameLord Intake] ${payload.contactName} – ${tierLabel} completed`;
  const html = generateEmailHtml(payload);
  const text = generateEmailText(payload);

  // Always log to console for dev visibility
  console.log('[IntakeNotification] Intake completion notification:');
  console.log('  Subject:', subject);
  console.log('  Contact:', payload.contactName);
  console.log('  Email:', payload.contactEmail || 'N/A');
  console.log('  Session:', payload.sessionId);
  console.log('  Answers:', payload.answerCount);
  if (payload.metrics) {
    console.log('  Frame Score:', payload.metrics.overallFrameScore);
    console.log('  Self Rating:', payload.metrics.selfRatedFrameScore);
  }

  // Check if email is enabled
  if (!EMAIL_ENABLED) {
    console.log('[IntakeNotification] EMAIL_ENABLED is false. Skipping send.');
    return {
      success: true,
      messageId: `console-${Date.now()}`,
      provider: 'console',
    };
  }

  // Runtime check - should only send from server
  if (!isServerRuntime()) {
    console.warn('[IntakeNotification] Attempted to send email from client-side. Skipping.');
    return {
      success: false,
      error: 'Email sending is only allowed from server-side code',
      provider: 'console',
    };
  }

  // Check for required configuration
  const apiKey = SENDGRID_API_KEY || process.env.SENDGRID_API_KEY;
  const notifyEmail = INTAKE_NOTIFY_EMAIL || process.env.INTAKE_NOTIFY_EMAIL;
  const fromEmail = EMAIL_FROM_ADDRESS || process.env.EMAIL_FROM_ADDRESS || 'FrameLord Intake <no-reply@framelord.com>';

  if (!apiKey || !notifyEmail) {
    console.error('[IntakeNotification] Missing SendGrid configuration. Skipping send.');
    console.error('  SENDGRID_API_KEY:', apiKey ? 'set' : 'missing');
    console.error('  INTAKE_NOTIFY_EMAIL:', notifyEmail ? 'set' : 'missing');
    return {
      success: false,
      error: 'Missing SendGrid configuration',
      provider: 'sendgrid',
    };
  }

  // Send via SendGrid
  return sendEmail(subject, html, text, apiKey, notifyEmail, fromEmail);
};

/**
 * Hook to fire on Tier 1 intake completion
 * Call this when a Tier 1 session status changes to 'completed'
 */
export const onIntakeCompleted = async (sessionId: string): Promise<void> => {
  const session = getSessionById(sessionId);
  if (!session) {
    console.warn(`[IntakeNotification] onIntakeCompleted: Session ${sessionId} not found`);
    return;
  }

  if (session.status !== 'completed') {
    console.warn(`[IntakeNotification] onIntakeCompleted: Session ${sessionId} not completed`);
    return;
  }

  // Only send email for Tier 1 completions via this hook
  if (session.tier !== IntakeTier.TIER_1) {
    console.log(`[IntakeNotification] Skipping Tier 1 email for Tier ${session.tier}`);
    return;
  }

  console.log(`[IntakeNotification] Firing Tier 1 completion hook for session ${sessionId}`);

  // Get contact for user-facing notification
  const contact = getContactById(session.contactId);

  // Send admin email notification (existing behavior)
  const result = await sendIntakeCompletionEmail(sessionId);

  if (result.success) {
    console.log(`[IntakeNotification] Tier 1 notification sent successfully (${result.provider})`);
  } else {
    console.error(`[IntakeNotification] Tier 1 notification failed:`, result.error);
  }

  // Send user-facing notification via notificationService
  if (contact && contact.email) {
    const userProfile: UserForNotification = {
      id: contact.id,
      email: contact.email,
      fullName: contact.fullName,
      firstName: contact.fullName.split(' ')[0],
      tenantId: session.tenantId,
      planTier: getCurrentUserPlan(),
      phone: contact.phone,
      smsOptIn: contact.smsOptIn,
    };

    try {
      const userNotifyResult = await notifyUser(userProfile, 'intake_completed');
      console.log(`[IntakeNotification] User notification result:`, userNotifyResult.overallSuccess ? 'success' : 'failed');
    } catch (err) {
      console.error(`[IntakeNotification] Failed to send user notification:`, err);
    }
  }
};

/**
 * Hook to fire on Tier 2 (Apex Blueprint) module completion
 * Call this when a Tier 2 session status changes to 'completed'
 */
export const onTier2ModuleCompleted = async (sessionId: string): Promise<void> => {
  const session = getSessionById(sessionId);
  if (!session) {
    console.warn(`[IntakeNotification] onTier2ModuleCompleted: Session ${sessionId} not found`);
    return;
  }

  if (session.status !== 'completed') {
    console.warn(`[IntakeNotification] onTier2ModuleCompleted: Session ${sessionId} not completed`);
    return;
  }

  // Only send email for Tier 2 completions via this hook
  if (session.tier !== IntakeTier.TIER_2) {
    console.log(`[IntakeNotification] Skipping Tier 2 email for Tier ${session.tier}`);
    return;
  }

  const moduleName = session.module || 'Unknown Module';
  console.log(`[IntakeNotification] Firing Tier 2 completion hook for session ${sessionId} (Module: ${moduleName})`);

  // Send email notification (reuses same email format, but subject indicates module)
  const result = await sendIntakeCompletionEmail(sessionId);

  if (result.success) {
    console.log(`[IntakeNotification] Tier 2 (${moduleName}) notification sent successfully (${result.provider})`);
  } else {
    console.error(`[IntakeNotification] Tier 2 (${moduleName}) notification failed:`, result.error);
  }
};

// =============================================================================
// BETA APPLICATION NOTIFICATION
// =============================================================================

/**
 * Generate HTML email for admin notification (generic)
 */
const generateAdminNotificationHtml = (payload: AdminNotificationPayload): string => {
  const answersHtml = payload.answers
    .map(
      (a, i) => `
      <div style="margin-bottom: 16px; padding: 12px; background: #f5f5f5; border-radius: 8px;">
        <div style="font-size: 12px; color: #666; margin-bottom: 4px;">
          Q${i + 1}
        </div>
        <div style="font-size: 14px; color: #333; margin-bottom: 8px; font-weight: 500;">
          ${escapeHtml(a.question)}
        </div>
        <div style="font-size: 14px; color: #000; background: #fff; padding: 8px; border-radius: 4px; border: 1px solid #ddd;">
          ${escapeHtml(a.answer)}
        </div>
      </div>
    `
    )
    .join('');

  const eventLabels: Record<AdminNotificationEventType, string> = {
    BETA_APPLICATION_SUBMITTED: 'Beta Application Submitted',
    TIER_1_INTAKE_COMPLETED: 'Tier 1 Intake Completed',
    INTAKE_SESSION_COMPLETED: 'Intake Session Completed',
    CASE_CALL_APPLICATION_SUBMITTED: 'Case Call Application Submitted',
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${eventLabels[payload.eventType]}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff;">
      <div style="background: #0A0A0A; padding: 20px; border-radius: 12px; margin-bottom: 20px;">
        <h1 style="margin: 0; color: #fff; font-size: 18px;">[FrameLord] ${eventLabels[payload.eventType]}</h1>
        <p style="margin: 8px 0 0; color: #888; font-size: 14px;">Route: ${escapeHtml(payload.route)}</p>
      </div>

      <div style="background: #fff; padding: 20px; border-radius: 12px; border: 1px solid #eee;">
        <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
          <div style="font-size: 12px; color: #666;">Applicant</div>
          <div style="font-size: 16px; font-weight: 500; color: #333;">${escapeHtml(payload.name)}</div>
          ${payload.email ? `<div style="font-size: 14px; color: #666;">${escapeHtml(payload.email)}</div>` : ''}
        </div>

        <div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
          <div style="font-size: 12px; color: #666;">Submitted</div>
          <div style="font-size: 14px; color: #333;">${formatDate(payload.timestamp)}</div>
        </div>

        <h2 style="font-size: 14px; color: #333; margin: 24px 0 12px;">Questions & Answers</h2>
        ${answersHtml}
      </div>

      <div style="margin-top: 20px; padding: 12px; text-align: center; color: #888; font-size: 12px;">
        Sent from FrameLord Admin Notification System
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate plain text for admin notification
 */
const generateAdminNotificationText = (payload: AdminNotificationPayload): string => {
  const answersText = payload.answers
    .map((a, i) => `Q${i + 1}: ${a.question}\nA: ${a.answer}\n`)
    .join('\n');

  const eventLabels: Record<AdminNotificationEventType, string> = {
    BETA_APPLICATION_SUBMITTED: 'Beta Application Submitted',
    TIER_1_INTAKE_COMPLETED: 'Tier 1 Intake Completed',
    INTAKE_SESSION_COMPLETED: 'Intake Session Completed',
    CASE_CALL_APPLICATION_SUBMITTED: 'Case Call Application Submitted',
  };

  return `
[FRAMELORD] ${eventLabels[payload.eventType]}
====================================

Route: ${payload.route}
Applicant: ${payload.name}${payload.email ? ` (${payload.email})` : ''}
Submitted: ${formatDate(payload.timestamp)}

QUESTIONS & ANSWERS
-------------------
${answersText}
---
Sent from FrameLord Admin Notification System
  `.trim();
};

/**
 * Central function to send admin notification emails
 */
export const sendAdminNotificationEmail = async (
  payload: AdminNotificationPayload
): Promise<EmailSendResult> => {
  const eventLabels: Record<AdminNotificationEventType, string> = {
    BETA_APPLICATION_SUBMITTED: 'Beta Application Submitted',
    TIER_1_INTAKE_COMPLETED: 'Tier 1 Intake Completed',
    INTAKE_SESSION_COMPLETED: 'Intake Session Completed',
    CASE_CALL_APPLICATION_SUBMITTED: 'Case Call Application Submitted',
  };

  const subject = `[FrameLord] ${eventLabels[payload.eventType]} – ${payload.email || payload.name}`;
  const html = generateAdminNotificationHtml(payload);
  const text = generateAdminNotificationText(payload);

  // Always log to console for dev visibility
  console.log('========================================');
  console.log(`[AdminNotification] ${payload.eventType}`);
  console.log('========================================');
  console.log('  Subject:', subject);
  console.log('  Route:', payload.route);
  console.log('  Name:', payload.name);
  console.log('  Email:', payload.email || 'N/A');
  console.log('  Timestamp:', payload.timestamp);
  console.log('  Answers:');
  payload.answers.forEach((a, i) => {
    console.log(`    Q${i + 1}: ${a.question}`);
    console.log(`    A${i + 1}: ${a.answer.substring(0, 100)}${a.answer.length > 100 ? '...' : ''}`);
  });
  console.log('========================================');

  // Check if email is enabled
  if (!EMAIL_ENABLED) {
    console.log('[AdminNotification] EMAIL_ENABLED is false. Logged to console only.');
    return {
      success: true,
      messageId: `console-${Date.now()}`,
      provider: 'console',
    };
  }

  // Runtime check - should only send from server
  if (!isServerRuntime()) {
    console.warn('[AdminNotification] Attempted to send email from client-side. Skipping.');
    return {
      success: false,
      error: 'Email sending is only allowed from server-side code',
      provider: 'console',
    };
  }

  // Check for required configuration
  const apiKey = SENDGRID_API_KEY || process.env.SENDGRID_API_KEY;
  const notifyEmail = INTAKE_NOTIFY_EMAIL || process.env.INTAKE_NOTIFY_EMAIL;
  const fromEmail = EMAIL_FROM_ADDRESS || process.env.EMAIL_FROM_ADDRESS || 'FrameLord <support@framelord.com>';

  if (!apiKey || !notifyEmail) {
    console.error('[AdminNotification] Missing SendGrid configuration.');
    return {
      success: false,
      error: 'Missing SendGrid configuration',
      provider: 'sendgrid',
    };
  }

  return sendEmail(subject, html, text, apiKey, notifyEmail, fromEmail);
};

/**
 * Hook to fire when a beta application is submitted
 */
export const onBetaApplicationSubmitted = async (
  application: BetaApplicationData
): Promise<void> => {
  console.log(`[AdminNotification] Beta application submitted by ${application.email}`);

  // Extract Q/A pairs from conversation history
  // The conversation alternates between AI and user
  const answers: { question: string; answer: string }[] = [];
  const history = application.conversationHistory;

  for (let i = 0; i < history.length - 1; i++) {
    if (history[i].role === 'ai' && history[i + 1]?.role === 'user') {
      answers.push({
        question: history[i].content.substring(0, 500), // Truncate long AI prompts
        answer: history[i + 1].content,
      });
    }
  }

  const payload: AdminNotificationPayload = {
    eventType: 'BETA_APPLICATION_SUBMITTED',
    route: '/beta/application',
    userId: application.id,
    name: application.name,
    email: application.email,
    timestamp: application.submittedAt,
    answers,
    metadata: {
      applicationId: application.id,
      conversationTurns: history.length,
    },
  };

  await sendAdminNotificationEmail(payload);
};

/**
 * Hook to fire when a case call application is submitted
 */
export const onCaseCallApplicationSubmitted = async (
  application: CaseCallApplicationData
): Promise<void> => {
  console.log(`[AdminNotification] Case call application submitted by ${application.email}`);

  const payload: AdminNotificationPayload = {
    eventType: 'CASE_CALL_APPLICATION_SUBMITTED',
    route: '/case-call',
    contactId: application.contactId,
    userId: application.id,
    name: application.name,
    email: application.email,
    timestamp: application.submittedAt,
    answers: application.answers,
    metadata: {
      applicationId: application.id,
      phone: application.phone,
    },
  };

  await sendAdminNotificationEmail(payload);
};

/**
 * Hook to fire when any intake session is completed (Tier 1 or Tier 2)
 * This is a unified hook that can be called in addition to the tier-specific hooks
 */
export const onIntakeSessionCompleted = async (sessionId: string): Promise<void> => {
  const session = getSessionById(sessionId);
  if (!session) {
    console.warn(`[AdminNotification] onIntakeSessionCompleted: Session ${sessionId} not found`);
    return;
  }

  if (session.status !== 'completed') {
    return;
  }

  const contact = getContactById(session.contactId);
  const tierLabel = session.tier === IntakeTier.TIER_1
    ? 'Tier 1'
    : `Tier 2 (${session.module || 'Unknown'})`;

  console.log(`[AdminNotification] Intake session completed: ${tierLabel}`);

  const payload: AdminNotificationPayload = {
    eventType: 'INTAKE_SESSION_COMPLETED',
    route: '/intake',
    contactId: session.contactId,
    name: contact?.fullName || 'Unknown',
    email: contact?.email,
    timestamp: session.completedAt || new Date().toISOString(),
    answers: session.answers.map(a => ({
      question: a.questionText,
      answer: a.rawText,
    })),
    metadata: {
      sessionId: session.id,
      tier: session.tier,
      module: session.module,
      frameScore: session.metrics?.overallFrameScore,
      frameType: session.metrics?.frameType,
    },
  };

  await sendAdminNotificationEmail(payload);
};
