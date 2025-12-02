// =============================================================================
// INTERACTION STORE — In-memory data source for Interactions
// =============================================================================
// INVARIANT: Every Interaction has a contactId and authorContactId.
// Interactions track calls, meetings, messages, emails, DMs, etc. with contacts.
// =============================================================================

import { Interaction, InteractionType } from '../types';
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

