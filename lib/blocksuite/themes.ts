// =============================================================================
// BLOCKSUITE THEME DEFINITIONS — Light, Gray, and Dark themes
// =============================================================================
// CSS custom properties for BlockSuite editor theming.
//
// IMPORTANT: CSS custom properties (variables) naturally cascade INTO Shadow DOM.
// This is the correct way to theme BlockSuite - no Shadow DOM injection needed.
// Simply set variables on the element or :root and they will be inherited.
// =============================================================================

export interface EditorThemeVariables {
  // Background colors
  '--affine-background-primary-color': string;
  '--affine-background-secondary-color': string;
  '--affine-background-tertiary-color': string;
  '--affine-background-overlay-panel-color': string;
  '--affine-background-modal-color': string;
  '--affine-background-code-block': string;

  // Text colors
  '--affine-text-primary-color': string;
  '--affine-text-secondary-color': string;
  '--affine-text-disable-color': string;
  '--affine-placeholder-color': string;

  // Brand colors
  '--affine-primary-color': string;
  '--affine-brand-color': string;

  // Border colors
  '--affine-border-color': string;
  '--affine-divider-color': string;

  // Hover states
  '--affine-hover-color': string;
  '--affine-hover-color-filled': string;

  // Icon colors
  '--affine-icon-color': string;
  '--affine-icon-secondary': string;

  // Link colors
  '--affine-link-color': string;

  // Selection
  '--affine-selected-color': string;
  '--affine-block-selected-color': string;

  // Grid (for canvas mode)
  '--affine-edgeless-grid-color': string;
  '--affine-edgeless-text-color': string;

  // CRITICAL: Override border variables used by BlockSuite
  '--affine-black-10': string;
  '--affine-black-30': string;
}

/**
 * Light theme — Clean, modern, Notion-like appearance
 */
export const lightTheme: EditorThemeVariables = {
  // Background — Clean whites and light grays
  '--affine-background-primary-color': '#ffffff',
  '--affine-background-secondary-color': '#f9fafb',
  '--affine-background-tertiary-color': '#f3f4f6',
  '--affine-background-overlay-panel-color': 'rgba(255, 255, 255, 0.98)',
  '--affine-background-modal-color': '#ffffff',
  '--affine-background-code-block': '#f3f4f6',

  // Text — Dark grays for readability
  '--affine-text-primary-color': '#1f2937',
  '--affine-text-secondary-color': '#6b7280',
  '--affine-text-disable-color': '#9ca3af',
  '--affine-placeholder-color': '#9ca3af',

  // Brand — Indigo accent
  '--affine-primary-color': '#6366f1',
  '--affine-brand-color': '#6366f1',

  // Borders — Subtle light gray
  '--affine-border-color': '#e5e7eb',
  '--affine-divider-color': '#e5e7eb',

  // Hover — Light indigo tints
  '--affine-hover-color': 'rgba(99, 102, 241, 0.06)',
  '--affine-hover-color-filled': 'rgba(99, 102, 241, 0.12)',

  // Icons — Gray tones
  '--affine-icon-color': '#6b7280',
  '--affine-icon-secondary': '#9ca3af',

  // Links — Indigo
  '--affine-link-color': '#4f46e5',

  // Selection
  '--affine-selected-color': 'rgba(99, 102, 241, 0.15)',
  '--affine-block-selected-color': 'rgba(99, 102, 241, 0.08)',

  // Grid
  '--affine-edgeless-grid-color': 'rgba(99, 102, 241, 0.1)',
  '--affine-edgeless-text-color': '#1f2937',

  // Border overrides - transparent to hide note borders
  '--affine-black-10': 'transparent',
  '--affine-black-30': 'transparent',
};

/**
 * Gray theme — AFFiNE-style gray theme with #1f1f23 backgrounds
 */
export const grayTheme: EditorThemeVariables = {
  // Background — Grayish backgrounds like AFFiNE default dark
  '--affine-background-primary-color': '#1f1f23',
  '--affine-background-secondary-color': '#27272a',
  '--affine-background-tertiary-color': '#303033',
  '--affine-background-overlay-panel-color': 'rgba(31, 31, 35, 0.98)',
  '--affine-background-modal-color': '#1f1f23',
  '--affine-background-code-block': '#27272a',

  // Text — High contrast for readability
  '--affine-text-primary-color': '#fafafa',
  '--affine-text-secondary-color': '#a1a1aa',
  '--affine-text-disable-color': '#52525b',
  '--affine-placeholder-color': '#71717a',

  // Brand — Indigo accent
  '--affine-primary-color': '#6366f1',
  '--affine-brand-color': '#6366f1',

  // Borders — Gray borders
  '--affine-border-color': '#3f3f46',
  '--affine-divider-color': '#3f3f46',

  // Hover — Indigo tints
  '--affine-hover-color': 'rgba(99, 102, 241, 0.1)',
  '--affine-hover-color-filled': 'rgba(99, 102, 241, 0.15)',

  // Icons — Gray tones
  '--affine-icon-color': '#a1a1aa',
  '--affine-icon-secondary': '#71717a',

  // Links — Indigo for visibility
  '--affine-link-color': '#818cf8',

  // Selection — Indigo
  '--affine-selected-color': 'rgba(99, 102, 241, 0.2)',
  '--affine-block-selected-color': 'rgba(99, 102, 241, 0.1)',

  // Grid — Indigo
  '--affine-edgeless-grid-color': 'rgba(99, 102, 241, 0.15)',
  '--affine-edgeless-text-color': '#fafafa',

  // Border overrides
  '--affine-black-10': 'transparent',
  '--affine-black-30': 'transparent',
};

/**
 * Dark theme — FRAMELORD Brand: Pure black #000000, blue #0043ff
 * CRITICAL: Regular text is WHITE (#ffffff), only LINKS are BLUE (#0043ff)
 */
export const darkTheme: EditorThemeVariables = {
  // Background — PURE BLACK (brand palette)
  '--affine-background-primary-color': '#000000',
  '--affine-background-secondary-color': '#000000',
  '--affine-background-tertiary-color': '#0a0a0a',
  '--affine-background-overlay-panel-color': 'rgba(0, 0, 0, 0.98)',
  '--affine-background-modal-color': '#000000',
  '--affine-background-code-block': '#050505',

  // Text — High contrast for readability (WHITE for regular text)
  '--affine-text-primary-color': '#ffffff',
  '--affine-text-secondary-color': '#a1a1aa',
  '--affine-text-disable-color': '#52525b',
  '--affine-placeholder-color': '#52525b',

  // Brand — Blue accent #0043ff (for UI elements, selections, and links)
  '--affine-primary-color': '#0043ff',
  '--affine-brand-color': '#0043ff',

  // Borders — Brand palette
  '--affine-border-color': '#1c1c1c',
  '--affine-divider-color': '#1c1c1c',

  // Hover — Blue tints
  '--affine-hover-color': 'rgba(0, 67, 255, 0.08)',
  '--affine-hover-color-filled': 'rgba(0, 67, 255, 0.15)',

  // Icons — Gray tones
  '--affine-icon-color': '#a1a1aa',
  '--affine-icon-secondary': '#71717a',

  // Links — BLUE for links (separate from regular text)
  '--affine-link-color': '#0043ff',

  // Selection — Blue
  '--affine-selected-color': 'rgba(0, 67, 255, 0.2)',
  '--affine-block-selected-color': 'rgba(0, 67, 255, 0.08)',

  // Grid — Blue
  '--affine-edgeless-grid-color': 'rgba(0, 67, 255, 0.15)',
  '--affine-edgeless-text-color': '#ffffff',

  // Border overrides
  '--affine-black-10': 'transparent',
  '--affine-black-30': 'transparent',
};

/**
 * Get theme variables by name.
 */
export function getThemeVariables(theme: 'light' | 'gray' | 'dark'): EditorThemeVariables {
  if (theme === 'light') return lightTheme;
  if (theme === 'gray') return grayTheme;
  return darkTheme;
}

/**
 * Apply theme variables to an element.
 *
 * CSS custom properties naturally cascade into Shadow DOM,
 * so we just set them on the element directly.
 */
export function applyThemeToElement(
  element: HTMLElement,
  theme: 'light' | 'gray' | 'dark'
): void {
  const variables = getThemeVariables(theme);

  // Apply all CSS variables to the element
  Object.entries(variables).forEach(([key, value]) => {
    element.style.setProperty(key, value);
  });

  // Also apply to document root for maximum coverage
  // CSS variables cascade from :root into all Shadow DOMs
  Object.entries(variables).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });

  // Set the background and text color directly on the element
  element.style.background = variables['--affine-background-primary-color'];
  element.style.color = variables['--affine-text-primary-color'];

  // Set data attribute for theme (helps with CSS selectors if needed)
  element.setAttribute('data-theme', theme);
  document.documentElement.setAttribute('data-theme', theme);
}
