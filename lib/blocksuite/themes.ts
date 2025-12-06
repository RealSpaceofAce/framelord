// =============================================================================
// BLOCKSUITE THEME DEFINITIONS — Light and Dark themes
// =============================================================================
// CSS custom properties for BlockSuite editor theming.
// These are applied directly to the editor element.
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
};

/**
 * Dark theme — Matches AFFiNE dark mode exactly
 */
export const darkTheme: EditorThemeVariables = {
  // Background — Matches AFFiNE dark theme
  '--affine-background-primary-color': '#1f1f23',
  '--affine-background-secondary-color': '#1f1f23',
  '--affine-background-tertiary-color': '#27272a',
  '--affine-background-overlay-panel-color': 'rgba(24, 24, 27, 0.98)',
  '--affine-background-modal-color': '#1f1f23',
  '--affine-background-code-block': '#1f1f23',

  // Text — High contrast for readability
  '--affine-text-primary-color': '#fafafa',
  '--affine-text-secondary-color': '#a1a1aa',
  '--affine-text-disable-color': '#52525b',
  '--affine-placeholder-color': '#52525b',

  // Brand — Indigo accent
  '--affine-primary-color': '#6366f1',
  '--affine-brand-color': '#6366f1',

  // Borders — Subtle dark
  '--affine-border-color': '#27272a',
  '--affine-divider-color': '#27272a',

  // Hover — Dark indigo tints
  '--affine-hover-color': 'rgba(99, 102, 241, 0.08)',
  '--affine-hover-color-filled': 'rgba(99, 102, 241, 0.15)',

  // Icons — Gray tones
  '--affine-icon-color': '#a1a1aa',
  '--affine-icon-secondary': '#71717a',

  // Links — Light indigo
  '--affine-link-color': '#818cf8',

  // Selection
  '--affine-selected-color': 'rgba(99, 102, 241, 0.2)',
  '--affine-block-selected-color': 'rgba(99, 102, 241, 0.08)',

  // Grid
  '--affine-edgeless-grid-color': 'rgba(99, 102, 241, 0.15)',
  '--affine-edgeless-text-color': '#fafafa',
};

/**
 * Get theme variables by name.
 */
export function getThemeVariables(theme: 'light' | 'dark'): EditorThemeVariables {
  return theme === 'light' ? lightTheme : darkTheme;
}

/**
 * Apply theme variables to an element and its shadow roots.
 */
export function applyThemeToElement(
  element: HTMLElement,
  theme: 'light' | 'dark'
): void {
  const variables = getThemeVariables(theme);

  // Apply to the element itself
  Object.entries(variables).forEach(([key, value]) => {
    element.style.setProperty(key, value);
  });

  // Also set the background directly
  element.style.background = variables['--affine-background-primary-color'];
  element.style.color = variables['--affine-text-primary-color'];

  // Set data attribute for theme (helps with CSS selectors)
  element.setAttribute('data-theme', theme);

  // Inject theme into shadow roots
  injectThemeIntoShadowRoots(element, theme);
}

/**
 * Inject theme CSS variables into shadow roots recursively.
 */
function injectThemeIntoShadowRoots(element: HTMLElement, theme: 'light' | 'dark'): void {
  const variables = getThemeVariables(theme);

  // Build CSS variable declarations
  const cssVars = Object.entries(variables)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n  ');

  // Border removal CSS for page mode - this is the critical fix
  // BlockSuite uses --affine-black-10 for note borders, so we override it
  const borderRemovalCSS = `
    /* Override the border color variable used by BlockSuite */
    :host, * {
      --affine-black-10: transparent !important;
      --affine-black-30: transparent !important;
    }

    /* Remove note block borders in page mode */
    .affine-note-block-container,
    affine-note,
    [class*="note-block"],
    [class*="note-container"],
    .note-background {
      background: transparent !important;
      border: none !important;
      border-color: transparent !important;
      border-width: 0 !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      outline: none !important;
    }

    /* Target any element with inline border styles */
    [style*="border"] {
      border: none !important;
      border-color: transparent !important;
    }

    /* Hide BlockSuite's built-in title - we have our own header */
    .affine-doc-page-block-title,
    .doc-title-container,
    [data-block-is-title="true"],
    .affine-page-root-block-title,
    affine-page-root .affine-doc-page-block-title {
      display: none !important;
    }

    /* Slash menu styling - ensure it's visible */
    .affine-slash-menu,
    affine-slash-menu,
    inner-slash-menu {
      background: var(--affine-background-modal-color, #1f1f23) !important;
      border: 1px solid var(--affine-border-color, #27272a) !important;
      border-radius: 8px !important;
      box-shadow: 0 4px 24px rgba(0, 0, 0, 0.4) !important;
      z-index: 999999 !important;
    }

    .slash-menu-item,
    .affine-slash-menu-item {
      color: var(--affine-text-primary-color, #fafafa) !important;
      padding: 8px 12px !important;
      cursor: pointer !important;
    }

    .slash-menu-item:hover,
    .affine-slash-menu-item:hover,
    .slash-menu-item.active,
    .affine-slash-menu-item.active {
      background: var(--affine-hover-color, rgba(99, 102, 241, 0.15)) !important;
    }
  `;

  const themeCSS = `
    :host, * {
      ${cssVars}
    }
    ${borderRemovalCSS}
  `;

  // Function to inject into a shadow root
  const injectIntoShadow = (shadowRoot: ShadowRoot) => {
    // Check if we already injected
    const existingStyle = shadowRoot.querySelector('#framelord-theme');
    if (existingStyle) {
      existingStyle.textContent = themeCSS;
      return;
    }

    const style = document.createElement('style');
    style.id = 'framelord-theme';
    style.textContent = themeCSS;
    shadowRoot.appendChild(style);
  };

  // Check the element itself
  if (element.shadowRoot) {
    injectIntoShadow(element.shadowRoot);
  }

  // Check all descendants
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_ELEMENT,
    null
  );

  let node: Node | null = walker.currentNode;
  while (node) {
    if (node instanceof HTMLElement && node.shadowRoot) {
      injectIntoShadow(node.shadowRoot);
      // Also recurse into the shadow root's children
      injectThemeIntoShadowRoots(node.shadowRoot as unknown as HTMLElement, theme);
    }
    node = walker.nextNode();
  }

  // Set up a mutation observer to catch dynamically added shadow roots
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      for (const addedNode of mutation.addedNodes) {
        if (addedNode instanceof HTMLElement) {
          if (addedNode.shadowRoot) {
            injectIntoShadow(addedNode.shadowRoot);
          }
          // Check children too
          const descendants = addedNode.querySelectorAll('*');
          descendants.forEach((desc) => {
            if (desc instanceof HTMLElement && desc.shadowRoot) {
              injectIntoShadow(desc.shadowRoot);
            }
          });
        }
      }
    }
  });

  observer.observe(element, { childList: true, subtree: true });

  // Store observer reference for cleanup (optional)
  (element as any).__themeObserver = observer;
}
