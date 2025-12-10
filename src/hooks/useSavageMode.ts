// =============================================================================
// USE SAVAGE MODE HOOK — React hook for Savage Mode toggle
// =============================================================================

import { useSyncExternalStore, useCallback } from 'react';
import {
  subscribe,
  getSnapshot,
  toggleSavageMode,
  enableSavageMode,
  disableSavageMode,
  getAccentColor,
  getAccentColorClass,
  getAccentBgClass,
  getAccentBorderClass,
  getSavageModePromptModifier,
} from '../stores/savageModeStore';

export interface UseSavageModeResult {
  /** Whether Savage Mode is currently enabled */
  isEnabled: boolean;
  /** Toggle Savage Mode on/off */
  toggle: () => void;
  /** Enable Savage Mode */
  enable: () => void;
  /** Disable Savage Mode */
  disable: () => void;
  /** Current accent color hex (red when savage, blue when normal) */
  accentColor: string;
  /** Tailwind class for accent text color */
  accentColorClass: string;
  /** Tailwind class for accent background */
  accentBgClass: string;
  /** Tailwind class for accent border */
  accentBorderClass: string;
  /** System prompt modifier for Little Lord */
  promptModifier: string;
}

/**
 * React hook for accessing and controlling Savage Mode.
 *
 * @example
 * ```tsx
 * const { isEnabled, toggle, accentColorClass } = useSavageMode();
 *
 * return (
 *   <button onClick={toggle} className={accentColorClass}>
 *     {isEnabled ? 'Disable Savage Mode' : 'Enable Savage Mode'}
 *   </button>
 * );
 * ```
 */
export function useSavageMode(): UseSavageModeResult {
  const isEnabled = useSyncExternalStore(subscribe, getSnapshot);

  const toggle = useCallback(() => {
    toggleSavageMode();
  }, []);

  const enable = useCallback(() => {
    enableSavageMode();
  }, []);

  const disable = useCallback(() => {
    disableSavageMode();
  }, []);

  return {
    isEnabled,
    toggle,
    enable,
    disable,
    accentColor: getAccentColor(),
    accentColorClass: getAccentColorClass(),
    accentBgClass: getAccentBgClass(),
    accentBorderClass: getAccentBorderClass(),
    promptModifier: getSavageModePromptModifier(),
  };
}
