import { sql, sqlForDatabaseUrl } from '../_db.js';
import { requireAuth } from '../_auth.js';
import { Resend } from 'resend';

function getConfiguredSiteEnvironment() {
  return process.env.SITE_ENV === 'production' || process.env.SITE_ENV === 'test'
    ? process.env.SITE_ENV
    : null;
}

function resolveCurrentEnvironment(req) {
  const configuredEnvironment = getConfiguredSiteEnvironment();
  if (configuredEnvironment) return configuredEnvironment;

  const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
  if (host.includes('journeycoach.co') && !host.includes('yourjourneycoach.com')) {
    return 'production';
  }
  return 'test';
}

function normalizeEnvironment(value, fallback) {
  if (value === 'test' || value === 'production') return value;
  return fallback;
}

function getEnvironmentSql(req, environment) {
  const currentEnvironment = resolveCurrentEnvironment(req);
  const targetEnvironment = normalizeEnvironment(environment, currentEnvironment);

  if (targetEnvironment === currentEnvironment) {
    return { targetEnvironment, currentEnvironment, client: sql };
  }

  const databaseUrl = targetEnvironment === 'production'
    ? process.env.PRODUCTION_DATABASE_URL
    : process.env.TEST_DATABASE_URL;

  if (!databaseUrl) {
    return {
      error: `${targetEnvironment === 'production' ? 'PRODUCTION_DATABASE_URL' : 'TEST_DATABASE_URL'} is not configured for this admin site.`
    };
  }

  return {
    targetEnvironment,
    currentEnvironment,
    client: sqlForDatabaseUrl(databaseUrl)
  };
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;

  const requestedEnvironment = normalizeEnvironment(
    req.query?.environment ?? req.body?.environment,
    resolveCurrentEnvironment(req)
  );
  const db = getEnvironmentSql(req, requestedEnvironment);
  if (db.error) {
    return res.status(400).json({ error: db.error });
  }

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
        await db.client`ALTER TABLE campaign_emails ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`;
        const existing = await db.client`SELECT COUNT(*) as count FROM campaign_emails WHERE campaign_name = 'hidden-ceiling'`;
        if (parseInt(existing[0].count, 10) === 0) {
          for (let i = 1; i <= 5; i++) {
              await db.client`
                INSERT INTO campaign_emails (campaign_name, step_number, subject, body_html, delay_days)
                VALUES ('hidden-ceiling', ${i}, ${'Follow-up Email ' + i}, '<p>This is your automated email content.</p>', 2)
              `;
          }
        }
        const campaignName = req.query.campaign || 'hidden-ceiling';
        const steps = await db.client`SELECT * FROM campaign_emails WHERE campaign_name = ${campaignName} ORDER BY step_number ASC`;
        return res.status(200).json({ ok: true, data: steps });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Failed to load campaigns' });
      }
    }

    try {
      const rows = await db.client`SELECT setting_key, setting_value FROM site_settings ORDER BY setting_key`;
      const data = Object.fromEntries(rows.map(r => [r.setting_key, r.setting_value]));
      return res.status(200).json({ data, environment: db.targetEnvironment, currentEnvironment: db.currentEnvironment });
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
          await db.client`UPDATE campaign_emails SET is_active = ${is_active} WHERE id = ${id}`;
        } else {
          await db.client`
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

    const updates = { ...(req.body || {}) };
    delete updates.environment;
    const entries = Object.entries(updates).filter(([k]) => k && k.length <= 100);
    if (entries.length === 0) return res.status(400).json({ error: 'No settings provided' });
    try {
      for (const [key, value] of entries) {
        await db.client`
          INSERT INTO site_settings (setting_key, setting_value, updated_at)
          VALUES (${key}, ${value ?? ''}, NOW())
          ON CONFLICT (setting_key) DO UPDATE
            SET setting_value = EXCLUDED.setting_value,
                updated_at    = NOW()
        `;
      }
      return res.status(200).json({ ok: true, updated: entries.length, environment: db.targetEnvironment });
    } catch (err) {
      console.error('settings PUT error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  // POST — handle campaign test sends
  if (req.method === 'POST') {
    if (req.query?.resource === 'campaigns' && req.query?.action === 'test') {
      const { toEmail, firstName = 'there' } = req.body || {};
      if (!toEmail) return res.status(400).json({ error: 'toEmail is required' });

      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });

      try {
        const steps = await db.client`
          SELECT * FROM campaign_emails
          WHERE campaign_name = 'hidden-ceiling' AND is_active = true
          ORDER BY step_number ASC
        `;
        if (!steps || steps.length === 0) {
          return res.status(200).json({ ok: true, sent: 0, reason: 'No active steps found.' });
        }

        const resend = new Resend(resendKey);
        let sent = 0;
        const errors = [];

        for (const step of steps) {
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

        return res.status(200).json({ ok: true, sent, total: steps.length, errors });
      } catch (err) {
        console.error('Campaign test send error:', err);
        return res.status(500).json({ error: 'Failed to send test emails' });
      }
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
