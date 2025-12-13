// =============================================================================
// OPENAI TRANSCRIBE PROXY — Vercel Serverless Function
// =============================================================================
// Proxies audio transcription requests to OpenAI Whisper API
// Keeps OPENAI_API_KEY server-side only (not exposed to browser)
// =============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface TranscribeResponse {
  text: string;
}

interface ErrorResponse {
  error: string;
}

export const config = {
  api: {
    bodyParser: false, // We need raw body for multipart/form-data
  },
};

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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error('[openai-transcribe] OPENAI_API_KEY not configured');
    res.status(500).json({ error: 'API key not configured' });
    return;
  }

  try {
    // Get content type from request
    const contentType = req.headers['content-type'] || '';

    if (!contentType.includes('multipart/form-data')) {
      res.status(400).json({ error: 'Content-Type must be multipart/form-data' });
      return;
    }

    // Collect raw body chunks
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    const body = Buffer.concat(chunks);

    // Forward to OpenAI Whisper API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': contentType,
      },
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[openai-transcribe] OpenAI API error:', response.status, errorText);
      res.status(response.status).json({
        error: `OpenAI API error: ${response.status}`
      });
      return;
    }

    const data = await response.json();

    res.status(200).json({
      text: data.text || '',
    });
  } catch (error) {
    console.error('[openai-transcribe] Unexpected error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
