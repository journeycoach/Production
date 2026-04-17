import { sql } from '../_db.js';
import { requireAuth } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;

  // Subscriber sub-resource
  if (req.query.type === 'subscribers') {
    if (req.method === 'GET') {
      try {
        await sql`CREATE TABLE IF NOT EXISTS subscribers (id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT, source TEXT DEFAULT 'website', created_at TIMESTAMPTZ DEFAULT NOW(), result_center TEXT, score_heart INT, score_head INT, score_action INT)`;
        await sql`ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS result_center TEXT, ADD COLUMN IF NOT EXISTS score_heart INT, ADD COLUMN IF NOT EXISTS score_head INT, ADD COLUMN IF NOT EXISTS score_action INT, ADD COLUMN IF NOT EXISTS drip_step INT DEFAULT 0, ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ DEFAULT NOW(), ADD COLUMN IF NOT EXISTS source_history JSONB DEFAULT '[]'`;
        const rows = await sql`SELECT id, email, name, source, source_history, created_at, result_center, score_heart, score_head, score_action, drip_step, last_email_sent_at FROM subscribers ORDER BY created_at DESC`;
        return res.status(200).json({ data: rows });
      } catch (err) {
        console.error('subscribers GET error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
    }
    if (req.method === 'PATCH') {
      // Prepend a historical source entry (for backfilling funnel transitions)
      const { id } = req.query;
      const { prepend_source, prepend_at } = req.body || {};
      if (!id || !prepend_source) return res.status(400).json({ error: 'id and prepend_source required' });
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
        SELECT id, name, email, phone, interest, message, is_read, submitted_at
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
