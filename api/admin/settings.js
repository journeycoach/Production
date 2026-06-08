import { sql } from '../_db.js';
import { requireAuth } from '../_auth.js';
import { Resend } from 'resend';
import { runMigrations } from '../_migrate.js';

function setNoStoreHeaders(res) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Surrogate-Control', 'no-store');
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;
  setNoStoreHeaders(res);
  await runMigrations();

  // Drip email CRUD (consolidated from api/admin/drip-emails.js)
  if (req.query?.resource === 'drip-emails') {
    const { action, campaign, id, email } = req.query || {};
    if (req.method === 'GET' && action === 'test_send') {
      if (!id) return res.status(400).json({ error: 'id is required' });
      if (!email) return res.status(400).json({ error: 'email is required' });
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
      try {
        const rows = await sql`SELECT * FROM campaign_emails WHERE id = ${parseInt(id, 10)}`;
        if (!rows.length) return res.status(404).json({ error: 'Step not found' });
        const step = rows[0];
        await (new Resend(resendKey)).emails.send({ from: 'John Paine | Your Journey Coach <hello@journeycoach.co>', to: email, subject: `[TEST – Step ${step.step_number}] ${step.subject}`, html: `<div style="background:#fffbe6;border:2px solid #f0c040;padding:0.75rem 1.25rem;margin-bottom:1.5rem;border-radius:6px;font-family:sans-serif;font-size:0.85rem;color:#7a5c00;"><strong>&#9888; TEST SEND</strong> — Step ${step.step_number} of ${step.campaign_name} (normally sent ${step.delay_days} day(s) after previous).</div>${step.body_html || ''}` });
        return res.status(200).json({ ok: true });
      } catch (err) { console.error('drip test send error:', err); return res.status(500).json({ error: err.message || 'Send failed' }); }
    }
    if (req.method === 'GET') {
      try { const rows = await sql`SELECT * FROM campaign_emails WHERE campaign_name = ${campaign || 'hidden-ceiling'} ORDER BY step_number ASC`; return res.status(200).json(rows); }
      catch (err) { return res.status(500).json({ error: 'Database error' }); }
    }
    if (req.method === 'PUT') {
      const { id: bodyId, subject, body_html, delay_days, is_active } = req.body || {};
      if (!bodyId) return res.status(400).json({ error: 'id is required' });
      try { const rows = await sql`UPDATE campaign_emails SET subject=${subject??null}, body_html=${body_html??null}, delay_days=${delay_days!=null?parseInt(delay_days,10):2}, is_active=${is_active!=null?Boolean(is_active):true} WHERE id=${parseInt(bodyId,10)} RETURNING *`; if (!rows.length) return res.status(404).json({ error: 'Step not found' }); return res.status(200).json(rows[0]); }
      catch (err) { return res.status(500).json({ error: 'Database error' }); }
    }
    if (req.method === 'POST') {
      const { campaign_name, step_number, subject, body_html, delay_days } = req.body || {};
      if (!campaign_name || step_number == null) return res.status(400).json({ error: 'campaign_name and step_number are required' });
      try { const rows = await sql`INSERT INTO campaign_emails (campaign_name, step_number, subject, body_html, delay_days, is_active) VALUES (${campaign_name}, ${parseInt(step_number,10)}, ${subject??null}, ${body_html??null}, ${delay_days!=null?parseInt(delay_days,10):2}, true) RETURNING *`; return res.status(201).json(rows[0]); }
      catch (err) { if (err.message?.includes('unique')) return res.status(409).json({ error: `Step ${step_number} already exists` }); return res.status(500).json({ error: 'Database error' }); }
    }
    if (req.method === 'DELETE') {
      if (!id) return res.status(400).json({ error: 'id is required' });
      try { const rows = await sql`DELETE FROM campaign_emails WHERE id=${parseInt(id,10)} RETURNING id`; if (!rows.length) return res.status(404).json({ error: 'Step not found' }); return res.status(200).json({ ok: true }); }
      catch (err) { return res.status(500).json({ error: 'Database error' }); }
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // GET — return all settings as { key: value } map
  if (req.method === 'GET') {
    if (req.query?.resource === 'campaigns') {
      try {
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
