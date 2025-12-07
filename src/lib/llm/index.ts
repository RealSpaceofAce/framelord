// =============================================================================
// LLM MODULE — Public exports for LLM providers and clients
// =============================================================================

// Provider configuration and key resolution
export {
  type LlmProviderId,
  type ProviderKeyConfig,
  PROVIDER_CONFIG,
  resolveApiKey,
  isProviderConfigured,
  getConfiguredProviders,
} from "./providers";

// OpenAI client
export {
  type LlmMessage,
  type LlmResponse,
  callOpenAIChat,
} from "./openaiClient";

// Nano Banana client
export {
  type NanoBananaResult,
  callNanoBananaAnnotateImage,
  isNanoBananaAvailable,
} from "./nanobananaClient";

