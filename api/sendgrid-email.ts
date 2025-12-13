// =============================================================================
// SENDGRID EMAIL — Send emails via Vercel serverless
// =============================================================================
// Endpoint: POST https://www.framelord.com/api/sendgrid-email
// =============================================================================

import type { VercelRequest, VercelResponse } from '@vercel/node';

// =============================================================================
// CONFIGURATION
// =============================================================================

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@framelord.com';
const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || 'FrameLord';

// =============================================================================
// TYPES
// =============================================================================

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, any>;
  replyTo?: string;
}

// =============================================================================
// MAIN HANDLER
// =============================================================================

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Check SendGrid is configured
  if (!SENDGRID_API_KEY) {
    res.status(500).json({ error: 'SendGrid not configured' });
    return;
  }

  const body = req.body as EmailRequest;
  const { to, subject, html, text, templateId, dynamicTemplateData, replyTo } = body;

  // Validate required fields
  if (!to) {
    res.status(400).json({ error: 'Missing required field: to' });
    return;
  }

  // Either html/subject OR templateId must be provided
  if (!templateId && (!subject || !html)) {
    res.status(400).json({ error: 'Missing required fields: subject and html (or templateId)' });
    return;
  }

  try {
    // Build SendGrid request
    const emailData: Record<string, any> = {
      personalizations: [
        {
          to: [{ email: to }],
          ...(dynamicTemplateData && { dynamic_template_data: dynamicTemplateData }),
        },
      ],
      from: {
        email: SENDGRID_FROM_EMAIL,
        name: SENDGRID_FROM_NAME,
      },
    };

    if (templateId) {
      emailData.template_id = templateId;
    } else {
      emailData.subject = subject;
      emailData.content = [
        ...(text ? [{ type: 'text/plain', value: text }] : []),
        { type: 'text/html', value: html },
      ];
    }

    if (replyTo) {
      emailData.reply_to = { email: replyTo };
    }

    // Send via SendGrid API
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[SendGrid] API error:', response.status, errorText);
      res.status(response.status).json({ error: `SendGrid error: ${response.status}` });
      return;
    }

    // SendGrid returns 202 Accepted with no body on success
    const messageId = response.headers.get('x-message-id') || `sg-${Date.now()}`;

    console.log('[SendGrid] Email sent:', { to, subject: subject || templateId, messageId });

    res.status(200).json({
      success: true,
      messageId,
    });
  } catch (error: any) {
    console.error('[SendGrid] Error:', error);
    res.status(500).json({ error: error?.message || 'Internal error' });
  }
}
