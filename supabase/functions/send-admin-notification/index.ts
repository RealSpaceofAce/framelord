// =============================================================================
// SEND ADMIN NOTIFICATION — Supabase Edge Function
// =============================================================================
// This function sends email notifications to admins when new applications
// are submitted. It can be triggered by a database webhook or cron job.
// =============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

const ADMIN_EMAIL = 'realaaronernst@gmail.com';
const FROM_EMAIL = 'notifications@framelord.com';

interface NotificationPayload {
  id: string;
  event_type: string;
  payload: Record<string, unknown>;
  recipient_email: string;
}

// Email content templates
function getEmailContent(eventType: string, payload: Record<string, unknown>): { subject: string; html: string } {
  switch (eventType) {
    case 'BETA_APPLICATION_SUBMITTED':
      return {
        subject: `[FrameLord] New Beta Application: ${payload.name}`,
        html: `
          <h2>New Beta Application Received</h2>
          <p><strong>Name:</strong> ${payload.name}</p>
          <p><strong>Email:</strong> ${payload.email}</p>
          <p><strong>Submitted:</strong> ${new Date(payload.submitted_at as string).toLocaleString()}</p>
          ${payload.conversation_preview ? `<p><strong>First message:</strong> ${payload.conversation_preview}</p>` : ''}
          <hr />
          <p><a href="https://www.framelord.com/dashboard">View in Platform Admin</a></p>
        `,
      };

    case 'CASE_CALL_APPLICATION_SUBMITTED':
      return {
        subject: `[FrameLord] New Case Call Application: ${payload.name}`,
        html: `
          <h2>New Case Call Application Received</h2>
          <p><strong>Name:</strong> ${payload.name}</p>
          <p><strong>Email:</strong> ${payload.email}</p>
          ${payload.phone ? `<p><strong>Phone:</strong> ${payload.phone}</p>` : ''}
          <p><strong>Submitted:</strong> ${new Date(payload.submitted_at as string).toLocaleString()}</p>
          ${payload.situation_preview ? `<p><strong>Situation:</strong> ${payload.situation_preview}</p>` : ''}
          <hr />
          <p><a href="https://www.framelord.com/dashboard">View in Platform Admin</a></p>
        `,
      };

    case 'INTAKE_SESSION_COMPLETED':
      return {
        subject: `[FrameLord] Intake Completed: Session ${payload.session_id}`,
        html: `
          <h2>Intake Session Completed</h2>
          <p><strong>Session ID:</strong> ${payload.session_id}</p>
          <p><strong>Tier:</strong> ${payload.tier}</p>
          <p><strong>Completed:</strong> ${new Date(payload.completed_at as string).toLocaleString()}</p>
          <hr />
          <p><a href="https://www.framelord.com/dashboard">View in Platform Admin</a></p>
        `,
      };

    default:
      return {
        subject: `[FrameLord] Admin Notification: ${eventType}`,
        html: `
          <h2>Admin Notification</h2>
          <p><strong>Event:</strong> ${eventType}</p>
          <pre>${JSON.stringify(payload, null, 2)}</pre>
        `,
      };
  }
}

// Send via SendGrid
async function sendViaSendGrid(to: string, subject: string, html: string): Promise<boolean> {
  if (!SENDGRID_API_KEY) return false;

  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: FROM_EMAIL, name: 'FrameLord' },
        subject,
        content: [{ type: 'text/html', value: html }],
      }),
    });

    return response.ok;
  } catch (e) {
    console.error('SendGrid error:', e);
    return false;
  }
}

// Send via Resend
async function sendViaResend(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) return false;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `FrameLord <${FROM_EMAIL}>`,
        to: [to],
        subject,
        html,
      }),
    });

    return response.ok;
  } catch (e) {
    console.error('Resend error:', e);
    return false;
  }
}

serve(async (req) => {
  try {
    // Create Supabase client with service role key (bypasses RLS)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get pending notifications
    const { data: notifications, error: fetchError } = await supabase
      .from('admin_notification_log')
      .select('*')
      .eq('status', 'pending')
      .limit(10);

    if (fetchError) {
      throw new Error(`Failed to fetch notifications: ${fetchError.message}`);
    }

    if (!notifications || notifications.length === 0) {
      return new Response(JSON.stringify({ message: 'No pending notifications' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const results: { id: string; success: boolean; error?: string }[] = [];

    for (const notification of notifications as NotificationPayload[]) {
      const { subject, html } = getEmailContent(notification.event_type, notification.payload);
      const recipient = notification.recipient_email || ADMIN_EMAIL;

      // Try SendGrid first, then Resend
      let sent = await sendViaSendGrid(recipient, subject, html);
      if (!sent) {
        sent = await sendViaResend(recipient, subject, html);
      }

      // Update notification status
      const { error: updateError } = await supabase
        .from('admin_notification_log')
        .update({
          status: sent ? 'sent' : 'failed',
          sent_at: sent ? new Date().toISOString() : null,
          error_message: sent ? null : 'Failed to send via SendGrid and Resend',
        })
        .eq('id', notification.id);

      results.push({
        id: notification.id,
        success: sent,
        error: updateError?.message,
      });
    }

    return new Response(JSON.stringify({ processed: results.length, results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing notifications:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
