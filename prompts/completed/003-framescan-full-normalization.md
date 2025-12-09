<objective>
Create a centralized FrameScan report normalization system that ensures ALL array fields are safely initialized throughout the entire pipeline.

This is a structural fix to eliminate ALL "Cannot read properties of undefined (reading 'slice')" errors by guaranteeing that every FrameScan report object is normalized to a safe shape before any UI component consumes it.

WHY: Previous point fixes (001, 002) addressed specific crash sites, but the root cause - incomplete LLM responses with missing optional arrays - can manifest anywhere in the pipeline. A centralized normalizer is the only way to guarantee safety.
</objective>

<context>
This is the FrameLord application - an AI-powered authority diagnostics platform. FrameScan analyzes text for communication weaknesses.

**Background:**
- The LLM sometimes returns incomplete data with missing optional arrays
- Previous fixes added ad-hoc normalizations but didn't solve the systemic issue
- Both public landing page and internal CRM FrameScan must use the same normalized shape

Read CLAUDE.md first for project conventions and architecture patterns.
</context>

<research>
**Step 1: Identify ALL array fields in frameScanSpec.json**

Open and thoroughly analyze frameScanSpec.json to identify every array field:
- Top-level arrays
- Nested arrays within objects (diagnostics, corrections, sections, etc.)
- Deeply nested arrays (e.g., protocolSteps within topShifts)

Document the complete list of array fields that the UI might iterate or slice over:
- diagnostics.primaryPatterns
- diagnostics.supportingEvidence
- corrections.topShifts
- corrections.microShifts
- corrections.sampleRewrites
- shift.protocolSteps
- header.badges
- section.bullets
- section.corrections
- axes
- keyFindings
- recommendations
- etc. (find ALL of them)
</research>

<implementation>
**Step 2: Create centralized normalization helper**

Create or modify `src/lib/frameScan/normalizeFrameScanReport.ts`:

```typescript
import type { FrameScanReport } from './frameTypes'; // or appropriate type file

/**
 * Normalizes a raw FrameScan report from LLM output to ensure ALL array fields
 * are safely initialized. After calling this function, no array field will ever
 * be undefined - it will be at least [].
 *
 * @param raw - Raw object parsed from LLM response
 * @returns Fully normalized FrameScanReport safe for UI consumption
 */
export function normalizeFrameScanReport(raw: any): FrameScanReport {
  // Implementation should:
  // 1. Ensure every array field is defaulted to [] if missing/null
  // 2. Wrap single objects in arrays where arrays are expected
  // 3. Ensure all nested objects exist (corrections, diagnostics, header, sections)
  // 4. Handle deeply nested arrays (e.g., protocolSteps within each topShift)
  // 5. Return a fully-populated object safe for consumption
}
```

**Step 3: Wire normalization into ALL FrameScan paths**

Update these files to call `normalizeFrameScanReport()`:

1. **Public landing FrameScan adapter** (`src/lib/frameScan/landingScanAdapter.ts`):
   - Call `normalizeFrameScanReport(raw)` after parsing LLM output
   - Remove any ad-hoc normalization that duplicates the central helper

2. **LLM validation layer** (`src/lib/frameScan/frameScanLLM.ts`):
   - Integrate normalization after LLM response parsing
   - Remove scattered defensive defaults that duplicate the centralizer

3. **Internal CRM FrameScan path** (find the relevant file):
   - Ensure it uses the same `normalizeFrameScanReport` helper
   - Both public and internal paths must produce identical normalized shapes

4. **Frame Report UI** (`src/lib/frameScan/frameReportUI.ts`):
   - Call normalizer if it receives raw data directly

**Step 4: Audit and harden ALL UI components**

Search for `.slice(` and `.map(` in these files and ensure defensive access:

- `src/pages/PublicFrameScanPage.tsx`
- `src/components/Scanner.tsx`
- `src/lib/frameScan/frameReportUI.ts`
- `src/components/crm/FrameScanReportDetail.tsx`
- Any other FrameScan-related components

Pattern to follow:
```typescript
// After normalization, arrays are guaranteed non-undefined
// But still use defensive access at component boundaries
const topShifts = report.corrections?.topShifts ?? [];
const visible = topShifts.slice(0, 3);
```

**Step 5: Remove duplicate ad-hoc normalizations**

After the central normalizer is wired everywhere, remove scattered defensive defaults that are now redundant. Keep defensive checks only at component boundaries where the report object itself might be null/undefined.
</implementation>

<output>
Create/modify these files:

1. `./src/lib/frameScan/normalizeFrameScanReport.ts` - NEW centralized normalizer
2. `./src/lib/frameScan/landingScanAdapter.ts` - Wire normalizer
3. `./src/lib/frameScan/frameScanLLM.ts` - Wire normalizer, remove duplicates
4. `./src/lib/frameScan/frameReportUI.ts` - Wire normalizer if needed
5. `./src/pages/PublicFrameScanPage.tsx` - Ensure defensive access
6. `./src/components/Scanner.tsx` - Ensure defensive access if applicable
7. `./src/components/crm/FrameScanReportDetail.tsx` - Ensure defensive access
8. Any other files discovered during audit
</output>

<verification>
Before declaring complete:

1. **Type check**: Run `npx tsc --noEmit` - must succeed
2. **Build check**: Run `npm run build` - must succeed
3. **Public FrameScan test**:
   - Navigate to landing page
   - Paste any valid text
   - Run scan
   - Report renders without any "slice" or "map" errors
4. **Internal CRM FrameScan test**:
   - Navigate to CRM FrameScan
   - Run a scan
   - Report renders normally (no regression)
5. **Edge case test**: If possible, test with minimal/empty text to trigger sparse LLM responses
6. **Console check**: Browser console shows no errors related to undefined properties
</verification>

<success_criteria>
- [ ] All array fields from frameScanSpec.json documented
- [ ] Central `normalizeFrameScanReport()` function created
- [ ] Function handles ALL array fields (top-level, nested, deeply nested)
- [ ] Public landing FrameScan uses central normalizer
- [ ] Internal CRM FrameScan uses central normalizer
- [ ] All `.slice()` and `.map()` calls have defensive access
- [ ] Duplicate ad-hoc normalizations removed
- [ ] npm run build succeeds
- [ ] No "Cannot read properties of undefined" errors in UI
- [ ] Both public and internal FrameScan work correctly
</success_criteria>

<deliverable_summary>
When complete, provide:
- Complete list of array fields normalized
- Files created/modified
- Confirmation that central normalizer is wired into all paths
- Test results for both public and internal FrameScan
</deliverable_summary>
