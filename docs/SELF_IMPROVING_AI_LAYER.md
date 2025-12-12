# FrameLord Self-Improving AI Layer

**Purpose**: Enable FrameLord's AI systems to get smarter over time without retraining models, using only code, data structures, and feedback loops.

**Architecture**: Based on a 7-layer stack that captures AI interactions, stores them in queryable memory, and uses them to improve future responses.

---

## Executive Summary

This document defines how FrameLord will implement a self-improving AI layer that:

1. **Captures** all AI interactions and decisions in a standardized format
2. **Stores** them in a unified memory system queryable by any part of the app
3. **Retrieves** relevant past experiences to inform new AI calls
4. **Learns** from explicit feedback (thumbs up/down) and implicit signals (usage patterns)
5. **Adapts** prompts dynamically based on what has worked before

All of this works **without model retraining** - improvements come from better context, better examples, and better routing.

---

## The 7-Layer Architecture

### Layer 1: Knowledge Storage and Memory Objects

**Purpose**: Store all AI interactions and outputs in a unified, queryable format.

#### Core Concept: AIMemoryRecord

Every significant AI interaction creates an `AIMemoryRecord`:

```typescript
interface AIMemoryRecord {
  id: string;                    // Unique identifier
  kind: AIMemoryKind;            // Type of memory (see below)
  contactId: string | null;      // Link to contact spine (Contact Zero or other)
  tenantId: string | null;       // Future: multi-tenant isolation
  createdAt: string;             // ISO timestamp
  source: {                      // Where this memory came from
    system: AISystemId;          // framescan, little_lord, etc.
    key: string;                 // Original record ID in source store
  };
  summary: string;               // Human-readable summary (for UI and retrieval)
  tags: string[];                // Searchable tags (domain, outcome, topics)
  importanceScore: number;       // 0-1 priority for retrieval
  embeddingVector?: number[];    // Future: vector embedding for semantic search
  rawPayload: unknown;           // Full structured data at creation time
}
```

#### Memory Kinds

| Kind | Description | Source System |
|------|-------------|---------------|
| `framescan_report` | Text/image/audio frame analysis | FrameScan |
| `framescan_call_analysis` | Call transcript analysis (planned) | Calls module |
| `little_lord_exchange` | User message + AI response pair | Little Lord |
| `psychometric_profile_snapshot` | Profile update for a contact | Psychometrics |
| `want_tracking_snapshot` | Compliance calculation result | Want Tracking |
| `custom_test_definition` | User-created diagnostic test (planned) | Custom Tests |
| `custom_test_response` | Response to a custom test (planned) | Custom Tests |
| `application_chat_turn` | Coaching application conversation | Application Chat |
| `beta_chat_turn` | Beta screening conversation | Beta Chat |
| `doctrine_update` | Change to frame doctrine | Doctrine system |
| `policy_decision` | Policy rule application result | Policy layer |

#### Storage Implementation

**Short term (now)**: In-memory store following existing pattern (`src/services/aiMemoryStore.ts`)

```typescript
// Same pattern as noteStore, contactStore, etc.
let MEMORIES: AIMemoryRecord[] = [];
let FEEDBACK: AIFeedbackRecord[] = [];

export const addMemory = (record: Omit<AIMemoryRecord, 'id' | 'createdAt'>): AIMemoryRecord
export const searchMemories = (options: SearchOptions): AIMemoryRecord[]
export const addFeedback = (record: Omit<AIFeedbackRecord, 'id' | 'createdAt'>): AIFeedbackRecord
```

**Medium term (Supabase)**:
- Table: `ai_memories` with JSONB payload column
- Index: `idx_memories_contact_kind` for fast contact+kind queries
- Vector: pgvector column for semantic similarity search

**Interface boundary**: The store exposes the same API regardless of backing. Calling code never knows if data is in memory or Supabase.

---

### Layer 2: Policy Layer and Doctrine

**Purpose**: Centralize rules that govern AI behavior across all systems.

#### Current State

FrameLord already has doctrine files:
- `ai_knowledge/APEX_SUPREMACY_FILTER.txt` - Primary semantic layer
- `ai_knowledge/psychometrics/*.txt` - Profile-specific inference rules
- `ai_knowledge/frame_dynamics_for_crm.txt` - CRM-specific rules

#### Policy Layer Addition

Add a runtime policy system that can:
1. **Load** doctrine files at startup
2. **Override** specific rules based on tenant/user preferences
3. **Log** policy decisions to AI memory for learning

```typescript
interface PolicyRule {
  id: string;
  domain: string;              // 'framescan', 'little_lord', 'psychometrics', etc.
  ruleType: 'must' | 'should' | 'prefer' | 'avoid' | 'never';
  condition: string;           // Human-readable condition
  action: string;              // What to do when condition matches
  priority: number;            // Higher = evaluated first
  enabled: boolean;
  overrideLevel: 'platform' | 'tenant' | 'user';
}

interface PolicyEngine {
  evaluateForContext(system: AISystemId, context: any): PolicyDecision[];
  getApplicableRules(system: AISystemId): PolicyRule[];
}
```

#### How Systems Connect

| System | Doctrine Used | Policy Checkpoints |
|--------|--------------|-------------------|
| FrameScan | `APEX_SUPREMACY_FILTER`, domain doctrine | Before scoring, during axis weighting |
| Little Lord | All doctrine files | Guardrail checks, want validation |
| Psychometrics | Profile-specific doctrine | Confidence thresholds, risk assessment |
| Application Chat | (needs doctrine) | Screening criteria |
| Beta Chat | (needs doctrine) | Acceptance criteria |
| Calls | (planned) | Segment labeling rules, coaching rules |
| Custom Tests | (planned) | Test design constraints, analysis rules |

---

### Layer 3: Context and Retrieval

**Purpose**: Give AI systems access to relevant past experiences and knowledge.

#### Context Sources

For any AI call, context can include:

1. **Contact context**: Who this is about
   - Contact profile, psychometrics, recent notes
   - Past FrameScans for this contact
   - Relationship history (interactions, calls)

2. **Historical context**: What we've learned
   - Similar past analyses (by domain, topic, outcome)
   - High-quality examples (highly rated by feedback)
   - Policy decisions that applied before

3. **Session context**: What just happened
   - Recent user actions
   - Current view/state in the app
   - Active wants and tasks

#### Retrieval API

```typescript
interface ContextRetriever {
  // Get relevant memories for a new AI call
  getContextForCall(params: {
    system: AISystemId;
    contactId: string | null;
    currentInput: string;
    maxMemories: number;
  }): Promise<AIMemoryRecord[]>;

  // Get high-quality examples for few-shot prompting
  getExamplesForSystem(params: {
    system: AISystemId;
    kind: AIMemoryKind;
    preferPositiveFeedback: boolean;
    limit: number;
  }): AIMemoryRecord[];

  // Get recent interactions for continuity
  getRecentMemoriesForContact(contactId: string, limit: number): AIMemoryRecord[];
}
```

#### Retrieval Strategy (In-Memory Phase)

Without vector embeddings, retrieval uses:
1. **Exact match**: Same contactId, same kind
2. **Tag overlap**: Shared tags (domain, topics)
3. **Recency**: More recent = more relevant
4. **Feedback score**: Positive feedback boosts priority

```typescript
function computeRelevanceScore(memory: AIMemoryRecord, query: SearchQuery): number {
  let score = 0;

  // Same contact: +0.3
  if (memory.contactId === query.contactId) score += 0.3;

  // Same kind: +0.2
  if (memory.kind === query.kind) score += 0.2;

  // Tag overlap: +0.1 per matching tag
  const matchingTags = memory.tags.filter(t => query.tags.includes(t));
  score += matchingTags.length * 0.1;

  // Recency: +0.2 for last 7 days, decaying
  const age = Date.now() - new Date(memory.createdAt).getTime();
  const daysOld = age / (1000 * 60 * 60 * 24);
  score += Math.max(0, 0.2 - (daysOld * 0.02));

  // Feedback boost: +0.2 for positive, -0.1 for negative
  score += memory.feedbackScore * 0.2;

  return score;
}
```

---

### Layer 4: Dynamic Prompt Assembly

**Purpose**: Build prompts that incorporate retrieved context, examples, and policy.

#### Current State

Each AI system builds prompts independently:
- FrameScan: `buildSystemPrompt()` in `frameScanLLM.ts`
- Little Lord: `buildSystemPrompt()` in `runLittleLord.ts`
- Psychometrics: `buildSystemPrompt()` in each inference file

#### Unified Prompt Builder

```typescript
interface PromptBuilder {
  buildPrompt(params: {
    system: AISystemId;
    basePrompt: string;
    doctrine: string;
    fewShotExamples: AIMemoryRecord[];
    contactContext: ContactContext;
    policyRules: PolicyRule[];
    userInput: string;
  }): {
    systemPrompt: string;
    userPrompt: string;
    metadata: PromptMetadata;
  };
}
```

#### Few-Shot Example Injection

```typescript
function injectFewShotExamples(
  basePrompt: string,
  examples: AIMemoryRecord[]
): string {
  if (examples.length === 0) return basePrompt;

  const exampleBlock = examples.map(ex => `
### Example ${ex.id}
Input: ${ex.rawPayload.input}
Output: ${JSON.stringify(ex.rawPayload.output, null, 2)}
${ex.feedbackScore > 0 ? '(This was rated as high-quality)' : ''}
`).join('\n');

  return `${basePrompt}

=== EXAMPLES FROM PAST ANALYSES ===

${exampleBlock}

=== END EXAMPLES ===
`;
}
```

---

### Layer 5: Model Routing (Stub)

**Purpose**: Select the best model for each task based on complexity, cost, and quality needs.

#### Current State

Fixed model assignments:
- FrameScan/Little Lord/Psychometrics: `gpt-4o-mini` via OpenAI
- Application/Beta Chat: `gemini-2.5-flash` via Gemini

#### Future Routing Logic

```typescript
interface ModelRouter {
  selectModel(params: {
    system: AISystemId;
    complexity: 'low' | 'medium' | 'high';
    costSensitivity: 'low' | 'medium' | 'high';
    qualityCritical: boolean;
  }): ModelConfig;
}

// Stub implementation for now
function selectModel(params: RouteParams): ModelConfig {
  // Default to existing assignments
  const defaults: Record<AISystemId, ModelConfig> = {
    framescan: { provider: 'openai', model: 'gpt-4o-mini' },
    little_lord: { provider: 'openai', model: 'gpt-4o-mini' },
    psychometrics: { provider: 'openai', model: 'gpt-4o-mini' },
    application_chat: { provider: 'gemini', model: 'gemini-2.5-flash' },
    beta_chat: { provider: 'gemini', model: 'gemini-2.5-flash' },
    calls: { provider: 'openai', model: 'gpt-4o-mini' },
    custom_tests: { provider: 'openai', model: 'gpt-4o-mini' },
  };

  return defaults[params.system];
}
```

---

### Layer 6: Guardrails and Validation

**Purpose**: Ensure AI outputs meet quality and safety standards before delivery.

#### Current State

Little Lord has guardrails:
- `disrespect`, `gossip`, `spying`, `domain_violation`, `bad_frame`

Other systems have no output validation.

#### Unified Guardrail System

```typescript
interface GuardrailCheck {
  id: string;
  name: string;
  appliesTo: AISystemId[];
  check: (output: any) => GuardrailResult;
}

interface GuardrailResult {
  passed: boolean;
  violation?: string;
  severity: 'info' | 'warning' | 'error' | 'block';
  suggestion?: string;
}

// Core guardrails for all systems
const coreGuardrails: GuardrailCheck[] = [
  {
    id: 'no_pii_leak',
    name: 'PII Protection',
    appliesTo: ['all'],
    check: (output) => checkForPII(output),
  },
  {
    id: 'confidence_sanity',
    name: 'Confidence Sanity Check',
    appliesTo: ['framescan', 'psychometrics'],
    check: (output) => checkConfidenceRange(output),
  },
  {
    id: 'score_sanity',
    name: 'Score Range Check',
    appliesTo: ['framescan', 'custom_tests'],
    check: (output) => checkScoreRange(output),
  },
];
```

#### Post-Processing Pipeline

```typescript
async function processAIOutput<T>(
  system: AISystemId,
  rawOutput: T,
  context: ProcessContext
): Promise<ProcessedOutput<T>> {
  // 1. Run guardrails
  const guardrailResults = await runGuardrails(system, rawOutput);

  // 2. Log any violations
  if (guardrailResults.some(r => !r.passed)) {
    logGuardrailViolations(system, guardrailResults);
  }

  // 3. Block if critical violation
  if (guardrailResults.some(r => r.severity === 'block')) {
    return { blocked: true, violations: guardrailResults };
  }

  // 4. Create memory record
  const memory = await aiMemoryStore.addMemory({
    kind: systemToKind(system),
    contactId: context.contactId,
    source: { system, key: context.requestId },
    summary: generateSummary(rawOutput),
    tags: extractTags(rawOutput),
    importanceScore: calculateImportance(rawOutput),
    rawPayload: rawOutput,
  });

  return { blocked: false, output: rawOutput, memoryId: memory.id };
}
```

---

### Layer 7: Feedback and Learning Loops

**Purpose**: Capture signals about AI quality and use them to improve over time.

#### Feedback Types

```typescript
type AIFeedbackKind =
  | 'thumbs_up'          // User explicitly approved
  | 'thumbs_down'        // User explicitly disapproved
  | 'correction'         // User provided corrected output
  | 'follow_up'          // User asked follow-up (implicit positive)
  | 'user_override'      // User manually changed AI output
  | 'user_edit'          // User edited AI-generated content
  | 'action_taken'       // User took suggested action (implicit positive)
  | 'action_ignored'     // User ignored suggestion (implicit negative)
  | 'regenerate'         // User asked to regenerate (implicit negative)
  ;

interface AIFeedbackRecord {
  id: string;
  memoryId: string | null;       // Which memory this is about
  contactId: string | null;      // Contact context
  createdAt: string;
  kind: AIFeedbackKind;
  rating: number | null;         // 1-5 for detailed ratings
  comment: string | null;        // User's explanation
  correctedOutput?: unknown;     // For 'correction' type
  source: { system: string; key: string };
}
```

#### Explicit Feedback Collection

UI components add simple feedback controls:

```tsx
// FeedbackControls component (added to AI output views)
function FeedbackControls({ memoryId, contactId, system }: FeedbackProps) {
  const handleFeedback = (kind: 'thumbs_up' | 'thumbs_down') => {
    aiMemoryStore.addFeedback({
      memoryId,
      contactId,
      kind,
      rating: kind === 'thumbs_up' ? 5 : 1,
      comment: null,
      source: { system, key: memoryId },
    });
  };

  return (
    <div className="flex gap-2">
      <button onClick={() => handleFeedback('thumbs_up')}>
        <ThumbsUp />
      </button>
      <button onClick={() => handleFeedback('thumbs_down')}>
        <ThumbsDown />
      </button>
    </div>
  );
}
```

#### Implicit Feedback Collection

Track user actions that indicate satisfaction:

| Action | Feedback Interpretation |
|--------|------------------------|
| User runs another scan within 5 min | Implicit positive (engaged) |
| User copies AI text | Implicit positive (using it) |
| User immediately closes modal | Implicit negative (rejected) |
| User asks Little Lord follow-up | Implicit positive (continuing) |
| User edits FrameScan corrections | Implicit negative (wasn't right) |
| User completes suggested task | Strong positive (action taken) |

```typescript
// Implicit feedback hooks
function trackImplicitFeedback(event: UserEvent) {
  switch (event.type) {
    case 'copy_ai_text':
      aiMemoryStore.addFeedback({
        memoryId: event.memoryId,
        kind: 'action_taken',
        rating: 4,
        source: { system: event.system, key: 'implicit_copy' },
      });
      break;
    case 'close_immediately':
      aiMemoryStore.addFeedback({
        memoryId: event.memoryId,
        kind: 'action_ignored',
        rating: 2,
        source: { system: event.system, key: 'implicit_close' },
      });
      break;
    // ... etc
  }
}
```

#### Learning Loop

When retrieving examples for prompts, factor in feedback:

```typescript
function getHighQualityExamples(system: AISystemId, limit: number): AIMemoryRecord[] {
  const memories = aiMemoryStore.listMemoriesByKind(systemToKind(system));

  // Calculate quality score from feedback
  const withScores = memories.map(mem => {
    const feedback = aiMemoryStore.listFeedbackForMemory(mem.id);
    const positiveCount = feedback.filter(f =>
      ['thumbs_up', 'action_taken', 'follow_up'].includes(f.kind)
    ).length;
    const negativeCount = feedback.filter(f =>
      ['thumbs_down', 'action_ignored', 'regenerate'].includes(f.kind)
    ).length;

    const qualityScore = (positiveCount - negativeCount) / Math.max(feedback.length, 1);
    return { memory: mem, qualityScore };
  });

  // Sort by quality, take top N
  return withScores
    .sort((a, b) => b.qualityScore - a.qualityScore)
    .slice(0, limit)
    .map(ws => ws.memory);
}
```

---

## System Integration Map

### How Each AI System Plugs In

#### FrameScan (Text/Image/Audio)

**Memory creation**: After `addFrameScanReport()` completes
```typescript
// In frameScanReportStore.ts or new adapter
function onFrameScanReportAdded(report: FrameScanReport) {
  aiMemoryStore.addMemory({
    kind: 'framescan_report',
    contactId: report.subjectContactIds[0] ?? null,
    source: { system: 'framescan', key: report.id },
    summary: `${report.score.frameScore}/100 ${report.domain} scan`,
    tags: [
      report.domain,
      report.modality,
      report.score.frameScore >= 70 ? 'strong' : report.score.frameScore >= 40 ? 'mixed' : 'weak',
      ...extractTopicsFromReport(report),
    ],
    importanceScore: report.score.frameScore >= 80 || report.score.frameScore <= 30 ? 0.9 : 0.5,
    rawPayload: report,
  });
}
```

**Context retrieval**: Before building prompt
```typescript
// In frameScanLLM.ts
async function runTextFrameScan(input: TextFrameScanInput) {
  // Get relevant past scans for few-shot examples
  const examples = aiMemoryHelpers.getRecentHighQualityExamplesForSystem('framescan', {
    contactId: input.contactId,
    limit: 3,
  });

  // Build prompt with examples
  const prompt = injectFewShotExamples(basePrompt, examples);

  // ... rest of existing logic
}
```

**Feedback UI**: Add to `FrameScanReportLayout.tsx`

---

#### Little Lord

**Memory creation**: After each `runLittleLord()` call
```typescript
function onLittleLordExchange(input: string, output: LittleLordRunOutput, contactId: string) {
  aiMemoryStore.addMemory({
    kind: 'little_lord_exchange',
    contactId,
    source: { system: 'little_lord', key: generateExchangeId() },
    summary: `${input.slice(0, 50)}... → ${output.reply.slice(0, 50)}...`,
    tags: [
      output.event?.type ?? 'coaching',
      output.guardrail ? 'guardrail_triggered' : 'clean',
      output.validation?.isValidWant === false ? 'should_rejected' : null,
    ].filter(Boolean),
    importanceScore: output.event ? 0.8 : 0.5,
    rawPayload: { input, output },
  });
}
```

**Context retrieval**: Include in Little Lord context gathering
```typescript
// In runLittleLord.ts
const recentExchanges = aiMemoryStore.searchMemories({
  kind: 'little_lord_exchange',
  contactId: targetContactId,
  limit: 5,
});
```

**Feedback UI**: Add to `LittleLordChat.tsx`

---

#### Psychometrics

**Memory creation**: After profile update
```typescript
function onPsychometricProfileUpdated(profile: PsychometricProfile) {
  aiMemoryStore.addMemory({
    kind: 'psychometric_profile_snapshot',
    contactId: profile.contactId,
    source: { system: 'psychometrics', key: `${profile.contactId}_${Date.now()}` },
    summary: `Profile update: ${profile.status}`,
    tags: [
      profile.bigFive ? 'big_five_update' : null,
      profile.mbti?.primaryType ? `mbti_${profile.mbti.primaryType}` : null,
      profile.disc?.type ? `disc_${profile.disc.type}` : null,
      profile.darkTraits?.overallRisk !== 'insufficient' ? 'dark_traits_assessed' : null,
    ].filter(Boolean),
    importanceScore: profile.status === 'confirmed' ? 0.9 : 0.5,
    rawPayload: profile,
  });
}
```

---

#### Want Tracking Penalty

**Memory creation**: Each time penalty is calculated
```typescript
function onWantPenaltyCalculated(breakdown: WantTrackingPenaltyBreakdown) {
  aiMemoryStore.addMemory({
    kind: 'want_tracking_snapshot',
    contactId: 'contact_zero',
    source: { system: 'wants', key: `penalty_${Date.now()}` },
    summary: `Penalty: ${breakdown.totalPenalty} pts (${breakdown.metricPenalties.length} metrics)`,
    tags: [
      breakdown.totalPenalty > 10 ? 'high_penalty' : breakdown.totalPenalty > 0 ? 'some_penalty' : 'no_penalty',
      ...breakdown.metricPenalties.map(mp => `metric_${mp.slug}_low`),
    ],
    importanceScore: breakdown.totalPenalty > 10 ? 0.9 : 0.3,
    rawPayload: breakdown,
  });
}
```

---

#### Calls and Messaging (Planned)

**Memory creation**: After call analysis
```typescript
interface CallAnalysis {
  callId: string;
  contactId: string;
  duration: number;
  transcriptSummary: string;
  segments: CallSegment[];
  overallFrameScore: number;
}

function onCallAnalysisComplete(analysis: CallAnalysis) {
  aiMemoryStore.addMemory({
    kind: 'framescan_call_analysis',
    contactId: analysis.contactId,
    source: { system: 'calls', key: analysis.callId },
    summary: `${analysis.duration}m call, score ${analysis.overallFrameScore}/100`,
    tags: [
      analysis.overallFrameScore >= 70 ? 'strong_call' : analysis.overallFrameScore >= 40 ? 'mixed_call' : 'weak_call',
      ...analysis.segments.filter(s => s.severity === 'red').map(s => `issue_${s.issueType}`),
    ],
    importanceScore: analysis.segments.some(s => s.severity === 'red') ? 0.9 : 0.6,
    rawPayload: analysis,
  });
}
```

---

#### Custom Tests (Planned)

**Memory creation**: Test definition and responses
```typescript
interface CustomTestDefinition {
  id: string;
  title: string;
  questions: TestQuestion[];
  scoringRules: ScoringRule[];
  createdBy: string;
}

interface CustomTestResponse {
  testId: string;
  respondentId: string | null; // null for anonymous
  contactId: string | null;    // null if not linked to a contact
  answers: Answer[];
  analysis: TestAnalysis;
}

function onCustomTestDefined(test: CustomTestDefinition) {
  aiMemoryStore.addMemory({
    kind: 'custom_test_definition',
    contactId: 'contact_zero', // Tests are owned by Contact Zero
    source: { system: 'custom_tests', key: test.id },
    summary: `Test: ${test.title} (${test.questions.length} questions)`,
    tags: ['test_definition', ...extractTestTopics(test)],
    importanceScore: 0.7,
    rawPayload: test,
  });
}

function onCustomTestResponseAnalyzed(response: CustomTestResponse) {
  aiMemoryStore.addMemory({
    kind: 'custom_test_response',
    contactId: response.contactId,
    source: { system: 'custom_tests', key: `${response.testId}_${response.respondentId ?? 'anon'}` },
    summary: `Response to ${response.testId}: ${response.analysis.overallScore}/100`,
    tags: [
      response.analysis.overallScore >= 70 ? 'high_fit' : response.analysis.overallScore >= 40 ? 'medium_fit' : 'low_fit',
      response.contactId ? 'linked_contact' : 'anonymous',
      ...response.analysis.flags,
    ],
    importanceScore: response.analysis.flags.includes('red_flag') ? 0.9 : 0.5,
    rawPayload: response,
  });
}
```

---

#### Application Chat and Beta Chat

**Memory creation**: Each conversation turn
```typescript
function onApplicationChatTurn(history: ChatMessage[], newMessage: string, aiResponse: string) {
  aiMemoryStore.addMemory({
    kind: 'application_chat_turn',
    contactId: null, // Applicants don't have contact records yet
    source: { system: 'application_chat', key: `turn_${Date.now()}` },
    summary: `Applicant: "${newMessage.slice(0, 40)}..." → AI: "${aiResponse.slice(0, 40)}..."`,
    tags: ['screening', detectTurnSentiment(aiResponse)],
    importanceScore: 0.4,
    rawPayload: { history, newMessage, aiResponse },
  });
}
```

---

## Concrete Data Examples

### Example 1: FrameScan Report Entering Memory

**Input**: User scans email draft "I was wondering if you might have time to discuss..."

**FrameScan Report Created**:
```json
{
  "id": "fsr_123",
  "score": { "frameScore": 32, ... },
  "domain": "sales_email",
  "modality": "text",
  "subjectContactIds": ["contact_zero"]
}
```

**AIMemoryRecord Created**:
```json
{
  "id": "mem_456",
  "kind": "framescan_report",
  "contactId": "contact_zero",
  "createdAt": "2025-12-11T10:30:00Z",
  "source": { "system": "framescan", "key": "fsr_123" },
  "summary": "32/100 sales_email scan",
  "tags": ["sales_email", "text", "weak", "apologetic_framing"],
  "importanceScore": 0.9,
  "rawPayload": { /* full FrameScanReport */ }
}
```

### Example 2: Little Lord Exchange Entering Memory

**User Input**: "I want to double my income this year"

**Little Lord Output**:
```json
{
  "reply": "That's a Want, not a Should. Let's break it down...",
  "event": { "type": "want.create", "payload": { "title": "Double income" } },
  "validation": { "isValidWant": true, "reason": "Direct sovereign desire" }
}
```

**AIMemoryRecord Created**:
```json
{
  "id": "mem_789",
  "kind": "little_lord_exchange",
  "contactId": "contact_zero",
  "createdAt": "2025-12-11T10:35:00Z",
  "source": { "system": "little_lord", "key": "exc_001" },
  "summary": "I want to double my income... → That's a Want, not a Should...",
  "tags": ["coaching", "want_creation", "clean"],
  "importanceScore": 0.8,
  "rawPayload": { "input": "...", "output": { ... } }
}
```

### Example 3: Call Transcript Entering Memory (Planned)

**Call Data**:
```json
{
  "callId": "call_abc",
  "contactId": "contact_jane_doe",
  "duration": 1230,
  "transcript": "..."
}
```

**Analysis Result**:
```json
{
  "overallFrameScore": 58,
  "segments": [
    { "start": 45, "end": 60, "severity": "yellow", "issueType": "hedging" },
    { "start": 180, "end": 195, "severity": "red", "issueType": "price_apologizing" }
  ]
}
```

**AIMemoryRecord Created**:
```json
{
  "id": "mem_call_001",
  "kind": "framescan_call_analysis",
  "contactId": "contact_jane_doe",
  "createdAt": "2025-12-11T11:00:00Z",
  "source": { "system": "calls", "key": "call_abc" },
  "summary": "20m call, score 58/100",
  "tags": ["mixed_call", "issue_hedging", "issue_price_apologizing"],
  "importanceScore": 0.9,
  "rawPayload": { /* full analysis */ }
}
```

### Example 4: Custom Test Response Entering Memory (Planned)

**Test Definition**: "Sales Personality Assessment"

**Response**:
```json
{
  "testId": "test_sales_001",
  "respondentId": "lead_xyz",
  "contactId": null,
  "answers": [ ... ],
  "analysis": {
    "overallScore": 78,
    "flags": ["high_assertiveness", "low_empathy"]
  }
}
```

**AIMemoryRecord Created**:
```json
{
  "id": "mem_test_001",
  "kind": "custom_test_response",
  "contactId": null,
  "createdAt": "2025-12-11T11:30:00Z",
  "source": { "system": "custom_tests", "key": "test_sales_001_lead_xyz" },
  "summary": "Response to test_sales_001: 78/100",
  "tags": ["high_fit", "anonymous", "high_assertiveness", "low_empathy"],
  "importanceScore": 0.5,
  "rawPayload": { /* full response */ }
}
```

---

## First Feedback Loop: Implementation Plan

### Phase 1: Explicit Thumbs Up/Down (Now)

1. Add `FeedbackControls` component to key AI views:
   - FrameScan report detail
   - Little Lord chat messages
   - (Later) Call analysis view
   - (Later) Custom test report view

2. When user clicks:
   - Create `AIFeedbackRecord` with `thumbs_up` or `thumbs_down`
   - Toast confirmation: "Feedback recorded"

3. When retrieving examples:
   - Prefer memories with positive feedback
   - Exclude memories with negative feedback from examples

### Phase 2: Implicit Signals (Next)

1. Track implicit positive signals:
   - User copies AI-generated text
   - User completes suggested task/want
   - User continues Little Lord conversation
   - User shares or exports a report

2. Track implicit negative signals:
   - User immediately closes modal
   - User regenerates response
   - User manually edits AI output significantly

3. Factor into retrieval ranking

### Phase 3: Corrections (Future)

1. Allow users to provide "correct" output when they disagree
2. Store corrected outputs in feedback record
3. Use corrections as high-quality few-shot examples

---

## Storage Evolution Path

### Phase 1: In-Memory (Now)
```
aiMemoryStore.ts
├── MEMORIES: AIMemoryRecord[]
├── FEEDBACK: AIFeedbackRecord[]
├── Filtering by kind, contactId, tags
└── Sorted by recency and importance
```

### Phase 2: Supabase (Medium Term)
```
Supabase Tables
├── ai_memories
│   ├── id, kind, contact_id, tenant_id
│   ├── created_at, source, summary
│   ├── tags (text[]), importance_score
│   └── raw_payload (jsonb)
├── ai_feedback
│   ├── id, memory_id, contact_id
│   ├── kind, rating, comment
│   └── source, corrected_output
└── Indexes
    ├── idx_memories_contact_kind
    ├── idx_memories_tenant_created
    └── idx_feedback_memory
```

### Phase 3: Vector Search (Future)
```
pgvector Extension
├── embedding column on ai_memories
├── Semantic similarity queries
└── Combined vector + metadata filtering
```

**Interface stays the same**: Calling code uses `aiMemoryStore.searchMemories()` regardless of backing.

---

## Summary

This self-improving AI layer adds:

1. **Unified memory** for all AI interactions across systems
2. **Feedback capture** to learn what works
3. **Context retrieval** to inform future AI calls
4. **Dynamic prompt assembly** with few-shot examples
5. **Guardrails and validation** across all systems
6. **Policy layer** for centralized rule management

All of this works **locally first** with in-memory stores, but is designed to evolve to Supabase + pgvector without changing calling code.

The key insight: **models don't need to be retrained to get smarter**. By capturing what worked, retrieving similar contexts, and incorporating feedback into prompts, the system improves through better context rather than changed weights.

---

*Document created: 2025-12-11*
*Architecture version: 1.0*
