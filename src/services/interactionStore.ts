// =============================================================================
// INTERACTION STORE — In-memory data source for Interactions
// =============================================================================
// INVARIANT: Every Interaction has a contactId and authorContactId.
// Interactions track calls, meetings, messages, emails, DMs, etc. with contacts.
// =============================================================================

import { Interaction, InteractionType, InteractionAttachment, InteractionDirection, InteractionSource } from '../types';
import { CONTACT_ZERO } from './contactStore';

// --- MOCK INTERACTIONS ---
// All interactions are linked to a Contact via contactId
// All interactions are authored by CONTACT_ZERO (for now)

let MOCK_INTERACTIONS: Interaction[] = [
  // Interactions with Sarah Chen (prospect)
  {
    id: 'int_001',
    contactId: 'c_sarah_chen',
    authorContactId: CONTACT_ZERO.id,
    type: 'call',
    summary: 'Initial discovery call. Discussed their tech stack and pain points. Strong interest in FrameLord for sales team.',
    occurredAt: '2025-12-02T14:30:00Z',
  },
  {
    id: 'int_002',
    contactId: 'c_sarah_chen',
    authorContactId: CONTACT_ZERO.id,
    type: 'email',
    summary: 'Sent technical whitepaper and pricing sheet. Follow-up scheduled for Dec 5.',
    occurredAt: '2025-12-01T10:00:00Z',
  },
  {
    id: 'int_003',
    contactId: 'c_sarah_chen',
    authorContactId: CONTACT_ZERO.id,
    type: 'message',
    summary: 'LinkedIn message: "Thanks for the intro! Looking forward to our call."',
    occurredAt: '2025-11-30T16:45:00Z',
  },

  // Interactions with Marcus Johnson (client)
  {
    id: 'int_004',
    contactId: 'c_marcus_johnson',
    authorContactId: CONTACT_ZERO.id,
    type: 'meeting',
    summary: 'Q4 review meeting. Discussed renewal and expansion opportunities. Frame score improving.',
    occurredAt: '2025-12-01T15:00:00Z',
  },
  {
    id: 'int_005',
    contactId: 'c_marcus_johnson',
    authorContactId: CONTACT_ZERO.id,
    type: 'email',
    summary: 'Sent December invoice and Q4 metrics report.',
    occurredAt: '2025-12-01T09:00:00Z',
  },
  {
    id: 'int_006',
    contactId: 'c_marcus_johnson',
    authorContactId: CONTACT_ZERO.id,
    type: 'call',
    summary: 'Quick check-in call. Confirmed Q1 planning session for Dec 10.',
    occurredAt: '2025-11-28T11:00:00Z',
  },

  // Interactions with Elena Rodriguez (partner)
  {
    id: 'int_007',
    contactId: 'c_elena_rodriguez',
    authorContactId: CONTACT_ZERO.id,
    type: 'call',
    summary: 'Boundary discussion call. Addressed frame issues from last interaction. Need to reset dynamic.',
    occurredAt: '2025-11-25T10:00:00Z',
  },
  {
    id: 'int_008',
    contactId: 'c_elena_rodriguez',
    authorContactId: CONTACT_ZERO.id,
    type: 'dm',
    summary: 'Twitter DM: "Can we reschedule? Something came up."',
    occurredAt: '2025-11-24T18:30:00Z',
  },
  {
    id: 'int_009',
    contactId: 'c_elena_rodriguez',
    authorContactId: CONTACT_ZERO.id,
    type: 'meeting',
    summary: 'Partnership strategy session. Discussed joint go-to-market plan.',
    occurredAt: '2025-11-20T14:00:00Z',
  },

  // Interactions with David Kim (investor)
  {
    id: 'int_010',
    contactId: 'c_david_kim',
    authorContactId: CONTACT_ZERO.id,
    type: 'email',
    summary: 'Board meeting agenda and Q3 metrics sent. Meeting scheduled for Dec 8.',
    occurredAt: '2025-12-01T17:00:00Z',
  },
  {
    id: 'int_011',
    contactId: 'c_david_kim',
    authorContactId: CONTACT_ZERO.id,
    type: 'call',
    summary: 'Pre-board call. Discussed key talking points and strategic priorities.',
    occurredAt: '2025-11-29T16:00:00Z',
  },
  {
    id: 'int_012',
    contactId: 'c_david_kim',
    authorContactId: CONTACT_ZERO.id,
    type: 'meeting',
    summary: 'Quarterly board meeting. Presented growth metrics and roadmap.',
    occurredAt: '2025-11-15T10:00:00Z',
  },

  // Interactions with James Wilson (friend)
  {
    id: 'int_013',
    contactId: 'c_james_wilson',
    authorContactId: CONTACT_ZERO.id,
    type: 'message',
    summary: 'Text: "Dinner next week? Let me know your availability."',
    occurredAt: '2025-11-28T20:00:00Z',
  },
  {
    id: 'int_014',
    contactId: 'c_james_wilson',
    authorContactId: CONTACT_ZERO.id,
    type: 'call',
    summary: 'Catch-up call. Discussed work and personal updates.',
    occurredAt: '2025-11-20T19:00:00Z',
  },

  // Interactions with Lisa Park (family)
  {
    id: 'int_015',
    contactId: 'c_lisa_park',
    authorContactId: CONTACT_ZERO.id,
    type: 'call',
    summary: 'Birthday planning call. Discussed gift ideas and celebration plans.',
    occurredAt: '2025-12-01T19:30:00Z',
  },
  {
    id: 'int_016',
    contactId: 'c_lisa_park',
    authorContactId: CONTACT_ZERO.id,
    type: 'message',
    summary: 'Text: "Thanks for the birthday wishes! See you soon."',
    occurredAt: '2025-11-25T12:00:00Z',
  },

  // Other interactions
  {
    id: 'int_017',
    contactId: 'c_sarah_chen',
    authorContactId: CONTACT_ZERO.id,
    type: 'other',
    summary: 'Met at industry conference. Exchanged business cards and discussed potential collaboration.',
    occurredAt: '2025-11-15T16:00:00Z',
  },
];

// --- HELPER FUNCTIONS ---

/** Generate a unique ID for new interactions */
const generateInteractionId = (): string => {
  return `interaction-${Date.now()}`;
};

/** Get all interactions sorted by occurredAt descending */
export const getAllInteractions = (): Interaction[] => {
  return [...MOCK_INTERACTIONS].sort((a, b) => {
    return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
  });
};

/** Get interactions for a specific contact, sorted by occurredAt descending */
export const getInteractionsByContactId = (contactId: string): Interaction[] => {
  return MOCK_INTERACTIONS
    .filter(i => i.contactId === contactId)
    .sort((a, b) => {
      return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
    });
};

/** Get interactions authored by a specific contact, sorted by occurredAt descending */
export const getInteractionsByAuthorId = (authorContactId: string): Interaction[] => {
  return MOCK_INTERACTIONS
    .filter(i => i.authorContactId === authorContactId)
    .sort((a, b) => {
      return new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime();
    });
};

/** Create a new interaction */
export const createInteraction = (params: {
  contactId: string;
  authorContactId: string;
  type: InteractionType;
  summary: string;
  occurredAt?: string;
}): Interaction => {
  const newInteraction: Interaction = {
    id: generateInteractionId(),
    contactId: params.contactId,
    authorContactId: params.authorContactId,
    type: params.type,
    summary: params.summary,
    occurredAt: params.occurredAt || new Date().toISOString(),
  };

  MOCK_INTERACTIONS = [newInteraction, ...MOCK_INTERACTIONS];
  return newInteraction;
};

/** Get an interaction by ID */
export const getInteractionById = (id: string): Interaction | undefined => {
  return MOCK_INTERACTIONS.find(i => i.id === id);
};

/**
 * Update an existing interaction.
 * Replaces the interaction with matching id in MOCK_INTERACTIONS.
 */
export const updateInteraction = (updated: Interaction): void => {
  const index = MOCK_INTERACTIONS.findIndex(i => i.id === updated.id);
  if (index === -1) {
    console.warn(`Interaction with id ${updated.id} not found`);
    return;
  }
  MOCK_INTERACTIONS[index] = updated;
};

/**
 * Delete an interaction (hard delete).
 * Removes it from MOCK_INTERACTIONS.
 */
export const deleteInteraction = (id: string): void => {
  const index = MOCK_INTERACTIONS.findIndex(i => i.id === id);
  if (index === -1) {
    console.warn(`Interaction with id ${id} not found`);
    return;
  }
  MOCK_INTERACTIONS.splice(index, 1);
};

/**
 * Add an attachment to an interaction.
 * @param interactionId - The ID of the interaction
 * @param attachment - Attachment data (without id and createdAt)
 * @returns The created InteractionAttachment
 */
export const addAttachmentToInteraction = (
  interactionId: string,
  attachment: Omit<InteractionAttachment, 'id' | 'createdAt'>
): InteractionAttachment => {
  const interaction = getInteractionById(interactionId);
  if (!interaction) {
    throw new Error(`Interaction with id ${interactionId} not found`);
  }

  const newAttachment: InteractionAttachment = {
    id: `attachment-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    interactionId: interactionId,
    fileName: attachment.fileName,
    mimeType: attachment.mimeType,
    dataUrl: attachment.dataUrl,
    createdAt: new Date().toISOString(),
  };

  // Initialize attachments array if needed
  if (!interaction.attachments) {
    interaction.attachments = [];
  }

  interaction.attachments.push(newAttachment);
  return newAttachment;
};

/**
 * Remove an attachment from an interaction.
 * @param interactionId - The ID of the interaction
 * @param attachmentId - The ID of the attachment to remove
 */
export const removeAttachmentFromInteraction = (interactionId: string, attachmentId: string): void => {
  const interaction = getInteractionById(interactionId);
  if (!interaction || !interaction.attachments) {
    console.warn(`Interaction with id ${interactionId} not found or has no attachments`);
    return;
  }

  interaction.attachments = interaction.attachments.filter(a => a.id !== attachmentId);
};

/**
 * Log an interaction automatically from quick actions.
 * Creates a minimal interaction with source tracking.
 */
export const logAutoInteraction = (params: {
  contactId: string;
  type: InteractionType;
  direction: InteractionDirection;
  source: InteractionSource;
  summary?: string;
}): Interaction => {
  const summaryMap: Record<InteractionType, string> = {
    call: 'Initiated call',
    meeting: 'Scheduled meeting',
    message: 'Sent message',
    email: 'Drafted email',
    dm: 'Sent DM',
    other: 'Quick action',
  };

  const newInteraction: Interaction = {
    id: generateInteractionId(),
    contactId: params.contactId,
    authorContactId: CONTACT_ZERO.id,
    type: params.type,
    summary: params.summary || summaryMap[params.type],
    occurredAt: new Date().toISOString(),
    direction: params.direction,
    source: params.source,
  };

  MOCK_INTERACTIONS = [newInteraction, ...MOCK_INTERACTIONS];
  return newInteraction;
};

/**
 * Get the last notable interaction for a contact.
 * Falls back to most recent interaction if no notable ones exist.
 */
export const getLastNotableInteractionForContact = (contactId: string): Interaction | null => {
  const interactions = getInteractionsByContactId(contactId);

  // First try to find notable interactions
  const notableInteraction = interactions.find(i => i.isNotable === true);
  if (notableInteraction) {
    return notableInteraction;
  }

  // Fall back to most recent interaction
  return interactions[0] || null;
};

/**
 * Toggle the isNotable flag on an interaction.
 */
export const toggleInteractionNotable = (interactionId: string): void => {
  const interaction = getInteractionById(interactionId);
  if (!interaction) {
    console.warn(`Interaction with id ${interactionId} not found`);
    return;
  }

  interaction.isNotable = !interaction.isNotable;
};

/**
 * Set the isNotable flag on an interaction.
 */
export const setInteractionNotable = (interactionId: string, isNotable: boolean): void => {
  const interaction = getInteractionById(interactionId);
  if (!interaction) {
    console.warn(`Interaction with id ${interactionId} not found`);
    return;
  }

  interaction.isNotable = isNotable;
};

