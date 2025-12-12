# FrameLord Application Map

**Generated:** 2025-12-11
**Purpose:** Complete read-only discovery of the FrameLord application
**Note:** This is a snapshot of existing code. Items marked "Planned assumption" describe the future Calls and Messaging module.

---

## 1. High-Level Overview

### What FrameLord Is For

FrameLord is an AI-powered authority diagnostics platform and local-first CRM OS. It helps users identify and fix weaknesses in their communication by analyzing text, audio, and images for "frame" dynamics—the subtle signals of authority, confidence, and positioning that determine how others perceive you.

### Who Uses It

- **Primary users**: Coaches, sales professionals, executives, and anyone in high-stakes communication
- **Contact Zero**: The user themselves—their own identity record at the center of all data
- **Beta/Coaching applicants**: People applying for premium access through AI-evaluated application flows
- **Admin users**: Platform operators with staff roles (SUPER_ADMIN, ADMIN, SUPPORT)

### Main Pieces of the Product

#### Contact Spine and Contact Zero
- Every entity in the system attaches to a Contact. Contact Zero is the immutable user identity
- All notes, tasks, interactions, and scans ultimately connect back to Contact Zero
- Contact Zero stores the user's intake profile, initial wants, and frame metrics

#### Contacts, Notes, Tasks, Calendar, Pipelines, Interactions, Topics
- **Contacts**: People the user relates to—prospects, clients, partners, friends
- **Notes**: Rich text documents with wikilinks, @mentions, and #hashtags using Tiptap editor
- **Tasks**: To-dos attached to contacts with due dates that drive the calendar
- **Calendar**: Monthly view derived from task due dates (single source of truth)
- **Pipelines**: Kanban-style workflows for moving contacts through stages
- **Interactions**: Logged events (calls, meetings, emails, DMs) forming contact timelines
- **Topics**: Tags created via #hashtag syntax linking notes and contacts

#### FrameScan and AI Analysis
- Core diagnostic: analyzes text, images, or audio for frame dynamics
- 9-axis scoring system: assumptive state, buyer/seller position, identity vs tactic, etc.
- Win/Win integrity check affects final score
- Produces detailed reports with corrections and coaching insights

#### Little Lord Coaching
- AI assistant available throughout the app (Cmd+K shortcut)
- Context-aware coaching based on Apex Frame doctrine
- Validates "Wants" vs "Shoulds" for goal setting
- Enforces guardrails against disrespect, gossip, domain violations

#### Beta and Coaching Application Flows
- AI chatbot evaluation for beta program applicants
- Coaching application with prospect screening
- JSON-driven conversation flows with qualification logic

#### Graph/Network Views
- Obsidian-style knowledge graph visualization
- Shows contacts, notes, topics, tasks, interactions, and FrameScans
- Contact Zero is the central node

#### Wants Tracking
- Sovereign desires system (above tasks)
- Steps (sub-goals), metrics, iterations (accountability logs)
- Only Contact Zero can have wants
- Validation distinguishes true wants from external "shoulds"

#### Calls and Messaging (Planned/Assumed)

This is a future first-class module that would integrate communication directly into the CRM:

- **Call placement**: Users would initiate calls from contact records
- **Call receiving**: Incoming calls would be handled within the CRM
- **Call recording**: Audio automatically captured and attached to the contact
- **Transcripts**: Automatic transcription of call audio
- **SMS/message threads**: Text communication attached to contacts
- **AI call analysis**: Each call would have:
  - Timestamps for segments
  - Color-coded segments (green/yellow/red for frame dynamics)
  - Coaching comments tied to specific moments
  - Sales insights derived from the conversation

**How Calls and Messaging fits the contact spine**:
- Call and SMS history would appear in the contact dossier alongside notes and interactions
- Call analysis would feed into FrameScan reports for that contact
- Coaching insights would inform the Wants tracking system
- The interaction timeline would unify calls, messages, notes, and other touchpoints

---

## 2. Site and App Hierarchy

### 2.1 Public Site

**Landing Page** (`/` default view)
- **Purpose**: Customer-facing marketing page for visitor conversion
- **Sections**:
  - Hero: Interactive headline "STOP SOUNDING LIKE AN AMATEUR"
  - Scanner Demo: FrameScan preview (text/audio analysis)
  - Features Grid: Six feature tiles
  - Pricing: Three tiers (Basic $29, Pro $79, Elite $199)
  - Footer: Dev navigation links, legal links
- **Visitor Flow**: View demo → Try scanner → Click "Get Access" → Pricing section

**Application Page** (footer link: "Application Page (Dev)")
- **Purpose**: Coaching application with AI chatbot evaluation
- **Sections**: Chat interface for qualification conversation
- **Flow**: Answer questions → AI evaluates fit → Approval/rejection

**Beta Page** (footer link: "Beta Program (Dev)")
- **Purpose**: Beta program application screening
- **Sections**: V2.0 Vanguard Protocol signup with AI chatbot
- **Flow**: Similar to application page with beta-specific questions

**Booking Page** (footer link: "Booking (Dev)")
- **Purpose**: Session scheduling (placeholder)
- **Status**: Coming soon

**Legal Pages**
- Terms of Service
- Privacy Policy
- Acceptable Use Policy
- Data Processing Addendum

### 2.2 Auth and Entry into the App

**Current State**:
- No real authentication system implemented yet
- Dashboard accessed via footer dev links (bypasses normal login)
- `navigateToDashboardDev()` bypasses intake gate for development
- Entry controlled by App.tsx state-based routing

**Key Files**:
- `src/App.tsx`: Main router controlling all views
- `src/lib/intakeGate.ts`: Tier 1 intake gateway logic
- `src/services/intakeStore.ts`: Intake session management
- `src/types/multiTenant.ts`: UserScope, tenant roles

**Intake Gateway**:
- First-time users redirected to Intake Flow
- Must complete Tier 1 before accessing dashboard
- Tracked via `contact.firstIntakeCompletedAt` timestamp

### 2.3 Internal Dashboard

```
Dashboard (CRM OS)
├── OVERVIEW (Home)
│   ├── Frame Integrity Widget (score, scans, leaks)
│   ├── Rebels Ranking Widget (leaderboard)
│   ├── Things Due Today Widget
│   ├── System Log Widget (notifications)
│   ├── Clock/Weather Panel
│   └── Timeline Chart (scans, actions over time)
│
├── CONTACTS
│   ├── Contact List (filtered by domain)
│   ├── Search and filtering
│   └── Contact creation
│
├── DOSSIER (Individual Contact)
│   ├── Profile header (editable fields)
│   ├── Frame Integrity tile
│   ├── Notes tab
│   ├── Tasks tab
│   ├── Interactions timeline
│   ├── Topics tab
│   ├── FrameScan tab
│   └── AI Profile Widget (psychometrics)
│
├── NOTES
│   ├── Three-column layout
│   ├── Search and navigation (left)
│   ├── Tiptap editor (center)
│   ├── Right sidebar (AI, Calendar, Comments, Frames, Outline)
│   ├── Daily notes / Journal
│   ├── PARA folder organization
│   └── Wikilinks, @mentions, #hashtags
│
├── TASKS
│   ├── Task list by status
│   ├── Filtering (open/done/blocked)
│   └── Status toggling
│
├── CALENDAR
│   ├── Monthly grid view
│   ├── Task counts per day
│   └── Day detail (tasks due)
│
├── PIPELINES
│   ├── Kanban board
│   ├── Stage management
│   ├── Template configuration
│   └── Stage automation (auto-create tasks)
│
├── CASES (Active Workload)
│   ├── Contacts needing attention
│   ├── Frame score indicators
│   └── Priority sorting
│
├── FRAMESCAN
│   ├── Report list (all contacts)
│   ├── Folder organization
│   ├── Report detail view
│   └── Create new scan
│
├── WANTS (Goal Tracking)
│   ├── Want Board (Kanban)
│   ├── Want Detail (steps, metrics)
│   ├── Progress view
│   ├── Scope view
│   └── Global Steps Board
│
├── GRAPH
│   └── Force-directed network visualization
│
├── ACTIVITY
│   ├── Global interaction timeline
│   └── Filtering by type
│
├── SETTINGS
│   ├── User preferences
│   ├── API key configuration
│   ├── Theme settings
│   └── Notification filters
│
├── ADMIN (Conditional)
│   ├── Platform Admin Portal (SUPER_ADMIN)
│   └── Tenant Admin Portal (OWNER)
│
└── CALLS & MESSAGING (Planned)
    ├── Call history per contact
    ├── Live call interface
    ├── SMS/message threads
    ├── Audio player with transcript
    ├── AI highlights view (timestamped coaching)
    └── Color-coded segment visualization
```

---

## 3. Feature Inventory

### Contacts

| Feature | Description | Location | Status |
|---------|-------------|----------|--------|
| Contact List | Browse all contacts with domain filtering | `ContactsView.tsx` | Implemented and wired |
| Contact Creation | Create new contacts from UI or @mention | `contactStore.createContact()` | Implemented and wired |
| Contact Zero | Immutable user identity at center of spine | `contactStore.CONTACT_ZERO` | Implemented and wired |
| Contact Dossier | Full contact profile with all linked data | `ContactDossierView.tsx` | Implemented and wired |
| @Mention System | Reference contacts in notes via @name | `ContactMentionNode.tsx` | Implemented and wired |
| Psychometric Profile | Big Five, MBTI, DISC, Dark Traits | `AIProfileWidget.tsx` | Implemented and wired |
| Intake Profile | Bio, work context, wants from intake | `contact.contactProfile` | Implemented and wired |

### Notes

| Feature | Description | Location | Status |
|---------|-------------|----------|--------|
| Rich Text Editor | Tiptap-based markdown with formatting | `MarkdownNoteEditor.tsx` | Implemented and wired |
| [[Wikilinks]] | Link notes via `[[Note Title]]` syntax | `WikiLinkNode.tsx` | Implemented and wired |
| @Mentions | Reference contacts in notes | `ContactMentionNode.tsx` | Implemented and wired |
| #Hashtags | Tag notes with topics | `TopicMentionNode.tsx` | Implemented and wired |
| Backlinks | Show notes linking to current note | `Backlinks.tsx` | Implemented and wired |
| PARA Folders | Projects/Areas/Resources/Archive | `folderStore.ts` | Implemented and wired |
| Daily Notes | Journal entries by date | `noteStore.getLogEntriesByDate()` | Implemented and wired |
| Attachments | Images, audio, files as Data URLs | `NoteAttachment` type | Implemented and wired |

### Tasks

| Feature | Description | Location | Status |
|---------|-------------|----------|--------|
| Task List | View all tasks with filtering | `TasksView.tsx` | Implemented and wired |
| Task Status | Open/Done/Blocked states | `taskStore.updateTaskStatus()` | Implemented and wired |
| Calendar Integration | Tasks drive calendar view | `CalendarView.tsx` | Implemented and wired |
| Project Linking | Tasks linked (not copied) to projects | `ProjectTaskLink` | Implemented and wired |
| Want Linking | Tasks optionally linked to wants | `task.wantId` | Implemented and wired |

### Calendar

| Feature | Description | Location | Status |
|---------|-------------|----------|--------|
| Monthly View | Grid showing task counts | `CalendarView.tsx` | Implemented and wired |
| Day Detail | Tasks due on selected day | `getOpenTasksByDate()` | Implemented and wired |
| Single Source of Truth | Derives from task.dueAt only | N/A (no duplication) | Implemented and wired |

### Pipelines

| Feature | Description | Location | Status |
|---------|-------------|----------|--------|
| Kanban Board | Move contacts through stages | `PipelinesView.tsx` | Implemented and wired |
| Template Management | Define pipeline stages | `pipelineStore.ts` | Implemented and wired |
| Stage Automation | Auto-create tasks on stage entry | `autoTaskTitle`, `autoTaskDueInDays` | Implemented and wired |
| Won/Lost Tracking | Close deals with status | `PipelineItem.status` | Implemented and wired |

### FrameScan

| Feature | Description | Location | Status |
|---------|-------------|----------|--------|
| Text Scan | Analyze text for frame dynamics | `runTextFrameScan()` | Implemented and wired |
| Image Scan | Analyze images via NanoBanana | `runImageFrameScan()` | Implemented and wired |
| Audio Scan | Transcribe and analyze audio | `geminiService.analyzeFrame()` | Implemented and wired |
| 9-Axis Scoring | Comprehensive frame breakdown | `frameScoring.ts` | Implemented and wired |
| Report UI | Detailed scan results display | `FrameScanReportLayout.tsx` | Implemented and wired |
| Landing Demo | Public scanner preview | `Scanner.tsx` | Implemented and wired |
| Throttling | Rate limits for scans | `frameThrottle.ts` | Implemented and wired |

### Little Lord (AI Coaching)

| Feature | Description | Location | Status |
|---------|-------------|----------|--------|
| Global Modal | Cmd+K invocation | `LittleLordGlobalModal.tsx` | Implemented and wired |
| Chat Interface | Conversation with AI coach | `LittleLordChat.tsx` | Implemented and wired |
| Context Awareness | Knows current view and contact | `useLittleLord()` hook | Implemented and wired |
| Want Validation | Distinguishes wants from shoulds | `runLittleLord()` | Implemented and wired |
| Guardrails | Blocks disrespect, gossip, etc. | 6 guardrail types | Implemented and wired |
| Event Generation | Creates tasks, wants, interactions | `LittleLordRunOutput.event` | Implemented and wired |

### Beta Program / Applications

| Feature | Description | Location | Status |
|---------|-------------|----------|--------|
| Application Chatbot | AI evaluation for coaching | `ApplicationPage.tsx` | Implemented and wired |
| Beta Chatbot | AI screening for early access | `BetaPage.tsx` | Implemented and wired |
| Admin Review | View applications in admin portal | `ApplicationAdminPanels.tsx` | Implemented and wired |

### Graph Visualization

| Feature | Description | Location | Status |
|---------|-------------|----------|--------|
| Force Graph | Network view of all entities | `FrameGraphView.tsx` | Implemented and wired |
| Contact Zero Central | User at center of graph | Graph data builder | Implemented and wired |
| Entity Nodes | Contacts, notes, topics, tasks, scans | Node types | Implemented and wired |

### Wants Tracking

| Feature | Description | Location | Status |
|---------|-------------|----------|--------|
| Want Board | Kanban view of sovereign desires | `WantsPage.tsx` | Implemented and wired |
| Steps | Sub-goals within a want | `want.steps` | Implemented and wired |
| Metrics | Dynamic daily tracking | `want.metricTypes`, `want.metrics` | Implemented and wired |
| Iterations | Accountability logs | `want.iterations` | Implemented and wired |
| Should Rejection | Validation against external pressures | `want.validation` | Implemented and wired |
| Frame Penalty | Want compliance affects FrameScore | `wantTrackingPenalty.ts` | Implemented and wired |

### Admin Tools

| Feature | Description | Location | Status |
|---------|-------------|----------|--------|
| Platform Admin | Super admin portal | `PlatformAdminPortal.tsx` | Implemented and wired |
| Tenant Admin | Enterprise owner portal | `TenantAdminPortal.tsx` | Implemented and wired |
| Usage Analytics | Platform usage tracking | `UsageAnalyticsPanel.tsx` | Implemented and wired |
| Broadcast | Message users | `BroadcastPanel.tsx` | Implemented and wired |

### Calls and Messaging (Planned)

| Feature | Description | Location | Status |
|---------|-------------|----------|--------|
| Call Placement | Initiate calls from CRM | N/A | Planned assumption |
| Call Receiving | Handle incoming calls | N/A | Planned assumption |
| Call Recording | Capture and store audio | N/A | Planned assumption |
| Transcripts | Automatic transcription | N/A | Planned assumption |
| SMS Threads | Text message history | N/A | Planned assumption |
| AI Call Analysis | Timestamped coaching | N/A | Planned assumption |
| Segment Colors | Red/yellow/green highlights | N/A | Planned assumption |
| Integration with Dossier | Calls in contact timeline | N/A | Planned assumption |

---

## 4. Data and State Model

### Main Data Objects

| Object | Description | Attachment to Contact | Source Store |
|--------|-------------|----------------------|--------------|
| Contact | People in the CRM | IS the spine | `contactStore.ts` |
| Contact Zero | The user themselves | Special contact (`id: 'contact_zero'`) | `contactStore.ts` |
| Note | Text documents | `authorContactId`, `targetContactIds` | `noteStore.ts` |
| Task | To-dos with due dates | `contactId` | `taskStore.ts` |
| Interaction | Logged events (calls, meetings) | `contactId` | `interactionStore.ts` |
| Topic | Tags/categories | `noteIds`, `contactIds` | `topicStore.ts` |
| Pipeline Item | Position in workflow | `contactId` | `pipelineStore.ts` |
| Project | Containers for tasks | `primaryContactId`, `relatedContactIds` | `projectStore.ts` |
| Group | Contact collections | `GroupMembership.contactId` | `groupStore.ts` |
| Want | Sovereign desires | `contactId` (always '0' = Contact Zero) | `wantStore.ts` |
| Intake Session | Survey responses | `contactId` | `intakeStore.ts` |
| FrameScan Report | Analysis results | linked via contact | `frameScanReportStore.ts` |
| Psychometric Profile | Personality assessment | `contactId` | `psychometricStore.ts` |
| Folder | PARA organization | Contains notes (via `note.folderId`) | `folderStore.ts` |

**Planned for Calls and Messaging:**

| Object | Description | Attachment to Contact | Source Store |
|--------|-------------|----------------------|--------------|
| Call | Audio call record | `contactId` | Planned: `callStore.ts` |
| Call Recording | Audio file (Data URL) | Via `call.callId` | Planned: `callStore.ts` |
| Call Transcript | Text transcription | Via `call.callId` | Planned: `callStore.ts` |
| Call Analysis Segment | Timestamped coaching note | Via `call.callId` | Planned: `callStore.ts` |
| SMS Thread | Message conversation | `contactId` | Planned: `messageStore.ts` |
| SMS Message | Individual message | Via `thread.threadId` | Planned: `messageStore.ts` |

### Key Relationships

```
Contact Zero (immutable user identity)
    │
    ├── Authors all Notes (authorContactId = 'contact_zero')
    ├── Has Wants (only Contact Zero can have wants)
    ├── Intake Profile stored here
    ├── Frame metrics and scores
    │
    ├── Contact relationships:
    │   └── Other contacts attached via:
    │       ├── Notes (targetContactIds)
    │       ├── Tasks (contactId)
    │       ├── Interactions (contactId)
    │       ├── Pipeline Items (contactId)
    │       ├── Projects (primaryContactId, relatedContactIds)
    │       └── [Planned] Calls and SMS (contactId)
    │
    ├── Note relationships:
    │   ├── Topics (via note.topics array)
    │   ├── Folders (via note.folderId)
    │   ├── Attachments (Data URLs)
    │   ├── Mentions (contact IDs)
    │   └── Wikilinks (to other notes)
    │
    ├── Task relationships:
    │   ├── Calendar (derived from dueAt)
    │   ├── Projects (via ProjectTaskLink)
    │   └── Wants (optional wantId)
    │
    └── Want relationships:
        ├── Steps (sub-goals)
        ├── Metrics (daily tracking)
        ├── Iterations (logs)
        ├── Primary Contact (stakeholder)
        └── Related Contacts
```

### Store File Paths

| Store | Path | Purpose |
|-------|------|---------|
| contactStore | `src/services/contactStore.ts` | Contact CRUD, Contact Zero |
| noteStore | `src/services/noteStore.ts` | Notes with PARA folders |
| taskStore | `src/services/taskStore.ts` | Tasks, calendar integration |
| interactionStore | `src/services/interactionStore.ts` | Communication logs |
| topicStore | `src/services/topicStore.ts` | Topic graph and linking |
| folderStore | `src/services/folderStore.ts` | PARA folder hierarchy |
| projectStore | `src/services/projectStore.ts` | Projects with sections |
| pipelineStore | `src/services/pipelineStore.ts` | Pipelines and stages |
| groupStore | `src/services/groupStore.ts` | Contact grouping |
| wantStore | `src/services/wantStore.ts` | Sovereign desires |
| intakeStore | `src/services/intakeStore.ts` | Intake sessions |
| frameScanReportStore | `src/services/frameScanReportStore.ts` | FrameScan results |
| psychometricStore | `src/services/psychometricStore.ts` | Personality profiles |
| systemLogStore | `src/services/systemLogStore.ts` | Notifications |
| calendarStore | `src/services/calendarStore.ts` | Calendar helpers |
| widgetLayoutStore | `src/services/widgetLayoutStore.ts` | Dashboard layout |

**Planned stores:**
- `callStore.ts` - Call records, recordings, transcripts, analysis
- `messageStore.ts` - SMS threads and messages

---

## 5. Roles, Tiers, and AI Usage

### Roles in Code

**Platform Staff Roles** (in `multiTenant.ts`):

| Role | Description | Access Level |
|------|-------------|--------------|
| SUPER_ADMIN | Platform super administrator | Full platform access, all tenants |
| ADMIN | Platform administrator | Platform admin features |
| SUPPORT | Support staff | Limited admin access |
| NONE | Regular user | No staff privileges |

**Tenant Roles** (per-organization):

| Role | Description | Access Level |
|------|-------------|--------------|
| OWNER | Tenant owner | Full tenant control, billing |
| ADMIN | Tenant administrator | User management, settings |
| MEMBER | Regular member | Standard CRM access |
| VIEWER | Read-only access | View only |

### Where Roles Change Behavior

- `PlatformAdminPortal.tsx`: Only renders for SUPER_ADMIN and ADMIN staff roles
- `TenantAdminPortal.tsx`: Only renders for OWNER role (and requires TEAM/ENTERPRISE plan)
- `appConfig.ts`: Feature flags may be gated by role
- Mock scopes in `App.tsx` demonstrate role switching for development

### AI Integration Points

**Implemented AI:**

| AI Feature | Description | Location | Provider |
|------------|-------------|----------|----------|
| FrameScan Text | Text analysis for frame dynamics | `frameScanLLM.ts` | OpenAI (gpt-4o-mini) |
| FrameScan Image | Image annotation | `nanobananaClient.ts` | NanoBanana |
| FrameScan Audio | Transcription + analysis | `geminiService.ts` | Google Gemini |
| Little Lord Coaching | Context-aware AI coach | `runLittleLord.ts` | OpenAI |
| Application Chat | Coaching application evaluation | `geminiService.ts` | Google Gemini |
| Beta Chat | Beta program screening | `geminiService.ts` | Google Gemini |
| Big Five Inference | Personality assessment | `psychometricBigFiveClient.ts` | OpenAI |
| MBTI Inference | Type inference | `psychometricMbtiClient.ts` | OpenAI |
| DISC Inference | Behavioral style | `psychometricDiscClient.ts` | OpenAI |
| Dark Trait Assessment | Risk assessment | `psychometricDarkTraitClient.ts` | OpenAI |

**Planned AI for Calls and Messaging:**

| AI Feature | Description | Status |
|------------|-------------|--------|
| Call Transcription | Convert audio to text | Planned assumption |
| Call Segment Labeling | Identify key moments | Planned assumption |
| Segment Color Coding | Red/yellow/green frame indicators | Planned assumption |
| Timestamped Coaching | Comments at specific times | Planned assumption |
| Sales Insights | Deal coaching from calls | Planned assumption |
| SMS Analysis | Frame dynamics in text messages | Planned assumption |

**How Call AI Should Plug In (Based on Existing Patterns):**

1. **Transcription**: Similar to `transcribeAudioToText()` in `transcriptionService.ts`
2. **Frame Analysis**: Use `runTextFrameScan()` on transcript
3. **Segment Detection**: New function in `frameScan/` similar to `runFrameScan()`
4. **Storage**: New store following `frameScanReportStore.ts` pattern
5. **Display**: Component following `FrameScanReportLayout.tsx` pattern with audio player

---

## 6. User Journeys

### New User: Landing to Dashboard

1. Visitor arrives at landing page
2. Sees hero headline and demo scanner
3. Tries FrameScan demo on sample text
4. Scrolls to pricing, clicks "Get Access"
5. (Future: Creates account, logs in)
6. System redirects to Intake Flow
7. Completes Tier 1 intake questions
8. Sees "Access Granted" screen with Little Lord orb
9. Enters Dashboard at Overview view
10. Contact Zero is pre-populated with intake profile

### CRM Session: Add Contact, Notes, Tasks

1. User is in Dashboard
2. Navigates to Contacts view
3. Clicks "Add Contact" to create new contact
4. Enters name, domain, role, tags
5. Navigates to Notes
6. Creates new note, types "Meeting with @Jane about #sales"
7. Contact Jane is linked; topic "sales" is created
8. Navigates to Tasks
9. Creates task: "Follow up with Jane" with due date
10. Task appears in Calendar on that date

### FrameScan on Self

1. User navigates to FrameScan in sidebar
2. Selects "Contact Zero" or "Self" filter
3. Clicks "New Scan"
4. Pastes email draft or uploads image
5. Selects domain (sales email, social post, etc.)
6. Clicks "Analyze"
7. Sees 9-axis breakdown with scores
8. Reviews corrections and coaching
9. Saves report (attached to Contact Zero)

### Little Lord Coaching

1. User presses Cmd+K anywhere
2. Types "LL" to summon Little Lord
3. Global modal opens with chat
4. User types: "I want to ask for a raise but I'm scared"
5. Little Lord validates: this is a Want, not a Should
6. Provides Apex Frame coaching
7. Offers to create a Want or Task
8. User accepts; Want created in Wants view

### Beta/Coaching Application

1. User clicks "Beta Program" in footer
2. Chat interface opens
3. AI asks qualifying questions
4. User responds; AI evaluates fit
5. Upon completion, application stored
6. Admin reviews in Platform Admin Portal

### Wants Tracking

1. User navigates to Wants
2. Creates new Want: "Double my income"
3. Adds steps: Research, Apply, Interview
4. Defines metrics: Applications Sent, Interviews Scheduled
5. Logs daily values
6. System calculates Want compliance
7. If below threshold, applies penalty to FrameScore
8. User iterates with accountability logs

### Calls and Messaging (Planned Journey)

1. User views contact dossier for prospect
2. Clicks "Call" button (initiates call from CRM)
3. Call interface opens, recording starts automatically
4. User has sales conversation
5. Call ends, system processes:
   - Audio stored as Data URL
   - Transcript generated
   - AI analyzes for frame dynamics
6. User views call in dossier timeline
7. Sees audio player with transcript
8. AI highlights view shows:
   - Timeline with colored segments (green = strong frame, red = weak)
   - Coaching comments at key timestamps
   - "You used needy language at 2:34"
9. Sales insights summarize deal implications
10. SMS thread also visible if text messages exchanged
11. All communication unified in contact timeline

---

## 7. Key Files and Pointers

### Entry Points

| File | Purpose |
|------|---------|
| `src/App.tsx` | Main router, controls all view switching |
| `src/index.tsx` | React entry point, mounts App |
| `index.html` | HTML template with root div |

### Core Layouts and Dashboards

| File | Purpose |
|------|---------|
| `src/components/Dashboard.tsx` | Main CRM dashboard with navigation |
| `src/components/crm/ContactDossierView.tsx` | Contact detail with all tabs |
| `src/components/notes/AffineNotes.tsx` | Full notes interface |
| `src/components/wants/WantsPage.tsx` | Goal tracking system |

### Contact Spine Logic

| File | Purpose |
|------|---------|
| `src/services/contactStore.ts` | Contact CRUD, Contact Zero management |
| `src/types.ts` | Contact, ContactZero type definitions |
| `src/lib/layout/contactLayoutConfig.ts` | Dashboard widget configuration |

### FrameScan and Scoring

| File | Purpose |
|------|---------|
| `src/lib/frameScan/frameScanLLM.ts` | LLM orchestration for scans |
| `src/lib/frameScan/frameScoring.ts` | Pure scoring algorithm |
| `src/lib/frameScan/frameTypes.ts` | Core type definitions |
| `src/lib/frameScan/frameProfile.ts` | Cumulative profile computation |
| `src/services/frameScanReportStore.ts` | Report storage |

### Wants Tracking

| File | Purpose |
|------|---------|
| `src/services/wantStore.ts` | Want CRUD, steps, metrics |
| `src/lib/frameScan/wantTrackingPenalty.ts` | Frame penalty calculation |
| `src/components/wants/WantsPage.tsx` | Main wants UI |

### Communication/Interaction Modules (Extension Point for Calls)

| File | Purpose |
|------|---------|
| `src/services/interactionStore.ts` | Current interaction logging |
| `src/components/crm/ActivityView.tsx` | Interaction timeline |
| `src/types.ts` | InteractionType includes 'call', 'message' |

### Little Lord AI

| File | Purpose |
|------|---------|
| `src/lib/agents/runLittleLord.ts` | Core coaching agent |
| `src/components/littleLord/LittleLordProvider.tsx` | Global provider |
| `src/services/littleLord/doctrine.ts` | Frame doctrine engine |

### Configuration

| File | Purpose |
|------|---------|
| `vite.config.ts` | Build configuration, dev server |
| `tsconfig.json` | TypeScript compilation |
| `package.json` | Dependencies and scripts |
| `src/config/appConfig.ts` | Feature flags |

---

## Summary

This document maps the entire FrameLord application as it exists in code today:

- **170+ component files** across 10+ subsystems
- **20+ service stores** managing the contact-centric data model
- **50+ library utilities** for AI, scoring, and configuration
- **9-axis FrameScan** system with multi-modal analysis
- **Little Lord** AI coaching integrated throughout
- **Wants tracking** for sovereign goal management
- **Obsidian-style** graph visualization

The Calls and Messaging module is documented as a planned/assumed addition that logically extends the existing contact spine architecture. All communication would attach to contacts via the same patterns used by notes, tasks, and interactions.

---

*Report generated: 2025-12-11*
