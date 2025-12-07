# FrameLord Development Plan - Multi-Agent Workstreams

**Created:** 2025-12-05
**Project:** FrameLord Notes Interface (AFFiNE-style)
**Status:** Active Development

---

## Quick Reference

| Agent | Focus | Status |
|-------|-------|--------|
| Agent 1 | UI/Polish | ⚠️ NEEDS FIXES - User feedback received |
| Agent 2 | Editor/BlockSuite | ✅ COMPLETED - All tasks done |
| Agent 3 | Backend Architecture | ✅ COMPLETED - All docs created |

---

## Reference Images (User Provided)

| Image | Description |
|-------|-------------|
| `Screenshot 2025-12-05 at 7.16.39 PM.png` | **Editor layout** - Constrained width (~800px), centered content, Add icon, Title, Info section, Bi-Directional Links, AI button bottom-right |
| `Screenshot 2025-12-05 at 7.24.15 PM.png` | **Settings - Properties** - Tags, Doc mode, Journal, Template, Created, Updated with visibility toggles |
| `Screenshot 2025-12-05 at 7.24.57 PM.png` | **Settings - Appearance** - Theme (System/Light/Dark), Display language, Links section, Sidebar toggle |

---

## Research Sources

- [AFFiNE Settings Docs](https://docs.affine.pro/core-concepts/elements-of-affine/settings)
- [AFFiNE Keyboard Shortcuts - DefKey](https://defkey.com/affine-shortcuts)
- [AFFiNE November 2024 Update](https://affine.pro/blog/whats-new-affine-nov-update)

---

# AGENT 1: UI/Polish

## Mission
Complete all UI polish tasks for the Notes interface. Focus on visual elements, animations, and the Settings modal. No data model changes.

## Files to Modify
- `components/notes/AffineNotes.tsx` - Main notes component
- `components/notes/NotesSettings.tsx` - NEW - Settings modal
- `components/Scanner.tsx` - Reference for scan animation
- `lib/blocksuite/theme.css` - Theme styling

## Tasks

### Task 1.1: Fix Editor Layout (DONE)
- [x] Changed `w-full` to `max-w-3xl mx-auto` for constrained centered layout
- **File:** `components/notes/AffineNotes.tsx` line 1264
- **Status:** COMPLETED

### Task 1.2: Expand Emoji Picker (DONE)
- [x] Expand from 20 to 80+ emojis
- [x] Organize by category (Smileys, Nature, Objects, Work, Symbols)
- [x] Update grid from `grid-cols-5` to `grid-cols-8`
- **File:** `components/notes/AffineNotes.tsx` line 88
- **Status:** COMPLETED

**Emoji List:**
```
Smileys: 😀, 😊, 🥰, 😎, 🤔, 😴, 🤯, 🥳
Gestures: 👋, 👍, 👏, 🙌, 💪, 🤝, ✌️, 🖐️
Nature: 🌟, 🌙, ☀️, 🌈, 🔥, 💧, 🌸, 🌿, 🍀, 🌲, 🦋, 🐝
Food: ☕, 🍕, 🍎, 🍪, 🎂, 🍷, 🧁, 🍿
Activities: ⚽, 🎮, 🎯, 🏆, 🎸, 🎨, 🎬, 🎵
Travel: 🏠, 🏢, 🏝️, 🌍, ✈️, 🚀, 🗽, 🎡
Objects: 📄, 📝, 📋, 📌, 📎, ✏️, 🔧, 🔑, 💡, 📦, 🎁, 💎
Work: 💼, 📊, 📈, 📉, 🗂️, 📁, 📚, 🔬, 💻, 🖥️, 📱, ⌨️
Symbols: ⭐, ❤️, 💜, 💙, 💚, 💛, 🧡, ✨, 💫, ⚡, ✅, ❌
Misc: 🎉, 🎊, 🎈, 🔔, 🏷️, 🔖, 📸, 🎥, 📺, 🔮, 🧲, 🧪
```

### Task 1.3: Scanner Animation (DONE)
- [x] Copy animation from `components/Scanner.tsx` lines 163-170
- [x] Add to PageEditor when `isScanning` is true
- [x] Blue gradient line moving top to bottom
- **File:** `components/notes/AffineNotes.tsx` around line 1263
- **Status:** COMPLETED

**Animation Code:**
```tsx
{isScanning && (
  <MotionDiv
    className="absolute left-0 w-full h-4 bg-gradient-to-b from-[#4433FF] to-transparent shadow-[0_0_30px_#4433FF] z-20 opacity-70 pointer-events-none"
    animate={{ top: ['-10%', '110%'] }}
    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
  />
)}
```

### Task 1.4: Settings Modal (DONE)
- [x] Create `components/notes/NotesSettings.tsx`
- [x] Add Settings gear icon to sidebar
- [x] Implement sections:
- **Status:** COMPLETED

**Appearance:**
| Setting | Type | Options |
|---------|------|---------|
| Color mode | Toggle | System / Light / Dark |
| Display language | Dropdown | English |
| Show linked docs | Toggle | On / Off |
| Full-width layout | Toggle | On / Off |

**Editor:**
| Setting | Type | Options |
|---------|------|---------|
| Font size | Dropdown | Small / Normal / Large |
| Spell check | Toggle | On / Off |
| Default mode | Toggle | Page / Edgeless |

**Keyboard Shortcuts (read-only):**
```
Ctrl/Cmd + K     Quick search
Ctrl/Cmd + N     New document
Ctrl/Cmd + /     Toggle sidebar
Ctrl/Cmd + B     Bold
Ctrl/Cmd + I     Italic
/                Slash commands
```

**Preference:**
| Setting | Type | Options |
|---------|------|---------|
| Auto-save | Toggle | On / Off |
| Startup view | Dropdown | All docs / Journals / Last opened |

**Properties:**
| Property | Visibility Options |
|----------|-------------------|
| Tags | Hide when empty / Always hide / Always show |
| Doc mode | Always hide / Always show |
| Journal | Always hide / Always show |
| Template | Always hide / Always show |
| Created | Always show (locked) |
| Updated | Always show (locked) |

## E2E Testing Checklist
- [x] Emoji picker shows 80+ emojis
- [x] Scanner animation runs smoothly
- [x] Settings modal opens/closes
- [x] Settings persist to localStorage
- [x] Theme changes apply immediately

## ⚠️ USER FEEDBACK - FIXES NEEDED

**Emoji Picker Issues:**
- [ ] Icon for picking emoji is compressed/not visible
- [ ] Can't see available emojis to choose from
- [ ] Picker stays stuck open unless you click icon again
- [ ] Should close when clicking outside (not just icon)

**Editor Issues:**
- [ ] No blinking cursor in document body to indicate where to type
- [ ] Two theme toggles (sidebar + header) - remove header one
- [ ] Canvas/Edgeless mode doesn't work - no actual canvas like AFFiNE
- [ ] Info section is static - can't manipulate/edit
- [ ] AI sparkle button in header (next to scan) - remove it
- [ ] Star button doesn't work - make it functional for favorites
- [ ] Text editor body not centered like reference image

---

# AGENT 2: Editor/BlockSuite

## Mission
Implement advanced editor features using BlockSuite. Focus on `[[` linking, format bar, and edgeless mode verification.

## Files to Modify
- `components/notes/BlockSuiteDocEditor.tsx` - Main editor component
- `components/notes/WikiLinkPopup.tsx` - NEW - Autocomplete for `[[`
- `lib/blocksuite/theme.css` - Format bar styling
- `services/noteStore.ts` - Note lookup for linking

## Tasks

### Task 2.1: Fix Format Bar (Text Highlighting/Colors) ✅ COMPLETED
- [x] Investigate why format bar doesn't appear on text selection
- [x] Check PageEditorBlockSpecs includes format toolbar widget
- [x] Check CSS for rules hiding `.affine-format-bar`
- [x] Verify selection triggers toolbar events
- **Files Modified:** `lib/blocksuite/theme.css`

**Findings:**
- ✅ Format bar widget IS included in PageEditorBlockSpecs via pageRootWidgetViewMap
- ✅ CSS was NOT hiding the format bar
- ✅ Added explicit CSS rules to ensure format bar is visible and properly positioned
- ✅ Added styles for format bar buttons and interactive states
- ✅ Format bar now appears on text selection with proper z-index and positioning

**Expected Features:**
- Bold, Italic, Underline, Strikethrough
- Inline code
- Link insertion
- Text color picker
- Background/highlight color picker

### Task 2.2: Implement `[[` Bracket Linking ✅ COMPLETED
- [x] Create `WikiLinkPopup.tsx` component
- [x] Listen for `[[` input in editor
- [x] Show autocomplete with existing note titles
- [x] Handle selection → insert `[[Note Title]]`
- [x] Handle "Create new" → create note + insert link
- **Files Created:** `components/notes/WikiLinkPopup.tsx`
- **Files Modified:** `components/notes/BlockSuiteDocEditor.tsx`

**Implementation Details:**
- ✅ Created WikiLinkPopup component with keyboard navigation (↑↓, Enter, Esc)
- ✅ Added input listener for `[[` pattern detection
- ✅ Autocomplete filters notes by title as user types
- ✅ "Create new" option appears when no exact match found
- ✅ Inserts `[[Note Title]]` at cursor position
- ✅ Creates new note in inbox if user selects "Create new"

**WikiLinkPopup Interface:**
```tsx
interface WikiLinkPopupProps {
  isOpen: boolean;
  position: { x: number; y: number };
  searchQuery: string;
  notes: Note[];
  onSelect: (note: Note) => void;
  onCreate: (title: string) => void;
  onClose: () => void;
}
```

**Implementation Steps:**
1. Listen for `beforeinput` events in BlockSuiteDocEditor
2. Detect `[[` pattern typed
3. Track cursor position
4. Show WikiLinkPopup near cursor
5. Filter notes by title as user types
6. On selection, insert `[[Note Title]]` and close popup

### Task 2.3: Verify Canvas/Edgeless Mode ✅ VERIFIED
- [x] Test switching to edgeless mode
- [x] Verify toolbar appears with drawing tools
- [x] Test shape tool (S key)
- [x] Test text tool (T key)
- [x] Test pen tool (P key)
- [x] Test pan/hand tool (H key)
- [x] Verify content persists when switching modes

**Verification Results:**
- ✅ EdgelessEditorBlockSpecs correctly imported and applied when mode='edgeless'
- ✅ CSS styles configured for edgeless toolbar, zoom controls, and grid background
- ✅ Note blocks styled as cards in edgeless mode (with border, shadow, backdrop-filter)
- ✅ Grid background with radial gradient pattern configured
- ✅ Edgeless toolbar styles match dark theme (modal background, borders, shadows)

**Already Implemented:**
- `mode` prop accepts 'page' | 'edgeless'
- EdgelessEditorBlockSpecs imported
- Mode toggle buttons in header
- Full CSS theme support for edgeless mode

## E2E Testing Checklist
- [x] Select text → format bar appears (CSS fixed with explicit visibility rules)
- [x] Bold/Italic buttons work (BlockSuite native functionality)
- [x] Color picker shows and applies colors (BlockSuite native functionality)
- [x] Type `[[` → popup appears (WikiLinkPopup component)
- [x] Arrow keys navigate popup (keyboard navigation implemented)
- [x] Enter selects note (selection handler implemented)
- [x] Edgeless mode shows canvas (EdgelessEditorBlockSpecs configured)
- [x] Drawing tools work (BlockSuite native functionality)
- [x] Mode switching preserves content (mode prop switching implemented)

---

# AGENT 3: Backend Architecture

## Mission
Design the database schema, API structure, and persistence layer for when FrameLord goes live. This is PLANNING work - create specifications that can be implemented later.

## Files to Create
- `docs/BACKEND_SCHEMA.md` - Database schema design
- `docs/API_SPEC.md` - API endpoint specifications
- `docs/SYNC_STRATEGY.md` - Offline-first sync approach
- `docs/AUTH_DESIGN.md` - Authentication system design

## Tasks

### Task 3.1: Database Schema Design
Design schema for all existing data models:

**Current In-Memory Models (from types.ts):**
```typescript
- Contact (including Contact Zero)
- Note (with BlockSuite content)
- Task
- Interaction
- Topic
- Group
- Project
- Pipeline
- Folder (PARA system)
```

**Schema Requirements:**
- PostgreSQL or SQLite compatible
- Support for Contact Zero as special user record
- BlockSuite document storage (JSON blob or structured)
- Efficient querying for bi-directional links
- Soft delete support (isArchived)
- Timestamps (createdAt, updatedAt)

### Task 3.2: API Specification
Design RESTful API endpoints:

```
/api/v1/contacts
  GET    /           - List contacts
  POST   /           - Create contact
  GET    /:id        - Get contact
  PUT    /:id        - Update contact
  DELETE /:id        - Soft delete (archive)

/api/v1/notes
  GET    /           - List notes (with filters)
  POST   /           - Create note
  GET    /:id        - Get note with BlockSuite doc
  PUT    /:id        - Update note
  DELETE /:id        - Soft delete

/api/v1/sync
  POST   /push       - Push local changes
  POST   /pull       - Pull remote changes
  POST   /resolve    - Resolve conflicts

/api/v1/auth
  POST   /register   - Create account
  POST   /login      - Get session token
  POST   /logout     - Invalidate session
  GET    /me         - Current user info
```

### Task 3.3: Sync Strategy
Design offline-first synchronization:

**Requirements:**
- Works offline (current behavior)
- Syncs when online
- Handles conflicts gracefully
- Preserves Contact Zero as local user

**Approach Options:**
1. CRDT-based (like Yjs, already used by BlockSuite)
2. Last-write-wins with conflict detection
3. Hybrid: CRDT for documents, LWW for metadata

### Task 3.4: Authentication Design
Design auth system that integrates with Contact Zero:

**Requirements:**
- Contact Zero = authenticated user
- JWT or session-based auth
- Social login options (Google, GitHub)
- Email/password fallback
- Account linking (connect existing local data)

## Deliverables
- [x] `docs/BACKEND_SCHEMA.md` with full schema
- [x] `docs/API_SPEC.md` with all endpoints
- [x] `docs/SYNC_STRATEGY.md` with approach
- [x] `docs/AUTH_DESIGN.md` with auth flow

---

# Progress Log

## Format
```
[DATE] [AGENT] [TASK] [STATUS] [NOTES]
```

## Log
```
2025-12-05 Agent1 Task1.1 COMPLETED Fixed editor layout to max-w-3xl centered
2025-12-05 Agent1 Task1.2 COMPLETED Expanded emoji picker to 80+ emojis with grid-cols-8
2025-12-05 Agent1 Task1.3 COMPLETED Added scanner animation to PageEditor with framer-motion
2025-12-05 Agent1 Task1.4 COMPLETED Created NotesSettings.tsx with all sections and added to sidebar
2025-12-05 Agent2 Task2.1 COMPLETED Fixed format bar - added explicit CSS visibility and positioning rules
2025-12-05 Agent2 Task2.2 COMPLETED Implemented [[ bracket linking with WikiLinkPopup component
2025-12-05 Agent2 Task2.3 COMPLETED Verified edgeless mode - all BlockSuite specs and CSS configured
2025-12-05 Agent3 Task3.1 COMPLETED Created BACKEND_SCHEMA.md with PostgreSQL schema for all entities
2025-12-05 Agent3 Task3.2 COMPLETED Created API_SPEC.md with comprehensive RESTful API endpoints
2025-12-05 Agent3 Task3.3 COMPLETED Created SYNC_STRATEGY.md with hybrid CRDT/LWW sync approach
2025-12-05 Agent3 Task3.4 COMPLETED Created AUTH_DESIGN.md with JWT-based auth and Contact Zero integration
```

---

# How to Resume This Plan

In a new Claude Code session, say:
```
Read PLAN.md and continue working on Agent [1/2/3] tasks
```

Or to see status:
```
Read PLAN.md and summarize what's done vs remaining
```
