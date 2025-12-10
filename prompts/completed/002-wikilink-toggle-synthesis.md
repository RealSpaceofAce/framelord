<objective>
Add a wiki-link toggle to the FrameScan Synthesis card that lets users choose whether the generated note uses auto wiki-links for doctrine concepts or plain text.
</objective>

<context>
The FrameScan report detail page already has a Synthesis Note card with an "Add to Notes" button. Currently it always generates wikilinks like `[[Apex Frame]]`, `[[Win-Win]]` etc. Some users don't want these auto-generated links spraying stub notes into their Notes system.

This feature adds a small toggle to control that behavior.

@CLAUDE.md - Project conventions
@src/components/framescan/SynthesisNotePanel.tsx - The Synthesis card component (likely location)
@src/components/crm/FrameScanReportDetail.tsx - Report detail page
</context>

<requirements>
1. Find the Synthesis Note card component
   - Search for `SYNTHESIS NOTE` and `ADD TO NOTES` text
   - Locate the exact file (likely `SynthesisNotePanel.tsx` or within `FrameScanReportDetail.tsx`)
   - Do NOT create a duplicate component

2. Add local state for the toggle:
   ```tsx
   const [autoWikiLink, setAutoWikiLink] = useState<boolean>(true);
   ```

3. Add a small toggle in the Synthesis card header:
   - Position: top-right of the card header, next to the title
   - Label: "Auto wiki-link"
   - Size: small/compact
   - Search the repo for existing toggle/switch components (look for "Auto archive" or similar toggles)
   - Use flex layout so title stays left, toggle hugs right

   Example structure:
   ```tsx
   <div className="framescan-synthesis-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
     <div className="framescan-section-title">SYNTHESIS NOTE — READY TO SAVE</div>
     <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
       <span>Auto wiki-link</span>
       <input
         type="checkbox"
         checked={autoWikiLink}
         onChange={(e) => setAutoWikiLink(e.target.checked)}
       />
     </label>
   </div>
   ```

   If the app has a custom Toggle/Switch component, use that instead of raw checkbox.

4. Refactor the note body builder to accept the toggle value:
   - Find the function that builds the markdown (likely `buildFrameScanNoteBody` or similar)
   - Add an options parameter:
     ```ts
     function buildFrameScanNoteBody(report: FrameScanReport, opts?: { autoWikiLink?: boolean }): string
     ```

5. Inside the builder, create a helper for conditional wiki-linking:
   ```ts
   const concept = (label: string): string => {
     if (opts?.autoWikiLink === false) return label;
     return `[[${label}]]`;
   };
   ```

6. Replace all hardcoded `[[Topic]]` patterns with the `concept()` helper:
   - `[[Apex Frame]]` → `concept('Apex Frame')`
   - `[[Slave Frame]]` → `concept('Slave Frame')`
   - `[[Win-Win]]` → `concept('Win-Win')`
   - etc for all doctrine concepts

7. Pass the toggle value to the builder in the Add to Notes handler:
   ```ts
   const noteBody = buildFrameScanNoteBody(report, { autoWikiLink });
   ```

8. Style the toggle to match app design:
   - Use existing color variables (likely `#0043FF` accent)
   - Keep it subtle/small so it doesn't dominate the card
</requirements>

<verification>
Test both states:

1. With Auto wiki-link ON (default):
   - Click "Add to Notes"
   - Open the created note
   - Verify wikilinks like `[[Apex Frame]]`, `[[Win-Win]]` are present

2. With Auto wiki-link OFF:
   - Toggle off the checkbox
   - Click "Add to Notes"
   - Open the created note
   - Verify the same text appears but WITHOUT `[[...]]` markers
   - "Apex Frame" should appear as plain text, not as a wikilink

3. The Synthesis card preview itself can still show formatted text - only the note generator respects the toggle

Run build:
```bash
npm run build
```
</verification>

<success_criteria>
- Toggle appears in Synthesis card header (small, right-aligned)
- Toggle defaults to ON (auto wiki-link enabled)
- When ON: generated notes contain `[[Topic]]` wikilinks
- When OFF: generated notes contain plain text without brackets
- No TypeScript errors
- Existing functionality unchanged when toggle is ON
</success_criteria>
