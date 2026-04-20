import { sql } from '../_db.js';
import { requireAuth } from '../_auth.js';
import { Resend } from 'resend';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;

  // GET — return all settings as { key: value } map
  if (req.method === 'GET') {
    if (req.query?.resource === 'campaigns') {
      try {
        await sql`
          CREATE TABLE IF NOT EXISTS campaign_emails (
            id SERIAL PRIMARY KEY,
            campaign_name TEXT NOT NULL,
            step_number INT NOT NULL,
            subject TEXT,
            body_html TEXT,
            delay_days INT DEFAULT 2,
            is_active BOOLEAN DEFAULT TRUE,
            UNIQUE(campaign_name, step_number)
          )
        `;
        await sql`ALTER TABLE campaign_emails ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`;
        const existing = await sql`SELECT COUNT(*) as count FROM campaign_emails WHERE campaign_name = 'hidden-ceiling'`;
        if (parseInt(existing[0].count, 10) === 0) {
          for (let i = 1; i <= 5; i++) {
              await sql`
                INSERT INTO campaign_emails (campaign_name, step_number, subject, body_html, delay_days)
                VALUES ('hidden-ceiling', ${i}, ${'Follow-up Email ' + i}, '<p>This is your automated email content.</p>', 2)
              `;
          }
        }
        const campaignName = req.query.campaign || 'hidden-ceiling';
        const steps = await sql`SELECT * FROM campaign_emails WHERE campaign_name = ${campaignName} ORDER BY step_number ASC`;
        return res.status(200).json({ ok: true, data: steps });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to load campaigns' });
      }
    }

    try {
      const rows = await sql`SELECT setting_key, setting_value FROM site_settings ORDER BY setting_key`;
      const data = Object.fromEntries(rows.map(r => [r.setting_key, r.setting_value]));
      return res.status(200).json({ data });
    } catch (err) {
      console.error('settings GET error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  // PUT — upsert one or more settings { key: value, ... }
  if (req.method === 'PUT') {
    if (req.query?.resource === 'campaigns') {
      try {
        const { id, subject, body_html, delay_days, is_active } = req.body;
        if (!id) return res.status(400).json({ error: 'Missing step ID' });

        // If only toggling is_active, allow partial update
        if (is_active !== undefined && subject === undefined) {
          await sql`UPDATE campaign_emails SET is_active = ${is_active} WHERE id = ${id}`;
        } else {
          await sql`
            UPDATE campaign_emails
            SET subject = ${subject}, body_html = ${body_html}, delay_days = ${delay_days}
            WHERE id = ${id}
          `;
        }
        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to update campaign template' });
      }
    }

    const entries = Object.entries(req.body || {}).filter(([k]) => k && k.length <= 100);
    if (entries.length === 0) return res.status(400).json({ error: 'No settings provided' });
    try {
      for (const [key, value] of entries) {
        await sql`
          INSERT INTO site_settings (setting_key, setting_value, updated_at)
          VALUES (${key}, ${value ?? ''}, NOW())
          ON CONFLICT (setting_key) DO UPDATE
            SET setting_value = EXCLUDED.setting_value,
                updated_at    = NOW()
        `;
      }
      return res.status(200).json({ ok: true, updated: entries.length });
    } catch (err) {
      console.error('settings PUT error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  // POST — handle campaign test sends
  if (req.method === 'POST') {
    if (req.query?.resource === 'campaigns' && req.query?.action === 'test') {
      const { toEmail, firstName = 'there', steps } = req.body || {};
      if (!toEmail) return res.status(400).json({ error: 'toEmail is required' });

      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

      try {
        let allSteps = await sql`
          SELECT * FROM campaign_emails
          WHERE campaign_name = 'hidden-ceiling'
          ORDER BY step_number ASC
        `;
        // Filter to selected steps if provided, otherwise send all active
        const filteredSteps = (steps && steps.length > 0)
          ? allSteps.filter(s => steps.includes(s.step_number))
          : allSteps.filter(s => s.is_active !== false);

        if (!filteredSteps || filteredSteps.length === 0) {
          return res.status(200).json({ ok: true, sent: 0, reason: 'No matching steps found.' });
        }

        const resend = new Resend(resendKey);
        let sent = 0;
        const errors = [];

        for (const step of filteredSteps) {
          const personalizedBody = step.body_html.replace(/\{\{\s*firstName\s*\}\}/g, firstName);
          try {
            await resend.emails.send({
              from: 'John Paine | Your Journey Coach <hello@journeycoach.co>',
              to: toEmail,
              subject: `[TEST – Email ${step.step_number}] ${step.subject}`,
              html: `<div style="background:#fffbe6;border:2px solid #f0c040;padding:0.75rem 1.25rem;margin-bottom:1.5rem;border-radius:6px;font-family:sans-serif;font-size:0.85rem;color:#7a5c00;"><strong>⚠️ TEST SEND</strong> — This is Step ${step.step_number} of the Hidden Ceiling drip sequence. It would normally be sent ${step.delay_days} day(s) after the previous email.</div>${personalizedBody}`
            });
            sent++;
          } catch (e) {
            errors.push(`Step ${step.step_number}: ${e.message}`);
          }
        }

        return res.status(200).json({ ok: true, sent, total: filteredSteps.length, errors });
      } catch (err) {
        console.error('Campaign test send error:', err);
        return res.status(500).json({ error: 'Failed to send test emails' });
      }
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
