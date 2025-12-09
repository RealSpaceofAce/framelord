# FrameScan Deep Dive Research Document

**Date:** 2025-12-08
**Purpose:** Complete investigation of the FrameScan module to inform a comprehensive redesign of the report UI, data structure, and two-tier system (Basic + Elite).

---

## 1. Executive Summary

FrameScan is the **most critical feature** in FrameLord. It is an AI-powered diagnostic engine that analyzes communication (text or images) to identify authority positioning weaknesses and provide actionable corrections. The system is built on FrameLord's core doctrine: **Apex vs Slave frame** positioning and the **Win/Win integrity model**.

**Current State:**
- Fully functional analysis engine with comprehensive 9-axis evaluation system
- Sophisticated scoring algorithm with domain-specific weighting
- Multi-provider LLM architecture (OpenAI for analysis, Nano Banana for image annotation)
- Basic UI report rendering system exists but is **lackluster** and underutilizes available data
- Stores complete scan results with full breakdown but displays limited insights
- No tier system implemented (Basic vs Elite)

**Key Finding:** The FrameScan engine produces **incredibly rich diagnostic data** but the current UI only surfaces about 30% of its value. There's a massive opportunity to redesign the report experience.

---

## 2. Scan Flow Architecture

### Entry Points

#### A. Landing Page Scanner (`/src/components/Scanner.tsx`)
- **Location:** Public-facing landing page (http://localhost:3001)
- **Features:**
  - Text input (textarea) or image upload (drag-and-drop)
  - Real-time validation (50+ chars, 8+ words, no gibberish)
  - 3D tilt effect on hover
  - Scanning animation (copier beam effect, progress bar)
  - Audio feedback (scan_start, scan_hum, scan_complete)
  - Savage Mode support (red theme override)
- **Flow:**
  1. User inputs text OR uploads image
  2. Optional context field for images
  3. Click "RUN DIAGNOSTIC" button
  4. Calls `analyzeLandingFrame()` from `landingScanAdapter.ts`
  5. Results displayed inline with score, critical signal, and corrections
  6. Optional "Elite Intervention" CTA if `onApply` prop provided

#### B. CRM FrameScan Page (`/src/components/crm/FrameScanPage.tsx`)
- **Location:** Inside Dashboard → FrameScan view
- **Features:**
  - List of all scan reports
  - Filter by contact and domain
  - Click to view full report detail
  - Load demo data button (dev only)
- **Flow:**
  1. Displays all historical scans from `frameScanReportStore`
  2. User clicks report card → navigates to detail view
  3. Detail view renders full breakdown with axis scores, diagnostics, corrections

#### C. Contact Dossier Scans (`/src/components/crm/FrameScanContactTab.tsx`)
- **Location:** Contact profile → FrameScan tab
- **Features:**
  - All scans for a specific contact
  - Timeline of frame score changes
  - Quick access to recent reports

### Scan Execution Flow

```
USER INPUT (text or image)
    ↓
VALIDATION & THROTTLE CHECK
    ↓
DOMAIN DETECTION (auto-detect or explicit)
    ↓
LLM ANALYSIS CALL
    ├─ TEXT: OpenAI with frameScanSpec + FRAMESCAN_SYSTEM_PROMPT
    └─ IMAGE: Nano Banana (annotations) → OpenAI (frame analysis)
    ↓
RAW RESULT (FrameScanResult JSON)
    ├─ 9 axis scores (-3 to +3)
    ├─ Diagnostics (patterns + evidence)
    └─ Corrections (shifts + protocol steps)
    ↓
SCORING ENGINE (frameScoring.ts)
    ├─ Normalize axis scores to 0-100
    ├─ Apply domain priority weights
    ├─ Calculate weighted average
    ├─ Apply Win/Win adjustment penalty
    └─ Derive overall frame label
    ↓
UI REPORT BUILDER (frameReportUI.ts)
    ├─ Second LLM call to format results
    └─ Produces FrameScanUIReport schema
    ↓
STORAGE (frameScanReportStore.ts)
    ├─ Save complete report to in-memory store
    ├─ Update Contact.frame metrics (currentScore, trend, lastScanAt)
    └─ Emit change event
    ↓
DISPLAY
    ├─ Landing: Legacy format (score + critical_signal + corrections)
    └─ CRM: Full UI report with sections, axis breakdown, annotations
```

**Critical Path Files:**
1. `/src/lib/frameScan/frameScanLLM.ts` - Runtime LLM integration
2. `/src/lib/frameScan/frameScoring.ts` - Deterministic scoring algorithm
3. `/src/lib/frameScan/frameReportUI.ts` - UI report builder
4. `/src/services/frameScanReportStore.ts` - Data persistence
5. `/src/lib/frameScan/landingScanAdapter.ts` - Landing page adapter
6. `/src/config/frameScanSpec.json` - Master doctrine specification

---

## 3. Algorithm & Analysis Deep Dive

### The 9-Axis Evaluation System

FrameScan evaluates communication across **9 fundamental axes** defined in the FrameLord doctrine:

| Axis ID | Name | Description | Score Range |
|---------|------|-------------|-------------|
| `assumptive_state` | Assumptive State | Underlying assumption about self and others: from needy and doubtful to already chosen and wanted | -3 (strong slave) to +3 (strong apex) |
| `buyer_seller_position` | Buyer vs Seller Position | Relational position: product seeking purchase or buyer screening for fit | -3 to +3 |
| `identity_vs_tactic` | Identity vs Tactic Separation | Degree to which the person confuses their worth with the success of a tactic | -3 to +3 |
| `internal_sale` | Internal Sale | Level of conviction in self and offer before entering the interaction | -3 to +3 |
| `win_win_integrity` | Win/Win Integrity | Commitment to mutual gain and clean separation over extraction or covert contracts | -3 to +3 |
| `persuasion_style` | Persuasion Style | Use of influence: reactive qualification or proactive leadership and transmission | -3 to +3 |
| `pedestalization` | Pedestalization | Where the crown is placed: over the self or over an external person, object, or outcome | -3 to +3 |
| `self_trust_vs_permission` | Self Trust vs Permission Seeking | Source of authority: inner conviction or external permission | -3 to +3 |
| `field_strength` | Field Strength and Coherence | How strongly the person broadcasts an ordered personal field that others can feel and align to | -3 to +3 |

**Each axis score is classified into one of 5 bands:**

| Score Range | Band | Meaning |
|-------------|------|---------|
| -3, -2 | `strong_slave` | Extreme slave frame expression |
| -1 | `mild_slave` | Mild slave tendencies |
| 0 | `neutral` | No clear positioning |
| +1, +2 | `mild_apex` | Mild apex tendencies |
| +3 | `strong_apex` | Strong apex frame expression |

### LLM Prompt Architecture

#### System Prompt (FRAMESCAN_SYSTEM_PROMPT)

The LLM receives a highly structured system prompt that:

1. **Defines the job:** Output valid FrameScanResult JSON (NOT the final 0-100 score)
2. **Provides the spec:** Complete `frameScanSpec.json` with all axis definitions, detection rules, and band classifications
3. **Specifies the task:**
   - Score each axis from -3 to +3
   - Map scores to bands
   - Write notes explaining each score with specific evidence
   - Determine `overallWinWinState` (win_win, win_lose, lose_lose, neutral)
   - Classify `overallFrame` (apex, slave, mixed) based on axis distribution
   - Build diagnostics with `primaryPatterns` and `supportingEvidence`
   - Generate `corrections.topShifts` with concrete protocol steps
   - For text: include `sampleRewrites` showing Apex versions

**Key Constraint:** The LLM does NOT calculate the final 0-100 score. That's done locally by the deterministic scoring algorithm.

#### User Payload Structure

```json
{
  "frameScanSpec": { /* entire spec.json */ },
  "request": {
    "modality": "text" | "image",
    "domain": "sales_email" | "dating_message" | "profile_photo" | etc.,
    "content": "...the actual text or image description...",
    "context": { /* optional metadata */ }
  }
}
```

#### For Image Scans

Two-stage process:

1. **Nano Banana Call** → Visual annotations (labels, bounding boxes, posture descriptions)
2. **OpenAI Call** → Receives combined user context + Nano Banana JSON output
3. Annotated image URL optionally returned

### FrameScore Calculation (Deterministic Algorithm)

**Location:** `/src/lib/frameScan/frameScoring.ts`

#### Step 1: Normalize Axis Scores to 0-100

```
normalizedScore = ((axisScore + 3) / 6) * 100

Examples:
-3 → 0
 0 → 50
+3 → 100
```

#### Step 2: Apply Domain Priority Weights

Each domain (sales_email, dating_message, profile_photo, etc.) defines **priority axes** in the spec. These axes get **weight = 2**, others get **weight = 1**.

Example for `sales_email` domain:
- Priority axes: `buyer_seller_position`, `win_win_integrity`, `internal_sale`
- These count double in the weighted average

#### Step 3: Calculate Weighted Average

```
weightedSum = Σ(normalizedScore * weight)
totalWeight = Σ(weight)
baseScore = weightedSum / totalWeight
```

#### Step 4: Apply Win/Win State Penalty

| Win/Win State | Penalty |
|---------------|---------|
| `win_win` | 0 |
| `neutral` | -5 |
| `win_lose` | -15 |
| `lose_lose` | -30 |

```
finalScore = clamp(baseScore - penalty, 0, 100)
```

#### Step 5: Derive Overall Frame Label

```
IF finalScore >= 70 AND more than half axes are apex bands → "apex"
ELSE IF finalScore <= 30 AND more than half axes are slave bands → "slave"
ELSE → "mixed"
```

**Output:** Complete `FrameScore` object with:
- `frameScore: number` (0-100, rounded)
- `overallFrame: "apex" | "slave" | "mixed"`
- `overallWinWinState: FrameWinWinState`
- `domain: FrameDomainId`
- `axisScores: FrameAxisScore[]` (raw -3 to +3 with bands and notes)
- `weightedAxisScores: WeightedAxisScore[]` (normalized, weighted breakdown)
- `notes: string[]` (scoring summary)

### Detection Rules & Domain Priority Axes

**Defined in:** `/src/config/frameScanSpec.json`

Each domain specifies which axes matter most:

**Text Domains:**
- `generic`: No priority axes (all weighted equally)
- `sales_email`: Priority: `buyer_seller_position`, `win_win_integrity`, `internal_sale`
- `dating_message`: Priority: `assumptive_state`, `outcome_independence`, `pedestalization`
- `leadership_update`: Priority: `field_strength`, `persuasion_style`, `internal_sale`
- `social_post`: Priority: `field_strength`, `identity_vs_tactic`, `persuasion_style`

**Image Domains:**
- `profile_photo`: Priority: `field_strength`, `self_trust_vs_permission`, `assumptive_state`
- `team_photo`: Priority: `field_strength`, `buyer_seller_position`
- `landing_page_hero`: Priority: `assumptive_state`, `buyer_seller_position`, `field_strength`
- `social_post_image`: Priority: `field_strength`, `identity_vs_tactic`

---

## 4. Data Schema Reference

### Core Type Definitions

**Location:** `/src/lib/frameScan/frameTypes.ts`

#### FrameAxisScore

```typescript
interface FrameAxisScore {
  axisId: FrameAxisId;        // Which axis (e.g., "buyer_seller_position")
  score: number;              // -3 to +3
  band: FrameBand;            // "strong_slave" | "mild_slave" | "neutral" | "mild_apex" | "strong_apex"
  notes: string;              // LLM explanation with specific evidence
}
```

#### FrameScanDiagnostics

```typescript
interface FrameScanDiagnostics {
  primaryPatterns: string[];       // 2-5 high-level labels (e.g., "chronic pedestalization", "seller posture")
  supportingEvidence: string[];    // 3-7 specific examples or quotes
}
```

#### FrameCorrectionShift

```typescript
interface FrameCorrectionShift {
  axisId: FrameAxisId;             // Which axis needs correction
  shift: string;                   // Description of structural change needed
  protocolSteps: string[];         // 2-5 concrete behavioral changes
}
```

#### FrameSampleRewrite (text only)

```typescript
interface FrameSampleRewrite {
  purpose: string;                 // What this rewrite is for (e.g., "subject line", "opening paragraph")
  apexVersion: string;             // Rewritten text reflecting Apex Frame and Win/Win
}
```

#### FrameScanResult (LLM Output)

```typescript
interface FrameScanResult {
  modality: "text" | "image";
  domain: FrameDomainId;
  overallFrame: "apex" | "slave" | "mixed";
  overallWinWinState: FrameWinWinState;
  axes: FrameAxisScore[];                          // 9 axis scores
  diagnostics: FrameScanDiagnostics;
  corrections: {
    topShifts: FrameCorrectionShift[];             // Top priority corrections
    sampleRewrites?: FrameSampleRewrite[];         // Text rewrites (text scans only)
  };
}
```

#### FrameScore (Scoring Engine Output)

```typescript
interface FrameScore {
  frameScore: number;                              // 0-100 final score
  overallFrame: "apex" | "slave" | "mixed";
  overallWinWinState: FrameWinWinState;
  domain: FrameDomainId;
  axisScores: FrameAxisScore[];                    // Raw axis scores from LLM
  weightedAxisScores: WeightedAxisScore[];         // Normalized + weighted for transparency
  notes: string[];                                 // Scoring summary
}
```

#### WeightedAxisScore (Scoring Breakdown)

```typescript
interface WeightedAxisScore {
  axisId: FrameAxisId;
  normalizedScore: number;      // 0 to 100
  weight: number;               // 1 for base, 2 for priority axes
}
```

#### FrameImageAnnotation (Image Scans)

```typescript
interface FrameImageAnnotation {
  id: string;
  label: string;                            // Short label (e.g., "Upward angle", "Facial tension")
  description: string;                      // 1-2 sentence explanation
  severity: "info" | "warning" | "critical";
  x: number;                                // Normalized X (0 to 1)
  y: number;                                // Normalized Y (0 to 1)
  width: number;                            // Normalized width (0 to 1)
  height: number;                           // Normalized height (0 to 1)
}
```

#### FrameImageScanResult

```typescript
interface FrameImageScanResult {
  score: FrameScore;
  annotations: FrameImageAnnotation[];
  annotatedImageUrl?: string;               // Optional URL to annotated image from Nano Banana
}
```

### Report Storage Schema

**Location:** `/src/services/frameScanReportStore.ts`

#### FrameScanReport (Complete Stored Report)

```typescript
interface FrameScanReport {
  id: string;                               // "fsr_<timestamp>_<random>"
  createdAt: string;                        // ISO timestamp
  subjectType: 'self' | 'contact' | 'asset';
  subjectContactIds: string[];              // Array of contact IDs (includes "contact_zero" for self-scans)
  modality: 'text' | 'image' | 'mixed';
  domain: FrameDomainId;
  context?: FrameScanContext;               // Optional scan context (what, who, userConcern)
  sourceRef?: string;                       // Optional reference to source (note id, image url, etc.)
  rawResult: FrameScanResult;               // The full LLM response
  score: FrameScore;                        // The computed 0-100 score with breakdown
  imageAnnotations?: FrameImageAnnotation[]; // For image scans
  annotatedImageUrl?: string;               // For image scans
  uiReport?: FrameScanUIReport;             // Pre-built UI payload for rendering
}
```

#### FrameScanContext (Optional User Intent)

```typescript
interface FrameScanContext {
  what: string;                             // What is being scanned (e.g., "Sales email to VP of Sales")
  who: string[];                            // Array of contact names or IDs mentioned
  userConcern?: string;                     // Optional user concern (e.g., "I'm worried I sound needy")
}
```

### UI Report Schema

**Location:** `/src/lib/frameScan/frameReportUI.ts`

#### FrameScanUIReport (Display-Ready Format)

```typescript
interface FrameScanUIReport {
  header: FrameScanUIHeader;
  sections: FrameScanUISection[];
}

interface FrameScanUIHeader {
  title: string;                            // Main report title
  oneLineVerdict: string;                   // One-line summary verdict
  highlightScore: number;                   // The 0-100 frame score
  badges: string[];                         // 1-4 short tags (e.g., "win_win", "soft boundaries")
}

interface FrameScanUISection {
  id: "summary" | "strengths" | "weaknesses" | "corrections" | string;
  title: string;                            // Section title for display
  mainParagraph?: string;                   // Optional main paragraph text
  bullets?: string[];                       // Optional bullet points
  corrections?: FrameScanUICorrection[];    // Optional list of corrections
}

interface FrameScanUICorrection {
  label: string;                            // Short correction label
  description: string;                      // What needs to change
  suggestedAction: string;                  // Concrete action to take
}
```

**Note:** The UI report is generated via a **second LLM call** after scoring. The system prompt asks the LLM to format the raw results into the UI schema. There's also a fallback builder that creates a basic UI report without calling the LLM.

---

## 5. Current Report Contents

### Landing Page Report (Scanner.tsx)

**Displays:**
1. **Score Panel (left):**
   - Large numeric FrameScore (0-100) with color coding:
     - <50: red (critical)
     - 50-79: yellow (warning)
     - 80+: green (excellent)
   - Subscores (8 legacy subscores mapped from 9 axes):
     - Authority
     - Magnetism
     - Boundaries
     - Energy
     - Clarity
     - Emotional Tone
     - Brand Congruence
     - Sales Strength
   - Each subscore shows mini progress bar

2. **Analysis Panel (right):**
   - **Critical Signal (red box):**
     - Title (e.g., "Leak Detected")
     - Description
     - Supporting quotes (italicized snippets)
   - **Corrections (green box):**
     - List of 3-5 recommended fixes

3. **Elite CTA (optional):**
   - Gradient border card
   - "Elite Intervention Recommended" heading
   - Explanation about manual strategy audit
   - Arrow button to apply

**What's Missing:**
- No axis-by-axis breakdown
- No diagnostics section beyond critical signal
- No sample rewrites displayed
- No Win/Win state indicator
- No visual annotations for images
- No comparison to previous scans
- No explanations of WHY the score is what it is

### CRM Report Detail View (FrameScanReportDetail.tsx)

**Displays (with uiReport):**

1. **Header:**
   - Title
   - One-line verdict
   - Badges (tags like "apex", "win-win")
   - Contact info with avatar
   - Modality icon and date
   - Large score badge (0-100)

2. **Sections (rendered from uiReport):**
   - **Summary:** Main paragraph + optional bullets
   - **Strengths:** Bullet list of apex signals
   - **Weaknesses:** Bullet list of slave signals
   - **Corrections:** Cards with label, description, suggested action

3. **Image Annotations (image scans only):**
   - Annotated image preview
   - List of annotations with severity dots

4. **Detailed Axis Breakdown:**
   - Table with all 9 axes:
     - Axis name
     - Score (-3 to +3) with color coding
     - Band classification (chip)

**Legacy Fallback View (without uiReport):**
- Similar structure but uses raw data
- Shows axis table with notes column
- Diagnostics section with primary patterns and supporting evidence
- Corrections section with shifts and protocol steps

**What's Working Well:**
- Comprehensive axis breakdown table is excellent
- Image annotations are well-presented
- UI schema allows for structured, consistent reports
- Color coding makes score severity immediately clear

**What's Lackluster:**
- UI report sections are fairly generic (could be more visually engaging)
- No data visualization (charts, graphs, radar plots)
- No trend analysis or comparison to past scans
- No "next steps" or action plan beyond corrections
- Sample rewrites aren't displayed anywhere
- Win/Win state is shown as a badge but not explained
- No educational content about what each axis means

---

## 6. Design System Inventory

### Color Palette

**Primary Colors (from theme.css):**

```css
/* Brand Colors */
--bg-primary: #000000           /* Pure black background */
--bg-secondary: rgba(0, 0, 0, 0.95)
--bg-tertiary: rgba(0, 0, 0, 0.9)
--border-color: #1c1c1c         /* Subtle borders */
--text-primary: #ffffff         /* White text */
--text-secondary: #888888       /* Gray text */
--accent-color: #0043ff         /* Bright blue (primary accent) */
--accent-2: #0043ff
```

**Tailwind Theme Colors (hardcoded in components):**

| Color Variable | Hex Value | Usage |
|----------------|-----------|-------|
| `#4433FF` | Purple-blue | Primary accent (buttons, highlights, borders) |
| `#0043ff` | Bright blue | Neon theme accent |
| `#FF3344` | Red | Savage Mode override, critical alerts |
| `#0E0E0E` | Very dark gray | Card backgrounds |
| `#1A1A1A` | Dark gray | Secondary backgrounds |
| `#222` | Charcoal | Borders, dividers |
| `#333` | Medium gray | Input borders |

**Semantic Colors:**

| Purpose | Color | Hex |
|---------|-------|-----|
| Critical / Low Score | Red | `text-red-400` (#f87171), `text-red-500` (#ef4444) |
| Warning / Mid Score | Yellow/Orange | `text-yellow-400` (#facc15), `text-orange-400` (#fb923c) |
| Success / High Score | Green | `text-green-400` (#4ade80), `text-emerald-400` (#34d399) |
| Info / Neutral | Blue | `text-blue-400` (#60a5fa) |
| Accent / Primary | Purple-blue | `text-[#4433FF]`, `bg-[#4433FF]` |
| Frame Bands | Gradient | Red → Orange → Yellow → Emerald → Green |

**Frame Score Color Classes:**

```typescript
// From frameProfile.ts
getFrameScoreColorClass(score: number):
  score >= 80: "text-green-400"
  score >= 65: "text-emerald-400"
  score >= 45: "text-yellow-400"
  score >= 25: "text-orange-400"
  else: "text-red-400"

getFrameScoreBgClass(score: number):
  score >= 80: "bg-green-500/10 border-green-500/30"
  score >= 65: "bg-emerald-500/10 border-emerald-500/30"
  score >= 45: "bg-yellow-500/10 border-yellow-500/30"
  score >= 25: "bg-orange-500/10 border-orange-500/30"
  else: "bg-red-500/10 border-red-500/30"
```

**Band Classification Colors:**

```typescript
const BAND_COLORS: Record<FrameBand, string> = {
  strong_slave: 'text-red-400 bg-red-500/10 border-red-500/30',
  mild_slave: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  neutral: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
  mild_apex: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  strong_apex: 'text-green-400 bg-green-500/10 border-green-500/30',
};
```

### Typography

**Fonts:**
- **Display Font:** `font-display` (used for headings, scores, brand elements)
- **Body Font:** Default sans-serif stack
- **Monospace:** `font-mono` (used for scores, metrics, code-like content)

**Font Sizes (common patterns):**

| Element | Class | Size |
|---------|-------|------|
| Page Title | `text-2xl` | 1.5rem (24px) |
| Section Heading | `text-lg` | 1.125rem (18px) |
| Body Text | `text-sm` | 0.875rem (14px) |
| Small Text | `text-xs` | 0.75rem (12px) |
| Large Score Display | `text-7xl` | 4.5rem (72px) |
| Medium Score | `text-4xl`, `text-5xl` | 2.25-3rem |

**Font Weights:**
- `font-bold` for headings and emphasis
- `font-medium` for labels and subheadings
- Regular weight for body text

### Spacing & Layout

**Common Spacing:**
- Padding: `p-4` (1rem), `p-6` (1.5rem), `p-8` (2rem)
- Gap: `gap-2` (0.5rem), `gap-4` (1rem), `gap-6` (1.5rem)
- Margin: `mb-4` (1rem), `mb-6` (1.5rem), `mb-8` (2rem)

**Container Widths:**
- Main content: `max-w-4xl` (56rem), `max-w-5xl` (64rem), `max-w-6xl` (72rem)
- Centered: `mx-auto`

### Component Patterns

#### Glass Card

```css
.glass-card {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  box-shadow: var(--glass-shadow);
  backdrop-filter: blur(14px);
}
```

Usage: `glass-card rounded-2xl p-8 shadow-[...]`

#### Neon Button

```css
.neon-button {
  background: #0043ff;
  color: #ffffff;
  box-shadow: 0 12px 36px rgba(0, 67, 255, 0.35);
}
```

#### Score Badge

- Large circular or rectangular container
- Gradient or solid background based on score
- Large numeric display
- Small label beneath

#### Axis Score Table

- Table with dark background
- Hover row highlight: `hover:bg-[#1A1A1A]`
- Color-coded score column
- Chip-style band classification

#### Section Cards

- Dark background: `bg-[#0E0E0E]`
- Border: `border border-[#222]`
- Rounded: `rounded-lg`
- Padding: `p-4`
- Spacing: `mb-4` or `space-y-4`

#### Icon Usage

Common icons from `lucide-react`:
- `Target` - Axis breakdown, scoring
- `AlertTriangle` - Warnings, diagnostics, weaknesses
- `CheckCircle` - Corrections, suggested actions
- `Star` - Strengths
- `Lightbulb` - Corrections, insights
- `Scan` - FrameScan branding
- `Image`, `FileText` - Modality indicators
- `Calendar` - Timestamps
- `TrendingUp`, `TrendingDown`, `Minus` - Frame trends

### Animation & Effects

**Scan Animations:**
- Copier beam: White horizontal line sweeping down
- Progress bar: Gradient fill from left to right
- Wobble animation during scan: `framescan-wobble` keyframes

**Hover Effects:**
- 3D tilt on Scanner card: `perspective-[2000px]`, `rotateX`, `rotateY`
- Glass reflection gradient: `from-white/5 via-transparent to-transparent`
- Border glow on hover: `group-hover:border-fl-primary/50`

**Transitions:**
- `transition-colors duration-300` for color changes
- `transition-all duration-300` for multi-property
- Framer Motion for page/section animations

**Savage Mode Theme:**
- Overrides `#4433FF` with `#FF3344` (red)
- Adds flame icon badge
- More aggressive language in UI ("No mercy. No excuses.")

---

## 7. Two-Tier System Planning

### Proposed Tier Structure

#### **Basic Report (Free / Included)**

**Access:** All users, unlimited text scans, basic image scans

**Contents:**
1. **Overall FrameScore** (0-100)
2. **Frame Classification** (Apex / Slave / Mixed)
3. **Win/Win State** (with brief explanation)
4. **Top 3 Weaknesses** (axis names + band classifications)
5. **Top 3 Corrections** (high-level shifts, no protocol steps)
6. **Critical Signal** (primary pattern + 1-2 evidence snippets)
7. **Basic Axis Summary** (simplified view, no detailed notes)

**Image Scans (Basic):**
- Overall score
- 3-5 basic annotations (no detailed bounding boxes)
- No annotated image overlay

**UI Treatment:**
- Clean, professional presentation
- Sections: Summary, Weaknesses, Corrections
- No detailed axis breakdown table
- No sample rewrites
- CTA to upgrade for full analysis

**Value Proposition:**
- "Know your score. See your top weaknesses. Get directional fixes."
- Sufficient for casual users and initial diagnosis
- Creates awareness of deeper issues without overwhelming

#### **Elite Report (Token-Gated Upgrade)**

**Access:** Requires credits/tokens (cost TBD based on LLM usage)

**Additional Contents Beyond Basic:**
1. **Complete Axis Breakdown**
   - All 9 axes with detailed notes
   - Band classifications with explanations
   - Visual axis radar chart
   - Weighted scoring breakdown (transparency into how score was calculated)

2. **Detailed Diagnostics**
   - All primary patterns (not just one)
   - Full supporting evidence (all 3-7 snippets)
   - Pattern analysis across axes
   - Comparison to previous scans (trend analysis)

3. **Comprehensive Corrections**
   - All top shifts (not just top 3)
   - Detailed protocol steps for each shift (2-5 concrete actions)
   - Priority ranking of corrections
   - Expected frame improvement estimate for each

4. **Sample Rewrites** (text scans only)
   - Multiple rewrite examples (subject line, opening, closing, etc.)
   - Side-by-side before/after comparison
   - Explanation of what changed and why
   - Copy-paste ready versions

5. **Image Analysis Enhancements** (image scans)
   - Full annotated image with bounding boxes
   - Detailed annotations (all, not just top 5)
   - Posture and body language analysis
   - Visual hierarchy critique
   - Before/after recommendations

6. **Context & Education**
   - Axis definitions and what they measure
   - Examples of Apex vs Slave expressions for relevant axes
   - Links to doctrine resources
   - Personalized coaching insights based on patterns

7. **Action Plan**
   - Prioritized roadmap for improvement
   - Quick wins vs long-term shifts
   - Recommended follow-up scans
   - Integration with CRM (link to tasks, notes, contacts)

**UI Treatment:**
- Premium visual design
- Expanded sections with rich formatting
- Data visualizations (radar chart, trend graphs)
- Downloadable/exportable report
- Full detail view with no hidden content

**Value Proposition:**
- "Complete diagnostic. Every weakness exposed. Exact protocol to fix it."
- For serious users committed to frame mastery
- Professional coaching-level detail

### Upgrade Flow

**In-Report Paywall:**

1. **Basic report loads first** (fast, no delay)
2. **After Summary section**, show blur overlay on remaining sections
3. **Paywall card appears:**
   - Lock icon
   - "Unlock Full Report" heading
   - List of what's included in Elite:
     - Detailed axis-by-axis breakdown
     - Specific corrections with examples
     - Personalized coaching recommendations
     - Visual annotations (image scans)
   - Pricing: "Starting at $X tokens" or "Upgrade to Pro"
   - CTA button: "Upgrade to Elite Report"
4. **On upgrade click:**
   - If sufficient credits: Unlock immediately (no re-scan)
   - If insufficient: Redirect to pricing/payment
5. **Post-unlock:**
   - Remove blur, reveal all sections
   - Add "Elite" badge to report header
   - Save upgrade status to report record

### Token Pricing Strategy

**Recommended Costs:**

| Scan Type | Basic | Elite | Additional LLM Calls |
|-----------|-------|-------|----------------------|
| Text Scan | Free (unlimited) | 10-20 tokens | +1 call (UI report builder - optional) |
| Image Scan | Free (limited) | 30-50 tokens | +2 calls (Nano Banana + UI builder) |

**Why Token-Gated?**
- Elite report requires additional LLM processing:
  - More detailed prompt for extended diagnostics
  - Sample rewrite generation (GPT-4 intensive)
  - Extended context for coaching insights
- Aligns value with cost (users pay for depth)
- Creates clear upgrade incentive
- Protects against API abuse

**Credit System Integration:**
- Use existing `creditStore.ts` functions:
  - `hasCreditsFor('elite_scan')`
  - `useCreditsForScan('elite_scan')`
  - `getCostForTier('elite')`
- Add refund logic if scan fails

---

## 8. File Reference Map

### Core FrameScan Engine

| File Path | Purpose | Lines | Key Exports |
|-----------|---------|-------|-------------|
| `/src/lib/frameScan/frameTypes.ts` | Type definitions for all FrameScan data structures | 329 | `FrameScanResult`, `FrameScore`, `FrameAxisScore`, `FrameBand`, `FrameDomainId` |
| `/src/lib/frameScan/frameScanLLM.ts` | Runtime LLM integration for text and image scans | 711 | `runTextFrameScan()`, `runImageFrameScan()` |
| `/src/lib/frameScan/frameScoring.ts` | Deterministic scoring algorithm (axis normalization, weighting, Win/Win adjustment) | 314 | `scoreFrameScan()`, `normalizeAxisScoreTo100()`, `computeAxisWeights()` |
| `/src/lib/frameScan/frameSpec.ts` | Loads and validates the FrameScan JSON spec | 354 | `frameScanSpec`, `getAxisDefinition()`, `getDomainPriorityAxes()` |
| `/src/lib/frameScan/frameReportUI.ts` | UI report builder (second LLM call to format results) | 358 | `buildFrameScanUIReport()`, `buildFallbackUIReport()` |
| `/src/config/frameScanSpec.json` | Master FrameScan specification (doctrine, axes, domains, detection rules) | ~600 | JSON spec loaded by `frameSpec.ts` |

### Adapters & Integration

| File Path | Purpose | Lines | Key Exports |
|-----------|---------|-------|-------------|
| `/src/lib/frameScan/landingScanAdapter.ts` | Adapter for landing page Scanner.tsx (legacy FrameAnalysisResult format) | 285 | `analyzeLandingFrame()`, `runLandingTextScan()`, `runLandingImageScan()` |
| `/src/lib/frameScan/noteTextScan.ts` | Adapter for scanning note text within CRM | TBD | Functions for scanning note content |
| `/src/lib/frameScan/noteCanvasScan.ts` | Adapter for scanning note canvas (visual elements) | TBD | Functions for canvas analysis |

### Data Storage

| File Path | Purpose | Lines | Key Exports |
|-----------|---------|-------|-------------|
| `/src/services/frameScanReportStore.ts` | In-memory store for all FrameScan reports | 253 | `addFrameScanReport()`, `getFrameScanReports()`, `getReportsForContact()`, `getReportById()` |
| `/src/services/creditStore.ts` | Credit/token management for tiered scans | TBD | `hasCreditsFor()`, `useCreditsForScan()`, `getAvailableCredits()` |

### UI Components

| File Path | Purpose | Lines | Key Components |
|-----------|---------|-------|----------------|
| `/src/components/Scanner.tsx` | Landing page FrameScan widget (public-facing) | 556 | `Scanner` component with text/image input, scan animation, results display |
| `/src/components/crm/FrameScanPage.tsx` | CRM FrameScan list view (all reports) | 432 | `FrameScanPage` component with filtering and report cards |
| `/src/components/crm/FrameScanReportDetail.tsx` | Full report detail view with axis breakdown | 882 | `FrameScanReportDetail` component with UI report rendering + legacy fallback |
| `/src/components/crm/FrameScanContactTab.tsx` | Contact-specific FrameScan tab in dossier | TBD | Contact frame scan history |

### Utilities & Helpers

| File Path | Purpose | Lines | Key Exports |
|-----------|---------|-------|-------------|
| `/src/lib/frameScan/frameProfile.ts` | Helper functions for frame score display | TBD | `getFrameScoreLabel()`, `getFrameScoreColorClass()`, `formatProfileDate()` |
| `/src/lib/frameScan/frameThrottle.ts` | Client-side throttling to limit scan abuse | TBD | `enforceThrottle()`, `incrementScanCount()` |
| `/src/lib/frameScan/framelordAssistant.ts` | AI assistant for frame coaching | TBD | Assistant logic |
| `/src/lib/frameScan/contactContext.ts` | Contact-aware frame analysis | TBD | Context building for multi-contact scans |

### LLM Providers

| File Path | Purpose | Lines | Key Exports |
|-----------|---------|-------|-------------|
| `/src/lib/llm/openaiClient.ts` | OpenAI API integration | TBD | `callOpenAIChat()` |
| `/src/lib/llm/nanobananaClient.ts` | Nano Banana image annotation service | TBD | `callNanoBananaAnnotateImage()` |
| `/src/lib/llm/providers.ts` | API key resolution logic | TBD | Key management |

### Dev/Testing

| File Path | Purpose | Lines | Key Exports |
|-----------|---------|-------|-------------|
| `/src/dev/seedFrameScans.ts` | Demo data seeding for development | 356 | `seedDemoFrameScans()`, `clearFrameScanDemoSeedFlag()` |
| `/src/lib/frameScan/frameScoring.test.ts` | Unit tests for scoring algorithm | TBD | Test suite |
| `/src/lib/frameScan/frameSpec.imageScan.test.ts` | Tests for image scan spec validation | TBD | Test suite |

### Design System

| File Path | Purpose | Lines | Key Content |
|-----------|---------|-------|-------------|
| `/src/styles/theme.css` | Global theme variables and mode overrides | 437 | CSS custom properties, glass-card, neon-button, Savage Mode styles |
| `/src/components/ui/*.tsx` | Reusable UI components | Various | Buttons, cards, modals, etc. |

---

## 9. Gaps & Opportunities

### Data Being Gathered But Not Displayed

1. **Weighted Axis Scores:** The scoring algorithm computes `weightedAxisScores` showing exactly how each axis contributed to the final score, but this transparency is never shown to users. **Opportunity:** Add a "Scoring Breakdown" section showing the math.

2. **Sample Rewrites:** For text scans, the LLM generates `sampleRewrites` with Apex versions of key sections (subject line, opening, closing). These are **never displayed** in either landing or CRM views. **Opportunity:** Dedicated "Rewrites" section with before/after comparison.

3. **Priority Axes:** Each domain has priority axes that count double in scoring, but users don't know which axes matter most for their scan type. **Opportunity:** Highlight priority axes in the breakdown table.

4. **Win/Win State Details:** The Win/Win state is shown as a badge but not explained. Users don't understand WHY they got "win_lose" vs "neutral". **Opportunity:** Dedicated Win/Win explanation section with markers from the spec.

5. **Band Descriptions:** Each band (strong_slave, mild_apex, etc.) has detailed descriptions in the spec, but users only see the band label. **Opportunity:** Tooltips or expandable descriptions for each band.

6. **Axis Notes:** The LLM provides detailed notes for EACH axis score, explaining the reasoning. Currently only shown in the axis table notes column (which is often truncated). **Opportunity:** Expand notes into dedicated axis cards with full text.

7. **Trend Analysis:** Contacts have `frame.trend` ('up' | 'down' | 'flat') updated after each scan, but there's no visualization of frame score over time. **Opportunity:** Trend graph showing score progression across scans.

8. **Protocol Steps:** Each correction has 2-5 concrete protocol steps, but these are collapsed into the corrections section. **Opportunity:** Interactive correction cards with expandable protocol steps.

9. **Annotations Metadata:** Image annotations have normalized coordinates (x, y, width, height) but there's no interactive overlay showing WHERE on the image each annotation points. **Opportunity:** Interactive annotated image with clickable hotspots.

10. **Domain Context:** Users don't know why the system chose a specific domain or what domains are available. **Opportunity:** Domain selector with descriptions.

### Analysis That Could Be Added

1. **Comparative Analysis:**
   - "Your buyer_seller_position score is in the bottom 20% of sales_email scans"
   - "This is your strongest sales email to date"
   - Percentile rankings across axes

2. **Pattern Recognition:**
   - "You consistently score low on win_win_integrity — this is a structural issue, not a one-off"
   - Multi-scan pattern detection
   - Recurring weakness alerts

3. **Frame Profile:**
   - Overall user frame profile across all scans
   - Strongest vs weakest axes on average
   - Recommended focus areas for improvement

4. **Contextualized Coaching:**
   - "For sales emails, focus first on buyer_seller_position and win_win_integrity"
   - Domain-specific advice based on priority axes
   - Personalized improvement roadmap

5. **Estimated Impact:**
   - "Fixing your internal_sale would likely add +8 points to your score"
   - Correction priority ranking by ROI
   - Before/after score projections

6. **Cross-Scan Insights:**
   - "Your dating messages score 15 points higher than your sales emails — you're more confident in personal contexts"
   - Cross-domain pattern analysis
   - Context-switching frame shifts

7. **Visual Data:**
   - Radar chart of 9 axes
   - Score distribution histogram
   - Trend line graph over time
   - Band distribution pie chart

8. **Predictive Analysis:**
   - "Based on your pattern, this email will likely score 45-55"
   - Pre-scan score prediction (for returning users)
   - Confidence intervals

9. **Benchmarking:**
   - "Elite performers in sales typically score 70+ on buyer_seller_position"
   - Industry benchmarks (if data available)
   - Peer comparison (anonymized)

10. **Root Cause Analysis:**
    - "Your low field_strength stems from inconsistent internal_sale — fix the root, not the symptom"
    - Axis dependency mapping
    - Cascading correction logic

### UI Improvements Most Needed

1. **Visual Hierarchy:**
   - Current reports are text-heavy and monotonous
   - Need more visual breaks, cards, charts, icons
   - Better use of color to guide attention

2. **Progressive Disclosure:**
   - Show high-level summary first
   - Expand to detailed analysis on demand
   - Avoid overwhelming users with all data at once

3. **Interactive Elements:**
   - Clickable axis names for definitions
   - Expandable correction cards with protocol steps
   - Hover tooltips for band explanations
   - Interactive annotated images

4. **Data Visualization:**
   - Radar chart for 9 axes (visual snapshot of frame shape)
   - Trend line for score history
   - Bar charts for axis comparison
   - Heatmaps for pattern intensity

5. **Personalization:**
   - Address user by name (from Contact Zero)
   - Reference previous scans ("Your score improved by 12 points since last week")
   - Contextual recommendations based on user's domain

6. **Actionability:**
   - Clear "Next Steps" section
   - Priority-ranked corrections
   - Quick actions (e.g., "Save to Tasks", "Schedule follow-up scan")
   - Integration with CRM workflows

7. **Educational Content:**
   - Inline axis explanations
   - Examples of Apex vs Slave for each axis
   - Links to doctrine resources
   - Video tutorials or walkthroughs

8. **Readability:**
   - Better typography hierarchy
   - More whitespace
   - Shorter paragraphs
   - Clearer section labels

9. **Mobile Optimization:**
   - Current tables don't work well on mobile
   - Need responsive card layouts
   - Touch-friendly interactions

10. **Export & Sharing:**
    - Download PDF of report
    - Copy shareable link
    - Email report to self
    - Integrate with note-taking

### Technical Debt & Issues

1. **Legacy Format Adapter:**
   - `landingScanAdapter.ts` maps 9 axes to 8 subscores (lossy conversion)
   - Landing page uses outdated `FrameAnalysisResult` interface
   - Should migrate landing page to use full `FrameScanResult`

2. **Double LLM Call:**
   - UI report builder makes a second LLM call to format results
   - Increases cost and latency
   - Could be replaced with deterministic template builder

3. **No Caching:**
   - Reports are re-rendered on every view
   - UI report should be cached in storage
   - Avoid re-calling LLM for same data

4. **Store Subscriptions:**
   - Report detail component doesn't subscribe to store
   - Uses props or fetchById (not reactive)
   - Could use useSyncExternalStore for live updates

5. **Validation Gaps:**
   - LLM output validation catches basic errors but not semantic issues
   - No check for hallucinated axis IDs
   - No validation that notes actually reference the content

6. **Error Handling:**
   - Generic "Scan Failed" message
   - No specific error types (quota exceeded, invalid input, LLM timeout)
   - No retry logic

7. **Performance:**
   - Large reports with long notes can be slow to render
   - No virtualization for long lists
   - No lazy loading of sections

8. **Accessibility:**
   - No ARIA labels on interactive elements
   - Color coding without text labels (color blindness issue)
   - Keyboard navigation not fully supported

9. **Testing:**
   - Limited test coverage
   - No integration tests for full scan flow
   - Mock data doesn't match production variety

10. **Documentation:**
    - Inline code comments are good but not comprehensive
    - No architecture diagrams
    - No user-facing documentation of what axes mean

---

## 10. Raw Data Appendix

### Full TypeScript Interface Definitions

#### FrameAxisId Union Type

```typescript
export type FrameAxisId =
  | "assumptive_state"
  | "buyer_seller_position"
  | "identity_vs_tactic"
  | "internal_sale"
  | "win_win_integrity"
  | "persuasion_style"
  | "pedestalization"
  | "self_trust_vs_permission"
  | "field_strength";
```

#### FrameWinWinState Union Type

```typescript
export type FrameWinWinState = "win_win" | "win_lose" | "lose_lose" | "neutral";
```

#### FrameBand Union Type

```typescript
export type FrameBand =
  | "strong_slave"
  | "mild_slave"
  | "neutral"
  | "mild_apex"
  | "strong_apex";
```

#### FrameDomainId Union Types

```typescript
export type FrameTextDomainId =
  | "generic"
  | "sales_email"
  | "dating_message"
  | "leadership_update"
  | "social_post";

export type FrameImageDomainId =
  | "profile_photo"
  | "team_photo"
  | "landing_page_hero"
  | "social_post_image";

export type FrameDomainId = FrameTextDomainId | FrameImageDomainId;
```

### Sample LLM Prompt (Abbreviated)

**System Prompt:**

```
You are the FrameLord FrameScan engine.

You NEVER compute the final 0–100 score. The app already does that.
Your only job is to output a valid FrameScanResult JSON object.

You will receive:

frameScanSpec: a JSON spec that defines:
- core frame model (Apex vs Slave, Win Win model)
- axes and bands
- text domains and image visual domains
- detection rules and domain priority axes

request:
- modality: "text" or "image"
- domain: one of the domains defined in the spec
- context: optional metadata like contact or project info
- content: the actual text to scan, or a description of the image

Use ONLY the definitions and axes in frameScanSpec.

Your task on every request:

For each axis in the spec:
1. Decide an integer score from -3 to +3
2. Map score to band
3. Write notes explaining the score using specific phrases

Decide overallWinWinState using the Win Win model from the spec.

Decide overallFrame based on axis distribution.

Build diagnostics with primaryPatterns and supportingEvidence.

Build corrections with topShifts and protocol steps.

If modality is "text", also include sampleRewrites.

Output EXACTLY this JSON structure and nothing else:
{ ... }
```

**User Payload Example (Text Scan):**

```json
{
  "frameScanSpec": {
    "version": "1.0.0",
    "name": "FrameLord_Master_FrameScanSpec",
    "core_model": { ... },
    "text_scan": { ... },
    "image_scan": { ... }
  },
  "request": {
    "modality": "text",
    "domain": "sales_email",
    "content": "Hi [Name],\n\nI hope this email finds you well! I wanted to reach out because I think we could really help your company...",
    "context": {}
  }
}
```

### Sample API Response (Abbreviated)

```json
{
  "modality": "text",
  "domain": "sales_email",
  "overallFrame": "slave",
  "overallWinWinState": "win_lose",
  "axes": [
    {
      "axisId": "assumptive_state",
      "score": -2,
      "band": "strong_slave",
      "notes": "The opening 'I hope this finds you well' and 'I wanted to reach out' signal uncertainty about welcome. Assumes the recipient is not interested."
    },
    {
      "axisId": "buyer_seller_position",
      "score": -3,
      "band": "strong_slave",
      "notes": "The phrase 'I would love the opportunity to show you' positions the sender as a product begging to be purchased. Classic seller posture."
    },
    {
      "axisId": "win_win_integrity",
      "score": -1,
      "band": "mild_slave",
      "notes": "The promise 'I promise not to take too much of your time' introduces guilt and pressure. Not clean Win/Win."
    },
    // ... 6 more axes
  ],
  "diagnostics": {
    "primaryPatterns": [
      "chronic seller posture",
      "permission-seeking language",
      "apologetic positioning"
    ],
    "supportingEvidence": [
      "'I hope this finds you well' - unnecessary filler",
      "'I would love the opportunity' - begging language",
      "'I promise not to take too much of your time' - apologetic frame"
    ]
  },
  "corrections": {
    "topShifts": [
      {
        "axisId": "buyer_seller_position",
        "shift": "Reframe from seller to buyer. Screen for fit rather than pitching.",
        "protocolSteps": [
          "Replace 'I would love the opportunity' with a concrete value statement",
          "Position yourself as evaluating if they're a good fit",
          "Remove all language that suggests you need them more than they need you"
        ]
      },
      {
        "axisId": "assumptive_state",
        "shift": "Assume welcome and interest. Remove hedging language.",
        "protocolSteps": [
          "Delete 'I hope this finds you well' entirely",
          "Lead with a specific observation about them or their company",
          "Assume they want to hear from you"
        ]
      },
      // ... more shifts
    ],
    "sampleRewrites": [
      {
        "purpose": "Subject line",
        "apexVersion": "Quick observation about your Series B scaling"
      },
      {
        "purpose": "Opening paragraph",
        "apexVersion": "I noticed your company just raised Series B. Congrats — that growth pace is impressive.\n\nI work with 3 companies in your space who faced the same scaling challenges you're about to hit. Happy to share what worked for them if useful."
      }
    ]
  }
}
```

### Sample FrameScore Object (After Scoring)

```json
{
  "frameScore": 34,
  "overallFrame": "slave",
  "overallWinWinState": "win_lose",
  "domain": "sales_email",
  "axisScores": [
    {
      "axisId": "assumptive_state",
      "score": -2,
      "band": "strong_slave",
      "notes": "..."
    },
    // ... all 9 axes
  ],
  "weightedAxisScores": [
    {
      "axisId": "assumptive_state",
      "normalizedScore": 16.67,
      "weight": 1
    },
    {
      "axisId": "buyer_seller_position",
      "normalizedScore": 0,
      "weight": 2
    },
    // ... all 9 axes
  ],
  "notes": [
    "Base frame score before Win/Win adjustment: 39.0",
    "Final frame score after Win/Win adjustment: 34.0",
    "Win/Win state: win_lose",
    "Domain: sales_email",
    "Priority axes for domain: buyer_seller_position, win_win_integrity, internal_sale",
    "Axis distribution: 0 apex bands, 7 slave bands, 2 neutral"
  ]
}
```

### Sample Demo Data (from seedFrameScans.ts)

See `/src/dev/seedFrameScans.ts` for 6 complete demo scan configurations covering:
1. High-scoring Apex sales email (score: 82)
2. Low-scoring Slave sales email (score: 34)
3. Neutral leadership update (score: 58)
4. Apex dating message (score: 75)
5. Apex social post (score: 68)
6. Apex profile photo (score: 71)

Each includes:
- Full input preview
- Detailed analysis interpretation
- Specific recommendations
- Axis score breakdown
- Timestamps for historical data

---

## Conclusion

FrameScan is a **world-class diagnostic engine** with a sophisticated architecture and rich data output. The current UI only scratches the surface of what's possible. The redesign should:

1. **Surface Hidden Value:** Display all the rich data currently being generated but not shown (sample rewrites, weighted scores, protocol steps, axis notes)

2. **Add Visualizations:** Radar charts, trend graphs, heatmaps to make the 9-axis system immediately graspable

3. **Implement Two-Tier System:** Basic (free, summary-level) vs Elite (token-gated, comprehensive) with clear upgrade path

4. **Improve Actionability:** Prioritized corrections, next steps, CRM integration, task creation

5. **Educate Users:** Inline axis explanations, examples, doctrine links, progressive disclosure of complexity

6. **Optimize Performance:** Cache UI reports, lazy load sections, virtualize long lists

7. **Fix Technical Debt:** Migrate landing page to full schema, reduce LLM calls, improve error handling

The opportunity here is **massive**. FrameScan can become the most valuable feature in the app with the right report experience.

---

**Research Complete. Ready for Redesign.**
