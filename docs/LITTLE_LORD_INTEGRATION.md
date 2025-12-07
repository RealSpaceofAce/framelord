# Little Lord Integration Documentation

## Overview

Little Lord is the unified AI coaching system integrated into FrameLord. This document describes the complete architecture, integration points, and usage guidelines.

---

## 🏛️ Architecture

### Core Components

#### 1. **Doctrinal Core** (`services/littleLord/doctrine.ts`)
- **Purpose**: Single source of truth for Little Lord's identity, behavior, and output contracts
- **Contents**:
  - Core identity and tone
  - Apex vs Slave Frame principles
  - Coaching processes and flows
  - Event emission rules
  - Safety brakes
- **Status**: ✅ Complete

#### 2. **Type Definitions** (`services/littleLord/types.ts`)
- **Purpose**: TypeScript interfaces for all Little Lord interactions
- **Key Types**:
  - `LittleLordRequest` - Input schema
  - `LittleLordResponse` - Output schema with optional events
  - `LittleLordContext` - Contextual payload (tasks, notes, contacts, etc.)
  - `LittleLordMessage` - Conversation message format
  - `LittleLordEventData` - Event emission data
- **Status**: ✅ Complete

#### 3. **Core Service** (`services/littleLord/index.ts`)
- **Purpose**: Universal invocation point
- **Key Functions**:
  - `invokeLittleLord()` - Single-turn invocation
  - `invokeLittleLordWithHistory()` - Multi-turn conversation
  - `createInitialLittleLordMessage()` - Greeting generator
  - `getLittleLordDisplayName()` - UI name helper
- **Features**:
  - System prompt generation from doctrine
  - Context enrichment (contact data, frame profiles, reports)
  - Response parsing and validation
  - Error handling with fallbacks
- **Status**: ✅ Complete

#### 4. **Event Dispatch** (`services/littleLord/eventDispatch.ts`)
- **Purpose**: Event routing and metrics recording
- **Features**:
  - Creates and stores LittleLordEvent records
  - Writes events as notes on Contact Zero
  - Provides query functions for admin analytics
  - Aggregates metrics by topic, pattern, and severity
- **Functions**:
  - `dispatchLittleLordEvent()` - Main dispatch
  - `getLittleLordEventsForUser()` - User query
  - `getAggregatedEventMetrics()` - Admin metrics
  - `getUsersWithRecurringPatterns()` - Coaching triage
- **Status**: ✅ Complete

---

## 🎨 UI Components

### 1. **LittleLordChat** (`components/littleLord/LittleLordChat.tsx`)
- **Purpose**: Embeddable chat interface
- **Features**:
  - Maintains conversation state
  - Auto-scrolls to latest message
  - Handles invocation and event dispatch
  - Customizable height and styling
- **Usage**:
  ```tsx
  <LittleLordChat
    tenantId="tenant_123"
    userId="user_456"
    context={{ selectedContactId: "c_789" }}
    height="400px"
    showHeader={true}
  />
  ```
- **Status**: ✅ Complete

### 2. **LittleLordFloatingButton** (`components/littleLord/LittleLordFloatingButton.tsx`)
- **Purpose**: Fixed-position summon button
- **Features**:
  - Pulsing glow animation
  - Hover tooltip
  - Smooth transitions
- **Status**: ✅ Complete

### 3. **LittleLordGlobalModal** (`components/littleLord/LittleLordGlobalModal.tsx`)
- **Purpose**: Full-screen modal for global invocation
- **Features**:
  - Escape key to close
  - Backdrop blur
  - Embedded LittleLordChat
  - Responsive design
- **Status**: ✅ Complete

### 4. **LittleLordProvider** (`components/littleLord/LittleLordProvider.tsx`)
- **Purpose**: Global state management and keyboard shortcuts
- **Features**:
  - React Context for app-wide access
  - Keyboard shortcut: **Cmd+K then "LL"**
  - Manages modal state
  - Renders floating button and global modal
- **Hook**:
  ```tsx
  const littleLord = useLittleLord();
  littleLord.open('notes_panel', { selectedContactId: 'c_123' });
  ```
- **Status**: ✅ Complete

---

## 🔌 Integration Points

### Current Integrations

#### 1. **Dashboard** (`components/Dashboard.tsx`)
- **Status**: ✅ Integrated
- **Implementation**: Wrapped with `LittleLordProvider`
- **Features**:
  - Global floating button visible
  - Keyboard shortcut active (Cmd+K → LL)
  - Provider passes Contact Zero as userId

#### 2. **FrameScanContactTab** (`components/crm/FrameScanContactTab.tsx`)
- **Status**: ✅ Migrated from Framelord Assistant
- **Changes**:
  - Removed old `framelordAssistant` imports
  - Replaced custom chat UI with `LittleLordChat`
  - Passes selected contact as context
- **Before/After**:
  - **Before**: Used `runFramelordForContact()` and custom UI
  - **After**: Uses `<LittleLordChat>` component directly

### Planned Integrations

The following surfaces should integrate Little Lord via the `useLittleLord()` hook:

#### ✅ **Contact Zero Dashboard**
- Location: Overview view, Contact Zero tile
- Context to pass: `{ selectedContactId: CONTACT_ZERO.id }`

#### ⏳ **Notes Panel** (`components/crm/NotesView.tsx`)
- Location: Add "Ask Little Lord" button in note editor
- Context to pass: `{ recentNotes: [...], editorContent: "..." }`

#### ⏳ **Tasks View** (`components/crm/TasksView.tsx`)
- Location: Add button in task panel header
- Context to pass: `{ recentTasks: [...] }`

#### ⏳ **Calendar View** (`components/crm/CalendarView.tsx`)
- Location: Event detail sidebar
- Context to pass: `{ recentTasks: [...], selectedContactId: "..." }`

#### ⏳ **Contact Dossier** (`components/crm/ContactDossierView.tsx`)
- Location: Contact header or interaction timeline
- Context to pass: `{ selectedContactId: "...", recentNotes: [...] }`

#### ⏳ **Pipeline View** (`components/crm/PipelinesView.tsx`)
- Location: Pipeline item detail
- Context to pass: `{ activePipelineItemId: "...", selectedContactId: "..." }`

#### ⏳ **Project View** (`components/crm/ProjectsView.tsx`)
- Location: Project detail panel
- Context to pass: `{ activeProjectId: "...", recentTasks: [...] }`

---

## 🎯 Universal Invocation Pattern

### From Any Component

```tsx
import { useLittleLord } from '../littleLord';

function MyComponent() {
  const littleLord = useLittleLord();

  const handleAskLittleLord = () => {
    littleLord.open('notes_panel', {
      selectedContactId: contactId,
      editorContent: noteContent,
      recentNotes: getRecentNotes(5),
    });
  };

  return (
    <button onClick={handleAskLittleLord}>
      Ask Little Lord
    </button>
  );
}
```

### Invocation Sources

All invocations are tagged with a source for analytics:

- `'global_command'` - Command palette
- `'contact_zero_dashboard'` - Contact Zero tile
- `'notes_panel'` - Notes view
- `'tasks_view'` - Tasks panel
- `'calendar_view'` - Calendar
- `'contact_dossier'` - Contact detail
- `'interactions_timeline'` - Interaction log
- `'pipeline_view'` - Pipeline item
- `'project_view'` - Project detail
- `'floating_button'` - Floating action button
- `'keyboard_shortcut'` - Cmd+K → LL

---

## 📊 Event System

### Event Contract

When Little Lord detects a pattern, it emits an event:

```typescript
{
  topic: "RELATIONSHIP" | "LEADERSHIP" | "BUSINESS" | "SELF_REGULATION",
  pattern: "RECURRING_STUCK" | "FRAME_COLLAPSE" | "NEEDY_BEHAVIOR" | "AVOIDANCE",
  severity: "LOW" | "MEDIUM" | "HIGH",
  summary: "1-3 sentence admin-facing summary"
}
```

### Event Flow

1. **Little Lord Response** includes optional `event` field
2. **UI Component** receives response, calls `dispatchLittleLordEvent()`
3. **Event Dispatcher**:
   - Creates LittleLordEvent record
   - Writes note on Contact Zero with tags
   - Stores in event log
   - Updates frame health aggregates (future)
   - Routes to admin analytics (future)

### Querying Events

```typescript
import {
  getLittleLordEventsForUser,
  getAggregatedEventMetrics,
  getUsersWithRecurringPatterns,
} from '../services/littleLord/eventDispatch';

// Get all events for a user
const events = getLittleLordEventsForUser(tenantId, userId);

// Get aggregated metrics
const metrics = getAggregatedEventMetrics(tenantId, userId);
console.log(metrics.byTopic.RELATIONSHIP); // Count of relationship events

// Find users needing coaching (admin)
const needsHelp = getUsersWithRecurringPatterns('RECURRING_STUCK', 3, 30);
```

---

## 🔑 Environment Setup

### Required Environment Variables

#### OpenAI API Key
```bash
VITE_OPENAI_API_KEY=sk-...
```

#### Optional: OpenAI Model Override
```bash
VITE_OPENAI_MODEL=gpt-4o-mini  # Default
```

### User Settings Override

Users can override app-level API keys in Settings:
- Navigate to Settings
- Enter personal OpenAI API key
- Stored in localStorage (temporary; will move to server-side)

---

## 🚀 Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **Cmd+K** then **LL** | Summon Little Lord globally |
| **Esc** | Close Little Lord modal |
| **Enter** | Send message in chat |
| **Shift+Enter** | New line in chat |

---

## 📂 File Structure

```
services/littleLord/
├── doctrine.ts          # Doctrinal core (single source of truth)
├── types.ts             # TypeScript types
├── index.ts             # Core invocation logic
└── eventDispatch.ts     # Event routing and metrics

components/littleLord/
├── LittleLordChat.tsx           # Chat interface component
├── LittleLordFloatingButton.tsx # Floating action button
├── LittleLordGlobalModal.tsx    # Global modal
├── LittleLordProvider.tsx       # Global provider & hook
└── index.ts                     # Exports

types/multiTenant.ts
└── LittleLordEvent types (already existed!)
```

---

## ✅ Completion Checklist

### Core Infrastructure
- ✅ Doctrinal JSON as TypeScript module
- ✅ TypeScript types and interfaces
- ✅ Core invocation service
- ✅ Event dispatch system
- ✅ Context enrichment (contact profiles, reports)

### UI Components
- ✅ LittleLordChat component
- ✅ LittleLordFloatingButton component
- ✅ LittleLordGlobalModal component
- ✅ LittleLordProvider with React Context

### Integrations
- ✅ Dashboard wrapped with LittleLordProvider
- ✅ FrameScanContactTab migrated from Framelord Assistant
- ⏳ Notes panel integration
- ⏳ Tasks view integration
- ⏳ Calendar view integration
- ⏳ Contact dossier integration
- ⏳ Pipeline view integration
- ⏳ Project view integration

### Testing & Polish
- ⏳ Build verification
- ⏳ Keyboard shortcut testing
- ⏳ Event dispatch testing
- ⏳ Multi-turn conversation testing
- ⏳ Error handling verification

---

## 🎨 UI Design Notes

### Colors & Theming
- **Primary Purple**: `#4433FF`
- **Background**: `#0A0A0A`, `#0E0E0E`, `#1A1A1A`
- **Borders**: `#222`, `#333`
- **Little Lord Icon**: Crown (from lucide-react)

### Spacing & Layout
- Chat height default: `400px`
- Modal max-width: `3xl` (768px)
- Floating button position: bottom-right (24px margin)

---

## 🔮 Future Enhancements

### Backend Integration
- [ ] Persist conversations to database
- [ ] Server-side API endpoint for invocation
- [ ] Webhook for event dispatch
- [ ] Frame health aggregation pipeline

### Advanced Features
- [ ] Voice input via microphone
- [ ] Book chunk retrieval (RAG)
- [ ] Multi-user coaching sessions
- [ ] Admin coaching triage dashboard
- [ ] Beta and coaching application AI eval

### Performance
- [ ] Streaming responses (SSE)
- [ ] Response caching for common queries
- [ ] Conversation compression for long sessions

---

## 📝 Notes for Developers

### Naming Consistency
- **Old**: "Framelord Assistant"
- **New**: "Little Lord"
- All references have been unified under "Little Lord"

### Removed Files
- **Do NOT delete**: `lib/frameScan/framelordAssistant.ts` (may be used elsewhere)
- That file is now deprecated in favor of Little Lord

### Multi-Tenant Architecture
- Uses `tenantId` and `userId` for all invocations
- Contact Zero is the default `userId` for user's own coaching
- Each tenant has their own Contact Zero
- Events are scoped by `tenantId` and `userId`

### Testing Commands
```bash
# Install dependencies
npm install

# Run dev server
npm run dev

# Build
npm run build

# Type check
npx tsc --noEmit
```

---

## 📞 Support & Questions

For questions about Little Lord integration:
1. Review this document
2. Check the doctrinal core: `services/littleLord/doctrine.ts`
3. Examine the type definitions: `services/littleLord/types.ts`
4. Look at example usage in `FrameScanContactTab.tsx`

---

**Last Updated**: December 3, 2025
**Version**: 1.0
**Status**: Core infrastructure complete, UI integrations in progress
