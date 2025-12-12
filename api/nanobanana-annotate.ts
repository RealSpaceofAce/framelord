// =============================================================================
// NANOBANANA ANNOTATE PROXY — Vercel Serverless Function
// =============================================================================
// Proxies image annotation requests to NanoBanana API
// Keeps NANOBANANA_API_KEY server-side only (not exposed to browser)
// =============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

interface AnnotateRequest {
  imageUrl?: string;
  imageBase64?: string;
  prompt?: string;
}

interface AnnotateResponse {
  annotations: unknown;
}

interface ErrorResponse {
  error: string;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse<AnnotateResponse | ErrorResponse>
) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get API key from server environment
  const apiKey = process.env.NANOBANANA_API_KEY;
  if (!apiKey) {
    console.error('[nanobanana-annotate] NANOBANANA_API_KEY not configured');
    return res.status(500).json({ error: 'API key not configured' });
  }

  try {
    const { imageUrl, imageBase64, prompt } = req.body as AnnotateRequest;

    if (!imageUrl && !imageBase64) {
      return res.status(400).json({ error: 'imageUrl or imageBase64 required' });
    }

    // Build request to NanoBanana API
    const requestBody: Record<string, unknown> = {};

    if (imageUrl) {
      requestBody.image_url = imageUrl;
    } else if (imageBase64) {
      requestBody.image_base64 = imageBase64;
    }

    if (prompt) {
      requestBody.prompt = prompt;
    }

    const response = await fetch('https://api.nanobanana.com/v1/annotate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[nanobanana-annotate] NanoBanana API error:', response.status, errorText);
      return res.status(response.status).json({
        error: `NanoBanana API error: ${response.status}`
      });
    }

    const data = await response.json();

    return res.status(200).json({
      annotations: data,
    });
  } catch (error) {
    console.error('[nanobanana-annotate] Unexpected error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
