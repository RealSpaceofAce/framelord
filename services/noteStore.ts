// =============================================================================
// NOTE STORE — In-memory data source for Notes
// =============================================================================
// INVARIANT: Every Note has a contactId. No orphan notes.
// =============================================================================

import { Note } from '../types';
import { CONTACT_ZERO } from './contactStore';

// --- MOCK NOTES ---
// All notes are linked to a Contact via contactId

let MOCK_NOTES: Note[] = [
  // Notes for Contact Zero (the user's journal)
  {
    id: 'n_001',
    contactId: CONTACT_ZERO.id,
    content: 'Reviewed quarterly frame audit. Score improved from 78 to 85 over the past month. Key wins: removed apologetic language from sales calls, established stronger boundaries with clients.',
    createdAt: '2025-12-01T09:00:00Z',
    updatedAt: null,
    tags: ['review', 'progress'],
  },
  {
    id: 'n_002',
    contactId: CONTACT_ZERO.id,
    content: 'Need to work on vocal tonality during high-stakes calls. Detected pattern of voice rising at end of statements — sounds like questions. Practice declarative endings.',
    createdAt: '2025-11-30T14:30:00Z',
    updatedAt: null,
    tags: ['improvement', 'voice'],
  },
  {
    id: 'n_003',
    contactId: CONTACT_ZERO.id,
    content: 'Morning frame check: Energy level 8/10. Clear objectives for the day. Remember to lead with value, not seeking approval.',
    createdAt: '2025-11-29T08:00:00Z',
    updatedAt: null,
    tags: ['daily', 'mindset'],
  },

  // Notes for Sarah Chen (prospect)
  {
    id: 'n_004',
    contactId: 'c_sarah_chen',
    content: 'Initial discovery call went well. She values brevity and direct communication. Skeptical of "sales fluff" — need to lead with technical substance.',
    createdAt: '2025-11-28T11:00:00Z',
    updatedAt: null,
    tags: ['discovery', 'sales'],
  },
  {
    id: 'n_005',
    contactId: 'c_sarah_chen',
    content: 'Follow-up: Sent technical whitepaper. She responded positively. Meeting scheduled for Dec 5 to discuss implementation.',
    createdAt: '2025-11-30T16:00:00Z',
    updatedAt: null,
    tags: ['follow-up', 'progress'],
  },

  // Notes for Marcus Johnson (client)
  {
    id: 'n_006',
    contactId: 'c_marcus_johnson',
    content: 'Quarterly review completed. Retainer renewed for 6 months. Good frame balance — mutual respect established.',
    createdAt: '2025-11-25T17:00:00Z',
    updatedAt: null,
    tags: ['client', 'renewal'],
  },

  // Notes for Elena Rodriguez (partner)
  {
    id: 'n_007',
    contactId: 'c_elena_rodriguez',
    content: 'Frame slipping in recent conversations. She interrupted me 4 times in last call. Need to reset boundaries and reestablish leadership position.',
    createdAt: '2025-11-20T10:00:00Z',
    updatedAt: null,
    tags: ['warning', 'boundaries'],
  },

  // Notes for David Kim (investor/hybrid)
  {
    id: 'n_008',
    contactId: 'c_david_kim',
    content: 'Board meeting prep. He tends to dominate conversations. Strategy: arrive with clear agenda, state positions definitively, do not hedge.',
    createdAt: '2025-11-18T12:00:00Z',
    updatedAt: null,
    tags: ['prep', 'strategy'],
  },

  // Notes for James Wilson (friend)
  {
    id: 'n_009',
    contactId: 'c_james_wilson',
    content: 'Great dinner catch-up. No frame dynamics needed — genuine friendship. Good to maintain relationships outside business context.',
    createdAt: '2025-11-28T21:00:00Z',
    updatedAt: null,
    tags: ['personal', 'social'],
  },
];

// --- HELPER FUNCTIONS ---

/** Get all notes */
export const getAllNotes = (): Note[] => {
  return [...MOCK_NOTES].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
};

/** Get notes for a specific contact */
export const getNotesByContactId = (contactId: string): Note[] => {
  return MOCK_NOTES
    .filter(n => n.contactId === contactId)
    .sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
};

/** Get notes for Contact Zero */
export const getContactZeroNotes = (): Note[] => {
  return getNotesByContactId(CONTACT_ZERO.id);
};

/** Generate a unique ID for new notes */
const generateNoteId = (): string => {
  return `n_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/** Create a new note (always attached to a contact) */
export const createNote = (contactId: string, content: string, tags?: string[]): Note => {
  const newNote: Note = {
    id: generateNoteId(),
    contactId,
    content,
    createdAt: new Date().toISOString(),
    updatedAt: null,
    tags: tags || [],
  };
  
  MOCK_NOTES = [newNote, ...MOCK_NOTES];
  return newNote;
};

/** Update an existing note */
export const updateNote = (noteId: string, updates: Partial<Pick<Note, 'content' | 'tags'>>): Note | null => {
  const index = MOCK_NOTES.findIndex(n => n.id === noteId);
  if (index === -1) return null;
  
  MOCK_NOTES[index] = {
    ...MOCK_NOTES[index],
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  return MOCK_NOTES[index];
};

/** Delete a note */
export const deleteNote = (noteId: string): boolean => {
  const initialLength = MOCK_NOTES.length;
  MOCK_NOTES = MOCK_NOTES.filter(n => n.id !== noteId);
  return MOCK_NOTES.length < initialLength;
};

/** Get note count for a contact */
export const getNoteCountByContactId = (contactId: string): number => {
  return MOCK_NOTES.filter(n => n.contactId === contactId).length;
};

