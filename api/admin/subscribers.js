import { sql } from '../_db.js';
import { requireAuth } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;

  if (req.method === 'GET') {
    try {
      await sql`
        CREATE TABLE IF NOT EXISTS subscribers (
          id        SERIAL PRIMARY KEY,
          email     TEXT UNIQUE NOT NULL,
          name      TEXT,
          source    TEXT DEFAULT 'website',
          created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `;
      const rows = await sql`SELECT id, email, name, source, created_at FROM subscribers ORDER BY created_at DESC`;
      return res.status(200).json({ data: rows });
    } catch (err) {
      console.error('subscribers GET error:', err);
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
