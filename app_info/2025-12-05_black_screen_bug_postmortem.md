# Black Screen Bug Postmortem

**Date:** 2025-12-05
**Status:** RESOLVED

---

## Summary

When clicking on a note in the Notes module, the page would go completely black and the editor would not load. This was a critical bug that blocked all note editing functionality.

---

## Root Causes (Multiple Issues)

### Issue 1: JavaScript Hoisting Error (ReferenceError)

**Error:**
```
Uncaught ReferenceError: Cannot access 'handleNewPage' before initialization
    at AffineNotes (AffineNotes.tsx:220:7)
```

**Cause:**
The `handleNewPage` callback was defined at line 333 but referenced in a `useEffect` dependency array at line 220. JavaScript's `const` declarations have a "temporal dead zone" - they cannot be accessed before their definition, even within the same function scope.

**Fix:**
Moved the `handleNewPage` definition from line 333 to line 186 (before the useEffect that uses it).

**File:** `components/notes/AffineNotes.tsx`

---

### Issue 2: React/BlockSuite DOM Conflict (NotFoundError)

**Error:**
```
Uncaught NotFoundError: Failed to execute 'removeChild' on 'Node': The node to be removed is not a child of this node.
```

**Cause:**
React was trying to manage DOM nodes inside the same container that BlockSuite was also manipulating. When the loading overlay was conditionally rendered inside `containerRef`, React's reconciliation conflicted with BlockSuite's DOM additions.

**Fix:**
Created a separate `editorContainerRef` div specifically for BlockSuite that React won't touch. The loading overlay is now a sibling to the editor container, not a child that gets added/removed from the same container BlockSuite uses.

**File:** `components/notes/BlockSuiteDocEditor.tsx`

**Changes:**
1. Added `editorContainerRef` as a new ref
2. Updated useEffect to check both refs
3. Changed `container.appendChild(editor)` to `editorContainer.appendChild(editor)`
4. Restructured JSX to have separate divs for loading overlay and editor

---

### Issue 3: Missing Variable Reference (ReferenceError)

**Error:**
```
ReferenceError: container is not defined
    at initEditor (BlockSuiteDocEditor.tsx:226:10)
```

**Cause:**
When renaming `container` to `editorContainer`, two references were missed:
- Line 226: `(container as any)._slashMenuObserver = slashMenuObserver`
- Line 379: `(container as any)._handlers = {`

**Fix:**
Updated both references to use `editorContainer`.

**File:** `components/notes/BlockSuiteDocEditor.tsx`

---

## Debugging Process

### Parallel Agent Investigation Protocol

When initial fixes didn't work, we deployed multiple agents in parallel to investigate different aspects:

1. **Git History Agent** - Reviewed recent commits
2. **DOM Structure Agent** - Found BlockSuite uses ShadowlessElement (light DOM)
3. **CSS Cascade Agent** - Found `bgColor = 'transparent'` issue
4. **Container Hierarchy Agent** - Mapped 10-level DOM hierarchy

### First Principles Investigation (Round 2)

When the above didn't solve the issue, agents investigated from first principles:

1. **Click-to-render Path Agent** - Found `getNoteById()` returns undefined silently
2. **Editor Mounting Agent** - **CRITICAL** - Found `doc.load()` callback had NO error handling
3. **Overlay Agent** - Found multiple `fixed inset-0 z-40` overlays
4. **HTML/CSS Structure Agent** - Confirmed structure was correct
5. **Data Flow Agent** - Found `blocksuiteDocId` never persisted

### Debug Logging Added

Added console.log statements at key points:
- `[AffineNotes] selectedPageId:` - Tracks which page is selected
- `[AffineNotes] selectedPage found:` - Confirms page was found in store
- `[PageEditor] Rendering for page:` - Confirms PageEditor component renders
- `[BlockSuiteDocEditor] useEffect running, refs:` - Confirms refs are available
- `[BlockSuiteDocEditor] Initializing for doc:` - Tracks initialization

---

## Key Lessons Learned

1. **JavaScript hoisting matters** - `const` declarations in React components must be ordered correctly. Callbacks used in `useEffect` dependency arrays must be defined before that `useEffect`.

2. **React + Web Components require careful DOM management** - When integrating web components (like BlockSuite's `affine-editor-container`) with React, use a dedicated ref/container that React doesn't try to reconcile.

3. **Always rename variables completely** - When refactoring variable names, search for ALL references including those cast to `any`.

4. **Add error handling to async callbacks** - The `doc.load()` callback was swallowing errors silently. Always add try/catch and logging.

5. **Debug logging is essential** - Adding strategic console.log statements at key points in the render/effect chain quickly identifies where the flow breaks.

---

## Files Changed

| File | Changes |
|------|---------|
| `components/notes/AffineNotes.tsx` | Moved `handleNewPage` definition before useEffect, added debug logging |
| `components/notes/BlockSuiteDocEditor.tsx` | Added `editorContainerRef`, fixed DOM structure, renamed `container` references, added error handling |

---

## Prevention

1. Use ESLint rules for React hooks dependencies
2. Keep callback definitions close to their usage
3. Use dedicated containers for web component integration
4. Add comprehensive error boundaries and logging
5. Document integration patterns for BlockSuite + React

