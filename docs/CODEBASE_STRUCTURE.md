# FrameLord Codebase Structure

**Last Updated:** 2025-12-04
**Purpose:** This document provides a comprehensive map of the FrameLord application architecture, stores, views, and special modules.

---

## Overview

FrameLord is a React + TypeScript single-page application (SPA) with **no real backend yet**. All data lives in in-memory stores using localStorage for persistence. The application is built around a **Contact spine model** where Contact Zero represents the user and serves as the canonical spine—all notes, tasks, interactions, topics, and canvas nodes ultimately attach to Contact Zero or another contact.

---

## Folder Layout

```
framelord-landing-page/
├── App.tsx                   # Main application shell (renders Dashboard)
├── index.tsx                 # React app entry point
├── index.html                # HTML template
├── vite.config.ts            # Vite build configuration
├── vitest.config.ts          # Vitest test configuration
├── tsconfig.json             # TypeScript configuration
├── types.ts                  # Core domain types (Contact, Note, Task, etc.)
│
├── components/               # UI components
│   ├── Dashboard.tsx         # Main dashboard / app shell with routing
│   ├── crm/                  # CRM feature components
│   ├── canvas/               # Frame Canvas components
│   ├── littleLord/           # Little Lord AI assistant components
│   ├── admin/                # Admin portal components
│   ├── account/              # Account management components
│   ├── noteGraph/            # Note graph visualization
│   └── ui/                   # Shared UI components
│
├── pages/                    # Full-page views (public/standalone)
│   ├── PublicFrameScanPage.tsx
│   ├── FrameReportDemoPage.tsx
│   ├── LegalPages.tsx
│   └── ApplicationPages.tsx
│
├── services/                 # Data stores and services
│   ├── contactStore.ts       # Contact management
│   ├── noteStore.ts          # Note management
│   ├── taskStore.ts          # Task management
│   ├── interactionStore.ts   # Interaction logging
│   ├── topicStore.ts         # Topic/tag management
│   ├── groupStore.ts         # Group management
│   ├── projectStore.ts       # Project management (Asana-style)
│   ├── pipelineStore.ts      # Pipeline/deals management
│   ├── calendarStore.ts      # Calendar events
│   ├── dailyNoteStore.ts     # Daily notes (Obsidian-style)
│   ├── attachmentStore.ts    # File attachments
│   ├── frameScanReportStore.ts # Frame scan results
│   ├── contactContextStore.ts  # Contact context state
│   ├── widgetLayoutStore.ts    # Dashboard widget layouts
│   ├── systemLogStore.ts     # System log entries (notifications)
│   └── littleLord/           # Little Lord service modules
│       ├── index.ts
│       ├── types.ts
│       ├── doctrine.ts
│       └── eventDispatch.ts
│
├── stores/                   # Global state stores (Jotai-based)
│   ├── canvasStore.ts        # Canvas state
│   ├── bookingStore.ts       # Booking/scheduling
│   ├── applicationStore.ts   # Application submissions
│   ├── contactLayoutStore.ts # Contact layout preferences
│   ├── adminAuditStore.ts    # Admin audit logs
│   ├── coachingStore.ts      # Coaching features
│   ├── dataRequestStore.ts   # Data requests
│   ├── littleLordEventStore.ts # Little Lord events
│   ├── betaProgramStore.ts   # Beta program management
│   ├── cookieConsentStore.ts # Cookie consent
│   ├── frameHealthStore.ts   # Frame health metrics
│   ├── userNotificationStore.ts # User notifications
│   ├── usageSelectors.ts     # Usage metrics selectors
│   ├── tenantUserStore.ts    # Multi-tenant user management
│   └── tenantStore.ts        # Multi-tenant data
│
├── lib/                      # Shared libraries and utilities
│   ├── frameScan/            # Frame scanning logic
│   │   ├── index.ts
│   │   ├── frameTypes.ts     # Frame scan types
│   │   ├── frameSpec.ts      # Frame specification
│   │   ├── frameScoring.ts   # Scoring algorithms
│   │   ├── frameScanLLM.ts   # LLM integration
│   │   ├── frameProfile.ts   # Profile generation
│   │   ├── frameReportUI.ts  # Report UI helpers
│   │   ├── frameThrottle.ts  # Rate limiting
│   │   ├── contactContext.ts # Contact context
│   │   ├── publicScanGate.ts # Public scan access control
│   │   ├── framelordAssistant.ts # AI assistant
│   │   └── *.test.ts         # Tests
│   ├── canvas/               # Canvas utilities
│   │   ├── transcriptionHelper.ts
│   │   └── useCanvasFrameCredits.ts
│   ├── llm/                  # LLM provider integrations
│   │   ├── geminiService.ts  # Gemini AI integration
│   │   ├── openaiClient.ts   # OpenAI integration
│   │   ├── nanobananaClient.test.ts # Nanobanana client tests
│   │   └── providers.ts      # Provider configurations
│   ├── layout/               # Layout utilities
│   └── settings/             # Settings management
│
├── hooks/                    # React hooks
│   └── useFrameScan.ts       # Frame scanning hook
│
├── types/                    # Type definitions
│   ├── multiTenant.ts        # Multi-tenant types
│   ├── applicationTypes.ts   # Application form types
│   └── usage.ts              # Usage tracking types
│
├── styles/                   # Global styles
│   └── theme.css             # Theme variables and global styles
│
├── public/                   # Static assets
│
├── config/                   # Configuration files
│
└── docs/                     # Documentation (this file!)
    └── CODEBASE_STRUCTURE.md
```

---

## Core Stores

All stores follow a pattern of in-memory state with localStorage persistence. Each store exposes a simple API for CRUD operations.

### Primary Data Stores (in `services/`)

| Store | File | Core Type | Purpose |
|-------|------|-----------|---------|
| **contactStore** | `services/contactStore.ts` | `Contact` | Manages all contacts including Contact Zero |
| **noteStore** | `services/noteStore.ts` | `Note` | Manages notes attached to contacts |
| **taskStore** | `services/taskStore.ts` | `Task` | Manages tasks attached to contacts |
| **interactionStore** | `services/interactionStore.ts` | `Interaction` | Logs interactions with contacts |
| **topicStore** | `services/topicStore.ts` | `Topic`, `NoteTopic` | Manages topics/tags (Obsidian-style [[links]]) |
| **groupStore** | `services/groupStore.ts` | `Group`, `GroupMembership` | Manages contact groups |
| **projectStore** | `services/projectStore.ts` | `Project`, `ProjectSection`, `ProjectTaskLink` | Asana-style project management |
| **pipelineStore** | `services/pipelineStore.ts` | `PipelineTemplate`, `PipelineItem` | Deal/pipeline management |
| **dailyNoteStore** | `services/dailyNoteStore.ts` | `DailyNote` | Daily journal entries (Obsidian-style) |
| **calendarStore** | `services/calendarStore.ts` | Calendar events | Event scheduling |
| **attachmentStore** | `services/attachmentStore.ts` | `NoteAttachment`, `InteractionAttachment` | File attachments |
| **frameScanReportStore** | `services/frameScanReportStore.ts` | Frame scan results | Stores Frame scan analysis results |
| **systemLogStore** | `services/systemLogStore.ts` | `SystemLogEntry` | System log and notification entries |

### Supporting Stores (in `stores/`)

| Store | File | Purpose |
|-------|------|---------|
| **canvasStore** | `stores/canvasStore.ts` | Canvas nodes and connections state |
| **bookingStore** | `stores/bookingStore.ts` | Booking and scheduling |
| **applicationStore** | `stores/applicationStore.ts` | Application form submissions |
| **coachingStore** | `stores/coachingStore.ts` | Coaching features |
| **tenantStore** | `stores/tenantStore.ts` | Multi-tenant configuration |
| **tenantUserStore** | `stores/tenantUserStore.ts` | Multi-tenant user management |
| **adminAuditStore** | `stores/adminAuditStore.ts` | Admin audit logs |
| **littleLordEventStore** | `stores/littleLordEventStore.ts` | Little Lord AI event logs |
| **usageSelectors** | `stores/usageSelectors.ts` | Usage metrics and analytics |

---

## Core View Components

All main views are in `components/` directory, organized by feature area.

### Main Dashboard
- **Dashboard.tsx** - Main application shell with navigation and routing

### CRM Views (in `components/crm/`)

| Component | Route/View | Purpose |
|-----------|------------|---------|
| **ContactsView.tsx** | Contacts List | Browse and search contacts |
| **ContactDossierView.tsx** | Contact Detail | Individual contact profile with tabs |
| **NotesView.tsx** | Notes | View all notes, daily notes, note map |
| **NoteDetailView.tsx** | Note Detail | Individual note editor |
| **NoteDocumentView.tsx** | Note Document | Full-page note view |
| **TasksView.tsx** | Tasks | Task list and management |
| **CalendarView.tsx** | Calendar | Calendar view of events and tasks |
| **ActivityView.tsx** | Activity Log | Interaction history |
| **FrameScanPage.tsx** | Frame Scans | Frame scanning interface |
| **FrameScanReportDetail.tsx** | Scan Report | Detailed scan results |
| **FrameScanContactTab.tsx** | Contact Scan Tab | Scan results in contact dossier |
| **FrameScoreTile.tsx** | Score Widget | Frame score display widget |
| **GroupsView.tsx** | Groups | Group list |
| **GroupView.tsx** | Group Detail | Individual group view |
| **ProjectsView.tsx** | Projects | Project list (Asana-style) |
| **ProjectDetailView.tsx** | Project Detail | Individual project view |
| **PipelinesView.tsx** | Pipelines | Deal pipeline kanban |
| **SettingsView.tsx** | Settings | User settings and preferences |

### Canvas (in `components/canvas/`)

| Component | Purpose |
|-----------|---------|
| **FrameCanvasPage.tsx** | Main canvas page wrapper |
| **FrameCanvas.tsx** | Core canvas component with nodes and connections |
| **CanvasNodeCard.tsx** | Individual canvas node |
| **AffineNoteEditor.tsx** | Affine-powered rich text editor for canvas notes |
| **AffineEditorCore.tsx** | Affine editor core logic |
| **TiptapEditor.tsx** | Alternative Tiptap editor (may be deprecated) |
| **ThreadCanvas.tsx** | Thread-based canvas view |
| **ThreadCanvasPage.tsx** | Thread canvas page wrapper |

### Little Lord AI (in `components/littleLord/`)

| Component | Purpose |
|-----------|---------|
| **LittleLordProvider.tsx** | Context provider for Little Lord |
| **LittleLordChat.tsx** | Chat interface |
| **LittleLordFloatingButton.tsx** | Floating action button |
| **LittleLordGlobalModal.tsx** | Global modal with keyboard shortcut |

### Admin (in `components/admin/`)

| Component | Purpose |
|-----------|---------|
| **PlatformAdminPortal.tsx** | Platform-level admin (super admin) |
| **TenantAdminPortal.tsx** | Tenant-level admin (enterprise owners) |
| **ApplicationAdminPanels.tsx** | Application review panels |
| **panels/UsageAnalyticsPanel.tsx** | Usage analytics |
| **panels/UserUsagePanel.tsx** | Per-user usage |
| **panels/EnterpriseUsagePanel.tsx** | Enterprise usage |
| **panels/FrameScoreAnalyticsPanel.tsx** | Frame score analytics |
| **panels/BroadcastPanel.tsx** | Broadcast messaging |

### Other Components

| Component | Purpose |
|-----------|---------|
| **noteGraph/NoteGraph.tsx** | Note graph visualization |
| **account/AccountArea.tsx** | Account management |
| **CookieBanner.tsx** | Cookie consent banner |
| **RetroClockPanel.tsx** | Retro clock widget |

---

## Special Modules

### Frame Scan (`lib/frameScan/`)

Frame Scan is the core AI-powered personality and communication analysis feature.

**Key Files:**
- `frameTypes.ts` - Type definitions for frame analysis
- `frameSpec.ts` - Frame specification and scoring rubric
- `frameScoring.ts` - Scoring algorithms
- `frameScanLLM.ts` - LLM integration (OpenAI, Anthropic)
- `frameProfile.ts` - Profile generation from scans
- `frameReportUI.ts` - UI helpers for rendering reports
- `frameThrottle.ts` - Rate limiting and credit management
- `framelordAssistant.ts` - AI assistant for frame insights
- `contactContext.ts` - Contact context for scans
- `publicScanGate.ts` - Public scan access control

**Flow:**
1. User uploads content (text, image, audio) via `FrameScanPage`
2. Content is processed by `frameScanLLM` using configured AI provider
3. Results scored by `frameScoring` against `frameSpec`
4. Results stored in `frameScanReportStore`
5. UI renders via `FrameScanReportDetail` using `frameReportUI` helpers

### Little Lord (`services/littleLord/` + `components/littleLord/`)

Little Lord is the AI assistant feature with global keyboard shortcut access.

**Key Files:**
- `services/littleLord/index.ts` - Main service
- `services/littleLord/types.ts` - Type definitions
- `services/littleLord/doctrine.ts` - AI prompts and system instructions
- `services/littleLord/eventDispatch.ts` - Event handling
- `components/littleLord/LittleLordGlobalModal.tsx` - Global modal with Cmd+K shortcut
- `components/littleLord/LittleLordChat.tsx` - Chat UI
- `stores/littleLordEventStore.ts` - Event persistence

**Features:**
- Global keyboard shortcut (Cmd+K / Ctrl+K)
- Context-aware AI assistance
- Credit-based usage tracking
- Event logging for analytics

### Frame Canvas (`components/canvas/` + `lib/canvas/` + `stores/canvasStore.ts`)

Frame Canvas is an Obsidian/Notion-style infinite canvas for visual thinking and note-taking.

**Key Files:**
- `stores/canvasStore.ts` - Canvas state (nodes, connections)
- `components/canvas/FrameCanvas.tsx` - Main canvas component
- `components/canvas/CanvasNodeCard.tsx` - Canvas node cards
- `components/canvas/AffineNoteEditor.tsx` - Rich text editor for canvas notes
- `lib/canvas/useCanvasFrameCredits.ts` - Credit management for canvas operations
- `lib/canvas/transcriptionHelper.ts` - Audio transcription helpers

**Features:**
- Infinite canvas with pan and zoom
- Note nodes with rich text (Affine editor)
- Connections between nodes
- Drag and drop
- Contact nodes linking to the Contact spine
- Integration with Frame scanning

### Credits System

The app has a Frame Credits system for metering AI operations.

**Key Files:**
- `types/usage.ts` - Usage and credit types
- `lib/canvas/useCanvasFrameCredits.ts` - Canvas credit hooks
- `lib/frameScan/frameThrottle.ts` - Scan rate limiting
- `stores/usageSelectors.ts` - Usage metrics selectors

**Operations consuming credits:**
- Frame scans (image, audio, text analysis)
- Little Lord AI conversations
- Canvas AI features (transcription, etc)

---

## Core Types

All core types are defined in `types.ts` at the root level. This is the canonical source of truth for domain models.

### Primary Types

**Contact Spine:**
```typescript
Contact              // Core contact entity
ContactZero          // Special type for user's own contact (id: 'contact_zero')
ContactFrameMetrics  // Frame score data
```

**Content Attached to Contacts:**
```typescript
Note                 // Notes about contacts
NoteAttachment       // Files attached to notes
Task                 // Tasks related to contacts
Interaction          // Logged interactions
Topic                // Tags/topics for organization
```

**Containers:**
```typescript
Group                // Contact groups
GroupMembership      // Group membership records
Project              // Asana-style projects
ProjectSection       // Project sections
ProjectTaskLink      // Links tasks into project sections
PipelineTemplate     // Pipeline definitions
PipelineItem         // Items in pipelines
```

**Special:**
```typescript
DailyNote            // Obsidian-style daily notes
NotePage             // Standalone note pages
NoteLink             // Bi-directional note links
SystemLogEntry       // System notifications
```

---

## Plugging In Backend / AI Providers

### Backend Integration Points

Currently, the app uses localStorage for all persistence. To add a real backend:

1. **API Client Layer** - Create `services/apiClient.ts` to wrap fetch calls
2. **Store Hydration** - Update each store to:
   - Fetch initial data from API on load
   - POST/PUT/DELETE to API on mutations
   - Keep localStorage as fallback/cache
3. **Auth** - Add authentication layer (JWT, session, etc)
4. **WebSocket** - For real-time updates (optional)

**Key stores to migrate:**
- `contactStore.ts` → `/api/contacts`
- `noteStore.ts` → `/api/notes`
- `taskStore.ts` → `/api/tasks`
- `interactionStore.ts` → `/api/interactions`
- `frameScanReportStore.ts` → `/api/scans`

### AI Provider Integration Points

Frame Scan and Little Lord currently use configurable AI providers.

**Current Integration:**
- `lib/llm/` - LLM provider abstractions
- `lib/frameScan/frameScanLLM.ts` - Frame scan AI calls
- `services/geminiService.ts` - Gemini-specific integration

**To add new providers:**
1. Add provider config to `lib/llm/providers.ts`
2. Implement provider in `lib/llm/`
3. Update `frameScanLLM.ts` to support new provider
4. Add UI for provider selection in settings

**Transcription:**
- Currently uses browser-based transcription
- To add cloud transcription: update `lib/canvas/transcriptionHelper.ts`

---

## Testing

Tests are colocated with their source files using `.test.ts` suffix.

**Test Coverage:**
- `lib/frameScan/*.test.ts` - Frame scanning logic
- `vitest.config.ts` - Test configuration

**To run tests:**
```bash
npm test
```

---

## Build & Development

**Scripts:**
```bash
npm run dev       # Start dev server
npm run build     # Production build
npm run preview   # Preview production build
npm test          # Run tests
```

**Tech Stack:**
- **Framework:** React 18 + TypeScript
- **Build:** Vite
- **State:** Jotai (atoms) + in-memory stores
- **Styling:** CSS modules + theme.css
- **Canvas:** Custom implementation with Affine editor
- **AI:** OpenAI, Anthropic (Claude), Gemini

---

## Known Technical Debt

This section will be updated as cleanup passes progress.

- Some stores are in `services/` vs `stores/` (naming inconsistency)
- `types.ts` at root is large - could be split into `types/` directory
- Some old/experimental code may still exist (_OLD.tsx files)
- Canvas implementation may have prototype code remnants
- Type safety could be improved (reduce `any` usage)

---

## Navigation Notes

The app uses a single-page architecture with all routing handled in `Dashboard.tsx`. There are no URL routes - navigation is state-based.

**Main navigation states:**
- Contact Zero (home)
- Contacts
- Notes (Daily, All, Map)
- Tasks
- Calendar
- Activity/Interactions
- Frame Scans
- Canvas
- Pipelines
- Projects
- Groups
- Settings
- Admin (conditional based on user role)

---

*This document is maintained as the codebase evolves. Update it when major structural changes are made.*
