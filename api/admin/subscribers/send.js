import crypto from 'crypto';
import { sql } from '../../_db.js';
import { requireAuth } from '../../_auth.js';
import { Resend } from 'resend';

const CAP = 100;
const FROM = 'John Paine | Your Journey Coach <hello@journeycoach.co>';

function makeUnsubToken(id) {
  return crypto
    .createHmac('sha256', process.env.ADMIN_JWT_SECRET)
    .update(String(id))
    .digest('hex')
    .slice(0, 32);
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { subject, body_html, filters = {} } = req.body || {};

  if (!subject || !subject.trim()) {
    return res.status(400).json({ error: 'subject is required' });
  }
  if (!body_html || !body_html.trim()) {
    return res.status(400).json({ error: 'body_html is required' });
  }

  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

  // Reject a filter that only targets unsubscribed users
  const { result_center, lead_status, is_unsubscribed } = filters;
  if (is_unsubscribed === true || is_unsubscribed === 'true') {
    return res.status(400).json({
      error: 'Cannot send bulk email to unsubscribed users. Remove the is_unsubscribed filter or set it to false.',
    });
  }

  // Build WHERE clauses — always exclude unsubscribed
  const conditions = ['is_unsubscribed IS NOT TRUE'];
  const params = [];

  if (result_center && result_center !== '') {
    params.push(result_center);
    conditions.push(`result_center = $${params.length}`);
  }

  if (lead_status && lead_status !== '') {
    params.push(lead_status);
    conditions.push(`lead_status = $${params.length}`);
  }

  const whereClause = conditions.join(' AND ');

  let subscribers;
  try {
    // neon supports sql(string, params) for parameterized queries
    const query = `SELECT id, email, name FROM subscribers WHERE ${whereClause} ORDER BY created_at DESC`;
    subscribers = await sql(query, params);
  } catch (err) {
    console.error('subscribers/send fetch error:', err);
    return res.status(500).json({ error: 'Database error fetching subscribers' });
  }

  const total = subscribers.length;
  const toSend = subscribers.slice(0, CAP);
  const skipped = total - toSend.length;

  const resend = new Resend(resendKey);
  let sent = 0;

  for (const sub of toSend) {
    const token = makeUnsubToken(sub.id);
    const unsubUrl = `https://journeycoach.co/api/contact?action=unsubscribe&token=${token}`;
    const firstName = (sub.name || '').trim().split(/\s+/)[0] || 'there';

    const personalizedBody = body_html.replace(/\{\{\s*firstName\s*\}\}/g, firstName);

    const footer = `
<div style="margin-top:40px;padding-top:20px;border-top:1px solid #eee;font-family:sans-serif;font-size:0.78rem;color:#999;text-align:center;">
  <p style="margin:0 0 6px;">You received this email because you subscribed at journeycoach.co.</p>
  <p style="margin:0;"><a href="${unsubUrl}" style="color:#999;text-decoration:underline;">Unsubscribe</a></p>
</div>`;

    const html = personalizedBody + footer;

    try {
      await resend.emails.send({
        from: FROM,
        to: sub.email,
        subject: subject.trim(),
        html,
      });
      sent++;
    } catch (err) {
      console.error(`subscribers/send error for ${sub.email}:`, err);
      // Continue sending to remaining subscribers; don't abort the batch
    }
  }

  return res.status(200).json({ sent, skipped, total });
}
