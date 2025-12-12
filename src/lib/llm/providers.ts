// =============================================================================
// LLM PROVIDER CONFIGURATION — Provider identifiers and availability checks
// =============================================================================
// This module defines provider identifiers for LLM services.
//
// IMPORTANT: API keys are NO LONGER read from browser environment variables.
// All API calls go through Vercel serverless functions (/api/*) which read
// keys from server-side environment variables only.
//
// The VITE_* env vars are DEPRECATED and should NOT be set in production.
// User-supplied keys (stored in settings) will be a future enhancement
// passed securely to the proxy functions.
// =============================================================================

// =============================================================================
// PROVIDER TYPES
// =============================================================================

/**
 * Supported LLM provider identifiers.
 * - openai_text: OpenAI for text-based analysis and transcription
 * - nanobanana_image: Nano Banana for image annotation
 * - gemini: Google Gemini for frame analysis and chat
 */
export type LlmProviderId = "openai_text" | "nanobanana_image" | "gemini";

// =============================================================================
// AVAILABILITY CHECKS
// =============================================================================

/**
 * Check if a provider is available.
 * In production, all providers are available since API keys are server-side.
 * The actual availability is determined when the API call is made.
 *
 * @param providerId - The provider to check
 * @returns Always true in production (actual availability checked server-side)
 */
export function isProviderConfigured(providerId: LlmProviderId): boolean {
  // In the new architecture, availability is determined server-side
  // This function exists for backwards compatibility
  return true;
}

/**
 * Get all configured providers.
 * Returns all providers since actual configuration is server-side.
 */
export function getConfiguredProviders(): LlmProviderId[] {
  return ["openai_text", "nanobanana_image", "gemini"];
}

// =============================================================================
// DEPRECATED: Legacy API key resolution
// =============================================================================
// These functions are kept for backwards compatibility during migration.
// They should NOT be used in production code.
// =============================================================================

/**
 * @deprecated API keys are now handled server-side only.
 * This function is kept for backwards compatibility but always returns null.
 */
export function resolveApiKey(_providerId: LlmProviderId): string | null {
  console.warn(
    "[DEPRECATED] resolveApiKey() is deprecated. " +
    "API keys are now handled server-side via Vercel functions. " +
    "This function always returns null."
  );
  return null;
}
