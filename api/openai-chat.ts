// =============================================================================
// OPENAI CHAT PROXY — Vercel Serverless Function
// =============================================================================
// Proxies chat completion requests to OpenAI API
// Keeps OPENAI_API_KEY server-side only (not exposed to browser)
// =============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  model?: string;
  messages: ChatMessage[];
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

  // Get API key from server environment (NOT client-exposed VITE_*)
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[openai-chat] OPENAI_API_KEY not configured');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { model = 'gpt-4o-mini', messages, temperature = 0.1 } = req.body as ChatRequest;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array required' });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[openai-chat] OpenAI API error:', response.status, errorText);
      return res.status(response.status).json({
        error: `OpenAI API error: ${response.status}`
      });
    }

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || '';

    return res.status(200).json({
      text,
      model: data.model || model,
    });
  } catch (error) {
    console.error('[openai-chat] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
