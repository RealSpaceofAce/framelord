// =============================================================================
// NOTE TEMPLATES SERVICE — Template registry for quick note creation
// =============================================================================
// Provides pre-built templates for common note types used in FrameLord.
// Templates include FrameScan summaries, sales outreach, meeting prep, and daily logs.
// =============================================================================

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

/**
 * Get a template by ID.
 * Returns undefined if not found.
 */
export function getTemplateById(id: string): NoteTemplate | undefined {
  return noteTemplates.find(t => t.id === id);
}

/**
 * Replace template variables like {{date}} with actual values.
 *
 * @param templateBody - The template body string
 * @returns The template body with variables replaced
 */
export function replaceTemplateVariables(templateBody: string): string {
  const today = new Date();
  const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD format

  return templateBody.replace(/\{\{date\}\}/g, dateString);
}
