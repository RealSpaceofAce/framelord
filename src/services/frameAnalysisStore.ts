// =============================================================================
// FRAME ANALYSIS STORE — Psycholinguistic Pattern Detection and Scoring
// =============================================================================
// Analyzes answers for linguistic patterns and computes frame metrics
// Integrates with existing FrameScan results
// =============================================================================

import {
  Answer,
  AnswerAnalysis,
  DetectorResult,
  AxisContribution,
  IntakeMetrics,
  ActiveFlag,
  FrameAxis,
  FrameFlag,
  FlagSeverity,
  FrameType,
  AnalysisIntegrity,
  DetectorDefinition,
  AxisDefinition,
  FlagDefinition,
  IntakeSession,
} from '../types/businessFrame';

// --- SPEC DATA IMPORT ---
// Import spec directly - if this fails, scoring will short-circuit
import spec from '../../docs/specs/business_frame_spec.json';

interface SpecData {
  axes: AxisDefinition[];
  flags: FlagDefinition[];
  detectors: DetectorDefinition[];
  questions: any[];
}

let specData: SpecData | null = null;

try {
  specData = spec as unknown as SpecData;
} catch (e) {
  console.error('Failed to load business_frame_spec.json:', e);
  specData = null;
}

// --- SPEC DATA ACCESSORS ---

/**
 * Check if spec data loaded successfully
 */
export const isSpecLoaded = (): boolean => {
  return specData !== null && specData.axes.length > 0;
};

/**
 * Get all axis definitions from spec
 */
export const getAxisDefinitions = (): AxisDefinition[] => {
  return specData?.axes || [];
};

/**
 * Get axis definition by ID
 */
export const getAxisDefinition = (axisId: FrameAxis): AxisDefinition | undefined => {
  return getAxisDefinitions().find(a => a.id === axisId);
};

/**
 * Get all flag definitions from spec
 */
export const getFlagDefinitions = (): FlagDefinition[] => {
  return specData?.flags || [];
};

/**
 * Get flag definition by code
 */
export const getFlagDefinition = (flagCode: FrameFlag): FlagDefinition | undefined => {
  return getFlagDefinitions().find(f => f.code === flagCode);
};

/**
 * Get all detector definitions from spec
 */
export const getDetectorDefinitions = (): DetectorDefinition[] => {
  return specData?.detectors || [];
};

/**
 * Get detector definition by ID
 */
export const getDetectorDefinition = (detectorId: string): DetectorDefinition | undefined => {
  return getDetectorDefinitions().find(d => d.id === detectorId);
};

// --- REAL DETECTOR IMPLEMENTATIONS ---

/**
 * Analyze text for locus of control (internal vs external attribution)
 * and linguistic authority (hedges, passive voice)
 * Used for Q1: Failure narrative
 */
function analyzeLocusAndAuthority(text: string): { locus: number; authority: number; flagsTriggered: FrameFlag[] } {
  const flagsTriggered: FrameFlag[] = [];

  // First-person pronouns (indicates internal attribution)
  const firstPerson = (text.match(/\b(I|me|my|I've|I'd|I'm)\b/gi) || []).length;

  // External attribution markers
  const external = (text.match(/\b(they|them|their|the market|the client|clients|it was|luck|timing|economy|circumstances)\b/gi) || []).length;

  // Passive voice patterns (e.g., "was missed", "were lost", "was made")
  const passivePatterns = (text.match(/\b(was|were)\s+\w+(ed|en)\b/gi) || []).length;

  // Hedges and minimizers
  const hedges = (text.match(/\b(just|kind of|sort of|basically|probably|maybe|I think|I hope|I guess|perhaps)\b/gi) || []).length;

  // Tag questions
  const tagQuestions = (text.match(/\b(right\?|isn't it\?|don't you think\?|you know\?)\b/gi) || []).length;

  // Calculate locus score (higher = more internal)
  let locus = 50;
  locus += (firstPerson - external) * 5;  // +5 per net internal reference
  locus -= passivePatterns * 8;            // -8 per passive construction

  // Calculate authority score (higher = more commanding)
  let authority = 50;
  authority -= hedges * 6;                 // -6 per hedge
  authority -= passivePatterns * 4;        // -4 per passive
  authority -= tagQuestions * 8;           // -8 per tag question

  // Trigger flags based on patterns
  if (passivePatterns >= 2 || external > firstPerson + 2) {
    flagsTriggered.push(FrameFlag.AGENCY_WARNING);
  }
  if (external > firstPerson) {
    flagsTriggered.push(FrameFlag.LOCUS_EXTERNAL);
  }
  if (hedges >= 3 || tagQuestions >= 1) {
    flagsTriggered.push(FrameFlag.FRAME_STATUS_BETA);
  }

  return {
    locus: Math.max(0, Math.min(100, locus)),
    authority: Math.max(0, Math.min(100, authority)),
    flagsTriggered
  };
}

/**
 * Analyze text for motivation direction (towards vs away)
 * Used for Q2: 90-day goal
 */
function analyzeMotivationDirection(text: string): { score: number; flagsTriggered: FrameFlag[] } {
  const flagsTriggered: FrameFlag[] = [];
  const textLower = text.toLowerCase();

  // Towards language (goals, growth, accumulation)
  const towards = (textLower.match(/\b(get|achieve|build|create|launch|acquire|grow|expand|win|hit|reach|increase|gain|develop|start|make)\b/g) || []).length;

  // Away language (avoidance, problems, prevention)
  const away = (textLower.match(/\b(stop|avoid|fix|prevent|reduce|eliminate|escape|get rid of|out of|less|don't want|no more|quit|end)\b/g) || []).length;

  let score = 50;
  score += towards * 8;  // +8 per towards word
  score -= away * 8;     // -8 per away word

  return {
    score: Math.max(0, Math.min(100, score)),
    flagsTriggered
  };
}

/**
 * Analyze text for process clarity (structured vs chaotic)
 * Used for Q3: Sales process description
 */
function analyzeProcessClarity(text: string): { score: number; flagsTriggered: FrameFlag[] } {
  const flagsTriggered: FrameFlag[] = [];
  const textLower = text.toLowerCase();

  // Sequential markers (indicates structured thinking)
  const sequential = (textLower.match(/\b(first|second|third|1\.|2\.|3\.|then|next|finally|after|before|step|stage)\b/g) || []).length;

  // Concrete action verbs
  const actionVerbs = (textLower.match(/\b(qualify|demo|close|present|follow up|send|call|schedule|negotiate|sign|deliver)\b/g) || []).length;

  // Conditional/vague language (indicates lack of process)
  const conditional = (textLower.match(/\b(it depends|usually|sometimes|maybe|try|if|might|could|varies)\b/g) || []).length;

  let score = 50;
  score += sequential * 10;   // +10 per sequential marker
  score += actionVerbs * 5;   // +5 per concrete action
  score -= conditional * 8;   // -8 per vague word

  // Trigger flags
  if (conditional >= 3 || (sequential === 0 && actionVerbs < 2)) {
    flagsTriggered.push(FrameFlag.GAP_DETECTED);
  }
  if (textLower.includes('try') || textLower.includes('hope to')) {
    flagsTriggered.push(FrameFlag.COMMITMENT_SOFT);
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    flagsTriggered
  };
}

// --- ANSWER ANALYSIS ---

/**
 * Analyze an answer using question-specific detection logic
 *
 * @param answer - The answer to analyze
 * @returns Analysis results
 */
export const analyzeAnswer = (answer: Answer): AnswerAnalysis => {
  const text = answer.rawText;
  const questionId = answer.questionId;

  // If spec not loaded, return empty analysis
  if (!isSpecLoaded()) {
    return {
      detectorResults: [],
      axisContributions: [],
      flagsTriggered: [],
      confidence: 0,
    };
  }

  const axisContributions: AxisContribution[] = [];
  let flagsTriggered: FrameFlag[] = [];

  // Apply question-specific analysis
  // Note: t1_identity and t1_work_context have no analysis - just stored on contact
  if (questionId === 't1_locus_failure') {
    // Q5: Failure narrative - analyze locus of control and linguistic authority
    const result = analyzeLocusAndAuthority(text);

    axisContributions.push({
      axisId: FrameAxis.LOCUS_OF_CONTROL,
      delta: result.locus - 50,  // Contribution relative to baseline
      source: 'locus_analysis',
    });
    axisContributions.push({
      axisId: FrameAxis.LINGUISTIC_AUTHORITY,
      delta: result.authority - 50,
      source: 'authority_analysis',
    });

    flagsTriggered = [...flagsTriggered, ...result.flagsTriggered];

  } else if (questionId === 't1_motivation_goal') {
    // Q6: 90-day goal - analyze motivation direction
    const result = analyzeMotivationDirection(text);

    axisContributions.push({
      axisId: FrameAxis.MOTIVATION_DIRECTION,
      delta: result.score - 50,
      source: 'motivation_analysis',
    });

    flagsTriggered = [...flagsTriggered, ...result.flagsTriggered];

  } else if (questionId === 't1_process_sales') {
    // Q7: Sales process - analyze process clarity
    const result = analyzeProcessClarity(text);

    axisContributions.push({
      axisId: FrameAxis.PROCESS_CLARITY,
      delta: result.score - 50,
      source: 'process_analysis',
    });

    flagsTriggered = [...flagsTriggered, ...result.flagsTriggered];

  } else if (questionId === 't1_want_discovery_1' || questionId === 't1_want_discovery_2') {
    // Q3-Q4: Want discovery - analyze motivation direction
    const result = analyzeMotivationDirection(text);

    axisContributions.push({
      axisId: FrameAxis.MOTIVATION_DIRECTION,
      delta: result.score - 50,
      source: 'want_analysis',
    });

    flagsTriggered = [...flagsTriggered, ...result.flagsTriggered];

  } else if (questionId === 't1_constraint') {
    // Q8: Constraint - analyze locus of control and operational congruence
    const result = analyzeLocusAndAuthority(text);

    axisContributions.push({
      axisId: FrameAxis.LOCUS_OF_CONTROL,
      delta: result.locus - 50,
      source: 'constraint_analysis',
    });
    axisContributions.push({
      axisId: FrameAxis.OPERATIONAL_CONGRUENCE,
      delta: result.authority - 50,  // Authority score correlates with self-awareness
      source: 'constraint_analysis',
    });

    flagsTriggered = [...flagsTriggered, ...result.flagsTriggered];
  }
  // t1_identity, t1_work_context, t1_closing: No analysis needed (identity/context only)

  // Compute confidence based on text length (more text = higher confidence)
  const wordCount = text.split(/\s+/).length;
  const confidence = Math.min(1.0, wordCount / 50);  // Full confidence at 50+ words

  return {
    detectorResults: [],  // Not using generic detectors for now
    axisContributions,
    flagsTriggered,
    confidence,
  };
};

// --- SESSION METRICS COMPUTATION ---

/**
 * Compute axis scores from all answers in a session
 * @param answers - All answers from the session
 * @returns Record mapping each axis to a score (0-100)
 */
export const computeAxisScores = (answers: Answer[]): Record<FrameAxis, number> => {
  // Initialize all axes at 50 (neutral baseline)
  const scores: Record<FrameAxis, number> = {
    [FrameAxis.LOCUS_OF_CONTROL]: 50,
    [FrameAxis.MOTIVATION_DIRECTION]: 50,
    [FrameAxis.PROCESS_CLARITY]: 50,
    [FrameAxis.LINGUISTIC_AUTHORITY]: 50,
    [FrameAxis.PRICING_CONFIDENCE]: 50,
    [FrameAxis.STATUS_FRAME]: 50,
    [FrameAxis.BOUNDARY_CONTROL]: 50,
    [FrameAxis.OPERATIONAL_CONGRUENCE]: 50,
    [FrameAxis.FRAME_STRENGTH]: 50,
  };

  // If spec not loaded, return baseline scores (will trigger "incomplete" state)
  if (!isSpecLoaded()) {
    // Set to 0 to trigger "analysis incomplete" state
    Object.keys(scores).forEach(key => {
      scores[key as FrameAxis] = 0;
    });
    return scores;
  }

  // Aggregate axis contributions from all analyzed answers
  let hasContributions = false;
  for (const answer of answers) {
    if (!answer.analysis) continue;

    for (const contribution of answer.analysis.axisContributions) {
      hasContributions = true;
      scores[contribution.axisId] = Math.max(
        0,
        Math.min(100, scores[contribution.axisId] + contribution.delta)
      );
    }
  }

  // If no contributions at all, return zeros to trigger "incomplete" state
  if (!hasContributions) {
    Object.keys(scores).forEach(key => {
      scores[key as FrameAxis] = 0;
    });
    return scores;
  }

  // Compute derived scores
  // Status frame is influenced by linguistic authority and locus
  scores[FrameAxis.STATUS_FRAME] = Math.round(
    scores[FrameAxis.LINGUISTIC_AUTHORITY] * 0.6 +
    scores[FrameAxis.LOCUS_OF_CONTROL] * 0.4
  );

  // Operational congruence from process clarity
  scores[FrameAxis.OPERATIONAL_CONGRUENCE] = scores[FrameAxis.PROCESS_CLARITY];

  // Boundary control influenced by authority and locus
  scores[FrameAxis.BOUNDARY_CONTROL] = Math.round(
    scores[FrameAxis.LINGUISTIC_AUTHORITY] * 0.5 +
    scores[FrameAxis.LOCUS_OF_CONTROL] * 0.5
  );

  // Frame strength is weighted average of key axes
  scores[FrameAxis.FRAME_STRENGTH] = Math.round(
    scores[FrameAxis.LOCUS_OF_CONTROL] * 0.25 +
    scores[FrameAxis.LINGUISTIC_AUTHORITY] * 0.30 +
    scores[FrameAxis.STATUS_FRAME] * 0.25 +
    scores[FrameAxis.BOUNDARY_CONTROL] * 0.20
  );

  // Clamp all scores to 0-100
  Object.keys(scores).forEach(key => {
    scores[key as FrameAxis] = Math.max(0, Math.min(100, scores[key as FrameAxis]));
  });

  return scores;
};

/**
 * Compute active flags from all answers in a session
 * @param answers - All answers from the session
 * @returns Array of active flags with evidence
 */
export const computeActiveFlags = (answers: Answer[]): ActiveFlag[] => {
  const flagMap = new Map<FrameFlag, { evidence: string[]; count: number }>();

  // Collect all triggered flags with evidence
  for (const answer of answers) {
    if (!answer.analysis) continue;

    for (const flag of answer.analysis.flagsTriggered) {
      if (!flagMap.has(flag)) {
        flagMap.set(flag, { evidence: [], count: 0 });
      }
      const flagData = flagMap.get(flag)!;
      flagData.evidence.push(answer.id);
      flagData.count++;
    }
  }

  // Build active flags array
  const activeFlags: ActiveFlag[] = [];
  const flagEntries = Array.from(flagMap.entries());

  for (const [flagCode, flagData] of flagEntries) {
    const flagDef = getFlagDefinition(flagCode);
    if (!flagDef) continue;

    // Compute confidence based on how many times flag was triggered
    const confidence = Math.min(1.0, flagData.count / 2);

    activeFlags.push({
      code: flagCode,
      severity: flagDef.severity,
      confidence,
      evidence: flagData.evidence,
    });
  }

  return activeFlags;
};

/**
 * Determine frame type from axis scores
 * @param axisScores - Computed axis scores
 * @returns Frame type classification
 */
export const determineFrameType = (axisScores: Record<FrameAxis, number>): FrameType => {
  const frameStrength = axisScores[FrameAxis.FRAME_STRENGTH];
  const authority = axisScores[FrameAxis.LINGUISTIC_AUTHORITY];

  // Frame type classification per directive:
  // power: frame_strength >= 65 AND linguistic_authority >= 60
  // supplicant: frame_strength < 40 OR linguistic_authority < 40
  // analyst: not power/supplicant AND linguistic_authority >= 50
  // else: mixed

  if (frameStrength >= 65 && authority >= 60) {
    return 'power';
  }
  if (frameStrength < 40 || authority < 40) {
    return 'supplicant';
  }
  if (authority >= 50) {
    return 'analyst';
  }
  return 'mixed';
};

/**
 * Compute overall frame score (0-100)
 * Weighted average of Tier 1 relevant axes
 * @param axisScores - Computed axis scores
 * @returns Overall score (0-100)
 */
const computeOverallScore = (axisScores: Record<FrameAxis, number>): number => {
  // Average of Tier 1 relevant axes
  const tier1Axes = [
    axisScores[FrameAxis.LOCUS_OF_CONTROL],
    axisScores[FrameAxis.MOTIVATION_DIRECTION],
    axisScores[FrameAxis.PROCESS_CLARITY],
    axisScores[FrameAxis.LINGUISTIC_AUTHORITY],
  ];

  return Math.round(tier1Axes.reduce((a, b) => a + b, 0) / tier1Axes.length);
};

/**
 * Compute analysis integrity level based on data quality
 * @param axisScores - Computed axis scores
 * @param answers - Session answers
 * @returns Integrity level
 */
export const computeAnalysisIntegrity = (
  axisScores: Record<FrameAxis, number>,
  answers: Answer[]
): AnalysisIntegrity => {
  if (!isSpecLoaded()) {
    return 'placeholder';
  }

  // Check if we have contributions from answers
  const answersWithAnalysis = answers.filter(a => a.analysis && a.analysis.axisContributions.length > 0);

  // Key axes that should have non-baseline scores for "live" status
  const keyAxes = [
    FrameAxis.LOCUS_OF_CONTROL,
    FrameAxis.MOTIVATION_DIRECTION,
    FrameAxis.PROCESS_CLARITY,
    FrameAxis.LINGUISTIC_AUTHORITY,
  ];

  // Count how many key axes have deviated from baseline (50)
  const activeAxes = keyAxes.filter(axis => axisScores[axis] !== 50 && axisScores[axis] !== 0);

  if (answersWithAnalysis.length === 0 || activeAxes.length === 0) {
    return 'placeholder';
  }

  // If most key axes have real data, it's live; otherwise partial
  if (activeAxes.length >= 3) {
    return 'live';
  }

  return 'partial';
};

/**
 * Extract self-rating score from session answers
 * @param session - The intake session
 * @returns Self-rated score (1-10) or undefined if not provided
 */
export const getSelfRatingFromSession = (session: IntakeSession): number | undefined => {
  const selfRatingAnswer = session.answers.find(a => a.questionId === 't1_self_rating');
  if (!selfRatingAnswer) return undefined;

  // Parse the numeric value from rawText
  const value = parseInt(selfRatingAnswer.rawText, 10);
  if (isNaN(value) || value < 1 || value > 10) return undefined;

  return value;
};

/**
 * Compute complete session metrics from answers
 * @param session - The intake session
 * @returns Computed metrics
 */
export const computeSessionMetrics = (session: IntakeSession): IntakeMetrics => {
  const axisScores = computeAxisScores(session.answers);
  const activeFlags = computeActiveFlags(session.answers);
  const frameType = determineFrameType(axisScores);
  const overallFrameScore = computeOverallScore(axisScores);
  const analysisIntegrity = computeAnalysisIntegrity(axisScores, session.answers);
  const selfRatedFrameScore = getSelfRatingFromSession(session);

  return {
    axisScores,
    activeFlags,
    overallFrameScore,
    frameType,
    analysisIntegrity,
    selfRatedFrameScore,
    computedAt: new Date().toISOString(),
  };
};

// --- INTEGRATION WITH FRAMESCAN ---

/**
 * Merge intake metrics with FrameScan results
 * Combines psycholinguistic intake data with real-time FrameScan scoring
 *
 * @param intakeMetrics - Computed intake metrics
 * @param frameScanScore - FrameScan score (0-100)
 * @returns Merged metrics
 */
export const mergeWithFrameScanResults = (
  intakeMetrics: IntakeMetrics,
  frameScanScore: number
): IntakeMetrics => {
  // Blend overall score with FrameScan score
  // Weight intake 60%, FrameScan 40% (intake is more comprehensive)
  const blendedScore = Math.round(
    intakeMetrics.overallFrameScore * 0.6 + frameScanScore * 0.4
  );

  return {
    ...intakeMetrics,
    overallFrameScore: blendedScore,
  };
};

// --- HELPER FUNCTIONS ---

/**
 * Get severity color for UI display
 * @param severity - Flag severity
 * @returns CSS color class or hex color
 */
export const getSeverityColor = (severity: FlagSeverity): string => {
  switch (severity) {
    case FlagSeverity.CRITICAL:
      return '#ef4444'; // red
    case FlagSeverity.WARN:
      return '#f59e0b'; // amber
    case FlagSeverity.INFO:
      return '#3b82f6'; // blue
    default:
      return '#6b7280'; // gray
  }
};

/**
 * Get human-readable axis score label
 * @param score - The score (0-100)
 * @returns Label string (Low, Developing, Strong)
 */
export const getAxisLabel = (score: number): string => {
  if (score < 35) return 'Low';
  if (score <= 65) return 'Developing';
  return 'Strong';
};

/**
 * Get human-readable axis score interpretation
 * @param axisId - The axis ID
 * @param score - The score (0-100)
 * @returns Interpretation string
 */
export const getAxisInterpretation = (axisId: FrameAxis, score: number): string => {
  // Use generic labels per directive
  return getAxisLabel(score);
};

/**
 * Get coaching recommendation based on active flags
 * @param flags - Active flags
 * @returns Coaching recommendation string
 */
export const getCoachingRecommendation = (flags: ActiveFlag[]): string => {
  const criticalFlags = flags.filter(f => f.severity === FlagSeverity.CRITICAL);

  if (criticalFlags.length > 0) {
    // Focus on most critical issue
    const topFlag = criticalFlags.sort((a, b) => b.confidence - a.confidence)[0];
    const flagDef = getFlagDefinition(topFlag.code);
    return flagDef?.description || 'Critical frame issue detected';
  }

  const warnFlags = flags.filter(f => f.severity === FlagSeverity.WARN);
  if (warnFlags.length > 0) {
    return `${warnFlags.length} warning(s) detected - review frame patterns`;
  }

  return 'Frame patterns within normal range';
};

/**
 * Check if analysis is complete (non-zero scores)
 * @param metrics - The computed metrics
 * @returns true if analysis is valid
 */
export const isAnalysisComplete = (metrics: IntakeMetrics): boolean => {
  return metrics.overallFrameScore > 0 && metrics.axisScores[FrameAxis.FRAME_STRENGTH] > 0;
};
