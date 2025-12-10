// =============================================================================
// AUDIO HOOK — Manages sound effects with Web Audio API
// =============================================================================
// Generates sounds programmatically using Web Audio API to avoid external files.
// Audio only plays after user interaction to comply with browser autoplay policies.
// =============================================================================

import { useCallback, useRef, useEffect } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export type SoundId =
  | 'scan_start'
  | 'scan_hum'
  | 'scan_complete'
  | 'notification'
  | 'error'
  | 'click'
  | 'success';

interface OscillatorConfig {
  type: OscillatorType;
  frequency: number;
  duration: number;
  attack?: number;
  decay?: number;
  sustain?: number;
  release?: number;
  detune?: number;
}

// =============================================================================
// SOUND DEFINITIONS
// =============================================================================

// Sound configurations using synthesized tones
const SOUND_CONFIGS: Record<SoundId, OscillatorConfig[]> = {
  // Scan start: Rising digital beep
  scan_start: [
    { type: 'sine', frequency: 440, duration: 0.08, attack: 0.01, release: 0.02 },
    { type: 'sine', frequency: 880, duration: 0.12, attack: 0.01, release: 0.05 },
  ],
  // Scan hum: Low continuous drone
  scan_hum: [
    { type: 'sawtooth', frequency: 80, duration: 2.0, attack: 0.5, release: 0.5, sustain: 0.3 },
    { type: 'sine', frequency: 160, duration: 2.0, attack: 0.3, release: 0.3, sustain: 0.2 },
  ],
  // Scan complete: Ascending triumphant chime
  scan_complete: [
    { type: 'sine', frequency: 523.25, duration: 0.15, attack: 0.01, release: 0.08 }, // C5
    { type: 'sine', frequency: 659.25, duration: 0.15, attack: 0.01, release: 0.08 }, // E5
    { type: 'sine', frequency: 783.99, duration: 0.25, attack: 0.01, release: 0.15 }, // G5
  ],
  // Notification: Gentle ping
  notification: [
    { type: 'sine', frequency: 880, duration: 0.1, attack: 0.005, release: 0.08 },
    { type: 'sine', frequency: 1320, duration: 0.15, attack: 0.01, release: 0.1 },
  ],
  // Error: Descending buzz
  error: [
    { type: 'square', frequency: 330, duration: 0.1, attack: 0.01, release: 0.05 },
    { type: 'square', frequency: 220, duration: 0.15, attack: 0.01, release: 0.08 },
  ],
  // Click: Quick tap
  click: [
    { type: 'sine', frequency: 1000, duration: 0.03, attack: 0.001, release: 0.02 },
  ],
  // Success: Pleasant confirmation
  success: [
    { type: 'sine', frequency: 587.33, duration: 0.12, attack: 0.01, release: 0.06 }, // D5
    { type: 'sine', frequency: 880, duration: 0.2, attack: 0.01, release: 0.1 },      // A5
  ],
};

// =============================================================================
// GLOBAL STATE
// =============================================================================

let hasUserInteracted = false;
let audioContext: AudioContext | null = null;
let activeOscillators: Map<SoundId, OscillatorNode[]> = new Map();

// Get or create audio context
function getAudioContext(): AudioContext | null {
  if (!hasUserInteracted) return null;

  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }

  // Resume if suspended (browser policy)
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }

  return audioContext;
}

// Track user interaction
if (typeof window !== 'undefined') {
  const markInteracted = () => {
    hasUserInteracted = true;
    // Initialize audio context on first interaction
    getAudioContext();
  };

  window.addEventListener('click', markInteracted, { once: true });
  window.addEventListener('keydown', markInteracted, { once: true });
  window.addEventListener('touchstart', markInteracted, { once: true });
}

// =============================================================================
// SOUND GENERATION
// =============================================================================

/**
 * Create an oscillator with ADSR envelope.
 */
function createOscillator(
  ctx: AudioContext,
  config: OscillatorConfig,
  startTime: number,
  masterGain: GainNode
): OscillatorNode {
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();

  osc.type = config.type;
  osc.frequency.setValueAtTime(config.frequency, startTime);

  if (config.detune) {
    osc.detune.setValueAtTime(config.detune, startTime);
  }

  // ADSR envelope
  const attack = config.attack ?? 0.01;
  const decay = config.decay ?? 0.1;
  const sustain = config.sustain ?? 0.5;
  const release = config.release ?? 0.1;
  const peakGain = 0.3;

  gainNode.gain.setValueAtTime(0, startTime);
  gainNode.gain.linearRampToValueAtTime(peakGain, startTime + attack);
  gainNode.gain.linearRampToValueAtTime(peakGain * sustain, startTime + attack + decay);
  gainNode.gain.setValueAtTime(peakGain * sustain, startTime + config.duration - release);
  gainNode.gain.linearRampToValueAtTime(0, startTime + config.duration);

  osc.connect(gainNode);
  gainNode.connect(masterGain);

  osc.start(startTime);
  osc.stop(startTime + config.duration + 0.1);

  return osc;
}

/**
 * Play a synthesized sound.
 */
async function playSound(
  soundId: SoundId,
  options?: { volume?: number; loop?: boolean }
): Promise<void> {
  const ctx = getAudioContext();
  if (!ctx) {
    console.debug('[Audio] Waiting for user interaction before playing sound');
    return;
  }

  const volume = options?.volume ?? 0.3;
  const loop = options?.loop ?? false;
  const configs = SOUND_CONFIGS[soundId];

  if (!configs || configs.length === 0) return;

  // Create master gain for volume control
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(volume, ctx.currentTime);
  masterGain.connect(ctx.destination);

  // Calculate total duration
  let totalDuration = 0;
  let currentTime = ctx.currentTime;
  const oscillators: OscillatorNode[] = [];

  // Play each oscillator in sequence
  for (const config of configs) {
    const osc = createOscillator(ctx, config, currentTime, masterGain);
    oscillators.push(osc);

    // For scan_hum (looping drone), play simultaneously
    if (soundId === 'scan_hum') {
      continue; // All oscillators start at same time
    }

    currentTime += config.duration * 0.8; // Slight overlap for smoother transitions
    totalDuration = Math.max(totalDuration, config.duration);
  }

  // For sequential sounds, calculate total
  if (soundId !== 'scan_hum') {
    totalDuration = currentTime - ctx.currentTime + configs[configs.length - 1].duration * 0.2;
  }

  // Store oscillators for potential stopping
  activeOscillators.set(soundId, oscillators);

  // Return promise that resolves when sound completes
  return new Promise(resolve => {
    if (loop) {
      // For looping sounds, don't auto-resolve
      return;
    }

    setTimeout(() => {
      activeOscillators.delete(soundId);
      resolve();
    }, totalDuration * 1000);
  });
}

/**
 * Stop a playing sound.
 */
function stopSound(soundId: SoundId): void {
  const oscillators = activeOscillators.get(soundId);
  if (oscillators) {
    oscillators.forEach(osc => {
      try {
        osc.stop();
      } catch (e) {
        // Already stopped
      }
    });
    activeOscillators.delete(soundId);
  }
}

// =============================================================================
// HOOK
// =============================================================================

export interface UseAudioReturn {
  play: (soundId: SoundId, options?: { volume?: number; loop?: boolean }) => Promise<void>;
  stop: (soundId: SoundId) => void;
  preload: (sounds: SoundId[]) => void;
  isReady: boolean;
}

/**
 * Hook for playing sound effects using Web Audio API.
 *
 * @example
 * const { play, stop } = useAudio();
 *
 * const handleScan = async () => {
 *   await play('scan_start');
 *   play('scan_hum', { loop: true, volume: 0.2 });
 *   // ... scanning logic
 *   stop('scan_hum');
 *   await play('scan_complete');
 * };
 */
export function useAudio(): UseAudioReturn {
  const isReadyRef = useRef(hasUserInteracted);

  useEffect(() => {
    const checkReady = () => {
      isReadyRef.current = true;
    };

    if (!hasUserInteracted) {
      window.addEventListener('click', checkReady, { once: true });
      return () => window.removeEventListener('click', checkReady);
    }
  }, []);

  const play = useCallback(async (soundId: SoundId, options?: { volume?: number; loop?: boolean }) => {
    return playSound(soundId, options);
  }, []);

  const stop = useCallback((soundId: SoundId) => {
    stopSound(soundId);
  }, []);

  const preload = useCallback((_sounds: SoundId[]) => {
    // Web Audio API doesn't need preloading - sounds are generated on demand
    // This is kept for API compatibility
    getAudioContext(); // Just ensure context is ready
  }, []);

  return {
    play,
    stop,
    preload,
    isReady: isReadyRef.current,
  };
}

export default useAudio;
