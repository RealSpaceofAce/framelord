// =============================================================================
// TRANSCRIPTION SERVICE — OpenAI Whisper API integration
// =============================================================================
// Transcribes audio blobs to text using OpenAI's Whisper model.
// Uses the existing provider key resolution pattern.
// =============================================================================

import { resolveApiKey } from '../lib/llm/providers';

// =============================================================================
// TYPES
// =============================================================================

export interface TranscriptionResult {
  success: boolean;
  text?: string;
  error?: string;
}

// =============================================================================
// MAIN FUNCTION
// =============================================================================

/**
 * Transcribe an audio blob to text using OpenAI Whisper.
 *
 * @param blob - Audio blob (webm, mp4, etc.)
 * @returns Transcription result with text or error
 */
export async function transcribeAudioToText(blob: Blob): Promise<TranscriptionResult> {
  try {
    // Get API key using existing provider resolution
    const apiKey = resolveApiKey('openai_text');

    if (!apiKey) {
      return {
        success: false,
        error: 'OpenAI API key not configured. Set VITE_OPENAI_API_KEY or add key in Settings.',
      };
    }

    // Create FormData for multipart upload
    const formData = new FormData();

    // Determine file extension from blob type
    const extension = blob.type.includes('webm') ? 'webm'
                    : blob.type.includes('mp4') ? 'mp4'
                    : blob.type.includes('wav') ? 'wav'
                    : 'webm'; // default

    formData.append('file', blob, `recording.${extension}`);
    formData.append('model', 'whisper-1');

    // Call OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Transcription] API error:', response.status, errorText);

      return {
        success: false,
        error: `Transcription failed: ${response.statusText}`,
      };
    }

    const data = await response.json();
    const text = data.text;

    if (typeof text !== 'string') {
      return {
        success: false,
        error: 'Invalid response from transcription service',
      };
    }

    return {
      success: true,
      text: text.trim(),
    };
  } catch (err) {
    console.error('[Transcription] Error:', err);

    return {
      success: false,
      error: err instanceof Error ? err.message : 'Transcription failed',
    };
  }
}

/**
 * Check if transcription is available (API key configured).
 */
export function isTranscriptionAvailable(): boolean {
  return resolveApiKey('openai_text') !== null;
}
