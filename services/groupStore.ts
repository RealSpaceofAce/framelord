// =============================================================================
// GROUP STORE — In-memory data source for Groups and Group Memberships
// =============================================================================
// Groups are containers for contacts. A contact can belong to many groups.
// Groups have their own notes, topics, and can have automated behaviors.
// =============================================================================

import { Group, GroupMembership } from '../types';
import { CONTACT_ZERO } from './contactStore';

// --- MOCK GROUPS ---

let GROUPS: Group[] = [
  {
    id: 'group_inner_circle',
    name: 'Inner Circle',
    description: 'Close personal and professional relationships',
    createdAt: '2025-11-01T00:00:00Z',
    updatedAt: '2025-11-01T00:00:00Z',
  },
  {
    id: 'group_clients',
    name: 'Clients',
    description: 'Active and past clients',
    createdAt: '2025-11-01T00:00:00Z',
    updatedAt: '2025-11-01T00:00:00Z',
  },
  {
    id: 'group_prospects',
    name: 'Prospects',
    description: 'Potential clients and opportunities',
    createdAt: '2025-11-01T00:00:00Z',
    updatedAt: '2025-11-01T00:00:00Z',
  },
];

// --- MOCK MEMBERSHIPS ---

let GROUP_MEMBERSHIPS: GroupMembership[] = [
  // Inner Circle
  { groupId: 'group_inner_circle', contactId: CONTACT_ZERO.id, joinedAt: '2025-11-01T00:00:00Z' },
  { groupId: 'group_inner_circle', contactId: 'c_james_wilson', joinedAt: '2025-11-01T00:00:00Z' },
  { groupId: 'group_inner_circle', contactId: 'c_lisa_park', joinedAt: '2025-11-01T00:00:00Z' },
  
  // Clients
  { groupId: 'group_clients', contactId: 'c_marcus_johnson', joinedAt: '2025-11-01T00:00:00Z' },
  { groupId: 'group_clients', contactId: 'c_elena_rodriguez', joinedAt: '2025-11-01T00:00:00Z' },
  
  // Prospects
  { groupId: 'group_prospects', contactId: 'c_sarah_chen', joinedAt: '2025-11-01T00:00:00Z' },
  { groupId: 'group_prospects', contactId: 'c_david_kim', joinedAt: '2025-11-01T00:00:00Z' },
];

// --- HELPER FUNCTIONS ---

/** Generate a unique ID for new groups */
const generateGroupId = (): string => {
  return `group-${Date.now()}`;
};

// --- GROUP FUNCTIONS ---

/** Get all groups */
export const getAllGroups = (): Group[] => {
  return [...GROUPS].sort((a, b) => a.name.localeCompare(b.name));
};

/** Get a group by ID */
export const getGroupById = (id: string): Group | undefined => {
  return GROUPS.find(g => g.id === id);
};

/** Create a new group */
export const createGroup = (input: {
  name: string;
  description?: string;
}): Group => {
  const now = new Date().toISOString();
  
  const group: Group = {
    id: generateGroupId(),
    name: input.name.trim(),
    description: input.description?.trim(),
    createdAt: now,
    updatedAt: now,
  };

  GROUPS.push(group);
  return group;
};

/** Update an existing group */
export const updateGroup = (group: Group): void => {
  const index = GROUPS.findIndex(g => g.id === group.id);
  if (index === -1) {
    console.warn(`Group with id ${group.id} not found`);
    return;
  }

  const updated: Group = {
    ...group,
    updatedAt: new Date().toISOString(),
  };

  GROUPS[index] = updated;
};

/** Delete a group (safe delete: removes all memberships too) */
export const deleteGroup = (id: string): void => {
  const index = GROUPS.findIndex(g => g.id === id);
  if (index === -1) {
    console.warn(`Group with id ${id} not found`);
    return;
  }

  // Remove all memberships for this group
  GROUP_MEMBERSHIPS = GROUP_MEMBERSHIPS.filter(m => m.groupId !== id);

  // Remove the group
  GROUPS.splice(index, 1);
};

// --- MEMBERSHIP FUNCTIONS ---

/** Get all members of a group */
export const getMembers = (groupId: string): string[] => {
  return GROUP_MEMBERSHIPS
    .filter(m => m.groupId === groupId)
    .map(m => m.contactId);
};

/** Get all groups for a contact */
export const getGroupsForContact = (contactId: string): Group[] => {
  const groupIds = GROUP_MEMBERSHIPS
    .filter(m => m.contactId === contactId)
    .map(m => m.groupId);

  return GROUPS.filter(g => groupIds.includes(g.id));
};

/** Add a contact to a group */
export const addMember = (input: {
  groupId: string;
  contactId: string;
}): void => {
  // Check if membership already exists
  const exists = GROUP_MEMBERSHIPS.some(
    m => m.groupId === input.groupId && m.contactId === input.contactId
  );

  if (exists) {
    return; // Already a member
  }

  const membership: GroupMembership = {
    groupId: input.groupId,
    contactId: input.contactId,
    joinedAt: new Date().toISOString(),
  };

  GROUP_MEMBERSHIPS.push(membership);

  // Update group's updatedAt
  const group = getGroupById(input.groupId);
  if (group) {
    updateGroup({ ...group });
  }
};

/** Remove a contact from a group */
export const removeMember = (groupId: string, contactId: string): void => {
  const index = GROUP_MEMBERSHIPS.findIndex(
    m => m.groupId === groupId && m.contactId === contactId
  );

  if (index === -1) {
    return; // Not a member
  }

  GROUP_MEMBERSHIPS.splice(index, 1);

  // Update group's updatedAt
  const group = getGroupById(groupId);
  if (group) {
    updateGroup({ ...group });
  }
};

/** Check if a contact is a member of a group */
export const isMember = (groupId: string, contactId: string): boolean => {
  return GROUP_MEMBERSHIPS.some(
    m => m.groupId === groupId && m.contactId === contactId
  );
};


