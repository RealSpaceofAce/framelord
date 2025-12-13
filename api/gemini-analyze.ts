// =============================================================================
// GEMINI ANALYZE PROXY — Vercel Serverless Function
// =============================================================================
// Proxies frame analysis requests to Google Gemini API
// Keeps GEMINI_API_KEY server-side only (not exposed to browser)
// Supports text, image, and audio analysis
// =============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface AnalyzeRequest {
  prompt: string;
  systemInstruction?: string;
  model?: string;
  mediaBase64?: string;
  mediaMimeType?: string;
}

interface AnalyzeResponse {
  text: string;
  model: string;
}

interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Get API key from server environment
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error('[gemini-analyze] GEMINI_API_KEY not configured');
    res.status(500).json({ error: 'API key not configured' });
    return;
  }

  try {
    const {
      prompt,
      systemInstruction,
      model = 'gemini-2.0-flash',
      mediaBase64,
      mediaMimeType,
    } = req.body as AnalyzeRequest;

    if (!prompt) {
      res.status(400).json({ error: 'prompt required' });
      return;
    }

    // Build parts array for the content
    const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [];

    // Add media content first if present (Gemini expects media before text)
    if (mediaBase64 && mediaMimeType) {
      parts.push({
        inlineData: {
          mimeType: mediaMimeType,
          data: mediaBase64,
        },
      });
    }

    // Add text prompt
    parts.push({ text: prompt });

    // Build contents array
    const contents = [
      {
        role: 'user',
        parts,
      },
    ];

    // Build request body
    const requestBody: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: 0.1,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
      },
    };

    // Add system instruction if provided
    if (systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: systemInstruction }],
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[gemini-analyze] Gemini API error:', response.status, errorText);
      res.status(response.status).json({
        error: `Gemini API error: ${response.status}`
      });
      return;
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    res.status(200).json({
      text,
      model,
    });
  } catch (error) {
    console.error('[gemini-analyze] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
