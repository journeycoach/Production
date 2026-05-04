import { sql } from '../_db.js';
import { requireAuth } from '../_auth.js';
import { runMigrations } from '../_migrate.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;
  await runMigrations();

  // Subscriber sub-resource
  if (req.query.type === 'subscribers') {
    if (req.method === 'GET') {
      try {
        const rows = await sql`
          SELECT s.id, s.email, s.name, s.source, s.source_history, s.created_at, s.result_center,
            s.score_heart, s.score_head, s.score_action, s.drip_step, s.last_email_sent_at,
            s.attribution_source, s.first_attribution_source, s.landing_page, s.referrer,
            s.utm_source, s.utm_medium, s.utm_campaign, s.utm_term, s.utm_content, s.attribution,
            s.notes, s.email_status, s.email_status_at,
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
      const { prepend_source, prepend_at, attribution_source, notes } = req.body || {};
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
          email_status, email_status_at
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
    const { id, is_read } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });
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
