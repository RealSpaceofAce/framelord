// =============================================================================
// FRAME SCAN LLM SERVICE — Runtime LLM integration for FrameScan analysis
// =============================================================================
// This module provides the runtime integration between FrameScan and LLM providers.
//
// Provider Architecture:
// - Text FrameScan: Uses OpenAI only for doctrine-aware analysis
// - Image FrameScan: Uses Nano Banana for annotation + OpenAI for frame scoring
//
// API Key Resolution:
// - User keys from Settings (localStorage) take priority
// - App-level keys from environment variables are fallback
// - See lib/llm/providers.ts for resolution logic
//
// Throttling:
// - Client-side session throttle limits scans per session
// - TODO: Mirror with server-side user-level limits in production
// =============================================================================

import { FrameScanResult, FrameScore, FrameAxisId, FRAME_AXIS_IDS, FrameDomainId, FrameImageScanResult, FrameScanContext } from "./frameTypes";
import { frameScanSpec } from "./frameSpec";
import { scoreFrameScan } from "./frameScoring";
import { callOpenAIChat, LlmMessage } from "../llm/openaiClient";
import { callNanoBananaAnnotateImage } from "../llm/nanobananaClient";
import { enforceThrottle, incrementScanCount, getThrottleConfig } from "./frameThrottle";
import { addFrameScanReport, type FrameScanSubjectType, getLatestReportForContact } from "../../services/frameScanReportStore";
import { buildFrameScanUIReportSafe, type FrameScanUIReport } from "./frameReportUI";
import { getContactById, updateContact } from "../../services/contactStore";
import type { ContactFrameMetrics } from "../../types";
import { getApexSupremacyFilter, getSelectiveDoctrine } from "../../services/doctrineLoader";

// Default contact ID for self-scans
const CONTACT_ZERO_ID = "contact_zero";

// Domain labels for default subject labels
const DOMAIN_LABELS: Record<string, string> = {
  generic: "Frame scan",
  sales_email: "Sales email scan",
  dating_message: "Dating message scan",
  leadership_update: "Leadership update scan",
  social_post: "Social post scan",
  profile_photo: "Profile photo scan",
  team_photo: "Team photo scan",
  landing_page_hero: "Landing page hero scan",
  social_post_image: "Social post image scan",
};

// =============================================================================
// CONTACT FRAME METRICS SYNC
// =============================================================================

/**
 * Syncs Contact.frame metrics after a FrameScan completes.
 * Updates currentScore, trend, and lastScanAt for all subject contacts.
 *
 * @param contactIds - Array of contact IDs to update
 * @param newScore - The new frame score (0-100)
 */
function syncContactFrameMetrics(contactIds: string[], newScore: number): void {
  const timestamp = new Date().toISOString();

  for (const contactId of contactIds) {
    const contact = getContactById(contactId);
    if (!contact) continue;

    // Get previous score to calculate trend
    const previousScore = contact.frame.currentScore;
    const previousScanAt = contact.frame.lastScanAt;

    // Calculate trend (only if there was a previous scan)
    let trend: ContactFrameMetrics['trend'] = 'flat';
    if (previousScanAt) {
      const scoreDiff = newScore - previousScore;
      // Use a threshold of 3 points to determine significant change
      if (scoreDiff >= 3) {
        trend = 'up';
      } else if (scoreDiff <= -3) {
        trend = 'down';
      }
    }

    // Update contact's frame metrics
    const updatedContact = {
      ...contact,
      frame: {
        currentScore: newScore,
        trend,
        lastScanAt: timestamp,
      },
    };

    updateContact(updatedContact);
  }
}

// =============================================================================
// REQUEST PAYLOAD TYPES
// =============================================================================

/** Text domain identifiers */
export type TextDomainId = "generic" | "sales_email" | "dating_message" | "leadership_update" | "social_post";

/** Image domain identifiers */
export type ImageDomainId = "profile_photo" | "team_photo" | "landing_page_hero" | "social_post_image";

/**
 * Input for a text-based FrameScan.
 */
export interface TextFrameScanInput {
  /** The domain context for analysis */
  domain: TextDomainId;
  /** The raw text content to analyze */
  content: string;
  /** @deprecated Legacy metadata field - use scanContext instead */
  context?: Record<string, unknown>;
  /** Optional scan context (what, who, userConcern) */
  scanContext?: FrameScanContext;
  /** Optional contact IDs for multi-contact attribution (defaults to ["contact_zero"]) */
  contactIds?: string[];
  /** @deprecated Use contactIds instead. Optional contact ID for attribution. */
  contactId?: string;
  /** Optional source reference (e.g., note ID, message ID) */
  sourceRef?: string;
  /** Optional human-readable label for the scan subject (e.g., "Sales email to John") */
  subjectLabel?: string;
}

/**
 * Input for an image-based FrameScan.
 */
export interface ImageFrameScanInput {
  /** The domain context for analysis */
  domain: ImageDomainId;
  /** URL or ID of the image for Nano Banana annotation (required) */
  imageIdOrUrl: string;
  /** Optional user-supplied description or context about the image */
  description?: string;
  /** @deprecated Legacy metadata field - use scanContext instead */
  context?: Record<string, unknown>;
  /** Optional scan context (what, who, userConcern) */
  scanContext?: FrameScanContext;
  /** Optional contact IDs for multi-contact attribution (defaults to ["contact_zero"]) */
  contactIds?: string[];
  /** @deprecated Use contactIds instead. Optional contact ID for attribution. */
  contactId?: string;
  /** Optional source reference (e.g., image URL, asset ID) */
  sourceRef?: string;
  /** Optional human-readable label for the scan subject (e.g., "LinkedIn profile photo") */
  subjectLabel?: string;
}

/**
 * Legacy payload interface for backward compatibility.
 */
export interface FrameScanRequestPayload {
  modality: "text" | "image";
  domain: FrameDomainId;
  context?: Record<string, unknown>;
  content: string;
}

// =============================================================================
// SYSTEM PROMPT BUILDER
// =============================================================================

/**
 * Build the FrameScan system prompt with doctrine injection.
 * APEX_SUPREMACY_FILTER is ALWAYS prepended as the primary semantic layer.
 */
function buildFrameScanSystemPrompt(): string {
  const apexFilter = getApexSupremacyFilter();

  return `${apexFilter}

=== END OF APEX SUPREMACY FILTER ===

You are the FrameLord FrameScan engine.

You NEVER compute the final 0–100 score. The app already does that.
Your only job is to output a valid FrameScanResult JSON object.

You will receive:

frameScanSpec: a JSON spec that defines:

core frame model (Apex vs Slave, Win Win model)

axes and bands

text domains and image visual domains

detection rules and domain priority axes

request:

modality: "text" or "image"

domain: one of the domains defined in the spec

context: optional metadata like contact or project info

content: the actual text to scan, or a description of the image

Use ONLY the definitions and axes in frameScanSpec.

Your task on every request:

For each axis in the spec:

Decide an integer score from -3 to +3:

-3: extreme Slave expression of that axis

0: neutral / unclear

+3: strong Apex expression

Map score to band:

-3 or -2 → "strong_slave"

-1 → "mild_slave"

0 → "neutral"

+1 → "mild_apex"

+2 or +3 → "strong_apex"

Write notes explaining the score using specific phrases (for text) or visible details (for image).

Decide overallWinWinState using the Win Win model from the spec:

"win_win", "win_lose", "lose_lose", or "neutral"

Base this on structure:

Is mutual gain possible and clean?

Is a clear "no" respected?

Is there guilt, pressure, extraction, or covert contracts?

Decide overallFrame:

If most axes are Apex bands ("mild_apex" or "strong_apex"), set "apex".

If most axes are Slave bands ("mild_slave" or "strong_slave"), set "slave".

Otherwise set "mixed".

Build diagnostics:

primaryPatterns: 2–5 short labels like:

"seller posture"

"collapsed assumptive state"

"chronic pedestalization"

"strong internal sale"

supportingEvidence: 3–7 short snippets:

For text: quote or paraphrase key lines.

For images: describe posture, composition, background, props.

Build corrections:

corrections.topShifts: 2–4 items.

Each item:

axisId: which axis you are correcting.

shift: one sentence naming the structural change.

protocolSteps: 2–5 concrete steps to change the next message or photo.

If modality is "text", also include sampleRewrites:

1–3 rewrites of key parts (subject, opening, closing).

Each apexVersion must embody:

buyer position

internal sale

Win Win integrity

non-needy, non-manipulative tone.

Output EXACTLY this JSON structure and nothing else:

{
"modality": "text or image",
"domain": "one of the domains in the spec",
"overallFrame": "apex | slave | mixed",
"overallWinWinState": "win_win | "win_lose" | "lose_lose" | "neutral",
"axes": [
{
"axisId": "assumptive_state | buyer_seller_position | identity_vs_tactic | internal_sale | win_win_integrity | persuasion_style | pedestalization | self_trust_vs_permission | field_strength",
"score": -3 to 3,
"band": "strong_slave | mild_slave | neutral | mild_apex | strong_apex",
"notes": "string"
}
],
"diagnostics": {
"primaryPatterns": ["string"],
"supportingEvidence": ["string"]
},
"corrections": {
"topShifts": [
{
"axisId": "same as above",
"shift": "string",
"protocolSteps": ["string"]
}
],
"sampleRewrites": [
{
"purpose": "string",
"apexVersion": "string"
}
]
}
}

Rules:

Output must be valid JSON with double quotes.

All scores must be integers.

Do not include comments or explanation outside the JSON.`;
}

// Cache the system prompt (doctrine doesn't change at runtime)
let cachedSystemPrompt: string | null = null;

function getFrameScanSystemPrompt(): string {
  if (!cachedSystemPrompt) {
    cachedSystemPrompt = buildFrameScanSystemPrompt();
  }
  return cachedSystemPrompt;
}

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validates that the parsed response is a valid FrameScanResult.
 */
function validateFrameScanResult(input: unknown): FrameScanResult {
  if (typeof input !== "object" || input === null) {
    throw new Error("FrameScanResult must be an object");
  }

  const obj = input as Record<string, unknown>;

  // Validate modality
  if (obj.modality !== "text" && obj.modality !== "image") {
    throw new Error(`Invalid modality: ${obj.modality}. Must be "text" or "image"`);
  }

  // Validate domain
  const validDomains = [
    "generic", "sales_email", "dating_message", "leadership_update", "social_post",
    "profile_photo", "team_photo", "landing_page_hero", "social_post_image",
  ];
  if (typeof obj.domain !== "string" || !validDomains.includes(obj.domain)) {
    throw new Error(`Invalid domain: ${obj.domain}`);
  }

  // Validate overallFrame
  if (obj.overallFrame !== "apex" && obj.overallFrame !== "slave" && obj.overallFrame !== "mixed") {
    throw new Error(`Invalid overallFrame: ${obj.overallFrame}. Must be "apex", "slave", or "mixed"`);
  }

  // Validate overallWinWinState
  const validWinWinStates = ["win_win", "win_lose", "lose_lose", "neutral"];
  if (typeof obj.overallWinWinState !== "string" || !validWinWinStates.includes(obj.overallWinWinState)) {
    throw new Error(`Invalid overallWinWinState: ${obj.overallWinWinState}`);
  }

  // Validate axes
  if (!Array.isArray(obj.axes) || obj.axes.length === 0) {
    throw new Error("axes must be a non-empty array");
  }

  const validBands = ["strong_slave", "mild_slave", "neutral", "mild_apex", "strong_apex"];

  for (let i = 0; i < obj.axes.length; i++) {
    const axis = obj.axes[i] as Record<string, unknown>;

    if (typeof axis !== "object" || axis === null) {
      throw new Error(`axes[${i}] must be an object`);
    }

    if (typeof axis.axisId !== "string" || !FRAME_AXIS_IDS.includes(axis.axisId as FrameAxisId)) {
      throw new Error(`axes[${i}].axisId is invalid: ${axis.axisId}`);
    }

    if (typeof axis.score !== "number" || !Number.isInteger(axis.score) || axis.score < -3 || axis.score > 3) {
      throw new Error(`axes[${i}].score must be an integer from -3 to 3, got: ${axis.score}`);
    }

    if (typeof axis.band !== "string" || !validBands.includes(axis.band)) {
      throw new Error(`axes[${i}].band is invalid: ${axis.band}`);
    }

    if (typeof axis.notes !== "string") {
      throw new Error(`axes[${i}].notes must be a string`);
    }
  }

  // Validate diagnostics
  if (typeof obj.diagnostics !== "object" || obj.diagnostics === null) {
    throw new Error("diagnostics must be an object");
  }

  const diag = obj.diagnostics as Record<string, unknown>;

  // Allow primaryPatterns to be missing - default to empty array
  if (diag.primaryPatterns === undefined || diag.primaryPatterns === null) {
    diag.primaryPatterns = [];
  }

  if (!Array.isArray(diag.primaryPatterns)) {
    throw new Error("diagnostics.primaryPatterns must be an array");
  }

  // Allow supportingEvidence to be missing - default to empty array
  if (diag.supportingEvidence === undefined || diag.supportingEvidence === null) {
    diag.supportingEvidence = [];
  }

  if (!Array.isArray(diag.supportingEvidence)) {
    throw new Error("diagnostics.supportingEvidence must be an array");
  }

  // Validate corrections
  if (typeof obj.corrections !== "object" || obj.corrections === null) {
    throw new Error("corrections must be an object");
  }

  const corr = obj.corrections as Record<string, unknown>;

  // Allow topShifts to be missing - default to empty array
  if (corr.topShifts === undefined || corr.topShifts === null) {
    corr.topShifts = [];
  }

  if (!Array.isArray(corr.topShifts)) {
    throw new Error("corrections.topShifts must be an array");
  }

  for (let i = 0; i < corr.topShifts.length; i++) {
    const shift = corr.topShifts[i] as Record<string, unknown>;

    if (typeof shift !== "object" || shift === null) {
      throw new Error(`corrections.topShifts[${i}] must be an object`);
    }

    if (typeof shift.axisId !== "string" || !FRAME_AXIS_IDS.includes(shift.axisId as FrameAxisId)) {
      throw new Error(`corrections.topShifts[${i}].axisId is invalid: ${shift.axisId}`);
    }

    if (typeof shift.shift !== "string") {
      throw new Error(`corrections.topShifts[${i}].shift must be a string`);
    }

    // Allow protocolSteps to be missing - default to empty array
    if (shift.protocolSteps === undefined || shift.protocolSteps === null) {
      shift.protocolSteps = [];
    }

    if (!Array.isArray(shift.protocolSteps)) {
      throw new Error(`corrections.topShifts[${i}].protocolSteps must be an array`);
    }
  }

  if (corr.sampleRewrites !== undefined && !Array.isArray(corr.sampleRewrites)) {
    throw new Error("corrections.sampleRewrites must be an array if present");
  }

  return obj as unknown as FrameScanResult;
}

/**
 * Parse JSON from LLM response, handling common formatting issues.
 */
function parseJsonResponse(raw: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(raw);
  } catch {
    // Try to extract JSON from markdown code blocks or other formatting
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const sliced = raw.slice(start, end + 1);
      return JSON.parse(sliced);
    }
    throw new Error(`Failed to parse JSON from response: ${raw.slice(0, 200)}`);
  }
}

// =============================================================================
// TEXT FRAMESCAN
// =============================================================================

/**
 * Run a text-based FrameScan using OpenAI.
 *
 * @param input - Text scan input with domain and content
 * @returns Full FrameScore with 0-100 score and breakdown
 * @throws Error if throttle limit reached or LLM call fails
 */
export async function runTextFrameScan(input: TextFrameScanInput): Promise<FrameScore> {
  // Enforce throttle limit
  const config = getThrottleConfig();
  enforceThrottle(config);

  const payload = {
    frameScanSpec,
    request: {
      modality: "text" as const,
      domain: input.domain,
      content: input.content,
      context: input.context,
    },
  };

  const messages: LlmMessage[] = [
    { role: "system", content: getFrameScanSystemPrompt() },
    { role: "user", content: JSON.stringify(payload) },
  ];

  const response = await callOpenAIChat(messages);
  const raw = response.rawText ?? "";

  const parsed = parseJsonResponse(raw);
  const result = validateFrameScanResult(parsed);

  if (result.modality !== "text" || !Array.isArray(result.axes) || result.axes.length === 0) {
    throw new Error("FrameScanResult shape invalid for text modality");
  }

  // Increment scan count after successful scan
  incrementScanCount();

  const score = scoreFrameScan(result);

  // Build UI report
  const subjectLabel = input.subjectLabel || DOMAIN_LABELS[input.domain] || "Frame scan";
  const uiReport = await buildFrameScanUIReportSafe(result, score, {
    modality: "text",
    domain: input.domain,
    subjectLabel,
  });

  // Save report to store (side effect)
  // Support new contactIds array while maintaining backwards compatibility with contactId
  const subjectContactIds = input.contactIds?.length
    ? input.contactIds
    : [input.contactId || CONTACT_ZERO_ID];
  const subjectType: FrameScanSubjectType =
    subjectContactIds.length === 1 && subjectContactIds[0] === CONTACT_ZERO_ID
      ? "self"
      : "contact";

  addFrameScanReport({
    subjectType,
    subjectContactIds,
    modality: "text",
    domain: input.domain,
    context: input.scanContext,
    sourceRef: input.sourceRef,
    rawResult: result,
    score,
    uiReport,
  });

  // Auto-sync Contact.frame metrics after scan
  syncContactFrameMetrics(subjectContactIds, score.frameScore);

  return score;
}

// =============================================================================
// IMAGE FRAMESCAN
// =============================================================================

/**
 * Run an image-based FrameScan using Nano Banana + OpenAI.
 *
 * Pipeline:
 * 1. Nano Banana annotates the image (produces labels, posture descriptions, bounding boxes)
 * 2. OpenAI receives combined description + annotations and produces FrameScanResult
 * 3. Local scoring engine computes 0-100 score
 * 4. Returns score + annotations + optional annotated image URL bundled together
 *
 * @param input - Image scan input with imageIdOrUrl, domain, and optional description
 * @returns FrameImageScanResult with score, annotations, and optional annotated image URL
 * @throws Error if throttle limit reached or LLM call fails
 */
export async function runImageFrameScan(input: ImageFrameScanInput): Promise<FrameImageScanResult> {
  // Enforce throttle limit
  const config = getThrottleConfig();
  enforceThrottle(config);

  // Step 1: Call Nano Banana to get visual annotations for the image
  const nbResult = await callNanoBananaAnnotateImage(input.imageIdOrUrl);

  // Step 2: Build combined description for the LLM
  const userDescription = input.description && input.description.trim().length > 0
    ? input.description.trim()
    : "No additional user context provided.";

  const combinedDescription = [
    "USER_CONTEXT:",
    userDescription,
    "",
    "NANOBANANA_ANNOTATIONS_JSON:",
    JSON.stringify(nbResult.annotations, null, 2),
  ].join("\n");

  const payload = {
    frameScanSpec,
    request: {
      modality: "image" as const,
      domain: input.domain,
      content: combinedDescription,
      context: input.context,
    },
  };

  const messages: LlmMessage[] = [
    { role: "system", content: getFrameScanSystemPrompt() },
    { role: "user", content: JSON.stringify(payload) },
  ];

  // Step 3: Call OpenAI for doctrine-based frame analysis
  const response = await callOpenAIChat(messages);
  const raw = response.rawText ?? "";

  const parsed = parseJsonResponse(raw);
  const result = validateFrameScanResult(parsed);

  if (result.modality !== "image" || !Array.isArray(result.axes) || result.axes.length === 0) {
    throw new Error("FrameScanResult shape invalid for image modality");
  }

  // Increment scan count after successful scan
  incrementScanCount();

  // Step 4: Score and bundle the result
  const score = scoreFrameScan(result);

  // Build UI report
  const subjectLabel = input.subjectLabel || DOMAIN_LABELS[input.domain] || "Image frame scan";
  const uiReport = await buildFrameScanUIReportSafe(result, score, {
    modality: "image",
    domain: input.domain,
    subjectLabel,
  });

  // Save report to store (side effect)
  // Support new contactIds array while maintaining backwards compatibility with contactId
  const subjectContactIds = input.contactIds?.length
    ? input.contactIds
    : [input.contactId || CONTACT_ZERO_ID];
  const subjectType: FrameScanSubjectType =
    subjectContactIds.length === 1 && subjectContactIds[0] === CONTACT_ZERO_ID
      ? "self"
      : "contact";

  addFrameScanReport({
    subjectType,
    subjectContactIds,
    modality: "image",
    domain: input.domain,
    context: input.scanContext,
    sourceRef: input.sourceRef || input.imageIdOrUrl,
    rawResult: result,
    score,
    imageAnnotations: nbResult.annotations,
    annotatedImageUrl: nbResult.annotatedImageUrl,
    uiReport,
  });

  // Auto-sync Contact.frame metrics after scan
  syncContactFrameMetrics(subjectContactIds, score.frameScore);

  return {
    score,
    annotations: nbResult.annotations,
    annotatedImageUrl: nbResult.annotatedImageUrl,
  };
}

// =============================================================================
// LEGACY / GENERIC INTERFACE
// =============================================================================

/**
 * Minimal interface for an LLM client (kept for backward compatibility).
 */
export interface LLMClient {
  chat: (args: { systemPrompt: string; userPayload: unknown }) => Promise<string>;
}

/**
 * Call an LLM to generate a FrameScanResult (legacy interface).
 * @deprecated Use runTextFrameScan or runImageFrameScan instead
 */
export async function callLLMForFrameScanResult(
  client: LLMClient,
  request: FrameScanRequestPayload
): Promise<FrameScanResult> {
  const payload = { frameScanSpec, request };

  const raw = await client.chat({
    systemPrompt: getFrameScanSystemPrompt(),
    userPayload: payload,
  });

  const parsed = parseJsonResponse(raw);
  return validateFrameScanResult(parsed);
}

/**
 * Run a complete FrameScan with a custom LLM client (legacy interface).
 * @deprecated Use runTextFrameScan or runImageFrameScan instead
 */
export async function runFrameScan(
  client: LLMClient,
  request: FrameScanRequestPayload
): Promise<{ result: FrameScanResult; score: FrameScore }> {
  // Enforce throttle
  enforceThrottle();
  
  const result = await callLLMForFrameScanResult(client, request);
  incrementScanCount();
  
  const score = scoreFrameScan(result);
  return { result, score };
}
