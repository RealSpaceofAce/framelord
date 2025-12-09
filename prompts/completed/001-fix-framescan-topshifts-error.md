<objective>
Fix the "corrections.topShifts must be an array" error that occurs on the public FrameScan landing page when a user runs a scan diagnostic.

This bug prevents users from seeing their FrameScan analysis results, which is a critical user-facing feature.
</objective>

<context>
This is a FrameLord application - an AI-powered authority diagnostics platform. The public FrameScan is a free scanner available on the landing page that analyzes text for communication weaknesses.

Key files to examine:
- @src/pages/PublicFrameScanPage.tsx - The public scanner page where the error occurs
- @src/services/frameScanReportStore.ts - The store managing FrameScan report data
- @src/lib/frameScan/frameTypes.ts - Type definitions for FrameScan data structures
- @src/components/crm/FrameScanReportDetail.tsx - Component that renders the report (likely where validation fails)

Read CLAUDE.md first for project conventions and architecture patterns.
</context>

<bug_details>
Reproduction steps:
1. Start dev server (`npm run dev`) and open the app
2. Go to the public FrameScan landing page (the free scanner)
3. Paste any valid text into the scanner textarea
4. Click the button to run the scan/diagnostic
5. Error appears: "corrections.topShifts must be an array" instead of the report

Expected behavior:
- Scan completes and the public FrameScan report renders normally
- No type errors or validation failures
</bug_details>

<research>
Before fixing, investigate:
1. Where is `corrections.topShifts` being accessed and validated?
2. What is the expected shape of the `corrections` object in the type definitions?
3. Is the data coming from the AI analysis missing the `topShifts` field entirely, or is it the wrong type?
4. Are there differences between how the CRM FrameScan and public FrameScan handle report data?
5. Check if there's a data transformation step that should be initializing `topShifts` as an array

Use grep to search for "topShifts" across the codebase to find all usages.
</research>

<implementation>
Likely causes (investigate in order):
1. **Type mismatch**: The AI response doesn't include `topShifts` or returns it in wrong format
2. **Missing default**: The store or component doesn't initialize `topShifts` as empty array
3. **Adapter issue**: The `landingScanAdapter.ts` may not be transforming data correctly for public scanner

Fix approach:
- Add defensive checks with proper defaults (`corrections?.topShifts ?? []`)
- Ensure the type definition has `topShifts` as optional or with a default
- If the issue is in the AI response mapping, add proper transformation in the adapter layer
- Do NOT just suppress the error - ensure the data structure is correct throughout the pipeline

WHY: Defensive coding with defaults prevents runtime crashes while proper typing ensures the issue is caught at compile time in the future.
</implementation>

<output>
Modify the necessary files to fix the bug. Expected changes may include:
- `./src/lib/frameScan/frameTypes.ts` - Type definition updates
- `./src/services/frameScanReportStore.ts` - Store initialization fixes
- `./src/lib/frameScan/landingScanAdapter.ts` - Data transformation fixes
- `./src/components/crm/FrameScanReportDetail.tsx` - Defensive rendering checks
- `./src/pages/PublicFrameScanPage.tsx` - Page-level error handling
</output>

<verification>
Before declaring complete:
1. Run `npx tsc --noEmit` to verify no TypeScript errors
2. Start dev server with `npm run dev`
3. Navigate to the public FrameScan page
4. Paste test text and run a scan
5. Confirm the report renders without errors
6. Verify the CRM FrameScan still works correctly (regression test)
7. Check browser console for any remaining errors
</verification>

<success_criteria>
- [ ] No "corrections.topShifts must be an array" error when running public FrameScan
- [ ] Report renders correctly with all expected sections
- [ ] TypeScript compiles without errors
- [ ] CRM FrameScan functionality unaffected (no regressions)
- [ ] Fix addresses root cause, not just symptom
</success_criteria>
