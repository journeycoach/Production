import crypto from 'crypto';
import { sql } from '../_db.js';
import { Resend } from 'resend';
import { runMigrations } from '../_migrate.js';

// Disable Vercel's automatic body parsing so we can read the raw bytes
// needed for HMAC signature verification.
export const config = { api: { bodyParser: false } };

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Verify Calendly HMAC-SHA256 webhook signature.
// Header format: "t=<timestamp>,v1=<hex-sig>"
// Calendly signs: "<timestamp>.<raw-body-string>"
function verifySignature(rawBody, headers) {
  const secret = process.env.CALENDLY_WEBHOOK_SECRET;
  if (!secret) return true; // not configured — skip verification in dev

  const sigHeader = headers['calendly-webhook-signature'] || '';
  const parts = Object.fromEntries(sigHeader.split(',').map(p => {
    const idx = p.indexOf('=');
    return [p.slice(0, idx), p.slice(idx + 1)];
  }));
  const timestamp = parts.t;
  const received  = parts.v1;
  if (!timestamp || !received) return false;

  // Reject messages older than 5 minutes
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const payload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  try {
    const receivedBuf = Buffer.from(received, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (receivedBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(receivedBuf, expectedBuf);
  } catch {
    return false;
  }
}

function buildPrepEmail(firstName, resultCenter) {
  const centerNote = resultCenter
    ? `<p style="margin:0 0 1.2rem;">Based on your Hidden Ceiling assessment, you lead from the <strong style="color:#c7a96b;">${escapeHtml(resultCenter)}</strong> center. I'll use that as a starting point for our conversation.</p>`
    : '';

  return `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;background:#f5f1eb;font-family:Inter,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f1eb;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%;">
      <tr><td style="background:#1a2332;padding:32px 40px;text-align:center;">
        <p style="margin:0;font-size:0.85rem;letter-spacing:0.12em;text-transform:uppercase;color:#c7a96b;font-weight:600;">Your Journey Coach</p>
      </td></tr>
      <tr><td style="padding:40px;">
        <h1 style="font-family:Georgia,serif;font-size:1.6rem;color:#1a2332;margin:0 0 1rem;line-height:1.3;">Looking forward to our call, ${escapeHtml(firstName)}.</h1>
        <p style="color:#4a5568;line-height:1.7;margin:0 0 1.2rem;">Your assessment call is confirmed. Here is a quick note on how to make the most of it.</p>
        ${centerNote}
        <p style="color:#4a5568;line-height:1.7;margin:0 0 1.2rem;">Before we talk, take a few minutes to reflect on these questions:</p>
        <ul style="color:#4a5568;line-height:1.8;padding-left:1.25rem;margin:0 0 1.5rem;">
          <li>Where do you feel most stuck or most limited in your leadership right now?</li>
          <li>What would it look like if that changed in the next 6 months?</li>
          <li>Is there a specific decision, relationship, or dynamic that keeps coming up?</li>
        </ul>
        <p style="color:#4a5568;line-height:1.7;margin:0 0 2rem;">There are no right answers — just come as you are. This is a conversation, not an evaluation.</p>
        <p style="color:#4a5568;line-height:1.7;margin:0;">See you soon,<br><strong style="color:#1a2332;">John Paine</strong><br><span style="font-size:0.85rem;color:#718096;">Your Journey Coach</span></p>
      </td></tr>
      <tr><td style="padding:24px 40px;background:#f5f1eb;text-align:center;border-top:1px solid #e8e0d4;">
        <p style="margin:0;font-size:0.78rem;color:#718096;">Your Journey Coach · <a href="https://www.journeycoach.co" style="color:#c7a96b;text-decoration:none;">journeycoach.co</a></p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Read raw body before parsing (bodyParser is disabled above)
  let rawBody;
  let body;
  try {
    rawBody = await readRawBody(req);
    body = JSON.parse(rawBody.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON body' });
  }

  // Verify Calendly signature against the true raw bytes
  if (!verifySignature(rawBody, req.headers)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  const { event, payload } = body || {};

  // Only process new bookings; acknowledge everything else silently
  if (event !== 'invitee.created') {
    return res.status(200).json({ ok: true, ignored: true });
  }

  const rawEmail = payload?.email || payload?.invitee?.email || '';
  const email = rawEmail.toLowerCase().trim();
  if (!email) return res.status(400).json({ error: 'No email in payload' });

  const inviteeName = payload?.name || payload?.invitee?.name || '';
  const firstName = escapeHtml((inviteeName.trim().split(' ')[0] || 'there'));

  try {
    await runMigrations();

    // Mark booked in both tables (no-op if already booked)
    const now = new Date().toISOString();
    await sql`
      UPDATE subscribers
      SET has_booked_call = true, booked_call_at = ${now}
      WHERE LOWER(email) = ${email} AND (has_booked_call IS NOT TRUE)
    `;
    await sql`
      UPDATE contact_submissions
      SET has_booked_call = true, booked_call_at = ${now}
      WHERE LOWER(email) = ${email} AND (has_booked_call IS NOT TRUE)
    `;

    // Fetch subscriber details for personalization
    const [sub] = await sql`
      SELECT name, result_center FROM subscribers WHERE LOWER(email) = ${email} LIMIT 1
    `;
    const resultCenter = sub?.result_center || null;
    const displayName  = sub?.name?.trim().split(' ')[0] || firstName;

    // Send prep email
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: 'John Paine | Your Journey Coach <hello@journeycoach.co>',
        to:   rawEmail,
        subject: `Looking forward to our call, ${displayName}`,
        html:    buildPrepEmail(displayName, resultCenter),
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Calendly webhook error:', err);
    return res.status(500).json({ error: 'Internal error' });
  }
}
