// =============================================================================
// GEMINI CHAT PROXY — Vercel Serverless Function
// =============================================================================
// Proxies chat requests to Google Gemini API
// Keeps GEMINI_API_KEY server-side only (not exposed to browser)
// =============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ChatMessage {
  role: 'user' | 'model';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  systemInstruction?: string;
  model?: string;
  temperature?: number;
}

interface ChatResponse {
  text: string;
  model: string;
}

interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse<ChatResponse | ErrorResponse>
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get API key from server environment
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('[gemini-chat] GEMINI_API_KEY not configured');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const {
      messages,
      systemInstruction,
      model = 'gemini-2.0-flash',
      temperature = 0.7,
    } = req.body as ChatRequest;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array required' });
    }

    // Convert messages to Gemini format
    const contents = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    // Build request body
    const requestBody: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 8192,
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
      console.error('[gemini-chat] Gemini API error:', response.status, errorText);
      return res.status(response.status).json({
        error: `Gemini API error: ${response.status}`
      });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return res.status(200).json({
      text,
      model,
    });
  } catch (error) {
    console.error('[gemini-chat] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
