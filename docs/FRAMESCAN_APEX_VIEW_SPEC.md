# FrameScan Apex View Specification

## Overview

The Apex View is a knowledge graph feature that connects FrameScan analysis reports to the broader notes and topics system in FrameLord. Every FrameScan generates a **mini report** in markdown format with **Obsidian-style wikilinks** that create linkable knowledge nodes.

This spec defines:
1. The mini report markdown format with wikilinks
2. The Apex topics registry (Frame doctrine concepts)
3. The pipeline from AI generation to graph integration

---

## Mini Report Markdown Format

### Structure

Each FrameScan produces a `miniReportMarkdown` field containing:

- **Title**: Short descriptive heading for the scan
- **Frame Classification**: Links to frame type (`[[Apex Frame]]`, `[[Slave Frame]]`, `[[Mixed Frame]]`, `[[Neutral Frame]]`)
- **Axis Analysis**: References to specific axes with scores and observations
- **Win-Win State**: Link to state assessment (`[[Win-Win]]`, `[[Win-Lose]]`, `[[Lose-Lose]]`)
- **Patterns Detected**: Key behavioral patterns identified
- **Priority Corrections**: Recommended shifts with axis links

### Wikilink Syntax

Wikilinks use double square bracket notation: `[[Topic Name]]`

**Supported wikilink types:**

1. **Apex Topics** (Frame doctrine concepts)
   - Syntax: `[[Topic Name]]`
   - Example: `[[Apex Frame]]`, `[[Buyer Seller Position]]`, `[[Win-Win]]`
   - Must match topics in APEX_TOPICS registry

2. **Contact Links** (stretch goal - future)
   - Syntax: `[[contact:slug]]`
   - Example: `[[contact:john-doe]]`
   - Links to specific contact in CRM

3. **Want Links** (stretch goal - future)
   - Syntax: `[[want:slug]]`
   - Example: `[[want:close-enterprise-deal]]`
   - Links to user goals/wants

**Current Implementation:** Only Apex Topics (type 1) are supported. Structured links (types 2-3) are reserved for future expansion.

---

## Apex Topics Registry

The Apex Topics registry is the canonical source of truth for valid topic slugs in FrameScan reports.

**Location:** `/src/services/apexTopics.ts`

### Topic Structure

```typescript
interface ApexTopic {
  id: string;           // Unique ID (same as slug for now)
  label: string;        // Display name (e.g., "Apex Frame")
  slug: string;         // Normalized slug (e.g., "apex-frame")
  category: 'frame' | 'axis' | 'state' | 'metric';
  description: string;  // Short, doctrine-neutral description
}
```

### Categories

- **frame**: Core frame types (Apex Frame, Slave Frame, Mixed Frame, Neutral Frame)
- **axis**: The 9 axes of frame analysis (Assumptive State, Buyer Seller Position, etc.)
- **state**: Win-Win model states (Win-Win, Win-Lose, Lose-Lose)
- **metric**: Scoring concepts (Frame Score, Frame Diagnostic)

### Topics Included

**Frame Fundamentals (`category: 'frame'`)**
- Apex Frame
- Slave Frame
- Mixed Frame
- Neutral Frame

**Core Axes (`category: 'axis'`)**
- Assumptive State
- Buyer Seller Position
- Identity vs Tactic
- Internal Sale
- Win-Win Integrity
- Persuasion Style
- Pedestalization
- Self Trust vs Permission
- Field Strength

**Win-Win States (`category: 'state'`)**
- Win-Win
- Win-Lose
- Lose-Lose

**Scoring (`category: 'metric'`)**
- Frame Score
- Frame Diagnostic

---

## Pipeline: AI Generation → Storage → Graph Integration

### 1. AI Generation (FrameScan LLM)

**Input:** Text or image for frame analysis

**Output:** JSON envelope with:
```typescript
{
  title: string;                    // Short title for the scan
  mini_report_markdown: string;     // Full markdown with wikilinks
  axes: [...],                      // Existing axis data
  // ... other existing fields
}
```

**AI Prompt Instructions:**
- Generate a title that describes the scan subject
- Create markdown analysis using only topic names from APEX_TOPICS registry
- Include at least one frame type wikilink (`[[Apex Frame]]`, etc.)
- Reference at least three axis wikilinks
- Use proper wikilink format: `[[Topic Name]]` (spaces, title case)
- DO NOT invent new topic names - only use registered topics

**Fallback Behavior:**
- If `title` missing or empty: Use `'Untitled FrameScan'`
- If `mini_report_markdown` missing or empty: Use `''` (empty string)

### 2. Storage (FrameScanReportStore)

**FrameScanReport Type:**
```typescript
interface FrameScanReport {
  // ... existing fields ...
  title: string;                    // REQUIRED - AI-generated title
  miniReportMarkdown: string;       // REQUIRED - Full markdown report with wikilinks
}
```

**Safe Defaults:**
- New reports: `title: 'Untitled FrameScan'`, `miniReportMarkdown: ''`
- Legacy reports: Same defaults applied on read

**Two-Step Creation Pattern:**
1. Create report record with safe defaults
2. AI call returns → patch in `title` and `miniReportMarkdown`

### 3. Display (Report Detail UI)

**Location:** Below the score gauges and axis visualization

**Components:**
- **Markdown Renderer:** Reuse existing notes markdown renderer
- **Header:** "Analysis Report" or "Synthesis"
- **Not Ready State:** If `miniReportMarkdown === ''`, show placeholder message
- **Add to Notes Button:**
  - Disabled when `miniReportMarkdown` is empty
  - Tooltip explains: "Wait for analysis to finish before saving to Notes"
  - Saves pre-generated content (does NOT call AI again)

### 4. Add to Notes (Note Creation)

**Function:** `createNoteFromFrameScan(reportId: string): Note`

**Behavior:**
1. Look up FrameScan report by ID
2. Validate `miniReportMarkdown` is not empty (fail fast if empty)
3. Determine contactId: Use report's contactId, or Contact Zero if missing
4. Build note:
   - `title`: Use FrameScan `title`, fallback to `"FrameScan • {contactName} • {date}"`
   - `content`: Use `miniReportMarkdown` as-is (preserving wikilinks)
   - `authorContactId`: ALWAYS Contact Zero
   - `targetContactId`: Report's contactId or Contact Zero
   - `kind`: 'note'
   - `folderId`: 'inbox'
   - `tags`: `['framescan', domain]` (or just `['framescan']` if no domain)
5. Call existing store APIs (never mutate state directly)
6. Show success toast with clickable link to open the note

### 5. Graph Integration (Topic Wikilink Parser)

**Wikilink Extraction:**
- Extract `[[Topic Name]]` links from note markdown
- Normalize to slug format (lowercase, hyphens)
- Match against APEX_TOPICS registry using `isValidApexTopicSlug(slug)`
- Only create graph edges for valid topic slugs

**Invalid Link Handling:**
- Unknown links like `[[Made Up Topic]]` are ignored silently
- No errors thrown - graceful degradation

**Graph Store Design:**
- Pure function over `notes[]` array: `buildGraph(notes) => GraphData`
- No side effects during computation
- Easy to reindex by rebuilding graph from notes

**Topic Index Updates:**
- When note created with wikilinks, topic index sees the link
- Backlinks automatically indexed for graph navigation

---

## Example Mini Report

```markdown
# Sales Email Frame Analysis

This scan identified a **SLAVE** frame with a FrameScore of 42/100.

Frame Classification: [[Slave Frame]]
Win-Win State: [[Win-Lose]]

## Patterns Detected

- Chronic [[Pedestalization]] of prospect
- Collapsed [[Assumptive State]]
- [[Buyer Seller Position]] inverted to seller posture

## Priority Corrections

### [[Buyer Seller Position]]

Shift from seller (chasing) to buyer (qualifying).

**Protocol:**
1. Open with qualification question, not pitch
2. State your standards for fit
3. Let prospect earn your time

### [[Assumptive State]]

Move from "hoping to get a meeting" to "assessing fit for collaboration."

**Protocol:**
1. Assume you have valuable options
2. Frame your time as scarce resource
3. Use language that implies choice, not need

## Axis Breakdown

- [[Assumptive State]]: -2 (MILD SLAVE)
- [[Buyer Seller Position]]: -3 (STRONG SLAVE)
- [[Win-Win Integrity]]: +1 (MILD APEX)
- [[Pedestalization]]: -2 (MILD SLAVE)

---

*Related: [[Apex Frame]] [[Frame Score]] [[Win-Win]] [[FrameScan]]*
```

---

## Validation Rules

1. **Wikilinks must reference registered topics**
   - AI should only use topic names from APEX_TOPICS
   - Unknown links are ignored, not errored
   - No invented topic names allowed

2. **Markdown must be valid**
   - Standard markdown syntax
   - Wikilinks use double square brackets: `[[Topic]]`
   - No special escaping required

3. **Report fields are required**
   - `title` must be non-empty string (fallback: 'Untitled FrameScan')
   - `miniReportMarkdown` can be empty string (indicates not ready)

4. **Note creation must preserve wikilinks**
   - Content copied verbatim to note
   - Wikilinks stored as plain text `[[Topic]]`
   - Rendering/linking happens at display time

---

## Success Criteria

- [x] Spec document created and reviewed
- [x] APEX_TOPICS registry exists with all topics and categories
- [x] FrameScanReport type includes `title` and `miniReportMarkdown`
- [x] AI interface requests and stores wikilinked markdown
- [x] Report detail UI displays mini report as rendered markdown
- [x] "Add to Notes" creates note with preserved wikilinks
- [x] Graph only creates edges for valid APEX_TOPICS slugs
- [x] Unknown wikilinks are ignored without errors
- [x] Build and tests pass

---

## Future Enhancements

### Structured Wikilinks (Phase 2)

- **Contact Links:** `[[contact:john-doe]]` → links to contact in CRM
- **Want Links:** `[[want:close-enterprise-deal]]` → links to user goals
- **Note Links:** `[[My Note Title]]` → links to other notes

### Deep PDF Reports (Labs Tier)

- Extended markdown with psychometric analysis
- Multi-page report with detailed recommendations
- Export to PDF for offline review

### Graph Visualization

- Visual graph view showing topic connections
- Click to navigate between notes and topics
- Highlight paths between concepts

---

## References

- **Wikilink Syntax:** Obsidian-style double bracket notation
- **Graph Integration:** See `topicStore.ts` for topic linking logic
- **Note Rendering:** See `AffineNotes.tsx` for markdown display
- **Frame Doctrine:** See `APEX_TOPICS` for canonical concept list
