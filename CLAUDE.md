# FrameLord Project Context

FrameLord is a local-first CRM OS built with React and TypeScript. The entire system is organized around a single canonical spine: the Contact object. Contact Zero represents the user themselves, and all data flows outward from Contact Zero to every other entity in the graph. The application runs entirely in-memory with no backend, using service-based stores as the single source of truth. AI agents are deeply integrated for frame analysis, coaching evaluation, and the Little Lord pattern detection system.

---

## Core Architecture: The Contact Spine

Everything in FrameLord attaches to a Contact. There are no orphan objects.

```
Contact Zero (The User)
    │
    ├── Notes (authored by Contact Zero, targeted at contacts)
    ├── Tasks (attached to contacts, drive calendar)
    ├── Interactions (logged events with contacts)
    ├── Topics (graph edges linking contacts, notes, tasks)
    ├── Groups (collections of contacts)
    ├── Projects (containers anchored to contacts)
    └── Pipelines (contact progression through stages)
```

**Contact Zero** is the user's identity. It is immutable at the identity level and serves as the author of most content. The main dashboard is essentially the Contact Zero home view.

---

## Core Data Models

### Contact
- Every person, company, or entity is a Contact
- Includes: name, avatar (Data URL), domain, role, status, tags, frame metrics
- Fully editable with soft archive (no hard deletes)
- Contact Zero is never deleted or replaced

### Note
- Every note has `authorContactId` (usually Contact Zero) and `targetContactId`
- Supports BlockSuite rich text editor with `/` slash commands
- PARA folder organization: Inbox, Projects, Areas, Resources, Archive
- `[[wikilinks]]` for topic and note linking
- Attachments stored as Data URLs
- Kinds: `log` (daily journal), `note` (general), `system` (auto-generated)
- View modes: `doc` (text) or `canvas` (visual)

### Task
- Always attached to at least one contact via `contactId`
- Has `dueDate` that drives both Tasks view and Calendar view
- Status: `open`, `done`, `blocked`
- Single source of truth for dates across all views

### Interaction
- Logged events: call, meeting, email, dm, message, other
- Attaches to exactly one primary contact
- Editable and deletable
- Forms the contact timeline

### Topic
- Tags with graph edges connecting contacts, notes, tasks, interactions
- Created via `[[Topic]]` syntax in notes
- Normalized slug for matching

---

## Core Stores (Single Source of Truth)

All data lives in these in-memory stores. UI reads from them and dispatches typed actions.

| Store | Purpose |
|-------|---------|
| `contactStore` | Contact CRUD, Contact Zero management |
| `noteStore` | Notes with BlockSuite support, PARA folders |
| `taskStore` | Tasks with contact attachment, due dates |
| `interactionStore` | Communication logs and timeline |
| `topicStore` | Topic graph and linking |
| `groupStore` | Contact grouping |
| `projectStore` | Projects with sections and task links |
| `pipelineStore` | Pipeline templates and stage automation |
| `folderStore` | PARA folder hierarchy |
| `tenantStore` | Multi-tenant isolation |

---

## Main Views

All views are projections of the same underlying stores:

- **Dashboard** - Contact Zero home view
- **Contacts** - Contact list with filtering
- **Dossier** - Full contact record (profile, notes, tasks, activity)
- **Notes** - Note management with folders and search
- **Tasks** - Task list by contact
- **Calendar** - Monthly view driven by task dates
- **Pipelines** - Contact progression visualization
- **Projects** - Project management with sections
- **Groups** - Contact organization
- **Topics** - Topic detail with related entities
- **Activity** - Timeline of interactions and notes
- **FrameScan** - AI frame analysis interface

---

## Non-Negotiable Rules

- [ ] Contact Zero is immutable as the user identity
- [ ] Every note has `authorContactId` and `targetContactId`
- [ ] Every interaction attaches to a contact and is editable/deletable
- [ ] Every topic links notes, contacts, and user intent
- [ ] Tasks and calendar share ONE source of truth for dates
- [ ] All contacts are fully editable with avatar upload and soft archive
- [ ] All attachments use Data URLs (no external file storage)
- [ ] Views sync through centralized `selectedContactId` and routing state
- [ ] No backend, no external storage, no server calls
- [ ] Stores are the single source of truth - never bypass them

---

## Guidelines for AI Agents

### How to Add New Features

1. **Attach to the Contact spine** - New entities must relate to contacts
2. **Use existing stores** - Add to or extend stores in `/services/`
3. **No parallel data models** - Don't create separate sources of truth
4. **Respect PARA** - Notes go in folders (Inbox first, then filed)
5. **Link via Topics** - Use topics to create graph connections
6. **Data URLs for attachments** - No external file storage yet

### How to Modify Existing Code

1. **Read from stores** - UI components consume store data
2. **Dispatch typed actions** - Mutations go through store functions
3. **Maintain single truth** - If changing dates, update the task, not a duplicate
4. **Preserve Contact Zero** - Never delete or replace the user identity
5. **Keep views in sync** - Use centralized selection state, not component-local routing

### What You Must NOT Do

- Create objects without contact attachment
- Bypass stores with direct state manipulation
- Add external storage or server calls
- Create duplicate data (e.g., separate calendar events that mirror tasks)
- Delete Contact Zero or make it editable at identity level
- Introduce separate routing logic per component
- Store files externally (use Data URLs)
- Create "inbox items" separate from notes (notes start in Inbox)

---

## CRITICAL: Git Workflow Requirements

**IMPORTANT**: You MUST follow the Git workflow for ALL code changes:

### 1. Always Create a Feature Branch BEFORE Making Changes

```bash
git checkout -b feature/[feature-name]  # For new features
git checkout -b fix/[bug-name]          # For bug fixes
```

### 2. Commit Changes REGULARLY During Development

- After completing each major step
- When switching between different files/features
- Before running build tests
- Use meaningful commit messages with [Type] prefix

### 3. NEVER Work Directly on Main Branch

- All changes must go through feature branches
- Create pull requests for review
- Main branch should always be stable

### 4. Commit Message Format

```bash
git commit -m "[Type] Brief description

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
```

**Types**: `[Feature]`, `[Fix]`, `[Refactor]`, `[Docs]`, `[Test]`, `[Style]`, `[Chore]`

**⚠️ Failure to follow Git workflow = Incomplete task**

---

## Documentation Practice

### Feature Development Workflow

When implementing new features or making significant changes, maintain comprehensive documentation:

#### 1. Before Implementation
Create or update `app_info/YYYY-MM-DD_desired_app_functionality.md`:
- Document the desired changes and requirements
- Specify tier restrictions and business logic
- Define success criteria

#### 2. After Implementation
Create `app_info/YYYY-MM-DD_implementation_update.md`:
- List all files created/modified
- Document technical implementation details
- Include build status and test results
- Note any pending items or known issues

#### 3. Current State Documentation
Maintain `app_info/YYYY-MM-DD_app_functionality.md`:
- Keep an up-to-date snapshot of current functionality
- Organize by features and tiers
- Include both implemented and planned features
- Mark items clearly as ✅ Completed or 🔲 Pending

---

## Testing & Debugging

### Resetting Onboarding State

1. **Debug Reset Button**: Add conditional UI elements for development
2. **Simulator Reset**: Device → Erase All Content and Settings
3. **App Deletion**: Long press → Delete App
4. **Programmatic Reset**: Hidden gestures (tap count, long press)

### Common Mistakes to Avoid

❌ **Don't Do This**:
- Add new features without any analytics
- Modify existing features without updating events
- Use generic event names like "button_clicked"
- Forget to test events before release
- Skip documentation for "quick fixes"
- Work directly on main branch
- Make commits without meaningful messages

✅ **Do This**:
- Plan analytics events during feature design
- Update existing events when behavior changes
- Use specific, descriptive event names
- Test events thoroughly during development
- Document all changes, even small ones
- Always work on feature branches
- Write clear, descriptive commit messages

---

## Key Technical Details

### Tech Stack
- React 19 + TypeScript + Vite
- BlockSuite 0.19.5 (document editing with slash commands)
- Framer Motion (animations)
- AI: OpenAI, Google Gemini, Nano Banana (image annotation)

### Project Structure
```
/components    - React components by domain
/services      - Data stores and business logic
/stores        - Application state stores
/lib           - Utilities (frameScan, llm, blocksuite, canvas)
/hooks         - React custom hooks
/pages         - Page components
/types         - TypeScript definitions
/config        - Feature flags and app config
```

### Important Patterns
- **Service-based stores** - In-memory with CRUD helpers
- **No duplication** - Projects link to tasks, don't copy them
- **Lazy migration** - Legacy notes migrate on access
- **Multi-tenant** - Operations namespace by `tenantId`
- **Feature flags** - Centralized in `appConfig`

---

## Future Direction

When adding persistence or sync:
- Add as a thin layer UNDER existing stores
- Preserve Contact Zero centrality
- Maintain single spine model
- Keep stores as source of truth
- Never bypass stores to hit storage directly

---

## Quick Reference: Store Imports

```typescript
import { getContacts, getContactById, updateContact } from '@/services/contactStore';
import { getNotes, createNote, updateNote } from '@/services/noteStore';
import { getTasks, createTask, updateTask } from '@/services/taskStore';
import { getInteractions, createInteraction } from '@/services/interactionStore';
import { getTopics, createTopic } from '@/services/topicStore';
```

---

## Summary

FrameLord = Contact Spine + In-Memory Stores + AI Integration

Every feature you build must hang off the Contact spine, use the stores as truth, and never create parallel data models. Contact Zero is sacred. Dates have one source. Attachments are Data URLs. There is no backend.
