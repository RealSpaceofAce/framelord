# Project Context

## Overview

FrameLord is an AI-powered authority diagnostics platform and local-first CRM OS built with React 19, TypeScript, and Vite. The platform helps users identify and fix weaknesses in their communication through AI-driven "FrameScan" analysis.

The application features:
- **Customer-facing site**: Landing page, coaching application flows, beta program management
- **CRM OS Dashboard**: Full-featured contact management, notes (Tiptap markdown editor with [[wikilinks]], @mentions, #hashtags, and backlinks), tasks, calendar, pipelines, and AI frame analysis

All data is stored in-memory with service-based stores as the single source of truth. There is no backend - the application runs entirely client-side.

---

## Folder Structure

### Root Directory

```
FrameLord/
├── src/              # Application source code
├── docs/             # Documentation and plans
├── debug_assets/     # Test images, gifs, screenshots
├── public/           # Static assets
├── app_info/         # Implementation logs and app state docs
├── _legacy/          # Deprecated code (archived)
├── _inbox/           # Incoming files (temp)
├── node_modules/     # Dependencies
├── dist/             # Build output
├── .git/             # Git repository
├── index.html        # HTML entry point
├── package.json      # Project config and dependencies
├── tsconfig.json     # TypeScript configuration
├── vite.config.ts    # Vite build configuration
├── vitest.config.ts  # Vitest test configuration
├── CLAUDE.md         # AI agent instructions
└── README.md         # Project readme
```

### Source Directory (src/)

```
src/
├── App.tsx           # Main router - controls views (landing, dashboard, etc.)
├── index.tsx         # React entry point - mounts App to DOM
├── types.ts          # Core TypeScript type definitions
├── api/              # External API integrations
├── components/       # React components organized by domain
│   ├── notes/        # Notes UI (AffineNotes, MarkdownNoteEditor)
│   ├── crm/          # CRM dashboard views
│   ├── ui/           # Shared UI components (TabNavigation, etc.)
│   ├── littleLord/   # AI assistant components
│   └── ...           # Feature-specific components
├── config/           # App configuration and feature flags
├── hooks/            # React custom hooks
├── lib/              # Core utilities
│   ├── llm/          # LLM service integrations (Gemini, etc.)
│   ├── frameScan/    # Frame analysis logic
│   └── canvas/       # Canvas/drawing utilities
├── pages/            # Page-level components
├── services/         # Data stores (single source of truth)
│   ├── contactStore  # Contact CRUD, Contact Zero
│   ├── noteStore     # Notes with PARA folders
│   ├── taskStore     # Tasks with contact attachment
│   └── ...           # Other domain stores
├── stores/           # Application state stores
├── styles/           # Global styles
├── test/             # Test utilities
├── __tests__/        # Test files
└── types/            # Additional TypeScript types
```

---

## Module Descriptions

### `src/api/`
External API integrations for AI services and third-party tools.

### `src/components/`
React components organized by feature domain. Key subdirectories:
- **notes/**: Note editors and UI (AffineNotes container, MarkdownNoteEditor with Tiptap)
  - Supports [[wikilinks]] to other notes (auto-creates if not found)
  - Supports @mentions linking to contacts in CRM
  - Supports #hashtags linking to topics
  - Backlinks section shows all notes linking to current note
  - No canvas/BlockSuite integration in v1
- **crm/**: Dashboard views for contacts, pipelines, projects
- **ui/**: Shared UI components like TabNavigation
- **littleLord/**: AI assistant "Little Lord" components

### `src/config/`
Application configuration including feature flags managed via `appConfig`.

### `src/hooks/`
Custom React hooks for shared logic.

### `src/lib/`
Core utilities and integrations:
- **llm/**: LLM service wrappers (Google Gemini, etc.)
- **frameScan/**: FrameScan analysis logic
- **canvas/**: Canvas and drawing utilities

### `src/pages/`
Page-level components for routing.

### `src/services/`
**The single source of truth.** In-memory stores with CRUD operations:
- `contactStore`: Contact management, Contact Zero
- `noteStore`: Notes with PARA folders
- `taskStore`: Tasks with due dates driving calendar
- `interactionStore`: Communication logs
- `topicStore`: Topic graph and linking
- `groupStore`, `projectStore`, `pipelineStore`, `folderStore`, `tenantStore`

### `src/stores/`
Application state stores for UI state and cross-component state.

### `src/styles/`
Global CSS styles and design tokens.

---

## Development Commands

### Start Development Server
```bash
npm run dev
```
Starts the Vite dev server at http://localhost:3001

### Build for Production
```bash
npm run build
```
Creates optimized production build in `dist/`

### Run Tests
```bash
npm run test        # Watch mode
npm run test:run    # Single run
npm run test:coverage  # With coverage
```

### Preview Production Build
```bash
npm run preview
```

---

## Key Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| React | 19.2.0 | UI framework |
| TypeScript | 5.8.2 | Type safety |
| Vite | 6.2.0 | Build tool |
| Tiptap | 3.12.1 | Rich text editing (notes) |
| Framer Motion | 12.23.25 | Animations |
| Lucide React | 0.555.0 | Icons |
| Yjs | 13.6.27 | CRDT sync |

---

## Architecture Principles

1. **Contact Spine**: Every entity attaches to a Contact. Contact Zero is the user.
2. **Single Source of Truth**: Services/stores are authoritative - never bypass them.
3. **No Backend**: All data is in-memory, no server calls.
4. **Data URLs**: Attachments stored as Data URLs, no external file storage.
5. **PARA Organization**: Notes use Inbox, Projects, Areas, Resources, Archive folders.
