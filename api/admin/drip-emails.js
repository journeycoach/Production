import { sql } from '../_db.js';
import { requireAuth } from '../_auth.js';
import { runMigrations } from '../_migrate.js';
import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;
  await runMigrations();

  const { action, campaign, id, email } = req.query || {};

  // GET ?action=test_send&id=<id>&email=<email>
  if (req.method === 'GET' && action === 'test_send') {
    if (!id) return res.status(400).json({ error: 'id is required' });
    if (!email) return res.status(400).json({ error: 'email is required' });

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

    try {
      const rows = await sql`SELECT * FROM campaign_emails WHERE id = ${parseInt(id, 10)}`;
      if (!rows.length) return res.status(404).json({ error: 'Step not found' });
      const step = rows[0];

      const resend = new Resend(resendKey);
      const personalizedBody = (step.body_html || '').replace(/\{\{\s*firstName\s*\}\}/g, 'there');

      await resend.emails.send({
        from: 'John Paine | Your Journey Coach <hello@journeycoach.co>',
        to: email,
        subject: `[TEST – Step ${step.step_number}] ${step.subject}`,
        html: `<div style="background:#fffbe6;border:2px solid #f0c040;padding:0.75rem 1.25rem;margin-bottom:1.5rem;border-radius:6px;font-family:sans-serif;font-size:0.85rem;color:#7a5c00;"><strong>&#9888; TEST SEND</strong> — This is Step ${step.step_number} of the ${step.campaign_name} drip sequence. It would normally be sent ${step.delay_days} day(s) after the previous email.</div>${personalizedBody}`
      });

      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('Drip email test send error:', err);
      return res.status(500).json({ error: err.message || 'Failed to send test email' });
    }
  }

  // GET ?campaign=hidden-ceiling — list all steps ordered by step_number
  if (req.method === 'GET') {
    const campaignName = campaign || 'hidden-ceiling';
    try {
      const rows = await sql`
        SELECT * FROM campaign_emails
        WHERE campaign_name = ${campaignName}
        ORDER BY step_number ASC
      `;
      return res.status(200).json(rows);
    } catch (err) {
      console.error('Drip emails GET error:', err);
      return res.status(500).json({ error: 'Failed to load drip emails' });
    }
  }

  // PUT { id, subject, body_html, delay_days, is_active }
  if (req.method === 'PUT') {
    const { id: bodyId, subject, body_html, delay_days, is_active } = req.body || {};
    if (!bodyId) return res.status(400).json({ error: 'id is required' });

    try {
      const rows = await sql`
        UPDATE campaign_emails
        SET
          subject    = ${subject ?? null},
          body_html  = ${body_html ?? null},
          delay_days = ${delay_days != null ? parseInt(delay_days, 10) : 2},
          is_active  = ${is_active != null ? Boolean(is_active) : true}
        WHERE id = ${parseInt(bodyId, 10)}
        RETURNING *
      `;
      if (!rows.length) return res.status(404).json({ error: 'Step not found' });
      return res.status(200).json(rows[0]);
    } catch (err) {
      console.error('Drip emails PUT error:', err);
      return res.status(500).json({ error: 'Failed to update drip email' });
    }
  }

  // POST { campaign_name, step_number, subject, body_html, delay_days }
  if (req.method === 'POST') {
    const { campaign_name, step_number, subject, body_html, delay_days } = req.body || {};
    if (!campaign_name) return res.status(400).json({ error: 'campaign_name is required' });
    if (step_number == null) return res.status(400).json({ error: 'step_number is required' });

    try {
      const rows = await sql`
        INSERT INTO campaign_emails (campaign_name, step_number, subject, body_html, delay_days, is_active)
        VALUES (
          ${campaign_name},
          ${parseInt(step_number, 10)},
          ${subject ?? null},
          ${body_html ?? null},
          ${delay_days != null ? parseInt(delay_days, 10) : 2},
          true
        )
        RETURNING *
      `;
      return res.status(201).json(rows[0]);
    } catch (err) {
      if (err.message && err.message.includes('unique')) {
        return res.status(409).json({ error: `Step ${step_number} already exists for campaign "${campaign_name}"` });
      }
      console.error('Drip emails POST error:', err);
      return res.status(500).json({ error: 'Failed to create drip email' });
    }
  }

  // DELETE ?id=<id>
  if (req.method === 'DELETE') {
    if (!id) return res.status(400).json({ error: 'id is required' });

    try {
      const rows = await sql`
        DELETE FROM campaign_emails WHERE id = ${parseInt(id, 10)} RETURNING id
      `;
      if (!rows.length) return res.status(404).json({ error: 'Step not found' });
      return res.status(200).json({ ok: true, deleted: rows[0].id });
    } catch (err) {
      console.error('Drip emails DELETE error:', err);
      return res.status(500).json({ error: 'Failed to delete drip email' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
