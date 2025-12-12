# Business Frame Types and Stores

<objective>
Generate TypeScript types and service stores from the extracted business frame spec.

Purpose: Create the data layer foundation for the psycholinguistic intake system, following FrameLord's Contact Spine architecture and existing store patterns.

Output:
- `types/businessFrame.ts` - TypeScript interfaces and enums
- `services/intakeStore.ts` - Intake session and answer management
- `services/frameAnalysisStore.ts` - Analysis results, flags, and scoring
</objective>

<context>
**Upstream artifacts (REQUIRED - read these first):**
@docs/specs/business_frame_spec.json - Machine-readable spec with axes, flags, detectors, questions
@docs/PSYCHOLINGUISTIC_ARCHITECTURE_SUMMARY.md - Implementation guide

**FrameLord patterns to follow:**
@types/ - Existing type definitions (follow naming conventions)
@services/contactStore.ts - Store pattern reference
@services/noteStore.ts - Store pattern reference
@services/interactionStore.ts - Store pattern reference

**FrameLord architecture constraints:**
- Contact Spine: ALL entities attach to contacts. IntakeSessions belong to a contact.
- Contact Zero: User's own intake data attaches to Contact Zero
- In-memory stores: No backend, use service-based stores as single source of truth
- Data URLs: Any attachments must use Data URLs
- Multi-tenant: Include tenantId on all entities
</context>

<requirements>
## 1. Types File (`types/businessFrame.ts`)

### 1.1 Enums from Spec

Generate enums from the JSON spec:

```typescript
// From spec.axes
export enum FrameAxis {
  LOCUS_OF_CONTROL = 'locus_of_control',
  // ... all axes from spec
}

// From spec.flags
export enum FrameFlag {
  AGENCY_WARNING = 'AGENCY_WARNING',
  // ... all flags from spec
}

// From spec.flags.severity
export enum FlagSeverity {
  INFO = 'info',
  WARN = 'warn',
  CRITICAL = 'critical',
}

// Intake tiers
export enum IntakeTier {
  TIER_1 = 1,
  TIER_2 = 2,
}

// Tier 2 modules
export enum IntakeModule {
  MONEY = 'money',
  AUTHORITY = 'authority',
  OPERATIONS = 'operations',
}
```

### 1.2 Core Interfaces

```typescript
// Axis definition (from spec)
export interface AxisDefinition {
  id: FrameAxis;
  name: string;
  description: string;
  scaleMin: number;
  scaleMax: number;
}

// Flag definition (from spec)
export interface FlagDefinition {
  code: FrameFlag;
  description: string;
  severity: FlagSeverity;
  triggerDetectors: string[];
  affectsAxes: FrameAxis[];
}

// Question definition (from spec)
export interface QuestionDefinition {
  id: string;
  tier: IntakeTier;
  module: IntakeModule | null;
  prompt: string;
  targetAxes: FrameAxis[];
  targetFlags: FrameFlag[];
}

// Detector definition (from spec)
export interface DetectorDefinition {
  id: string;
  name: string;
  description: string;
  patternHints: string[];
  effects: DetectorEffect[];
}

export interface DetectorEffect {
  type: 'axis' | 'flag';
  axisId?: FrameAxis;
  direction?: 'up' | 'down';
  weight?: number;
  flagCode?: FrameFlag;
  condition?: string;
}
```

### 1.3 Runtime Entities (attach to Contact Spine)

```typescript
// Intake session - attached to a contact
export interface IntakeSession {
  id: string;
  tenantId: string;
  contactId: string;  // Links to Contact Spine
  tier: IntakeTier;
  status: 'in_progress' | 'completed' | 'abandoned';
  startedAt: string;  // ISO date
  completedAt?: string;
  answers: Answer[];
  metrics?: IntakeMetrics;
  createdAt: string;
  updatedAt: string;
}

// Individual answer
export interface Answer {
  id: string;
  sessionId: string;
  questionId: string;
  rawText: string;
  analysis?: AnswerAnalysis;
  answeredAt: string;
}

// Analysis results for an answer
export interface AnswerAnalysis {
  detectorResults: DetectorResult[];
  axisContributions: AxisContribution[];
  flagsTrigggered: FrameFlag[];
  confidence: number;  // 0-1
}

export interface DetectorResult {
  detectorId: string;
  matched: boolean;
  matchCount?: number;
  matchedPatterns?: string[];
}

export interface AxisContribution {
  axisId: FrameAxis;
  delta: number;  // Can be positive or negative
  source: string;  // Which detector contributed
}

// Aggregated metrics for a session
export interface IntakeMetrics {
  axisScores: Record<FrameAxis, number>;
  activeFlags: ActiveFlag[];
  overallFrameScore: number;  // 0-100
  frameType: 'power' | 'analyst' | 'supplicant' | 'mixed';
  computedAt: string;
}

export interface ActiveFlag {
  code: FrameFlag;
  severity: FlagSeverity;
  confidence: number;
  evidence: string[];  // Answer IDs that triggered it
}
```

### 1.4 Store Action Types

```typescript
export type IntakeAction =
  | { type: 'START_SESSION'; contactId: string; tier: IntakeTier }
  | { type: 'RECORD_ANSWER'; sessionId: string; questionId: string; rawText: string }
  | { type: 'ANALYZE_ANSWER'; answerId: string }
  | { type: 'COMPLETE_SESSION'; sessionId: string }
  | { type: 'ABANDON_SESSION'; sessionId: string }
  | { type: 'COMPUTE_METRICS'; sessionId: string };
```

## 2. Intake Store (`services/intakeStore.ts`)

Follow existing store patterns (contactStore, noteStore):

```typescript
// Internal state
let sessions: IntakeSession[] = [];

// CRUD operations
export function getSessions(tenantId: string): IntakeSession[]
export function getSessionById(sessionId: string): IntakeSession | undefined
export function getSessionsByContact(contactId: string): IntakeSession[]
export function getActiveSession(contactId: string): IntakeSession | undefined

export function startSession(tenantId: string, contactId: string, tier: IntakeTier): IntakeSession
export function recordAnswer(sessionId: string, questionId: string, rawText: string): Answer
export function completeSession(sessionId: string): IntakeSession
export function abandonSession(sessionId: string): IntakeSession

// Query helpers
export function getLatestCompletedSession(contactId: string): IntakeSession | undefined
export function hasCompletedTier(contactId: string, tier: IntakeTier): boolean
```

## 3. Frame Analysis Store (`services/frameAnalysisStore.ts`)

```typescript
// Analysis operations
export function analyzeAnswer(answer: Answer): AnswerAnalysis
export function computeSessionMetrics(session: IntakeSession): IntakeMetrics

// Detector execution
export function runDetector(detector: DetectorDefinition, text: string): DetectorResult
export function runAllDetectors(text: string): DetectorResult[]

// Scoring
export function computeAxisScores(answers: Answer[]): Record<FrameAxis, number>
export function computeActiveFlags(answers: Answer[]): ActiveFlag[]
export function determineFrameType(axisScores: Record<FrameAxis, number>): string

// Integration with existing FrameScan
export function mergeWithFrameScanResults(intakeMetrics: IntakeMetrics, frameScanScore: number): IntakeMetrics
```
</requirements>

<implementation>
**Approach:**
1. Read the spec JSON first to extract all axes, flags, detectors, questions
2. Generate enums from the spec data
3. Create interfaces following FrameLord patterns
4. Build stores following contactStore/noteStore patterns
5. Ensure all entities link to Contact Spine via contactId

**What to avoid and WHY:**
- Do NOT create a separate routing/navigation system - FrameLord has centralized routing in App.tsx
- Do NOT add backend calls - this is local-first, in-memory only
- Do NOT store files externally - use Data URLs if needed
- Do NOT create duplicate data stores - integrate with existing stores where possible
- Do NOT invent new axes/flags - stay faithful to the spec JSON

**Integration points:**
- IntakeSession.contactId links to Contact Spine
- IntakeMetrics can merge with existing FrameScan results
- ActiveFlags should be consumable by Little Lord for coaching
- Question bank should be loadable for UI rendering
</implementation>

<output>
Write directly to filesystem:
- `types/businessFrame.ts`
- `services/intakeStore.ts`
- `services/frameAnalysisStore.ts`

Also create summary:
- `.prompts/002-business-frame-types/SUMMARY.md`
</output>

<verification>
Before declaring complete:
1. Run `npx tsc --noEmit` - no type errors
2. All enums match spec JSON exactly
3. All interfaces have required fields
4. Stores follow existing patterns (compare with contactStore)
5. All entities have tenantId and appropriate timestamps
6. IntakeSession has contactId (Contact Spine)
7. No imports from non-existent modules
</verification>

<summary_requirements>
Create `.prompts/002-business-frame-types/SUMMARY.md`:

```markdown
# Business Frame Types Summary

**{e.g., "Generated X interfaces, Y enums, and 2 service stores from spec"}**

## Version
v1

## Key Findings
- Enum counts (axes, flags, modules)
- Interface count
- Store function count
- Any spec ambiguities resolved

## Files Created
- `types/businessFrame.ts` - Type definitions
- `services/intakeStore.ts` - Session management
- `services/frameAnalysisStore.ts` - Analysis and scoring

## Decisions Needed
{Any architectural choices that need confirmation}

## Blockers
None (or list if spec is incomplete)

## Next Step
Run 003-business-frame-ui to create intake flow components

---
*Confidence: High*
*Verification: `npx tsc --noEmit` passed*
```
</summary_requirements>

<success_criteria>
- [ ] All files created and non-empty
- [ ] TypeScript compiles without errors
- [ ] Enums match spec JSON exactly
- [ ] All entities have tenantId, contactId where appropriate
- [ ] Stores follow FrameLord patterns
- [ ] No backend calls or external storage
- [ ] SUMMARY.md created with verification status
</success_criteria>

<dependencies>
This prompt requires outputs from:
- `001-business-frame-extract` (spec JSON must exist)

Do NOT run this prompt until 001 is complete.
</dependencies>
