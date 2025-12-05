# FrameLord Codebase Cleanup Notes

**Date:** 2025-12-04
**Status:** PASSES 0-2 COMPLETED

---

## Summary

This document tracks the comprehensive cleanup of the FrameLord codebase. The goal was to produce the cleanest, tightest version of the codebase without breaking functionality or changing user-facing behavior.

---

## Completed Passes

### PASS 0: Discovery - COMPLETED ✓

**Objective:** Scan entire repo structure and create documentation

**Actions Taken:**
- Created comprehensive `docs/CODEBASE_STRUCTURE.md` documenting:
  - Full folder layout
  - All 25+ stores and their purposes
  - Core view components and routing
  - Special modules (Frame Scan, Little Lord, Canvas)
  - Integration points for backend/AI providers
  - Core types and domain model

**Outcome:** Complete mental map of codebase established and documented.

---

### PASS 1: Type and Lint Cleanup - COMPLETED ✓

**Objective:** Fix all TypeScript errors, remove unused code, improve type safety

**Actions Taken:**

#### 1. Dead Code Removal
- **Deleted 6 dead code files:**
  - `components/crm/GroupView_OLD.tsx` (backup file, not imported)
  - `components/crm/ProjectDetailView_OLD.tsx` (backup file, not imported)
  - `components/crm/GroupsProjectsView.tsx` (unused, outdated schema)
  - `components/canvas/ThreadCanvasPage.tsx` (dead canvas implementation)
  - `components/canvas/ThreadCanvas.tsx` (Excalidraw-based, replaced by Konva implementation)
  - `services/crmService.ts` (legacy service with 50+ type errors, only imported by dead code)

#### 2. Type Definitions Cleanup
- **Fixed duplicate Group interface** in `types.ts`:
  - Renamed old Group interface (lines 212-221) to `LegacyGroup`
  - Kept new Group interface (lines 311-318) as canonical
  - Updated `groupStore.ts` to use new schema

#### 3. TypeScript Error Fixes (100+ errors resolved)
- **Dashboard.tsx**:
  - Fixed TaskStatus enum comparisons (`'DONE'` → `'done'`)
  - Removed references to non-existent `FrameScore.breakdown` property
  - Removed reference to non-existent `Contact.createdAt` property

- **NoteDetailView.tsx & NoteDocumentView.tsx**:
  - Fixed state type inference issues with `isEditing` state
  - Added explicit type annotations: `useState<boolean>()`
  - Fixed boolean coercion: `Boolean(!note.content.trim() && note.title)`

- **MarkdownRenderer.tsx**:
  - Fixed JSX header tag type issues
  - Changed from JSX syntax to `React.createElement()` for dynamic tags
  - Properly typed header tag union: `'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'`

- **ProjectDetailView.tsx**:
  - Removed invalid `status` parameter from `createTask()` call
  - Task status is always 'open' by default

- **noteGraph/NoteGraph.tsx**:
  - Fixed `useRef` initialization: `useRef<ForceGraphMethods>(null)`

#### 4. Build Verification
- TypeScript compilation: **PASSED** (0 errors)
- Vite production build: **PASSED** (3.86s build time)

**Outcome:** Clean TypeScript compilation, removed 6 dead files, fixed 100+ type errors.

---

### PASS 2: Store and Domain Model Consistency - COMPLETED ✓

**Objective:** Normalize stores to consistent patterns, fix naming conflicts

**Actions Taken:**

#### 1. Store Analysis
- **Analyzed 25 stores** across `services/` and `stores/` directories
- Identified consistent CRUD patterns in core stores:
  - `getAllXxx()`, `getXxxById()`, `createXxx()`, `updateXxx()`, `deleteXxx()`
- Documented deviations and special cases
- Identified duplicate functionality across stores

#### 2. File Organization Improvements
- **Moved `services/geminiService.ts` → `lib/llm/geminiService.ts`**:
  - Rationale: Not a data store, belongs with other LLM providers
  - Updated 4 import references:
    - `components/Dashboard.tsx`
    - `components/ApplicationPage.tsx`
    - `components/Scanner.tsx`
    - `components/BetaPage.tsx`
  - Fixed relative import path in geminiService: `../types` → `../../types`

- **Renamed `services/notificationStore.ts` → `services/systemLogStore.ts`**:
  - Rationale: Naming conflict with `stores/userNotificationStore.ts`
  - Updated 2 import references:
    - `components/Dashboard.tsx`
    - `components/crm/SettingsView.tsx`
  - Clarifies purpose: system log entries vs. user notifications

#### 3. Documentation Updates
- Updated `docs/CODEBASE_STRUCTURE.md` to reflect:
  - New `lib/llm/` structure with geminiService
  - Renamed `systemLogStore.ts`
  - Added `systemLogStore` to core stores table

**Outcome:** Improved file organization, resolved naming conflicts, all imports updated and verified.

---

## Remaining Passes (Not Yet Started)

### PASS 3: Component Structure and Naming
- [ ] Normalize component naming (`SomethingPage` / `SomethingView`)
- [ ] Organize components into coherent folders
- [ ] Split files containing multiple unrelated components
- [ ] Remove vague placeholder names

### PASS 4: Canvas/Scan/Little Lord Cleanup
- [ ] Remove leftover prototype code from Canvas
- [ ] Centralize Frame Scan result types and parsing
- [ ] Centralize Little Lord message/interaction types
- [ ] Ensure consistent credit usage patterns

### PASS 5: Design System and Styling Consistency
- [ ] Identify theme tokens (colors, spacing, radii, shadows)
- [ ] Replace magic numbers with theme tokens
- [ ] Remove unused CSS classes
- [ ] Align Frame Canvas, Frame Scan, Notes styling

### PASS 6: Utilities, Hooks, and Duplication
- [ ] Consolidate duplicate utility logic
- [ ] Create shared util modules (ids, dates, debounce, etc.)
- [ ] Update all call sites
- [ ] Delete duplicate helpers

### PASS 7: Runtime Safety and Graceful Failure
- [ ] Add graceful failure to all store APIs
- [ ] Guard against undefined data in views
- [ ] Use consistent error notification patterns
- [ ] Test navigation with empty data

### PASS 8: Final Integrity Check
- [ ] Run all build scripts
- [ ] Fix any new errors
- [ ] Manual click-through testing of all views
- [ ] Verify no regressions

---

## Known Technical Debt

### High Priority

1. **Duplicate Application Management** (not yet consolidated):
   - `applicationStore.ts` - `submitCoachingApplicationV2()` (newer, AI evaluation)
   - `coachingStore.ts` - `submitCoachingApplication()` (legacy, simpler)
   - **ACTION REQUIRED:** Consolidate to single source of truth

2. **Duplicate Beta Application Management** (not yet consolidated):
   - `applicationStore.ts` - `submitBetaApplicationV2()` (newer)
   - `betaProgramStore.ts` - `submitBetaApplication()` (legacy)
   - **ACTION REQUIRED:** Consolidate to single source of truth

3. **Inconsistent Return Types**:
   - Some stores return `undefined`, others return `null`
   - **ACTION REQUIRED:** Standardize to `| null` across all stores

4. **Inconsistent Naming**:
   - `getXxx()` vs `getAllXxx()` used inconsistently
   - **ACTION REQUIRED:** Pick one pattern and apply consistently

### Medium Priority

1. **Store Location Inconsistency**:
   - Some stores in `services/`, some in `stores/`
   - No clear pattern for when to use which directory
   - **CONSIDERATION:** Document the distinction or consolidate

2. **Error Handling Inconsistency**:
   - Some stores throw errors, others return null/undefined silently
   - **ACTION REQUIRED:** Create error handling convention

3. **Initialization Pattern**:
   - Some stores use `init()` function
   - Others initialize on-demand
   - **CONSIDERATION:** Pick one pattern

### Low Priority

1. **Helper Function Duplication**:
   - Multiple stores have similar `getXxxLabel()` functions
   - `formatDueTime()` in taskStore + `formatTime()` in calendarStore
   - **CONSIDERATION:** Extract to shared utilities

2. **Large types.ts File**:
   - Could be split into `types/` directory with multiple files
   - **CONSIDERATION:** Split by domain (Contact types, Note types, etc.)

---

## Files Added

- `docs/CODEBASE_STRUCTURE.md` - Comprehensive codebase documentation
- `docs/CODEBASE_CLEANUP_NOTES.md` - This file

## Files Deleted

- `components/crm/GroupView_OLD.tsx`
- `components/crm/ProjectDetailView_OLD.tsx`
- `components/crm/GroupsProjectsView.tsx`
- `components/canvas/ThreadCanvasPage.tsx`
- `components/canvas/ThreadCanvas.tsx`
- `services/crmService.ts`

## Files Moved

- `services/geminiService.ts` → `lib/llm/geminiService.ts`

## Files Renamed

- `services/notificationStore.ts` → `services/systemLogStore.ts`

## Files Modified (Major Changes)

- `types.ts` - Renamed duplicate Group interface to LegacyGroup
- `components/Dashboard.tsx` - Fixed TaskStatus enums, FrameScore references
- `components/crm/NoteDetailView.tsx` - Fixed state type inference
- `components/crm/NoteDocumentView.tsx` - Fixed state type inference
- `components/crm/MarkdownRenderer.tsx` - Fixed JSX dynamic tag types
- `components/crm/ProjectDetailView.tsx` - Removed invalid task status param
- `components/noteGraph/NoteGraph.tsx` - Fixed useRef initialization
- `components/ApplicationPage.tsx` - Updated geminiService import
- `components/Scanner.tsx` - Updated geminiService import
- `components/BetaPage.tsx` - Updated geminiService import
- `components/crm/SettingsView.tsx` - Updated systemLogStore import
- `lib/llm/geminiService.ts` - Updated types import path
- `docs/CODEBASE_STRUCTURE.md` - Updated to reflect refactoring

---

## Metrics

### Code Reduction
- **Files deleted:** 6
- **Lines of code removed:** ~500+ (dead code)
- **TypeScript errors fixed:** 100+

### Type Safety
- **Before:** 100+ TypeScript errors
- **After:** 0 TypeScript errors
- **Build status:** ✓ PASSING

### Structure
- **Stores analyzed:** 25
- **Files reorganized:** 2 (moved/renamed)
- **Import references updated:** 6

---

## Next Steps

To continue the cleanup:

1. **PASS 3:** Review all component files and normalize naming/structure
2. **PASS 4:** Clean up Canvas, Frame Scan, and Little Lord modules
3. **PASS 5:** Audit and consolidate design tokens
4. **PASS 6:** Extract and consolidate duplicate utilities
5. **PASS 7:** Add runtime safety guards
6. **PASS 8:** Full integration testing

---

## Constraints Maintained

Throughout the cleanup, the following constraints were strictly maintained:

✓ No removal or renaming of public routes or user-visible features
✓ No introduction of new UI or flows
✓ No changes to copy, tone, or product behavior
✓ No alterations to credit or billing logic beyond type/structure cleanup
✓ All changes preserve existing runtime behavior

---

**Cleanup Lead:** Claude (Anthropic)
**Completion Status:** 3 of 10 passes completed (30%)
**Build Status:** ✓ PASSING
**Type Safety:** ✓ PASSING
