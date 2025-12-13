# FrameLord Lab — Master Build Prompt for Google AI Studio

## Project Overview

Build **FrameLord Lab**, a comprehensive call intelligence and real-time coaching system for the FrameLord CRM. This feature enables users to make/receive calls and texts directly within the CRM, record conversations, and receive AI-powered frame analysis with real-time coaching capabilities.

FrameLord is built on the concept of "frame" — the psychological container of authority, confidence, and control in any interaction. The AI will analyze calls against frame doctrines to identify where users are winning or losing frame, seeking external validation, or where prospects are testing boundaries.

---

## Tech Stack Requirements

Build this using the following technologies to ensure seamless integration:

```
Framework:       React 19 + TypeScript
Build Tool:      Vite 6.x
Styling:         Tailwind CSS 4.x with custom color palette
Animation:       Framer Motion
State:           In-memory service-based stores (no Redux)
Audio:           Web Audio API + MediaRecorder API
WebRTC:          For real-time calls (integrate with Twilio/Vonage SDK)
Transcription:   Whisper API / Deepgram / AssemblyAI (real-time streaming)
AI Analysis:     Google Gemini API / OpenAI GPT-4
```

---

## Design System — CRITICAL

All UI must match the existing FrameLord dark theme:

### Color Palette
```css
/* Primary Backgrounds */
--bg-deep: #020712;
--bg-panel: #050c18;
--bg-card: #0c1424;

/* Primary Blue Accent — #0043FF */
--accent-primary: #0043FF;
--accent-primary-40: rgba(0, 67, 255, 0.4);
--accent-primary-20: rgba(0, 67, 255, 0.2);

/* Secondary Purple Accent */
--accent-secondary: #4433FF;

/* Text Colors */
--text-primary: #ffffff;
--text-secondary: #dce8ff;
--text-muted: #6b7280;

/* Status Colors */
--status-success: #4ade80;
--status-warning: #f59e0b;
--status-danger: #ef4444;
--status-info: #3b82f6;
```

### Container Styling Pattern (FrameScan Panel Skin)
```tsx
// Standard card/panel container
className="bg-[#050c18] border border-[#0043FF]/40 shadow-[0_0_18px_rgba(0,0,0,0.9),0_0_24px_rgba(0,67,255,0.3)] rounded-3xl p-4"

// Inner elements
className="bg-[#020712] border border-[#0043FF]/20 rounded-lg"

// Hover states
className="hover:border-[#0043FF]/50 hover:shadow-[0_0_12px_rgba(0,67,255,0.3)]"
```

### Typography
```css
font-family: 'Inter', system-ui, sans-serif;
/* Headers: font-bold, uppercase, tracking-widest */
/* Labels: text-[10px] uppercase tracking-wider text-gray-500 */
/* Body: text-sm text-gray-300 */
```

---

## Architecture Pattern

Follow the **Contact Spine** architecture — everything attaches to a Contact:

```typescript
// Every call belongs to a contact
interface CallRecord {
  id: string;
  contactId: string;           // Required - links to Contact
  authorId: string;            // Contact Zero (the user)
  direction: 'inbound' | 'outbound';
  type: 'call' | 'sms';
  status: 'active' | 'completed' | 'missed' | 'failed';
  startedAt: string;           // ISO timestamp
  endedAt?: string;
  duration?: number;           // seconds
  recordingUrl?: string;       // Audio file (Data URL or external)
  transcription?: CallTranscription;
  frameAnalysis?: CallFrameAnalysis;
  frameScore?: number;         // 0-100
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
```

### Service Store Pattern
```typescript
// Use in-memory stores as single source of truth
// File: src/services/callStore.ts

let calls: CallRecord[] = [];

export const createCall = (call: Omit<CallRecord, 'id' | 'createdAt' | 'updatedAt'>): CallRecord => { ... }
export const getCallById = (id: string): CallRecord | undefined => { ... }
export const getCallsByContactId = (contactId: string): CallRecord[] => { ... }
export const updateCall = (id: string, updates: Partial<CallRecord>): CallRecord | undefined => { ... }
export const deleteCall = (id: string): boolean => { ... }
```

---

## Feature 1: Telephony Integration

### 1.1 Call Interface Component
```
Location: src/components/calls/CallInterface.tsx
```

Build a call control interface that appears when initiating/receiving calls:

```
┌─────────────────────────────────────────────────────────────┐
│  ┌──────┐                                                   │
│  │ IMG  │  Sarah Chen                                       │
│  └──────┘  +1 (555) 123-4567                                │
│                                                             │
│            ┌─────────────────────────┐                      │
│            │      00:05:32           │  ← Call duration     │
│            └─────────────────────────┘                      │
│                                                             │
│    ┌────┐  ┌────┐  ┌────┐  ┌────┐  ┌────┐                  │
│    │MUTE│  │HOLD│  │ REC│  │ AI │  │KEYP│                  │
│    └────┘  └────┘  └────┘  └────┘  └────┘                  │
│                                                             │
│              ┌──────────────────┐                           │
│              │    END CALL      │  ← Red button             │
│              └──────────────────┘                           │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ AI LIVE COACHING (when enabled)                      │   │
│  │ ─────────────────────────────────────────────────── │   │
│  │ ⚠️ Energy dropping — pick up your pace              │   │
│  │ ✓ Good reframe on the objection                     │   │
│  │ 🎯 CLOSE NOW — prospect is ready                    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 SMS Interface Component
```
Location: src/components/calls/SMSThread.tsx
```

iMessage-style thread view with blue (outbound) and gray (inbound) bubbles.

---

## Feature 2: FrameLord Lab — Call Analysis Dashboard

### 2.1 Main Lab View
```
Location: src/components/lab/FrameLordLab.tsx
```

Full-page analysis view that opens when viewing a completed call:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ FRAMELORD LAB                                           Call with Sarah Chen │
│ ════════════════════════════════════════════════════════════════════════════│
│                                                                              │
│ WAVEFORM TIMELINE (full width)                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐│
│ │ ▁▂▃▅▇█▇▅▃▂▁▂▃▅▇█▇▅▃▂▁▂▃▅▇█▇▅▃▂▁▂▃▅▇█▇▅▃▂▁▂▃▅▇█▇▅▃▂▁▂▃▅▇█▇▅▃▂▁ ││
│ │ [GREEN][GREEN][YELLOW][RED████][GREEN][YELLOW][GREEN][RED██][GREEN]      ││
│ │  0:00              2:30              5:00              7:30        10:00  ││
│ └──────────────────────────────────────────────────────────────────────────┘│
│   ▲ Playhead                                                                │
│   ├── Click anywhere to jump to that timestamp                              │
│   └── Colors indicate frame strength: GREEN=strong, YELLOW=warning, RED=leak│
│                                                                              │
│ ┌─────────────────────────────────┐  ┌──────────────────────────────────────┐
│ │ FRAME SCORE                     │  │ FRAME ANALYSIS CHUNKS                │
│ │ ┌───────────────────────┐       │  │                                      │
│ │ │                       │       │  │ ┌────────────────────────────────┐   │
│ │ │         72            │       │  │ │ 🔴 2:31 - 3:45 FRAME LEAK      │   │
│ │ │      DEVELOPING       │       │  │ │ "You sought validation when    │   │
│ │ │                       │       │  │ │  prospect pushed back on price"│   │
│ │ └───────────────────────┘       │  │ │ [JUMP] [COACH] [ADD NOTE]      │   │
│ │                                 │  │ └────────────────────────────────┘   │
│ │ Tonality:        68             │  │                                      │
│ │ Cadence:         75             │  │ ┌────────────────────────────────┐   │
│ │ Frame Control:   71             │  │ │ 🟢 3:46 - 5:20 STRONG FRAME    │   │
│ │ Clarity:         74             │  │ │ "Excellent reframe - redirected│   │
│ │                                 │  │ │  to value without defensiveness│   │
│ └─────────────────────────────────┘  │ │ [JUMP] [COACH] [ADD NOTE]      │   │
│                                      │ └────────────────────────────────┘   │
│ ┌─────────────────────────────────┐  │                                      │
│ │ PROSPECT BEHAVIOR               │  │ ┌────────────────────────────────┐   │
│ │                                 │  │ │ 🟡 5:21 - 6:10 FRAME TEST      │   │
│ │ Frame Tests:           3        │  │ │ "Prospect testing with silence │   │
│ │ Buying Signals:        5        │  │ │  - you filled it too quickly"  │   │
│ │ Objections:            2        │  │ │ [JUMP] [COACH] [ADD NOTE]      │   │
│ │ Compliance Level:      HIGH     │  │ └────────────────────────────────┘   │
│ └─────────────────────────────────┘  └──────────────────────────────────────┘
│                                                                              │
│ ┌──────────────────────────────────────────────────────────────────────────┐│
│ │ AI COACHING CHAT                                                         ││
│ │ ──────────────────────────────────────────────────────────────────────── ││
│ │ 🤖 At 2:31, when the prospect said "that seems expensive," you           ││
│ │    responded with "well, I understand..." which is a validation-seeking  ││
│ │    pattern. Instead, try: "It's an investment. What matters is whether   ││
│ │    the ROI makes sense for your situation."                              ││
│ │                                                                          ││
│ │ YOU: What should I have done differently with the silence at 5:21?       ││
│ │                                                                          ││
│ │ 🤖 Silence is a frame test. The person who speaks first loses frame.     ││
│ │    You waited only 2 seconds before filling. Practice 7-second silences. ││
│ │    Let the prospect process and speak first.                             ││
│ │                                                                          ││
│ │ ┌────────────────────────────────────────────────────────────┐ [SEND]   ││
│ │ │ Ask about this call...                                      │          ││
│ │ └────────────────────────────────────────────────────────────┘          ││
│ └──────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Waveform Visualization Component
```
Location: src/components/lab/WaveformTimeline.tsx
```

Requirements:
- Full-width waveform using Web Audio API + Canvas
- Color-coded segments based on frame analysis
- Clickable regions that jump to timestamp
- Playhead that tracks current position
- Hover tooltips showing segment summary

```typescript
interface WaveformSegment {
  startTime: number;        // seconds
  endTime: number;
  frameStatus: 'strong' | 'warning' | 'leak';
  label: string;
  summary: string;
}

interface WaveformTimelineProps {
  audioUrl: string;
  segments: WaveformSegment[];
  currentTime: number;
  onSeek: (time: number) => void;
  onSegmentClick: (segment: WaveformSegment) => void;
}
```

Color mapping:
- `strong` (GREEN): `#4ade80` — Frame maintained, good control
- `warning` (YELLOW): `#f59e0b` — Frame tested, minor slip
- `leak` (RED): `#ef4444` — Frame lost, validation seeking

### 2.3 Frame Analysis Chunk Component
```
Location: src/components/lab/FrameChunk.tsx
```

Each analyzed segment displays:
- Status indicator (color dot)
- Timestamp range
- Category label (FRAME LEAK, STRONG FRAME, FRAME TEST, etc.)
- AI summary of what happened
- Action buttons: [JUMP] [COACH] [ADD NOTE]

---

## Feature 3: Call Transcription & Analysis Data Models

### 3.1 Transcription Model
```typescript
interface CallTranscription {
  id: string;
  callId: string;
  segments: TranscriptionSegment[];
  fullText: string;
  language: string;
  confidence: number;
  createdAt: string;
}

interface TranscriptionSegment {
  id: string;
  speaker: 'user' | 'prospect' | 'unknown';
  text: string;
  startTime: number;      // seconds
  endTime: number;
  confidence: number;

  // Tonality analysis
  tonality?: {
    pitch: 'low' | 'normal' | 'high';
    pitchVariance: number;        // 0-1, higher = more variation
    pace: 'slow' | 'normal' | 'fast';
    wordsPerMinute: number;
    energy: 'low' | 'normal' | 'high';
    clarity: number;              // 0-100
  };
}
```

### 3.2 Frame Analysis Model
```typescript
interface CallFrameAnalysis {
  id: string;
  callId: string;
  overallScore: number;           // 0-100

  // Sub-scores
  scores: {
    tonality: number;             // Voice pitch, pace, energy
    cadence: number;              // Speech rhythm, pauses
    frameControl: number;         // Authority maintenance
    clarity: number;              // Message clarity
    closing: number;              // Closing ability
  };

  // Analyzed chunks
  chunks: FrameAnalysisChunk[];

  // Prospect behavior analysis
  prospectBehavior: {
    frameTests: number;           // Count of frame tests
    buyingSignals: number;        // Count of buying signals
    objections: number;           // Count of objections
    complianceLevel: 'low' | 'medium' | 'high';
    dominantEmotion: string;
  };

  // Overall insights
  keyInsights: string[];
  improvementAreas: string[];
  strengths: string[];

  createdAt: string;
}

interface FrameAnalysisChunk {
  id: string;
  startTime: number;
  endTime: number;

  // Frame classification
  frameStatus: 'strong' | 'warning' | 'leak';
  category: FrameCategory;

  // Analysis
  transcriptExcerpt: string;
  aiAnalysis: string;
  doctrine: string;              // Which frame doctrine applies

  // User annotations
  userNotes?: string;
  coachingMessages?: CoachingMessage[];
}

type FrameCategory =
  | 'frame_leak'           // Lost frame, sought validation
  | 'frame_test'           // Prospect tested, response analyzed
  | 'strong_frame'         // Maintained authority
  | 'reframe'              // Successfully redirected
  | 'close_attempt'        // Closing moment
  | 'objection_handle'     // Objection response
  | 'rapport_build'        // Connection building
  | 'energy_shift'         // Tonality change detected
  | 'silence_test'         // Silence used/broken
  | 'validation_seek';     // Seeking external approval

interface CoachingMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  chunkId: string;
}
```

---

## Feature 4: Real-Time Call Monitoring (AI Live Coach)

### 4.1 Live Coaching Service
```
Location: src/services/liveCoachingService.ts
```

Real-time transcription + analysis pipeline:

```typescript
interface LiveCoachingConfig {
  enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';  // How often to interject
  focusAreas: FrameCategory[];             // What to watch for
  audioStream: MediaStream;
}

interface LiveCoachingNote {
  id: string;
  timestamp: number;
  type: 'warning' | 'suggestion' | 'alert' | 'praise';
  icon: string;                            // Emoji
  message: string;
  priority: 'low' | 'medium' | 'high';
}

// Service functions
export const startLiveCoaching = (config: LiveCoachingConfig): void => { ... }
export const stopLiveCoaching = (): void => { ... }
export const onCoachingNote = (callback: (note: LiveCoachingNote) => void): void => { ... }
```

### 4.2 Live Coaching UI Component
```
Location: src/components/calls/LiveCoachingPanel.tsx
```

Displays during active calls when AI monitoring is enabled:

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 AI LIVE COACH                              [SENSITIVITY] │
│ ─────────────────────────────────────────────────────────── │
│                                                             │
│ ⚠️  2:31  Energy dropping — pick up your pace              │
│ ✓   2:45  Good recovery on that reframe                    │
│ 🎯  3:12  CLOSE NOW — prospect showing buying signals      │
│ ⚠️  3:30  You're talking too fast — slow down              │
│ 🔴  3:45  Frame leak — you justified the price             │
│ ✓   4:00  Silence held well — prospect spoke first         │
│                                                             │
│ [Clear] [Pause Coaching] [Save Notes]                       │
└─────────────────────────────────────────────────────────────┘
```

Notes appear in real-time as the AI detects patterns. Styling:
- Warning (⚠️): Yellow text
- Success (✓): Green text
- Alert/Close (🎯): Blue/purple pulse
- Critical (🔴): Red with subtle glow

---

## Feature 5: Tonality Analysis Engine

### 5.1 Audio Analysis Service
```
Location: src/services/tonalityAnalysisService.ts
```

Analyze voice characteristics using Web Audio API:

```typescript
interface TonalityMetrics {
  // Pitch analysis
  averagePitch: number;           // Hz
  pitchRange: [number, number];   // Min/max Hz
  pitchStability: number;         // 0-100, higher = more stable
  pitchTrend: 'rising' | 'falling' | 'stable';

  // Pace analysis
  wordsPerMinute: number;
  pauseFrequency: number;         // Pauses per minute
  averagePauseLength: number;     // Seconds
  paceTrend: 'speeding_up' | 'slowing_down' | 'stable';

  // Energy analysis
  averageVolume: number;          // dB
  volumeVariance: number;
  energyLevel: 'low' | 'medium' | 'high';
  energyTrend: 'increasing' | 'decreasing' | 'stable';

  // Clarity
  articulationScore: number;      // 0-100
  fillerWordCount: number;        // "um", "uh", "like"

  // Emotional indicators
  nervousnessIndicators: number;  // 0-100
  confidenceIndicators: number;   // 0-100

  // Frame correlation
  frameImpact: string;            // AI interpretation
}

// Analysis functions
export const analyzeAudioSegment = async (
  audioBuffer: AudioBuffer,
  startTime: number,
  endTime: number
): Promise<TonalityMetrics> => { ... }

export const detectTonalityShift = (
  before: TonalityMetrics,
  after: TonalityMetrics
): TonalityShift | null => { ... }
```

### 5.2 Tonality Indicators in UI

Display tonality insights alongside frame analysis:

```
┌────────────────────────────────────────┐
│ TONALITY ANALYSIS                      │
│ ────────────────────────────────────── │
│                                        │
│ Pitch       ████████░░  78/100         │
│             Stable, authoritative      │
│                                        │
│ Pace        ██████░░░░  62/100         │
│             ⚠️ Rushed during close     │
│                                        │
│ Energy      █████████░  91/100         │
│             Strong throughout          │
│                                        │
│ Clarity     ███████░░░  71/100         │
│             5 filler words detected    │
│                                        │
│ ────────────────────────────────────── │
│ 📊 TONALITY TIMELINE                   │
│ [Normal][Normal][↓Drop][↑Rise][Normal] │
│  0:00    2:00    4:00   6:00   8:00   │
└────────────────────────────────────────┘
```

---

## Feature 6: Frame Doctrines Integration

### 6.1 Doctrine Reference System

The AI must analyze against these core frame principles:

```typescript
const FRAME_DOCTRINES = {
  // Core Frame Laws
  'frame_control': {
    name: 'Frame Control',
    description: 'The person who controls the frame controls the interaction',
    indicators: {
      positive: ['redirecting conversation', 'setting terms', 'leading questions'],
      negative: ['defensive responses', 'over-explaining', 'seeking approval']
    }
  },

  'validation_trap': {
    name: 'Validation Trap',
    description: 'Seeking external validation surrenders frame',
    indicators: {
      positive: ['self-assured statements', 'outcome independence'],
      negative: ['asking "does that make sense?"', 'excessive agreement', 'justifying']
    }
  },

  'silence_power': {
    name: 'Power of Silence',
    description: 'First to speak after silence loses frame',
    indicators: {
      positive: ['comfortable pauses', 'letting prospect fill silence'],
      negative: ['rushing to fill gaps', 'nervous chatter']
    }
  },

  'reframe_mastery': {
    name: 'Reframe Mastery',
    description: 'Ability to redirect frame challenges',
    indicators: {
      positive: ['smooth redirects', 'agree and pivot', 'presupposition use'],
      negative: ['direct confrontation', 'defensiveness', 'losing composure']
    }
  },

  'tonality_authority': {
    name: 'Tonality Authority',
    description: 'Voice tone communicates status and certainty',
    indicators: {
      positive: ['downward inflection', 'measured pace', 'grounded pitch'],
      negative: ['upward inflection (seeking)', 'rushed speech', 'pitch rising']
    }
  },

  'outcome_independence': {
    name: 'Outcome Independence',
    description: 'Not being attached to specific outcomes maintains frame',
    indicators: {
      positive: ['abundance mindset language', 'take-it-or-leave-it energy'],
      negative: ['desperation signals', 'over-selling', 'chasing']
    }
  }
};
```

### 6.2 AI Analysis Prompt Template

When analyzing call segments, use this prompt structure:

```typescript
const ANALYSIS_PROMPT = `
You are an expert frame analyst trained in the FrameLord methodology.
Analyze this call segment for frame dynamics.

FRAME DOCTRINES TO APPLY:
${Object.values(FRAME_DOCTRINES).map(d => `- ${d.name}: ${d.description}`).join('\n')}

TRANSCRIPT SEGMENT:
[Speaker: ${speaker}] "${text}"

TONALITY DATA:
- Pitch: ${tonality.pitch} (${tonality.pitchVariance} variance)
- Pace: ${tonality.pace} (${tonality.wordsPerMinute} WPM)
- Energy: ${tonality.energy}

CONTEXT:
- Call type: ${callType}
- Segment position: ${position} (beginning/middle/end)
- Previous frame status: ${previousStatus}

ANALYZE:
1. Frame Status: Is frame being maintained, tested, or lost?
2. Doctrine Application: Which doctrine applies and how?
3. Tonality Impact: How does voice affect frame perception?
4. Prospect Behavior: What is the prospect signaling?
5. Coaching Suggestion: What should the user do differently?

Respond in JSON format:
{
  "frameStatus": "strong|warning|leak",
  "category": "<FrameCategory>",
  "doctrine": "<doctrine_key>",
  "analysis": "<2-3 sentence analysis>",
  "prospectBehavior": "<what prospect is doing>",
  "coachingSuggestion": "<actionable advice>",
  "tonalityNote": "<voice observation if relevant>"
}
`;
```

---

## Feature 7: Notes & CRM Integration

### 7.1 Call Notes Component
```
Location: src/components/lab/CallNotesPanel.tsx
```

Allow users to:
- Add timestamped notes during playback
- Save AI coaching insights to notes
- Export notes to contact dossier
- Tag notes with frame categories

```typescript
interface CallNote {
  id: string;
  callId: string;
  contactId: string;
  timestamp?: number;           // If linked to specific moment
  chunkId?: string;             // If linked to analysis chunk
  content: string;
  source: 'user' | 'ai_coaching' | 'ai_analysis';
  tags: string[];
  createdAt: string;
}
```

### 7.2 Integration with Contact Dossier

Call analysis should appear in the contact's dossier:
- Call history list with frame scores
- Aggregate frame metrics over time
- Coaching insights summary
- Improvement tracking

---

## File Structure

```
src/
├── components/
│   ├── calls/
│   │   ├── CallInterface.tsx         # In-call UI
│   │   ├── CallControls.tsx          # Mute, hold, record buttons
│   │   ├── DialPad.tsx               # Number pad
│   │   ├── SMSThread.tsx             # Text messaging
│   │   ├── SMSComposer.tsx           # Send SMS
│   │   ├── LiveCoachingPanel.tsx     # Real-time AI notes
│   │   └── CallHistoryList.tsx       # Past calls list
│   │
│   ├── lab/
│   │   ├── FrameLordLab.tsx          # Main lab view
│   │   ├── WaveformTimeline.tsx      # Audio waveform
│   │   ├── FrameChunk.tsx            # Analysis segment
│   │   ├── FrameChunkList.tsx        # All segments
│   │   ├── FrameScoreCard.tsx        # Overall score display
│   │   ├── TonalityPanel.tsx         # Voice analysis
│   │   ├── ProspectBehaviorCard.tsx  # Prospect insights
│   │   ├── CoachingChat.tsx          # AI coaching interface
│   │   └── CallNotesPanel.tsx        # Notes management
│   │
│   └── crm/
│       └── CallAnalyzerCard.tsx      # Existing - enhance
│
├── services/
│   ├── callStore.ts                  # Call records CRUD
│   ├── transcriptionService.ts       # Audio → text
│   ├── frameAnalysisService.ts       # AI frame analysis
│   ├── tonalityAnalysisService.ts    # Voice analysis
│   ├── liveCoachingService.ts        # Real-time coaching
│   └── telephonyService.ts           # Twilio/Vonage integration
│
├── lib/
│   ├── audio/
│   │   ├── waveformGenerator.ts      # Canvas waveform
│   │   ├── audioProcessor.ts         # Web Audio API utils
│   │   └── pitchDetector.ts          # Pitch analysis
│   │
│   └── frameLab/
│       ├── doctrines.ts              # Frame doctrine definitions
│       ├── analysisPrompts.ts        # AI prompt templates
│       └── scoringEngine.ts          # Score calculations
│
├── hooks/
│   ├── useAudioPlayer.ts             # Playback controls
│   ├── useAudioRecorder.ts           # Recording (exists)
│   ├── useWaveform.ts                # Waveform rendering
│   ├── useLiveCoaching.ts            # Real-time coaching
│   └── useFrameAnalysis.ts           # Analysis state
│
└── types/
    └── calls.ts                      # All call-related types
```

---

## API Integration Points

### Transcription (Choose one)
```typescript
// Deepgram (recommended for real-time)
const DEEPGRAM_CONFIG = {
  model: 'nova-2',
  language: 'en',
  smart_format: true,
  diarize: true,           // Speaker separation
  punctuate: true,
  utterances: true,
};

// AssemblyAI (good accuracy)
const ASSEMBLYAI_CONFIG = {
  speech_model: 'best',
  speaker_labels: true,
  auto_highlights: true,
};
```

### Frame Analysis (Gemini)
```typescript
const GEMINI_CONFIG = {
  model: 'gemini-1.5-pro',
  temperature: 0.3,        // More consistent analysis
  maxTokens: 2048,
};
```

### Telephony (Twilio)
```typescript
// Use Twilio Client SDK for browser-based calls
import { Device } from '@twilio/voice-sdk';

const device = new Device(token, {
  codecPreferences: ['opus', 'pcmu'],
  enableRingingState: true,
});
```

---

## Scoring Algorithm

### Overall Frame Score Calculation
```typescript
const calculateFrameScore = (analysis: CallFrameAnalysis): number => {
  const weights = {
    tonality: 0.20,
    cadence: 0.15,
    frameControl: 0.35,      // Most important
    clarity: 0.15,
    closing: 0.15,
  };

  let weightedSum = 0;
  for (const [key, weight] of Object.entries(weights)) {
    weightedSum += analysis.scores[key] * weight;
  }

  // Apply chunk-based adjustments
  const leakPenalty = analysis.chunks.filter(c => c.frameStatus === 'leak').length * 3;
  const strongBonus = analysis.chunks.filter(c => c.frameStatus === 'strong').length * 1;

  return Math.max(0, Math.min(100, Math.round(weightedSum - leakPenalty + strongBonus)));
};
```

### Tonality Sub-Score
```typescript
const calculateTonalityScore = (metrics: TonalityMetrics): number => {
  let score = 50; // Base

  // Pitch analysis
  if (metrics.pitchTrend === 'stable') score += 10;
  if (metrics.pitchTrend === 'rising') score -= 15; // Seeking validation

  // Pace analysis
  if (metrics.wordsPerMinute >= 120 && metrics.wordsPerMinute <= 160) score += 10;
  if (metrics.wordsPerMinute > 180) score -= 10; // Too fast
  if (metrics.wordsPerMinute < 100) score -= 5;  // Too slow

  // Energy
  if (metrics.energyLevel === 'high') score += 10;
  if (metrics.energyLevel === 'low') score -= 15;
  if (metrics.energyTrend === 'decreasing') score -= 10;

  // Clarity
  score += (metrics.articulationScore - 50) * 0.3;
  score -= metrics.fillerWordCount * 2;

  // Confidence indicators
  score += (metrics.confidenceIndicators - 50) * 0.4;
  score -= (metrics.nervousnessIndicators - 30) * 0.3;

  return Math.max(0, Math.min(100, Math.round(score)));
};
```

---

## Testing Checklist

Before integration, verify:

- [ ] Call interface renders correctly in dark theme
- [ ] Recording works and saves to store
- [ ] Waveform displays and is interactive
- [ ] Transcription completes within reasonable time
- [ ] Frame analysis chunks are generated
- [ ] Color coding matches frame status
- [ ] Click-to-seek works on waveform
- [ ] Coaching chat responds contextually
- [ ] Notes save and persist
- [ ] Live coaching shows notes in real-time
- [ ] Tonality metrics display correctly
- [ ] Frame score calculates accurately
- [ ] All components use correct styling
- [ ] Mobile responsive (if applicable)

---

## Summary

Build FrameLord Lab as a comprehensive call intelligence system that:

1. **Enables telephony** — Make/receive calls and texts in-app
2. **Records everything** — Capture audio for analysis
3. **Transcribes accurately** — Real-time and post-call transcription
4. **Analyzes frame** — AI-powered doctrine-based analysis
5. **Visualizes insights** — Color-coded waveform timeline
6. **Coaches in real-time** — Live AI notes during calls
7. **Measures tonality** — Voice pitch, pace, energy analysis
8. **Enables learning** — Per-chunk coaching conversations
9. **Integrates with CRM** — All data ties to contacts
10. **Scores performance** — Quantified frame metrics

The goal: Turn every call into a frame training session with AI as the coach.

---

*Generated for FrameLord CRM — The Private Intel Machine*
