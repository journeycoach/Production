import { sql } from '../_db.js';
import { requireAuth } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;

  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT id, quote, author, sort_order, created_at
        FROM testimonials
        ORDER BY sort_order ASC, id ASC
      `;
      return res.status(200).json({ data: rows });
    } catch (err) {
      console.error('testimonials GET error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (req.method === 'POST') {
    const { quote, author, sort_order = 0 } = req.body || {};
    if (!quote || !author) {
      return res.status(400).json({ error: 'quote and author are required' });
    }
    try {
      const rows = await sql`
        INSERT INTO testimonials (quote, author, sort_order)
        VALUES (${quote}, ${author}, ${sort_order})
        RETURNING *
      `;
      return res.status(201).json({ data: rows[0] });
    } catch (err) {
      console.error('testimonials POST error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (req.method === 'PUT') {
    const { id, quote, author, sort_order } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });
    try {
      const rows = await sql`
        UPDATE testimonials
        SET
          quote = COALESCE(${quote}, quote),
          author = COALESCE(${author}, author),
          sort_order = COALESCE(${sort_order}, sort_order)
        WHERE id = ${id}
        RETURNING *
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ data: rows[0] });
    } catch (err) {
      console.error('testimonials PUT error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });
    try {
      await sql`DELETE FROM testimonials WHERE id = ${id}`;
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('testimonials DELETE error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
