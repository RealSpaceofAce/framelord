// =============================================================================
// FRAME SCAN PUBLIC API — Clean exports for the FrameScan engine
// =============================================================================
// Import everything you need from this single entry point:
//
//   import {
//     runFrameScan,
//     scoreFrameScan,
//     frameScanSpec,
//     FrameScore,
//     FrameScanResult,
//     LLMClient,
//     // ... other types
//   } from '@/lib/frameScan';
//
// =============================================================================

// Export all types
export * from "./frameTypes";

// Export scoring functions
export {
  scoreFrameScan,
  normalizeAxisScoreTo100,
  computeAxisWeights,
  applyWinWinAdjustment,
  deriveOverallFrameLabel,
  summarizeFrameScore,
  getFrameScoreSeverity,
  getWeakestAxes,
  getStrongestAxes,
} from "./frameScoring";

// Export spec and helpers
export {
  frameScanSpec,
  getAxisDefinition,
  getAllAxisDefinitions,
  getTextDomainDefinition,
  getImageDomainDefinition,
  getDomainPriorityAxes,
  getTextDetectionRules,
  getImageDetectionRules,
  type FrameScanSpec,
} from "./frameSpec";

// Export LLM integration
export {
  // New provider-aware functions
  runTextFrameScan,
  runImageFrameScan,
  // Legacy functions (deprecated but kept for compatibility)
  runFrameScan,
  callLLMForFrameScanResult,
  // Types
  type LLMClient,
  type FrameScanRequestPayload,
  type TextFrameScanInput,
  type ImageFrameScanInput,
  type TextDomainId,
  type ImageDomainId,
} from "./frameScanLLM";

// Export throttling
export {
  enforceThrottle,
  canRunAnotherScan,
  getScanCount,
  getRemainingScanCount,
  getThrottleConfig,
  getSessionStats,
  incrementScanCount,
  resetThrottle,
  type FrameThrottleConfig,
} from "./frameThrottle";

// Export frame profile computation
export {
  computeCumulativeFrameProfileForContact,
  computeFrameProfileTrend,
  getFrameScoreLabel,
  getFrameScoreColorClass,
  getFrameScoreBgClass,
  formatProfileDate,
  type CumulativeFrameProfile,
  type FrameProfileTrend,
} from "./frameProfile";

// Export UI report types and builder
export {
  buildFrameScanUIReport,
  buildFrameScanUIReportSafe,
  buildFallbackUIReport,
  type FrameScanUIHeader,
  type FrameScanUICorrection,
  type FrameScanUISection,
  type FrameScanUIReport,
  type FrameReportUIBuildContext,
} from "./frameReportUI";

// Export contact context types
export {
  type ContactContextSummary,
  type ContactContextSnapshot,
} from "./contactContext";

// Export Framelord assistant
export {
  runFramelordForContact,
  createInitialFramelordMessage,
  getContactDisplayName,
  type FramelordRole,
  type FramelordMessage,
  type FramelordResponse,
} from "./framelordAssistant";

// Export public scan gating
export {
  hasUsedPublicScan,
  markPublicScanUsed,
  resetPublicScanFlag,
} from "./publicScanGate";

// Export note-specific scanning
export {
  scanNoteText,
  extractTextFromBlockSuiteDoc,
} from "./noteTextScan";

export {
  scanNoteCanvas,
  scanNoteCanvasImage,
  captureCanvasSnapshot,
  extractTextFromCanvas,
} from "./noteCanvasScan";

// Export Want Tracking penalty calculation
export {
  calculateWantTrackingPenalty,
  getWantTrackingPenalty,
  applyWantTrackingPenalty,
  LOOKBACK_DAYS,
  MIN_TRACKED_DAYS_FOR_FULL_PENALTY,
  MAX_TOTAL_PENALTY,
  FAILURE_THRESHOLD,
  type WantTrackingPenaltyBreakdown,
  type MetricPenaltyDetail,
} from "./wantTrackingPenalty";
