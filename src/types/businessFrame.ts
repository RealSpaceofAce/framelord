// =============================================================================
// BUSINESS FRAME TYPES — Psycholinguistic Architecture
// =============================================================================
// Data structures for intake assessment, frame analysis, and psychometric scoring
// Generated from business_frame_spec.json
// =============================================================================

// --- ENUMS FROM SPEC ---

/**
 * Frame Axes - Psycholinguistic dimensions scored on 0-100 scale
 */
export enum FrameAxis {
  LOCUS_OF_CONTROL = 'locus_of_control',
  MOTIVATION_DIRECTION = 'motivation_direction',
  PROCESS_CLARITY = 'process_clarity',
  LINGUISTIC_AUTHORITY = 'linguistic_authority',
  PRICING_CONFIDENCE = 'pricing_confidence',
  STATUS_FRAME = 'status_frame',
  BOUNDARY_CONTROL = 'boundary_control',
  OPERATIONAL_CONGRUENCE = 'operational_congruence',
  FRAME_STRENGTH = 'frame_strength',
}

/**
 * Frame Flags - Pattern-triggered alerts for coaching interventions
 */
export enum FrameFlag {
  AGENCY_WARNING = 'AGENCY_WARNING',
  LOCUS_EXTERNAL = 'LOCUS_EXTERNAL',
  FRAME_STATUS_BETA = 'FRAME_STATUS_BETA',
  PRICING_SHAME = 'PRICING_SHAME',
  WEALTH_RESENTMENT = 'WEALTH_RESENTMENT',
  JUSTIFICATION_LOOP = 'JUSTIFICATION_LOOP',
  IMPOSTER_SYNDROME = 'IMPOSTER_SYNDROME',
  SUPPLICANT_FRAME = 'SUPPLICANT_FRAME',
  BOUNDARY_LEAK = 'BOUNDARY_LEAK',
  GAP_DETECTED = 'GAP_DETECTED',
  CALL_RELUCTANCE = 'CALL_RELUCTANCE',
  CONFLICT_AVOIDANCE = 'CONFLICT_AVOIDANCE',
  PASSIVE_AGGRESSION = 'PASSIVE_AGGRESSION',
  DISTORTION_ALERT = 'DISTORTION_ALERT',
  INTEGRITY_CHECK = 'INTEGRITY_CHECK',
  STATIC_FRAME = 'STATIC_FRAME',
  COMMITMENT_SOFT = 'COMMITMENT_SOFT',
}

/**
 * Flag severity levels
 */
export enum FlagSeverity {
  INFO = 'info',
  WARN = 'warn',
  CRITICAL = 'critical',
}

/**
 * Intake tier levels
 */
export enum IntakeTier {
  TIER_1 = 1,
  TIER_2 = 2,
}

/**
 * Tier 2 specialized modules
 */
export enum IntakeModule {
  MONEY = 'money',
  AUTHORITY = 'authority',
  OPERATIONS = 'operations',
}

// --- AXIS DEFINITIONS (FROM SPEC) ---

/**
 * Axis definition with scale and meaning
 */
export interface AxisDefinition {
  id: FrameAxis;
  name: string;
  description: string;
  scaleMin: number;
  scaleMax: number;
  lowMeaning: string;
  highMeaning: string;
  midMeaning?: string;
}

// --- FLAG DEFINITIONS (FROM SPEC) ---

/**
 * Flag definition with triggers and effects
 */
export interface FlagDefinition {
  code: FrameFlag;
  description: string;
  severity: FlagSeverity;
  triggerDetectors: string[];
  affectsAxes: FrameAxis[];
}

// --- QUESTION DEFINITIONS (FROM SPEC) ---

/**
 * Question types for intake flow
 */
export type QuestionType =
  | 'identity'      // Brief identity statement
  | 'context'       // Work/project context
  | 'want'          // Want discovery (outcome focused)
  | 'list'          // List items (lower minLength)
  | 'narrative'     // Story/event walkthrough
  | 'goal'          // Single goal focus
  | 'process'       // Step-by-step process
  | 'constraint'    // Self-identified blocker
  | 'optional'      // Can be skipped
  | 'self_rating';  // Numeric self-assessment (slider)

/**
 * Question definition for intake flow
 */
export interface QuestionDefinition {
  id: string;
  tier: IntakeTier;
  module: IntakeModule | null;
  prompt: string;
  questionType?: QuestionType;    // Type for hint/length logic
  inputType?: 'text' | 'slider';  // Input UI type (default: text)
  minLength?: number;             // Minimum character count
  maxLength?: number;             // Maximum character count
  minValue?: number;              // For slider: minimum value
  maxValue?: number;              // For slider: maximum value
  hint?: string;                  // Helper text shown under input
  optional?: boolean;             // Can be skipped
  storeAs?: string;               // Where to store on Contact (e.g., 'contactProfile.bio')
  targetAxes: FrameAxis[];
  targetFlags: FrameFlag[];
}

// --- DETECTOR DEFINITIONS (FROM SPEC) ---

/**
 * Detector effect on axis or flag
 */
export interface DetectorEffect {
  type: 'axis' | 'flag';
  axisId?: FrameAxis;
  direction?: 'up' | 'down';
  weight?: number;
  flagCode?: FrameFlag;
  condition?: string;
}

/**
 * Detector definition for pattern matching
 */
export interface DetectorDefinition {
  id: string;
  name: string;
  description: string;
  patternHints: string[];
  effects: DetectorEffect[];
}

// --- RUNTIME ENTITIES (ATTACH TO CONTACT SPINE) ---

/**
 * Intake session status
 */
export type IntakeSessionStatus = 'in_progress' | 'completed' | 'abandoned';

/**
 * Frame type classification
 */
export type FrameType = 'power' | 'analyst' | 'supplicant' | 'mixed';

/**
 * Intake session - attached to a contact
 * Contact Zero has their own intake session
 * Other contacts can have intake sessions for prospect evaluation
 */
export interface IntakeSession {
  id: string;
  tenantId: string;
  contactId: string;              // Links to Contact Spine
  tier: IntakeTier;
  status: IntakeSessionStatus;
  startedAt: string;              // ISO timestamp
  completedAt?: string;           // ISO timestamp
  answers: Answer[];
  metrics?: IntakeMetrics;
  createdAt: string;              // ISO timestamp
  updatedAt: string;              // ISO timestamp
}

/**
 * Input type for intake questions
 */
export type AnswerInputType = 'textarea' | 'slider' | 'list' | 'identity' | 'goal';

/**
 * Individual answer to a question
 */
export interface Answer {
  id: string;
  sessionId: string;
  questionId: string;
  questionText: string;           // Full question prompt for display
  inputType: AnswerInputType;     // Type of input used
  rawText: string;                // Raw value (text, slider value as string, etc.)
  analysis?: AnswerAnalysis;
  answeredAt: string;             // ISO timestamp
}

/**
 * Analysis results for an answer
 */
export interface AnswerAnalysis {
  detectorResults: DetectorResult[];
  axisContributions: AxisContribution[];
  flagsTriggered: FrameFlag[];
  confidence: number;             // 0-1
}

/**
 * Detector result for a single detector
 */
export interface DetectorResult {
  detectorId: string;
  matched: boolean;
  matchCount?: number;
  matchedPatterns?: string[];
}

/**
 * Axis contribution from a detector
 */
export interface AxisContribution {
  axisId: FrameAxis;
  delta: number;                  // Can be positive or negative
  source: string;                 // Which detector contributed
}

/**
 * Analysis integrity level
 */
export type AnalysisIntegrity = 'live' | 'partial' | 'placeholder';

/**
 * Aggregated metrics for a session
 */
export interface IntakeMetrics {
  axisScores: Record<FrameAxis, number>;
  activeFlags: ActiveFlag[];
  overallFrameScore: number;      // 0-100
  frameType: FrameType;
  analysisIntegrity: AnalysisIntegrity;  // Indicates data quality
  selfRatedFrameScore?: number;   // 1-10 self-assessment (Apex gauge)
  computedAt: string;             // ISO timestamp
}

/**
 * Active flag with evidence
 */
export interface ActiveFlag {
  code: FrameFlag;
  severity: FlagSeverity;
  confidence: number;             // 0-1
  evidence: string[];             // Answer IDs that triggered it
}

// --- STORE ACTION TYPES ---

/**
 * Intake store actions
 */
export type IntakeAction =
  | { type: 'START_SESSION'; contactId: string; tier: IntakeTier }
  | { type: 'RECORD_ANSWER'; sessionId: string; questionId: string; rawText: string }
  | { type: 'ANALYZE_ANSWER'; answerId: string }
  | { type: 'COMPLETE_SESSION'; sessionId: string }
  | { type: 'ABANDON_SESSION'; sessionId: string }
  | { type: 'COMPUTE_METRICS'; sessionId: string };
