// =============================================================================
// TRANSCRIPTION SERVICE — OpenAI Whisper API via Vercel proxy
// =============================================================================
// Transcribes audio blobs to text via /api/openai-transcribe serverless function.
// API keys are kept server-side only.
// =============================================================================

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
 * Transcribe an audio blob to text using OpenAI Whisper via proxy.
 *
 * @param blob - Audio blob (webm, mp4, etc.)
 * @returns Transcription result with text or error
 */
export async function transcribeAudioToText(blob: Blob): Promise<TranscriptionResult> {
  try {
    // Create FormData for multipart upload
    const formData = new FormData();

    // Determine file extension from blob type
    const extension = blob.type.includes('webm') ? 'webm'
                    : blob.type.includes('mp4') ? 'mp4'
                    : blob.type.includes('wav') ? 'wav'
                    : 'webm'; // default

    formData.append('file', blob, `recording.${extension}`);
    formData.append('model', 'whisper-1');

    // Call Vercel proxy (which handles API key server-side)
    const response = await fetch('/api/openai-transcribe', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error('[Transcription] API error:', response.status, data.error);

      return {
        success: false,
        error: `Transcription failed: ${data.error || response.statusText}`,
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
 * Check if transcription is available.
 * In production, always true since API key is server-side.
 * The actual availability check happens when the call is made.
 */
export function isTranscriptionAvailable(): boolean {
  return true;
}
