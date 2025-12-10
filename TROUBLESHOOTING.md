# FrameLord Troubleshooting Guide

This document contains common issues, debugging patterns, and solutions for the FrameLord codebase. **AI agents should reference this document when encountering bugs.**

---

## Quick Debugging Protocol

When something "isn't working":

1. **Open Browser DevTools Console** (Cmd+Option+J on Mac)
2. **Look for the actual error** - The symptom (e.g., "data not loading") is rarely the cause
3. **Trace the error to its source file and line number**
4. **Check if the error is a schema/interface mismatch**
5. **Add console.log statements** at key points to trace data flow

---

## Common Issue Patterns

### Pattern 1: "Data Not Loading" → Actually a Component Crash

**Symptom:** UI shows empty state, no data appears after action
**Reality:** Data IS loading, but a component crashes when rendering it

**How to diagnose:**
```
1. Check console for TypeError/ReferenceError
2. Look for "Cannot read properties of undefined (reading 'X')"
3. The error will point to the actual broken component
```

**Root cause:** Usually a schema mismatch between:
- Data being created (seed data, API response, etc.)
- Interface the component expects

**Example:** FrameScan demo data had `uiReport: { summary }` but component expected `uiReport.header.title`

**Fix pattern:**
1. Read the TypeScript interface the component expects
2. Update the data source to match the interface exactly
3. Test by clicking through to the detail view

---

### Pattern 2: Store Updates Not Reflecting in UI

**Symptom:** Data is added to store (confirmed via console.log) but UI doesn't update

**Root causes:**
1. **Missing subscription mechanism** - Store lacks `subscribe()` and `getSnapshot()`
2. **Component not subscribed** - Uses `useMemo` instead of `useSyncExternalStore`
3. **Array reference unchanged** - Store mutates array in place instead of creating new reference

**How to verify:**
```typescript
// Add to store
console.log('[Store] Adding item, listeners:', listeners.size);

// Add to component
console.log('[Component] Render, data count:', data.length);
```

If store shows listeners=0, the component isn't subscribed.

**Fix pattern:**
```typescript
// In store - add subscription mechanism
let listeners: Set<() => void> = new Set();

const emitChange = () => {
  listeners.forEach(listener => listener());
};

export const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const getSnapshot = (): DataType[] => STORE_DATA;

// In component - use useSyncExternalStore
import { useSyncExternalStore } from 'react';
const data = useSyncExternalStore(subscribe, getSnapshot);
```

---

### Pattern 3: TypeScript Interface Mismatch

**Symptom:** Runtime TypeError accessing nested properties
**Compile time:** No TypeScript errors (data typed as `any` or loose interface)

**How to diagnose:**
```typescript
// Check what interface the consumer expects
interface FrameScanUIReport {
  header: { title: string; ... };  // Component needs this
  sections: [...];
}

// Check what's actually being created
const uiReport = {
  summary: '...',  // WRONG - missing header/sections
};
```

**Prevention:**
1. Never use `any` for complex data structures
2. Import and use the exact interface from the type definition file
3. TypeScript will catch mismatches at compile time

---

### Pattern 4: "if (obj)" Check Passes But Nested Access Fails

**Symptom:** Conditional check passes, but accessing properties crashes

```typescript
if (ui) {
  // ui is truthy (an object exists)
  return <div>{ui.header.title}</div>;  // CRASH: ui.header is undefined
}
```

**Why this happens:**
- `if (obj)` only checks if obj is truthy (not null/undefined)
- An empty object `{}` passes the check
- Accessing `obj.nested.property` still fails

**Fix pattern:**
```typescript
// Option 1: Deep check
if (ui?.header?.title) {
  return <div>{ui.header.title}</div>;
}

// Option 2: Validate structure
const hasValidUI = ui && ui.header && typeof ui.header.title === 'string';
```

---

### Pattern 5: Demo/Seed Data Schema Drift

**Symptom:** Demo data works initially, breaks after interface changes

**Why this happens:**
- Core interfaces evolve (`FrameScanUIReport` gets new required fields)
- Seed data files (`seedFrameScans.ts`) aren't updated
- No TypeScript error because seed data uses loose typing

**Prevention:**
1. Seed data should import and use the exact interface types
2. Add a comment linking seed data to the interface it must match
3. Run the demo flow after any interface changes

**Files to check:**
- `src/dev/seedFrameScans.ts` → `src/lib/frameScan/frameReportUI.ts`
- Any `seed*.ts` or `demo*.ts` files

---

## Debugging Console.log Patterns

### For Store Issues
```typescript
// In store file
console.log('[StoreName] Operation, count:', STORE_DATA.length, 'listeners:', listeners.size);

// In component
console.log('[ComponentName] Render, data:', data.length);
```

### For Data Flow Issues
```typescript
// At creation point
console.log('[Module] Creating item:', JSON.stringify(item, null, 2));

// At consumption point
console.log('[Component] Received item:', item);
console.log('[Component] item.nested:', item?.nested);
```

### For Event Flow Issues
```typescript
// In event handler
console.log('[Component] Button clicked');
console.log('[Component] Calling function with:', args);

// In called function
console.log('[Function] Received:', args);
console.log('[Function] Result:', result);
```

---

## File Reference: Common Trouble Spots

| Area | Files | Common Issues |
|------|-------|---------------|
| FrameScan | `frameScanReportStore.ts`, `FrameScanPage.tsx`, `FrameScanReportDetail.tsx`, `seedFrameScans.ts` | Schema mismatch in uiReport, missing store subscriptions |
| Notes/BlockSuite | `AffineNotes.tsx`, `BlockSuiteDocEditor.tsx` | DOM conflicts, ref ordering, hoisting errors |
| Contact Spine | `contactStore.ts`, all components using contacts | Contact Zero handling, missing contact checks |
| Store Subscriptions | All `*Store.ts` files | Missing emitChange(), listener management |

---

## Quick Fixes Checklist

When something breaks, check these in order:

- [ ] **Console errors** - What's the actual error message?
- [ ] **Line number** - Which file/line is crashing?
- [ ] **Interface match** - Does the data match the expected interface?
- [ ] **Store subscription** - Is the component subscribed to store changes?
- [ ] **Null checks** - Are nested properties accessed safely?
- [ ] **Demo data** - Does seed data match current interfaces?

---

## Related Postmortems

Detailed bug investigations are documented in `app_info/`:

- `2025-12-05_black_screen_bug_postmortem.md` - BlockSuite DOM conflicts, hoisting errors
- `2025-12-08_framescan_demo_data_postmortem.md` - uiReport schema mismatch

---

## Adding to This Document

When you fix a bug:

1. Identify the **pattern** (not just the specific fix)
2. Add the pattern to the appropriate section above
3. Create a detailed postmortem in `app_info/` for complex bugs
4. Update the "Related Postmortems" section

This keeps the troubleshooting guide focused on patterns while preserving detailed context in postmortems.
