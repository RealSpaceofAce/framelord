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

---

### [[Wikilinks]], Backlinks, and CRM-Aware Mentions

**Why**: Notes need to link to other notes, contacts, and topics to form a connected knowledge graph.

**Features implemented**:

1. **[[Wikilink]] Trigger**
   - Type `[[` to open note search popup
   - Search existing notes by title
   - Select to insert link, or create new note if not found
   - Links render in normal text color (not blue) to avoid visual noise

2. **@Contact Mentions**
   - Type `@` to search and mention contacts from CRM
   - Creates bidirectional link: note stores `mentionedContactIds`, contact stores `linkedNoteIds`
   - Clicking mention navigates to contact dossier

3. **#Topic Hashtags**
   - Type `#` to search and insert topic tags
   - Creates link to topic in topicStore
   - Bidirectional sync between notes and topics

4. **Backlinks Section**
   - `Backlinks.tsx` component at bottom of note editor
   - Shows all notes that link TO the current note
   - Click to navigate directly to linking note

5. **Forward Link Creation**
   - When inserting `[[New Note Title]]` that doesn't exist, creates new note automatically
   - New note placed in Inbox folder by default

6. **Click-to-Navigate Routing**
   - Clicking any wikilink navigates to that note in the editor
   - Uses existing `setSelectedNoteId()` for seamless navigation

**Files added**:
- `extensions/WikiLink.ts` - Tiptap extension for `[[` trigger detection
- `extensions/WikiLinkNode.tsx` - Renders wikilink as inline node
- `extensions/ContactMentionNode.tsx` - Renders @mention as inline node
- `extensions/TopicMentionNode.tsx` - Renders #hashtag as inline node
- `WikiLinkSuggestion.tsx` - Popup for searching/selecting notes
- `ContactMentionSuggestion.tsx` - Popup for searching contacts
- `TopicMentionSuggestion.tsx` - Popup for searching topics
- `Backlinks.tsx` - Displays incoming links to current note
- `BiDirectionalLinks.tsx` - Utility component for link management

**Store additions**:
- `contactStore.ts`: `addNoteMentionToContact()`, `removeNoteMentionFromContact()`, `getContactsByMention()`
- `noteStore.ts`: `addMentionToNote()`, `removeMentionFromNote()`, `getNotesLinkingTo()`
- `topicStore.ts`: `getTopicsByNote()`, `addNoteToTopic()`

---

### FrameScan Sidebar Skin

**Why**: Unify the visual aesthetic across all panels with the FrameScan "machine" look.

**Components skinned**:
1. **Notes Sidebar** (`FrameLordNotesSidebarSkin.tsx/.css`)
   - Navy-black gradient background
   - Subtle blue grid overlay (20px squares)
   - Full-perimeter neon glow border
   - Pure white text (#FFFFFF)

2. **Main App Sidebar** (`AppSidebarSkin.css`)
   - Black header zone (logo + Overview) - no grid/particles
   - Blue content zone with grid and particles
   - Exact FrameScan colors from theme.css

3. **Right Panel / Clock Panel** (`RetroClockPanel.tsx`)
   - Added `right-panel-framelord` class
   - TV static noise effect preserved
   - Neon border glow

4. **Floating Particles** (`SidebarParticles.tsx`)
   - Canvas-based particle system
   - 20 particles, 1-2px size
   - Slow drift with random direction changes
   - Only renders in blue content zones

**CSS Variables** (from FrameScan):
- `--fl-black: #000000`
- `--fl-blue: #0043ff`
- Grid lines: `rgba(0, 67, 255, 0.02)`
- Border glow: `rgba(0, 67, 255, 0.15)`

**Bug fixes**:
- Fixed highlight bug where all nav items showed blue (selector was too broad)
- Fixed RetroClockPanel layout regression (restored original structure)
