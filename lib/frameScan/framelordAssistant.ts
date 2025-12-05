// =============================================================================
// FRAMELORD ASSISTANT — Per-contact frame analyst and advisor
// =============================================================================
// Framelord is an LLM-powered assistant that analyzes frame dynamics
// between Contact Zero and a specific contact. It reads:
// - Contact info (name, role)
// - CumulativeFrameProfile for that contact
// - Recent FrameScanReports
// - ContactContextSummary (if any)
//
// It returns a reply and optionally updates the contact's context summary.
// =============================================================================

import { callOpenAIChat, type LlmMessage } from "../llm/openaiClient";
import { getContactById, CONTACT_ZERO } from "../../services/contactStore";
import { getReportsForContact, type FrameScanReport } from "../../services/frameScanReportStore";
import { computeCumulativeFrameProfileForContact, type CumulativeFrameProfile } from "./frameProfile";
import { 
  getContactContextSummary, 
  upsertContactContextSummary 
} from "../../services/contactContextStore";
import type { ContactContextSummary } from "./contactContext";

// =============================================================================
// TYPES
// =============================================================================

/**
 * Role in a Framelord conversation.
 */
export type FramelordRole = "user" | "assistant";

/**
 * A message in a Framelord conversation.
 */
export interface FramelordMessage {
  role: FramelordRole;
  content: string;
}

/**
 * Response from Framelord assistant.
 */
export interface FramelordResponse {
  /** The assistant's reply to the user */
  reply: string;
  /** 
   * Optional updated context summary for the contact.
   * If present and non-empty, will be stored.
   */
  updatedSummary?: string;
}

/**
 * Contact data payload for the LLM.
 */
interface ContactPayload {
  id: string;
  name: string;
  role: string | null;
  domain: string | null;
  company: string | null;
  title: string | null;
}

/**
 * Report summary for the LLM payload.
 */
interface ReportSummary {
  id: string;
  createdAt: string;
  frameScore: number;
  overallFrame: string;
  domain: string;
}

// =============================================================================
// SYSTEM PROMPT
// =============================================================================

const FRAMELORD_SYSTEM_PROMPT = `You are "Framelord", a frame analyst and advisor inside the FrameLord app.

You receive:
- A single contact and their relationship to Contact Zero (the user).
- Their cumulative frame profile (score, scans count).
- Recent frame scan reports for that contact.
- An existing context summary, if any.

Your job:
- Analyze the frame between Contact Zero and this contact.
- Explain clearly what is happening in terms of:
  - authority,
  - boundaries,
  - win-win vs win-lose dynamics,
  - pedestalization,
  - buyer/seller frame.
- Suggest practical, concrete adjustments that improve frame in a win-win direction.

You must:
- Speak in concise, direct paragraphs and bullet points.
- Avoid therapy language and avoid generic self-help phrasing.
- Reference specific patterns from the data when possible (for example: "Your last three scans show soft boundaries in closing lines").
- Optionally propose a short updated context summary string that can be stored for future use.

Output format:
A single JSON object:

{
  "reply": "string with the full assistant response to the user",
  "updatedSummary": "optional string, a compact 2-4 sentence summary of this contact and the frame dynamics, or null if no update is needed"
}

Rules:
- Output ONLY the JSON object, no markdown, no explanation.
- If the user is asking about Contact Zero themselves (self-analysis), focus on their overall frame posture and self-integrity.
- Keep replies focused and actionable.`;

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Run Framelord assistant for a specific contact.
 * 
 * @param contactId - The contact to analyze
 * @param messages - The conversation history
 * @returns Response with reply and optional updated summary
 */
export async function runFramelordForContact(
  contactId: string,
  messages: FramelordMessage[]
): Promise<FramelordResponse> {
  // Get contact info
  const contact = getContactById(contactId);
  if (!contact) {
    return {
      reply: "I couldn't find information about this contact. Please make sure they exist in your contacts.",
    };
  }

  // Get reports for this contact
  const allReports = getReportsForContact(contactId);
  const recentReports = allReports.slice(0, 10); // Most recent 10

  // Compute profile
  const profile = computeCumulativeFrameProfileForContact(contactId, allReports);

  // Get existing context summary
  const contextSummary = getContactContextSummary(contactId);

  // Build contact payload
  const contactPayload: ContactPayload = {
    id: contact.id,
    name: contact.fullName,
    role: contact.relationshipRole || null,
    domain: contact.relationshipDomain || null,
    company: contact.company || null,
    title: contact.title || null,
  };

  // Build report summaries
  const reportSummaries: ReportSummary[] = recentReports.map(r => ({
    id: r.id,
    createdAt: r.createdAt,
    frameScore: r.score.frameScore,
    overallFrame: r.score.overallFrame,
    domain: r.domain,
  }));

  // Build the payload
  const payload = {
    contact: contactPayload,
    isContactZero: contactId === CONTACT_ZERO.id,
    profile: {
      currentFrameScore: profile.currentFrameScore,
      scansCount: profile.scansCount,
      lastScanAt: profile.lastScanAt || null,
    },
    contextSummary: contextSummary ? {
      summary: contextSummary.summary,
      lastUpdatedAt: contextSummary.lastUpdatedAt,
    } : null,
    recentReports: reportSummaries,
    messages: messages.map(m => ({
      role: m.role,
      content: m.content,
    })),
  };

  // Call OpenAI
  const llmMessages: LlmMessage[] = [
    { role: "system", content: FRAMELORD_SYSTEM_PROMPT },
    { role: "user", content: JSON.stringify(payload) },
  ];

  const response = await callOpenAIChat(llmMessages);
  const rawText = response.rawText ?? "";

  // Parse response
  const parsed = parseFramelordResponse(rawText);

  // Update context summary if provided
  if (parsed.updatedSummary && parsed.updatedSummary.trim().length > 0) {
    upsertContactContextSummary(contactId, parsed.updatedSummary.trim());
  }

  return parsed;
}

/**
 * Parse the LLM response into a FramelordResponse.
 */
function parseFramelordResponse(rawText: string): FramelordResponse {
  // Try direct parse
  try {
    const parsed = JSON.parse(rawText);
    return validateFramelordResponse(parsed);
  } catch {
    // Try to extract JSON from response
    const start = rawText.indexOf("{");
    const end = rawText.lastIndexOf("}");
    if (start >= 0 && end > start) {
      const sliced = rawText.slice(start, end + 1);
      try {
        const parsed = JSON.parse(sliced);
        return validateFramelordResponse(parsed);
      } catch {
        // Fall through to error
      }
    }
    
    // Fallback: treat the whole response as the reply
    return {
      reply: rawText.trim() || "I encountered an issue processing your request. Please try again.",
    };
  }
}

/**
 * Validate the parsed response has required fields.
 */
function validateFramelordResponse(obj: unknown): FramelordResponse {
  if (typeof obj !== "object" || obj === null) {
    throw new Error("FramelordResponse must be an object");
  }

  const response = obj as Record<string, unknown>;

  if (typeof response.reply !== "string") {
    throw new Error("FramelordResponse.reply must be a string");
  }

  return {
    reply: response.reply,
    updatedSummary: typeof response.updatedSummary === "string" 
      ? response.updatedSummary 
      : undefined,
  };
}

// =============================================================================
// CONVERSATION HELPERS
// =============================================================================

/**
 * Create an initial assistant message for a contact.
 */
export function createInitialFramelordMessage(contactId: string): FramelordMessage {
  const contact = getContactById(contactId);
  const isContactZero = contactId === CONTACT_ZERO.id;
  
  if (isContactZero) {
    return {
      role: "assistant",
      content: "I'm here to help you analyze your own frame and self-integrity. You can ask me things like:\n\n• \"What does my overall frame score tell me?\"\n• \"Where are my weak points?\"\n• \"How can I strengthen my frame today?\""
    };
  }

  const name = contact?.fullName || "this contact";
  return {
    role: "assistant",
    content: `I can help you analyze the frame dynamics with ${name}. You can ask me things like:\n\n• "Why do I feel like I'm always chasing them?"\n• "What patterns do you see in my recent interactions?"\n• "How can I improve the frame in our relationship?"`
  };
}

/**
 * Format a contact name for display in Framelord responses.
 */
export function getContactDisplayName(contactId: string): string {
  if (contactId === CONTACT_ZERO.id) {
    return "yourself";
  }
  const contact = getContactById(contactId);
  return contact?.fullName || "this contact";
}




