// =============================================================================
// GEMINI SERVICE — Frame analysis and chat via Vercel proxy
// =============================================================================
// Calls /api/gemini-analyze and /api/gemini-chat serverless functions.
// API keys are kept server-side only (no @google/genai SDK in browser).
// =============================================================================

import { FrameAnalysisResult, ChatMessage } from "../../types";

// =============================================================================
// FRAME ANALYSIS
// =============================================================================

/**
 * Analyze text, image, or audio for Frame Control dynamics via Gemini.
 *
 * @param text - Text to analyze or context for media
 * @param mediaBase64 - Optional base64-encoded image or audio
 * @param mimeType - MIME type of the media (e.g., 'image/jpeg', 'audio/webm')
 * @returns Frame analysis result with scores and corrections
 * @throws Error if the API call fails
 */
export const analyzeFrame = async (
  text: string,
  mediaBase64?: string,
  mimeType?: string
): Promise<FrameAnalysisResult> => {
  // Build the appropriate prompt based on input type
  let prompt = "";
  let mediaContent: { base64: string; mimeType: string } | undefined;

  if (mediaBase64 && mimeType) {
    mediaContent = { base64: mediaBase64, mimeType };

    if (mimeType.startsWith('audio/')) {
      prompt = `Analyze this audio recording for 'Vocal Frame' dynamics.
${text ? `User Context/Tags: "${text}"` : ""}

Evaluate: Tonality, Pace, Pauses, Confidence, Interruptions.

Return a JSON object with:
- score (0-100)
- subscores (authority, magnetism, boundaries, energy, clarity, emotional_tone, brand_congruence, sales_strength)
- critical_signal: { title, description, quotes (from audio) }
- corrections: List of 3-5 specific vocal adjustments.
- transcription: A full transcript of the audio.
`;
    } else {
      prompt = `Analyze this image for 'Visual Frame' dynamics.
${text ? `User Context/Tags: "${text}"` : ""}

Evaluate: Posture, Orientation, Eye Level, Space Usage.

Return a JSON object with:
- score (0-100)
- subscores (authority, magnetism, boundaries, energy, clarity, emotional_tone, brand_congruence, sales_strength)
- critical_signal: { title (e.g. "Slouched Posture"), description, quotes (use descriptions of visual elements like "Rounded shoulders") }
- corrections: List of 3-5 specific physical adjustments.
`;
    }
  } else {
    prompt = `Analyze the following text for Frame Control.

Input Text: "${text}"

The user may use CRM tags:
- @Name (Specific Contact)
- /Context (e.g., /SalesCall, /Email, /Date)

Use these tags to inform the context.

Return a JSON object with:
1. score (0-100)
2. subscores (0-100 for: authority, magnetism, boundaries, energy, clarity, emotional_tone, brand_congruence, sales_strength)
3. critical_signal: {
     title: Short alert (e.g. "Apologetic Framing"),
     description: 1 sentence explanation,
     quotes: Array of exact substrings from the text that are weak.
   }
4. corrections: Array of 3-5 short, imperative commands to fix the frame (e.g., "Remove 'just'", "State price directly").
`;
  }

  // Build request body
  const requestBody: Record<string, unknown> = {
    prompt,
    model: 'gemini-2.5-flash',
  };

  // Add media content if present
  if (mediaContent) {
    requestBody.mediaBase64 = mediaContent.base64;
    requestBody.mediaMimeType = mediaContent.mimeType;
  }

  // Call Vercel proxy
  const res = await fetch("/api/gemini-analyze", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(
      `Gemini analysis failed: ${res.status} - ${data.error || res.statusText}`
    );
  }

  const data = await res.json();

  // Parse the JSON response from Gemini
  try {
    const result = JSON.parse(data.text) as FrameAnalysisResult;
    return result;
  } catch {
    throw new Error("Failed to parse Gemini analysis response as JSON");
  }
};

// =============================================================================
// APPLICATION CHAT
// =============================================================================

/**
 * Submit a message to the coaching application chat.
 *
 * @param history - Previous chat messages
 * @param newUserMessage - New message from the applicant
 * @returns AI response text
 */
export const submitApplicationChat = async (
  history: ChatMessage[],
  newUserMessage: string
): Promise<string> => {
  const systemInstruction = `You are the Senior Case Officer evaluating applicants for an elite coaching program. Be direct, professional, and probe for genuine commitment. Do not accept surface-level answers.`;

  const messages = history.map(m => ({
    role: m.role === 'user' ? 'user' as const : 'model' as const,
    content: m.content,
  }));

  messages.push({ role: 'user' as const, content: newUserMessage });

  const res = await fetch("/api/gemini-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      systemInstruction,
      model: 'gemini-2.0-flash',
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error('[ApplicationChat] Error:', data.error);
    return "Connection interrupted. Please try again.";
  }

  const data = await res.json();
  return data.text || "No response received.";
};

// =============================================================================
// BETA APPLICATION CHAT
// =============================================================================

/**
 * Submit a message to the beta program application chat.
 *
 * @param history - Previous chat messages
 * @param newUserMessage - New message from the user
 * @returns AI response text
 */
export const submitBetaApplicationChat = async (
  history: ChatMessage[],
  newUserMessage: string
): Promise<string> => {
  const systemInstruction = `You are the Beta Program Director evaluating candidates for early access to the FrameLord platform. Assess technical aptitude, use case fit, and commitment level. Be professional but approachable.`;

  const messages = history.map(m => ({
    role: m.role === 'user' ? 'user' as const : 'model' as const,
    content: m.content,
  }));

  messages.push({ role: 'user' as const, content: newUserMessage });

  const res = await fetch("/api/gemini-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages,
      systemInstruction,
      model: 'gemini-2.0-flash',
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: "Unknown error" }));
    console.error('[BetaChat] Error:', data.error);
    return "Connection interrupted. Please try again.";
  }

  const data = await res.json();
  return data.text || "No response received.";
};
