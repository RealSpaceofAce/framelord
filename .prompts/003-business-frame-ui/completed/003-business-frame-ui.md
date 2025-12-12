# Business Frame UI Components

<objective>
Build the intake flow UI components for the psycholinguistic assessment system.

Purpose: Create a guided intake experience that walks users through Tier 1 (First-Access Gate) and Tier 2 (Apex Business Frame Blueprint) questions, displays real-time analysis feedback, and integrates with the dashboard.

Output:
- `components/intake/IntakeFlow.tsx` - Main flow orchestrator
- `components/intake/QuestionCard.tsx` - Individual question renderer
- `components/intake/AnswerInput.tsx` - Text input with analysis indicators
- `components/intake/IntakeProgress.tsx` - Progress and tier navigation
- `components/intake/IntakeResults.tsx` - Results display with axis scores and flags
- `components/intake/index.ts` - Barrel export
</objective>

<context>
**Upstream artifacts (REQUIRED - read these first):**
@docs/specs/business_frame_spec.json - Questions, axes, flags definitions
@types/businessFrame.ts - TypeScript types and enums
@services/intakeStore.ts - Session and answer management
@services/frameAnalysisStore.ts - Analysis functions

**FrameLord UI patterns to follow:**
@components/Scanner.tsx - Similar analysis flow UI
@components/ApplicationPage.tsx - AI chatbot interaction pattern
@components/crm/ - Dashboard integration patterns
@App.tsx - View routing system (add 'intake' view if needed)

**FrameLord architecture constraints:**
- Views controlled by App.tsx (landing, dashboard, application, beta, booking, intake)
- No separate routing - use centralized `setCurrentView` pattern
- Framer Motion for animations
- Tailwind-style classes (check existing components)
- Contact Spine: Intake attaches to Contact Zero for self-assessment
</context>

<requirements>
## 1. IntakeFlow.tsx - Main Orchestrator

```typescript
interface IntakeFlowProps {
  contactId: string;  // Usually Contact Zero ID for self-assessment
  initialTier?: IntakeTier;
  onComplete?: (metrics: IntakeMetrics) => void;
  onAbandon?: () => void;
}
```

**Responsibilities:**
- Manage session lifecycle (start, progress, complete, abandon)
- Load questions from spec for current tier/module
- Track current question index
- Orchestrate answer submission and analysis
- Handle tier transitions (Tier 1 → Tier 2 modules)
- Compute and display final results

**State machine:**
```
IDLE → TIER_1_INTRO → TIER_1_QUESTIONS → TIER_1_RESULTS
     → TIER_2_INTRO → TIER_2_MODULE_SELECT → TIER_2_QUESTIONS → TIER_2_RESULTS
     → COMPLETE
```

**Layout:**
- Full-width container
- Progress bar at top
- Question/results area in center
- Navigation controls at bottom

## 2. QuestionCard.tsx - Question Display

```typescript
interface QuestionCardProps {
  question: QuestionDefinition;
  questionNumber: number;
  totalQuestions: number;
  tier: IntakeTier;
  module?: IntakeModule;
}
```

**Features:**
- Display question prompt with tier/module context
- Show "What this reveals" hint (from spec targetAxes)
- Subtle animation on enter (Framer Motion)
- Visual distinction between Tier 1 and Tier 2 styling

## 3. AnswerInput.tsx - Response Input

```typescript
interface AnswerInputProps {
  onSubmit: (text: string) => void;
  isAnalyzing: boolean;
  minLength?: number;
  placeholder?: string;
}
```

**Features:**
- Multi-line text area
- Character count indicator
- "Analyzing..." state with subtle animation
- Submit button (disabled while analyzing)
- Keyboard shortcut (Cmd/Ctrl+Enter to submit)

**Real-time hints (optional but nice):**
- Show detected patterns as user types (hedges, passive voice)
- Visual indicators without being intrusive

## 4. IntakeProgress.tsx - Progress Display

```typescript
interface IntakeProgressProps {
  currentTier: IntakeTier;
  currentModule?: IntakeModule;
  currentQuestion: number;
  totalQuestions: number;
  completedTiers: IntakeTier[];
}
```

**Features:**
- Visual progress bar
- Tier indicators (Tier 1 ● → Tier 2: Money ○ Authority ○ Operations ○)
- Current question position (3 of 8)
- Estimated time remaining (based on average answer time)

## 5. IntakeResults.tsx - Results Display

```typescript
interface IntakeResultsProps {
  metrics: IntakeMetrics;
  session: IntakeSession;
  onContinue?: () => void;  // Continue to next tier
  onFinish?: () => void;    // Return to dashboard
}
```

**Sections:**

### 5.1 Frame Score Overview
- Overall frame score (0-100) with visual gauge
- Frame type classification (Power / Analyst / Supplicant / Mixed)
- Confidence indicator

### 5.2 Axis Breakdown
- Visual bars for each axis score
- Color coding (green = strong, yellow = moderate, red = weak)
- Expandable details showing which answers influenced each axis

### 5.3 Active Flags
- List of triggered flags with severity badges
- Expandable evidence (which answers triggered)
- Coaching recommendations for critical flags

### 5.4 Tier Comparison (if both tiers complete)
- Side-by-side comparison of Tier 1 vs Tier 2 insights
- Consistency analysis

## 6. Dashboard Integration

**Add to existing dashboard navigation:**
- New "Intake" or "Frame Assessment" tab in dashboard sidebar
- Entry point: "Start Self-Assessment" button for Contact Zero
- Entry point: "Assess Contact" on contact dossier page

**App.tsx integration:**
- Add 'intake' to view type
- IntakeFlow loads when view === 'intake'
- Pass Contact Zero ID by default, or selected contact ID

## 7. Styling Requirements

**Follow existing patterns from:**
- Scanner.tsx for analysis feedback UI
- ApplicationPage.tsx for conversational flow
- Dashboard.tsx for layout structure

**Color scheme:**
- Use existing Tailwind palette
- Severity colors: info=blue, warn=amber, critical=red
- Frame type colors: power=emerald, analyst=blue, supplicant=orange

**Animations (Framer Motion):**
- Question card slide-in
- Progress bar fill
- Results reveal (staggered)
- Flag badges pulse on critical
</requirements>

<implementation>
**Approach:**
1. Read existing UI components for patterns
2. Build from bottom up: AnswerInput → QuestionCard → IntakeProgress → IntakeFlow
3. IntakeResults last (needs full data flow)
4. Integrate with dashboard navigation
5. Test full flow with mock data before connecting to stores

**What to avoid and WHY:**
- Do NOT create separate routing - use App.tsx view system
- Do NOT add new dependencies without checking package.json
- Do NOT bypass stores - all data through intakeStore/frameAnalysisStore
- Do NOT hardcode questions - load from spec JSON
- Do NOT create inline styles - use Tailwind classes

**Integration points:**
- IntakeFlow calls intakeStore.startSession(), recordAnswer(), completeSession()
- IntakeFlow calls frameAnalysisStore.analyzeAnswer(), computeSessionMetrics()
- Results integrate with existing FrameScan display patterns
- Coaching recommendations feed into Little Lord context
</implementation>

<output>
Write directly to filesystem:
- `components/intake/IntakeFlow.tsx`
- `components/intake/QuestionCard.tsx`
- `components/intake/AnswerInput.tsx`
- `components/intake/IntakeProgress.tsx`
- `components/intake/IntakeResults.tsx`
- `components/intake/index.ts`

Update existing files:
- `App.tsx` - Add 'intake' view type and IntakeFlow render

Also create summary:
- `.prompts/003-business-frame-ui/SUMMARY.md`
</output>

<verification>
Before declaring complete:
1. Run `npx tsc --noEmit` - no type errors
2. Run `npm run dev` - app starts without errors
3. Navigate to intake view - component renders
4. Manual test: Start session → Answer questions → See results
5. Mobile responsive check (if time permits)
6. No console errors in browser DevTools
</verification>

<summary_requirements>
Create `.prompts/003-business-frame-ui/SUMMARY.md`:

```markdown
# Business Frame UI Summary

**{e.g., "Created 5-component intake flow with Tier 1/2 support and results dashboard"}**

## Version
v1

## Key Findings
- Component count and hierarchy
- Integration points added
- Animation patterns used
- Any UX decisions made

## Files Created
- `components/intake/IntakeFlow.tsx` - Main orchestrator
- `components/intake/QuestionCard.tsx` - Question display
- `components/intake/AnswerInput.tsx` - Response input
- `components/intake/IntakeProgress.tsx` - Progress UI
- `components/intake/IntakeResults.tsx` - Results display
- `components/intake/index.ts` - Barrel export

## Files Modified
- `App.tsx` - Added intake view

## Decisions Needed
{Any UX choices that need user review}

## Blockers
None (or list if dependencies missing)

## Next Step
Test full flow, then optionally create Prompt 4 for scoring logic and Little Lord integration

---
*Confidence: High*
*Verification: Dev server running, manual test passed*
```
</summary_requirements>

<success_criteria>
- [ ] All component files created
- [ ] TypeScript compiles without errors
- [ ] Dev server starts without errors
- [ ] Intake view accessible from dashboard
- [ ] Question flow works (at least with mock data)
- [ ] Results display renders
- [ ] Follows existing UI patterns
- [ ] SUMMARY.md created with verification status
</success_criteria>

<dependencies>
This prompt requires outputs from:
- `001-business-frame-extract` (spec JSON)
- `002-business-frame-types` (types and stores)

Do NOT run this prompt until 001 and 002 are complete.
</dependencies>
