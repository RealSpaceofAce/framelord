// =============================================================================
// CONTACT STORE — In-memory data source for Contacts
// =============================================================================

import { Contact, ContactZero, RelationshipDomain } from '../types';

// --- CONTACT ZERO (The User) ---

export const CONTACT_ZERO: ContactZero = {
  id: 'contact_zero',
  fullName: 'Grimson',
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
};

// --- INTERNAL CONTACTS ARRAY ---

let CONTACTS: Contact[] = [
  // Include Contact Zero first
  CONTACT_ZERO,

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
  },
];

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

  // If this is Contact Zero, also update the CONTACT_ZERO reference
  if (updatedContact.id === CONTACT_ZERO.id) {
    Object.assign(CONTACT_ZERO, updatedContact);
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

// --- LEGACY EXPORT (for backward compatibility) ---
// Export MOCK_CONTACTS as an alias to CONTACTS for any code that still references it
export const MOCK_CONTACTS = CONTACTS;
