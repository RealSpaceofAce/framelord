<objective>
Wire FrameScan reports to include AI-generated mini report markdown with Obsidian-style wikilinks (`[[Topic Name]]`), display it in the report detail UI, and enable "Add to notes" functionality that preserves wikilinks for graph integration.

This task establishes the foundation for the Apex View graph by ensuring FrameScan analysis creates linkable knowledge nodes.
</objective>

<context>
FrameLord is a local-first CRM OS built around the Contact spine. Every entity attaches to a Contact, with Contact Zero representing the user. The app uses in-memory stores as the single source of truth.

FrameScan is the AI-powered frame analysis feature that scores communication for authority signals. Currently it produces numeric scores and axis data, but lacks structured markdown output for knowledge graph integration.

@CLAUDE.md - Project conventions and architecture
@src/services/frameScanReportStore.ts - FrameScan report store
@src/services/noteStore.ts - Notes store and creation
@src/components/framescan/ - FrameScan UI components
@src/lib/frameScan/ - FrameScan analysis logic
</context>

<requirements>
<phase_1 title="Create Spec and Apex Topics Registry">

1.1. Create the canonical spec file at `./docs/FRAMESCAN_APEX_VIEW_SPEC.md`:
- Document the mini report markdown format
- Define wikilink syntax: `[[Apex Topic]]`, `[[contact:slug]]`, `[[want:slug]]`
- List the Apex topics registry (Frame doctrine concepts)
- Explain the pipeline: AI generates wikilinked markdown → stored on report → Add to Notes preserves links → graph sees edges

1.2. Create Apex topics registry at `./src/services/apexTopics.ts`:
- Export `APEX_TOPICS` array with Frame doctrine concepts
- Each topic must have: `id`, `label`, `slug`, `category`, `description`
- Category field must be one of: `'frame' | 'axis' | 'state' | 'metric'`
- Keep descriptions short and doctrine-neutral (reusable across UI, prompts, help text)
- Topics to include:
  - Frame fundamentals (category: 'frame'): Apex Frame, Slave Frame, Mixed Frame, Neutral Frame
  - Core axes (category: 'axis'): Assumptive State, Buyer Seller Position, Identity vs Tactic, Internal Sale, Win-Win Integrity, Persuasion Style, Pedestalization, Self Trust vs Permission, Field Strength
  - States (category: 'state'): Win-Win, Win-Lose, Lose-Lose
  - Scoring (category: 'metric'): Frame Score, Frame Diagnostic
- Export helper `getApexTopicBySlug(slug: string): ApexTopic | undefined`
- Export helper `isValidApexTopicSlug(slug: string): boolean`
</phase_1>

<phase_2 title="Extend FrameScan Report Type and Store">

2.1. Find and update the FrameScanReport interface:
- Add `title: string` (REQUIRED field) - AI-generated title for the scan
- Add `miniReportMarkdown: string` (REQUIRED field) - Full markdown report with wikilinks

2.2. Update any creation/mutation functions in the store:
- Report creation can be two-step: create report record first with safe defaults, then patch in `title` and `miniReportMarkdown` once AI call returns
- Safe defaults for new/legacy reports:
  - `title: 'Untitled FrameScan'`
  - `miniReportMarkdown: ''`

2.3. Update demo/seed data to include sample `title` and `miniReportMarkdown` values:
- Use realistic markdown with wikilinks like `[[Apex Frame]]`, `[[Win-Win]]`
- Include at least 2-3 wikilinks per demo report
- Reference only topics that exist in APEX_TOPICS registry

2.4. Run `npm run build` after type changes to catch any TypeScript errors early
</phase_2>

<phase_3 title="Add Mini Report Section to Report Detail UI">

3.1. Locate the FrameScan report detail component (likely in `src/components/framescan/` or `src/components/crm/`)

3.2. Add a new section below the existing graphic report (score gauges, axes):
- Header: "Analysis Report" or "Synthesis"
- Render `miniReportMarkdown` as markdown, NOT plain text
- Use the existing markdown renderer from the notes system
- Style to match the FrameScan report visual language (dark theme, #0043FF accents)

3.3. Handle "not ready yet" state:
- If `miniReportMarkdown` is empty string when user opens report:
  - Show clear message: "Report not ready yet" or "Analysis in progress..."
  - Style as placeholder, not error

3.4. Add "Add to Notes" button in this section:
- Position below the markdown content
- Use existing button styling patterns
- DISABLE the button when `miniReportMarkdown` is empty
- Show tooltip on disabled button: "Wait for analysis to finish before saving to Notes"
- Wire to handler (implemented in phase 4)
</phase_3>

<phase_4 title="Implement Add to Notes Handler">

4.1. In `src/services/noteStore.ts`, add helper function:

```typescript
function createNoteFromFrameScan(frameScanReportId: string): Note
```

Behavior:
1. Look up FrameScan report by ID
2. Validate: if `miniReportMarkdown` is empty, throw error or return null (fail fast)
3. Handle missing contactId: if report has no contactId, use Contact Zero as targetContactId
4. Build note object:
   - `title`: Use FrameScan `title`, fallback to `"FrameScan • {contactName} • {date}"`
   - `content`: Use `miniReportMarkdown` as-is (preserving wikilinks)
   - `authorContactId`: ALWAYS Contact Zero (never anything else)
   - `targetContactId`: Report's contactId, or Contact Zero if missing
   - `kind`: 'note'
   - `folderId`: 'inbox'
   - `tags`: Build safely:
     ```typescript
     const tags = ['framescan'];
     if (report.domain) tags.push(report.domain);
     ```
5. MUST use existing store APIs (`noteStore.createNote` or similar) - never mutate state directly
6. This ensures backlinks, tags, and indexing are updated consistently

4.2. Wire the button in report detail UI:
- On click, call `createNoteFromFrameScan(reportId)`
- Show success toast with clickable link to open the note
- Use existing toast patterns (check for `showToast` or similar)
</phase_4>

<phase_5 title="Update FrameScan AI Interface">

5.1. Locate the FrameScan AI client/service (likely `src/lib/frameScan/frameScanLLM.ts` or similar)

5.2. Define stable JSON envelope for FrameScan results:
```typescript
interface FrameScanAIResponse {
  title: string;
  mini_report_markdown: string;
  axes: { /* existing axis breakdown */ };
  // ... other existing fields
}
```

5.3. Update the AI prompt to request:
- `title`: Short descriptive title for the scan
- `mini_report_markdown`: Markdown analysis with Obsidian-style wikilinks

5.4. Update prompt instructions explicitly:
- Only use topic names that exist in APEX_TOPICS registry
- Do NOT invent new wikilink labels
- Always include one clear frame type (Apex/Slave/Mixed/Neutral)
- Include at least three axis references
- Use format: `[[Apex Frame]]` for topics

5.5. Update response parsing with fallbacks:
- Parse JSON envelope strictly
- If `title` missing or empty: use fallback `'Untitled FrameScan'`
- If `mini_report_markdown` missing or empty: use fallback `''`
- Never let missing fields crash the UI

5.6. Map response to FrameScanReport:
- `title` → `FrameScanReport.title`
- `mini_report_markdown` → `FrameScanReport.miniReportMarkdown`

5.7. Update the response interface/type to include these fields
</phase_5>

<phase_6 title="Wire Graph Integration">

6.1. Ensure notes created from FrameScan use the same wikilink parser as other notes

6.2. Wikilink parser must:
- Extract `[[Topic Name]]` links from markdown
- Normalize by `topicSlug` (convert label to slug format)
- Match against APEX_TOPICS registry using `isValidApexTopicSlug()`
- Only create graph edges for links where `topicSlug` exists in APEX_TOPICS
- Ignore unknown/invalid links silently (do not error)

6.3. Graph store design:
- Should be a pure function over `notes[]` array
- Makes reindexing easy: `buildGraph(notes) => GraphData`
- No side effects during graph computation

6.4. If a topic index/store exists, ensure it gets updated when notes with wikilinks are created

6.5. Test flow:
- Mini report contains `[[Apex Frame]]`
- Note created with that content
- Graph/topic system sees the link
- Unknown links like `[[Made Up Topic]]` are ignored, not errored
</phase_6>
</requirements>

<constraints>
- Preserve Contact Zero semantics - it's ALWAYS the author of notes
- Do NOT create a parallel notes system - use existing noteStore APIs
- Reuse existing markdown renderer from notes (do not build new one)
- Do NOT build Labs deep PDF reports or psychometric features (future scope)
- Keep wikilink syntax simple: `[[Topic]]` for now, structured links like `[[contact:slug]]` as stretch goal
- All stores remain in-memory, no backend calls
- Only reference topic slugs that exist in APEX_TOPICS - no invented links
</constraints>

<implementation_notes>
- The "Add to Notes" button should NOT call AI again - it uses pre-generated `miniReportMarkdown`
- Wikilinks are stored as plain text `[[Topic]]` in the markdown - rendering/linking happens at display time
- The Apex topics registry is the source of truth for valid topic slugs
- Demo data is critical for testing - ensure seeded reports have realistic wikilinked content
- Two-step report creation pattern: create record → AI call → patch title/markdown
- Graph store as pure function over notes enables easy rebuild/reindex
</implementation_notes>

<output>
Files to create:
- `./docs/FRAMESCAN_APEX_VIEW_SPEC.md` - Canonical spec document
- `./src/services/apexTopics.ts` - Apex topics registry with category field

Files to modify:
- `./src/services/frameScanReportStore.ts` - Add required title/miniReportMarkdown fields with defaults
- `./src/services/noteStore.ts` - Add createNoteFromFrameScan helper using existing APIs
- FrameScan report detail component - Add mini report section, "not ready" state, disabled button
- FrameScan AI client - Update prompt and response parsing with fallbacks
- Demo/seed data file - Add sample wikilinked content using valid APEX_TOPICS
</output>

<verification>
Before declaring complete, verify this flow works:

1. Open a FrameScan report detail page
2. See mini report markdown rendered below the score/axes section
3. Wikilinks like `[[Apex Frame]]` are visible in the markdown
4. Click "Add to Notes" button
5. Toast appears with link to the new note
6. Open the note - content matches miniReportMarkdown with wikilinks preserved
7. If topic/graph system exists, verify the note's wikilinks create edges

Run builds and tests at checkpoints:
```bash
# After phase 2 (type changes)
npm run build

# After phase 4 (integration work)
npm run build
npm run test
```

QA Checks:
- [ ] Legacy/demo report with empty `miniReportMarkdown` renders without errors
- [ ] "Add to Notes" button is disabled when `miniReportMarkdown` is empty
- [ ] Disabled button shows tooltip explaining why
- [ ] Notes created from reports have correct tags (`['framescan', domain]` or just `['framescan']`)
- [ ] Notes created from reports have correct backlinks indexed
- [ ] authorContactId is Contact Zero on all created notes
- [ ] Unknown wikilinks in markdown do not cause errors
</verification>

<success_criteria>
- FrameScanReport type includes required `title` and `miniReportMarkdown` fields
- Safe defaults exist for legacy/new reports ('Untitled FrameScan', '')
- Report detail UI displays mini report as rendered markdown
- Empty miniReportMarkdown shows "not ready" state with disabled button
- "Add to Notes" creates a note with preserved wikilinks using existing store APIs
- Toast shows with clickable link after note creation
- Apex topics registry exists with category field and short descriptions
- AI interface requests and stores wikilinked markdown with fallbacks
- Demo data includes sample wikilinked reports using valid topic slugs
- Build and tests pass with no TypeScript errors
- Graph only creates edges for valid APEX_TOPICS slugs
</success_criteria>
