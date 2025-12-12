// =============================================================================
// USER SETTINGS — Local storage backed settings for user preferences
// =============================================================================
// NOTE: This is a temporary local-dev implementation using localStorage.
// For production, user settings will be persisted server-side per account
// instead of localStorage. This proves the concept before backend integration.
// =============================================================================

/**
 * Little Lord keyboard shortcut preference.
 */
export interface LittleLordShortcutPreference {
  /** Whether the shortcut is enabled */
  enabled: boolean;
  /** Modifier key (meta = Cmd on Mac, Ctrl on Windows in browser context) */
  modifier: "meta" | "ctrl" | "alt" | "shift";
  /** Single character key (e.g., "l") */
  key: string;
}

/**
 * Editor theme preference.
 * Note: 'gray' is removed - only light/dark/system supported.
 */
export type EditorTheme = 'light' | 'dark' | 'system';

/**
 * User-configurable settings, including API key overrides.
 */
export interface UserSettings {
  /** User's personal OpenAI API key (overrides app-level key) */
  openaiApiKey?: string;
  /** User's personal Nano Banana API key (overrides app-level key) */
  nanobananaApiKey?: string;
  /** Little Lord global keyboard shortcut */
  littleLordShortcut?: LittleLordShortcutPreference;
  /** Editor theme preference (light/dark/system) */
  editorTheme?: EditorTheme;
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

// =============================================================================
// LITTLE LORD SHORTCUT HELPERS
// =============================================================================

/**
 * Get the default Little Lord shortcut preference.
 */
export function getDefaultLittleLordShortcut(): LittleLordShortcutPreference {
  return {
    enabled: true,
    modifier: "meta", // Command on Mac, will show as Ctrl in browser on Windows
    key: "l",
  };
}

/**
 * Get the current Little Lord shortcut preference.
 * Returns default if not configured.
 */
export function getLittleLordShortcut(): LittleLordShortcutPreference {
  const settings = loadUserSettings();
  return settings.littleLordShortcut || getDefaultLittleLordShortcut();
}

/**
 * Update the Little Lord shortcut preference.
 */
export function setLittleLordShortcut(pref: LittleLordShortcutPreference): void {
  updateUserSetting("littleLordShortcut", pref);
}

// =============================================================================
// EDITOR THEME HELPERS
// =============================================================================

/**
 * Get the current editor theme preference.
 * Defaults to 'dark' if not set.
 */
export function getEditorTheme(): EditorTheme {
  const settings = loadUserSettings();
  const theme = settings.editorTheme;
  // Migrate old 'gray' preference to 'dark'
  if (theme === 'gray' as any) return 'dark';
  return theme || 'dark';
}

/**
 * Set the editor theme preference.
 */
export function setEditorTheme(theme: EditorTheme): void {
  updateUserSetting("editorTheme", theme);
}

/**
 * Get the resolved theme (handles 'system' preference).
 * Returns 'light' or 'dark' based on system preference if 'system' is selected.
 */
export function getResolvedEditorTheme(): 'light' | 'dark' {
  const theme = getEditorTheme();
  if (theme === 'system') {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'dark'; // Default to dark on SSR
  }
  return theme;
}

// =============================================================================
// GLOBAL DARK MODE HELPERS
// =============================================================================
// These functions manage the app-wide dark/light mode setting.
// This is the SINGLE SOURCE OF TRUTH for theme state across the app.
// =============================================================================

const GLOBAL_DARK_MODE_KEY = 'framelord_dark_mode';

/**
 * Get the global dark mode preference.
 * Returns true if dark mode is enabled, false for light mode.
 * Defaults to true (dark mode) if not set.
 */
export function getGlobalDarkMode(): boolean {
  if (typeof window === 'undefined') return true;

  try {
    const saved = window.localStorage.getItem(GLOBAL_DARK_MODE_KEY);
    // Only return false if explicitly set to 'false'
    // Any other value (null, undefined, 'true', or invalid) defaults to dark mode
    if (saved === 'false') {
      return false;
    }
    return true;
  } catch {
    return true;
  }
}

/**
 * Set the global dark mode preference and apply CSS classes.
 * This is the single function that should be called to toggle theme app-wide.
 */
export function setGlobalDarkMode(isDark: boolean): void {
  if (typeof window === 'undefined') return;

  // Save to localStorage
  window.localStorage.setItem(GLOBAL_DARK_MODE_KEY, String(isDark));

  // Also sync to editor theme setting for consistency
  setEditorTheme(isDark ? 'dark' : 'light');

  // Apply CSS classes to document
  applyGlobalTheme(isDark);
}

/**
 * Apply theme CSS classes to the document.
 * This handles both document element and body for maximum compatibility.
 *
 * IMPORTANT: The app uses `:root` CSS variables for dark mode (default).
 * `.light-mode` class overrides those variables for light mode.
 * `.dark-mode` class is added for semantic purposes but has no CSS rules.
 */
export function applyGlobalTheme(isDark: boolean): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const body = document.body;

  // Always remove both classes first to ensure clean state
  root.classList.remove('light-mode', 'dark-mode');
  body.classList.remove('light-mode', 'dark-mode');

  if (isDark) {
    // Dark mode: Add dark-mode class (semantic, no CSS rules)
    // The `:root` default variables are already dark mode
    root.classList.add('dark-mode');
    body.classList.add('dark-mode');
  } else {
    // Light mode: Add light-mode class to trigger CSS overrides
    root.classList.add('light-mode');
    body.classList.add('light-mode');
  }
}

/**
 * Toggle global dark mode and return the new state.
 */
export function toggleGlobalDarkMode(): boolean {
  const newValue = !getGlobalDarkMode();
  setGlobalDarkMode(newValue);
  return newValue;
}



