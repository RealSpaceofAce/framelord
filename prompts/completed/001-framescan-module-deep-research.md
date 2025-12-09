<research_objective>
Conduct a thorough, comprehensive investigation of the FrameScan module in the FrameLord codebase. This research will inform a complete redesign of:
1. The FrameScan report UI (currently lackluster)
2. The report data structure and content
3. A two-tier system: Basic Report (included) + Elite Report (token-gated upgrade)

FrameScan is the MOST IMPORTANT feature in the entire app. This research must be exhaustive.
</research_objective>

<scope>
<primary_areas>
1. **Scanning Algorithm & Logic**
   - How is a scan initiated? What triggers it?
   - What analysis algorithms are used?
   - How does the AI evaluate the input (text, image, etc.)?
   - What prompts/instructions are sent to the LLM?
   - How is the FrameScore calculated?

2. **Data Structures & Types**
   - What TypeScript interfaces define the scan data?
   - What fields are captured during a scan?
   - What is the schema for scan reports?
   - How are scans stored (in-memory stores)?

3. **Current Report Content**
   - What information is presented in the current report?
   - What diagnostic feedback is provided?
   - What metrics/scores are shown?
   - What recommendations are given?

4. **UI Components & Patterns**
   - Which components render the scan results?
   - What is the current visual structure?
   - How does the user flow through the scan experience?

5. **Design System**
   - What colors are used in the app? (Extract from theme.css, index.css, tailwind config)
   - What fonts are used?
   - What are the existing UI patterns/component styles?

6. **Integration Points**
   - How does FrameScan connect to the LLM services?
   - How does it integrate with the contact spine (if at all)?
   - Where does FrameScan data get stored/retrieved?
</primary_areas>

<files_to_examine>
Start with these key areas and expand as needed:

Core FrameScan Logic:
- @src/lib/frameScan/*.ts (all files in frameScan directory)
- @src/components/Scanner.tsx
- @src/components/crm/FrameScanPage.tsx
- @src/components/crm/FrameScanReportDetail.tsx
- @src/components/crm/FrameScanContactTab.tsx

Data & Types:
- @src/lib/frameScan/frameTypes.ts
- @src/services/frameScanReportStore.ts
- @src/types.ts (search for FrameScan-related interfaces)

LLM Integration:
- @src/lib/frameScan/frameScanLLM.ts
- @src/lib/llm/*.ts (any related LLM services)

Design System:
- @src/styles/theme.css
- @src/index.css
- @tailwind.config.* (if exists)
- @src/components/ui/*.tsx (UI component patterns)

Demo/Seed Data:
- @src/dev/seedFrameScans.ts
- @src/pages/FrameReportDemoPage.tsx
- @src/pages/PublicFrameScanPage.tsx
</files_to_examine>
</scope>

<deliverables>
Create a comprehensive research document saved to: `./research/framescan-deep-dive.md`

The document MUST include these sections:

## 1. Executive Summary
Brief overview of the FrameScan system and its current state.

## 2. Scan Flow Architecture
- Step-by-step flow from user input to report display
- Sequence diagram or flow description
- Entry points (where can users initiate a scan?)

## 3. Algorithm & Analysis Deep Dive
- What is being analyzed in the input?
- What prompts are sent to the LLM?
- How is FrameScore calculated? (0-100 scale details)
- What authority signals/patterns are detected?
- What weakness patterns are identified?

## 4. Data Schema Reference
- Complete TypeScript interfaces for all FrameScan types
- Field-by-field documentation of what each property means
- Sample data structure with realistic values
- Storage mechanism (which store, how persisted)

## 5. Current Report Contents
- Every piece of information currently shown in reports
- Screenshot descriptions or component analysis
- What's working well vs what's lacking

## 6. Design System Inventory
- **Colors**: All color values used (hex/rgb), their CSS variable names, and where they're used
- **Fonts**: Font families, weights, sizes used
- **Spacing**: Common spacing patterns
- **Component patterns**: Cards, buttons, typography styles, etc.

## 7. Two-Tier System Planning
Based on the research, propose:
- **Basic Report**: What should be included in the free/included tier?
- **Elite Report**: What premium insights justify token cost?
- What additional AI calls would the Elite scan require?
- How should the "upgrade" flow work?

## 8. File Reference Map
Complete list of all files related to FrameScan with brief descriptions:
```
src/lib/frameScan/frameScanLLM.ts - [description]
src/components/crm/FrameScanPage.tsx - [description]
...etc
```

## 9. Gaps & Opportunities
- What data is being gathered but not displayed?
- What analysis could be added?
- What UI improvements are most needed?
- Technical debt or issues discovered

## 10. Raw Data Appendix
- Full TypeScript interface definitions (copy-pasted)
- Sample LLM prompts used
- Sample API responses/report data
</deliverables>

<research_methodology>
1. Start by reading the core type definitions to understand the data model
2. Trace the scan flow from UI trigger to LLM call to report display
3. Read the LLM integration to understand what analysis is performed
4. Examine the UI components to understand current presentation
5. Extract all design tokens (colors, fonts, spacing)
6. Review any demo/seed data for realistic examples
7. Document everything with specific line numbers and file paths

Use parallel tool calls whenever possible - read multiple independent files simultaneously to maximize efficiency.
</research_methodology>

<evaluation_criteria>
The research is complete when:
- [ ] All FrameScan-related files have been identified and examined
- [ ] The complete scan flow is documented from trigger to display
- [ ] All TypeScript interfaces are documented with field explanations
- [ ] The FrameScore algorithm is fully explained
- [ ] All colors and fonts are extracted with CSS variable names
- [ ] Clear distinction is made between what exists vs what's planned
- [ ] Two-tier system (Basic/Elite) has concrete recommendations
- [ ] File reference map is complete with descriptions
</evaluation_criteria>

<verification>
Before completing, verify:
- The research document is saved to `./research/framescan-deep-dive.md`
- All 10 sections are present with substantive content
- No placeholder text like "TODO" or "[fill in later]"
- Code examples include actual code from the codebase (not fabricated)
- Color values are actual hex codes from the theme files
- The document could serve as onboarding material for a new developer
</verification>
