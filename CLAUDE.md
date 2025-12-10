# FrameLord Project Context

FrameLord is an AI-powered authority diagnostics platform that helps users identify and fix weaknesses in their communication. The platform includes a customer-facing marketing site, coaching application flows, beta program management, and a full-featured CRM OS for managing contacts, notes, and frame analysis.

---

## ⚠️ CRITICAL: Site Entry Point & Navigation

**The landing page (http://localhost:3001) is the MAIN entry point for the site.**

When you run `npm run dev`, the site loads `App.tsx` which defaults to the `'landing'` view. This is the customer-facing marketing page.

### Site Views (Controlled by App.tsx)

| View | Description | How to Access |
|------|-------------|---------------|
| `landing` | **DEFAULT** - Customer-facing landing page with hero, scanner demo, features, pricing | Loads automatically on localhost |
| `application` | Coaching application form with AI chatbot | Footer link: "Application Page (Dev)" |
| `booking` | Session booking page (coming soon) | Footer link: "Booking (Dev)" |
| `beta` | Beta program application with AI chatbot | Footer link: "Beta Program (Dev)" |
| `dashboard` | Full CRM OS interface | Footer link: "Dashboard (Dev)" |

**IMPORTANT**: The footer contains dev links to navigate between views. Do NOT remove these during development.

---

## Site Architecture Overview

```
App.tsx (Main Router)
├── Landing Page (default view)
│   ├── Hero Section (InteractiveHeadline)
│   ├── Scanner Demo (FrameScan preview)
│   ├── Features Grid
│   ├── Pricing Section
│   └── Footer (with dev navigation links)
│
├── Application Page (coaching application)
│   ├── AI Chatbot (JSON-driven evaluation)
│   └── Application submission flow
│
├── Beta Page (beta program application)
│   ├── AI Chatbot (beta evaluation)
│   └── Beta signup flow
│
├── Booking Page (session scheduling)
│   └── Coming soon placeholder
│
└── Dashboard (CRM OS - full application)
    ├── HomeDashboard
    ├── Notes (AffineNotes with BlockSuite)
    ├── Contacts
    ├── Tasks
    ├── Calendar
    ├── Pipelines
    ├── Projects
    └── FrameScan
```

---

## User Hierarchy & Multi-Tenant Architecture

FrameLord supports a multi-tenant architecture with the following user roles:

### Platform Roles (Staff)
| Role | Description | Access Level |
|------|-------------|--------------|
| `SUPER_ADMIN` | Platform super administrator | Full platform access, all tenants |
| `ADMIN` | Platform administrator | Platform admin features |
| `SUPPORT` | Support staff | Limited admin access |
| `NONE` | Regular user | No staff privileges |

### Tenant Roles (Per-Organization)
| Role | Description | Access Level |
|------|-------------|--------------|
| `OWNER` | Tenant owner | Full tenant control, billing |
| `ADMIN` | Tenant administrator | User management, settings |
| `MEMBER` | Regular member | Standard CRM access |
| `VIEWER` | Read-only access | View only |

### B2B Model
- **Tenants**: Organizations that subscribe to FrameLord
- **Users**: Individual people within a tenant
- **Seats**: License count per tenant
- **Contact Zero**: Each tenant has their own Contact Zero (organizational identity)

---

## Pricing & Token Model (Future)

| Plan | Price | Features | Token Allocation |
|------|-------|----------|------------------|
| Basic | $29/mo | Unlimited text scans, basic FrameScore | Standard |
| Pro | $79/mo | + Call transcripts, CRM, email integration | Enhanced |
| Elite | $199/mo | + Unlimited transcripts, API access, priority | Maximum |

**Token-based pricing** will charge based on:
- AI analysis calls (FrameScan)
- Coaching evaluations
- Transcript processing
- API usage

---

## AI Integration Points

### 1. FrameScan (Frame Analysis)
- Analyzes text/communication for authority signals
- Returns FrameScore (0-100) with diagnostic feedback
- File: `lib/llm/geminiService.ts`

### 2. Application Page AI Chat
- JSON-driven conversation flow
- Evaluates prospects for coaching fit
- Config files: `data/applicationFlow.json` (planned)

### 3. Beta Page AI Chat
- Evaluates beta applicants
- Screens for early adopter fit
- Config files: `data/betaFlow.json` (planned)

### 4. Little Lord (In-App AI)
- Context-aware AI assistant
- Pattern detection and coaching
- Files: `services/littleLord/`, `components/littleLord/`

---

## Key Files & Their Purposes

| File | Purpose |
|------|---------|
| `App.tsx` | **Main router** - Controls which view is shown (landing, dashboard, etc.) |
| `index.tsx` | React entry point - Mounts App to DOM |
| `components/Dashboard.tsx` | CRM OS interface |
| `components/Scanner.tsx` | FrameScan demo on landing page |
| `components/Features.tsx` | Feature grid on landing page |
| `components/Pricing.tsx` | Pricing section on landing page |
| `components/ApplicationPage.tsx` | Coaching application with AI chat |
| `components/BetaPage.tsx` | Beta program application |
| `components/notes/AffineNotes.tsx` | Full notes interface with BlockSuite |
| `lib/blocksuite/theme.css` | BlockSuite editor styling |

---

## The CRM OS (Dashboard Mode)

FrameLord is also a local-first CRM OS built with React and TypeScript. The entire system is organized around a single canonical spine: the Contact object. Contact Zero represents the user themselves, and all data flows outward from Contact Zero to every other entity in the graph. The application runs entirely in-memory with no backend, using service-based stores as the single source of truth. AI agents are deeply integrated for frame analysis, coaching evaluation, and the Little Lord pattern detection system.

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

## REQUIRED READING: Post-Mortem on Branch Mistakes

**Before making ANY git operations, read: `DEADLY_ERROR_AND_HOW_TO_AVOID.md`**

This document contains a detailed post-mortem of how an AI destroyed work by:
1. Switching to the wrong branch without checking first
2. Using `rm -rf` on directories without listing contents
3. Not asking which branch had the user's current work

**Every AI deployment MUST read this file first.**

---

## Safe Feature Branch Testing (CRITICAL)

When the user asks to test a new feature, library, or experimental change, follow this EXACT protocol:

### Step 1: ALWAYS Check Branch State First

```bash
# Before ANY git operations, run these commands:
git branch -a                    # See all branches
git log --all --oneline -10      # See recent commits on all branches
git status                       # See current state and working branch
```

### Step 2: ASK the User Which Branch Has Their Current Work

```
"I see these branches:
- main (commit abc123)
- fix/blocksuite-slash-menu-focus (commit def456)
- feature/some-feature (commit ghi789)

Which branch has your current work that I should NOT touch?"
```

**Never assume `main` is the active development branch.**

### Step 3: Create a Test Branch FROM the Correct Branch

```bash
# First, checkout the branch with current work
git checkout [user's-working-branch]

# THEN create a test branch from it
git checkout -b test/[experiment-name]
```

### Step 4: Commit Experimental Work Before Testing

```bash
# Save current work to the test branch
git add .
git commit -m "[Test] Experimental: [description]"
```

### Step 5: If Experiment Fails - Safe Rollback

```bash
# Option A: Discard all changes and return to working branch
git stash
git checkout [user's-working-branch]
git stash drop

# Option B: Keep experimental branch for reference
git checkout [user's-working-branch]
# The test branch remains for future reference
```

### Step 6: NEVER Use Destructive Commands Without Checking

**BEFORE using `rm -rf`:**
```bash
# ALWAYS list directory contents first
ls -la [directory]

# THEN delete only specific files you know are safe
rm -f [specific-file]  # NOT rm -rf [directory]
```

### Complete Safe Testing Example

```bash
# 1. Understand the repo
git branch -a
git log --all --oneline -10

# 2. Ask user: "Which branch has your work?"
# User says: "fix/blocksuite-slash-menu-focus"

# 3. Create test branch from their branch
git checkout fix/blocksuite-slash-menu-focus
git checkout -b test/shadcn-ui-integration

# 4. Make experimental changes
npm install some-package
# ... edit files ...

# 5. Commit the experiment
git add .
git commit -m "[Test] Experimental shadcn/ui integration"

# 6. If it fails, safe rollback:
git checkout fix/blocksuite-slash-menu-focus
# User's work is untouched

# 7. If it works, merge or inform user
git checkout fix/blocksuite-slash-menu-focus
git merge test/shadcn-ui-integration
```

### What Will Get You Banned

❌ `git checkout main` without checking which branch has work
❌ `rm -rf components/ui` without listing contents first
❌ Assuming any branch is safe to modify
❌ Not committing experimental work before switching branches
❌ Using destructive commands when user is frustrated (SLOW DOWN)

---

## Protected Directories (NEVER rm -rf)

These directories contain project-specific code. NEVER delete the entire directory:

| Directory | Contents | Why Protected |
|-----------|----------|---------------|
| `components/ui/` | TabNavigation.tsx, custom UI components | Project-specific, not library code |
| `components/notes/` | BlockSuite editors, AffineNotes | Core notes functionality |
| `components/crm/` | Dashboard views, contact management | Core CRM functionality |
| `services/` | All data stores | Single source of truth |
| `lib/` | Utilities, BlockSuite config | Core infrastructure |

**If a library (like shadcn) adds files to these directories, delete only the specific files the library added, NOT the directory.**

---

## Critical Files That Exist

These files already exist in the project. Do NOT assume they were created by external tools:

```
components/ui/TabNavigation.tsx    # Custom tab navigation - EXISTS
components/notes/AffineNotes.tsx   # Main notes interface - EXISTS
components/notes/BlockSuiteDocEditor.tsx  # Editor component - EXISTS
lib/blocksuite/themes.ts           # Theme configuration - EXISTS
lib/blocksuite/theme.css           # Theme styles - EXISTS
```

**Before deleting ANY file, verify it wasn't part of the original project.**

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

## Troubleshooting (REQUIRED READING)

**When encountering bugs, ALWAYS read: `TROUBLESHOOTING.md`**

This document contains:
- Common issue patterns and their solutions
- Debugging console.log patterns
- Quick fixes checklist
- File reference for trouble spots

**Detailed postmortems** are in `app_info/`:
- `2025-12-05_black_screen_bug_postmortem.md` - BlockSuite DOM conflicts
- `2025-12-08_framescan_demo_data_postmortem.md` - Schema mismatch issues

### Quick Debugging Protocol

1. **Open Browser DevTools Console** (Cmd+Option+J)
2. **Find the actual error** - Look for TypeError/ReferenceError with line numbers
3. **Trace to source** - The error points to the real problem (not the symptom)
4. **Check schema match** - Does data structure match the TypeScript interface?
5. **Add console.log** - Trace data flow from creation to consumption

### Most Common Issue: "Data Not Loading"

**Reality:** Data IS loading, but component crashes on render.

**How to fix:**
1. Look for `Cannot read properties of undefined (reading 'X')` in console
2. Find the file:line in the error
3. Check if the data structure matches the expected interface
4. Update data source OR add defensive checks (`obj?.nested?.property`)

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

---

## Additional Safety Protocols

### Package.json Protection

Before modifying package.json:
1. Run `npm ls` to see current dependency tree
2. Check if the new package conflicts with existing ones
3. NEVER remove a dependency without searching codebase for imports first:
   ```bash
   grep -r "from 'package-name'" --include="*.ts" --include="*.tsx"
   ```
4. After adding packages, verify build still works: `npm run build`

**Known sensitive dependencies:**
- `@blocksuite/*` - Versions must stay in sync (all 0.19.5)
- `react/react-dom` - Must be same major version
- `framer-motion` - Animation system, removal breaks UI

---

### Configuration File Protection

These files affect the entire build. Modifying them incorrectly breaks everything:

| File | Risk Level | What It Controls |
|------|------------|------------------|
| `vite.config.ts` | 🔴 CRITICAL | Build system, dev server |
| `tsconfig.json` | 🔴 CRITICAL | TypeScript compilation |
| `index.html` | 🟡 HIGH | Entry point, CDN scripts |
| `.env*` files | 🔴 CRITICAL | API keys, secrets |

**Before modifying any config file:**
1. Read the entire file first
2. Explain what you're changing and why
3. Make ONE change at a time
4. Test build immediately after

---

### Types.ts Modifications

The `types.ts` file defines interfaces used across the entire app.

**Before modifying types.ts:**
1. Search for all usages of the type you're changing:
   ```bash
   grep -r "TypeName" --include="*.ts" --include="*.tsx"
   ```
2. Changing a type can break 50+ files silently
3. NEVER remove properties - mark as optional with `?` first
4. Add new properties as optional initially

---

### Store Safety (Data Integrity)

Stores in `/services/` are the single source of truth.

**NEVER:**
- Directly mutate store data outside store functions
- Create local state that duplicates store data
- Use `useState` for data that should be in a store

**ALWAYS:**
- Use store functions: `createNote()`, `updateContact()`, etc.
- Read from stores, never from component state for shared data
- Check if a store function exists before creating a new one

---

### CSS Modification Safety

Global CSS changes can break the entire UI.

**Before modifying:**
- `index.css` - Global styles
- `lib/blocksuite/theme.css` - Editor theming
- Any file with `@layer` or `:root`

**Do this:**
1. Check what components use these styles
2. Make changes scoped (use component-specific classes)
3. Test in both light AND dark modes
4. Test the Notes editor specifically (BlockSuite Shadow DOM)

---

### Secrets Safety

**NEVER commit:**
- `.env` files
- API keys in code
- Hardcoded credentials

**If you see an API key in code:**
1. STOP
2. Tell the user immediately
3. Help move it to environment variables

**Check before commits:**
```bash
git diff --cached | grep -i "api_key\|secret\|password\|token"
```

---

### Build Verification Protocol

After ANY code change, verify:

```bash
# 1. TypeScript compiles
npx tsc --noEmit

# 2. Dev server starts
npm run dev

# 3. Build succeeds (for significant changes)
npm run build
```

If build fails, FIX IT before moving on. Never leave broken builds.

---

### Multiple AI Sessions Warning

If user mentions another AI is working on the project:

1. ASK what files the other AI is modifying
2. AVOID those files until synced
3. Run `git status` to see uncommitted changes
4. Consider: should you wait for the other AI to finish?

**Never assume you have exclusive access to the codebase.**
