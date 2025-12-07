# Notes Module - 7 Issues Fix Plan

**Date:** 2025-12-06
**Status:** In Progress

---

## Issues to Fix

### Issue 1: Cursor Not Blinking
**Problem:** User doesn't see where to type when opening a note
**Solution:**
- Ensure `editor.focus()` is called after initialization
- Add visible caret styling with `caret-color: white` for dark modes
- Add blinking animation if needed

**Files:** BlockSuiteDocEditor.tsx (focus logic), theme.css (caret styling)

---

### Issue 2: Need 3 Theme Modes (White/Gray/Black)
**Problem:** Only 2 modes exist (light/dark), user wants gray option like AFFiNE screenshot
**Solution:**
- Add `grayTheme` to themes.ts with colors:
  - Background: `#1f1f23` (dark gray)
  - Text: `#fafafa`
  - Borders: `#27272a`
- Update theme type to `'light' | 'gray' | 'dark'`
- Update NotesSettings.tsx theme picker to show 3 options
- Update AffineNotes.tsx theme handling

**Files:** themes.ts, NotesSettings.tsx, AffineNotes.tsx, theme.css

---

### Issue 3: Placeholder Text in All Modes
**Problem:** "Type '/' for commands..." should be styled correctly in all modes
**Solution:**
- Add CSS for `::placeholder` in light, gray, and dark modes
- Ensure contrast is readable in all themes

**Files:** theme.css

---

### Issue 4: Format Bar Not Appearing on Text Selection
**Problem:** When highlighting text, popup menu should appear with formatting options
**Solution:**
- Verify FormatBarWidget is in specs
- Check z-index (should be high)
- Ensure CSS visibility and position are correct
- May need to add format bar to specs if missing

**Files:** theme.css, BlockSuiteDocEditor.tsx (specs)

---

### Issue 5: Text Color Blue Instead of White
**Problem:** Text appears blue (#0043ff) in dark mode instead of white
**Solution:**
- Check `--affine-text-primary-color` is set to white
- Ensure link color doesn't bleed into regular text
- Separate link styling from text styling

**Files:** themes.ts, theme.css

---

### Issue 6: Wiki Link Drops to New Line
**Problem:** Creating [[wiki link]] causes text to drop to new line instead of staying inline
**Solution:**
- Check `insertLinkedNode` configuration
- Ensure inline insertion mode
- May need to adjust linkedWidget config

**Files:** BlockSuiteDocEditor.tsx

---

### Issue 7: Wiki Link Menu Position Inconsistent
**Problem:** Menu sometimes pops up, sometimes down - not intuitive
**Solution:**
- Set consistent positioning logic
- Calculate available space above/below cursor
- Default to below cursor, flip to above if near bottom of viewport
- Use CSS `position: fixed` with calculated coordinates

**Files:** theme.css, BlockSuiteDocEditor.tsx

---

## Agent Assignments

### Agent A: Theme System (Issue 2)
**Files to modify:**
- lib/blocksuite/themes.ts - Add grayTheme
- components/notes/NotesSettings.tsx - Update theme picker UI
- components/notes/AffineNotes.tsx - Handle 3 themes

**No conflicts with other agents**

---

### Agent B: Cursor & Placeholder (Issues 1, 3)
**Files to modify:**
- lib/blocksuite/theme.css - Caret styling, placeholder styling
- components/notes/BlockSuiteDocEditor.tsx - Focus logic (lines 650-670 only)

**No conflicts - works in different sections than Agent D**

---

### Agent C: Format Bar & Text Color (Issues 4, 5)
**Files to modify:**
- lib/blocksuite/theme.css - Format bar z-index, visibility (lines 708-821)
- lib/blocksuite/themes.ts - Text color fixes (only color values)

**No conflicts - format bar CSS separate from cursor/wiki CSS**

---

### Agent D: Wiki Link Issues (Issues 6, 7)
**Files to modify:**
- components/notes/BlockSuiteDocEditor.tsx - linkedWidget config (lines 29-265)
- lib/blocksuite/theme.css - Popover positioning (lines 1205-1255)

**No conflicts - works in linkedWidget section, not focus section**

---

## Execution Order

1. All 4 agents can run in parallel (no file conflicts)
2. After all complete, run TypeScript check
3. Manual testing of all 7 issues

---

## Success Criteria

- [ ] Cursor blinks visibly in empty notes
- [ ] 3 theme options available (White, Gray, Black)
- [ ] Placeholder text visible and styled in all modes
- [ ] Format bar appears on text selection
- [ ] Text is white (not blue) in dark modes
- [ ] Wiki links stay inline (no line breaks)
- [ ] Wiki link menu appears consistently below cursor (or above if near bottom)
