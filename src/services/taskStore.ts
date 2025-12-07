// =============================================================================
// TASK STORE — In-memory data source for Tasks
// =============================================================================
// INVARIANT: Every Task has a contactId. No orphan tasks.
// Tasks track what needs to be done for/about a specific contact.
// =============================================================================

import { Task, TaskStatus } from '../types';
import { CONTACT_ZERO } from './contactStore';

// --- MOCK TASKS ---
// All tasks are linked to a Contact via contactId

let MOCK_TASKS: Task[] = [
  // Tasks for Contact Zero (personal to-dos)
  {
    id: 'task_001',
    contactId: CONTACT_ZERO.id,
    title: 'Review weekly frame metrics and adjust strategy',
    dueAt: '2025-12-03T09:00:00Z',
    status: 'open',
    createdAt: '2025-12-01T08:00:00Z',
  },
  {
    id: 'task_002',
    contactId: CONTACT_ZERO.id,
    title: 'Practice declarative endings in conversations',
    dueAt: null,
    status: 'open',
    createdAt: '2025-11-30T14:00:00Z',
  },
  {
    id: 'task_003',
    contactId: CONTACT_ZERO.id,
    title: 'Complete morning frame check routine',
    dueAt: '2025-12-02T08:00:00Z',
    status: 'done',
    createdAt: '2025-11-29T07:00:00Z',
  },

  // Tasks for Sarah Chen (prospect)
  {
    id: 'task_004',
    contactId: 'c_sarah_chen',
    title: 'Send technical whitepaper follow-up email',
    dueAt: '2025-12-03T10:00:00Z',
    status: 'open',
    createdAt: '2025-11-30T16:30:00Z',
  },
  {
    id: 'task_005',
    contactId: 'c_sarah_chen',
    title: 'Prepare demo for Dec 5 meeting',
    dueAt: '2025-12-05T09:00:00Z',
    status: 'open',
    createdAt: '2025-11-30T17:00:00Z',
  },
  {
    id: 'task_006',
    contactId: 'c_sarah_chen',
    title: 'Research her company tech stack',
    dueAt: null,
    status: 'done',
    createdAt: '2025-11-28T10:00:00Z',
  },

  // Tasks for Marcus Johnson (client)
  {
    id: 'task_007',
    contactId: 'c_marcus_johnson',
    title: 'Schedule Q1 planning call',
    dueAt: '2025-12-10T14:00:00Z',
    status: 'open',
    createdAt: '2025-12-02T15:00:00Z',
  },
  {
    id: 'task_008',
    contactId: 'c_marcus_johnson',
    title: 'Send December invoice',
    dueAt: '2025-12-01T17:00:00Z',
    status: 'done',
    createdAt: '2025-12-01T09:00:00Z',
  },

  // Tasks for Elena Rodriguez (partner)
  {
    id: 'task_009',
    contactId: 'c_elena_rodriguez',
    title: 'Address boundary issues from last call',
    dueAt: '2025-12-04T10:00:00Z',
    status: 'open',
    createdAt: '2025-11-20T11:00:00Z',
  },
  {
    id: 'task_010',
    contactId: 'c_elena_rodriguez',
    title: 'Prepare frame reset conversation points',
    dueAt: '2025-12-03T09:00:00Z',
    status: 'blocked',
    createdAt: '2025-11-22T08:00:00Z',
  },

  // Tasks for David Kim (investor)
  {
    id: 'task_011',
    contactId: 'c_david_kim',
    title: 'Finalize board meeting agenda',
    dueAt: '2025-12-08T08:00:00Z',
    status: 'open',
    createdAt: '2025-11-18T13:00:00Z',
  },
  {
    id: 'task_012',
    contactId: 'c_david_kim',
    title: 'Send Q3 metrics report',
    dueAt: '2025-12-06T17:00:00Z',
    status: 'open',
    createdAt: '2025-12-01T10:00:00Z',
  },

  // Tasks for James Wilson (friend)
  {
    id: 'task_013',
    contactId: 'c_james_wilson',
    title: 'Plan next catch-up dinner',
    dueAt: null,
    status: 'open',
    createdAt: '2025-11-28T22:00:00Z',
  },

  // Tasks for Lisa Park (family)
  {
    id: 'task_014',
    contactId: 'c_lisa_park',
    title: 'Buy birthday gift',
    dueAt: '2025-12-15T12:00:00Z',
    status: 'open',
    createdAt: '2025-12-01T19:00:00Z',
  },
];

// --- HELPER FUNCTIONS ---

/** Generate a unique ID for new tasks */
const generateTaskId = (): string => {
  return `task-${Date.now()}`;
};

/** Get all tasks sorted by dueAt (earliest first, null at bottom), then createdAt */
export const getAllTasks = (): Task[] => {
  return [...MOCK_TASKS].sort((a, b) => {
    // Both have dueAt: sort by dueAt
    if (a.dueAt && b.dueAt) {
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    }
    // Only a has dueAt: a comes first
    if (a.dueAt && !b.dueAt) return -1;
    // Only b has dueAt: b comes first
    if (!a.dueAt && b.dueAt) return 1;
    // Neither has dueAt: sort by createdAt
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
};

/** Get all tasks for a specific contact */
export const getTasksByContactId = (contactId: string): Task[] => {
  return MOCK_TASKS
    .filter(t => t.contactId === contactId)
    .sort((a, b) => {
      if (a.dueAt && b.dueAt) {
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      }
      if (a.dueAt && !b.dueAt) return -1;
      if (!a.dueAt && b.dueAt) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
};

/** Get open tasks for a specific contact */
export const getOpenTasksByContactId = (contactId: string): Task[] => {
  return getTasksByContactId(contactId).filter(t => t.status === 'open');
};

/** Get all open tasks */
export const getAllOpenTasks = (): Task[] => {
  return getAllTasks().filter(t => t.status === 'open');
};

/** Get open task count for a contact */
export const getOpenTaskCountByContactId = (contactId: string): number => {
  return MOCK_TASKS.filter(t => t.contactId === contactId && t.status === 'open').length;
};

/** Create a new task */
export const createTask = (params: {
  contactId: string;
  title: string;
  dueAt?: string | null;
}): Task => {
  const newTask: Task = {
    id: generateTaskId(),
    contactId: params.contactId,
    title: params.title,
    dueAt: params.dueAt || null,
    status: 'open',
    createdAt: new Date().toISOString(),
  };

  MOCK_TASKS = [newTask, ...MOCK_TASKS];
  return newTask;
};

/** Update task status */
export const updateTaskStatus = (taskId: string, status: TaskStatus): void => {
  const index = MOCK_TASKS.findIndex(t => t.id === taskId);
  if (index !== -1) {
    MOCK_TASKS[index] = { ...MOCK_TASKS[index], status };
  }
};

/** Get a task by ID */
export const getTaskById = (taskId: string): Task | undefined => {
  return MOCK_TASKS.find(t => t.id === taskId);
};

/** Get tasks grouped by contact (for Contact Zero summary) */
export const getOpenTasksGroupedByContact = (): Map<string, Task[]> => {
  const grouped = new Map<string, Task[]>();
  
  const openTasks = getAllOpenTasks().filter(t => t.contactId !== CONTACT_ZERO.id);
  
  for (const task of openTasks) {
    const existing = grouped.get(task.contactId) || [];
    grouped.set(task.contactId, [...existing, task]);
  }
  
  return grouped;
};

// =============================================================================
// CALENDAR/DATE HELPERS
// =============================================================================

/**
 * Extract the date portion from a dueAt string.
 * Accepts ISO strings like "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm:ss".
 */
const extractDatePortion = (dueAt: string): string => {
  return dueAt.split('T')[0];
};

/**
 * Check if a dueAt string has a time component.
 */
export const hasTimeComponent = (dueAt: string | null | undefined): boolean => {
  if (!dueAt) return false;
  return dueAt.includes('T');
};

/**
 * Format the time portion of a dueAt string for display.
 * Returns empty string if no time component.
 */
export const formatDueTime = (dueAt: string | null | undefined): string => {
  if (!dueAt || !hasTimeComponent(dueAt)) return '';
  
  const date = new Date(dueAt);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Get all tasks that have a dueAt date.
 */
export const getTasksWithDueDate = (): Task[] => {
  return getAllTasks().filter(t => t.dueAt != null);
};

/**
 * Get tasks for a specific date.
 * @param date - Date string in "YYYY-MM-DD" format
 */
export const getTasksByDate = (date: string): Task[] => {
  return MOCK_TASKS
    .filter(t => {
      if (!t.dueAt) return false;
      const taskDate = extractDatePortion(t.dueAt);
      return taskDate === date;
    })
    .sort((a, b) => {
      // Sort by time if both have time, otherwise by title
      if (a.dueAt && b.dueAt) {
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      }
      return 0;
    });
};

/**
 * Get tasks within a date range (inclusive).
 * @param startDate - Start date in "YYYY-MM-DD" format
 * @param endDate - End date in "YYYY-MM-DD" format
 */
export const getTasksByDateRange = (startDate: string, endDate: string): Task[] => {
  return MOCK_TASKS
    .filter(t => {
      if (!t.dueAt) return false;
      const taskDate = extractDatePortion(t.dueAt);
      return taskDate >= startDate && taskDate <= endDate;
    })
    .sort((a, b) => {
      if (a.dueAt && b.dueAt) {
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      }
      return 0;
    });
};

/**
 * Get the count of tasks for a specific date.
 * @param date - Date string in "YYYY-MM-DD" format
 */
export const getTaskCountByDate = (date: string): number => {
  return getTasksByDate(date).length;
};

/**
 * Get open tasks for a specific date.
 * @param date - Date string in "YYYY-MM-DD" format
 */
export const getOpenTasksByDate = (date: string): Task[] => {
  return getTasksByDate(date).filter(t => t.status === 'open');
};

/**
 * Get open tasks within a date range (inclusive).
 * @param startDate - Start date in "YYYY-MM-DD" format
 * @param endDate - End date in "YYYY-MM-DD" format
 */
export const getOpenTasksByDateRange = (startDate: string, endDate: string): Task[] => {
  return getTasksByDateRange(startDate, endDate).filter(t => t.status === 'open');
};

