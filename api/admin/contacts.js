import crypto from 'crypto';
import { sql } from '../_db.js';
import { requireAuth } from '../_auth.js';
import { runMigrations } from '../_migrate.js';
import { Resend } from 'resend';

// ── Analytics helper (consolidated from api/admin/analytics.js) ──────────────
const ALLOWED_WEEKS = new Set([4, 12, 26]);

async function handleAnalytics(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const rawWeeks = parseInt(req.query.weeks, 10);
  const weeks = ALLOWED_WEEKS.has(rawWeeks) ? rawWeeks : 12;
  try {
    const subscribersOverTime = await sql`
      SELECT TO_CHAR(DATE_TRUNC('week', gs.week_start), 'YYYY-MM-DD') AS week, COUNT(s.id)::int AS count
      FROM generate_series(DATE_TRUNC('week', NOW()) - (${weeks - 1} || ' weeks')::interval, DATE_TRUNC('week', NOW()), '1 week'::interval) AS gs(week_start)
      LEFT JOIN subscribers s ON DATE_TRUNC('week', s.created_at AT TIME ZONE 'UTC') = gs.week_start
      GROUP BY gs.week_start ORDER BY gs.week_start`;
    const assessmentsOverTime = await sql`
      SELECT TO_CHAR(DATE_TRUNC('week', gs.week_start), 'YYYY-MM-DD') AS week, COUNT(s.id)::int AS count
      FROM generate_series(DATE_TRUNC('week', NOW()) - (${weeks - 1} || ' weeks')::interval, DATE_TRUNC('week', NOW()), '1 week'::interval) AS gs(week_start)
      LEFT JOIN subscribers s ON DATE_TRUNC('week', s.created_at AT TIME ZONE 'UTC') = gs.week_start AND s.result_center IS NOT NULL
      GROUP BY gs.week_start ORDER BY gs.week_start`;
    const contactsOverTime = await sql`
      SELECT TO_CHAR(DATE_TRUNC('week', gs.week_start), 'YYYY-MM-DD') AS week, COUNT(c.id)::int AS count
      FROM generate_series(DATE_TRUNC('week', NOW()) - (${weeks - 1} || ' weeks')::interval, DATE_TRUNC('week', NOW()), '1 week'::interval) AS gs(week_start)
      LEFT JOIN contact_submissions c ON DATE_TRUNC('week', c.submitted_at AT TIME ZONE 'UTC') = gs.week_start
      GROUP BY gs.week_start ORDER BY gs.week_start`;
    const bookingsOverTime = await sql`
      SELECT TO_CHAR(DATE_TRUNC('week', gs.week_start), 'YYYY-MM-DD') AS week, COUNT(s.id)::int AS count
      FROM generate_series(DATE_TRUNC('week', NOW()) - (${weeks - 1} || ' weeks')::interval, DATE_TRUNC('week', NOW()), '1 week'::interval) AS gs(week_start)
      LEFT JOIN subscribers s ON DATE_TRUNC('week', s.booked_call_at AT TIME ZONE 'UTC') = gs.week_start AND s.has_booked_call = true AND s.booked_call_at IS NOT NULL
      GROUP BY gs.week_start ORDER BY gs.week_start`;
    const resultCenterRows = await sql`SELECT result_center, COUNT(*)::int AS count FROM subscribers WHERE result_center IS NOT NULL GROUP BY result_center`;
    const resultCenterCounts = { heart: 0, head: 0, action: 0 };
    for (const row of resultCenterRows) {
      const key = String(row.result_center).toLowerCase();
      if (key in resultCenterCounts) resultCenterCounts[key] = row.count;
    }
    const dripStepDistribution = await sql`SELECT drip_step AS step, COUNT(*)::int AS count FROM subscribers WHERE drip_step IS NOT NULL GROUP BY drip_step ORDER BY drip_step`;
    return res.status(200).json({ subscribersOverTime, assessmentsOverTime, contactsOverTime, bookingsOverTime, resultCenterCounts, dripStepDistribution });
  } catch (err) {
    console.error('analytics GET error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
}

// ── Segment send helper (consolidated from api/admin/subscribers/send.js) ────
function makeUnsubToken(id) {
  return crypto.createHmac('sha256', process.env.ADMIN_JWT_SECRET).update(String(id)).digest('hex').slice(0, 32);
}

async function handleSegmentSend(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { subject, body_html, filters = {} } = req.body || {};
  if (!subject?.trim()) return res.status(400).json({ error: 'subject is required' });
  if (!body_html?.trim()) return res.status(400).json({ error: 'body_html is required' });
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) return res.status(500).json({ error: 'RESEND_API_KEY not configured' });
  const { result_center, lead_status, is_unsubscribed } = filters;
  if (is_unsubscribed === true || is_unsubscribed === 'true') {
    return res.status(400).json({ error: 'Cannot send bulk email to unsubscribed users.' });
  }
  const conditions = ['is_unsubscribed IS NOT TRUE'];
  const params = [];
  if (result_center && result_center !== '') { params.push(result_center); conditions.push(`result_center = $${params.length}`); }
  if (lead_status && lead_status !== '')     { params.push(lead_status);   conditions.push(`lead_status = $${params.length}`); }
  let subscribers;
  try {
    subscribers = await sql(`SELECT id, email, name FROM subscribers WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`, params);
  } catch (err) {
    console.error('segment send fetch error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
  const total = subscribers.length;
  const toSend = subscribers.slice(0, 100);
  const resend = new Resend(resendKey);
  let sent = 0;
  for (const sub of toSend) {
    const token = makeUnsubToken(sub.id);
    const unsubUrl = `https://journeycoach.co/api/contact?action=unsubscribe&token=${token}`;
    const firstName = (sub.name || '').trim().split(/\s+/)[0] || 'there';
    const footer = `<div style="margin-top:40px;padding-top:20px;border-top:1px solid #eee;font-size:0.78rem;color:#999;text-align:center;"><p style="margin:0 0 6px;">You received this email because you subscribed at journeycoach.co.</p><p style="margin:0;"><a href="${unsubUrl}" style="color:#999;">Unsubscribe</a></p></div>`;
    try {
      await resend.emails.send({ from: 'John Paine | Your Journey Coach <hello@journeycoach.co>', to: sub.email, subject: subject.trim(), html: body_html.replace(/\{\{\s*firstName\s*\}\}/g, firstName) + footer });
      sent++;
    } catch (err) { console.error(`segment send error for ${sub.email}:`, err); }
  }
  return res.status(200).json({ sent, skipped: total - toSend.length, total });
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;
  await runMigrations();

  // Analytics sub-resource
  if (req.query.type === 'analytics') return handleAnalytics(req, res);

  // Segment send sub-resource
  if (req.query.action === 'send') return handleSegmentSend(req, res);

  // Subscriber sub-resource
  if (req.query.type === 'subscribers') {
    if (req.method === 'GET') {
      try {
        const rows = await sql`
          SELECT s.id, s.email, s.name, s.source, s.source_history, s.created_at, s.result_center,
            s.score_heart, s.score_head, s.score_action, s.drip_step, s.last_email_sent_at,
            s.attribution_source, s.first_attribution_source, s.landing_page, s.referrer,
            s.utm_source, s.utm_medium, s.utm_campaign, s.utm_term, s.utm_content, s.attribution,
            s.notes, s.email_status, s.email_status_at, s.is_unsubscribed, s.lead_status, s.has_booked_call, s.booked_call_at,
            s.assessment_call_clicked_at,
            EXISTS(SELECT 1 FROM contact_submissions c WHERE LOWER(c.email) = LOWER(s.email)) AS has_contact
          FROM subscribers s
          ORDER BY s.created_at DESC
        `;
        return res.status(200).json({ data: rows });
      } catch (err) {
        console.error('subscribers GET error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
    }
    if (req.method === 'PATCH') {
      const { id } = req.query;
      const { prepend_source, prepend_at, attribution_source, notes, lead_status, has_booked_call } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id required' });

      // Set attribution source manually
      if (attribution_source !== undefined) {
        try {
          const val = attribution_source === '' ? null : attribution_source;
          await sql`UPDATE subscribers SET attribution_source = ${val} WHERE id = ${id}`;
          return res.status(200).json({ ok: true });
        } catch (err) {
          console.error('subscribers PATCH attribution error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
      }

      // Save notes
      if (notes !== undefined) {
        try {
          await sql`UPDATE subscribers SET notes = ${notes || null} WHERE id = ${id}`;
          return res.status(200).json({ ok: true });
        } catch (err) {
          console.error('subscribers PATCH notes error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
      }

      // Save lead status
      if (lead_status !== undefined) {
        try {
          const val = lead_status === '' ? null : lead_status;
          await sql`UPDATE subscribers SET lead_status = ${val} WHERE id = ${id}`;
          return res.status(200).json({ ok: true });
        } catch (err) {
          console.error('subscribers PATCH lead_status error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
      }

      // Save booked call
      if (has_booked_call !== undefined || req.body.booked_call_at !== undefined) {
        try {
          let bookedCallAt = null;
          if (req.body.booked_call_at) {
            bookedCallAt = new Date(req.body.booked_call_at).toISOString();
          } else if (has_booked_call) {
            bookedCallAt = new Date().toISOString();
          }
          const hasBooked = has_booked_call !== undefined ? has_booked_call : !!bookedCallAt;
          await sql`UPDATE subscribers SET has_booked_call = ${hasBooked}, booked_call_at = ${bookedCallAt} WHERE id = ${id}`;
          return res.status(200).json({ ok: true });
        } catch (err) {
          console.error('subscribers PATCH booked_call error:', err);
          return res.status(500).json({ error: 'Failed to update booked call status' });
        }
      }

      // Prepend a historical source entry (for backfilling funnel transitions)
      if (!prepend_source) return res.status(400).json({ error: 'prepend_source or attribution_source required' });
      const at = prepend_at || new Date().toISOString();
      try {
        const entry = JSON.stringify({ source: prepend_source, at });
        await sql`
          UPDATE subscribers
          SET source_history = jsonb_build_array(${entry}::jsonb) || COALESCE(source_history, '[]'::jsonb)
          WHERE id = ${id}
        `;
        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error('subscribers PATCH error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
    }
    if (req.method === 'DELETE') {
      const { id } = req.query;
      if (!id) return res.status(400).json({ error: 'id required' });
      try {
        await sql`DELETE FROM subscribers WHERE id = ${id}`;
        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error('subscribers DELETE error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT id, name, email, phone, interest, message, is_read, submitted_at,
          attribution_source, first_attribution_source, landing_page, referrer,
          utm_source, utm_medium, utm_campaign, utm_term, utm_content, attribution,
          email_status, email_status_at, lead_status, has_booked_call, booked_call_at
        FROM contact_submissions
        ORDER BY submitted_at DESC
      `;
      return res.status(200).json({ data: rows });
    } catch (err) {
      console.error('contacts GET error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (req.method === 'PUT') {
    const { id, is_read, lead_status, has_booked_call, booked_call_at } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });

    // Update lead_status
    if (lead_status !== undefined) {
      try {
        const val = lead_status === '' ? null : lead_status;
        await sql`UPDATE contact_submissions SET lead_status = ${val} WHERE id = ${id}`;
        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error('contacts PUT lead_status error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
    }

    // Update has_booked_call / booked_call_at
    if (has_booked_call !== undefined || booked_call_at !== undefined) {
      try {
        let callAt = null;
        if (booked_call_at) {
          callAt = new Date(booked_call_at).toISOString();
        } else if (has_booked_call) {
          callAt = new Date().toISOString();
        }
        const hasBooked = has_booked_call !== undefined ? has_booked_call : !!callAt;
        await sql`UPDATE contact_submissions SET has_booked_call = ${hasBooked}, booked_call_at = ${callAt} WHERE id = ${id}`;
        return res.status(200).json({ ok: true });
      } catch (err) {
        console.error('contacts PUT booked_call error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
    }

    // Update is_read
    try {
      const rows = await sql`
        UPDATE contact_submissions SET is_read = ${is_read} WHERE id = ${id} RETURNING *
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ data: rows[0] });
    } catch (err) {
      console.error('contacts PUT error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });
    try {
      await sql`DELETE FROM contact_submissions WHERE id = ${id}`;
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('contacts DELETE error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
