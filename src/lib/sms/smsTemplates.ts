// =============================================================================
// SMS TEMPLATES — Twilio SMS message templates
// =============================================================================
// Defines SMS message content for various notification types.
// SMS messages are short (160 chars per segment) so templates are minimal.
//
// Best practices:
// - Keep messages under 160 chars when possible (1 SMS segment)
// - Include clear call-to-action
// - Don't include sensitive data
// - Always identify as FrameLord
// =============================================================================

import { sendSmsToContact, type SmsSendResult, type SmsContact } from './smsClient';

// =============================================================================
// TYPES
// =============================================================================

export interface CallDetails {
  scheduledAt: string;
  contactName: string;
  contactId?: string;
  notes?: string;
}

// =============================================================================
// MESSAGE TEMPLATES
// =============================================================================

/**
 * Generate case call reminder SMS
 * Target: Under 160 chars
 */
const generateCaseCallReminderMessage = (callDetails: CallDetails): string => {
  const date = new Date(callDetails.scheduledAt);
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  const dateStr = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  // Example: "FrameLord: Call with John Smith at 2:30 PM on Dec 5. Login to view details."
  return `FrameLord: Call with ${callDetails.contactName} at ${timeStr} on ${dateStr}. Login to view details.`;
};

/**
 * Generate beta onboarding welcome SMS
 * Target: Under 160 chars
 */
const generateBetaOnboardingMessage = (): string => {
  return `Welcome to FrameLord beta! Your account is ready. Login to complete your intake and unlock your dashboard. – Team FL`;
};

/**
 * Generate task reminder SMS
 * Target: Under 160 chars
 */
const generateTaskReminderMessage = (taskTitle: string, dueTime?: string): string => {
  if (dueTime) {
    return `FrameLord: Task due at ${dueTime}: "${taskTitle.slice(0, 60)}". Login to complete.`;
  }
  return `FrameLord: Task due today: "${taskTitle.slice(0, 80)}". Login to complete.`;
};

/**
 * Generate low frame score alert SMS
 * Target: Under 160 chars
 */
const generateFrameAlertMessage = (contactName: string): string => {
  return `FrameLord Alert: Your recent interaction with ${contactName} may need review. Login to see your FrameScan.`;
};

// =============================================================================
// SMS SEND FUNCTIONS
// =============================================================================

/**
 * Send case call reminder SMS to a contact
 */
export const sendCaseCallReminderSms = async (
  contact: SmsContact,
  callDetails: CallDetails
): Promise<SmsSendResult> => {
  const message = generateCaseCallReminderMessage(callDetails);
  return sendSmsToContact(contact, message);
};

/**
 * Send beta onboarding SMS to a contact
 * Optional - just a hook for later use
 */
export const sendBetaOnboardingSms = async (
  contact: SmsContact
): Promise<SmsSendResult> => {
  const message = generateBetaOnboardingMessage();
  return sendSmsToContact(contact, message);
};

/**
 * Send task reminder SMS to a contact
 */
export const sendTaskReminderSms = async (
  contact: SmsContact,
  taskTitle: string,
  dueTime?: string
): Promise<SmsSendResult> => {
  const message = generateTaskReminderMessage(taskTitle, dueTime);
  return sendSmsToContact(contact, message);
};

/**
 * Send frame alert SMS to a contact
 */
export const sendFrameAlertSms = async (
  contact: SmsContact,
  relatedContactName: string
): Promise<SmsSendResult> => {
  const message = generateFrameAlertMessage(relatedContactName);
  return sendSmsToContact(contact, message);
};
