// =============================================================================
// FOLDER STORE — PARA-style note organization
// =============================================================================
// Manages folders for organizing notes using the PARA method:
// - Projects: Short-term efforts with a clear end
// - Areas: Long-term responsibilities to maintain
// - Resources: Topics or themes of ongoing interest
// - Archive: Inactive items from the other categories
// =============================================================================

import { Folder, DEFAULT_FOLDERS } from '../types';

// =============================================================================
// STATE
// =============================================================================

let FOLDERS: Folder[] = [
  {
    id: 'inbox',
    name: 'Inbox',
    parentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: 0,
    icon: 'inbox',
  },
  {
    id: DEFAULT_FOLDERS.PROJECTS,
    name: 'Projects',
    parentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: 1,
    icon: 'folder',
  },
  {
    id: DEFAULT_FOLDERS.AREAS,
    name: 'Areas',
    parentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: 2,
    icon: 'folder',
  },
  {
    id: DEFAULT_FOLDERS.RESOURCES,
    name: 'Resources',
    parentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: 3,
    icon: 'folder',
  },
  {
    id: DEFAULT_FOLDERS.ARCHIVE,
    name: 'Archive',
    parentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: 4,
    icon: 'archive',
  },
];

// =============================================================================
// QUERIES
// =============================================================================

/**
 * Get all folders sorted by order
 */
export const getAllFolders = (): Folder[] => {
  return [...FOLDERS].sort((a, b) => a.order - b.order);
};

/**
 * Get folder by ID
 */
export const getFolderById = (id: string): Folder | undefined => {
  return FOLDERS.find(f => f.id === id);
};

/**
 * Get root-level folders (no parent)
 */
export const getRootFolders = (): Folder[] => {
  return FOLDERS
    .filter(f => f.parentId === null)
    .sort((a, b) => a.order - b.order);
};

/**
 * Get child folders for a parent
 */
export const getChildFolders = (parentId: string): Folder[] => {
  return FOLDERS
    .filter(f => f.parentId === parentId)
    .sort((a, b) => a.order - b.order);
};

/**
 * Check if a folder is a default PARA folder
 */
export const isDefaultFolder = (folderId: string): boolean => {
  return Object.values(DEFAULT_FOLDERS).includes(folderId as typeof DEFAULT_FOLDERS[keyof typeof DEFAULT_FOLDERS]);
};

// =============================================================================
// MUTATIONS
// =============================================================================

/**
 * Generate a unique folder ID
 */
const generateFolderId = (): string => {
  return `folder-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
};

/**
 * Create a new folder
 */
export const createFolder = (
  name: string,
  parentId: string | null = null,
  options: { color?: string; icon?: string } = {}
): Folder => {
  const now = new Date().toISOString();

  // Calculate order (put at end of siblings)
  const siblings = parentId
    ? getChildFolders(parentId)
    : getRootFolders();
  const maxOrder = siblings.reduce((max, f) => Math.max(max, f.order), 0);

  const newFolder: Folder = {
    id: generateFolderId(),
    name: name.trim(),
    parentId,
    createdAt: now,
    updatedAt: now,
    order: maxOrder + 1,
    color: options.color,
    icon: options.icon || 'folder',
  };

  FOLDERS.push(newFolder);
  return newFolder;
};

/**
 * Update a folder
 * NOTE: Cannot update default PARA folders' names
 */
export const updateFolder = (
  id: string,
  updates: Partial<Pick<Folder, 'name' | 'parentId' | 'order' | 'color' | 'icon'>>
): Folder | null => {
  const index = FOLDERS.findIndex(f => f.id === id);
  if (index === -1) return null;

  const folder = FOLDERS[index];

  // Prevent renaming default folders
  if (isDefaultFolder(id) && updates.name !== undefined) {
    console.warn('Cannot rename default PARA folders');
    delete updates.name;
  }

  FOLDERS[index] = {
    ...folder,
    ...updates,
    updatedAt: new Date().toISOString(),
  };

  return FOLDERS[index];
};

/**
 * Delete a folder
 * NOTE: Cannot delete default PARA folders
 * NOTE: Does not delete notes in the folder - they become unfiled
 */
export const deleteFolder = (id: string): boolean => {
  // Prevent deleting default folders
  if (isDefaultFolder(id)) {
    console.warn('Cannot delete default PARA folders');
    return false;
  }

  const initialLength = FOLDERS.length;
  FOLDERS = FOLDERS.filter(f => f.id !== id);

  // Also remove any child folders
  FOLDERS = FOLDERS.filter(f => f.parentId !== id);

  return FOLDERS.length < initialLength;
};

/**
 * Reorder folders (update order values)
 */
export const reorderFolders = (orderedIds: string[]): void => {
  orderedIds.forEach((id, index) => {
    const folder = FOLDERS.find(f => f.id === id);
    if (folder) {
      folder.order = index + 1;
      folder.updatedAt = new Date().toISOString();
    }
  });
};

/**
 * Move a folder to a new parent
 */
export const moveFolderToParent = (folderId: string, newParentId: string | null): Folder | null => {
  // Prevent moving default folders
  if (isDefaultFolder(folderId)) {
    console.warn('Cannot move default PARA folders');
    return null;
  }

  // Prevent circular references
  if (newParentId === folderId) {
    console.warn('Cannot move folder into itself');
    return null;
  }

  // Check if newParentId is a descendant of folderId
  let checkParent = newParentId;
  while (checkParent) {
    if (checkParent === folderId) {
      console.warn('Cannot move folder into its own descendant');
      return null;
    }
    const parent = getFolderById(checkParent);
    checkParent = parent?.parentId || null;
  }

  return updateFolder(folderId, { parentId: newParentId });
};

// =============================================================================
// FOLDER PATH HELPERS
// =============================================================================

/**
 * Get the full path of a folder (array of folder names from root to folder)
 */
export const getFolderPath = (folderId: string): string[] => {
  const path: string[] = [];
  let current = getFolderById(folderId);

  while (current) {
    path.unshift(current.name);
    current = current.parentId ? getFolderById(current.parentId) : undefined;
  }

  return path;
};

/**
 * Get the full path as a string
 */
export const getFolderPathString = (folderId: string, separator: string = ' / '): string => {
  return getFolderPath(folderId).join(separator);
};
