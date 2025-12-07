# Fix: Slash Menu and Bi-Directional Links

**Date:** 2025-12-05

---

## Problem Summary

1. **Slash Menu**: Typing "/" in the BlockSuite editor does not show the command menu
2. **Bi-Directional Links**: The backlinks section always shows 0 links even when notes reference each other

---

## Root Cause Analysis

### Issue 1: Slash Menu Not Working

**Root Cause:** `AffineEditorContainer` has `pageSpecs` and `edgelessSpecs` properties that need to be explicitly set for widgets (including slash menu) to work.

**Evidence from TypeScript definitions** (`node_modules/@blocksuite/presets/dist/editors/editor-container.d.ts`):
```typescript
set pageSpecs(specs: ExtensionType[]);
get pageSpecs(): ExtensionType[];
```

**Current broken code** (`BlockSuiteDocEditor.tsx`):
```typescript
const editor = new AffineEditorContainer();
editor.doc = doc;
editor.mode = 'page';
// MISSING: editor.pageSpecs = PageEditorBlockSpecs;
```

**Why slash menu doesn't work:** `PageEditorBlockSpecs` from `@blocksuite/blocks` includes all widget specs for page mode, including the slash menu widget. Without explicitly setting this, the widgets are not properly initialized.

---

### Issue 2: Bi-Directional Links Not Working

**Root Cause:** `BiDirectionalLinks.tsx` searches for `[[title]]` in `note.content`, but:

1. BlockSuite stores content in its internal block structure, NOT in `note.content`
2. The `note.content` field is never updated when user types in BlockSuite
3. The `onContentChange` prop exists on `BlockSuiteDocEditor` but is never used

**Current flow (broken):**
```
User types [[Some Note]] in BlockSuite
        ↓
BlockSuite stores in block structure
        ↓
note.content stays empty
        ↓
BiDirectionalLinks searches empty note.content
        ↓
Finds nothing → shows 0 backlinks
```

---

## Solution

### Fix 1: Slash Menu

**File:** `components/notes/BlockSuiteDocEditor.tsx`

Add import:
```typescript
import { PageEditorBlockSpecs } from '@blocksuite/blocks';
```

Set pageSpecs before doc:
```typescript
const editor = new AffineEditorContainer();
editor.pageSpecs = PageEditorBlockSpecs;  // <-- ADD THIS
editor.doc = doc;
editor.mode = 'page';
```

---

### Fix 2: Bi-Directional Links

**File:** `components/notes/BlockSuiteDocEditor.tsx`

Add helper to extract text from BlockSuite:
```typescript
function extractPlainTextFromDoc(doc: Doc): string {
  let text = '';
  const paragraphs = doc.getBlocksByFlavour('affine:paragraph');
  for (const block of paragraphs) {
    const textContent = (block as any).text?.toString?.() || '';
    if (textContent) text += textContent + '\n';
  }
  return text.trim();
}
```

Add change listener after `doc.whenReady`:
```typescript
doc.slots.blockUpdated.on(() => {
  if (onContentChange) {
    const content = extractPlainTextFromDoc(doc);
    onContentChange(content);
  }
});
```

**File:** `components/notes/AffineNotes.tsx`

Wire `onContentChange`:
```typescript
<BlockSuiteDocEditor
  docId={selectedNote.id}
  theme={theme}
  onContentChange={(content) => {
    updateNote(selectedNote.id, { content: String(content) });
  }}
/>
```

---

## Files to Modify

| File | Change |
|------|--------|
| `components/notes/BlockSuiteDocEditor.tsx` | Add `PageEditorBlockSpecs` import, set `editor.pageSpecs`, add content extraction |
| `components/notes/AffineNotes.tsx` | Wire `onContentChange` to update note content |

---

## Verification

After implementing:

1. **Slash Menu Test:**
   - Open a note
   - Type "/" in the editor
   - Should see popup menu with options like Heading, Bullet List, etc.

2. **Bi-Directional Links Test:**
   - Create Note A with title "Test Note"
   - Create Note B with content including `[[Test Note]]`
   - Open Note A
   - Bi-Directional Links section should show Note B as a backlink

3. **Build Test:**
   - Run `npm run build`
   - Should complete with no errors

---

## References

- [BlockSuite Component Types](https://blocksuite.io/guide/component-types.html)
- [BlockSuite GitHub](https://github.com/toeverything/blocksuite)
- [GitHub Issue #6643](https://github.com/toeverything/blocksuite/issues/6643) - Editor configuration
