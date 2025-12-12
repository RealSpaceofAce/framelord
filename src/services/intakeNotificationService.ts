// =============================================================================
// INTAKE NOTIFICATION SERVICE — SendGrid Email Integration
// =============================================================================
// Sends email notifications when Tier 1 intake sessions are completed.
//
// !! SECURITY WARNING !!
// This service is currently imported from client-side React code (IntakeFlow.tsx).
// Until this is moved to a server-side endpoint (e.g., /api/intake-completed),
// EMAIL_ENABLED must remain FALSE to prevent API key exposure.
//
// To enable email sending:
// 1. Create a server-side API endpoint that imports and calls sendIntakeCompletionEmail
// 2. Have the client POST the sessionId to that endpoint
// 3. Set EMAIL_ENABLED in the server runtime (process.env.EMAIL_ENABLED = "true")
// 4. Configure SENDGRID_API_KEY and INTAKE_NOTIFY_EMAIL in server env
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
const EMAIL_FROM_ADDRESS = 'FrameLord Intake <no-reply@framelord.app>';

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
 * Internal helper to send email via SendGrid
 */
const sendEmail = async (
  subject: string,
  html: string,
  text: string,
  apiKey: string,
  toEmail: string,
  fromEmail: string
): Promise<EmailSendResult> => {
  try {
    // Dynamic import to avoid bundling SendGrid in client code
    const sgMail = (await import('@sendgrid/mail')).default;
    sgMail.setApiKey(apiKey);

    const msg = {
      to: toEmail,
      from: fromEmail,
      subject,
      text,
      html,
    };

    const [response] = await sgMail.send(msg);
    const messageId = response.headers['x-message-id'] as string | undefined;

    console.log(`[IntakeNotification] Email sent via SendGrid: ${messageId || response.statusCode}`);
    return {
      success: true,
      messageId: messageId || `sg-${Date.now()}`,
      provider: 'sendgrid',
    };
  } catch (err: any) {
    const errorMessage = err?.response?.body?.errors?.[0]?.message || err?.message || String(err);
    console.error('[IntakeNotification] SendGrid error:', errorMessage);
    return {
      success: false,
      error: errorMessage,
      provider: 'sendgrid',
    };
  }
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
  const fromEmail = EMAIL_FROM_ADDRESS || process.env.EMAIL_FROM_ADDRESS || 'FrameLord Intake <no-reply@framelord.app>';

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
