// =============================================================================
// LLM PROVIDER CONFIGURATION — Provider abstraction and API key resolution
// =============================================================================
// This module defines the provider configuration and resolves API keys from:
// 1. User-supplied keys in Settings (highest priority)
// 2. App-level keys from environment variables (fallback)
//
// NOTE: For production, user settings will be persisted server-side per account.
// The localStorage approach here is temporary for local development.
// =============================================================================

import { loadUserSettings, UserSettings } from "../settings/userSettings";

// =============================================================================
// PROVIDER TYPES
// =============================================================================

/**
 * Supported LLM provider identifiers.
 * - openai_text: OpenAI for text-based FrameScan analysis
 * - nanobanana_image: Nano Banana for image annotation
 */
export type LlmProviderId = "openai_text" | "nanobanana_image";

/**
 * Configuration for a single provider's API key resolution.
 */
export interface ProviderKeyConfig {
  /** Provider identifier */
  providerId: LlmProviderId;
  /** Environment variable name for app-wide API key */
  appApiKeyEnvVar: string;
  /** Settings key for user-supplied API key override */
  userApiKeySettingKey: keyof UserSettings;
}

// =============================================================================
// PROVIDER CONFIGURATION MAP
// =============================================================================

/**
 * Configuration for all supported providers.
 * Maps provider ID to its key resolution config.
 */
export const PROVIDER_CONFIG: Record<LlmProviderId, ProviderKeyConfig> = {
  openai_text: {
    providerId: "openai_text",
    appApiKeyEnvVar: "VITE_OPENAI_API_KEY",
    userApiKeySettingKey: "openaiApiKey",
  },
  nanobanana_image: {
    providerId: "nanobanana_image",
    appApiKeyEnvVar: "VITE_NANOBANANA_API_KEY",
    userApiKeySettingKey: "nanobananaApiKey",
  },
};

// =============================================================================
// API KEY RESOLUTION
// =============================================================================

/**
 * Resolve the API key for a given provider.
 *
 * Resolution order:
 * 1. User-supplied key from Settings (localStorage) — highest priority
 * 2. App-level key from environment variable — fallback
 *
 * @param providerId - The provider to resolve the key for
 * @returns The API key string, or null if not configured
 */
export function resolveApiKey(providerId: LlmProviderId): string | null {
  const config = PROVIDER_CONFIG[providerId];
  if (!config) {
    console.warn(`Unknown provider ID: ${providerId}`);
    return null;
  }

  const settings = loadUserSettings();

  // 1. Check user-supplied override first (highest priority)
  const userKey = settings[config.userApiKeySettingKey] as string | undefined;
  if (userKey && userKey.trim().length > 0) {
    return userKey.trim();
  }

  // 2. Fall back to app-level environment variable
  // Using import.meta.env for Vite compatibility
  const envKey = (import.meta as any).env?.[config.appApiKeyEnvVar] as string | undefined;
  if (envKey && envKey.trim().length > 0) {
    return envKey.trim();
  }

  return null;
}

/**
 * Check if a provider has a valid API key configured.
 */
export function isProviderConfigured(providerId: LlmProviderId): boolean {
  return resolveApiKey(providerId) !== null;
}

/**
 * Get all configured providers (those with valid API keys).
 */
export function getConfiguredProviders(): LlmProviderId[] {
  return (Object.keys(PROVIDER_CONFIG) as LlmProviderId[]).filter(isProviderConfigured);
}






