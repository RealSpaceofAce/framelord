// =============================================================================
// TRANSCRIPTION HELPER — Audio file transcription for Frame Canvas
// =============================================================================
// Provides a placeholder transcription function that can be wired to a real
// backend service (e.g., OpenAI Whisper, Google Speech-to-Text) later.
// =============================================================================

/**
 * Transcription result
 */
export interface TranscriptionResult {
  success: boolean;
  text?: string;
  error?: string;
  duration?: number; // seconds
}

/**
 * Supported audio MIME types
 */
export const SUPPORTED_AUDIO_TYPES = [
  'audio/mp3',
  'audio/mpeg',
  'audio/mp4',
  'audio/m4a',
  'audio/wav',
  'audio/webm',
  'audio/ogg',
];

/**
 * Check if a file is a supported audio type
 */
export function isAudioFile(file: File): boolean {
  const type = file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  // Check MIME type
  if (SUPPORTED_AUDIO_TYPES.includes(type)) return true;
  
  // Fallback to extension check
  const audioExtensions = ['mp3', 'm4a', 'wav', 'webm', 'ogg', 'mp4', 'mpeg'];
  return audioExtensions.includes(extension || '');
}

/**
 * Check if a file is an image
 */
export function isImageFile(file: File): boolean {
  return file.type.startsWith('image/');
}

/**
 * Transcribe an audio file
 * 
 * BACKEND TODO: Replace this placeholder with a real transcription service call.
 * Options include:
 * - OpenAI Whisper API: POST /audio/transcriptions
 * - Google Cloud Speech-to-Text
 * - AWS Transcribe
 * - AssemblyAI
 * 
 * The implementation should:
 * 1. Upload the audio file to the transcription service
 * 2. Wait for processing (may involve polling for longer files)
 * 3. Return the transcribed text
 */
export async function transcribeAudio(file: File): Promise<TranscriptionResult> {
  // Validate file type
  if (!isAudioFile(file)) {
    return {
      success: false,
      error: `Unsupported audio format: ${file.type || 'unknown'}`,
    };
  }

  // BACKEND TODO: Replace this simulation with actual API call
  // Example with OpenAI:
  // const formData = new FormData();
  // formData.append('file', file);
  // formData.append('model', 'whisper-1');
  // const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
  //   method: 'POST',
  //   headers: { 'Authorization': `Bearer ${API_KEY}` },
  //   body: formData
  // });
  // const result = await response.json();
  // return { success: true, text: result.text };

  console.log('[TranscriptionHelper] Simulating transcription for:', file.name);

  // Simulate processing delay (1-3 seconds)
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1500));

  // Return placeholder text indicating transcription would occur
  const placeholderText = `[Transcription of "${file.name}" would appear here]

This is a placeholder. To enable real transcription:
1. Set up a transcription service (e.g., OpenAI Whisper)
2. Configure API credentials in environment
3. Update transcriptionHelper.ts to call the API

Audio file details:
- Name: ${file.name}
- Size: ${(file.size / 1024).toFixed(1)} KB
- Type: ${file.type || 'unknown'}`;

  return {
    success: true,
    text: placeholderText,
    duration: Math.round(file.size / 16000), // Rough estimate
  };
}

/**
 * Read a file as a Data URL (for images)
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

