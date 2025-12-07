# Feature Summary

Short bullet summaries of completed feature work.

---

## 2025-12-07

### Repo Organization
- Created `docs/` folder for plan/summary markdown files
- Created `debug_assets/` folder for test images and gifs
- Moved 21 markdown files from root to `docs/`
- Moved 8 image/video files from root to `debug_assets/`

### src/ Directory Structure
- Created `src/` folder with standard app code organization
- Moved: `App.tsx`, `index.tsx`, `types.ts`, `api/`, `components/`, `hooks/`, `lib/`, `pages/`, `services/`, `stores/`, `styles/`, `types/`, `config/`, `test/`, `__tests__/`
- Updated `tsconfig.json`: `baseUrl: "."`, paths `"@/*": ["./src/*"]`
- Updated `vite.config.ts`: alias `'@'` points to `./src`
- Updated `index.html`: entry point `/src/index.tsx`

### BlockSuite Editor: Remove Default Bullet
- Removed auto-creation of `affine:paragraph` blocks in `BlockSuiteDocEditor.tsx`
- New notes now start with completely blank canvas (no ghost bullet)
- Added CSS in `theme.css` to hide drag handles, block hub, placeholder indicators
- Bullets only appear when user explicitly creates a list via slash menu

### BlockSuite Editor: Doc/Edgeless Mode Toggle (In Progress)
- Identified existing Affine-style toggle structure in `PageEditor` component
- Header has Doc (FileText) and Edgeless (GitBranch) toggle buttons
- Fixed bug: removed `mode` from initialization effect dependency array
- Mode switching now uses separate effect that re-creates editor with same doc
- Added `xywh: '[0, 0, 800, 600]'` property to `affine:note` blocks for edgeless positioning
- Added debug logging for mode switch verification
- Added viewport centering after edgeless switch (setCenter + setZoom)
- Added framer-motion animation wrapper for mode transitions
- **Implementation**:
  - `BlockSuiteDocEditor.tsx`: Mode switch effect creates new AffineEditorContainer with same doc
  - `AffineNotes.tsx`: `handleModeSwitch` callback with animated transition
  - Document structure: `affine:page` > [`affine:surface`, `affine:note`]
- **Status**: Testing - note card should appear on edgeless canvas

---

### Documentation Setup
- Ensured `docs/` folder exists with documentation files
- Ensured `docs/features/` folder exists for feature summaries
- Created `docs/PROJECT_CONTEXT.md` with:
  - High-level app description
  - Root and src/ folder structure
  - Module descriptions (api, components, lib, services, etc.)
  - Development commands (dev, build, test)
  - Key dependencies and architecture principles

---

### BlockSuite Removal & Markdown Notes Migration

**Why**: BlockSuite was unstable - slash menu issues, cursor visibility problems, complex Shadow DOM styling, and edgeless/canvas mode was not production-ready for v1.

**What was removed**:
- All 4 `@blocksuite/*` packages from dependencies
- 14 BlockSuite/Affine component files moved to `_legacy/blocksuite/`
- Edgeless/Canvas mode toggle removed from notes UI
- "Frames" tab removed from right sidebar (was for edgeless presentations)
- BlockSuite-specific Vite plugins removed from build config

**What was added**:
- `MarkdownNoteEditor.tsx` - Clean Tiptap-based rich text editor with:
  - Bold, italic, strikethrough, highlight formatting
  - Headings (H1, H2, H3)
  - Bullet lists, numbered lists, task lists with checkboxes
  - Code blocks and blockquotes
  - Links
  - Undo/Redo
  - Theme-aware styling (light/gray/dark modes)
  - Auto-save on content change

**Files moved to `_legacy/blocksuite/`**:
- `lib/`: init.ts, manager.ts, themes.ts, theme.css
- `components/canvas/`: 8 Affine/BlockSuite editor files
- `components/notes/`: BlockSuiteDocEditor, BlockSuiteCanvasEditor
- `components/debug/`: BlockSuiteSlashTest

**Result**: Notes now use a stable, lightweight Tiptap editor. No canvas/edgeless mode in v1.
