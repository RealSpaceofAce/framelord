<objective>
Add guidance copy for "how to get the best FrameScan result" to both the public scan module and the CRM internal FrameScan tab.
</objective>

<context>
Users need visible guidance so they know how to give the AI model enough context for accurate frame analysis. This is purely informational - no validation logic changes.

The exact guidance text to use:

> For the sharpest FrameScan result:
> - Say who you are and who they are, plus the relationship and power setup.
> - Say what the situation is and which channel you are using.
> - Say what you want and what is at stake.
> - Paste the exact message or transcript, not a summary.
> - Keep it one coherent interaction, not ten mixed situations.

@CLAUDE.md - Project conventions
@src/components/Scanner.tsx - Public scan module
@src/pages/PublicFrameScanPage.tsx - Public scan page
@src/components/crm/FrameScanContactTab.tsx - CRM internal scan tab
</context>

<requirements>

## 3.1 Public Scan Module

1. Find the public FrameScan input area:
   - Search for `src/components/Scanner.tsx`
   - Also check `PublicFrameScanPage.tsx`
   - Locate the textarea where users paste content

2. Add guidance near the input:
   - Option A: Small `?` or `i` icon with tooltip containing the guidance text
   - Option B: Collapsible block under the textarea labeled "Tips for best results"

   Choose whichever pattern already exists in the app. Search for existing tooltips or info callouts.

3. Guidance text (copy exactly):
   ```
   For the sharpest FrameScan result:
   • Say who you are and who they are, plus the relationship and power setup.
   • Say what the situation is and which channel you are using.
   • Say what you want and what is at stake.
   • Paste the exact message or transcript, not a summary.
   • Keep it one coherent interaction, not ten mixed situations.
   ```

4. Style to be subtle but visible:
   - Small font size (12-13px)
   - Muted color (gray or secondary text color)
   - Does not interfere with the main scan flow

## 3.2 CRM Internal FrameScan Tab

1. Find `src/components/crm/FrameScanContactTab.tsx` or equivalent
   - This is the internal CRM scan module for contacts
   - Search for the input textarea

2. Add the same guidance text:
   - Use same styling as the public version
   - Position as a helper block under or beside the input textarea
   - Use existing info callout styling from the app

3. Do NOT alter validation logic - this is purely guidance copy

</requirements>

<verification>
1. Public scan page (`/scan` or landing page scanner):
   - Guidance text is visible near the input area
   - Text matches the exact copy provided
   - Styled subtly (doesn't dominate)

2. CRM FrameScan tab (inside a contact dossier):
   - Same guidance text appears
   - Consistent styling with public version

3. Neither location has altered validation behavior

```bash
npm run build
```
</verification>

<success_criteria>
- Guidance text appears in public Scanner component
- Guidance text appears in CRM FrameScanContactTab
- Exact copy matches what was specified
- Styling is subtle and matches app patterns
- No TypeScript errors
- Validation logic unchanged
</success_criteria>
