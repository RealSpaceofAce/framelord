# FrameScan Demo Data Not Loading Postmortem

**Date:** 2025-12-08
**Status:** RESOLVED

---

## Summary

The "Load Demo Data" button on the FrameScan page appeared to do nothing. Clicking it would not display any demo reports. The actual issue was that demo data WAS being created successfully, but the FrameScanReportDetail component crashed when trying to render it due to a schema mismatch in the `uiReport` field.

---

## Initial Symptom vs. Root Cause

| What it looked like | What it actually was |
|---------------------|---------------------|
| "Data not loading" | Component crash on render |
| Store not updating | Schema mismatch in uiReport |
| Missing reactivity | Accessing undefined nested properties |

**Key lesson:** The symptom (empty list) masked the real issue (render crash in detail view).

---

## Root Cause

### Schema Mismatch in `uiReport` Structure

**The seed data created:**
```typescript
uiReport: {
  summary: config.analysis.interpretation,
  topStrengths: ['Strong positioning', ...],
  topWeaknesses: config.analysis.recommendations.slice(0, 2),
  scoreLabel: config.score.frameScore >= 70 ? 'Strong Apex' : 'Needs Work',
}
```

**The `FrameScanReportDetail` component expected:**
```typescript
interface FrameScanUIReport {
  header: {
    title: string;
    oneLineVerdict: string;
    highlightScore: number;
    badges: string[];
  };
  sections: FrameScanUISection[];
}
```

**The crash point:** `FrameScanReportDetail.tsx:214`
```typescript
{ui.header.title}  // ui.header was undefined
```

**Why the check `if (ui)` passed:**
- `ui` was a truthy object `{ summary: '...', topStrengths: [...] }`
- But `ui.header` was `undefined`
- Accessing `ui.header.title` threw `TypeError: Cannot read properties of undefined`

---

## Debugging Process

### Phase 1: Wrong Hypothesis (Store Reactivity)

Initial assumption: Store wasn't triggering re-renders.

**Actions taken:**
1. Added subscription mechanism to `frameScanReportStore.ts`:
   - `listeners` Set for subscribers
   - `subscribe()` and `getSnapshot()` exports
   - `emitChange()` calls in CRUD operations
2. Updated `FrameScanPage.tsx` to use `useSyncExternalStore`

**Result:** Still didn't work. But this was a valid improvement for reactivity.

### Phase 2: Deep Debugging (Console Logs)

Added extensive logging throughout the data flow:

```typescript
// seedFrameScans.ts
console.log('[Demo FrameScan] seedDemoFrameScans() called');
console.log('[Demo FrameScan] localStorage flag:', hasFlag);
console.log('[Demo FrameScan] Existing reports count:', existingReports.length);
console.log('[Demo FrameScan] Created ${config.domain} report');

// frameScanReportStore.ts
console.log('[FrameScanStore] Added report, total count:', REPORTS.length, 'listeners:', listeners.size);

// FrameScanPage.tsx
console.log('[FrameScanPage] Load Demo Data button clicked');
console.log('[FrameScanPage] seedDemoFrameScans returned:', seeded);
```

### Phase 3: Console Output Revealed the Truth

**User's console showed:**
```
[Demo FrameScan] seedDemoFrameScans() called
[Demo FrameScan] Seeding demo FrameScan reports...
[Demo FrameScan] Created sales_email report (score: 82)
[Demo FrameScan] Created sales_email report (score: 34)
... (6 reports created)
[Demo FrameScan] Seeding complete. Created 6 reports.
FrameScanReportDetail.tsx:214 Uncaught TypeError: Cannot read properties of undefined (reading 'title')
```

**Insight:** Data was being created successfully! The error was in the detail view component, not the list or store.

---

## The Fix

Updated `seedFrameScans.ts` to create properly structured `uiReport`:

```typescript
// Build proper UI report structure
const uiReport = {
  header: {
    title: `${config.domain.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())} Analysis`,
    oneLineVerdict: config.analysis.interpretation.substring(0, 100),
    highlightScore: config.score.frameScore,
    badges: [
      config.score.overallFrame,
      config.score.frameScore >= 60 ? 'win-win' : 'needs-work',
    ],
  },
  sections: [
    {
      id: 'summary',
      title: 'Summary',
      mainParagraph: config.analysis.interpretation,
    },
    {
      id: 'strengths',
      title: 'Strengths',
      bullets: ['Strong positioning', 'Clear value proposition', 'Confident tone'],
    },
    {
      id: 'weaknesses',
      title: 'Weaknesses',
      bullets: config.analysis.recommendations.slice(0, 3),
    },
    {
      id: 'corrections',
      title: 'Corrections',
      corrections: config.analysis.recommendations.map((rec, i) => ({
        label: `Correction ${i + 1}`,
        description: rec,
        suggestedAction: 'Review and apply this change',
      })),
    },
  ],
};
```

---

## Files Changed

| File | Changes |
|------|---------|
| `src/services/frameScanReportStore.ts` | Added subscription mechanism (listeners, subscribe, getSnapshot, emitChange) |
| `src/components/crm/FrameScanPage.tsx` | Changed to useSyncExternalStore, added debug logging |
| `src/dev/seedFrameScans.ts` | **THE FIX:** Rewrote uiReport structure to match FrameScanUIReport interface |

---

## Key Lessons

1. **"Not loading" often means "crashing on render"**
   - Add console logs at data creation AND data consumption points
   - Look for errors in child components, not just the visible one

2. **Truthy checks don't validate structure**
   - `if (obj)` passes for `{}`
   - Use optional chaining: `obj?.nested?.property`
   - Or validate shape: `if (obj && obj.header && obj.header.title)`

3. **Seed/demo data must match current interfaces**
   - Import the actual TypeScript interface in seed files
   - Add comments linking seed data to the interface it must match
   - Test the full click-through flow, not just list view

4. **Multiple issues can mask each other**
   - The store DID lack reactivity (valid fix)
   - But the schema mismatch was the actual blocker
   - Fix both, but identify which was the true cause

---

## Prevention

1. **Type seed data strictly:**
   ```typescript
   import type { FrameScanUIReport } from '../lib/frameScan/frameReportUI';
   const uiReport: FrameScanUIReport = { ... };  // TypeScript will catch mismatches
   ```

2. **Add defensive checks in detail views:**
   ```typescript
   if (!ui?.header?.title) {
     return <div>Invalid report structure</div>;
   }
   ```

3. **Test demo data flow end-to-end:**
   - Click "Load Demo Data"
   - Click on a report card
   - Verify detail view renders

---

## Related Files

- Interface definition: `src/lib/frameScan/frameReportUI.ts`
- Detail view component: `src/components/crm/FrameScanReportDetail.tsx`
- Seed data: `src/dev/seedFrameScans.ts`
- Store: `src/services/frameScanReportStore.ts`
