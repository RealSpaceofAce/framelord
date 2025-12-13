# OS Behavior Fixes: Notes, Chat, Theme

This document summarizes the implementation work for OS-level behaviors in FrameLord.

---

## Implementation Summary

### Completed Items

#### 1. Theme: Dark/Light Mode Lock

**Status:** Completed

**Changes Made:**
- Removed global Dark Mode toggle from Settings > Appearance tab (`SettingsView.tsx`)
- App shell is now **locked to dark mode** on init (`App.tsx` always calls `applyGlobalTheme(true)`)
- Notes editor retains its own theme toggle (Sun/Moon icon in header)
- Editor theme stored separately in `framelord_editor_theme` localStorage key
- Editor theme changes do **not** affect app shell

**Files Modified:**
- `src/App.tsx` - Always apply dark mode
- `src/components/crm/SettingsView.tsx` - Removed Dark Mode toggle
- `src/components/notes/AffineNotes.tsx` - Editor uses separate localStorage key

---

#### 2. Wikilinks: Create/Open Behavior

**Status:** Already Implemented (verified)

The wikilink system is fully functional:
- Type `[[` in notes editor to trigger WikiLinkSuggestion popup
- Search for existing notes by title
- "Create new" option creates a new note with that title
- Clicking a wikilink navigates to the target note
- Bidirectional links tracked via `processNoteLinks()` in noteStore

**Key Files:**
- `src/components/notes/WikiLinkSuggestion.tsx` - Autocomplete popup
- `src/components/notes/extensions/WikiLinkNode.tsx` - Renders clickable links
- `src/services/noteStore.ts` - `createNoteFromWikiLink()`, `findNoteByTitle()`

---

#### 3. Little Lord: Session Store Infrastructure

**Status:** Completed (infrastructure)

Created persistent session storage for Little Lord conversations:

**New File:** `src/services/littleLord/sessionStore.ts`

Features:
- `createSession(tenantId, userId)` - Start new conversation
- `getCurrentSession()` - Get or create current session
- `addUserMessage()` / `addAssistantMessage()` - Add messages
- `getAllSessions()` / `getSessionsWithMessages()` - History access
- `switchToSession(sessionId)` - Resume past conversation
- `startNewChat()` - Begin fresh conversation
- localStorage persistence with `framelord_littlelord_sessions` key
- Reactive subscription pattern for UI updates

**Integration Points (for future wiring):**
- LittleLordChat.tsx - Use session store instead of local useState
- LittleLordFullscreenChat.tsx - Share session with widget
- LittleLordProvider.tsx - Coordinate session across modalities
- Contact Zero dashboard - Display past sessions

---

#### 4. Intake: Name Question and Contact Zero Population

**Status:** Completed

- Added "What should we call you?" as first Tier 1 question
- Answer populates Contact Zero's `fullName` and `contactProfile.displayName`
- Stored via `storeAs: 'contactProfile.displayName'` in business_frame_spec.json

**Files Modified:**
- `docs/specs/business_frame_spec.json` - Added `t1_name` question
- `src/types.ts` - Added `displayName` to `ContactIntakeProfile`
- `src/services/intakeStore.ts` - Handler for displayName storage

---

#### 5. Apex Blueprint Gate

**Status:** Completed

Apex Blueprint card on Contact Zero dashboard only shows after Tier 1 intake is complete.

**Implementation:**
- Import `needsTier1Intake` from `src/lib/intakeGate.ts`
- Conditional render: `{!needsTier1Intake(CONTACT_ZERO.id) && <ApexBlueprintCard />}`

**File Modified:**
- `src/components/crm/ContactZeroView.tsx`

---

#### 6. Login Persistence / Auth Routing

**Status:** Completed

**Changes Made:**
- `App.tsx` initial state now checks `isAuthenticated()` on mount
- If authenticated, defaults to `'dashboard'` instead of `'landing'`
- Added effect to handle auth state transitions:
  - Session expiry on dashboard → redirects to landing
  - Login while on login page → redirects to dashboard

**Files Modified:**
- `src/App.tsx` - Initial view state and auth transition effect

**Note:** Auth email from address (`support@framelord.com`) requires Supabase dashboard configuration.

---

### Pending Items

---

#### 7. Calendar Google Input Bug

**Status:** Completed

**Changes Made:**
- Added `onKeyDown` handler to prevent Enter key from triggering scroll
- Added `autoComplete="off"` to prevent browser interference
- Added explicit `type="button"` to "Link now" and "Disconnect" buttons

**Contact Zero Access:** Already implemented
- CalendarView shows "You" badge on Contact Zero tasks
- ContactZeroView has calendar navigation button wired up

**Files Modified:**
- `src/components/crm/SettingsView.tsx` - Google Calendar email input fixes

---

#### 8. Soft Delete with Trash

**Status:** Infrastructure Completed (UI Pending)

**Changes Made:**
- Added `deletedAt?: string | null` to Note interface in `types.ts`
- Modified `deleteNote()` to set `deletedAt` (soft delete)
- Added `permanentlyDeleteNote()` for hard delete
- Added `restoreNote()` to restore from trash
- Added `getDeletedNotes()` to get all trash items
- Added `emptyTrash()` to permanently delete all trash
- Added `autoPurgeTrash(days)` for timed cleanup
- Added `getTrashCount()` for trash item count
- Added localStorage persistence for notes (`framelord_notes`)
- Auto-purge runs on module load (30 days)
- `getAllNotes()` now filters out deleted notes

**Files Modified:**
- `src/types.ts` - Added `deletedAt` field
- `src/services/noteStore.ts` - Trash functions and localStorage persistence

**Pending UI Work:**
- Trash folder in sidebar
- Drag-to-Trash interaction
- "Empty Trash" button

---

#### 9. Demo Data vs Real User Separation

**Status:** Completed (Infrastructure)

**Changes Made:**
- Contact Zero now persists to localStorage (`framelord_contact_zero`)
- Contact Zero loads from localStorage on startup (hydrated with defaults)
- Default Contact Zero name changed from "Grimson" to "You"
- Added `isDemoContactsEnabled()` and `setDemoContactsEnabled()` functions
- Added `refreshContactsList()` to toggle demo contacts on/off
- Demo contacts in separate `DEMO_CONTACTS` array
- `CONTACTS` array conditionally includes demo contacts based on setting

**Files Modified:**
- `src/services/contactStore.ts` - localStorage persistence, demo contacts gating

**Usage:**
```typescript
// Disable demo contacts for authenticated users
import { setDemoContactsEnabled, refreshContactsList } from '@/services/contactStore';
setDemoContactsEnabled(false);
refreshContactsList();
```

---

## Architecture Notes

### Theme System

```
┌─────────────────────────────────────────────┐
│                 App Shell                    │
│  (Always dark - locked via applyGlobalTheme)│
│                                              │
│  ┌───────────────────────────────────────┐  │
│  │            Notes Editor                │  │
│  │  (Can toggle light/dark independently) │  │
│  │  Stored in: framelord_editor_theme     │  │
│  └───────────────────────────────────────┘  │
│                                              │
└─────────────────────────────────────────────┘
```

### Little Lord Session Flow

```
User opens Little Lord
        │
        ▼
┌──────────────────────┐
│  getCurrentSession() │ ◄── Creates new if none exists
└──────────────────────┘
        │
        ▼
┌──────────────────────┐
│   User sends message │
│   addUserMessage()   │
└──────────────────────┘
        │
        ▼
┌──────────────────────┐
│ invokeLittleLord()   │
│ AI generates reply   │
└──────────────────────┘
        │
        ▼
┌──────────────────────┐
│addAssistantMessage() │ ◄── Persisted to localStorage
└──────────────────────┘
        │
        ▼
User closes widget
        │
        ▼
Session persists ─────────► User opens again
                                    │
                                    ▼
                            getCurrentMessages()
                            (Conversation resumed)
```

### Intake to Contact Zero Flow

```
Tier 1 Question 1: "What should we call you?"
        │
        ▼
User answers: "Aaron"
        │
        ▼
storeIntakeProfileData()
        │
        ├─► contactProfile.displayName = "Aaron"
        └─► contact.fullName = "Aaron"
```

---

## File Reference

| Feature | Files |
|---------|-------|
| Theme Lock | `App.tsx`, `SettingsView.tsx`, `AffineNotes.tsx` |
| Wikilinks | `WikiLinkSuggestion.tsx`, `WikiLinkNode.tsx`, `noteStore.ts` |
| Little Lord Sessions | `sessionStore.ts` (new), `index.ts`, `types.ts` |
| Intake Name | `business_frame_spec.json`, `intakeStore.ts`, `types.ts` |
| Apex Blueprint Gate | `ContactZeroView.tsx`, `intakeGate.ts` |
| Auth Routing | `App.tsx` |
| Calendar Bug Fix | `SettingsView.tsx` |
| Soft Delete/Trash | `types.ts`, `noteStore.ts` |
| Demo Data Separation | `contactStore.ts` |

---

## Testing Checklist

- [ ] App shell stays dark when notes editor is in light mode
- [ ] Notes editor theme toggle works and persists across page reload
- [ ] Wikilink creates new note when title doesn't exist
- [ ] Clicking wikilink navigates to target note
- [ ] Tier 1 first question asks for name
- [ ] Contact Zero fullName updates after intake
- [ ] Apex Blueprint hidden until Tier 1 complete
- [ ] Little Lord conversations persist (requires wiring session store to components)
- [ ] Authenticated users go directly to dashboard on app load
- [ ] Logged out users redirected from dashboard to landing
- [ ] Google Calendar email input doesn't jump page to top
- [ ] Deleted notes move to trash (soft delete)
- [ ] Deleted notes don't appear in normal views
- [ ] Notes in trash for > 30 days auto-purge on load
- [ ] Contact Zero name persists across page reloads (after intake)
- [ ] Demo contacts can be disabled with setDemoContactsEnabled(false)
