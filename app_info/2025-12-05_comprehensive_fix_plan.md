# Comprehensive Notes Module Fix Plan

**Date:** 2025-12-05
**Status:** IN PROGRESS

---

## Previous Agent Work Assessment

### What Was Supposed to Happen
The original plan assigned 5 agents:
- **Agent 1**: CSS + UI Fixes
- **Agent 2**: Button Wiring + Features
- **Agent 3**: Canvas/Edgeless Implementation
- **Agent 4**: Testing + Store Enhancements
- **Agent 5**: Advanced Features

### What Actually Got Done
- **Agent 4** completed work (documented in AGENT4_SUMMARY.md):
  - TDD setup with Vitest
  - 53 tests for noteStore (48 passing)
  - sync_version tracking
  - Bulk operations (bulkCreate, bulkUpdate, bulkDelete)
  - Export/import functions

- **Other agents** - Work unclear or not completed. The black screen bug blocked testing.

---

## ALL BROKEN FEATURES TO FIX

### Category 1: Editor Layout & Alignment
| Feature | Current State | Expected State | Priority |
|---------|--------------|----------------|----------|
| Text left alignment | Cursor indentation issue | Clean left margin like AFFiNE | HIGH |
| Editor padding | Inconsistent | Match AFFiNE spacing | HIGH |

### Category 2: Info Section
| Feature | Current State | Expected State | Priority |
|---------|--------------|----------------|----------|
| Editable fields | Read-only display | Click to edit inline | HIGH |
| Date picker | Not working | Calendar popup | MEDIUM |
| Tag editing | Limited | Full tag management | MEDIUM |

### Category 3: Canvas/Edgeless Mode
| Feature | Current State | Expected State | Priority |
|---------|--------------|----------------|----------|
| Canvas rendering | Shows placeholder text | Full canvas with surface | CRITICAL |
| Drawing tools | Not functional | Selection, shapes, text, connectors | CRITICAL |
| Zoom/pan | Not implemented | Mouse wheel zoom, drag pan | HIGH |
| Tool switching | Not working | Click toolbar to change tools | HIGH |

### Category 4: Folder System
| Feature | Current State | Expected State | Priority |
|---------|--------------|----------------|----------|
| Subfolder creation | Shows "Coming soon" alert | Create nested folders | HIGH |
| Move to folder | Not working | Drag-drop or menu option | HIGH |

### Category 5: Collections
| Feature | Current State | Expected State | Priority |
|---------|--------------|----------------|----------|
| Collection naming | Can't name/rename | Editable name on create | HIGH |
| Collection colors | Not configurable | Color picker | MEDIUM |

### Category 6: Star/Favorite
| Feature | Current State | Expected State | Priority |
|---------|--------------|----------------|----------|
| Star toggle | Not working | Toggle favorite status | HIGH |
| Favorites filter | Not filtering | Show only starred notes | MEDIUM |

### Category 7: Little Lord Integration
| Feature | Current State | Expected State | Priority |
|---------|--------------|----------------|----------|
| Insert to editor | Logs TODO | Insert AI text at cursor | HIGH |
| Copy window | Not working | Copy AI response to clipboard | HIGH |
| Save to dock | Not working | Save response for later | MEDIUM |
| Add to edgeless | Not working | Create text element on canvas | MEDIUM |

### Category 8: Templates
| Feature | Current State | Expected State | Priority |
|---------|--------------|----------------|----------|
| Template picker | Not implemented | Modal with template options | HIGH |
| Apply template | Not working | Populate note with template | HIGH |

---

## AGENT ASSIGNMENTS (Revised)

### Agent A: Editor Alignment & Info Section
**Scope:** Fix CSS/layout issues and make Info section editable

**Tasks:**
1. Fix editor text left-alignment (remove cursor indentation)
2. Match AFFiNE padding/margins for editor content
3. Make Info section fields editable inline
4. Add date picker for date fields
5. Fix tag editing functionality

**Files:**
- `lib/blocksuite/theme.css`
- `components/notes/AffineNotes.tsx` (PageEditor section)

**Test Criteria:**
- Text starts at consistent left margin
- Info fields can be clicked and edited
- Changes persist

---

### Agent B: Star, Collections, Folders
**Scope:** Wire up star button, fix collections, enable subfolders

**Tasks:**
1. Wire star/favorite toggle button
2. Implement collection naming/renaming
3. Enable subfolder creation
4. Implement move-to-folder functionality

**Files:**
- `components/notes/AffineNotes.tsx`
- `services/noteStore.ts` (if folder hierarchy needed)

**Test Criteria:**
- Star button toggles and persists
- Collections can be named on create
- Subfolders can be created
- Notes can be moved between folders

---

### Agent C: Canvas/Edgeless Implementation
**Scope:** Full canvas mode with drawing tools

**Tasks:**
1. Remove placeholder, render actual BlockSuite surface
2. Implement tool switching (select, shape, text, connector)
3. Add zoom/pan controls
4. Create shape/text elements on canvas
5. Test mode switching (page <-> edgeless)

**Files:**
- `components/notes/BlockSuiteDocEditor.tsx`
- `components/notes/BlockSuiteCanvasEditor.tsx`
- May need new `NoteCanvasToolbar.tsx`

**Reference:** Study official AFFiNE edgeless implementation

**Test Criteria:**
- Canvas renders with surface
- Tools switch correctly
- Shapes/text can be created
- Zoom/pan works

---

### Agent D: Little Lord Integration & Templates
**Scope:** Wire up Little Lord buttons, implement templates

**Tasks:**
1. Implement "Insert to editor" - insert AI text at cursor position
2. Implement "Copy" - copy AI response to clipboard
3. Implement "Save to dock" functionality
4. Implement "Add to edgeless canvas"
5. Build template picker modal
6. Apply templates to new notes

**Files:**
- `components/notes/RightSidebarTabs/AITab.tsx`
- `components/notes/AffineNotes.tsx`
- New: `components/notes/TemplatePickerModal.tsx`

**Test Criteria:**
- Insert adds text to editor
- Copy puts text in clipboard
- Templates can be selected and applied

---

## COORDINATION RULES

To prevent agents from conflicting:

1. **File Ownership:** Each agent owns specific files. No cross-editing.
2. **Interface Contracts:** Agents agree on callback signatures before starting.
3. **Sequential Deployment:** Deploy agents one at a time, verify no regressions.
4. **Build Verification:** Each agent must pass `npm run build` before completing.

---

## TESTING PROTOCOL

### Round 1: Unit Tests
- Run `npm test` after each agent completes
- All existing tests must pass
- New tests for new functionality

### Round 2: Integration Test
- Manual testing of all features
- Document pass/fail for each feature
- Fix any failures

### Round 3: Regression Test
- Full manual walkthrough
- Test feature combinations
- Verify no new bugs introduced

### Final Report Format
```
| Feature | Agent | Round 1 | Round 2 | Round 3 | Status |
|---------|-------|---------|---------|---------|--------|
| Text alignment | A | PASS | PASS | PASS | DONE |
```

---

## SUCCESS CRITERIA

All features in the table above must:
1. Work as expected
2. Pass 3 rounds of testing
3. Not break existing functionality
4. Have documentation updated

