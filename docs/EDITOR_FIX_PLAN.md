# Notes & Canvas Editor Fix Plan

**Date:** 2025-12-05
**Status:** READY FOR REVIEW

---

## Problems Identified

### 1. Text Editor Looks Outdated ("from the 80s")
- Current styling is too dark/harsh
- Doesn't look like a modern document editor (Notion, Google Docs, etc.)
- Missing visual polish that makes it feel like a real text editor

### 2. Canvas Toolbar is Too Complex
- Current `NoteCanvasToolbar.tsx` has 10+ tools grouped in sections
- Too many items overwhelms the user
- Should be simplified to essential tools only

### 3. No Light/Dark Mode Toggle
- Users can't switch to a light theme for reading
- Some users prefer light mode for text editing
- Need a theme preference system

---

## Solution Overview

### Phase 1: Add Theme System (Light/Dark Mode)

**Goal:** Allow users to toggle between light and dark themes for the editor.

**Changes:**

1. **Update `userSettings.ts`** — Add `editorTheme` preference
   ```typescript
   export interface UserSettings {
     // ... existing fields
     editorTheme?: 'light' | 'dark' | 'system';
   }
   ```

2. **Create `lib/blocksuite/themes.ts`** — Define light and dark theme variables
   ```typescript
   export const lightTheme = {
     '--affine-background-primary-color': '#ffffff',
     '--affine-background-secondary-color': '#f8f9fa',
     '--affine-text-primary-color': '#1a1a1a',
     // ... etc
   };

   export const darkTheme = {
     '--affine-background-primary-color': '#18181b',
     // ... current values
   };
   ```

3. **Update `BlockSuiteDocEditor.tsx`** — Accept theme prop and apply appropriate CSS variables

4. **Add theme toggle to `NoteDetailPage.tsx` header** — Sun/Moon icon button

---

### Phase 2: Modernize Text Editor Appearance

**Goal:** Make the text editor look like a modern document editor (clean, minimal, professional).

**Changes:**

1. **Update CSS variables in `theme.css`** for a cleaner look:
   - Increase `--affine-editor-side-padding` for wider margins
   - Use softer shadow values
   - Increase line height slightly for readability
   - Use a cleaner font stack

2. **Remove hint bar from `BlockSuiteDocEditor.tsx`**
   - The current hint bar (`/` for commands, etc.) looks dated
   - Modern editors don't show this — users learn shortcuts naturally

3. **Add subtle page container styling**
   - White/light gray page background for content area
   - Subtle paper-like shadow
   - Centered max-width container (like Notion)

4. **Light theme default colors:**
   ```css
   --affine-background-primary-color: #ffffff;
   --affine-background-secondary-color: #f5f5f5;
   --affine-text-primary-color: #1f2937;
   --affine-text-secondary-color: #6b7280;
   --affine-border-color: #e5e7eb;
   --affine-placeholder-color: #9ca3af;
   ```

---

### Phase 3: Simplify Canvas Toolbar

**Goal:** Reduce canvas toolbar to only essential tools.

**Current tools (10+):**
- Select, Pan
- Pen, Eraser
- Rectangle, Ellipse
- Connector, Line
- Text, Note
- Image upload
- Zoom controls

**Simplified toolbar (6 essential tools):**
1. **Select** — Default cursor
2. **Text** — Add text anywhere
3. **Shape** — Dropdown with rectangle/ellipse
4. **Connector** — Draw arrows/lines
5. **Image** — Upload image
6. **Zoom** — Compact zoom display only

**Changes:**

1. **Rewrite `NoteCanvasToolbar.tsx`** — Minimal version
   - Single row of icons
   - No grouped sections with dividers
   - Compact design
   - Dark theme styling (matches FrameLord, not white)

2. **Remove unused tools:**
   - Pan (users can scroll/drag with mouse)
   - Pen/Eraser (this isn't a drawing app)
   - Line (connector covers this)
   - Note (text covers this)

3. **Floating mini toolbar** instead of full-width bar:
   - Position in bottom-left corner
   - Semi-transparent background
   - Only shows on hover or when canvas is active

---

## File Changes Summary

### Files to Modify

| File | Changes |
|------|---------|
| `lib/settings/userSettings.ts` | Add `editorTheme` setting |
| `lib/blocksuite/theme.css` | Add light theme CSS variables via `.theme-light` class |
| `components/notes/BlockSuiteDocEditor.tsx` | Accept theme prop, remove hint bar, modernize styling |
| `components/notes/BlockSuiteCanvasEditor.tsx` | Use simplified toolbar, apply theme |
| `components/notes/NoteCanvasToolbar.tsx` | Simplify to 6 essential tools, make minimal |
| `components/notes/NoteDetailPage.tsx` | Add theme toggle button in header |

### New Files

| File | Purpose |
|------|---------|
| `lib/blocksuite/themes.ts` | Light and dark theme variable definitions |

---

## Visual Design

### Text Editor (Light Mode)
```
┌──────────────────────────────────────────────────────────────┐
│  ← Back    Untitled Note    [☀️] [Text│Canvas] [Scan]  •••  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│      ┌────────────────────────────────────────────┐          │
│      │                                            │          │
│      │  Start typing...                           │          │
│      │                                            │          │
│      │  • Clean white background                  │          │
│      │  • Comfortable reading width               │          │
│      │  • Modern typography                       │          │
│      │                                            │          │
│      └────────────────────────────────────────────┘          │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Canvas Editor (Dark Mode with Minimal Toolbar)
```
┌──────────────────────────────────────────────────────────────┐
│  ← Back    Untitled Note    [🌙] [Text│Canvas] [Scan]  •••  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · │
│  · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · │
│  · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · │
│  · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · │
│  · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · │
│                                                              │
│  ┌─────────────────────┐                                     │
│  │ ↖ T ▢ ↗ 🖼 │ 100% │    ← Minimal floating toolbar        │
│  └─────────────────────┘                                     │
└──────────────────────────────────────────────────────────────┘
```

---

## Implementation Order

1. **Phase 1: Theme System** (foundation)
   - Add theme setting to userSettings
   - Create themes.ts with light/dark definitions
   - Add toggle to NoteDetailPage header

2. **Phase 2: Modernize Text Editor**
   - Update BlockSuiteDocEditor styling
   - Remove hint bar
   - Apply cleaner CSS variables
   - Test light theme appearance

3. **Phase 3: Simplify Canvas Toolbar**
   - Rewrite NoteCanvasToolbar (minimal version)
   - Position as floating toolbar
   - Ensure dark theme styling (not white)

---

## Acceptance Criteria

- [ ] Theme toggle (☀️/🌙) visible in note header
- [ ] Light mode: White background, dark text, clean look
- [ ] Dark mode: Current dark theme preserved
- [ ] Text editor looks modern (like Notion/Google Docs)
- [ ] No hint bar at top of text editor
- [ ] Canvas toolbar reduced to 6 tools max
- [ ] Canvas toolbar is NOT white (dark theme)
- [ ] Canvas toolbar is floating/minimal, not full-width bar
- [ ] Build passes with no errors
- [ ] Both modes work correctly

---

**END OF PLAN**
