// =============================================================================
// OPENAI CLIENT — HTTP client for OpenAI chat completions via Vercel proxy
// =============================================================================
// Calls /api/openai-chat serverless function to keep API keys server-side.
// In production, no API keys are exposed to the browser.
// =============================================================================

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

/** Default model to use if not specified */
const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Call OpenAI chat completions via Vercel proxy.
 *
 * @param messages - Array of chat messages (system, user, assistant)
 * @returns The LLM response with raw text content
 * @throws Error if the API call fails (fails closed in production)
 */
export async function callOpenAIChat(messages: LlmMessage[]): Promise<LlmResponse> {
  const res = await fetch("/api/openai-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_OPENAI_MODEL,
      messages,
      temperature: 0.1,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(
      `OpenAI chat request failed: ${res.status} - ${data.error || res.statusText}`
    );
  }

  const data = await res.json();

  if (typeof data.text !== "string") {
    throw new Error("OpenAI chat response missing text content");
  }

  return { rawText: data.text };
}







