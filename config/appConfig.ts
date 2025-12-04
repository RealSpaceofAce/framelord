// =============================================================================
// APP CONFIG — Feature flags and configuration
// =============================================================================
// Controls which advanced features are enabled in the app.
// During development, most flags are true. In production, some may be false.
// =============================================================================

export interface AppConfig {
  /** Enable advanced API key settings in Settings → Integrations */
  enableAdvancedApiSettings: boolean;
  /** Enable public scan gating (one free scan per browser) */
  enablePublicScanGate: boolean;
  /** Enable dev-only routes like /dev/frame-report-demo */
  enableDevRoutes: boolean;
}

export const appConfig: AppConfig = {
  enableAdvancedApiSettings: true,  // Set to true during development
  enablePublicScanGate: true,       // Enable one-scan-per-browser limit
  enableDevRoutes: true,            // Show dev routes during development
};

