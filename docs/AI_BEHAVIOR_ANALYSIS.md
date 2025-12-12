# FrameLord AI Behavior Analysis

A comprehensive analysis of all AI-powered behavior in the FrameLord application, documenting how each system works, what decisions it makes, and how data flows through the application.

---

## 1. AI Entry Points

FrameLord has **six distinct AI systems**, each with different purposes and providers:

| System | Purpose | LLM Provider | Entry Function |
|--------|---------|--------------|----------------|
| **FrameScan** | Analyze text/images for frame control signals | OpenAI GPT-4 | `runTextFrameScan()`, `runImageFrameScan()` |
| **Little Lord** | In-app coaching assistant with guardrails | OpenAI GPT-4 | `runLittleLord()` |
| **Psychometrics** | Infer personality profiles from evidence | OpenAI GPT-4 | `inferBigFiveForContact()`, etc. |
| **Application Chat** | Screen coaching applicants | Google Gemini | `submitApplicationChat()` |
| **Beta Chat** | Screen beta program applicants | Google Gemini | `submitBetaApplicationChat()` |
| **Legacy Frame Analysis** | Original frame analysis (deprecated) | Google Gemini | `analyzeFrame()` |

### Provider Configuration

- **OpenAI**: Configured via `VITE_OPENAI_API_KEY` environment variable, called through `src/lib/llm/openaiClient.ts`
- **Gemini**: Configured via `API_KEY` environment variable, called through `src/lib/llm/geminiService.ts`
- **NanoBanana**: Image annotation service for visual frame analysis, called through `src/lib/llm/nanobananaClient.ts`

All clients return **mock data** when API keys are missing, allowing development without live API access.

---

## 2. Algorithms and Decision Logic

### 2.1 FrameScan System

**Purpose**: Analyze communication for authority signals across 9 axes.

#### The 9-Axis Model

| Axis | What It Measures | Score Range |
|------|------------------|-------------|
| Challenge | Response to pushback/resistance | -3 to +3 |
| Value | Perceived exchange balance | -3 to +3 |
| Intent | Directness of purpose | -3 to +3 |
| Compliance | Request for action/commitment | -3 to +3 |
| Status | Relative positioning | -3 to +3 |
| Qualification | Screening vs. being screened | -3 to +3 |
| Consequence | Implied outcomes | -3 to +3 |
| Attention | Control of focus | -3 to +3 |
| Polarity | Emotional clarity | -3 to +3 |

#### Scoring Algorithm (`frameScoring.ts`)

1. **Normalize Axis Scores**: Each axis score (-3 to +3) is converted to 0-100 scale
   ```
   normalizedScore = ((rawScore + 3) / 6) * 100
   ```

2. **Compute Axis Weights**: Domain-specific weighting prioritizes relevant axes
   - Business domain weights `challenge`, `value`, `intent` higher
   - Personal domain weights `polarity`, `status` higher
   - Default weights all axes equally

3. **Calculate Weighted Average**: Base score from weighted axis scores

4. **Apply Win/Win Adjustment**:
   - If `overallWinWinState` is negative, subtract up to 10 points penalty
   - Ensures exploitative frames are penalized even with high axis scores

5. **Final Score**: Clamped to 0-100 range

#### Key File Locations
- LLM orchestration: `src/lib/frameScan/frameScanLLM.ts:1-340`
- Pure scoring: `src/lib/frameScan/frameScoring.ts:1-200`
- Doctrine loading: `src/services/doctrineLoader.ts:1-150`

---

### 2.2 Little Lord Coaching System

**Purpose**: Context-aware AI assistant that coaches users on frame control while enforcing behavioral guardrails.

#### How It Works

1. **Context Gathering**: Collects from stores:
   - Contact Zero (user identity)
   - Active contact being discussed
   - Recent notes and FrameScan reports
   - Current wants and tasks
   - Recent Little Lord conversation history

2. **Doctrine Injection**: System prompt includes:
   - `APEX_SUPREMACY_FILTER` (primary semantic layer)
   - `frame_dynamics_for_crm` (CRM-specific rules)
   - `little_lord_operational_rules` (guardrails and behaviors)

3. **Guardrail Checks**: Every response is checked for:
   - `disrespect` - Insults or degrading language toward contacts
   - `gossip` - Speculative negative talk
   - `spying` - Encouraging surveillance of contacts
   - `domain_violation` - Advice outside authorized domains
   - `bad_frame` - Responses that would weaken user's frame

4. **Event Generation**: Little Lord can emit structured events:
   - `task.create` - Create a new task
   - `want.create` - Create a new want
   - `want.validate` - Check if a want is a "should" vs true want
   - `interaction.log` - Log an interaction with a contact
   - `framescan.request` - Trigger a new FrameScan

5. **Want Validation**: Distinguishes between:
   - **Wants**: True sovereign desires ("I want to close this deal")
   - **Shoulds**: External obligations repackaged as desires ("I should call Mom")
   - Returns `isValidWant: boolean` and `reason: string`

6. **Directness Checking**: For wants attached to contacts, validates causal relevance
   - Ensures the contact is directly relevant to achieving the want
   - Prevents blame-shifting or indirect responsibility

#### Key File Location
- `src/lib/agents/runLittleLord.ts:1-450`

---

### 2.3 Psychometric Inference System

**Purpose**: Build personality profiles for contacts based on accumulated evidence.

#### Four Profile Types

| Profile | What It Measures | Output |
|---------|------------------|--------|
| **Big Five** | OCEAN personality traits | 5 scores (0-1) + confidence |
| **MBTI** | Cognitive preferences | Primary type + candidates |
| **DISC** | Behavioral style | D/I/S/C type + confidence |
| **Dark Traits** | Risk assessment | Narcissism, Machiavellianism, Psychopathy scores |

#### How Inference Works

1. **Evidence Collection**: Evidence is gathered from:
   - Notes about the contact
   - FrameScan reports involving the contact
   - Interaction logs

2. **Doctrine Loading**: Each profile type has its own doctrine file:
   - `ai_knowledge/psychometrics/big_five_doctrine.txt`
   - `ai_knowledge/psychometrics/mbti_doctrine.txt`
   - `ai_knowledge/psychometrics/disc_doctrine.txt`
   - `ai_knowledge/psychometrics/dark_trait_doctrine.txt`

3. **LLM Analysis**: For each profile type:
   - System prompt includes full doctrine
   - User message contains evidence summaries (last 20 entries)
   - Response expected as JSON with scores and confidence

4. **Confidence Calculation**:
   ```
   0 evidence     → "insufficient"
   1-2 evidence   → "low"
   3-9 evidence   → "medium"
   10-24 evidence → "high"
   25+ evidence   → "high" (max from evidence; "confirmed" requires formal assessment)
   ```

5. **Profile Preservation**: Each profile type preserves existing values for other types
   - Updating Big Five doesn't reset MBTI scores
   - Profiles accumulate over time

#### Key File Locations
- Big Five: `src/lib/psychometricInferenceBigFive.ts:1-302`
- MBTI: `src/lib/psychometricInferenceMbti.ts`
- DISC: `src/lib/psychometricInferenceDisc.ts`
- Dark Traits: `src/lib/psychometricInferenceDarkTraits.ts`
- Store: `src/services/psychometricStore.ts`

---

### 2.4 Want Tracking Penalty System

**Purpose**: Penalize Contact Zero's FrameScore based on self-defined goal compliance.

#### How It Works

1. **14-Day Rolling Window**: Looks at the last 14 days of Want Tracking data

2. **Compliance Threshold**: 70% - metrics must be hit 70% of tracked days

3. **Per-Metric Penalty**:
   ```
   For each weighted metric:
     if complianceRate < 0.70:
       penalty = (0.70 - complianceRate) * metricWeight * scalingFactor
   ```

4. **Ramp-Up Protection**:
   - If fewer than 7 days tracked, penalty is scaled down
   - Prevents harsh penalties for new metrics

5. **Maximum Penalty**: Capped at 20 points total

6. **Application**: Only affects Contact Zero's cumulative FrameScore
   - Other contacts are not penalized by Want Tracking

#### Key File Location
- `src/lib/frameScan/wantTrackingPenalty.ts:1-150`

---

### 2.5 Application Screening AI

**Purpose**: Screen coaching applicants via conversational AI.

#### How It Works

1. **Initial Message**: "I am the Case Officer for the FrameLord Strategy Unit..."

2. **Conversation Flow**: Gemini receives:
   - Full conversation history
   - New user message
   - Role instruction as "Senior Case Officer"

3. **Evaluation**: AI evaluates applicant fit based on conversation

4. **No Structured Output**: Returns free-form text responses

#### Key File Locations
- Component: `src/components/ApplicationPage.tsx:1-203`
- AI Service: `src/lib/llm/geminiService.ts:162-172`

---

### 2.6 Beta Screening AI

**Purpose**: Screen beta program applicants via conversational AI.

#### How It Works

1. **Initial Message**: "I am the Beta Program Director..."

2. **Conversation Flow**: Gemini receives:
   - Full conversation history
   - New user message
   - Role instruction as "Beta Program Director"

3. **Evaluation**: AI evaluates applicant fit for early adopter program

#### Key File Locations
- Component: `src/components/BetaPage.tsx:1-198`
- AI Service: `src/lib/llm/geminiService.ts:174-184`

---

## 3. Data Flows and Storage

### 3.1 FrameScan Data Flow

```
User Input (text/image/audio)
    ↓
frameScanLLM.runTextFrameScan() or runImageFrameScan()
    ↓
doctrineLoader.getSelectiveDoctrine() → Loads APEX_SUPREMACY_FILTER + domain doctrine
    ↓
openaiClient.callOpenAIChat() → GPT-4 returns FrameScanResult
    ↓
frameScoring.scoreFrameScan() → Pure scoring algorithm
    ↓
frameScanReportStore.addFrameScanReport() → Stores FrameScanReport
    ↓
psychometricFrameScanAdapter → Adds evidence to psychometricStore
    ↓
contactStore.updateFrameMetricsForContact() → Updates contact's frame metrics
```

### 3.2 Little Lord Data Flow

```
User Message
    ↓
runLittleLord() gathers context from:
    ├── contactStore → Contact Zero, selected contact
    ├── noteStore → Recent notes
    ├── frameScanReportStore → Recent scans
    ├── wantStore → Active wants
    └── Little Lord history
    ↓
buildSystemPrompt() with doctrine injection
    ↓
openaiClient.callOpenAIChat() → GPT-4
    ↓
Parse response for:
    ├── reply (text to show user)
    ├── event (optional: task, want, interaction)
    ├── validation (optional: want validation result)
    ├── directnessCheck (optional: contact relevance)
    └── guardrail (optional: violation detected)
    ↓
If event generated → dispatch to appropriate store
```

### 3.3 Psychometric Data Flow

```
Evidence Sources:
    ├── noteStore → Notes about contact
    ├── frameScanReportStore → FrameScans involving contact
    └── interactionStore → Interaction logs
    ↓
psychometricNoteAdapter.addNoteAsPsychometricEvidence()
psychometricFrameScanAdapter.addFrameScanAsPsychometricEvidence()
    ↓
psychometricStore.addEvidence()
    ↓
User/System triggers profile update
    ↓
psychometricBigFiveClient.updateBigFiveProfileForContact()
    ↓
psychometricInferenceBigFive.inferBigFiveForContact()
    ↓
Load doctrine + evidence → callOpenAIChat() → Parse JSON
    ↓
psychometricStore.upsertProfile()
```

### 3.4 Want Tracking → FrameScore Flow

```
User logs daily metrics in Want Tracking Board
    ↓
wantTrackingStore.upsertDayEntry()
    ↓
When FrameProfile is computed for Contact Zero:
    ↓
frameProfile.computeCumulativeFrameProfileForContact()
    ↓
wantTrackingPenalty.calculateWantTrackingPenalty()
    ↓
Retrieves weighted metrics from wantTrackingStore
    ↓
Calculates 14-day compliance per metric
    ↓
Applies penalty to base FrameScore
    ↓
Returns CumulativeFrameProfile with penalty breakdown
```

---

## 4. How AI Affects Scores and Behavior

### 4.1 FrameScore Impact

| AI System | Impact on FrameScore |
|-----------|---------------------|
| FrameScan | Generates the score (0-100) |
| Little Lord | No direct impact on score |
| Psychometrics | No direct impact on score |
| Want Tracking Penalty | Subtracts up to 20 points from Contact Zero's cumulative score |

### 4.2 Contact Profile Impact

| AI System | Impact on Contact Profile |
|-----------|---------------------------|
| FrameScan | Updates `frameScore`, `lastScanDate`, `totalScans` |
| Psychometrics | Populates `bigFive`, `mbti`, `disc`, `darkTraits` profiles |
| Little Lord | Can create interactions, log activities |

### 4.3 User Behavior Nudges

| AI System | Behavioral Influence |
|-----------|---------------------|
| FrameScan | Shows weaknesses, provides corrections |
| Little Lord | Validates wants vs shoulds, checks directness, enforces guardrails |
| Want Tracking | Penalizes inconsistency to encourage self-discipline |

---

## 5. Gaps, Risks, and Inconsistencies

### 5.1 Identified Gaps

| Gap | Description | Severity |
|-----|-------------|----------|
| **Application/Beta AI has no structured prompts** | Uses raw Gemini without structured system prompts or guardrails | Medium |
| **No token/cost tracking** | No monitoring of LLM usage or costs | Medium |
| **Psychometric evidence is not weighted** | All evidence counts equally regardless of recency or quality | Low |
| **No cross-profile correlation** | Big Five, MBTI, DISC are inferred independently | Low |
| **Want Tracking penalty is binary** | Either below 70% threshold or not - no gradient | Low |

### 5.2 Potential Risks

| Risk | Description | Mitigation |
|------|-------------|------------|
| **Mock data in production** | All AI systems return mock data if API keys missing | Add API key validation on startup |
| **Guardrail bypass** | Little Lord guardrails depend on LLM interpretation | Add post-processing validation |
| **Psychometric overconfidence** | "High" confidence from 25+ evidence items may still be speculative | Add user-facing disclaimers |
| **Dark Trait stigmatization** | Risk assessment could be misused | Add "behavioral risk, not clinical" warnings |

### 5.3 Inconsistencies

| Inconsistency | Description |
|---------------|-------------|
| **Two FrameScan systems** | `geminiService.analyzeFrame()` (legacy) and `frameScanLLM.runTextFrameScan()` (current) both exist |
| **Different scoring models** | Legacy Gemini uses 8 subscores, current OpenAI uses 9 axes |
| **Mixed providers** | FrameScan/Little Lord use OpenAI, Application/Beta use Gemini |
| **Doctrine loading differs** | FrameScan uses dynamic doctrine loading, Little Lord uses inline doctrine |

---

## 6. Key Files and Functions

### Core AI Files

| File | Purpose |
|------|---------|
| `src/lib/frameScan/frameScanLLM.ts` | FrameScan LLM orchestration |
| `src/lib/frameScan/frameScoring.ts` | Pure scoring algorithm |
| `src/lib/frameScan/frameProfile.ts` | Cumulative profile computation |
| `src/lib/frameScan/wantTrackingPenalty.ts` | Want compliance penalty |
| `src/lib/agents/runLittleLord.ts` | Little Lord agent |
| `src/lib/psychometricInferenceBigFive.ts` | Big Five inference |
| `src/lib/psychometricInferenceMbti.ts` | MBTI inference |
| `src/lib/psychometricInferenceDisc.ts` | DISC inference |
| `src/lib/psychometricInferenceDarkTraits.ts` | Dark Traits inference |
| `src/lib/llm/openaiClient.ts` | OpenAI HTTP client |
| `src/lib/llm/geminiService.ts` | Gemini client |
| `src/lib/llm/nanobananaClient.ts` | Image annotation client |

### Store Files

| File | Purpose |
|------|---------|
| `src/services/frameScanReportStore.ts` | FrameScan report storage |
| `src/services/psychometricStore.ts` | Psychometric profiles and evidence |
| `src/services/wantStore.ts` | Wants and steps |
| `src/services/wantTrackingStore.ts` | Daily metric tracking |
| `src/services/doctrineLoader.ts` | Doctrine file aggregation |

### Adapter Files

| File | Purpose |
|------|---------|
| `src/services/psychometricNoteAdapter.ts` | Feed notes → psychometric evidence |
| `src/services/psychometricFrameScanAdapter.ts` | Feed FrameScans → psychometric evidence |

### Doctrine Files

| File | Purpose |
|------|---------|
| `ai_knowledge/APEX_SUPREMACY_FILTER.txt` | Primary semantic layer for all AI |
| `ai_knowledge/psychometrics/big_five_doctrine.txt` | Big Five inference rules |
| `ai_knowledge/psychometrics/mbti_doctrine.txt` | MBTI inference rules |
| `ai_knowledge/psychometrics/disc_doctrine.txt` | DISC inference rules |
| `ai_knowledge/psychometrics/dark_trait_doctrine.txt` | Dark Trait inference rules |
| `ai_knowledge/frame_dynamics_for_crm.txt` | CRM-specific frame rules |

---

## 7. Summary

FrameLord's AI systems work together to:

1. **Diagnose**: FrameScan analyzes communication for authority signals
2. **Coach**: Little Lord provides context-aware guidance with guardrails
3. **Profile**: Psychometrics build personality profiles from accumulated evidence
4. **Discipline**: Want Tracking penalizes Contact Zero for inconsistent self-management
5. **Screen**: Application/Beta AI qualifies prospects for services

All AI systems rely on the **APEX_SUPREMACY_FILTER** doctrine as the primary semantic layer, ensuring consistent interpretation of "frame" concepts across the application.

The architecture is designed for **graceful degradation** - all systems return mock data when API keys are missing, allowing development and demonstration without live AI calls.

---

*Document generated: 2025-12-11*
*Based on codebase analysis of FrameLord application*
