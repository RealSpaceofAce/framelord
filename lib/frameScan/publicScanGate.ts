// =============================================================================
// PUBLIC SCAN GATE — One free scan per browser for non-authenticated users
// =============================================================================
// Uses localStorage to track whether the user has used their free public scan.
// This is a simple client-side gate. Not tamper-proof, but sufficient for
// limiting casual usage and encouraging signups.
// =============================================================================

const PUBLIC_SCAN_FLAG_KEY = 'framelord_public_scan_used';

/**
 * Check if the user has already used their free public scan
 */
export function hasUsedPublicScan(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(PUBLIC_SCAN_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Mark that the user has used their free public scan
 */
export function markPublicScanUsed(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PUBLIC_SCAN_FLAG_KEY, '1');
  } catch {
    // localStorage may be blocked in some browsers
  }
}

/**
 * Reset the public scan flag (for testing purposes only)
 */
export function resetPublicScanFlag(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(PUBLIC_SCAN_FLAG_KEY);
  } catch {
    // ignore
  }
}

