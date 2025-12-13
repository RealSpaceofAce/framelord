// =============================================================================
// CONTACT STORE — In-memory data source for Contacts
// =============================================================================

import { Contact, ContactZero, RelationshipDomain, EngagementEvent } from '../types';

// =============================================================================
// STORAGE KEYS
// =============================================================================

const CONTACT_ZERO_STORAGE_KEY = 'framelord_contact_zero';
const DEMO_CONTACTS_ENABLED_KEY = 'framelord_demo_contacts_enabled';

// =============================================================================
// HELPER: Ensure contact has CRM linkage fields
// =============================================================================

const ensureContactCRMFields = (contact: Partial<Contact>): Contact => ({
  ...contact,
  mentionedInNotes: contact.mentionedInNotes || [],
  engagementEvents: contact.engagementEvents || [],
  linkedTopics: contact.linkedTopics || [],
} as Contact);

// =============================================================================
// CONTACT ZERO PERSISTENCE
// =============================================================================

/**
 * Load Contact Zero data from localStorage
 * Returns saved data or null if not found
 */
const loadContactZeroFromStorage = (): Partial<ContactZero> | null => {
  try {
    const stored = localStorage.getItem(CONTACT_ZERO_STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[ContactStore] Failed to load Contact Zero from localStorage:', e);
  }
  return null;
};

/**
 * Save Contact Zero data to localStorage
 */
const saveContactZeroToStorage = (contactZero: ContactZero): void => {
  try {
    localStorage.setItem(CONTACT_ZERO_STORAGE_KEY, JSON.stringify(contactZero));
  } catch (e) {
    console.warn('[ContactStore] Failed to save Contact Zero to localStorage:', e);
  }
};

/**
 * Check if demo contacts should be shown
 * Demo contacts are enabled by default for new users
 * Can be disabled when user authenticates
 */
export const isDemoContactsEnabled = (): boolean => {
  try {
    const stored = localStorage.getItem(DEMO_CONTACTS_ENABLED_KEY);
    // Default to true if not set
    return stored !== 'false';
  } catch {
    return true;
  }
};

/**
 * Enable or disable demo contacts
 * Call with false when real user authenticates
 */
export const setDemoContactsEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(DEMO_CONTACTS_ENABLED_KEY, enabled.toString());
  } catch (e) {
    console.warn('[ContactStore] Failed to save demo contacts preference:', e);
  }
};

// =============================================================================
// CONTACT ZERO DEFAULT + HYDRATION
// =============================================================================

// Default Contact Zero template (used for new users)
const DEFAULT_CONTACT_ZERO: ContactZero = ensureContactCRMFields({
  id: 'contact_zero',
  fullName: 'You',  // Neutral default - will be set via intake
  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Grimson&backgroundColor=4433ff',
  email: 'grimson@framelord.ai',
  phone: '+1 555 000 0000',
  relationshipDomain: 'hybrid',
  relationshipRole: 'self',
  status: 'active',
  frame: {
    currentScore: 85,
    trend: 'up',
    lastScanAt: new Date().toISOString(),
  },
  lastContactAt: null,
  nextActionAt: null,
  tags: ['identity-prime', 'founder'],
  company: 'FrameLord',
  title: 'Founder & CEO',
  location: 'San Francisco, CA',
  // Intake gateway - null means user has not completed Tier 1 yet
  firstIntakeCompletedAt: null,
  // Personal details
  personal: {
    primaryEmail: 'grimson@framelord.ai',
    primaryPhone: '+1 555 000 0000',
    location: 'San Francisco, CA',
    timeZone: 'America/Los_Angeles',
    birthday: '1985-03-15',
    kidsCount: 0,
    maritalStatus: 'single',
    favoriteColor: 'Electric Blue',
    favoriteDrink: 'Espresso',
    socialProfiles: [
      { label: 'X', handle: '@grimson', url: 'https://x.com/grimson' },
      { label: 'LinkedIn', url: 'https://linkedin.com/in/grimson' },
    ],
  },
}) as ContactZero;

// Hydrate Contact Zero from localStorage (merge with defaults)
const savedContactZero = loadContactZeroFromStorage();
export const CONTACT_ZERO: ContactZero = savedContactZero
  ? ensureContactCRMFields({ ...DEFAULT_CONTACT_ZERO, ...savedContactZero, id: 'contact_zero' }) as ContactZero
  : DEFAULT_CONTACT_ZERO;

// --- DEMO CONTACTS ---
// These are sample contacts shown to new users for demonstration
// They can be disabled via setDemoContactsEnabled(false)

const DEMO_CONTACTS: Contact[] = [
  // Business contacts
  {
    id: 'c_sarah_chen',
    fullName: 'Sarah Chen',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    email: 'sarah.c@techcorp.com',
    phone: '+1 555 0192',
    relationshipDomain: 'business',
    relationshipRole: 'prospect',
    status: 'active',
    frame: {
      currentScore: 72,
      trend: 'up',
      lastScanAt: '2025-11-28T10:30:00Z',
    },
    lastContactAt: '2025-11-30T14:00:00Z',
    nextActionAt: '2025-12-05T09:00:00Z',
    tags: ['enterprise', 'vp-engineering', 'hot-lead'],
    company: 'TechCorp',
    title: 'VP of Engineering',
    location: 'New York, NY',
    linkedinUrl: 'https://linkedin.com/in/sarahchen',
    mentionedInNotes: [],
    engagementEvents: [],
    linkedTopics: [],
    personal: {
      primaryEmail: 'sarah.c@techcorp.com',
      primaryPhone: '+1 555 0192',
      location: 'New York, NY',
      timeZone: 'America/New_York',
      birthday: '1988-07-22',
      kidsCount: 2,
      maritalStatus: 'married',
      favoriteColor: 'Teal',
      favoriteDrink: 'Green Tea',
      socialProfiles: [
        { label: 'LinkedIn', url: 'https://linkedin.com/in/sarahchen' },
        { label: 'X', handle: '@sarahchen_tech', url: 'https://x.com/sarahchen_tech' },
      ],
    },
  },
  {
    id: 'c_marcus_johnson',
    fullName: 'Marcus Johnson',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus',
    email: 'marcus.j@acmecorp.io',
    phone: '+1 555 0834',
    relationshipDomain: 'business',
    relationshipRole: 'client',
    status: 'active',
    frame: {
      currentScore: 88,
      trend: 'flat',
      lastScanAt: '2025-11-25T16:45:00Z',
    },
    lastContactAt: '2025-11-29T11:30:00Z',
    nextActionAt: '2025-12-10T10:00:00Z',
    tags: ['retainer', 'quarterly-review'],
    company: 'Acme Corp',
    title: 'CTO',
    location: 'Austin, TX',
    mentionedInNotes: [],
    engagementEvents: [],
    linkedTopics: [],
    personal: {
      primaryEmail: 'marcus.j@acmecorp.io',
      primaryPhone: '+1 555 0834',
      location: 'Austin, TX',
      timeZone: 'America/Chicago',
      birthday: '1982-11-03',
      kidsCount: 1,
      maritalStatus: 'married',
      favoriteColor: 'Navy Blue',
      favoriteDrink: 'Bourbon Old Fashioned',
      personalNotes: 'Loves BBQ. Bring him brisket recommendations.',
      socialProfiles: [
        { label: 'LinkedIn', url: 'https://linkedin.com/in/marcusjohnson' },
        { label: 'GitHub', handle: '@mjohnson', url: 'https://github.com/mjohnson' },
      ],
    },
  },
  {
    id: 'c_elena_rodriguez',
    fullName: 'Elena Rodriguez',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena',
    email: 'elena@startupx.co',
    phone: '+1 555 7721',
    relationshipDomain: 'business',
    relationshipRole: 'partner',
    status: 'active',
    frame: {
      currentScore: 65,
      trend: 'down',
      lastScanAt: '2025-11-20T09:15:00Z',
    },
    lastContactAt: '2025-11-22T15:00:00Z',
    nextActionAt: '2025-12-03T14:00:00Z',
    tags: ['co-founder', 'needs-attention'],
    mentionedInNotes: [],
    engagementEvents: [],
    linkedTopics: [],
  },

  // Personal contacts
  {
    id: 'c_james_wilson',
    fullName: 'James Wilson',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=James',
    email: 'jwilson@gmail.com',
    phone: '+1 555 4412',
    relationshipDomain: 'personal',
    relationshipRole: 'friend',
    status: 'active',
    frame: {
      currentScore: 78,
      trend: 'up',
      lastScanAt: '2025-11-15T20:00:00Z',
    },
    lastContactAt: '2025-11-28T19:30:00Z',
    nextActionAt: null,
    tags: ['college', 'inner-circle'],
    mentionedInNotes: [],
    engagementEvents: [],
    linkedTopics: [],
  },
  {
    id: 'c_lisa_park',
    fullName: 'Lisa Park',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Lisa',
    email: 'lisa.park@email.com',
    phone: '+1 555 9983',
    relationshipDomain: 'personal',
    relationshipRole: 'family',
    status: 'active',
    frame: {
      currentScore: 92,
      trend: 'flat',
      lastScanAt: null,
    },
    lastContactAt: '2025-12-01T12:00:00Z',
    nextActionAt: '2025-12-15T18:00:00Z',
    tags: ['sister', 'family'],
    mentionedInNotes: [],
    engagementEvents: [],
    linkedTopics: [],
  },

  // Hybrid contacts
  {
    id: 'c_david_kim',
    fullName: 'David Kim',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=David',
    email: 'dkim@venturefund.com',
    phone: '+1 555 2201',
    relationshipDomain: 'hybrid',
    relationshipRole: 'investor',
    status: 'active',
    frame: {
      currentScore: 58,
      trend: 'down',
      lastScanAt: '2025-11-18T11:00:00Z',
    },
    lastContactAt: '2025-11-25T16:00:00Z',
    nextActionAt: '2025-12-08T10:00:00Z',
    tags: ['angel', 'board-member', 'needs-frame-work'],
    mentionedInNotes: [],
    engagementEvents: [],
    linkedTopics: [],
  },
  {
    id: 'c_amanda_torres',
    fullName: 'Amanda Torres',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Amanda',
    email: 'amanda.t@creativeco.com',
    phone: '+1 555 6654',
    relationshipDomain: 'hybrid',
    relationshipRole: 'contractor',
    status: 'dormant',
    frame: {
      currentScore: 70,
      trend: 'flat',
      lastScanAt: '2025-10-15T14:30:00Z',
    },
    lastContactAt: '2025-10-20T09:00:00Z',
    nextActionAt: null,
    tags: ['designer', 'freelance'],
    mentionedInNotes: [],
    engagementEvents: [],
    linkedTopics: [],
  },

  // Testing/blocked
  {
    id: 'c_test_user',
    fullName: 'Test Contact',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Test',
    email: 'test@example.com',
    relationshipDomain: 'business',
    relationshipRole: 'prospect',
    status: 'testing',
    frame: {
      currentScore: 50,
      trend: 'flat',
      lastScanAt: null,
    },
    lastContactAt: null,
    nextActionAt: null,
    tags: ['test'],
    mentionedInNotes: [],
    engagementEvents: [],
    linkedTopics: [],
  },
  {
    id: 'c_blocked_user',
    fullName: 'Blocked Person',
    avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Blocked',
    email: 'blocked@spam.com',
    relationshipDomain: 'business',
    relationshipRole: 'other',
    status: 'blocked',
    frame: {
      currentScore: 15,
      trend: 'down',
      lastScanAt: '2025-09-01T08:00:00Z',
    },
    lastContactAt: '2025-09-01T08:00:00Z',
    nextActionAt: null,
    tags: ['spam', 'do-not-contact'],
    mentionedInNotes: [],
    engagementEvents: [],
    linkedTopics: [],
  },
];

// --- CONTACTS ARRAY (includes Contact Zero + optionally demo contacts) ---

// Initialize CONTACTS with Contact Zero, then add demo contacts if enabled
let CONTACTS: Contact[] = isDemoContactsEnabled()
  ? [CONTACT_ZERO, ...DEMO_CONTACTS]
  : [CONTACT_ZERO];

/**
 * Refresh contacts array based on demo contacts preference
 * Call this after changing demo contacts setting
 */
export const refreshContactsList = (): void => {
  CONTACTS = isDemoContactsEnabled()
    ? [CONTACT_ZERO, ...DEMO_CONTACTS]
    : [CONTACT_ZERO];
};

// --- HELPER FUNCTIONS ---

/**
 * Get all contacts, optionally including archived ones.
 * @param includeArchived - If true, includes contacts with status "archived". Default false.
 */
export const getAllContacts = (includeArchived = false): Contact[] => {
  if (includeArchived) {
    return [...CONTACTS];
  }
  return CONTACTS.filter(c => c.status !== 'archived');
};

/**
 * Get a contact by ID. Works for all contacts including archived.
 */
export const getContactById = (id: string): Contact | undefined => {
  if (id === CONTACT_ZERO.id) return CONTACT_ZERO;
  return CONTACTS.find(c => c.id === id);
};

/**
 * Get Contact Zero.
 */
export const getContactZero = (): ContactZero => {
  return CONTACT_ZERO;
};

/**
 * Get all contacts excluding Contact Zero.
 * @param includeArchived - If true, includes archived contacts. Default false.
 */
export const getContactsExcludingSelf = (includeArchived = false): Contact[] => {
  const all = includeArchived ? CONTACTS : CONTACTS.filter(c => c.status !== 'archived');
  return all.filter(c => c.id !== CONTACT_ZERO.id);
};

/**
 * Get contacts filtered by domain.
 * @param domain - The relationship domain to filter by.
 * @param includeArchived - If true, includes archived contacts. Default false.
 */
export const getContactsByDomain = (
  domain: 'all' | 'business' | 'personal' | 'hybrid',
  includeArchived = false
): Contact[] => {
  const all = includeArchived ? CONTACTS : CONTACTS.filter(c => c.status !== 'archived');
  if (domain === 'all') return all;
  return all.filter(c => c.relationshipDomain === domain);
};

/**
 * Get active contacts only (status === 'active').
 */
export const getActiveContacts = (): Contact[] => {
  return CONTACTS.filter(c => c.status === 'active');
};

/**
 * Search contacts by name, email, or company.
 * Returns contacts matching the query string (case-insensitive).
 * @param query - Search query string
 * @param limit - Maximum number of results (default 10)
 * @param excludeSelf - Whether to exclude Contact Zero (default true)
 * @returns Array of matching contacts
 */
export const searchContacts = (
  query: string,
  limit = 10,
  excludeSelf = true
): Contact[] => {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const q = query.toLowerCase().trim();

  let results = CONTACTS.filter(c => {
    if (excludeSelf && c.id === CONTACT_ZERO.id) return false;
    if (c.status !== 'active') return false;

    const nameMatch = c.fullName.toLowerCase().includes(q);
    const emailMatch = c.email?.toLowerCase().includes(q) || false;
    const companyMatch = c.company?.toLowerCase().includes(q) || false;

    return nameMatch || emailMatch || companyMatch;
  });

  // Sort by relevance: exact name starts first, then partial matches
  results.sort((a, b) => {
    const aNameStarts = a.fullName.toLowerCase().startsWith(q) ? 0 : 1;
    const bNameStarts = b.fullName.toLowerCase().startsWith(q) ? 0 : 1;
    return aNameStarts - bNameStarts;
  });

  return results.slice(0, limit);
};

/**
 * Create a new contact.
 * @param input - Contact creation parameters.
 * @returns The newly created contact.
 */
export const createContact = (input: {
  fullName: string;
  email?: string;
  phone?: string;
  relationshipDomain: RelationshipDomain;
  relationshipRole?: string;
  avatarUrl?: string;
  tags?: string[];
  company?: string;
  title?: string;
  location?: string;
  linkedinUrl?: string;
  xHandle?: string;
}): Contact => {
  const newContact: Contact = {
    id: `contact-${Date.now()}`,
    fullName: input.fullName.trim(),
    email: input.email?.trim() || undefined,
    phone: input.phone?.trim() || undefined,
    relationshipDomain: input.relationshipDomain,
    relationshipRole: input.relationshipRole?.trim() || 'contact',
    status: 'active',
    avatarUrl: input.avatarUrl?.trim() || undefined,
    frame: {
      currentScore: 50,
      trend: 'flat',
      lastScanAt: null,
    },
    lastContactAt: null,
    nextActionAt: null,
    tags: input.tags || [],
    company: input.company?.trim() || undefined,
    title: input.title?.trim() || undefined,
    location: input.location?.trim() || undefined,
    linkedinUrl: input.linkedinUrl?.trim() || undefined,
    xHandle: input.xHandle?.trim() || undefined,
    // CRM linkage fields
    mentionedInNotes: [],
    engagementEvents: [],
    linkedTopics: [],
    // Intake gateway - null means not completed
    firstIntakeCompletedAt: null,
  };

  CONTACTS.push(newContact);
  return newContact;
};

/**
 * Update a contact in the store.
 * Replaces the contact with matching id in CONTACTS.
 * If the contact is Contact Zero, updates CONTACT_ZERO as well.
 */
export const updateContact = (updatedContact: Contact): void => {
  const index = CONTACTS.findIndex(c => c.id === updatedContact.id);
  
  if (index === -1) {
    console.warn(`Contact with id ${updatedContact.id} not found`);
    return;
  }

  // Update in CONTACTS array
  CONTACTS[index] = updatedContact;

  // If this is Contact Zero, also update the CONTACT_ZERO reference and persist
  if (updatedContact.id === CONTACT_ZERO.id) {
    Object.assign(CONTACT_ZERO, updatedContact);
    saveContactZeroToStorage(CONTACT_ZERO);
  }
};

/**
 * Archive a contact (soft delete).
 * Sets the contact's status to "archived".
 * Cannot archive Contact Zero.
 * @param contactId - The ID of the contact to archive.
 */
export const archiveContact = (contactId: string): void => {
  if (contactId === CONTACT_ZERO.id) {
    console.warn('Cannot archive Contact Zero');
    return;
  }

  const contact = getContactById(contactId);
  if (!contact) {
    console.warn(`Contact with id ${contactId} not found`);
    return;
  }

  const updatedContact: Contact = {
    ...contact,
    status: 'archived',
  };

  updateContact(updatedContact);
};

// =============================================================================
// @ MENTION HELPERS
// =============================================================================

/**
 * Search contacts by name only (for @ mentions).
 * @param query - Search query string
 * @param limit - Maximum number of results (default 8)
 * @returns Array of matching contacts
 */
export const searchContactsByName = (query: string, limit = 8): Contact[] => {
  if (!query || query.trim().length === 0) {
    return [];
  }

  const q = query.toLowerCase().trim();

  let results = CONTACTS.filter(c => {
    if (c.id === CONTACT_ZERO.id) return false; // Exclude self
    if (c.status !== 'active') return false;
    return c.fullName.toLowerCase().includes(q);
  });

  // Sort by relevance: exact name starts first
  results.sort((a, b) => {
    const aStarts = a.fullName.toLowerCase().startsWith(q) ? 0 : 1;
    const bStarts = b.fullName.toLowerCase().startsWith(q) ? 0 : 1;
    return aStarts - bStarts;
  });

  return results.slice(0, limit);
};

/**
 * Find a contact by exact name match (case-insensitive).
 * @param name - The exact name to find
 * @returns The contact if found, undefined otherwise
 */
export const findContactByName = (name: string): Contact | undefined => {
  if (!name || name.trim().length === 0) return undefined;
  const normalizedName = name.trim().toLowerCase();
  return CONTACTS.find(
    c => c.fullName.toLowerCase() === normalizedName && c.id !== CONTACT_ZERO.id
  );
};

/**
 * Create a contact from an @ mention.
 * @param name - The display name for the new contact
 * @returns The newly created contact
 */
export const createContactFromMention = (name: string): Contact => {
  // Check for existing contact with same name
  const existing = findContactByName(name);
  if (existing) {
    console.warn(`Contact "${name}" already exists, returning existing`);
    return existing;
  }

  return createContact({
    fullName: name.trim(),
    relationshipDomain: 'business', // Default domain
    relationshipRole: 'contact',
    tags: ['from-mention'],
  });
};

/**
 * Get all notes that mention a specific contact.
 * Uses the contact's mentionedInNotes array for fast lookup.
 * @param contactId - The contact ID to search for
 * @returns Array of notes that mention this contact
 */
export const getNotesForContact = (contactId: string): Array<{ id: string; title: string; content: string; updatedAt: string }> => {
  const contact = getContactById(contactId);
  if (!contact) return [];

  try {
    const { getNoteById } = require('./noteStore');
    return (contact.mentionedInNotes || [])
      .map((noteId: string) => getNoteById(noteId))
      .filter(Boolean)
      .map((note: { id: string; title?: string; content?: string; updatedAt: string }) => ({
        id: note.id,
        title: note.title || 'Untitled',
        content: note.content || '',
        updatedAt: note.updatedAt,
      }));
  } catch (e) {
    console.error('Error fetching notes for contact:', e);
    return [];
  }
};

// =============================================================================
// CRM LINKAGE SYNC FUNCTIONS
// =============================================================================

/**
 * Add a note mention to a contact's record.
 * Also adds an engagement event to the timeline.
 * @param contactId - The contact being mentioned
 * @param noteId - The note containing the mention
 * @param noteTitle - Title of the note (for timeline description)
 */
export const addNoteMentionToContact = (
  contactId: string,
  noteId: string,
  noteTitle?: string
): void => {
  const contact = getContactById(contactId);
  if (!contact || contact.id === CONTACT_ZERO.id) return;

  // Ensure CRM fields exist
  if (!contact.mentionedInNotes) contact.mentionedInNotes = [];
  if (!contact.engagementEvents) contact.engagementEvents = [];

  // Add noteId to mentionedInNotes if not already present
  if (!contact.mentionedInNotes.includes(noteId)) {
    contact.mentionedInNotes.push(noteId);

    // Add engagement event
    const event: EngagementEvent = {
      id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'note-mention',
      noteId,
      timestamp: new Date().toISOString(),
      description: `Mentioned in note: ${noteTitle || 'Untitled'}`,
    };
    contact.engagementEvents.push(event);

    updateContact(contact);
  }
};

/**
 * Remove a note mention from a contact's record.
 * @param contactId - The contact
 * @param noteId - The note to remove
 */
export const removeNoteMentionFromContact = (
  contactId: string,
  noteId: string
): void => {
  const contact = getContactById(contactId);
  if (!contact) return;

  if (contact.mentionedInNotes) {
    contact.mentionedInNotes = contact.mentionedInNotes.filter(id => id !== noteId);
    updateContact(contact);
  }
};

/**
 * Add a topic to a contact's linked topics.
 * @param contactId - The contact
 * @param topicId - The topic to link
 */
export const addTopicToContact = (contactId: string, topicId: string): void => {
  const contact = getContactById(contactId);
  if (!contact || contact.id === CONTACT_ZERO.id) return;

  if (!contact.linkedTopics) contact.linkedTopics = [];
  if (!contact.linkedTopics.includes(topicId)) {
    contact.linkedTopics.push(topicId);
    updateContact(contact);
  }
};

/**
 * Get engagement timeline for a contact.
 * @param contactId - The contact ID
 * @returns Sorted array of engagement events (newest first)
 */
export const getContactTimeline = (contactId: string): EngagementEvent[] => {
  const contact = getContactById(contactId);
  if (!contact) return [];

  return [...(contact.engagementEvents || [])].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

/**
 * Get all contacts mentioned in notes with a specific topic.
 * @param topicId - The topic ID
 * @returns Array of contacts co-mentioned with this topic
 */
export const getContactsForTopic = (topicId: string): Contact[] => {
  return CONTACTS.filter(contact =>
    contact.id !== CONTACT_ZERO.id &&
    contact.linkedTopics?.includes(topicId)
  );
};

// =============================================================================
// PERSONAL INTEL HELPERS
// =============================================================================

/**
 * Update personal intel for a contact.
 * Merges the patch with existing intel and updates the timestamp.
 * @param contactId - The contact ID
 * @param patch - Partial personal intel to merge
 */
export const updatePersonalIntel = (
  contactId: string,
  patch: Partial<import('../types').ContactPersonalIntel>
): void => {
  const contact = getContactById(contactId);
  if (!contact) {
    console.warn(`Contact with id ${contactId} not found`);
    return;
  }

  const existingIntel = contact.personalIntel || {};
  const updatedIntel = {
    ...existingIntel,
    ...patch,
    updatedAt: new Date().toISOString(),
  };

  const updatedContact: Contact = {
    ...contact,
    personalIntel: updatedIntel,
  };

  updateContact(updatedContact);
};

/**
 * Get personal intel for a contact.
 * @param contactId - The contact ID
 * @returns The personal intel or undefined
 */
export const getPersonalIntel = (
  contactId: string
): import('../types').ContactPersonalIntel | undefined => {
  const contact = getContactById(contactId);
  return contact?.personalIntel;
};

// --- LEGACY EXPORT (for backward compatibility) ---
// Export MOCK_CONTACTS as an alias to CONTACTS for any code that still references it
export const MOCK_CONTACTS = CONTACTS;
