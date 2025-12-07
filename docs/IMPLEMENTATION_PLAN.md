# Implementation Plan - Notes Module Bug Fixes

## Overview
Fix 7 critical bugs in the Notes module with 3 parallel agents that work on different files to avoid code conflicts.

---

## Bugs to Fix

| # | Bug | File | Priority |
|---|-----|------|----------|
| 1 | Dark mode toggle on left sidebar (should be removed) | AffineNotes.tsx | HIGH |
| 2 | Journals stuck navigation (can't exit journals view) | AffineNotes.tsx | HIGH |
| 3 | Tags not appearing in Tags view | AffineNotes.tsx | HIGH |
| 4 | Info section broken (visual + functionality) | AffineNotes.tsx | HIGH |
| 5 | Wiki links [[brackets]] - Enter creates new line | BlockSuiteDocEditor.tsx | HIGH |
| 6 | Text highlighting / format bar not working | BlockSuiteDocEditor.tsx + theme.css | HIGH |
| 7 | Edgeless canvas not working | BlockSuiteDocEditor.tsx + theme.css | HIGH |

---

## Agent Division (NO CODE OVERLAP)

### Agent 1: AffineNotes Master
**File:** `components/notes/AffineNotes.tsx` ONLY
**Tasks:**
1. **Remove dark mode toggle** (lines 573-580)
   - Delete the Sun/Moon button from left sidebar header
   - Dark mode should ONLY be in Settings

2. **Fix journals stuck navigation** (lines 610-650)
   - When clicking "All Docs" after being in "Journals", properly reset state
   - Ensure `sidebarView` and `mainTab` are correctly updated together

3. **Fix tags system** (lines 259-263 and tag sections)
   - Tags added to notes should appear in the Tags view
   - Currently document names are being registered as tags incorrectly

4. **Fix Info section** (lines 1843-1960)
   - Visual: Proper spacing, alignment, colors
   - Functionality: All fields should be editable and save correctly

**Known Pitfalls to Avoid:**
- Don't remove imports that are still used elsewhere
- Preserve state management patterns
- Test navigation after each change

---

### Agent 2: BlockSuiteDocEditor Master
**File:** `components/notes/BlockSuiteDocEditor.tsx` ONLY
**Tasks:**
1. **Fix wiki links inline insertion** (lines 534-600)
   - After selecting a note from WikiLinkPopup, insert link INLINE
   - Should NOT create a new line - text should continue on same line
   - Link should be underlined with note icon
   - Update `handleNoteSelect` and `handleNoteCreate` functions

2. **Fix text highlighting / format bar** (lines 160-200 area)
   - Ensure text selection triggers format bar
   - Format bar should appear above selected text
   - Check BlockSuite format bar widget initialization

3. **Improve edgeless mode initialization** (lines 165-180)
   - Ensure `editor.mode = 'edgeless'` is properly set
   - Verify edgeless viewport is created

**Known Pitfalls to Avoid:**
- Don't break the existing page mode functionality
- Preserve DOM management (containerRef vs editorContainerRef separation)
- Don't cause the black screen bug (always set theme/background)

---

### Agent 3: CSS Styling Master
**File:** `lib/blocksuite/theme.css` ONLY
**Tasks:**
1. **Edgeless canvas styling**
   - Grid background with visible dots (32px spacing)
   - Proper viewport height (min-height: 600px)
   - Note block styling in edgeless mode
   - Zoom controls visibility

2. **Format bar visibility**
   - High z-index (999999)
   - Proper positioning (fixed)
   - Ensure visibility above content

3. **General styling fixes**
   - Ensure dark/light theme consistency
   - Fix any shadow DOM styling issues

**Known Pitfalls to Avoid:**
- Use `!important` sparingly but when needed for Shadow DOM
- Don't break page mode styling while fixing edgeless
- Test both light and dark themes

---

## Execution Order

All 3 agents can run **IN PARALLEL** because they work on completely different files:
- Agent 1 → AffineNotes.tsx
- Agent 2 → BlockSuiteDocEditor.tsx
- Agent 3 → theme.css

No file conflicts possible.

---

## Testing Checklist (After All Agents Complete)

### Navigation Tests
- [ ] Click "All Docs" - shows all documents
- [ ] Click "Journals" - shows journals only
- [ ] Click "All Docs" again - properly exits journals view (NOT STUCK)
- [ ] Dark mode toggle is NOT in left sidebar

### Tags Tests
- [ ] Add a tag to a note using "+ Add tag" input
- [ ] Tag appears on the note
- [ ] Navigate to Tags view (sidebar) - tag is listed
- [ ] Click on tag - shows notes with that tag

### Info Section Tests
- [ ] Click "Info" button or accordion - section expands
- [ ] Layout looks correct (proper spacing, alignment)
- [ ] "Created" and "Updated" dates display correctly
- [ ] "Doc type" dropdown works and saves
- [ ] "Folder" dropdown works and saves
- [ ] "View mode" dropdown works and saves
- [ ] "Favorited" toggle works

### Wiki Links Tests
- [ ] Type `[[` in editor - popup appears
- [ ] Search for existing note - results filter
- [ ] Press Enter or click to select - link inserted INLINE
- [ ] Can continue typing on SAME LINE after link
- [ ] Link appears underlined with note icon

### Text Highlighting Tests
- [ ] Select text in editor - format bar appears
- [ ] Format bar positioned correctly (above selection)
- [ ] Bold, italic, underline buttons work
- [ ] Format bar disappears when selection cleared

### Edgeless Canvas Tests
- [ ] Click edgeless mode button - canvas appears
- [ ] Grid background with dots visible
- [ ] Can pan/scroll the canvas
- [ ] Zoom controls visible and functional
- [ ] Note blocks display correctly on canvas
- [ ] Can switch back to page mode

---

## Error Prevention Protocol

Each agent MUST:
1. Read the target file FIRST before any edits
2. Run `npm run build` after ALL changes to verify compilation
3. Check for TypeScript errors
4. Avoid these known issues:
   - Black screen bug (missing theme/background)
   - handleNewPage hoisting error (const before use)
   - DOM removeChild error (React/BlockSuite conflict)
   - container undefined error (wrong variable name)

---

## Success Criteria

Build passes with NO errors and ALL test checklist items pass.
