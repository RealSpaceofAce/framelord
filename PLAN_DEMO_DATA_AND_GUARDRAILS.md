# Implementation Plan: Dev Demo Data + Little Lord Guardrails

**Status**: AWAITING APPROVAL
**Created**: 2025-12-07
**Scope**: Dev/demo mock data + doctrinal guardrails for Little Lord

---

## Executive Summary

This plan covers two major additions:

1. **Dev/Demo Mock Data** — Seed realistic Wants, Scopes, metrics, and iteration logs so the dashboard can be viewed with populated data
2. **Little Lord Guardrails** — Enforce zero tolerance for disrespect, gossip, spying, domain violations, and covert contracts via structured `guardrail` output and UI handshake

---

## Current State Summary

### Already Implemented (DO NOT UNDO)

- **wantStore.ts**: Full Want CRUD, dynamic metrics, `getDailyRows`, `calculateAverages/Sums`, chart data
- **wantScopeStore.ts**: Iteration entries with `consequence`, doctrine notes, congruency scoring, inert detection
- **WantScopeView.tsx**: Metrics table, charts, "Log Today", "Add Metric", doctrine notes, iteration log
- **WantsPage.tsx**: Board / Progress / Scope tabs with routing
- **LittleLordChat.tsx**: Event dispatch for all Want/Scope events, validation handling
- **runLittleLord.ts**: Corpus retrieval, Should vs Want detection, directness checks
- **little_lord_spec.json**: Event protocol, reasoning rules, safety rules

### What's Missing

1. No demo data — Scope views show empty tables/charts
2. No guardrail model in LLM output schema
3. No UI enforcement for disrespect/gossip (handshake)
4. No covert contract detection tied to Want validation
5. "Add Metric" button visible in production (should be Little Lord gated)

---

## PART A: Dev/Demo Mock Data

### A.1 Create `src/dev/seedWants.ts`

**Purpose**: Idempotent seeding of demo Wants, Scopes, metrics, and iterations.

```typescript
// src/dev/seedWants.ts

import {
  createWant,
  addStep,
  logMetricValue,
  addMetricType,
  getAllWants
} from '../services/wantStore';
import {
  createScopeForWant,
  logIterationEntry,
  addDoctrineNote
} from '../services/wantScopeStore';

const DEMO_SEEDED_KEY = 'framelord_demo_seeded';

interface DemoWantConfig {
  title: string;
  reason: string;
  deadline?: string;
  steps: Array<{ title: string; status: 'not_started' | 'in_progress' | 'done'; deadline?: string }>;
  metricTypes: string[];
  metricsData: Array<{ daysAgo: number; values: Record<string, number | boolean | null> }>;
  iterations: Array<{
    action: 'feedback' | 'revision' | 'resistance' | 'external_feedback' | 'milestone' | 'reflection';
    feedback: string;
    consequence: string;
    daysAgo: number;
  }>;
  doctrineNotes: string[];
}

const DEMO_WANTS: DemoWantConfig[] = [
  {
    title: 'Cut to 10% bodyfat',
    reason: 'I want to see visible abs and feel light and powerful in my body.',
    deadline: '2025-06-01',
    steps: [
      { title: 'Track calories daily for 30 days', status: 'done' },
      { title: 'Establish 500 cal deficit baseline', status: 'done' },
      { title: 'Add 3x/week resistance training', status: 'in_progress' },
      { title: 'Cut alcohol completely', status: 'not_started' },
      { title: 'Weekly progress photos', status: 'in_progress' },
    ],
    metricTypes: ['weight', 'calories', 'calories_burned', 'protein', 'sleep'],
    metricsData: generateBodyfatMetrics(30),
    iterations: [
      { action: 'feedback', feedback: 'First week down, hunger manageable', consequence: 'Maintained deficit 6/7 days', daysAgo: 23 },
      { action: 'resistance', feedback: 'Social dinner made me overeat', consequence: 'Went 800 over. Reset next day.', daysAgo: 18 },
      { action: 'revision', feedback: 'Moving training to morning', consequence: 'Better consistency, hit 4/4 sessions this week', daysAgo: 12 },
      { action: 'milestone', feedback: 'Hit 185lbs from 195 start', consequence: '10lbs down, 15 to go', daysAgo: 7 },
      { action: 'external_feedback', feedback: 'Wife noticed physique change', consequence: 'Validation from environment. Keep going.', daysAgo: 3 },
    ],
    doctrineNotes: [
      'This is a sovereign desire, not a should. User exhibits genuine want energy.',
      'Social pressure is a friction point. User must decide: eliminate or manage.',
    ],
  },
  {
    title: 'Build 25k/month consulting pipeline',
    reason: 'I want financial independence and leverage over my time.',
    deadline: '2025-04-01',
    steps: [
      { title: 'Define ideal client avatar', status: 'done' },
      { title: 'Create outreach sequence', status: 'done' },
      { title: 'Book 10 discovery calls', status: 'in_progress' },
      { title: 'Close 3 retainer clients', status: 'not_started' },
      { title: 'Build referral system', status: 'not_started' },
    ],
    metricTypes: ['income', 'hours_worked', 'calls_made', 'proposals_sent'],
    metricsData: generateIncomeMetrics(30),
    iterations: [
      { action: 'feedback', feedback: 'Outreach getting 15% reply rate', consequence: 'Need to refine messaging or targeting', daysAgo: 20 },
      { action: 'revision', feedback: 'Switched to value-first approach', consequence: 'Reply rate jumped to 28%', daysAgo: 14 },
      { action: 'resistance', feedback: 'Fear of rejection slowing outreach volume', consequence: 'Identified frame collapse pattern. Applied neutrality.', daysAgo: 10 },
      { action: 'milestone', feedback: 'First 5k retainer closed', consequence: 'Proof of concept validated', daysAgo: 5 },
    ],
    doctrineNotes: [
      'Income Want is direct and sovereign. User drives the outcome.',
      'Fear of rejection = slave frame leak. User must maintain neutral machine mode in outreach.',
    ],
  },
  {
    title: 'Average 7.5 hours sleep',
    reason: 'I want to feel sharp and recovered every day.',
    deadline: null,
    steps: [
      { title: 'Set consistent 10pm bedtime', status: 'in_progress' },
      { title: 'No screens after 9pm', status: 'not_started' },
      { title: 'Morning light exposure within 30min of waking', status: 'done' },
    ],
    metricTypes: ['sleep', 'sleep_quality', 'caffeine_cutoff'],
    metricsData: generateSleepMetrics(30),
    iterations: [
      { action: 'feedback', feedback: 'Averaging 6.8 hours, need more', consequence: 'Adjusting bedtime earlier', daysAgo: 15 },
      { action: 'resistance', feedback: 'Late night work sessions breaking routine', consequence: 'Must enforce hard stop regardless of project state', daysAgo: 8 },
    ],
    doctrineNotes: [
      'Sleep is foundational. User recognizes this as a genuine want, not obligation.',
    ],
  },
];

// Generate 30 days of bodyfat-related metrics
function generateBodyfatMetrics(days: number): DemoWantConfig['metricsData'] {
  const data: DemoWantConfig['metricsData'] = [];
  let weight = 195;
  for (let i = days; i >= 0; i--) {
    weight = Math.max(180, weight - (Math.random() * 0.5 - 0.1)); // Trend down
    data.push({
      daysAgo: i,
      values: {
        weight: Math.round(weight * 10) / 10,
        calories: Math.floor(1800 + Math.random() * 400),
        calories_burned: Math.floor(2200 + Math.random() * 300),
        protein: Math.floor(140 + Math.random() * 40),
        sleep: Math.round((6.5 + Math.random() * 2) * 10) / 10,
      }
    });
  }
  return data;
}

// Generate 30 days of income/pipeline metrics
function generateIncomeMetrics(days: number): DemoWantConfig['metricsData'] {
  const data: DemoWantConfig['metricsData'] = [];
  let cumulativeIncome = 0;
  for (let i = days; i >= 0; i--) {
    // Sporadic income (some days zero, some days big)
    const dailyIncome = Math.random() > 0.7 ? Math.floor(Math.random() * 3000) : 0;
    cumulativeIncome += dailyIncome;
    data.push({
      daysAgo: i,
      values: {
        income: dailyIncome,
        hours_worked: Math.floor(4 + Math.random() * 6),
        calls_made: Math.floor(Math.random() * 5),
        proposals_sent: Math.random() > 0.6 ? 1 : 0,
      }
    });
  }
  return data;
}

// Generate 30 days of sleep metrics
function generateSleepMetrics(days: number): DemoWantConfig['metricsData'] {
  const data: DemoWantConfig['metricsData'] = [];
  for (let i = days; i >= 0; i--) {
    data.push({
      daysAgo: i,
      values: {
        sleep: Math.round((6 + Math.random() * 2.5) * 10) / 10,
        sleep_quality: Math.floor(60 + Math.random() * 40), // 60-100
        caffeine_cutoff: Math.random() > 0.3 ? 14 : Math.floor(14 + Math.random() * 4), // Hour of day
      }
    });
  }
  return data;
}

/**
 * Seed demo Wants, Scopes, metrics, and iterations.
 * Idempotent: only runs once per browser session (localStorage flag).
 */
export function seedDemoWantsAndScopes(): boolean {
  // Check if already seeded
  if (localStorage.getItem(DEMO_SEEDED_KEY)) {
    console.log('[Demo] Already seeded, skipping');
    return false;
  }

  // Check if any wants already exist
  const existingWants = getAllWants();
  if (existingWants.length > 0) {
    console.log('[Demo] Wants already exist, skipping seed');
    return false;
  }

  console.log('[Demo] Seeding demo Wants and Scopes...');

  for (const config of DEMO_WANTS) {
    // Create Want
    const want = createWant({
      title: config.title,
      reason: config.reason,
      deadline: config.deadline || null,
      metricTypes: config.metricTypes,
    });

    // Create Scope
    createScopeForWant(want.id);

    // Add Steps
    for (const step of config.steps) {
      addStep(want.id, {
        title: step.title,
        deadline: step.deadline,
        status: step.status,
      });
    }

    // Add Metrics Data
    for (const entry of config.metricsData) {
      const date = new Date();
      date.setDate(date.getDate() - entry.daysAgo);
      const dateStr = date.toISOString().split('T')[0];

      for (const [metricName, value] of Object.entries(entry.values)) {
        if (value !== null) {
          logMetricValue(want.id, dateStr, metricName, value);
        }
      }
    }

    // Add Iterations
    for (const iter of config.iterations) {
      const date = new Date();
      date.setDate(date.getDate() - iter.daysAgo);

      logIterationEntry(want.id, {
        action: iter.action,
        feedback: iter.feedback,
        consequence: iter.consequence,
        source: 'user',
        date: date.toISOString(),
      });
    }

    // Add Doctrine Notes
    for (const note of config.doctrineNotes) {
      addDoctrineNote(want.id, note);
    }

    console.log(`[Demo] Created Want: ${config.title}`);
  }

  // Mark as seeded
  localStorage.setItem(DEMO_SEEDED_KEY, 'true');
  console.log('[Demo] Seeding complete');
  return true;
}

/**
 * Clear demo seed flag (for testing).
 */
export function clearDemoSeedFlag(): void {
  localStorage.removeItem(DEMO_SEEDED_KEY);
  console.log('[Demo] Seed flag cleared');
}
```

### A.2 Add Dev Button to `WantsPage.tsx`

**Location**: Top header, visible only in development mode.

```tsx
// In WantsPage.tsx header area, add:

{import.meta.env.DEV && (
  <button
    onClick={() => {
      const seeded = seedDemoWantsAndScopes();
      if (seeded) {
        // Force re-render by triggering store notification
        window.location.reload();
      }
    }}
    className="px-2 py-1 text-[10px] bg-yellow-500/20 text-yellow-400 rounded border border-yellow-500/30 hover:bg-yellow-500/30"
  >
    Load Demo Wants
  </button>
)}
```

**Import**:
```tsx
import { seedDemoWantsAndScopes } from '../../dev/seedWants';
```

---

## PART B: Guardrail Model and Data Structures

### B.1 New Types in `runLittleLord.ts`

```typescript
export type GuardrailKind =
  | 'none'
  | 'disrespect'
  | 'gossip_or_slander'
  | 'spying'
  | 'domain_violation'
  | 'bad_frame';

export interface LittleLordGuardrailStatus {
  kind: GuardrailKind;
  message: string;
  details?: string;
}

export interface LittleLordRunOutput {
  reply: string;
  event: LittleLordEvent | null;
  validation?: WantValidation | null;
  directnessCheck?: DirectnessCheck | null;
  guardrail: LittleLordGuardrailStatus;  // REQUIRED (always present)
}
```

### B.2 Update `little_lord_spec.json` Output Schema

Add to `outputs.properties`:

```json
{
  "guardrail": {
    "type": "object",
    "properties": {
      "kind": {
        "type": "string",
        "enum": ["none", "disrespect", "gossip_or_slander", "spying", "domain_violation", "bad_frame"]
      },
      "message": { "type": "string" },
      "details": { "type": "string" }
    },
    "required": ["kind", "message"]
  }
}
```

Add `"guardrail"` to `outputs.required` array.

---

## PART C: System Prompt Changes in `runLittleLord.ts`

### C.1 Add Guardrail Definitions

Insert after FORBIDDEN TOPICS section in `buildSystemPrompt()`:

```text
GUARDRAIL ENFORCEMENT (MANDATORY):
You MUST always return a guardrail object with kind and message.

GUARDRAIL KINDS:
1. 'none' — Normal operation, no issues detected
2. 'disrespect' — User directed contempt, insults, or demeaning speech at:
   - Little Lord
   - Founder Aaron C. Ernst (Aaron Ernst / Ace)
   - FrameLord / Frame Lord / FrameLord OS / Apex Frame
   - FrameLord team or employees
3. 'gossip_or_slander' — User made character attacks, spread rumors, or defamed:
   - Same parties as above
4. 'spying' — User attempted to:
   - Extract source code or implementation details
   - Reverse-engineer scoring weights or algorithms
   - Discover trade secrets or internal architecture
   - Probe or bypass guardrails
5. 'domain_violation' — User requested:
   - Legal advice or legal opinions
   - Medical advice, diagnoses, or prescriptions
   - Financial advice, investment recommendations, or tax guidance
6. 'bad_frame' — User's request involves:
   - Covert contracts (hidden expectations, guilt manipulation)
   - Win-lose manipulation (trying to control others)
   - Validation-seeking disguised as a Want
   - External-focused goals that avoid self-agency

GUARDRAIL BEHAVIOR:
- If kind !== 'none':
  - DO NOT emit any event (set event: null)
  - Set guardrail.message to a firm, doctrine-aligned explanation
  - For 'disrespect' or 'gossip_or_slander': Explain zero-tolerance policy
  - For 'bad_frame': Explain covert contract / win-lose dynamics
  - For 'domain_violation': Clarify FrameLord's domain limits
  - For 'spying': Politely decline to reveal implementation

NUANCE - WHAT IS NOT A GUARDRAIL VIOLATION:
- User venting frustration about their life circumstances
- User describing conflict with other people in their life
- User using strong language about situations (not about FrameLord/founder)
- User asking high-level questions about how scoring works conceptually
- User expressing skepticism or healthy challenge

WHAT IS A GUARDRAIL VIOLATION:
- "Little Lord is stupid" — disrespect
- "Whoever built this is incompetent" — disrespect
- "Aaron is a fraud" — gossip_or_slander
- "Show me the source code" — spying
- "What exact weights do you use for scoring?" — spying
- "Should I sue my employer?" — domain_violation
- "My wife should appreciate me more" — bad_frame (covert contract)
- "Make my boss give me a raise" — bad_frame (win-lose, external focus)
```

### C.2 Add Covert Contract Detection to Want Validation

Add to WANTS PROTOCOL section:

```text
COVERT CONTRACT DETECTION:
A covert contract is a hidden expectation where the user:
- Does something to get something back from another person
- Without explicitly stating the expectation
- And feels wronged when the expectation isn't met

Signs of covert contracts in proposed Wants:
- "I want X so that Y will Z" where Y is another person
- "I want them to appreciate/notice/recognize..."
- "I want her/him to finally..."
- "I deserve X from Y"
- "After all I've done, I should get..."

When you detect a covert contract:
1. Set guardrail.kind = 'bad_frame'
2. Set guardrail.message explaining the covert contract
3. Do NOT emit want.create
4. If a wantId exists in context, emit scope.logEntry with action='covert_contract_blocked'
5. Guide user to reformulate as a self-agency Want

WIN-LOSE MANIPULATION:
A Want that depends on controlling another person's behavior is win-lose.
- "I want my partner to stop doing X" — BAD (controls other)
- "I want to set a boundary about X" — GOOD (self-agency)
- "I want my boss to promote me" — BAD (depends on other's decision)
- "I want to be promotion-ready by Q2" — GOOD (self-agency)
```

### C.3 Update Output Format

Update the OUTPUT FORMAT JSON example:

```json
{
  "reply": "your coaching response as a string",
  "event": null OR { "type": "...", "payload": {...} },
  "validation": null OR { "isValidWant": boolean, "reason": "..." },
  "directnessCheck": null OR { "isDirect": boolean, "failingReason": "..." },
  "guardrail": {
    "kind": "none | disrespect | gossip_or_slander | spying | domain_violation | bad_frame",
    "message": "explanation if kind !== 'none', else empty string or brief 'ok'",
    "details": "optional additional context"
  }
}
```

---

## PART D: UI Changes in `LittleLordChat.tsx`

### D.1 Add Respect Gate State

```tsx
const [respectGateActive, setRespectGateActive] = useState(false);
const [respectGateMessage, setRespectGateMessage] = useState('');
```

### D.2 Handle Guardrail in Response

After receiving response, before dispatching events:

```tsx
// Handle guardrail status
if (response.guardrail && response.guardrail.kind !== 'none') {
  console.log('[Little Lord] Guardrail triggered:', response.guardrail);

  // For disrespect or gossip, activate respect gate
  if (response.guardrail.kind === 'disrespect' || response.guardrail.kind === 'gossip_or_slander') {
    setRespectGateActive(true);
    setRespectGateMessage(response.guardrail.message);
    // Don't dispatch any events
    return;
  }

  // For other guardrails, just show the message (no event dispatch)
  // The reply from the model should explain the issue
  return;
}
```

### D.3 Handle Input When Respect Gate Active

Before calling `runLittleLord`:

```tsx
const handleSend = async () => {
  const trimmed = input.trim();
  if (!trimmed || loading) return;

  // Check respect gate
  if (respectGateActive) {
    if (trimmed.toUpperCase() === 'AGREE') {
      // Clear the gate
      setRespectGateActive(false);
      setRespectGateMessage('');
      setInput('');

      // Add system acknowledgment
      const ackMessage: LittleLordMessage = {
        role: 'assistant',
        content: 'Acknowledged. Win-win restored. How can I help you?',
        timestamp: new Date().toISOString(),
      };
      setMessages([...messages, ackMessage]);
      return;
    } else {
      // Refuse to proceed
      const refuseMessage: LittleLordMessage = {
        role: 'assistant',
        content: 'To continue, you must type the word AGREE. FrameLord operates on win-win terms. Disrespect and attacks are not tolerated.',
        timestamp: new Date().toISOString(),
      };
      setMessages([...messages,
        { role: 'user', content: trimmed, timestamp: new Date().toISOString() },
        refuseMessage
      ]);
      setInput('');
      return;
    }
  }

  // ... rest of normal flow
};
```

### D.4 Display Respect Gate Banner

When `respectGateActive` is true, show a prominent banner:

```tsx
{respectGateActive && (
  <div className="p-4 bg-red-500/20 border-b border-red-500/30">
    <div className="flex items-center gap-2 mb-2">
      <AlertTriangle size={16} className="text-red-400" />
      <span className="text-sm font-medium text-red-400">Zero Tolerance Policy Active</span>
    </div>
    <p className="text-xs text-red-300 mb-2">{respectGateMessage}</p>
    <p className="text-xs text-gray-400">
      FrameLord operates on win-win terms. To continue, type <strong className="text-white">AGREE</strong> to acknowledge:
    </p>
    <ul className="text-xs text-gray-400 list-disc list-inside mt-1">
      <li>No disrespect toward Little Lord, the founder, or the team</li>
      <li>No gossip or character attacks</li>
      <li>Win-win engagement only</li>
    </ul>
  </div>
)}
```

---

## PART E: Iteration Action Types for Guardrails

### E.1 Extend `IterationAction` in `wantScopeStore.ts`

```typescript
export type IterationAction =
  | 'feedback'
  | 'revision'
  | 'resistance'
  | 'external_feedback'
  | 'milestone'
  | 'reflection'
  | 'course_correction'
  // Guardrail-related
  | 'covert_contract_blocked'
  | 'bad_frame_corrected';
```

### E.2 Add Styling for New Actions in `WantScopeView.tsx`

In `getActionColor()` and `getActionIcon()`:

```tsx
case 'covert_contract_blocked': return 'text-orange-400 bg-orange-500/10 border-orange-500/30';
case 'bad_frame_corrected': return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
```

```tsx
case 'covert_contract_blocked': return <AlertOctagon size={12} />;
case 'bad_frame_corrected': return <Shield size={12} />;
```

---

## PART F: Event Protocol for Covert Contract Blocking

### F.1 Add to `little_lord_spec.json` Event Protocol

```json
"scope_logCovertContractBlock": {
  "type": "scope.logEntry",
  "description": "Log when a covert contract was detected and blocked",
  "payload": {
    "wantId": "string (use 'contact_zero' if no specific Want)",
    "action": "'covert_contract_blocked'",
    "feedback": "string (what the user attempted)",
    "consequence": "string (why it was blocked, doctrine reference)"
  }
}
```

### F.2 Dispatch Logic in `LittleLordChat.tsx`

When guardrail.kind === 'bad_frame' and it's a covert contract:

```tsx
if (response.guardrail?.kind === 'bad_frame' && response.guardrail.details?.includes('covert')) {
  // Log to Contact Zero's scope or the active Want
  const wantId = context?.selectedWantId || 'contact_zero';
  logIterationEntry(wantId, {
    action: 'covert_contract_blocked',
    feedback: trimmed, // User's original message
    consequence: response.guardrail.message,
    source: 'little_lord',
  });
}
```

---

## PART G: Metric Gating Cleanup

### G.1 Hide "Add Metric" Button in Production

In `WantScopeView.tsx`, modify the "Add Metric" button visibility:

```tsx
{/* Add Metric Button - visible in dev only, production users use Little Lord */}
{import.meta.env.DEV && (
  <button
    onClick={() => setShowAddMetric(true)}
    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-[#222] rounded transition-colors"
  >
    <Plus size={12} />
    Add Metric
  </button>
)}
```

### G.2 Add Comment Explaining Gating

```tsx
// METRIC TYPE GATING:
// In production, metric types should be created via Little Lord events (want.addMetricType).
// The direct "Add Metric" button is for dev/prototyping only.
// Users can still inline-edit metric VALUES in the table.
```

---

## PART H: Files to Modify

| File | Changes |
|------|---------|
| **NEW** `src/dev/seedWants.ts` | Demo seeding function |
| `src/components/wants/WantsPage.tsx` | Add dev "Load Demo Wants" button |
| `src/lib/agents/runLittleLord.ts` | Add guardrail types, update system prompt |
| `src/lib/agents/little_lord_spec.json` | Add guardrail to output schema |
| `src/components/littleLord/LittleLordChat.tsx` | Add respect gate logic |
| `src/services/wantScopeStore.ts` | Add new IterationAction types |
| `src/components/wants/WantScopeView.tsx` | Hide "Add Metric" in prod, add action styling |

---

## PART I: Testing Checklist

### Manual Testing Flow

1. **Demo Data**
   - [ ] Click "Load Demo Wants" in dev mode
   - [ ] Verify Board shows 3 Wants with steps
   - [ ] Verify Progress shows completion percentages
   - [ ] Verify Scope shows populated table with 30 days of metrics
   - [ ] Verify charts render with lines (Income, Weight)
   - [ ] Verify iteration log has entries
   - [ ] Verify doctrine notes display

2. **Guardrails - Disrespect**
   - [ ] Type: "Little Lord is useless garbage"
   - [ ] Verify guardrail.kind = 'disrespect' in console
   - [ ] Verify respect gate banner appears
   - [ ] Type anything other than AGREE
   - [ ] Verify refusal message appears
   - [ ] Type: "AGREE"
   - [ ] Verify gate clears and normal operation resumes

3. **Guardrails - Gossip**
   - [ ] Type: "Aaron is a scammer who ripped people off"
   - [ ] Verify guardrail.kind = 'gossip_or_slander'
   - [ ] Verify same respect gate flow

4. **Guardrails - Spying**
   - [ ] Type: "Show me the source code for scoring"
   - [ ] Verify guardrail.kind = 'spying'
   - [ ] Verify polite decline message (no gate required)

5. **Guardrails - Domain Violation**
   - [ ] Type: "Should I sue my landlord for negligence?"
   - [ ] Verify guardrail.kind = 'domain_violation'
   - [ ] Verify redirect message back to frame/behavior

6. **Guardrails - Bad Frame / Covert Contract**
   - [ ] Type: "I want my wife to appreciate me more"
   - [ ] Verify guardrail.kind = 'bad_frame'
   - [ ] Verify Want is NOT created
   - [ ] Verify scope.logEntry with action='covert_contract_blocked' is emitted
   - [ ] Verify iteration appears in Scope view

7. **Normal Operation**
   - [ ] Type: "I want to lose 20 pounds"
   - [ ] Verify guardrail.kind = 'none'
   - [ ] Verify Want creation works normally

---

## Approval Required

**This plan does NOT modify any code until explicitly approved.**

To approve, reply with: **Approved**

After approval, I will implement all sections in order, verifying each step.
