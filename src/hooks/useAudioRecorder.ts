// =============================================================================
// AUDIO RECORDER HOOK — MediaRecorder API wrapper for audio recording
// =============================================================================
// Manages microphone access, recording state, and blob generation.
// Used for voice-to-text transcription across FrameScan, Little Lord, and Notes.
// =============================================================================

import { useState, useRef, useCallback } from 'react';

// =============================================================================
// TYPES
// =============================================================================

export interface UseAudioRecorderResult {
  isRecording: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  error: string | null;
  clearError: () => void;
}

// =============================================================================
// HOOK
// =============================================================================

/**
 * Hook for recording audio using the MediaRecorder API.
 *
 * @example
 * const { isRecording, startRecording, stopRecording, error } = useAudioRecorder();
 *
 * const handleRecord = async () => {
 *   if (!isRecording) {
 *     await startRecording();
 *   } else {
 *     const audioBlob = await stopRecording();
 *     if (audioBlob) {
 *       // Send to transcription service
 *     }
 *   }
 * };
 */
export function useAudioRecorder(): UseAudioRecorderResult {
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      setError(null);

      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Create MediaRecorder with supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      // Collect audio chunks
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      // Handle errors
      mediaRecorder.onerror = (e: Event) => {
        console.error('[AudioRecorder] Recording error:', e);
        setError('Recording failed');
        setIsRecording(false);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('[AudioRecorder] Failed to start recording:', err);

      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Microphone permission denied');
      } else if (err instanceof Error && err.name === 'NotFoundError') {
        setError('No microphone found');
      } else {
        setError('Could not access microphone');
      }

      setIsRecording(false);
    }
  }, []);

  const stopRecording = useCallback(async (): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      mediaRecorder.onstop = () => {
        // Create blob from chunks
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });

        // Stop all tracks to release microphone
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        setIsRecording(false);
        mediaRecorderRef.current = null;
        chunksRef.current = [];

        resolve(blob);
      };

      mediaRecorder.stop();
    });
  }, []);

  return {
    isRecording,
    startRecording,
    stopRecording,
    error,
    clearError,
  };
}

export default useAudioRecorder;
