# FrameLord Notes & Canvas Refactor - Implementation Plan

**Date:** 2025-12-05
**Status:** READY FOR REVIEW
**Estimated Effort:** Large (7-10 phases)

---

## Executive Summary

This plan refactors FrameLord from having separate Canvas and Notes modules into a unified system where every **Note can be viewed as either text or canvas**. We will remove Affine/BaseCube UI cloning, build custom FrameLord-themed UI, integrate Daily Log/Inbox/PARA folders, and ensure FrameScan works in both modes.

---

## Current State Analysis

### What Exists Now
1. **Separate Canvas Module**
   - Route: `'CANVAS'` view in Dashboard (line 1956-1958)
   - Component: `FrameCanvasPage.tsx` - standalone canvas with thread management
   - Store: `canvasStore.ts` with CanvasThread/CanvasNode/CanvasConnection types
   - Uses BlockSuite edgeless canvas (`BlockSuiteEdgelessCanvas.tsx`)

2. **Notes System**
   - Store: `noteStore.ts` with plain text `content: string` field
   - Type: `Note` interface in `types.ts` (lines 71-85)
   - View: `NotesView.tsx` for displaying notes
   - Supports [[Topic]] links and [[Note]] backlinks

3. **Current Note Type Fields**
   ```typescript
   interface Note {
     id: string;
     contactId: string;              // who note is ABOUT (legacy)
     authorContactId: string;        // who WROTE it (always CONTACT_ZERO)
     targetContactId?: string;       // explicit target
     mentionedContactIds?: string[]; // @mentions
     title?: string;
     content: string;                // plain text (LEGACY - needs BlockSuite)
     entries: NoteEntry[];          // bullet points
     attachments?: NoteAttachment[];
     isPinned: boolean;
     createdAt: string;
     updatedAt?: string | null;
     tags?: string[];
   }
   ```

4. **Daily Notes**
   - Separate `DailyNote` type exists in `types.ts`
   - Store: `dailyNoteStore.ts`
   - Date-based journal entries

5. **FrameScan**
   - Store: `frameScanReportStore.ts`
   - Components: `FrameScanPage.tsx`, `FrameScanReportDetail.tsx`
   - Works on contacts currently, needs integration with Notes

6. **Contact System**
   - Store: `contactStore.ts`
   - CONTACT_ZERO is the user (immutable)
   - All notes authored by CONTACT_ZERO

### What Needs to Change

1. **Remove/Deprecate**
   - `FrameCanvasPage.tsx` - separate canvas route
   - `canvasStore.ts` - separate canvas threads/nodes
   - Navigation to `'CANVAS'` view (Dashboard line 1738)
   - `DailyNote` type - merge into unified Note

2. **Modify**
   - `Note` type - add BlockSuite document field + metadata
   - `noteStore.ts` - support BlockSuite documents
   - `NotesView.tsx` - support filtering/organization

3. **Create New**
   - `NoteDetailPage.tsx` - unified text/canvas view with toggle
   - `NoteCanvasToolbar.tsx` - custom FrameLord toolbar
   - `DailyLogView.tsx` - journal-style daily entries
   - `InboxView.tsx` - quick capture notes
   - `FoldersView.tsx` - PARA-style organization
   - Folder model and store
   - Contact mention system with '&' trigger

---

## Phase 1: Unified Note Model

### Goal
Create a single canonical Note type that can store both text and canvas data.

### New Note Type Schema

```typescript
// In types.ts - REPLACE existing Note interface
export interface Note {
  // Core identification
  id: string;
  title: string | null;          // null for untitled notes

  // BlockSuite document (unified storage for text AND canvas)
  blocksuiteDocId: string;       // BlockSuite Doc ID
  blocksuiteSerialized?: any;    // Optional serialized snapshot for backup

  // Timestamps
  createdAt: string;             // ISO timestamp
  updatedAt: string;             // ISO timestamp

  // Authorship (Contact Zero centrality)
  authorContactId: string;       // ALWAYS Contact Zero for user-created notes

  // Contact associations
  targetContactIds: string[];    // Contacts mentioned or attached to this note

  // Note classification
  kind: 'log' | 'note' | 'system';  // log = daily journal, note = general, system = auto-generated
  dateKey: string | null;        // 'YYYY-MM-DD' for log entries, null otherwise

  // Organization
  folderId: string | null;       // PARA folder or custom folder
  isInbox: boolean;              // Quick capture inbox
  topics: string[];              // Topic IDs (from [[Topic]] syntax)
  tags: string[];                // User tags

  // Display preferences
  preferredView: 'doc' | 'canvas';  // Last used view mode
  isPinnedHome: boolean;         // Pin to home (deprecated, keep for migration)
  isPinned: boolean;             // Pin within view

  // Archive
  isArchived: boolean;

  // Legacy fields (for backwards compatibility during migration)
  content?: string;              // OLD plain text content
  entries?: NoteEntry[];         // OLD bullet entries
  attachments?: NoteAttachment[]; // OLD direct attachments
  contactId?: string;            // OLD single contact link
}
```

### Migration Strategy

**Option: Phased Migration with Backwards Compatibility**

1. **Add new fields** to Note type (non-breaking)
2. **Create helper functions** to detect old vs new notes
3. **On note open**: Migrate old content to BlockSuite if needed
4. **Keep old fields** for 2-3 versions, then deprecate

```typescript
// In noteStore.ts
function isLegacyNote(note: Note): boolean {
  return !!note.content && !note.blocksuiteDocId;
}

function migrateLegacyNote(note: Note): Note {
  if (!isLegacyNote(note)) return note;

  // Create BlockSuite doc from old content
  const docId = `note-doc-${note.id}`;
  // ... BlockSuite initialization with note.content

  return {
    ...note,
    blocksuiteDocId: docId,
    kind: note.dateKey ? 'log' : 'note',
    targetContactIds: note.contactId ? [note.contactId] : [],
    folderId: null,
    isInbox: false,
    isArchived: false,
    preferredView: 'doc',
  };
}
```

### Files to Modify

1. **types.ts** - Update Note interface (lines 71-85)
2. **noteStore.ts** - Add migration helpers, update CRUD operations
3. **services/dailyNoteStore.ts** - Deprecate, merge into noteStore

### Acceptance Criteria

- [ ] New Note type compiles without errors
- [ ] Old notes can be read (backwards compatible)
- [ ] Migration function converts old notes to new format
- [ ] noteStore CRUD operations work with new schema

---

## Phase 2: Deprecate Separate Canvas Module

### Goal
Remove the standalone Canvas module and prepare for unified Note-based canvas.

### Steps

1. **Remove Canvas Navigation**
   - `Dashboard.tsx` line 1738: Remove CANVAS NavItem
   - `Dashboard.tsx` line 1956-1958: Remove CANVAS view condition

2. **Archive Canvas Components**
   - Move `components/canvas/FrameCanvasPage.tsx` to `_legacy/`
   - Keep `BlockSuiteEdgelessCanvas.tsx` - will be reused in Note detail

3. **Deprecate canvasStore**
   - Move `stores/canvasStore.ts` to `_legacy/`
   - Document migration path for any existing canvas threads

4. **Migration for Existing Canvas Threads** (optional)
   - If users have canvas threads, convert them to Notes with `preferredView: 'canvas'`
   - Script to migrate CanvasThread → Note

```typescript
// Migration helper
function migrateCanvasThreadToNote(thread: CanvasThread): Note {
  return {
    id: `migrated-canvas-${thread.id}`,
    title: thread.title,
    blocksuiteDocId: `canvas-${thread.id}`,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    authorContactId: CONTACT_ZERO.id,
    targetContactIds: [],
    kind: 'note',
    dateKey: null,
    folderId: null,
    isInbox: false,
    topics: [],
    tags: ['migrated-canvas'],
    preferredView: 'canvas',
    isPinnedHome: false,
    isPinned: false,
    isArchived: false,
  };
}
```

### Files to Modify

1. **Dashboard.tsx** - Remove CANVAS navigation
2. **components/canvas/FrameCanvasPage.tsx** - Move to `_legacy/`
3. **stores/canvasStore.ts** - Move to `_legacy/` (keep for reference)

### Acceptance Criteria

- [ ] App compiles without Canvas navigation
- [ ] No TypeScript errors from removed Canvas route
- [ ] Legacy canvas files moved to `_legacy/` folder

---

## Phase 3: Implement Folder System (PARA)

### Goal
Create a folder model to organize notes with default PARA structure.

### Folder Model

```typescript
// In types.ts
export interface Folder {
  id: string;
  name: string;
  parentId: string | null;  // For nested folders
  createdAt: string;
  updatedAt: string;
  order: number;            // Display order
  color?: string;           // Optional color tag
  icon?: string;            // Optional icon
}

// Default folder IDs (constants)
export const DEFAULT_FOLDERS = {
  PROJECTS: 'folder-projects',
  AREAS: 'folder-areas',
  RESOURCES: 'folder-resources',
  ARCHIVE: 'folder-archive',
} as const;
```

### Folder Store

```typescript
// In services/folderStore.ts (NEW FILE)
let FOLDERS: Folder[] = [
  {
    id: DEFAULT_FOLDERS.PROJECTS,
    name: 'Projects',
    parentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: 1,
  },
  {
    id: DEFAULT_FOLDERS.AREAS,
    name: 'Areas',
    parentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: 2,
  },
  {
    id: DEFAULT_FOLDERS.RESOURCES,
    name: 'Resources',
    parentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: 3,
  },
  {
    id: DEFAULT_FOLDERS.ARCHIVE,
    name: 'Archive',
    parentId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    order: 4,
  },
];

export function getAllFolders(): Folder[] { return [...FOLDERS]; }
export function getFolderById(id: string): Folder | undefined { return FOLDERS.find(f => f.id === id); }
export function getNotesByFolder(folderId: string): Note[] { /* query noteStore */ }
export function createFolder(name: string, parentId?: string): Folder { /* ... */ }
export function updateFolder(id: string, updates: Partial<Folder>): void { /* ... */ }
export function deleteFolder(id: string): void { /* ... */ }
```

### Navigation Updates

In `Dashboard.tsx`, add "Notes" section with subsections:
- Daily Log
- Inbox
- Projects (folder)
- Areas (folder)
- Resources (folder)
- Archive (folder)

### Files to Create

1. **services/folderStore.ts** - Folder CRUD
2. **types.ts** - Add Folder interface + constants

### Files to Modify

1. **Dashboard.tsx** - Add Notes navigation section
2. **noteStore.ts** - Add `getNotesByFolder()` query

### Acceptance Criteria

- [ ] Folder store created with PARA defaults
- [ ] Navigation shows Notes section with folders
- [ ] Can create/update/delete folders
- [ ] Notes can be assigned to folders

---

## Phase 4: Daily Log, Inbox, and Folder Views

### Goal
Implement the three main Notes views: Daily Log, Inbox, and Folders.

### Daily Log View

```typescript
// In components/notes/DailyLogView.tsx (NEW FILE)
export const DailyLogView: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(todayISO());
  const notes = getLogEntriesByDate(selectedDate);  // kind: 'log', dateKey: selectedDate

  return (
    <div>
      <header>
        <DatePicker value={selectedDate} onChange={setSelectedDate} />
        <button onClick={handleCreateLogEntry}>New Entry</button>
      </header>
      <div>
        {notes.map(note => (
          <NoteCard
            key={note.id}
            note={note}
            onClick={() => openNoteDetail(note.id)}
          />
        ))}
      </div>
    </div>
  );
};

function handleCreateLogEntry() {
  const newNote = createNote({
    kind: 'log',
    dateKey: selectedDate,
    preferredView: 'doc',
    isInbox: false,
  });
  openNoteDetail(newNote.id);
}
```

### Inbox View

```typescript
// In components/notes/InboxView.tsx (NEW FILE)
export const InboxView: React.FC = () => {
  const notes = getInboxNotes();  // isInbox: true, isArchived: false

  return (
    <div>
      <header>
        <button onClick={handleQuickCapture}>Quick Capture</button>
      </header>
      <div>
        {notes.map(note => (
          <NoteCard
            key={note.id}
            note={note}
            onFile={(folderId) => fileNote(note.id, folderId)}
            onArchive={() => archiveNote(note.id)}
          />
        ))}
      </div>
    </div>
  );
};

function handleQuickCapture() {
  const newNote = createNote({
    kind: 'note',
    preferredView: 'doc',
    isInbox: true,
  });
  openNoteDetail(newNote.id);
}
```

### Folders View

```typescript
// In components/notes/FoldersView.tsx (NEW FILE)
export const FoldersView: React.FC<{ folderId: string }> = ({ folderId }) => {
  const folder = getFolderById(folderId);
  const notes = getNotesByFolder(folderId);

  return (
    <div>
      <header>
        <h1>{folder?.name}</h1>
        <button onClick={handleCreateNote}>New Note</button>
      </header>
      <div>
        {notes.map(note => (
          <NoteCard
            key={note.id}
            note={note}
            onClick={() => openNoteDetail(note.id)}
          />
        ))}
      </div>
    </div>
  );
};
```

### Navigation Updates

Replace current `'NOTES'` view with routing to:
- `DailyLogView` when "Daily Log" clicked
- `InboxView` when "Inbox" clicked
- `FoldersView` when folder clicked

### Files to Create

1. **components/notes/DailyLogView.tsx**
2. **components/notes/InboxView.tsx**
3. **components/notes/FoldersView.tsx**
4. **components/notes/NoteCard.tsx** - Shared note preview card

### Files to Modify

1. **Dashboard.tsx** - Route to new views
2. **noteStore.ts** - Add query functions:
   - `getLogEntriesByDate(dateKey: string): Note[]`
   - `getInboxNotes(): Note[]`
   - `getNotesByFolder(folderId: string): Note[]`

### Acceptance Criteria

- [ ] Daily Log shows notes for selected date
- [ ] Can create new log entries
- [ ] Inbox shows unfiled notes
- [ ] Can file notes from Inbox to folders
- [ ] Folder views show notes in that folder

---

## Phase 5: Unified Note Detail View with Text/Canvas Toggle

### Goal
Create a single Note detail screen that can toggle between doc and canvas modes.

### Note Detail Page Architecture

```typescript
// In components/notes/NoteDetailPage.tsx (NEW FILE)
export const NoteDetailPage: React.FC<{ noteId: string }> = ({ noteId }) => {
  const note = getNoteById(noteId);
  const [viewMode, setViewMode] = useState<'doc' | 'canvas'>(note.preferredView);

  // Save preference when toggled
  const handleToggleView = (mode: 'doc' | 'canvas') => {
    setViewMode(mode);
    updateNote(noteId, { preferredView: mode });
  };

  const handleScan = async () => {
    if (viewMode === 'doc') {
      // Extract text content from BlockSuite doc
      const textContent = extractTextFromBlockSuite(note.blocksuiteDocId);
      await runFrameScanOnText(noteId, textContent);
    } else {
      // Extract canvas data from BlockSuite
      const canvasData = extractCanvasFromBlockSuite(note.blocksuiteDocId);
      await runFrameScanOnCanvas(noteId, canvasData);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-[#2A2A2A]">
        <input
          value={note.title || 'Untitled'}
          onChange={(e) => updateNote(noteId, { title: e.target.value })}
          className="text-2xl font-bold bg-transparent border-none"
        />

        <div className="flex items-center gap-4">
          {/* Text/Canvas Toggle */}
          <div className="flex items-center gap-1 bg-[#1A1A1D] rounded-lg p-1">
            <button
              onClick={() => handleToggleView('doc')}
              className={viewMode === 'doc' ? 'bg-[#4433FF] text-white' : 'text-gray-500'}
            >
              <FileText size={16} /> Text
            </button>
            <button
              onClick={() => handleToggleView('canvas')}
              className={viewMode === 'canvas' ? 'bg-[#4433FF] text-white' : 'text-gray-500'}
            >
              <LayoutGrid size={16} /> Canvas
            </button>
          </div>

          {/* Scan Button */}
          <button onClick={handleScan} className="btn-primary">
            <Scan size={16} /> Scan
          </button>
        </div>
      </header>

      {/* Editor Area */}
      <div className="flex-1 overflow-hidden">
        {viewMode === 'doc' ? (
          <BlockSuiteDocEditor docId={note.blocksuiteDocId} />
        ) : (
          <BlockSuiteEdgelessCanvas docId={note.blocksuiteDocId} />
        )}
      </div>
    </div>
  );
};
```

### BlockSuite Integration

Reuse existing components but wire to Note model:

```typescript
// In components/notes/BlockSuiteDocEditor.tsx (NEW FILE - wraps existing BlockSuite)
export const BlockSuiteDocEditor: React.FC<{ docId: string }> = ({ docId }) => {
  // Use AffineEditorContainer in page/doc mode
  // Connect to shared BlockSuite DocCollection
  // Render page mode editor
};

// In components/notes/BlockSuiteCanvasEditor.tsx (NEW FILE - wraps BlockSuiteEdgelessCanvas)
export const BlockSuiteCanvasEditor: React.FC<{ docId: string }> = ({ docId }) => {
  // Use AffineEditorContainer in edgeless mode
  // Connect to same BlockSuite DocCollection
  // Render with custom FrameLord toolbar (Phase 6)
};
```

### Files to Create

1. **components/notes/NoteDetailPage.tsx** - Main detail view
2. **components/notes/BlockSuiteDocEditor.tsx** - Text mode wrapper
3. **components/notes/BlockSuiteCanvasEditor.tsx** - Canvas mode wrapper

### Files to Modify

1. **Dashboard.tsx** - Add route for `'NOTE_DETAIL'` view
2. **noteStore.ts** - Add `updateNote()` function
3. **components/canvas/BlockSuiteEdgelessCanvas.tsx** - Make docId-based (not canvasId)

### Acceptance Criteria

- [ ] Can open a note in detail view
- [ ] Can toggle between Text and Canvas modes
- [ ] Both modes operate on same BlockSuite document
- [ ] Preference is saved when toggling
- [ ] Title is editable
- [ ] Scan button is present

---

## Phase 6: Custom Canvas Toolbar (FrameLord Theme)

### Goal
Build a custom canvas toolbar with FrameLord dark theme, NOT Affine's default UI.

### Toolbar Design

Custom toolbar with curated tools:
- Select / Pan
- Text
- Shapes (rectangle, rounded rectangle, circle)
- Connectors / Arrows
- Mind map node
- Image upload (convert to Data URL)

```typescript
// In components/notes/NoteCanvasToolbar.tsx (NEW FILE)
export const NoteCanvasToolbar: React.FC<{
  editorRef: RefObject<AffineEditorContainer>;
}> = ({ editorRef }) => {

  const handleToolSelect = (tool: ToolType) => {
    if (!editorRef.current) return;

    // Use BlockSuite command system to activate tool
    const editor = editorRef.current;
    editor.gfx.tool.setTool(tool);
  };

  const handleImageUpload = async (file: File) => {
    const dataUrl = await fileToDataURL(file);
    // Insert image into canvas
    insertImageIntoCanvas(editorRef.current, dataUrl);
  };

  return (
    <div className="flex items-center gap-2 p-2 bg-[#1A1A1D] border-b border-[#2A2A2A]">
      <ToolButton
        icon={<Mouse size={16} />}
        label="Select"
        active={activeTool === 'select'}
        onClick={() => handleToolSelect('select')}
      />
      <ToolButton
        icon={<Type size={16} />}
        label="Text"
        active={activeTool === 'text'}
        onClick={() => handleToolSelect('text')}
      />
      <ToolButton
        icon={<Square size={16} />}
        label="Rectangle"
        active={activeTool === 'shape-rect'}
        onClick={() => handleToolSelect('shape-rect')}
      />
      {/* ... more tools ... */}

      <div className="ml-auto">
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleImageUpload(e.target.files![0])}
          className="hidden"
          id="image-upload"
        />
        <label htmlFor="image-upload">
          <ImageIcon size={16} /> Upload Image
        </label>
      </div>
    </div>
  );
};
```

### Styling

All components use FrameLord theme:
- Background: `#1A1A1D`, `#0A0A0F`
- Accent: `#4433FF`
- Text: `#e7f3ff`, `#9ca3af`
- Borders: `#2A2A2A`

### Files to Create

1. **components/notes/NoteCanvasToolbar.tsx** - Custom toolbar
2. **components/notes/ToolButton.tsx** - Reusable tool button

### Files to Modify

1. **components/notes/BlockSuiteCanvasEditor.tsx** - Include toolbar
2. **lib/blocksuite/theme.css** - Ensure dark theme applies

### Acceptance Criteria

- [ ] Toolbar renders with FrameLord dark theme
- [ ] Can select tools and draw on canvas
- [ ] NO Affine default white toolbars visible
- [ ] Image upload converts to Data URL

---

## Phase 7: FrameScan Integration with Notes

### Goal
Wire FrameScan to work in both text and canvas modes on notes.

### Text Mode Scan

```typescript
// In lib/frameScan/noteTextScan.ts (NEW FILE)
export async function scanNoteText(
  noteId: string,
  textContent: string
): Promise<FrameScanReport> {
  const note = getNoteById(noteId);

  // Build context
  const context = {
    noteId,
    noteTitle: note.title,
    authorContactId: note.authorContactId,
    targetContactIds: note.targetContactIds,
    textContent,
  };

  // Call existing FrameScan LLM
  const result = await analyzeFrameText(context);

  // Store report
  const report = createFrameScanReport({
    noteId,
    type: 'text',
    result,
  });

  return report;
}
```

### Canvas Mode Scan

```typescript
// In lib/frameScan/noteCanvasScan.ts (NEW FILE)
export async function scanNoteCanvas(
  noteId: string,
  canvasData: any
): Promise<FrameScanReport> {
  const note = getNoteById(noteId);

  // Extract shapes, text, connections from canvas
  const canvasSnapshot = await captureCanvasSnapshot(canvasData);

  // Build context
  const context = {
    noteId,
    noteTitle: note.title,
    canvasSnapshot,
    shapes: extractShapes(canvasData),
    connections: extractConnections(canvasData),
  };

  // Call existing FrameScan image/canvas analyzer
  const result = await analyzeFrameCanvas(context);

  // Store report
  const report = createFrameScanReport({
    noteId,
    type: 'canvas',
    result,
  });

  return report;
}
```

### Report Attachment

Store FrameScan reports linked to notes:

```typescript
// In types.ts - extend FrameScanReport
export interface FrameScanReport {
  id: string;
  noteId: string;           // Link to Note (new field)
  contactId?: string;       // Optional contact link (existing)
  type: 'text' | 'canvas';  // Scan type
  result: FrameAnalysisResult;
  createdAt: string;
}
```

### Files to Create

1. **lib/frameScan/noteTextScan.ts** - Text mode scanning
2. **lib/frameScan/noteCanvasScan.ts** - Canvas mode scanning

### Files to Modify

1. **components/notes/NoteDetailPage.tsx** - Wire scan button
2. **services/frameScanReportStore.ts** - Add `noteId` field
3. **types.ts** - Add `noteId` to FrameScanReport (if missing)

### Acceptance Criteria

- [ ] Can scan note in text mode
- [ ] Can scan note in canvas mode
- [ ] Scan results attached to note
- [ ] Can view scan report from note detail

---

## Phase 8: Contact Mentions with '&' Trigger

### Goal
Implement contact mention system using '&' character with autocomplete.

### Mention Syntax

When user types '&' in editor:
1. Show contact search dropdown
2. On selection, insert contact pill (rendered as '@ContactName')
3. Update `note.targetContactIds` array

### Implementation

```typescript
// In components/notes/ContactMentionPlugin.tsx (NEW FILE - BlockSuite plugin)
export class ContactMentionPlugin {
  // Detect '&' character in editor
  // Show autocomplete dropdown
  // Insert contact reference on selection
  // Update note.targetContactIds
}
```

### Contact Pill Rendering

```jsx
<span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#4433FF]/20 text-[#4433FF] rounded">
  <User size={12} />
  @{contact.fullName}
</span>
```

### Per-Contact Log View

```typescript
// In components/contacts/ContactLogView.tsx (NEW FILE)
export const ContactLogView: React.FC<{ contactId: string }> = ({ contactId }) => {
  // Get all notes where targetContactIds includes contactId
  const notes = getNotesForContact(contactId);

  // Group by dateKey if kind === 'log', otherwise by createdAt
  const grouped = groupNotesByDate(notes);

  return (
    <div>
      {grouped.map(group => (
        <DateSection key={group.date} date={group.date}>
          {group.notes.map(note => (
            <NoteCard key={note.id} note={note} />
          ))}
        </DateSection>
      ))}
    </div>
  );
};
```

### Files to Create

1. **components/notes/ContactMentionPlugin.tsx** - Mention autocomplete
2. **components/contacts/ContactLogView.tsx** - Per-contact log

### Files to Modify

1. **components/notes/BlockSuiteDocEditor.tsx** - Add mention plugin
2. **noteStore.ts** - Add `getNotesForContact(contactId: string)`
3. **components/crm/ContactDossierView.tsx** - Add log tab

### Acceptance Criteria

- [ ] Typing '&' triggers contact search
- [ ] Selecting contact inserts mention
- [ ] `targetContactIds` updated on mention
- [ ] Contact view shows all notes mentioning them
- [ ] Notes grouped by date in contact log

---

## Phase 9: Navigation & Polish

### Goal
Update navigation, clean up routes, and polish UX.

### Navigation Structure

**New Sidebar Menu:**

```
📋 NOTES
  📅 Daily Log
  📥 Inbox
  📁 Projects
  📁 Areas
  📁 Resources
  📁 Archive

👥 CONTACTS
  (existing contacts view)

📊 FRAMESCAN
  (existing FrameScan view)

⚙️ SETTINGS
  (existing settings)
```

### Remove Old Routes

- Remove `'CANVAS'` from Dashboard
- Remove separate canvas navigation item
- Update README/docs to reflect unified Notes system

### Files to Modify

1. **Dashboard.tsx**
   - Update navigation menu
   - Add routes for Daily Log, Inbox, Folders, Note Detail
   - Remove Canvas route

2. **README.md** - Update documentation

### Acceptance Criteria

- [ ] Navigation shows Notes with subsections
- [ ] No separate Canvas section
- [ ] All routes working
- [ ] App compiles without errors

---

## Testing Checklist

After all phases complete:

- [ ] Can create a new note
- [ ] Can toggle note between text and canvas
- [ ] Text mode displays BlockSuite doc editor
- [ ] Canvas mode displays BlockSuite edgeless with custom toolbar
- [ ] Daily Log shows log entries by date
- [ ] Can create daily log entry
- [ ] Inbox shows unfiled notes
- [ ] Can file note from Inbox to folder
- [ ] Folders view shows notes in folder
- [ ] Can scan note in text mode
- [ ] Can scan note in canvas mode
- [ ] Typing '&' triggers contact autocomplete
- [ ] Contact mention updates targetContactIds
- [ ] Contact log view shows notes mentioning contact
- [ ] No Affine default white UI visible
- [ ] All styling uses FrameLord dark theme
- [ ] No TypeScript errors
- [ ] No console errors

---

## Migration Checklist

For existing users with data:

- [ ] Old notes migrate to new Note schema
- [ ] Old canvas threads convert to Notes with preferredView: 'canvas'
- [ ] DailyNote entries convert to Notes with kind: 'log'
- [ ] All contactId fields map to targetContactIds
- [ ] Topic links preserved in migration
- [ ] Note backlinks preserved

---

## Dependencies & Risks

### External Dependencies
- BlockSuite 0.19.5 (already installed)
- React 18
- FramerMotion (for animations)

### Risks

1. **BlockSuite document migration** - Complex data transformation
   - Mitigation: Phased migration with fallback to old format

2. **User data loss** - Existing notes/canvas
   - Mitigation: Keep old fields, test migration extensively

3. **Performance** - BlockSuite in every note
   - Mitigation: Lazy load editors, only initialize when needed

4. **Scope creep** - Feature requests during refactor
   - Mitigation: Stick to plan, defer enhancements

---

## Implementation Order

**Recommended execution sequence:**

1. Phase 1: Unified Note Model (foundation)
2. Phase 2: Deprecate Canvas (clean up)
3. Phase 3: Folder System (organization)
4. Phase 4: Views (Daily Log, Inbox, Folders)
5. Phase 5: Note Detail with Toggle (core feature)
6. Phase 6: Custom Toolbar (UX polish)
7. Phase 7: FrameScan Integration (feature parity)
8. Phase 8: Contact Mentions (enhancement)
9. Phase 9: Navigation & Polish (final cleanup)

Each phase can be committed incrementally to keep app functional.

---

## Success Criteria

Refactor is complete when:

1. **No separate Canvas module** - All canvas is Note-based
2. **Unified Note detail** - Text/Canvas toggle works
3. **Daily Log works** - Can create and view log entries
4. **Inbox works** - Quick capture and filing
5. **PARA folders work** - Can organize notes
6. **FrameScan works** - In both text and canvas modes
7. **Contact mentions work** - '&' trigger and autocomplete
8. **Custom UI only** - No Affine/BaseCube default UI
9. **Zero TypeScript errors**
10. **All existing features preserved**

---

**END OF PLAN**
