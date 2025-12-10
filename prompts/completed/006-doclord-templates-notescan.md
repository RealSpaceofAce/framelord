<objective>
Rename the Notes writing assistant to "DocLord Writing Assistant", wire "Start with AI" button, add Templates feature, and ensure Note Scan uses the unified FrameScan pipeline.
</objective>

<context>
The Notes module has a writing assistant that needs rebranding and better integration:
1. Rename from "LL Writing Assistant" to "DocLord Writing Assistant"
2. Update intro copy
3. Wire "Start with AI" button to open it
4. Add Templates picker (with premium gate option)
5. Ensure Note Scan button uses same FrameScan pipeline as other scans

@CLAUDE.md - Project conventions
@src/components/notes/ - Notes components
@src/components/littleLord/ - Writing assistant components
@src/services/noteStore.ts - Notes store
@src/components/Scanner.tsx - FrameScan pipeline reference
</context>

<requirements>

## 5.1 Rename UI Labels and Intro Text

1. Search the repo for `LL Writing Assistant`:
   - Update all user-facing labels to `DocLord Writing Assistant`

2. Find the intro message in the sidebar (something like "I'm Little Lord, your Apex Frame coach"):
   - Replace with: `I am DocLord, your Apex Frame writing assistant. I help you write and refine documents, sales copy, and personal messages so they carry Apex Frame, Win Win positioning, and clean Dominion tone.`
   - Remove any trailing question like "What is on your mind?"
   - Keep as a statement, not a question

## 5.2 "Start with AI" Button Wiring

1. In the Notes page, find the "Start with AI" button:
   - Search for "Start with AI" text
   - Should be near where Backlinks appear

2. Wire the button to open the DocLord sidebar:
   - Find how the sidebar is currently opened (look for crown icon handler)
   - If there's a store like `littleLordSidebarStore.open()`, call that
   - If context-based, call the same hook

3. After clicking "Start with AI":
   - DocLord Writing Assistant sidebar opens on the right
   - Shows updated name and intro copy
   - Input is focused so user can start typing

## 5.3 Templates Button and Registry

1. Create template registry at `src/services/noteTemplates.ts`:

```typescript
export interface NoteTemplate {
  id: string;
  name: string;
  description: string;
  body: string;
}

export const noteTemplates: NoteTemplate[] = [
  {
    id: 'framescan-summary',
    name: 'FrameScan Summary',
    description: 'Summary plus shifts and protocol steps for a FrameScan.',
    body: `# FrameScan Summary

## Overview


## Patterns Detected


## Priority Shifts


## Protocol Steps

1.
2.
3.
`,
  },
  {
    id: 'sales-outreach',
    name: 'Sales Outreach',
    description: 'Apex frame sales email or DM template.',
    body: `# Sales Outreach

## Context
Who:
Situation:
Goal:

## Message Draft


## Frame Check
- [ ] Opens with value, not ask
- [ ] Buyer position maintained
- [ ] No pedestalization
- [ ] Clear next step
`,
  },
  {
    id: 'meeting-prep',
    name: 'Meeting Prep',
    description: 'Prepare frame strategy for an important meeting.',
    body: `# Meeting Prep

## Meeting Details
With:
Date:
Purpose:

## Their Frame
Current position:
Likely wants:
Pressure points:

## My Frame Strategy
Opening:
Key points:
If they push back:
Close:

## Outcome Goals
Minimum:
Target:
Stretch:
`,
  },
  {
    id: 'daily-log',
    name: 'Daily Log',
    description: 'Daily frame practice and reflection.',
    body: `# Daily Log – {{date}}

## Wins


## Frame Challenges


## Patterns I Noticed


## Tomorrow's Focus

`,
  },
];

export function getTemplateById(id: string): NoteTemplate | undefined {
  return noteTemplates.find(t => t.id === id);
}
```

2. Wire the "Template" button (next to "Start with AI"):
   - On click, show template picker modal
   - List templates with name and description
   - Optional: check for premium flag `user.features.templatesPro`
     - If false, show modal: "Templates are a premium feature. Coming soon."
     - If true or no flag exists, show picker

3. On template selection:
   - Replace current note body with template body (or append to empty note only)
   - Replace `{{date}}` with current date
   - Place cursor after first heading

## 5.4 Note Scan Pipeline Unification

1. Find the "Scan" button in Notes toolbar:
   - Search for "Scan" near note title area
   - Identify current click handler

2. Find the standard FrameScan entry point:
   - In `Scanner.tsx` or `FrameScanContactTab.tsx`
   - Find function like `runFrameScan` or `submitFrameScan`

3. Create shared function in `src/services/frameScanClient.ts` (or extend existing):

```typescript
export interface FrameScanOptions {
  source: 'public' | 'contact' | 'note';
  text: string;
  contactId?: string;
  noteId?: string;
}

export async function runFrameScanFromText(opts: FrameScanOptions): Promise<FrameScanReport> {
  // Validate minimum text length
  if (opts.text.trim().length < 50) {
    throw new Error('Not enough text for analysis');
  }

  // Call the same backend/AI as other scans
  // Use existing FrameScan API client
  const result = await performFrameScan(opts.text);

  // Create report with source metadata
  const report = addFrameScanReport({
    ...result,
    sourceType: opts.source,
    sourceNoteId: opts.noteId,
    sourceContactId: opts.contactId,
  });

  return report;
}
```

4. Update Note Scan button handler:
   - Get full plain text of current note
   - Call `runFrameScanFromText({ source: 'note', text, noteId })`
   - On success, navigate to the new FrameScan report page
   - Reuse same validation (minimum chars, "not enough data" handling)

5. Ensure all scans use this unified pipeline:
   - Public scanner uses it
   - Contact tab uses it
   - Note scan uses it

</requirements>

<verification>
1. DocLord rename:
   - All "LL Writing Assistant" labels changed to "DocLord Writing Assistant"
   - New intro copy appears in sidebar

2. Start with AI:
   - Button on Notes page opens DocLord sidebar
   - Sidebar shows correct branding
   - Input is focused

3. Templates:
   - Template button shows picker modal
   - Selecting a template inserts body into note
   - `{{date}}` replaced with current date

4. Note Scan:
   - Scan button in Notes toolbar works
   - Uses same pipeline as public/contact scans
   - Creates FrameScan report
   - Navigates to report page
   - "Not enough data" handling works

```bash
npm run build
```
</verification>

<success_criteria>
- "DocLord Writing Assistant" appears everywhere (no "LL Writing Assistant")
- New intro copy is statement, not question
- "Start with AI" opens DocLord sidebar
- Template registry created with 4 useful templates
- Template picker works (optional premium gate)
- Note Scan uses unified `runFrameScanFromText`
- All scan sources (public, contact, note) use same pipeline
- No TypeScript errors
- Existing functionality preserved
</success_criteria>
