// =============================================================================
// HEALTH CHECK — Smoke test endpoint for www.framelord.com
// =============================================================================
// Endpoint: GET https://www.framelord.com/api/health
//
// Returns status of all configured services.
// Use this for uptime monitoring and deployment verification.
// =============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

// =============================================================================
// SERVICE CHECKS
// =============================================================================

interface ServiceStatus {
  configured: boolean;
  status: 'ok' | 'missing' | 'invalid';
  details?: string;
}

function checkStripe(): ServiceStatus {
  const secretKey = process.env.STRIPE_SECRET_KEY || '';
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  if (!secretKey) {
    return { configured: false, status: 'missing', details: 'STRIPE_SECRET_KEY not set' };
  }

  if (!secretKey.startsWith('sk_')) {
    return { configured: false, status: 'invalid', details: 'STRIPE_SECRET_KEY invalid format' };
  }

  if (!webhookSecret) {
    return { configured: true, status: 'ok', details: 'Webhook secret not set (optional for basic ops)' };
  }

  return { configured: true, status: 'ok' };
}

function checkOpenAI(): ServiceStatus {
  const apiKey = process.env.OPENAI_API_KEY || '';

  if (!apiKey) {
    return { configured: false, status: 'missing', details: 'OPENAI_API_KEY not set' };
  }

  if (!apiKey.startsWith('sk-')) {
    return { configured: false, status: 'invalid', details: 'OPENAI_API_KEY invalid format' };
  }

  return { configured: true, status: 'ok' };
}

function checkGemini(): ServiceStatus {
  const apiKey = process.env.GOOGLE_API_KEY || '';

  if (!apiKey) {
    return { configured: false, status: 'missing', details: 'GOOGLE_API_KEY not set' };
  }

  return { configured: true, status: 'ok' };
}

function checkTwilio(): ServiceStatus {
  const accountSid = process.env.TWILIO_ACCOUNT_SID || '';
  const authToken = process.env.TWILIO_AUTH_TOKEN || '';
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER || '';

  if (!accountSid || !authToken || !phoneNumber) {
    const missing = [];
    if (!accountSid) missing.push('TWILIO_ACCOUNT_SID');
    if (!authToken) missing.push('TWILIO_AUTH_TOKEN');
    if (!phoneNumber) missing.push('TWILIO_PHONE_NUMBER');
    return { configured: false, status: 'missing', details: `Missing: ${missing.join(', ')}` };
  }

  if (!accountSid.startsWith('AC')) {
    return { configured: false, status: 'invalid', details: 'TWILIO_ACCOUNT_SID should start with AC' };
  }

  return { configured: true, status: 'ok' };
}

function checkSendGrid(): ServiceStatus {
  const apiKey = process.env.SENDGRID_API_KEY || '';
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || '';

  if (!apiKey) {
    return { configured: false, status: 'missing', details: 'SENDGRID_API_KEY not set' };
  }

  if (!fromEmail) {
    return { configured: true, status: 'ok', details: 'SENDGRID_FROM_EMAIL not set (will use default)' };
  }

  return { configured: true, status: 'ok' };
}

function checkSupabase(): ServiceStatus {
  const url = process.env.SUPABASE_URL || '';
  const apiKey = process.env.SUPABASE_API_KEY || process.env.SUPABASE_ANON_KEY || '';

  if (!url || !apiKey) {
    const missing = [];
    if (!url) missing.push('SUPABASE_URL');
    if (!apiKey) missing.push('SUPABASE_API_KEY');
    return { configured: false, status: 'missing', details: `Missing: ${missing.join(', ')}` };
  }

  return { configured: true, status: 'ok' };
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Allow GET and HEAD
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader('Allow', 'GET, HEAD');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const services = {
    stripe: checkStripe(),
    openai: checkOpenAI(),
    gemini: checkGemini(),
    twilio: checkTwilio(),
    sendgrid: checkSendGrid(),
    supabase: checkSupabase(),
  };

  const allConfigured = Object.values(services).every(s => s.configured);
  const criticalOk = services.stripe.configured &&
                     (services.openai.configured || services.gemini.configured);

  const response = {
    status: criticalOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || 'local',
    environment: process.env.VERCEL_ENV || 'development',
    domain: 'www.framelord.com',
    services,
    summary: {
      total: Object.keys(services).length,
      configured: Object.values(services).filter(s => s.configured).length,
      allConfigured,
      criticalOk,
    },
  };

  // Return 200 if critical services ok, 503 if degraded
  const statusCode = criticalOk ? 200 : 503;

  res.status(statusCode).json(response);
}
