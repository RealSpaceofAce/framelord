// =============================================================================
// CONTACT STORE — In-memory data source for Contacts
// =============================================================================

import { Contact, ContactZero } from '../types';

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
};

// --- MOCK CONTACTS ---

export const MOCK_CONTACTS: Contact[] = [
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

export const getContactById = (id: string): Contact | undefined => {
  return MOCK_CONTACTS.find(c => c.id === id);
};

export const getContactZero = (): ContactZero => {
  return CONTACT_ZERO;
};

export const getContactsExcludingSelf = (): Contact[] => {
  return MOCK_CONTACTS.filter(c => c.id !== CONTACT_ZERO.id);
};

export const getContactsByDomain = (domain: 'all' | 'business' | 'personal' | 'hybrid'): Contact[] => {
  if (domain === 'all') return MOCK_CONTACTS;
  return MOCK_CONTACTS.filter(c => c.relationshipDomain === domain);
};

export const getActiveContacts = (): Contact[] => {
  return MOCK_CONTACTS.filter(c => c.status === 'active');
};

