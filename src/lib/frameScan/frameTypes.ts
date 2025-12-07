// =============================================================================
// FRAME SCAN TYPES — Core type definitions for the FrameScan engine
// =============================================================================
// These types encode the FrameLord doctrine: Apex vs Slave frame analysis,
// Win/Win integrity model, and the 9-axis evaluation system.
// =============================================================================

/**
 * All frame axis identifiers from the FrameScan spec.
 * Each axis measures a different dimension of frame positioning.
 */
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

/**
 * The four Win/Win states from FrameLord doctrine.
 * Apex operation aims for win_win as the structural default.
 */
export type FrameWinWinState = "win_win" | "win_lose" | "lose_lose" | "neutral";

/**
 * Band classification for each axis score.
 * Maps the -3 to +3 scale into named positions.
 */
export type FrameBand =
  | "strong_slave"
  | "mild_slave"
  | "neutral"
  | "mild_apex"
  | "strong_apex";

/**
 * Text scan domain identifiers.
 * Each domain has different priority axes for scoring.
 */
export type FrameTextDomainId =
  | "generic"
  | "sales_email"
  | "dating_message"
  | "leadership_update"
  | "social_post";

/**
 * Image scan domain identifiers.
 * Visual analysis uses different priority axes per domain.
 */
export type FrameImageDomainId =
  | "profile_photo"
  | "team_photo"
  | "landing_page_hero"
  | "social_post_image";

/**
 * Combined domain identifier for both text and image scans.
 */
export type FrameDomainId = FrameTextDomainId | FrameImageDomainId;

/**
 * Individual axis score with band classification and notes.
 * The score ranges from -3 (strong slave) to +3 (strong apex).
 */
export interface FrameAxisScore {
  /** The axis being scored */
  axisId: FrameAxisId;
  /** Numeric score from -3 to +3 */
  score: number;
  /** Band classification derived from score */
  band: FrameBand;
  /** Short explanation referencing specific text or visual details */
  notes: string;
}

/**
 * Diagnostic patterns identified in the scan.
 * Provides high-level labels and supporting evidence.
 */
export interface FrameScanDiagnostics {
  /** Labels for the strongest patterns (e.g., "chronic pedestalization", "seller posture") */
  primaryPatterns: string[];
  /** Short snippets or descriptions that demonstrate each pattern */
  supportingEvidence: string[];
}

/**
 * A correction shift recommended for a specific axis.
 * Contains the structural change needed and concrete steps.
 */
export interface FrameCorrectionShift {
  /** The axis that needs correction */
  axisId: FrameAxisId;
  /** Description of the structural change needed */
  shift: string;
  /** Concrete behavioral or wording changes */
  protocolSteps: string[];
}

/**
 * A sample rewrite showing Apex version of content.
 * Used for text scans to provide concrete examples.
 */
export interface FrameSampleRewrite {
  /** What this rewrite is for (e.g., "subject line", "opening paragraph") */
  purpose: string;
  /** The rewritten text reflecting Apex Frame and Win/Win */
  apexVersion: string;
}

/**
 * Complete result from a frame scan (text or image).
 * This is what the LLM analysis layer produces.
 */
export interface FrameScanResult {
  /** Whether this is a text or image scan */
  modality: "text" | "image";
  /** The domain context for this scan */
  domain: FrameDomainId;
  /** Overall frame classification */
  overallFrame: "apex" | "slave" | "mixed";
  /** Overall Win/Win state assessment */
  overallWinWinState: FrameWinWinState;
  /** Individual axis scores */
  axes: FrameAxisScore[];
  /** Diagnostic patterns and evidence */
  diagnostics: FrameScanDiagnostics;
  /** Recommended corrections */
  corrections: {
    /** Top priority shifts to make */
    topShifts: FrameCorrectionShift[];
    /** Sample rewrites (present for text, usually empty for images) */
    sampleRewrites?: FrameSampleRewrite[];
  };
}

/**
 * Weighted axis score for the final calculation.
 * Shows the normalized score and weight used.
 */
export interface WeightedAxisScore {
  /** The axis being weighted */
  axisId: FrameAxisId;
  /** Normalized score from 0 to 100 */
  normalizedScore: number;
  /** Weight applied (1 for base, 2 for priority axes) */
  weight: number;
}

/**
 * Final aggregate frame score with full breakdown.
 * This is the output of the scoring algorithm.
 */
export interface FrameScore {
  /** Overall frame score from 0 to 100 */
  frameScore: number;
  /** Overall frame classification */
  overallFrame: "apex" | "slave" | "mixed";
  /** Overall Win/Win state */
  overallWinWinState: FrameWinWinState;
  /** Domain context used for scoring */
  domain: FrameDomainId;
  /** Raw axis scores from the scan */
  axisScores: FrameAxisScore[];
  /** Weighted and normalized axis scores used in calculation */
  weightedAxisScores: WeightedAxisScore[];
  /** Summary notes about the scoring */
  notes: string[];
}

// =============================================================================
// IMAGE ANNOTATION TYPES
// =============================================================================

/**
 * Severity level for image annotations.
 * Used for visual callouts on the image.
 */
export type FrameAnnotationSeverity = "info" | "warning" | "critical";

/**
 * A structured annotation for an image region.
 * Used for on-image callouts showing frame issues or observations.
 */
export interface FrameImageAnnotation {
  /** Stable unique ID for React lists */
  id: string;
  /** Short label, e.g., "Upward angle", "Facial tension", "Dependency posture" */
  label: string;
  /** One or two sentence explanation of the observation */
  description: string;
  /** Severity level for visual styling */
  severity: FrameAnnotationSeverity;
  /** Normalized X coordinate (0 to 1) within the image */
  x: number;
  /** Normalized Y coordinate (0 to 1) within the image */
  y: number;
  /** Normalized width (0 to 1) of the annotation region */
  width: number;
  /** Normalized height (0 to 1) of the annotation region */
  height: number;
}

/**
 * Complete result from an image FrameScan.
 * Bundles the 0-100 score with structured annotations for UI rendering.
 */
export interface FrameImageScanResult {
  /** The 0-100 frame score with full breakdown */
  score: FrameScore;
  /** Structured annotations for on-image callouts */
  annotations: FrameImageAnnotation[];
  /** Optional URL to annotated image with overlays (from NanoBanana or other service) */
  annotatedImageUrl?: string;
}

// =============================================================================
// TYPE GUARDS AND UTILITIES
// =============================================================================

/** All valid axis IDs for runtime validation */
export const FRAME_AXIS_IDS: readonly FrameAxisId[] = [
  "assumptive_state",
  "buyer_seller_position",
  "identity_vs_tactic",
  "internal_sale",
  "win_win_integrity",
  "persuasion_style",
  "pedestalization",
  "self_trust_vs_permission",
  "field_strength",
] as const;

/** All valid text domain IDs */
export const FRAME_TEXT_DOMAIN_IDS: readonly FrameTextDomainId[] = [
  "generic",
  "sales_email",
  "dating_message",
  "leadership_update",
  "social_post",
] as const;

/** All valid image domain IDs */
export const FRAME_IMAGE_DOMAIN_IDS: readonly FrameImageDomainId[] = [
  "profile_photo",
  "team_photo",
  "landing_page_hero",
  "social_post_image",
] as const;

/** All valid Win/Win states */
export const FRAME_WIN_WIN_STATES: readonly FrameWinWinState[] = [
  "win_win",
  "win_lose",
  "lose_lose",
  "neutral",
] as const;

/** All valid band classifications */
export const FRAME_BANDS: readonly FrameBand[] = [
  "strong_slave",
  "mild_slave",
  "neutral",
  "mild_apex",
  "strong_apex",
] as const;

/**
 * Type guard to check if a string is a valid FrameAxisId
 */
export function isFrameAxisId(value: string): value is FrameAxisId {
  return FRAME_AXIS_IDS.includes(value as FrameAxisId);
}

/**
 * Type guard to check if a string is a valid text domain ID
 */
export function isFrameTextDomainId(value: string): value is FrameTextDomainId {
  return FRAME_TEXT_DOMAIN_IDS.includes(value as FrameTextDomainId);
}

/**
 * Type guard to check if a string is a valid image domain ID
 */
export function isFrameImageDomainId(value: string): value is FrameImageDomainId {
  return FRAME_IMAGE_DOMAIN_IDS.includes(value as FrameImageDomainId);
}

/**
 * Type guard to check if a string is a valid domain ID (text or image)
 */
export function isFrameDomainId(value: string): value is FrameDomainId {
  return isFrameTextDomainId(value) || isFrameImageDomainId(value);
}

/**
 * Convert a numeric score (-3 to +3) to a band classification
 */
export function scoreToBand(score: number): FrameBand {
  if (score <= -2) return "strong_slave";
  if (score <= -0.5) return "mild_slave";
  if (score <= 0.5) return "neutral";
  if (score <= 2) return "mild_apex";
  return "strong_apex";
}

