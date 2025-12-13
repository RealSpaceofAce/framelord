// =============================================================================
// EMAIL TEMPLATES — SendGrid template IDs and payload builders
// =============================================================================
// Defines email template configurations for transactional emails.
// Templates are managed in SendGrid dashboard; this file maps to them.
//
// Two approaches supported:
// 1. SendGrid Dynamic Templates (preferred for production)
// 2. Inline HTML generation (fallback/development)
// =============================================================================

import { sendEmail, sendTemplateEmail, type EmailSendResult } from './emailClient';

// =============================================================================
// SENDGRID TEMPLATE IDS
// =============================================================================

/**
 * SendGrid Dynamic Template IDs
 * Configure these in your SendGrid dashboard and set via environment
 */
export const TEMPLATE_IDS = {
  // Welcome email for new accounts
  welcome: process.env.SENDGRID_TEMPLATE_WELCOME || '',
  // Intake completed notification
  intakeCompleted: process.env.SENDGRID_TEMPLATE_INTAKE_COMPLETED || '',
  // Beta application accepted
  betaAccepted: process.env.SENDGRID_TEMPLATE_BETA_ACCEPTED || '',
  // Beta application rejected
  betaRejected: process.env.SENDGRID_TEMPLATE_BETA_REJECTED || '',
  // Case call reminder
  caseCallReminder: process.env.SENDGRID_TEMPLATE_CASE_CALL_REMINDER || '',
} as const;

// =============================================================================
// USER PROFILE TYPE (minimal for notifications)
// =============================================================================

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  firstName?: string;
}

export interface CallDetails {
  scheduledAt: string;
  contactName: string;
  contactId?: string;
  notes?: string;
}

// =============================================================================
// INLINE HTML TEMPLATES (Fallback)
// =============================================================================

const BASE_STYLES = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
`;

const HEADER_STYLES = `
  background: #0A0A0A;
  padding: 24px;
  border-radius: 12px 12px 0 0;
  text-align: center;
`;

const BODY_STYLES = `
  background: #ffffff;
  padding: 32px;
  border-radius: 0 0 12px 12px;
  border: 1px solid #eee;
  border-top: none;
`;

const BUTTON_STYLES = `
  display: inline-block;
  background: #4433FF;
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
`;

/**
 * Generate welcome email HTML
 */
const generateWelcomeHtml = (profile: UserProfile): string => {
  const firstName = profile.firstName || profile.fullName.split(' ')[0];

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="${BASE_STYLES}">
  <div style="${HEADER_STYLES}">
    <h1 style="margin: 0; color: #fff; font-size: 24px;">Welcome to FrameLord</h1>
  </div>
  <div style="${BODY_STYLES}">
    <p style="font-size: 16px; color: #333;">Hi ${firstName},</p>
    <p style="font-size: 16px; color: #333; line-height: 1.6;">
      Welcome to FrameLord – your AI-powered authority diagnostics platform.
      You're now part of an exclusive group of high-performers who refuse to
      sound like amateurs.
    </p>
    <p style="font-size: 16px; color: #333; line-height: 1.6;">
      <strong>What's next?</strong>
    </p>
    <ul style="font-size: 16px; color: #333; line-height: 1.8;">
      <li>Complete your intake profile to unlock personalized coaching</li>
      <li>Run your first FrameScan to see where you stand</li>
      <li>Explore your CRM dashboard and start tracking contacts</li>
    </ul>
    <p style="text-align: center; margin-top: 32px;">
      <a href="https://www.framelord.com/dashboard" style="${BUTTON_STYLES}">
        Go to Dashboard →
      </a>
    </p>
  </div>
  <p style="text-align: center; color: #888; font-size: 12px; margin-top: 24px;">
    © 2026 FrameLord Systems. All rights reserved.
  </p>
</body>
</html>
  `.trim();
};

/**
 * Generate intake completed email HTML
 */
const generateIntakeCompletedHtml = (profile: UserProfile): string => {
  const firstName = profile.firstName || profile.fullName.split(' ')[0];

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="${BASE_STYLES}">
  <div style="${HEADER_STYLES}">
    <h1 style="margin: 0; color: #fff; font-size: 24px;">Intake Complete ✓</h1>
  </div>
  <div style="${BODY_STYLES}">
    <p style="font-size: 16px; color: #333;">Hi ${firstName},</p>
    <p style="font-size: 16px; color: #333; line-height: 1.6;">
      Congratulations! You've completed your FrameLord intake assessment.
      Your Contact Zero profile has been initialized with your goals and baseline metrics.
    </p>
    <p style="font-size: 16px; color: #333; line-height: 1.6;">
      <strong>Your dashboard is now fully unlocked.</strong> Here's what you can do:
    </p>
    <ul style="font-size: 16px; color: #333; line-height: 1.8;">
      <li>View your initial FrameScore and diagnostics</li>
      <li>Start adding contacts to your CRM</li>
      <li>Run FrameScans on your communications</li>
      <li>Set up your first Wants and track progress</li>
    </ul>
    <p style="text-align: center; margin-top: 32px;">
      <a href="https://www.framelord.com/dashboard" style="${BUTTON_STYLES}">
        View Your Profile →
      </a>
    </p>
  </div>
  <p style="text-align: center; color: #888; font-size: 12px; margin-top: 24px;">
    © 2026 FrameLord Systems. All rights reserved.
  </p>
</body>
</html>
  `.trim();
};

/**
 * Generate beta accepted email HTML
 */
const generateBetaAcceptedHtml = (profile: UserProfile): string => {
  const firstName = profile.firstName || profile.fullName.split(' ')[0];

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="${BASE_STYLES}">
  <div style="${HEADER_STYLES}">
    <h1 style="margin: 0; color: #fff; font-size: 24px;">🎉 You're In!</h1>
  </div>
  <div style="${BODY_STYLES}">
    <p style="font-size: 16px; color: #333;">Hi ${firstName},</p>
    <p style="font-size: 16px; color: #333; line-height: 1.6;">
      <strong>Your beta application has been accepted!</strong> Welcome to the
      FrameLord V2.0 Vanguard Protocol.
    </p>
    <p style="font-size: 16px; color: #333; line-height: 1.6;">
      As a beta tester, you'll get:
    </p>
    <ul style="font-size: 16px; color: #333; line-height: 1.8;">
      <li>Early access to new features before anyone else</li>
      <li>Direct line to the development team</li>
      <li>Founder pricing locked in for life</li>
      <li>Your feedback shapes the product</li>
    </ul>
    <p style="text-align: center; margin-top: 32px;">
      <a href="https://www.framelord.com/dashboard" style="${BUTTON_STYLES}">
        Start Your Beta Journey →
      </a>
    </p>
  </div>
  <p style="text-align: center; color: #888; font-size: 12px; margin-top: 24px;">
    © 2026 FrameLord Systems. All rights reserved.
  </p>
</body>
</html>
  `.trim();
};

/**
 * Generate beta rejected email HTML
 */
const generateBetaRejectedHtml = (profile: UserProfile): string => {
  const firstName = profile.firstName || profile.fullName.split(' ')[0];

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="${BASE_STYLES}">
  <div style="${HEADER_STYLES}">
    <h1 style="margin: 0; color: #fff; font-size: 24px;">Beta Application Update</h1>
  </div>
  <div style="${BODY_STYLES}">
    <p style="font-size: 16px; color: #333;">Hi ${firstName},</p>
    <p style="font-size: 16px; color: #333; line-height: 1.6;">
      Thank you for your interest in the FrameLord beta program. After careful
      review, we've determined that the current beta program isn't the best fit
      for your needs at this time.
    </p>
    <p style="font-size: 16px; color: #333; line-height: 1.6;">
      This isn't the end of the road. You can:
    </p>
    <ul style="font-size: 16px; color: #333; line-height: 1.8;">
      <li>Join our waitlist for the public launch</li>
      <li>Re-apply in 30 days with updated information</li>
      <li>Follow us on Twitter for announcements</li>
    </ul>
    <p style="font-size: 16px; color: #333; line-height: 1.6;">
      We appreciate your understanding and hope to welcome you to FrameLord soon.
    </p>
  </div>
  <p style="text-align: center; color: #888; font-size: 12px; margin-top: 24px;">
    © 2026 FrameLord Systems. All rights reserved.
  </p>
</body>
</html>
  `.trim();
};

/**
 * Generate case call reminder email HTML
 */
const generateCaseCallReminderHtml = (profile: UserProfile, callDetails: CallDetails): string => {
  const firstName = profile.firstName || profile.fullName.split(' ')[0];
  const formattedDate = new Date(callDetails.scheduledAt).toLocaleString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="${BASE_STYLES}">
  <div style="${HEADER_STYLES}">
    <h1 style="margin: 0; color: #fff; font-size: 24px;">📞 Call Reminder</h1>
  </div>
  <div style="${BODY_STYLES}">
    <p style="font-size: 16px; color: #333;">Hi ${firstName},</p>
    <p style="font-size: 16px; color: #333; line-height: 1.6;">
      This is a reminder about your upcoming call:
    </p>
    <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <p style="margin: 0 0 8px; font-size: 14px; color: #666;">Contact</p>
      <p style="margin: 0 0 16px; font-size: 18px; color: #333; font-weight: 600;">
        ${callDetails.contactName}
      </p>
      <p style="margin: 0 0 8px; font-size: 14px; color: #666;">Scheduled for</p>
      <p style="margin: 0; font-size: 18px; color: #333; font-weight: 600;">
        ${formattedDate}
      </p>
    </div>
    ${callDetails.notes ? `
    <p style="font-size: 14px; color: #666;">Notes:</p>
    <p style="font-size: 16px; color: #333; background: #fff8e1; padding: 12px; border-radius: 4px;">
      ${callDetails.notes}
    </p>
    ` : ''}
    <p style="text-align: center; margin-top: 32px;">
      <a href="https://www.framelord.com/dashboard" style="${BUTTON_STYLES}">
        View in Dashboard →
      </a>
    </p>
  </div>
  <p style="text-align: center; color: #888; font-size: 12px; margin-top: 24px;">
    © 2026 FrameLord Systems. All rights reserved.
  </p>
</body>
</html>
  `.trim();
};

// =============================================================================
// EMAIL SEND FUNCTIONS
// =============================================================================

/**
 * Send welcome email when a new account is created
 */
export const sendWelcomeEmail = async (userProfile: UserProfile): Promise<EmailSendResult> => {
  // Try SendGrid template first
  if (TEMPLATE_IDS.welcome) {
    return sendTemplateEmail(
      userProfile.email,
      TEMPLATE_IDS.welcome,
      {
        firstName: userProfile.firstName || userProfile.fullName.split(' ')[0],
        fullName: userProfile.fullName,
      }
    );
  }

  // Fall back to inline HTML
  return sendEmail({
    to: userProfile.email,
    subject: 'Welcome to FrameLord – Your Authority Diagnostics Awaits',
    html: generateWelcomeHtml(userProfile),
  });
};

/**
 * Send intake completed email when Tier 1 intake finishes
 */
export const sendIntakeCompletedEmail = async (userProfile: UserProfile): Promise<EmailSendResult> => {
  if (TEMPLATE_IDS.intakeCompleted) {
    return sendTemplateEmail(
      userProfile.email,
      TEMPLATE_IDS.intakeCompleted,
      {
        firstName: userProfile.firstName || userProfile.fullName.split(' ')[0],
        fullName: userProfile.fullName,
      }
    );
  }

  return sendEmail({
    to: userProfile.email,
    subject: 'Your FrameLord Intake is Complete – Dashboard Unlocked',
    html: generateIntakeCompletedHtml(userProfile),
  });
};

/**
 * Send beta accepted email
 */
export const sendBetaAcceptedEmail = async (userProfile: UserProfile): Promise<EmailSendResult> => {
  if (TEMPLATE_IDS.betaAccepted) {
    return sendTemplateEmail(
      userProfile.email,
      TEMPLATE_IDS.betaAccepted,
      {
        firstName: userProfile.firstName || userProfile.fullName.split(' ')[0],
        fullName: userProfile.fullName,
      }
    );
  }

  return sendEmail({
    to: userProfile.email,
    subject: "🎉 You're In! FrameLord Beta Access Granted",
    html: generateBetaAcceptedHtml(userProfile),
  });
};

/**
 * Send beta rejected email
 */
export const sendBetaRejectedEmail = async (userProfile: UserProfile): Promise<EmailSendResult> => {
  if (TEMPLATE_IDS.betaRejected) {
    return sendTemplateEmail(
      userProfile.email,
      TEMPLATE_IDS.betaRejected,
      {
        firstName: userProfile.firstName || userProfile.fullName.split(' ')[0],
        fullName: userProfile.fullName,
      }
    );
  }

  return sendEmail({
    to: userProfile.email,
    subject: 'FrameLord Beta Application Update',
    html: generateBetaRejectedHtml(userProfile),
  });
};

/**
 * Send case call reminder email
 */
export const sendCaseCallReminderEmail = async (
  userProfile: UserProfile,
  callDetails: CallDetails
): Promise<EmailSendResult> => {
  if (TEMPLATE_IDS.caseCallReminder) {
    return sendTemplateEmail(
      userProfile.email,
      TEMPLATE_IDS.caseCallReminder,
      {
        firstName: userProfile.firstName || userProfile.fullName.split(' ')[0],
        fullName: userProfile.fullName,
        contactName: callDetails.contactName,
        scheduledAt: callDetails.scheduledAt,
        notes: callDetails.notes || '',
      }
    );
  }

  return sendEmail({
    to: userProfile.email,
    subject: `Call Reminder: ${callDetails.contactName}`,
    html: generateCaseCallReminderHtml(userProfile, callDetails),
  });
};
