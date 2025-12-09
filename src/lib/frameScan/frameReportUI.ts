// =============================================================================
// FRAME REPORT UI — UI schema types and builder for FrameScan report rendering
// =============================================================================
// This module defines a fixed UI schema for how FrameScan reports are rendered.
// The LLM outputs content that fits this schema, and the UI renders it.
// Layout is defined by us, not by the model.
// =============================================================================

import type { FrameScanResult, FrameScore } from "./frameTypes";
import { callOpenAIChat, type LlmMessage } from "../llm/openaiClient";

// =============================================================================
// UI SCHEMA TYPES
// =============================================================================

/**
 * Header section of a FrameScan UI report.
 */
export interface FrameScanUIHeader {
  /** Main title for the report */
  title: string;
  /** One-line summary verdict */
  oneLineVerdict: string;
  /** The 0-100 frame score */
  highlightScore: number;
  /** 1-4 short badge tags (e.g., "win_win", "soft boundaries") */
  badges: string[];
}

/**
 * A single correction item with actionable guidance.
 */
export interface FrameScanUICorrection {
  /** Short label for the correction */
  label: string;
  /** Description of what needs to change */
  description: string;
  /** Concrete action to take */
  suggestedAction: string;
}

/**
 * A section of the report (summary, strengths, weaknesses, etc.).
 */
export interface FrameScanUISection {
  /** Section identifier */
  id: "summary" | "strengths" | "weaknesses" | "corrections" | string;
  /** Section title for display */
  title: string;
  /** Optional main paragraph text */
  mainParagraph?: string;
  /** Optional bullet points */
  bullets?: string[];
  /** Optional list of corrections (for corrections section) */
  corrections?: FrameScanUICorrection[];
}

/**
 * Complete UI-ready report structure.
 */
export interface FrameScanUIReport {
  /** Header with title, verdict, score, and badges */
  header: FrameScanUIHeader;
  /** Ordered list of sections to render */
  sections: FrameScanUISection[];
}

// =============================================================================
// BUILDER CONTEXT
// =============================================================================

/**
 * Context needed to build a UI report.
 */
export interface FrameReportUIBuildContext {
  /** Whether this was a text or image scan */
  modality: "text" | "image" | "mixed";
  /** The domain context (e.g., "sales_email", "profile_photo") */
  domain: string;
  /** Human-readable subject label (e.g., "Sales email to John", "LinkedIn profile photo") */
  subjectLabel: string;
}

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

const UI_BUILDER_SYSTEM_PROMPT = `You are FrameLord, an analyst that converts structured frame scan results into a UI-ready summary.

You MUST output a single JSON object matching this TypeScript shape:

interface FrameScanUIHeader {
  title: string;
  oneLineVerdict: string;
  highlightScore: number; // 0-100
  badges: string[];
}

interface FrameScanUICorrection {
  label: string;
  description: string;
  suggestedAction: string;
}

interface FrameScanUISection {
  id: "summary" | "strengths" | "weaknesses" | "corrections" | string;
  title: string;
  mainParagraph?: string;
  bullets?: string[];
  corrections?: FrameScanUICorrection[];
}

interface FrameScanUIReport {
  header: FrameScanUIHeader;
  sections: FrameScanUISection[];
}

Rules:
- highlightScore MUST equal the numeric frameScore provided.
- sections MUST include at least these ids: "summary", "strengths", "weaknesses", "corrections".
- Use short, concrete language, grounded in the axes and diagnostics.
- Badges should be 1-4 short tags that describe the frame (e.g. "win_win", "soft boundaries", "strong authority").
- Do not include any extra fields.
- Output ONLY the JSON object, no markdown, no explanation.`;

// =============================================================================
// BUILDER FUNCTION
// =============================================================================

/**
 * Build a UI-ready report from raw FrameScan results.
 * 
 * @param raw - The raw FrameScanResult from the LLM
 * @param score - The computed FrameScore
 * @param ctx - Context about the scan (modality, domain, subject label)
 * @returns A FrameScanUIReport ready for rendering
 */
export async function buildFrameScanUIReport(
  raw: FrameScanResult,
  score: FrameScore,
  ctx: FrameReportUIBuildContext
): Promise<FrameScanUIReport> {
  const messages: LlmMessage[] = [
    { role: "system", content: UI_BUILDER_SYSTEM_PROMPT },
    {
      role: "user",
      content: JSON.stringify({
        context: ctx,
        score: {
          frameScore: score.frameScore,
          overallFrame: score.overallFrame,
          overallWinWinState: score.overallWinWinState,
          domain: score.domain,
          notes: score.notes,
        },
        raw: {
          modality: raw.modality,
          domain: raw.domain,
          overallFrame: raw.overallFrame,
          overallWinWinState: raw.overallWinWinState,
          axes: raw.axes,
          diagnostics: raw.diagnostics,
          corrections: raw.corrections,
        },
      }),
    },
  ];

  const response = await callOpenAIChat(messages);
  const rawText = response.rawText ?? "";

  return parseUIReportResponse(rawText);
}

/**
 * Parse the LLM response into a FrameScanUIReport.
 * Handles both clean JSON and JSON embedded in other text.
 */
function parseUIReportResponse(rawText: string): FrameScanUIReport {
  let parsed: unknown;
  
  // Try direct parse first
  try {
    parsed = JSON.parse(rawText);
  } catch {
    // Try to extract JSON from the response
    const start = rawText.indexOf("{");
    const end = rawText.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const sliced = rawText.slice(start, end + 1);
      try {
        parsed = JSON.parse(sliced);
      } catch {
        throw new Error(`Failed to parse FrameScanUIReport JSON from OpenAI: ${rawText.slice(0, 200)}`);
      }
    } else {
      throw new Error(`Failed to parse FrameScanUIReport JSON from OpenAI: ${rawText.slice(0, 200)}`);
    }
  }
  
  // Validate the parsed object - this will throw with specific messages
  validateUIReport(parsed);
  return parsed as FrameScanUIReport;
}

/**
 * Validate that the parsed object has the required structure.
 * Throws if invalid.
 */
function validateUIReport(obj: unknown): void {
  if (typeof obj !== "object" || obj === null) {
    throw new Error("FrameScanUIReport must be an object");
  }

  const report = obj as Record<string, unknown>;

  // Validate header
  if (!report.header || typeof report.header !== "object") {
    throw new Error("FrameScanUIReport must have a header object");
  }

  const header = report.header as Record<string, unknown>;
  if (typeof header.title !== "string") {
    throw new Error("header.title must be a string");
  }
  if (typeof header.oneLineVerdict !== "string") {
    throw new Error("header.oneLineVerdict must be a string");
  }
  if (typeof header.highlightScore !== "number") {
    throw new Error("header.highlightScore must be a number");
  }
  // Allow badges to be missing - default to empty array
  if (header.badges === undefined || header.badges === null) {
    header.badges = [];
  }
  if (!Array.isArray(header.badges)) {
    throw new Error("header.badges must be an array");
  }

  // Validate sections
  if (!Array.isArray(report.sections)) {
    throw new Error("FrameScanUIReport must have a sections array");
  }

  const requiredSectionIds = ["summary", "strengths", "weaknesses", "corrections"];
  const sectionIds = (report.sections as Array<{ id?: string }>).map(s => s.id);

  for (const required of requiredSectionIds) {
    if (!sectionIds.includes(required)) {
      throw new Error(`FrameScanUIReport must include section with id "${required}"`);
    }
  }

  // Normalize array fields in sections
  for (const section of report.sections as Array<Record<string, unknown>>) {
    // Allow bullets to be missing - default to empty array
    if (section.bullets === undefined || section.bullets === null) {
      section.bullets = [];
    }
    if (section.bullets !== undefined && !Array.isArray(section.bullets)) {
      throw new Error(`section.bullets must be an array`);
    }

    // Allow corrections to be missing - default to empty array
    if (section.corrections === undefined || section.corrections === null) {
      section.corrections = [];
    }
    if (section.corrections !== undefined && !Array.isArray(section.corrections)) {
      throw new Error(`section.corrections must be an array`);
    }
  }
}

// =============================================================================
// FALLBACK BUILDER (for when LLM call fails or for testing)
// =============================================================================

/**
 * Build a basic UI report from raw data without calling the LLM.
 * Used as a fallback when the LLM call fails.
 */
export function buildFallbackUIReport(
  raw: FrameScanResult,
  score: FrameScore,
  ctx: FrameReportUIBuildContext
): FrameScanUIReport {
  // Build badges from frame state
  const badges: string[] = [];
  if (score.overallFrame === "apex") badges.push("apex");
  else if (score.overallFrame === "slave") badges.push("slave");
  else badges.push("mixed");

  if (score.overallWinWinState === "win_win") badges.push("win-win");
  else if (score.overallWinWinState === "win_lose") badges.push("win-lose");
  else if (score.overallWinWinState === "lose_lose") badges.push("lose-lose");

  // Find strengths (positive scores)
  const strengths = raw.axes
    .filter(a => a.score > 0)
    .map(a => `${formatAxisName(a.axisId)}: ${a.notes}`);

  // Find weaknesses (negative scores)
  const weaknesses = raw.axes
    .filter(a => a.score < 0)
    .map(a => `${formatAxisName(a.axisId)}: ${a.notes}`);

  // Build corrections
  const corrections: FrameScanUICorrection[] = (raw.corrections?.topShifts || []).map(shift => ({
    label: formatAxisName(shift.axisId),
    description: shift.shift,
    suggestedAction: shift.protocolSteps?.[0] || "Review and adjust approach",
  }));

  return {
    header: {
      title: ctx.subjectLabel,
      oneLineVerdict: `${score.overallFrame.charAt(0).toUpperCase() + score.overallFrame.slice(1)} frame with ${score.overallWinWinState.replace(/_/g, "-")} dynamics`,
      highlightScore: score.frameScore,
      badges,
    },
    sections: [
      {
        id: "summary",
        title: "Summary",
        mainParagraph: raw.diagnostics?.supportingEvidence?.join(" ") || "Analysis complete.",
        bullets: raw.diagnostics?.primaryPatterns || [],
      },
      {
        id: "strengths",
        title: "Strengths",
        bullets: strengths.length > 0 ? strengths : ["No strong apex signals detected"],
      },
      {
        id: "weaknesses",
        title: "Weaknesses",
        bullets: weaknesses.length > 0 ? weaknesses : ["No significant slave signals detected"],
      },
      {
        id: "corrections",
        title: "Corrections",
        corrections: corrections.length > 0 ? corrections : [{
          label: "Maintain course",
          description: "No critical corrections needed",
          suggestedAction: "Continue current approach",
        }],
      },
    ],
  };
}

/**
 * Format an axis ID into a readable name.
 */
function formatAxisName(axisId: string): string {
  return axisId
    .split("_")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// =============================================================================
// SAFE BUILDER (with fallback)
// =============================================================================

/**
 * Build a UI report with automatic fallback on failure.
 */
export async function buildFrameScanUIReportSafe(
  raw: FrameScanResult,
  score: FrameScore,
  ctx: FrameReportUIBuildContext
): Promise<FrameScanUIReport> {
  try {
    return await buildFrameScanUIReport(raw, score, ctx);
  } catch (error) {
    console.warn("Failed to build UI report via LLM, using fallback:", error);
    return buildFallbackUIReport(raw, score, ctx);
  }
}

