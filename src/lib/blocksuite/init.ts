// =============================================================================
// BLOCKSUITE INITIALIZATION — Shared initialization for all BlockSuite editors
// =============================================================================
// This module ensures BlockSuite effects are only initialized ONCE globally,
// preventing "Cannot define multiple custom elements with the same tag name" errors.
// =============================================================================

import { effects as blocksEffects } from '@blocksuite/blocks/effects';
import { effects as presetsEffects } from '@blocksuite/presets/effects';

// Global flag - shared across all editor instances
let initialized = false;

/**
 * Initialize BlockSuite effects (registers web components).
 * Safe to call multiple times - will only execute once.
 */
export function initializeBlockSuite(): void {
  if (initialized) {
    console.log('[BlockSuite] Already initialized, skipping...');
    return;
  }

  try {
    console.log('[BlockSuite] Initializing effects...');
    blocksEffects();
    presetsEffects();
    initialized = true;
    console.log('[BlockSuite] ✓ Effects initialized successfully');
  } catch (error) {
    // Check if it's the "already defined" error - that's actually OK
    if (error instanceof Error && error.message.includes('custom elements')) {
      console.warn('[BlockSuite] Custom elements already registered (this is OK)');
      initialized = true;
    } else {
      console.error('[BlockSuite] Initialization error:', error);
      throw error;
    }
  }
}

/**
 * Check if BlockSuite has been initialized.
 */
export function isBlockSuiteInitialized(): boolean {
  return initialized;
}
