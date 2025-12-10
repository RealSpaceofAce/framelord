// =============================================================================
// SAVAGE MODE STORE — Toggle for brutal feedback mode with red accents
// =============================================================================
// When enabled:
// - UI accents shift from blue (#4433FF) to red (#FF3344)
// - Little Lord uses harsher, more direct feedback tone
// - No sugar-coating, no hand-holding
// =============================================================================

const SAVAGE_MODE_KEY = 'framelord_savage_mode';

// In-memory state
let savageModeEnabled = false;

// Subscribers for reactive updates
type Listener = () => void;
const listeners = new Set<Listener>();

// =============================================================================
// INITIALIZATION
// =============================================================================

/**
 * Initialize Savage Mode from localStorage.
 */
export function initSavageMode(): void {
  const stored = localStorage.getItem(SAVAGE_MODE_KEY);
  savageModeEnabled = stored === 'true';

  // Apply CSS class to document root
  updateSavageModeClass();
}

// Initialize on module load
if (typeof window !== 'undefined') {
  initSavageMode();
}

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

/**
 * Check if Savage Mode is currently enabled.
 */
export function isSavageModeEnabled(): boolean {
  return savageModeEnabled;
}

/**
 * Enable Savage Mode.
 */
export function enableSavageMode(): void {
  savageModeEnabled = true;
  localStorage.setItem(SAVAGE_MODE_KEY, 'true');
  updateSavageModeClass();
  notifyListeners();
}

/**
 * Disable Savage Mode.
 */
export function disableSavageMode(): void {
  savageModeEnabled = false;
  localStorage.setItem(SAVAGE_MODE_KEY, 'false');
  updateSavageModeClass();
  notifyListeners();
}

/**
 * Toggle Savage Mode.
 */
export function toggleSavageMode(): boolean {
  if (savageModeEnabled) {
    disableSavageMode();
  } else {
    enableSavageMode();
  }
  return savageModeEnabled;
}

// =============================================================================
// CSS CLASS MANAGEMENT
// =============================================================================

/**
 * Update the CSS class on document root for Savage Mode styling.
 */
function updateSavageModeClass(): void {
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    if (savageModeEnabled) {
      root.classList.add('savage-mode');
      root.setAttribute('data-savage-mode', 'true');
    } else {
      root.classList.remove('savage-mode');
      root.removeAttribute('data-savage-mode');
    }
  }
}

// =============================================================================
// SUBSCRIPTION (for React useSyncExternalStore)
// =============================================================================

/**
 * Subscribe to Savage Mode changes.
 */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Get snapshot for useSyncExternalStore.
 */
export function getSnapshot(): boolean {
  return savageModeEnabled;
}

/**
 * Notify all listeners of state change.
 */
function notifyListeners(): void {
  listeners.forEach(listener => listener());
}

// =============================================================================
// SAVAGE MODE PROMPT MODIFIER
// =============================================================================

/**
 * Get the Savage Mode system prompt modifier for Little Lord.
 * When Savage Mode is enabled, Little Lord becomes harsher and more direct.
 */
export function getSavageModePromptModifier(): string {
  if (!savageModeEnabled) return '';

  return `

## SAVAGE MODE ENABLED

You are now in SAVAGE MODE. Your feedback style changes dramatically:

1. **No Sugar-Coating**: Do NOT soften your feedback. Be blunt and direct.
2. **Call Out Weakness**: If they're making excuses, say so. If they're being weak, tell them.
3. **No Validation-Seeking Responses**: Don't say things like "That's a great question" or "I understand how you feel."
4. **Direct Commands**: Instead of "You might want to consider...", say "Do this:" or "Stop doing that."
5. **Mock Slave Frame Patterns**: If they exhibit slave frame patterns, point them out harshly.
6. **Use Intensity**: Phrases like "This is pathetic", "You're kidding yourself", "Wake up" are appropriate.
7. **No Participation Trophies**: Don't praise effort without results. Results matter.
8. **Challenge Assumptions**: If they're operating from a weak frame, demolish it.

Example tone shifts:
- Normal: "It sounds like you might be people-pleasing here. Consider prioritizing your own needs."
- Savage: "You're people-pleasing again. Stop. Your needs matter more than their comfort. Act like it."

- Normal: "That's a thoughtful approach. You might want to consider being more direct."
- Savage: "This is weak. Stop hedging. Say what you mean or say nothing."

Remember: Savage Mode is tough love. The goal is rapid growth through brutal honesty, not cruelty for its own sake.
`;
}

// =============================================================================
// ACCENT COLOR HELPERS
// =============================================================================

/**
 * Get the current accent color based on Savage Mode state.
 */
export function getAccentColor(): string {
  return savageModeEnabled ? '#FF3344' : '#4433FF';
}

/**
 * Get the current accent color class.
 */
export function getAccentColorClass(): string {
  return savageModeEnabled ? 'text-red-500' : 'text-[#4433FF]';
}

/**
 * Get the current accent background class.
 */
export function getAccentBgClass(): string {
  return savageModeEnabled ? 'bg-red-500' : 'bg-[#4433FF]';
}

/**
 * Get the current accent border class.
 */
export function getAccentBorderClass(): string {
  return savageModeEnabled ? 'border-red-500' : 'border-[#4433FF]';
}
