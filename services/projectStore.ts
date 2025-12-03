// =============================================================================
// PROJECT STORE
// =============================================================================
// Asana-style project management aligned with FrameLord Contact spine
// Projects link to contacts, tasks are linked (not duplicated)
// =============================================================================

import type {
  Project,
  ProjectSection,
  ProjectTaskLink,
  ProjectAttachment,
  ProjectStatus,
  ProjectPriority,
  TaskStatus
} from '../types';
import { updateTaskStatus, getTaskById } from './taskStore';
import { CONTACT_ZERO } from './contactStore';

// =============================================================================
// STATE
// =============================================================================

let PROJECTS: Project[] = [];
let PROJECT_SECTIONS: ProjectSection[] = [];
let PROJECT_TASK_LINKS: ProjectTaskLink[] = [];

const ensureProjectDefaults = (project: Project): Project => {
  if (project.isGroupProject === undefined) {
    project.isGroupProject = false;
  }
  if (!project.groupMemberIds) {
    project.groupMemberIds = [];
  }
  if (!project.groupGoals) {
    project.groupGoals = [];
  }
  return project;
};

// Section name patterns to task status mapping
const DEFAULT_STATUS_MAPPINGS: Record<string, TaskStatus> = {
  'backlog': 'open',
  'todo': 'open',
  'in progress': 'open',
  'in review': 'open',
  'done': 'done',
  'completed': 'done',
  'blocked': 'blocked',
  'on hold': 'blocked',
};

/**
 * Map section name to task status
 * Uses fuzzy matching on lowercase section names
 */
const getSectionTaskStatus = (sectionName: string): TaskStatus => {
  const normalized = sectionName.toLowerCase().trim();

  // Check exact matches first
  if (DEFAULT_STATUS_MAPPINGS[normalized]) {
    return DEFAULT_STATUS_MAPPINGS[normalized];
  }

  // Check partial matches
  if (normalized.includes('done') || normalized.includes('complete')) return 'done';
  if (normalized.includes('blocked') || normalized.includes('hold')) return 'blocked';

  // Default to open
  return 'open';
};

// =============================================================================
// PROJECT CRUD
// =============================================================================

export const getAllProjects = (includeArchived = false): Project[] => {
  const filtered = (includeArchived
    ? PROJECTS
    : PROJECTS.filter(p => p.status !== 'archived'))
    .map(ensureProjectDefaults);

  return [...filtered].sort((a, b) =>
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
};

export const getProjectById = (id: string): Project | undefined => {
  const project = PROJECTS.find(p => p.id === id);
  return project ? ensureProjectDefaults(project) : undefined;
};

export const getProjectsByContact = (contactId: string): Project[] => {
  return PROJECTS.filter(p =>
    p.primaryContactId === contactId || p.relatedContactIds.includes(contactId)
  )
    .map(ensureProjectDefaults)
    .sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
};

export const getProjectsByStatus = (status: ProjectStatus): Project[] => {
  return PROJECTS.filter(p => p.status === status)
    .map(ensureProjectDefaults)
    .sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
};

export const getProjectsByPriority = (priority: ProjectPriority): Project[] => {
  return PROJECTS.filter(p => p.priority === priority)
    .map(ensureProjectDefaults)
    .sort((a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
};

export const createProject = (input: {
  name: string;
  description?: string;
  primaryContactId: string;
  relatedContactIds?: string[];
  status?: ProjectStatus;
  priority?: ProjectPriority;
  startDate?: string | null;
  dueDate?: string | null;
  isGroupProject?: boolean;
  groupMemberIds?: string[];
  groupGoals?: string[];
}): Project => {
  const now = new Date().toISOString();

  const newProject: Project = {
    id: `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: input.name,
    isGroupProject: input.isGroupProject ?? false,
    groupMemberIds: input.groupMemberIds ? [...input.groupMemberIds] : [],
    groupGoals: input.groupGoals ? [...input.groupGoals] : [],
    description: input.description || '',
    primaryContactId: input.primaryContactId,
    relatedContactIds: input.relatedContactIds || [],
    status: input.status || 'active',
    priority: input.priority || 'medium',
    createdAt: now,
    updatedAt: now,
    startDate: input.startDate || null,
    dueDate: input.dueDate || null,
    sectionIds: [],
    topicIds: [],
    groupIds: [],
    attachments: [],
  };

  PROJECTS.push(newProject);

  // Create default sections
  createSection({ projectId: newProject.id, name: 'Backlog' });
  createSection({ projectId: newProject.id, name: 'In Progress' });
  createSection({ projectId: newProject.id, name: 'Done' });

  return newProject;
};

export const updateProject = (updated: Project): void => {
  const index = PROJECTS.findIndex(p => p.id === updated.id);
  if (index !== -1) {
    PROJECTS[index] = {
      ...updated,
      updatedAt: new Date().toISOString(),
    };
  }
};

export const archiveProject = (projectId: string): void => {
  const project = getProjectById(projectId);
  if (project) {
    updateProject({ ...project, status: 'archived' });
  }
};

export const deleteProject = (projectId: string): void => {
  // Remove the project
  PROJECTS = PROJECTS.filter(p => p.id !== projectId);

  // Remove all sections
  PROJECT_SECTIONS = PROJECT_SECTIONS.filter(s => s.projectId !== projectId);

  // Remove all task links (but not the tasks themselves)
  PROJECT_TASK_LINKS = PROJECT_TASK_LINKS.filter(l => l.projectId !== projectId);
};

// =============================================================================
// SECTION CRUD
// =============================================================================

export const getSectionsByProject = (projectId: string): ProjectSection[] => {
  return PROJECT_SECTIONS
    .filter(s => s.projectId === projectId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
};

export const getSectionById = (sectionId: string): ProjectSection | undefined => {
  return PROJECT_SECTIONS.find(s => s.id === sectionId);
};

export const createSection = (input: {
  projectId: string;
  name: string;
}): ProjectSection => {
  const project = getProjectById(input.projectId);
  if (!project) {
    throw new Error(`Project ${input.projectId} not found`);
  }

  const existingSections = getSectionsByProject(input.projectId);
  const maxSortOrder = existingSections.length > 0
    ? Math.max(...existingSections.map(s => s.sortOrder))
    : -1;

  const newSection: ProjectSection = {
    id: `section-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    projectId: input.projectId,
    name: input.name,
    sortOrder: maxSortOrder + 1,
    createdAt: new Date().toISOString(),
  };

  PROJECT_SECTIONS.push(newSection);

  // Update project's sectionIds
  project.sectionIds.push(newSection.id);
  updateProject(project);

  return newSection;
};

export const updateSection = (updated: ProjectSection): void => {
  const index = PROJECT_SECTIONS.findIndex(s => s.id === updated.id);
  if (index !== -1) {
    PROJECT_SECTIONS[index] = updated;

    // Touch project updatedAt
    const project = getProjectById(updated.projectId);
    if (project) {
      updateProject(project);
    }
  }
};

export const deleteSection = (sectionId: string): void => {
  const section = getSectionById(sectionId);
  if (!section) return;

  // Get all tasks in this section
  const tasksInSection = getTaskLinksForSection(sectionId);

  // If there are tasks, we need to handle them
  if (tasksInSection.length > 0) {
    // Option 1: Move tasks to another section (first section that's not this one)
    const otherSections = getSectionsByProject(section.projectId)
      .filter(s => s.id !== sectionId);

    if (otherSections.length > 0) {
      const targetSection = otherSections[0];
      tasksInSection.forEach(link => {
        moveTaskBetweenSections(link.taskId, section.projectId, targetSection.id);
      });
    } else {
      // No other sections - just remove the links
      PROJECT_TASK_LINKS = PROJECT_TASK_LINKS.filter(l => l.sectionId !== sectionId);
    }
  }

  // Remove the section
  PROJECT_SECTIONS = PROJECT_SECTIONS.filter(s => s.id !== sectionId);

  // Update project's sectionIds
  const project = getProjectById(section.projectId);
  if (project) {
    project.sectionIds = project.sectionIds.filter(id => id !== sectionId);
    updateProject(project);
  }
};

// =============================================================================
// TASK LINK CRUD
// =============================================================================

export const getTaskLinksForProject = (projectId: string): ProjectTaskLink[] => {
  return PROJECT_TASK_LINKS
    .filter(l => l.projectId === projectId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
};

export const getTaskLinksForSection = (sectionId: string): ProjectTaskLink[] => {
  return PROJECT_TASK_LINKS
    .filter(l => l.sectionId === sectionId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
};

export const getTaskLinkByTaskId = (projectId: string, taskId: string): ProjectTaskLink | undefined => {
  return PROJECT_TASK_LINKS.find(l =>
    l.projectId === projectId && l.taskId === taskId
  );
};

/**
 * Add an existing task to a project section
 * @param taskId - Existing task ID from taskStore
 * @param projectId - Project to add to
 * @param sectionId - Section within project
 * @returns The created task link
 */
export const addTaskToProjectSection = (
  taskId: string,
  projectId: string,
  sectionId: string
): ProjectTaskLink => {
  // Verify task exists
  const task = getTaskById(taskId);
  if (!task) {
    throw new Error(`Task ${taskId} not found`);
  }

  // Verify project and section exist
  const project = getProjectById(projectId);
  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }

  const section = getSectionById(sectionId);
  if (!section || section.projectId !== projectId) {
    throw new Error(`Section ${sectionId} not found in project ${projectId}`);
  }

  // Check if already linked
  const existingLink = getTaskLinkByTaskId(projectId, taskId);
  if (existingLink) {
    // Move to new section instead
    return moveTaskBetweenSections(taskId, projectId, sectionId);
  }

  // Get max sort order in section
  const linksInSection = getTaskLinksForSection(sectionId);
  const maxSortOrder = linksInSection.length > 0
    ? Math.max(...linksInSection.map(l => l.sortOrder))
    : -1;

  const newLink: ProjectTaskLink = {
    id: `tasklink-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    projectId,
    sectionId,
    taskId,
    sortOrder: maxSortOrder + 1,
    createdAt: new Date().toISOString(),
  };

  PROJECT_TASK_LINKS.push(newLink);

  // Update task status based on section name
  const newStatus = getSectionTaskStatus(section.name);
  if (task.status !== newStatus) {
    updateTaskStatus(taskId, newStatus);
  }

  // Touch project updatedAt
  updateProject(project);

  return newLink;
};

/**
 * Move a task from one section to another within the same project
 * Updates task status based on target section
 */
export const moveTaskBetweenSections = (
  taskId: string,
  projectId: string,
  targetSectionId: string
): ProjectTaskLink => {
  const existingLink = getTaskLinkByTaskId(projectId, taskId);
  if (!existingLink) {
    throw new Error(`Task ${taskId} not linked to project ${projectId}`);
  }

  const targetSection = getSectionById(targetSectionId);
  if (!targetSection || targetSection.projectId !== projectId) {
    throw new Error(`Target section ${targetSectionId} not found in project ${projectId}`);
  }

  // Get max sort order in target section
  const linksInSection = getTaskLinksForSection(targetSectionId);
  const maxSortOrder = linksInSection.length > 0
    ? Math.max(...linksInSection.map(l => l.sortOrder))
    : -1;

  // Update the link
  const index = PROJECT_TASK_LINKS.findIndex(l => l.id === existingLink.id);
  if (index !== -1) {
    PROJECT_TASK_LINKS[index] = {
      ...existingLink,
      sectionId: targetSectionId,
      sortOrder: maxSortOrder + 1,
    };
  }

  // Update task status based on section name
  const task = getTaskById(taskId);
  if (task) {
    const newStatus = getSectionTaskStatus(targetSection.name);
    if (task.status !== newStatus) {
      updateTaskStatus(taskId, newStatus);
    }
  }

  // Touch project updatedAt
  const project = getProjectById(projectId);
  if (project) {
    updateProject(project);
  }

  return PROJECT_TASK_LINKS[index];
};

/**
 * Remove a task from a project
 * Does NOT delete the task from taskStore, only removes the link
 */
export const removeTaskFromProject = (projectId: string, taskId: string): void => {
  const link = getTaskLinkByTaskId(projectId, taskId);
  if (!link) return;

  PROJECT_TASK_LINKS = PROJECT_TASK_LINKS.filter(l => l.id !== link.id);

  // Touch project updatedAt
  const project = getProjectById(projectId);
  if (project) {
    updateProject(project);
  }
};

// =============================================================================
// STATS & HELPERS
// =============================================================================

export const getProjectTaskCount = (projectId: string): number => {
  return getTaskLinksForProject(projectId).length;
};

export const getProjectOpenTaskCount = (projectId: string): number => {
  const links = getTaskLinksForProject(projectId);
  let count = 0;

  links.forEach(link => {
    const task = getTaskById(link.taskId);
    if (task && task.status === 'open') {
      count++;
    }
  });

  return count;
};

export const getSectionTaskCount = (sectionId: string): number => {
  return getTaskLinksForSection(sectionId).length;
};

// =============================================================================
// ATTACHMENT MANAGEMENT
// =============================================================================

export const addAttachmentToProject = (
  projectId: string,
  file: { fileName: string; mimeType: string; dataUrl: string }
): ProjectAttachment => {
  const project = getProjectById(projectId);
  if (!project) {
    throw new Error(`Project ${projectId} not found`);
  }

  const attachment: ProjectAttachment = {
    id: `attachment-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    projectId,
    fileName: file.fileName,
    mimeType: file.mimeType,
    dataUrl: file.dataUrl,
    uploadedBy: CONTACT_ZERO.id,
    createdAt: new Date().toISOString(),
  };

  project.attachments.push(attachment);
  updateProject(project);

  return attachment;
};

export const removeAttachmentFromProject = (projectId: string, attachmentId: string): void => {
  const project = getProjectById(projectId);
  if (!project) return;

  project.attachments = project.attachments.filter(a => a.id !== attachmentId);
  updateProject(project);
};

export const getProjectAttachments = (projectId: string): ProjectAttachment[] => {
  const project = getProjectById(projectId);
  return project ? project.attachments : [];
};

// =============================================================================
// CONTACT ASSIGNMENT
// =============================================================================

export const addRelatedContact = (projectId: string, contactId: string): void => {
  const project = getProjectById(projectId);
  if (!project) return;

  if (!project.relatedContactIds.includes(contactId) && project.primaryContactId !== contactId) {
    project.relatedContactIds.push(contactId);
    updateProject(project);
  }
};

export const removeRelatedContact = (projectId: string, contactId: string): void => {
  const project = getProjectById(projectId);
  if (!project) return;

  project.relatedContactIds = project.relatedContactIds.filter(id => id !== contactId);
  updateProject(project);
};

export const changePrimaryContact = (projectId: string, newPrimaryContactId: string): void => {
  const project = getProjectById(projectId);
  if (!project) return;

  // Move old primary to related contacts if not already there
  if (!project.relatedContactIds.includes(project.primaryContactId)) {
    project.relatedContactIds.push(project.primaryContactId);
  }

  // Set new primary and remove from related if present
  project.primaryContactId = newPrimaryContactId;
  project.relatedContactIds = project.relatedContactIds.filter(id => id !== newPrimaryContactId);

  updateProject(project);
};

// =============================================================================
// GROUP MODE HELPERS
// =============================================================================

export const addGroupMemberToProject = (projectId: string, contactId: string): void => {
  const project = getProjectById(projectId);
  if (!project) return;

  if (!project.groupMemberIds.includes(contactId)) {
    project.groupMemberIds.push(contactId);
    // Keep related contacts in sync for visibility
    addRelatedContact(projectId, contactId);
    updateProject(project);
  }
};

export const removeGroupMemberFromProject = (projectId: string, contactId: string): void => {
  const project = getProjectById(projectId);
  if (!project) return;

  project.groupMemberIds = project.groupMemberIds.filter(id => id !== contactId);
  updateProject(project);
};

export const addGoalToProject = (projectId: string, goal: string): void => {
  const trimmed = goal.trim();
  if (!trimmed) return;
  const project = getProjectById(projectId);
  if (!project) return;

  if (!project.groupGoals.includes(trimmed)) {
    project.groupGoals.push(trimmed);
    updateProject(project);
  }
};

export const removeGoalFromProject = (projectId: string, goal: string): void => {
  const project = getProjectById(projectId);
  if (!project) return;

  project.groupGoals = project.groupGoals.filter(g => g !== goal);
  updateProject(project);
};
