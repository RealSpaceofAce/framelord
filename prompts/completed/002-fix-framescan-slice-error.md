<objective>
Fix the "Cannot read properties of undefined (reading 'slice')" error on the public FrameScan landing page.

This bug prevents users from seeing their FrameScan analysis results after running a diagnostic on the public scanner. This is a critical user-facing feature that must work reliably even when optional fields are missing from the LLM output.
</objective>

<context>
This is the FrameLord application - an AI-powered authority diagnostics platform. The public FrameScan is a free scanner on the landing page that analyzes text for communication weaknesses.

**Previous fix context:** We already fixed `corrections.topShifts must be an array` by normalizing LLM output in:
- src/lib/frameScan/frameScanLLM.ts
- src/lib/frameScan/landingScanAdapter.ts

The new "slice" error indicates there are additional array fields that need similar defensive handling.

Read CLAUDE.md first for project conventions and architecture patterns.
</context>

<bug_details>
**Reproduction:**
1. Start dev server (`npm run dev`)
2. Go to public FrameScan landing page (the free scanner)
3. Paste any valid text into the scanner textarea
4. Click "Run Diagnostic"
5. Error appears: "Cannot read properties of undefined (reading 'slice')" instead of the report

**Expected:** Report renders correctly with all sections, even when optional LLM fields are missing.
</bug_details>

<research>
Trace the public FrameScan rendering path. Examine these files in order:

1. **Landing page component:**
   - src/pages/PublicFrameScanPage.tsx
   - src/components/Scanner.tsx

2. **Report rendering components:**
   - src/components/crm/FrameScanReportDetail.tsx
   - Any FrameScan-related components used by the landing page
   - Look for components named like: FrameScanLandingReport, ScanResult, etc.

3. **Data layer:**
   - src/services/frameScanReportStore.ts
   - src/lib/frameScan/landingScanAdapter.ts
   - src/lib/frameScan/frameScanLLM.ts

4. **Spec reference:**
   - frameScanSpec.json (identify all array fields)

**Search for the bug:**
Use grep to search for `.slice(` in:
- src/components/Scanner.tsx
- src/pages/PublicFrameScanPage.tsx
- src/components/crm/FrameScanReportDetail.tsx
- Any other FrameScan-related components

Identify which field is undefined at runtime (topShifts, recommendations, axes, microShifts, keyFindings, etc.).
</research>

<implementation>
**Step 1: Identify all array fields in frameScanSpec.json**
List every array field that the UI might slice or map over:
- corrections.topShifts
- corrections.microShifts
- corrections.sampleRewrites
- keyFindings
- axes
- recommendations
- etc.

**Step 2: Harden LLM validation/normalization**
In src/lib/frameScan/frameScanLLM.ts, ensure ALL array fields are:
- Defaulted to `[]` when missing or null
- Wrapped in an array when model returns single object instead of array
- Apply the same pattern used for topShifts to ALL array fields

**Step 3: Harden landingScanAdapter.ts**
Add optional chaining and defaults for all array fields accessed during transformation.

**Step 4: Harden landing-page renderer components**
Before calling `.slice()` or `.map()` on any collection, guard with nullish checks:

```typescript
// BAD - will crash if field is undefined
const visible = report.corrections.topShifts.slice(0, 3);

// GOOD - defensive with default
const topShifts = report.corrections?.topShifts ?? [];
const visible = topShifts.slice(0, 3);
```

Apply this pattern consistently across ALL landing-page report sections.

**Step 5: Verify CRM FrameScan still works**
Ensure the same normalization logic is shared/used for internal scans.
No regressions on the internal FrameScan UI.

**Step 6: Clean up**
Remove any temporary console.log statements added during investigation.
</implementation>

<output>
Modify the necessary files. Expected changes may include:
- `./src/lib/frameScan/frameScanLLM.ts` - Normalize ALL array fields
- `./src/lib/frameScan/landingScanAdapter.ts` - Add defensive checks
- `./src/pages/PublicFrameScanPage.tsx` - Guard slice/map calls
- `./src/components/Scanner.tsx` - Guard slice/map calls
- `./src/components/crm/FrameScanReportDetail.tsx` - Guard slice/map calls
- Any other components rendering FrameScan results on landing page
</output>

<verification>
Before declaring complete:
1. Run `npm run build` - must succeed with no errors
2. Run `npm run dev`
3. **Public FrameScan test:**
   - Navigate to landing page
   - Paste any valid text
   - Run scan
   - Report renders without "slice" error
4. **Internal CRM FrameScan test:**
   - Navigate to CRM FrameScan
   - Run a scan
   - Report renders normally (no regression)
5. Check browser console for any remaining errors
</verification>

<success_criteria>
- [ ] No "Cannot read properties of undefined (reading 'slice')" error on public FrameScan
- [ ] Report renders correctly with all expected sections
- [ ] All array fields from frameScanSpec.json are normalized with defaults
- [ ] All UI components guard slice/map calls with nullish checks
- [ ] npm run build succeeds
- [ ] Internal CRM FrameScan still works (no regression)
- [ ] No temporary console.log statements left in code
</success_criteria>

<deliverable_summary>
When complete, summarize:
- Files changed
- Which field(s) were causing the slice error
- How array fields are now normalized and guarded in the landing UI
</deliverable_summary>
