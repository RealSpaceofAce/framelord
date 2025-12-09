// =============================================================================
// LANDING PAGE SCAN ADAPTER
// Adapts core FrameScan engine to the landing page Scanner.tsx UI format
// =============================================================================
// The landing page Scanner uses the legacy FrameAnalysisResult interface.
// This adapter calls the core FrameScan engine and maps results to that format.
//
// Scan Tiers:
// - Text scans: Always free (unlimited)
// - Image scans (basic): Free basic analysis
// - Image scans (detailed): Requires credits, includes annotations
// =============================================================================

import { runTextFrameScan, runImageFrameScan, type TextDomainId, type ImageDomainId } from "./frameScanLLM";
import type { FrameAnalysisResult } from "../../types";
import type { FrameScore, FrameScanResult, FrameAxisId } from "./frameTypes";
import { getLatestReport } from "../../services/frameScanReportStore";
import {
  type ScanTier,
  hasCreditsFor,
  useCreditsForScan,
  getAvailableCredits,
  getCostForTier,
} from "../../services/creditStore";

/**
 * Map from 9-axis system to legacy 8-subscore UI format.
 * The landing page expects these specific subscores.
 */
const AXIS_TO_SUBSCORE_MAP: Record<FrameAxisId, keyof FrameAnalysisResult['subscores']> = {
  assumptive_state: 'authority',
  buyer_seller_position: 'sales_strength',
  identity_vs_tactic: 'brand_congruence',
  internal_sale: 'magnetism',
  win_win_integrity: 'boundaries',
  persuasion_style: 'energy',
  pedestalization: 'emotional_tone',
  self_trust_vs_permission: 'clarity',
  field_strength: 'authority', // Secondary mapping to authority
};

/**
 * Convert axis score (-3 to +3) to subscore (0-100).
 */
function axisScoreToSubscore(score: number): number {
  // -3 → 0, 0 → 50, +3 → 100
  return Math.round(((score + 3) / 6) * 100);
}

/**
 * Build legacy FrameAnalysisResult from core engine results.
 */
function buildLegacyResult(
  rawResult: FrameScanResult,
  score: FrameScore
): FrameAnalysisResult {
  // Build subscores from axis scores
  const subscores: FrameAnalysisResult['subscores'] = {
    authority: 50,
    magnetism: 50,
    boundaries: 50,
    energy: 50,
    clarity: 50,
    emotional_tone: 50,
    brand_congruence: 50,
    sales_strength: 50,
  };

  // Map axis scores to subscores
  for (const axisScore of score.axisScores) {
    const subscoreKey = AXIS_TO_SUBSCORE_MAP[axisScore.axisId];
    if (subscoreKey) {
      subscores[subscoreKey] = axisScoreToSubscore(axisScore.score);
    }
  }

  // Build critical signal from diagnostics
  // Note: rawResult is already normalized by frameScanLLM, so all arrays are guaranteed to exist
  const primaryPatterns = rawResult.diagnostics.primaryPatterns;
  const supportingEvidence = rawResult.diagnostics.supportingEvidence;

  const criticalSignal = {
    title: primaryPatterns[0] || "Frame Pattern Detected",
    description: supportingEvidence.slice(0, 2).join(" ") ||
      "Analysis complete. Review corrections below.",
    quotes: supportingEvidence.slice(0, 3),
  };

  // Build corrections from topShifts
  const topShifts = rawResult.corrections.topShifts;
  const corrections = topShifts
    .slice(0, 5)
    .map(shift => shift.shift);

  // Add sample rewrites as corrections if available
  const sampleRewrites = rawResult.corrections.sampleRewrites;
  if (sampleRewrites.length > 0) {
    const rewriteCorrections = sampleRewrites
      .slice(0, 2)
      .map(r => `${r.purpose}: "${r.apexVersion.slice(0, 100)}..."`);
    corrections.push(...rewriteCorrections);
  }

  return {
    score: score.frameScore,
    developing_frame: score.overallFrame === 'mixed',
    subscores,
    critical_signal: criticalSignal,
    corrections: corrections.slice(0, 5),
  };
}

/**
 * Run a text scan from the landing page.
 * Uses the core FrameScan engine and maps to legacy result format.
 */
export async function runLandingTextScan(text: string): Promise<FrameAnalysisResult> {
  // Determine domain based on content hints
  let domain: TextDomainId = 'generic';
  const lowerText = text.toLowerCase();

  if (lowerText.includes('sales') || lowerText.includes('price') || lowerText.includes('offer')) {
    domain = 'sales_email';
  } else if (lowerText.includes('date') || lowerText.includes('meet up') || lowerText.includes('coffee')) {
    domain = 'dating_message';
  } else if (lowerText.includes('team') || lowerText.includes('project') || lowerText.includes('update')) {
    domain = 'leadership_update';
  }

  const frameScore = await runTextFrameScan({
    domain,
    content: text,
    subjectLabel: 'Landing page scan',
  });

  // Get the raw result from the latest report
  const latestReport = getLatestReport();
  if (!latestReport?.rawResult) {
    throw new Error("No raw result available from scan");
  }

  return buildLegacyResult(latestReport.rawResult, frameScore);
}

/**
 * Run an image scan from the landing page.
 * Uses the core FrameScan engine and maps to legacy result format.
 */
export async function runLandingImageScan(
  imageBase64: string,
  mimeType: string,
  context?: string
): Promise<FrameAnalysisResult> {
  // For landing page image scans, we need to use the imageIdOrUrl
  // Since we have base64, we need to handle this differently
  // The core engine uses Nano Banana which expects a URL

  // For now, create a data URL that can be used
  const dataUrl = `data:${mimeType};base64,${imageBase64}`;

  // Determine domain based on context
  let domain: ImageDomainId = 'profile_photo';
  const lowerContext = (context || '').toLowerCase();

  if (lowerContext.includes('team')) {
    domain = 'team_photo';
  } else if (lowerContext.includes('landing') || lowerContext.includes('hero')) {
    domain = 'landing_page_hero';
  } else if (lowerContext.includes('social') || lowerContext.includes('post')) {
    domain = 'social_post_image';
  }

  const imageResult = await runImageFrameScan({
    domain,
    imageIdOrUrl: dataUrl,
    description: context,
    subjectLabel: 'Landing page image scan',
  });

  // Get the raw result from the latest report
  const latestReport = getLatestReport();
  if (!latestReport?.rawResult) {
    throw new Error("No raw result available from scan");
  }

  return buildLegacyResult(latestReport.rawResult, imageResult.score);
}

/**
 * Check if user can perform a detailed image scan.
 */
export function canRunDetailedScan(): boolean {
  return hasCreditsFor('detailed');
}

/**
 * Get current credit balance for display.
 */
export function getCurrentCredits(): number {
  return getAvailableCredits();
}

/**
 * Get cost for detailed scan.
 */
export function getDetailedScanCost(): number {
  return getCostForTier('detailed');
}

/**
 * Result from tier-aware image scan with tier info.
 */
export interface TieredImageScanResult extends FrameAnalysisResult {
  /** Which tier was used for this scan */
  tier: ScanTier;
  /** Credits remaining after scan */
  creditsRemaining: number;
  /** Whether this was upgraded from basic */
  wasUpgraded?: boolean;
}

/**
 * Run an image scan with tier selection.
 * Basic tier: Free, limited analysis
 * Detailed tier: Requires credits, full annotations
 */
export async function runTieredImageScan(
  imageBase64: string,
  mimeType: string,
  context?: string,
  requestedTier: ScanTier = 'basic'
): Promise<TieredImageScanResult> {
  const tier = requestedTier;

  // Check credits for detailed tier
  if (tier === 'detailed' && !hasCreditsFor('detailed')) {
    throw new Error('INSUFFICIENT_CREDITS');
  }

  // Deduct credits before scan for detailed tier
  if (tier === 'detailed') {
    const success = useCreditsForScan('detailed');
    if (!success) {
      throw new Error('CREDIT_DEDUCTION_FAILED');
    }
  }

  try {
    const result = await runLandingImageScan(imageBase64, mimeType, context);

    return {
      ...result,
      tier,
      creditsRemaining: getAvailableCredits(),
    };
  } catch (error) {
    // Refund credits on failure for detailed tier
    if (tier === 'detailed') {
      const { refundCredits } = await import("../../services/creditStore");
      refundCredits(getCostForTier('detailed'), 'Scan failed - automatic refund');
    }
    throw error;
  }
}

/**
 * Unified scan function for the landing page Scanner.tsx.
 * Replaces the legacy geminiService.analyzeFrame function.
 *
 * @param text - Text to analyze, or context for image
 * @param imageBase64 - Optional base64 image data
 * @param mimeType - Optional image MIME type
 * @param tier - Optional scan tier for images (default: 'basic')
 */
export async function analyzeLandingFrame(
  text: string,
  imageBase64?: string,
  mimeType?: string,
  tier?: ScanTier
): Promise<FrameAnalysisResult> {
  if (imageBase64 && mimeType) {
    // Use tiered image scan if tier specified
    if (tier) {
      return runTieredImageScan(imageBase64, mimeType, text, tier);
    }
    // Default to basic tier
    return runLandingImageScan(imageBase64, mimeType, text);
  }
  return runLandingTextScan(text);
}
