# Legacy Tasks System Documentation

**Created**: 2025-12-11
**Status**: COMPLETED - Tasks consolidated into Notes module

## Overview

This document describes the legacy Tasks UI system that is being retired in favor of a unified Tasks-in-Notes experience.

---

## Legacy Component

**File**: `src/components/crm/TasksView.tsx`

### Characteristics

The legacy TasksView has its own sidebar navigation with:
- "Daily notes" button → navigates to NOTES view
- "All notes" button → navigates to NOTES view
- "Tasks" button → currently active (highlighted)
- "Map" button → placeholder for future implementation

### Legacy Sidebar Structure
```
LEFT SIDEBAR (264px):
├── Search Bar
├── Navigation Buttons
│   ├── Daily notes (links to NOTES)
│   ├── All notes (links to NOTES)
│   ├── Tasks (active/current)
│   └── Map (placeholder)
├── Filter Section
│   ├── All (count)
│   ├── Open (count)
│   ├── Done (count)
│   └── Blocked (count)
└── Stats Cards
    ├── Open count
    ├── Done count
    └── Blocked count
```

### Props
```typescript
interface TasksViewProps {
  selectedContactId: string;
  setSelectedContactId: (id: string) => void;
  onNavigateToDossier: () => void;
  onNavigateToNotes?: () => void;
}
```

### Features
- Status filtering (all, open, done, blocked)
- Search by task title
- Task status toggle (mark done/open)
- Contact click → navigate to dossier
- Overdue task highlighting (red border)
- Due date formatting

---

## Data Store

**File**: `src/services/taskStore.ts`

### Key Exports (Unchanged)
```typescript
// Getters
getAllTasks(): Task[]
getTasksByContactId(contactId: string): Task[]
getOpenTasksByContactId(contactId: string): Task[]
getAllOpenTasks(): Task[]
getTaskById(taskId: string): Task | undefined
getTasksByWantId(wantId: string): Task[]

// Mutations
createTask({ contactId, title, dueAt?, wantId? }): Task
updateTaskStatus(taskId: string, status: TaskStatus): void
updateTask(taskId: string, updates: Partial<...>): Task | null

// Date helpers
getTasksWithDueDate(): Task[]
getTasksByDate(date: string): Task[]
getTasksByDateRange(startDate, endDate): Task[]
```

### Task Interface
```typescript
interface Task {
  id: string;
  contactId: string;           // Required - who the task is ABOUT
  title: string;
  dueAt?: string | null;       // ISO timestamp
  status: TaskStatus;          // 'open' | 'done' | 'blocked'
  createdAt: string;           // ISO timestamp
  wantId?: string | null;      // Optional link to a Want
}
```

---

## Navigation Points (Pre-Migration)

All of these were calling `setCurrentView('TASKS')` which routed to the legacy TasksView:

| Location | Trigger | Handler |
|----------|---------|---------|
| Dashboard.tsx | Graph node click | `setCurrentView('TASKS')` |
| ContactZeroView.tsx | ThingsDueToday "View All Tasks" | `onNavigateToTasks()` |
| ContactZeroView.tsx | RadarWidget overdue tasks | `onNavigateToTasks()` |
| ContactZeroView.tsx | PreFlightBriefingOverlay "View All" | `onNavigateToTasks()` |

---

## Migration Target

### New Location
Tasks now live inside the Notes module (`AffineNotes.tsx`) as a sidebar entry.

### New Sidebar Structure
```
NOTES LEFT SIDEBAR:
├── All docs
├── Journals
├── Tasks (NEW) ← Unified task list
├── ─────────────
├── Organize (folders)
├── Tags
├── Collections
└── Others (Trash, Settings)
```

### New Routing
All `onNavigateToTasks()` calls now:
1. Set `currentView` to 'NOTES'
2. Pass `initialView='tasks'` prop to AffineNotes
3. AffineNotes renders the embedded task list

---

## Migration Completed (2025-12-11)

### Files Created
- `src/components/notes/NotesTasksView.tsx` - Embedded task list component for Notes module

### Files Modified
- `src/components/notes/AffineNotes.tsx`:
  - Added 'tasks' to SidebarView type
  - Added Tasks entry to sidebar navigation
  - Renders NotesTasksView when sidebarView === 'tasks'
  - Added initialView prop for deep linking
- `src/components/Dashboard.tsx`:
  - Added `handleNavigateToTasks()` function that routes to NOTES with initialView='tasks'
  - Added `notesInitialView` state
  - Commented out legacy TASKS view rendering
  - Updated all task navigation to use new handler
- `src/components/crm/ContactZeroView.tsx`:
  - Added onClick handlers to task rows in PreFlightBriefingOverlay
  - Added onClick handlers to task rows in ThingsDueToday
  - Task rows now navigate to contact dossier
- `src/lib/settings/userSettings.ts`:
  - Added global dark mode utility functions
- `src/components/crm/SettingsView.tsx`:
  - Updated to use shared theme utilities

### Theme Unification
The theme toggle now syncs between Notes editor and global app theme:
- Single source of truth: `framelord_dark_mode` localStorage key
- Shared functions: `getGlobalDarkMode()`, `setGlobalDarkMode()`, `applyGlobalTheme()`
- Both Settings and Notes views use the same utilities

### Navigation Wiring
- "View All Tasks" → Notes module with Tasks sidebar view
- Task row click → Contact Dossier
- Contact row click → Contact Dossier

---

## Enhancement: Task Creation (2025-12-11)

### NotesTasksView Now Includes Task Creator

The embedded task list now has full task creation capabilities:

**Features:**
- "New Task" button in header
- Task title input (with Enter key support)
- Contact picker dropdown with search
- Due date picker (optional)
- Create button

**UI Flow:**
1. Click "New Task" button → Form appears
2. Enter task title (required)
3. Select contact (defaults to Contact Zero)
4. Optionally set due date
5. Click "Create Task" or press Enter
6. Form closes, task list refreshes

**Files Modified:**
- `src/components/notes/NotesTasksView.tsx`:
  - Added task creation form state
  - Added contact picker with search
  - Added date picker integration
  - Added form UI with styling matching Notes theme

---

## Post-Migration Cleanup

Remaining cleanup (optional):
- [x] ~~Remove `currentView === 'TASKS'` case from Dashboard.tsx~~ (commented out, kept for reference)
- [ ] Remove TasksView import from Dashboard.tsx (optional)
- [ ] Delete TasksView.tsx entirely (optional, can keep as reference)
- [ ] Update any tests referencing legacy route
