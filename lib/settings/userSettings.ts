// =============================================================================
// USER SETTINGS — Local storage backed settings for user preferences
// =============================================================================
// NOTE: This is a temporary local-dev implementation using localStorage.
// For production, user settings will be persisted server-side per account
// instead of localStorage. This proves the concept before backend integration.
// =============================================================================

/**
 * User-configurable settings, including API key overrides.
 */
export interface UserSettings {
  /** User's personal OpenAI API key (overrides app-level key) */
  openaiApiKey?: string;
  /** User's personal Nano Banana API key (overrides app-level key) */
  nanobananaApiKey?: string;
  // Add other future settings here as needed
}

/** LocalStorage key for persisting settings */
const STORAGE_KEY = "framelord_user_settings";

/**
 * Load user settings from localStorage.
 * Returns empty object if no settings exist or on SSR/error.
 */
export function loadUserSettings(): UserSettings {
  if (typeof window === "undefined") return {};
  
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as UserSettings;
  } catch (err) {
    console.warn("Failed to load user settings:", err);
    return {};
  }
}

/**
 * Save user settings to localStorage.
 * Silently fails on SSR or storage errors.
 */
export function saveUserSettings(settings: UserSettings): void {
  if (typeof window === "undefined") return;
  
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn("Failed to save user settings:", err);
  }
}

/**
 * Update a single setting without overwriting others.
 */
export function updateUserSetting<K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K]
): void {
  const current = loadUserSettings();
  current[key] = value;
  saveUserSettings(current);
}

/**
 * Clear all user settings from localStorage.
 */
export function clearUserSettings(): void {
  if (typeof window === "undefined") return;
  
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn("Failed to clear user settings:", err);
  }
}

