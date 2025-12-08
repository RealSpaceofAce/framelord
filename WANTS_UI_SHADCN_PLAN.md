# WANTS_UI_SHADCN_PLAN.md
## UI Enhancement Plan: shadcn-ui, ReactBits, and Notion-style Scope

**Created**: 2025-12-07
**Status**: Ready for Implementation

---

## Overview

This plan integrates shadcn-ui and ReactBits patterns into the Wants module while creating a Notion-style presentation for WantScope and adding a per-Want Steps Kanban board.

### Key Decisions

1. **shadcn-ui Integration**:
   - Install Radix UI primitives (foundation of shadcn) and copy shadcn component patterns
   - The app uses Tailwind via CDN in index.html - we'll enhance with proper Tailwind config
   - Components will be local to `src/components/ui/` (not a runtime dependency)

2. **ReactBits Usage**:
   - Pattern inspiration only, NOT a runtime dependency
   - Specifically reference: Kanban layouts, Stats cards, Status pills

3. **DnD Support**:
   - @dnd-kit is already installed - reuse for Steps Kanban board

4. **Scope Constraints**:
   - Changes confined to Wants module only
   - No changes to Wants Board/Progress logic
   - No changes to guardrails, Little Lord, or demo seeding

---

## PHASE 0: LIBRARY INTEGRATION

### Goal
Set up shadcn-ui primitives and establish the component foundation.

### Tasks

#### 0.1 Install Radix UI Primitives
```bash
npm install @radix-ui/react-slot @radix-ui/react-tabs class-variance-authority clsx tailwind-merge
```

Required for shadcn-ui component patterns.

#### 0.2 Create Utility Function
**File**: `src/lib/utils.ts`
```typescript
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

#### 0.3 Add shadcn-ui Components (Local Copies)
**Directory**: `src/components/ui/`

Components to add:
- `Card.tsx` - Card, CardHeader, CardContent, CardFooter
- `Badge.tsx` - Status badges with variants
- `Button.tsx` - Button with variants
- `Tabs.tsx` - Tab navigation (Radix-based)
- `ScrollArea.tsx` - Optional, for long lists

These are local copies following shadcn patterns, NOT imports from a shadcn package.

#### 0.4 Tailwind Config Enhancement
**File**: `tailwind.config.ts` (new)

Create proper Tailwind config for build process with shadcn color tokens and CSS variables.

#### 0.5 Update Global Styles
**File**: `src/styles/theme.css`

Add shadcn CSS variables for light/dark themes without breaking existing dark chrome.

### Verification
- Build passes: `npm run build`
- No runtime errors in dev mode
- Existing Wants views unchanged

---

## PHASE 1: NOTION-STYLE SCOPE SURFACE

### Goal
Transform WantScopeView inner content to feel like a white Notion page inside the dark FrameLord shell.

### Design Principles
- **Outer chrome**: Remains dark (bg-[#0A0A0A], dark borders)
- **Inner content**: White/light card with subtle shadow
- **Typography**: Generous line-height, clear headings
- **Dividers**: Light gray lines, not heavy borders

### Tasks

#### 1.1 Create NotionCard Component
**File**: `src/components/ui/NotionCard.tsx`

A wrapper component for Notion-style light content areas:
- White background (`bg-white`)
- Subtle shadow (`shadow-md`)
- Rounded corners (`rounded-xl`)
- Inner padding (`p-6`)

#### 1.2 Create NotionSection Component
**File**: `src/components/ui/NotionSection.tsx`

Section divider with heading:
- Light divider line
- Bold section title
- Consistent spacing

#### 1.3 Modify WantScopeView
**File**: `src/components/wants/WantScopeView.tsx`

Changes:
1. Wrap all inner content in `<NotionCard>` container
2. Apply NotionSection to:
   - Objective section
   - Daily Metrics table
   - Charts section
   - Iteration log
   - Doctrine notes
3. Update text colors inside card (dark text on white bg)
4. Preserve ALL existing functionality:
   - Metrics table inline editing
   - Footer calculations (averages, sums, derived)
   - Chart rendering
   - Iteration log display

#### 1.4 Notion-Style Table Styling
Inside the NotionCard, update MetricsTable:
- Light gray header row
- Subtle row hover states
- Thin borders between rows
- Maintain editable cell functionality

### Verification
- WantScopeView renders white inner surface
- Dark header/navigation preserved
- All metrics, charts, iterations still work
- Edit functionality intact

---

## PHASE 2: PER-WANT STEPS KANBAN BOARD

### Goal
Add a Kanban board view for each Want's steps, styled like the Notion screenshot.

### Data Model
Reuse existing `WantStep` from `wantStore.ts`:
```typescript
interface WantStep {
  id: string;
  title: string;
  deadline: string | null;
  status: WantStatus; // 'not_started' | 'in_progress' | 'done'
}
```

### Tasks

#### 2.1 Create StepCard Component
**File**: `src/components/wants/steps/StepCard.tsx`

Individual step card for Kanban:
- Title display
- Due date badge (if present)
- Status pill (colored by status)
- Drag handle
- Uses shadcn Card pattern

#### 2.2 Create StepColumn Component
**File**: `src/components/wants/steps/StepColumn.tsx`

Kanban column container:
- Column header with count badge
- Droppable area
- Scrollable step list
- Column-specific styling (Not Started = gray, In Progress = amber, Done = green)

#### 2.3 Create WantStepsBoardView Component
**File**: `src/components/wants/WantStepsBoardView.tsx`

Main Kanban board view:
- Props: `wantId: string`, `onBack: () => void`
- Three columns: Not Started, In Progress, Done
- Uses @dnd-kit for drag-and-drop
- Calls existing store functions:
  - `getWantById(wantId)` for steps
  - `updateStep(wantId, stepId, { status })` on drop
- Add step functionality
- Notion-style white surface using NotionCard

#### 2.4 Integrate into WantDetailView
**File**: `src/components/wants/WantDetailView.tsx`

Changes:
1. Add new tab "Steps Board" alongside existing tabs
2. Tab renders `<WantStepsBoardView wantId={wantId} />`
3. Preserve existing step list view as default

#### 2.5 Update WantsPage Routing (Optional)
**File**: `src/components/wants/WantsPage.tsx`

If needed, add route handling for `/wants/:wantId/steps-board`.

### DnD Implementation Details

Using @dnd-kit (already installed):
```typescript
import { DndContext, DragEndEvent, closestCorners } from '@dnd-kit/core';
import { SortableContext, useSortable } from '@dnd-kit/sortable';
```

On drag end:
1. Determine target column status
2. Call `updateStep(wantId, stepId, { status: newStatus })`
3. Store notifies listeners, UI updates automatically

### Verification
- Kanban board renders with correct columns
- Steps appear in correct columns by status
- Drag-and-drop changes step status
- Progress view reflects status changes
- Add step functionality works

---

## PHASE 3: SHADCN POLISH FOR WANTS LISTS

### Goal
Apply shadcn styling to Wants list surfaces for visual consistency.

### Tasks

#### 3.1 Update ScopeListView in WantsPage
**File**: `src/components/wants/WantsPage.tsx`

The `ScopeListView` component (internal to WantsPage):
- Wrap each Want row in shadcn Card
- Replace custom badges with shadcn Badge:
  - Congruency score (variant by score range)
  - "Inert" warning badge
  - Iteration/notes count badges
- Use consistent spacing and hover states

#### 3.2 Update Wants Connected in ContactDossierView
**File**: `src/components/crm/ContactDossierView.tsx`

The "Wants Connected" section:
- Apply shadcn Card to each Want item
- Use Badge for status indicators
- Consistent with Scope list styling

#### 3.3 Create StatusBadge Component
**File**: `src/components/ui/StatusBadge.tsx`

Specialized badge for Want/Step statuses:
- not_started: Gray variant
- in_progress: Amber/Yellow variant
- done: Green variant
- Reusable across Wants module

#### 3.4 Create CongruencyBadge Component
**File**: `src/components/ui/CongruencyBadge.tsx`

Congruency score display:
- Score >= 70: Green
- Score 40-69: Yellow/Amber
- Score < 40: Red/Rose
- Shows numeric score with color-coded background

### Verification
- Scope list view has consistent card styling
- Wants Connected section matches styling
- Badges render with correct colors
- No functional changes to data or navigation

---

## PHASE 4: VERIFICATION

### Comprehensive Testing Checklist

#### Demo Data Flow
- [ ] `npm run dev` starts without errors
- [ ] "Load Demo" button seeds 3 Wants
- [ ] Board view shows 3 demo Wants
- [ ] Progress view shows 3 demo Wants
- [ ] Scope view shows 3 demo Wants with metrics

#### Notion-Style Scope
- [ ] WantScopeView has white inner surface
- [ ] Dark header/navigation preserved
- [ ] Objective section editable
- [ ] Metrics table renders with data
- [ ] Footer shows averages/sums correctly
- [ ] Charts render with data
- [ ] Iteration log displays entries
- [ ] Doctrine notes display

#### Steps Kanban Board
- [ ] Access via tab in WantDetailView
- [ ] Three columns render: Not Started, In Progress, Done
- [ ] Demo Want steps appear in correct columns
- [ ] Drag step between columns changes status
- [ ] Status change reflects in Progress view
- [ ] Add new step works
- [ ] Delete step works (if implemented)

#### Visual Polish
- [ ] Scope list uses shadcn Cards
- [ ] Badges render with correct variants
- [ ] Congruency scores color-coded
- [ ] Status badges consistent across views

#### Guardrails & Little Lord
- [ ] Respect gate still functions
- [ ] Guardrail violations trigger correctly
- [ ] Little Lord chat unaffected
- [ ] seedWants.ts unchanged

#### Build Verification
- [ ] `npm run build` passes
- [ ] No TypeScript errors
- [ ] No `any` type additions

---

## File Summary

### New Files
| File | Purpose |
|------|---------|
| `src/lib/utils.ts` | cn() utility for class merging |
| `src/components/ui/Card.tsx` | shadcn Card component |
| `src/components/ui/Badge.tsx` | shadcn Badge component |
| `src/components/ui/Button.tsx` | shadcn Button component |
| `src/components/ui/Tabs.tsx` | shadcn Tabs component (Radix) |
| `src/components/ui/NotionCard.tsx` | Notion-style light surface wrapper |
| `src/components/ui/NotionSection.tsx` | Notion-style section divider |
| `src/components/ui/StatusBadge.tsx` | Status-aware badge |
| `src/components/ui/CongruencyBadge.tsx` | Congruency score badge |
| `src/components/wants/steps/StepCard.tsx` | Kanban step card |
| `src/components/wants/steps/StepColumn.tsx` | Kanban column |
| `src/components/wants/WantStepsBoardView.tsx` | Per-Want Kanban board |
| `tailwind.config.ts` | Tailwind configuration |

### Modified Files
| File | Changes |
|------|---------|
| `src/styles/theme.css` | Add shadcn CSS variables |
| `src/components/wants/WantScopeView.tsx` | Notion-style surface |
| `src/components/wants/WantDetailView.tsx` | Add Steps Board tab |
| `src/components/wants/WantsPage.tsx` | Update ScopeListView styling |
| `src/components/crm/ContactDossierView.tsx` | Update Wants Connected styling |

### Untouched Files (Constraints)
- `src/dev/seedWants.ts` - Demo seeding logic
- `src/lib/agents/*` - Little Lord and guardrails
- `src/components/littleLord/*` - Chat and respect gate
- `src/services/wantStore.ts` - Data model (except calling existing functions)
- `src/services/wantScopeStore.ts` - Scope data model

---

## Execution Order

1. **Phase 0** (Library Integration)
   - Install dependencies
   - Create utils.ts
   - Add UI components
   - Update styles

2. **Phase 1** (Notion-Style Scope)
   - Create NotionCard, NotionSection
   - Modify WantScopeView

3. **Phase 2** (Steps Kanban)
   - Create StepCard, StepColumn
   - Create WantStepsBoardView
   - Integrate into WantDetailView

4. **Phase 3** (Polish)
   - Create StatusBadge, CongruencyBadge
   - Update list views

5. **Phase 4** (Verification)
   - Run through checklist
   - Fix any issues
   - Final build verification

---

## Commit Strategy

Each phase should be a separate commit:
- `[Feature] Phase 0: shadcn-ui library integration`
- `[Feature] Phase 1: Notion-style scope surface`
- `[Feature] Phase 2: Per-Want steps Kanban board`
- `[Feature] Phase 3: shadcn polish for Wants lists`
- `[Chore] Phase 4: Final verification and cleanup`
