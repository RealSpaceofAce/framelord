// =============================================================================
// PSYCHOMETRIC TYPES — Big Five and future personality assessment types
// =============================================================================
// These types support building speculative personality profiles from
// freeform text evidence (notes, voice transcripts, FrameScan outputs).
// =============================================================================

/**
 * Confidence level for psychometric assessments.
 * Reflects how much evidence has been gathered and analyzed.
 */
export type ConfidenceLevel =
  | 'insufficient'  // Not enough data to make any inference
  | 'low'           // Some data, but profile is very speculative
  | 'medium'        // Moderate data, profile is reasonably informed
  | 'high'          // Significant data, profile is fairly reliable
  | 'confirmed';    // Validated through formal assessment or extensive observation

/**
 * Big Five personality scores (OCEAN model).
 * Each dimension is scored 0-1 where 0.5 is neutral/average.
 */
export interface BigFiveScores {
  /** Openness to experience: creativity, curiosity, willingness to try new things */
  openness: number;           // 0 to 1
  /** Conscientiousness: organization, dependability, self-discipline */
  conscientiousness: number;  // 0 to 1
  /** Extraversion: sociability, assertiveness, positive emotionality */
  extraversion: number;       // 0 to 1
  /** Agreeableness: cooperation, trust, empathy */
  agreeableness: number;      // 0 to 1
  /** Neuroticism: emotional instability, anxiety, moodiness */
  neuroticism: number;        // 0 to 1
  /** Overall confidence in this Big Five assessment */
  confidence: ConfidenceLevel;
}

/**
 * MBTI-style personality profile.
 * Infers a 4-letter type (e.g., ENTJ, ISFP) from behavioral evidence.
 */
export interface MbtiProfile {
  /** Primary inferred type (e.g., "ENTJ", "ISFP"), or null when undetermined */
  primaryType: string | null;
  /** Candidate types ordered by likelihood */
  candidateTypes: string[];
  /** Overall confidence in this MBTI assessment */
  confidence: ConfidenceLevel;
}

/**
 * DISC behavioral style type.
 * Single primary type (D, I, S, C) or common blends (DI, ID, SC, CS).
 */
export type DiscType =
  | 'D'   // Dominance: direct, results-oriented, decisive
  | 'I'   // Influence: outgoing, enthusiastic, optimistic
  | 'S'   // Steadiness: patient, reliable, team-oriented
  | 'C'   // Conscientiousness: analytical, systematic, accurate
  | 'DI'  // Blend: dominant-influential
  | 'ID'  // Blend: influential-dominant
  | 'SC'  // Blend: steady-conscientious
  | 'CS'  // Blend: conscientious-steady
  | null; // Undetermined

/**
 * DISC behavioral style profile.
 * Infers a behavioral style from evidence.
 */
export interface DiscProfile {
  /** Primary DISC type, or null when undetermined */
  type: DiscType;
  /** Overall confidence in this DISC assessment */
  confidence: ConfidenceLevel;
}

/**
 * Dark trait overall risk level.
 * Used for behavioral risk assessment, not clinical diagnosis.
 */
export type DarkTraitOverallRisk = 'insufficient' | 'low' | 'medium' | 'high';

/**
 * Dark trait behavioral risk profile.
 * Assesses potential risk signals from behavioral evidence.
 * This is NOT a clinical assessment - it's a speculative behavioral risk indicator.
 */
export interface DarkTraitProfile {
  /** Narcissism signal level (0-1), higher = more signals detected */
  narcissism: number;
  /** Machiavellianism signal level (0-1), higher = more signals detected */
  machiavellianism: number;
  /** Psychopathy signal level (0-1), higher = more signals detected */
  psychopathy: number;
  /** Overall behavioral risk assessment */
  overallRisk: DarkTraitOverallRisk;
  /** Confidence in this risk assessment */
  confidence: ConfidenceLevel;
  /** Short textual notes explaining signals (can be empty) */
  explanationNotes: string[];
}

/**
 * Profile status indicating reliability of the psychometric data.
 */
export type PsychometricProfileStatus =
  | 'insufficient_data'  // Need more evidence to build any profile
  | 'speculative'        // Profile built from limited evidence, treat as hypothesis
  | 'confirmed';         // Profile validated through formal assessment or extensive data

/**
 * Psychometric profile for a contact.
 * Supports Big Five, MBTI, DISC, and dark trait risk assessment.
 */
export interface PsychometricProfile {
  /** Contact this profile belongs to */
  contactId: string;
  /** Big Five (OCEAN) personality scores */
  bigFive: BigFiveScores;
  /** MBTI-style personality profile (optional) */
  mbti?: MbtiProfile;
  /** DISC behavioral style profile (optional) */
  disc?: DiscProfile;
  /** Dark trait behavioral risk profile (optional) */
  darkTraits?: DarkTraitProfile;
  /** When this profile was last updated */
  lastUpdatedAt: string;      // ISO timestamp
  /** Overall status of this profile */
  status: PsychometricProfileStatus;
}

/**
 * Source types for psychometric evidence.
 * Different sources may have different reliability weights.
 */
export type PsychometricSourceType =
  | 'note'           // User's written notes about the contact
  | 'voice_note'     // Transcribed voice notes
  | 'framescan'      // FrameScan analysis output
  | 'assessment';    // Formal psychometric assessment results

/**
 * A single piece of evidence for psychometric inference.
 * Text evidence from various sources that can be analyzed.
 */
export interface PsychometricEvidence {
  /** Unique ID for this evidence entry */
  id: string;
  /** Contact this evidence is about */
  contactId: string;
  /** Where this evidence came from */
  sourceType: PsychometricSourceType;
  /** ID of the source object (note ID, FrameScan report ID, etc.) */
  originId: string;
  /** The raw text content to be analyzed */
  rawText: string;
  /** When this evidence was collected */
  createdAt: string;          // ISO timestamp
}
