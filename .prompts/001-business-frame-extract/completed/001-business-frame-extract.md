# Business Frame Doctrine Extraction

<objective>
Extract operational specifications from the Psycholinguistic Architecture doctrine.

Purpose: Transform raw research doctrine into implementation-ready specs, docs, and machine-readable formats that downstream prompts can consume to build TypeScript types, stores, and UI.

Output:
- `docs/PSYCHOLINGUISTIC_ARCHITECTURE_SUMMARY.md` - Human-facing implementation guide
- `ai_knowledge/business_frame_doctrine.txt` - AI-consumable doctrine
- `docs/specs/business_frame_spec.json` - Machine-readable spec for code generation
</objective>

<context>
You are Claude Code working in the FrameLord repo.

FrameLord context (do not improvise around this):
- FrameLord is a local-first CRM OS with React + TypeScript + Vite
- Contact Spine: Contact Zero is the user. Every other entity (notes, tasks, interactions, pipelines, topics, AI scans) ultimately attaches to a contact. Contact Zero is immutable.
- All data lives in in-memory stores and service modules. No backend yet. All attachments and avatars are Data URLs.
- There is already a FrameScan spec and doctrine in /docs and /ai_knowledge that define how authority/frame scoring works on text and images.

The user will paste a long Gemini research output called "Psycholinguistic Architecture for FrameLord: A Design Doctrine for High-Fidelity Business Intelligence and Frame Optimization". That text is raw doctrine, not a clean spec.

Existing patterns to follow:
@ai_knowledge/ - See existing AI doctrine format
@docs/ - See existing documentation structure
</context>

<requirements>
**CRITICAL**: Do NOT write any TypeScript or React code. This prompt produces ONLY documentation and specs.

Work in four sequential passes:

## PASS 1 - Extract the operational ontology

From the doctrine, pull out and normalize into structured outline:

### 1.1 Axes and Scores
List every latent dimension the doctrine cares about:
- Locus of control
- Motivation direction (towards vs away)
- Process clarity
- Linguistic authority / powerless language
- Pricing shame / money block
- Imposter syndrome / status frame
- Conflict avoidance / boundary control
- Say-do gap / operational congruence
- Frame strength (power, analyst, supplicant)

For each axis define:
- `id` (snake_case, for code)
- `name` (human readable)
- `description` (1-2 sentences)
- `scaleMin`, `scaleMax` (numeric range)
- `lowMeaning`, `highMeaning` (what extremes indicate)

### 1.2 Linguistic Signals and Detectors
Enumerate all linguistic phenomena:
- Pronoun density and shifts
- Passive voice
- Hedges and minimizers
- Tag questions
- Temporal bridges / gaps
- Modal operators of necessity vs choice
- Universal quantifiers
- Nominalizations
- Towards vs away language
- Internal vs external attribution

For each detector define:
- `id`, `name`
- `patternHints` (keywords, regex hints, counts)
- `psychologicalMeaning`
- `affectsAxes` (which scores it nudges)
- `mayTriggerFlags` (which flags it can set)

### 1.3 Diagnostic Structure
Document the tiered intake system:

**Tier 1: First-Access Gate**
- List core questions
- What each diagnoses
- Which axes/flags it informs

**Tier 2: Apex Business Frame Blueprint**
Break into modules:
- Money / pricing
- Authority / status / imposter
- Operations / say-do gap / conflict

For each module:
- Key questions
- What each reveals
- Target axes and flags

### 1.4 Flags and System Labels
Extract named phenomena as system flags:
- AGENCY_WARNING
- LOCUS_EXTERNAL
- FRAME_STATUS_BETA
- PRICING_SHAME
- WEALTH_RESENTMENT
- JUSTIFICATION_LOOP
- IMPOSTER_SYNDROME
- SUPPLICANT_FRAME
- BOUNDARY_LEAK
- GAP_DETECTED
- CALL_RELUCTANCE
- CONFLICT_AVOIDANCE
- PASSIVE_AGGRESSION

For each flag define:
- `code` (SCREAMING_SNAKE_CASE)
- `description`
- `typicalTriggers` (ties to detectors/axes)
- `severity` (info | warn | critical)

## PASS 2 - Create implementation docs

### A) `docs/PSYCHOLINGUISTIC_ARCHITECTURE_SUMMARY.md`

Audience: Engineers and product designers

Structure:
1. **Overview** - Purpose inside FrameLord, how it differs from generic onboarding
2. **Entities and Data Model** (conceptual)
   - IntakeSession (per contact)
   - Answer
   - IntakeMetrics
   - AnswerAnalysis
   - FrameFlag
   - Explain attachment to Contact spine and Contact Zero
3. **Axes and Scores** - Table/bullets with plain language
4. **Question Bank**
   - Tier 1: First-Access Gate (each question, intent, target axes)
   - Tier 2: Apex Business Frame Blueprint (Money, Authority, Operations modules)
5. **Detection Logic** - High level for each detector
6. **Outputs and Integration** - What gets stored, how Little Lord consumes it

Keep short, sharp, operational. No academic citations or fluff.

### B) `ai_knowledge/business_frame_doctrine.txt`

Audience: AI models running inside FrameLord

Content:
- Rewrite doctrine in compressed, operational form for AI consumption
- Remove all citations, footnotes, researcher references
- Use plain, neutral language
- Focus on:
  - Definitions of axes
  - Patterns and detection rules
  - Psychological interpretations
  - Coaching strategies and reframes for each major pattern

This should read like a tightly written manual the AI can follow, not a research paper.

## PASS 3 - Create machine-friendly spec

### `docs/specs/business_frame_spec.json`

JSON structure (no prose, only structural data):

```json
{
  "axes": [
    { "id": "string", "name": "string", "description": "string", "scaleMin": 0, "scaleMax": 100 }
  ],
  "flags": [
    { "code": "STRING", "description": "string", "severity": "info|warn|critical", "triggerDetectors": ["ids"], "affectsAxes": ["ids"] }
  ],
  "detectors": [
    {
      "id": "string",
      "name": "string",
      "description": "string",
      "patternHints": ["strings"],
      "effects": [
        { "axisId": "string", "direction": "up|down", "weight": 1-5 },
        { "flagCode": "STRING", "condition": "expression" }
      ]
    }
  ],
  "questions": [
    {
      "id": "string",
      "tier": 1 | 2,
      "module": null | "money" | "authority" | "operations",
      "prompt": "string",
      "targetAxes": ["ids"],
      "targetFlags": ["codes"]
    }
  ]
}
```

Use IDs that make sense in TypeScript later.

## PASS 4 - Output format

Output the three files in fenced sections with clear headings:

```
## docs/PSYCHOLINGUISTIC_ARCHITECTURE_SUMMARY.md
[full content]

## ai_knowledge/business_frame_doctrine.txt
[full content]

## docs/specs/business_frame_spec.json
[JSON block]
```
</requirements>

<implementation>
**Approach:**
1. Read the entire doctrine first before extracting
2. Use Pass 1 as internal reasoning to organize extraction
3. Write Pass 2 docs based on Pass 1 structure
4. Generate Pass 3 JSON from the normalized data
5. Output all three files

**What to avoid and WHY:**
- Do NOT write TypeScript/React - that's Prompt 2 and 3's job
- Do NOT invent axes/flags not in the doctrine - stay faithful to source
- Do NOT include academic citations - this is operational docs
- Do NOT make the AI doctrine too verbose - compress for token efficiency

**Integration points:**
- The JSON spec will be consumed by Prompt 2 to generate types
- The AI doctrine will be loaded by Little Lord and FrameScan services
- The summary doc is for human reference during implementation
</implementation>

<output>
Write directly to filesystem:
- `docs/PSYCHOLINGUISTIC_ARCHITECTURE_SUMMARY.md`
- `ai_knowledge/business_frame_doctrine.txt`
- `docs/specs/business_frame_spec.json`

Also create summary:
- `.prompts/001-business-frame-extract/SUMMARY.md`
</output>

<verification>
Before declaring complete:
1. All three files exist and are non-empty
2. JSON spec is valid JSON (parseable)
3. All axes mentioned in doctrine are captured
4. All flags mentioned in doctrine are captured
5. Question bank covers both tiers
6. AI doctrine is compressed (< 50% of original doctrine length)
7. No TypeScript or React code was generated
</verification>

<summary_requirements>
Create `.prompts/001-business-frame-extract/SUMMARY.md` with:

```markdown
# Business Frame Extract Summary

**{Substantive description: e.g., "Extracted X axes, Y flags, Z questions into operational spec"}**

## Version
v1

## Key Findings
- Number of axes extracted
- Number of flags defined
- Question count by tier
- Notable patterns or warnings

## Files Created
- `docs/PSYCHOLINGUISTIC_ARCHITECTURE_SUMMARY.md` - Implementation guide
- `ai_knowledge/business_frame_doctrine.txt` - AI doctrine
- `docs/specs/business_frame_spec.json` - Machine spec

## Decisions Needed
{Any ambiguities found in doctrine that need user clarification}

## Blockers
None (or list if doctrine is incomplete)

## Next Step
Run 002-business-frame-types to generate TypeScript types and stores

---
*Confidence: High*
*Full output: Files in docs/ and ai_knowledge/*
```
</summary_requirements>

<success_criteria>
- [ ] All three output files created
- [ ] JSON spec is valid and parseable
- [ ] Axes, flags, detectors, questions all extracted
- [ ] AI doctrine is operational (not academic)
- [ ] Summary doc is engineer-ready
- [ ] SUMMARY.md created with file list
- [ ] No TypeScript/React code generated
- [ ] Faithful to doctrine (no invented concepts)
</success_criteria>

<user_action_required>
After reading this prompt, paste the full Psycholinguistic Architecture doctrine.
The prompt will execute all four passes and produce the three output files.
</user_action_required>
