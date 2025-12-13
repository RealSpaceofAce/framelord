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

### Pending Items

#### 6. Login Persistence / Auth Routing

**Status:** Pending

**Required:**
- Authenticated users should go directly to dashboard, not landing page
- Session should persist across browser visits
- Auth emails should come from `support@framelord.com`

**Suggested Implementation:**
- Check `isAuthenticated()` on app mount
- If true, set `currentView` to `'dashboard'` instead of `'landing'`
- Configure Supabase Auth email templates with proper from address

---

#### 7. Calendar Google Input Bug

**Status:** Pending

**Bug:** When entering email for Google Calendar integration, page jumps to top.

**Suggested Fix:**
- Check for `e.preventDefault()` on form submission
- Ensure input doesn't trigger page scroll
- Likely in Settings > Integrations > Google Calendar section

---

#### 8. Soft Delete with Trash

**Status:** Pending

**Required:**
- Notes should soft-delete with `deletedAt` timestamp
- Drag-to-Trash interaction
- Trash folder in sidebar
- Auto-purge after N days
- "Empty Trash" action

**Suggested Implementation:**
- Add `deletedAt?: string | null` to Note interface
- Update noteStore `deleteNote()` to set `deletedAt` instead of removing
- Filter notes with `deletedAt` from normal views
- Create Trash view showing only soft-deleted notes
- Add purge logic for notes where `deletedAt > N days ago`

---

#### 9. Demo Data vs Real User Separation

**Status:** Pending

**Required:**
- Separate demo tenant from real user tenant
- Don't seed demo contacts for authenticated users
- Contact Zero name should come from intake or profile, not be hardcoded

**Suggested Implementation:**
- Check `isAuthenticated()` before seeding demo data
- Create tenant-specific contact sets
- Use `contactProfile.displayName` from intake as Contact Zero name

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
