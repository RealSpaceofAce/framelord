// =============================================================================
// OPENAI CLIENT — HTTP client for OpenAI chat completions
// =============================================================================
// Uses the provider resolver to get API keys from user settings or env vars.
// Returns mock responses when no API key is configured.
// =============================================================================

import { resolveApiKey } from "./providers";

// =============================================================================
// TYPES
// =============================================================================

/**
 * A single message in the chat conversation.
 */
export interface LlmMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

/**
 * Response from the LLM call.
 */
export interface LlmResponse {
  /** The raw text content from the model */
  rawText: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

/** Default model to use if not specified in env */
const DEFAULT_OPENAI_MODEL = (import.meta as any).env?.VITE_OPENAI_MODEL || "gpt-4o-mini";

// =============================================================================
// MOCK RESPONSE
// =============================================================================

/**
 * Returns a mock FrameScanResult when no API key is configured.
 * This allows development and testing without real API calls.
 */
function getMockFrameScanResponse(): string {
  return JSON.stringify({
    modality: "text",
    domain: "generic",
    overallFrame: "apex",
    overallWinWinState: "win_win",
    axes: [
      {
        axisId: "assumptive_state",
        score: 2,
        band: "mild_apex",
        notes: "Mock result: confident but not overbearing.",
      },
      {
        axisId: "buyer_seller_position",
        score: 1,
        band: "mild_apex",
        notes: "Mock result: positioned as evaluator.",
      },
      {
        axisId: "identity_vs_tactic",
        score: 2,
        band: "mild_apex",
        notes: "Mock result: treats tactics as tools.",
      },
      {
        axisId: "internal_sale",
        score: 2,
        band: "mild_apex",
        notes: "Mock result: conviction without neediness.",
      },
      {
        axisId: "win_win_integrity",
        score: 2,
        band: "mild_apex",
        notes: "Mock result: mutual gain orientation.",
      },
      {
        axisId: "persuasion_style",
        score: 1,
        band: "mild_apex",
        notes: "Mock result: leads with clarity.",
      },
      {
        axisId: "pedestalization",
        score: 1,
        band: "mild_apex",
        notes: "Mock result: self as center.",
      },
      {
        axisId: "self_trust_vs_permission",
        score: 2,
        band: "mild_apex",
        notes: "Mock result: acts from inner authority.",
      },
      {
        axisId: "field_strength",
        score: 1,
        band: "mild_apex",
        notes: "Mock result: coherent presence.",
      },
    ],
    diagnostics: {
      primaryPatterns: ["mock_apex_result", "development_mode"],
      supportingEvidence: [
        "No real LLM call was made. This is a stub response.",
        "Configure VITE_OPENAI_API_KEY or set a user API key in Settings.",
      ],
    },
    corrections: {
      topShifts: [],
      sampleRewrites: [],
    },
  });
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Call OpenAI chat completions API.
 *
 * @param messages - Array of chat messages (system, user, assistant)
 * @returns The LLM response with raw text content
 * @throws Error if the API call fails
 */
export async function callOpenAIChat(messages: LlmMessage[]): Promise<LlmResponse> {
  const apiKey = resolveApiKey("openai_text");

  // Return mock response if no API key configured
  if (!apiKey) {
    console.warn(
      "OpenAI API key missing for provider openai_text. " +
        "Returning mock FrameScanResult. " +
        "Set VITE_OPENAI_API_KEY env var or configure in Settings."
    );
    return { rawText: getMockFrameScanResponse() };
  }

  const model = DEFAULT_OPENAI_MODEL;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `OpenAI chat request failed: ${res.status} ${res.statusText} - ${text.slice(0, 300)}`
    );
  }

  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== "string") {
    throw new Error("OpenAI chat response missing content");
  }

  return { rawText: content };
}

