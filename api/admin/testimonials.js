import { sql } from '../_db.js';
import { requireAuth } from '../_auth.js';
import { runMigrations } from '../_migrate.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;
  await runMigrations();

  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT id, quote, short_quote, long_quote, author, client_role, industry,
          display_location, is_featured, sort_order, created_at
        FROM testimonials
        ORDER BY is_featured DESC, sort_order ASC, id ASC
      `;
      return res.status(200).json({ data: rows });
    } catch (err) {
      console.error('testimonials GET error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (req.method === 'POST') {
    const {
      quote,
      short_quote = '',
      long_quote = '',
      author,
      client_role = '',
      industry = '',
      display_location = 'homepage',
      is_featured = false,
      sort_order = 0
    } = req.body || {};
    if (!quote || !author) {
      return res.status(400).json({ error: 'quote and author are required' });
    }
    try {
      await ensureTestimonialColumns();
      const rows = await sql`
        INSERT INTO testimonials (
          quote, short_quote, long_quote, author, client_role, industry,
          display_location, is_featured, sort_order
        )
        VALUES (
          ${quote}, ${short_quote}, ${long_quote}, ${author}, ${client_role}, ${industry},
          ${display_location}, ${is_featured}, ${sort_order}
        )
        RETURNING *
      `;
      return res.status(201).json({ data: rows[0] });
    } catch (err) {
      console.error('testimonials POST error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (req.method === 'PUT') {
    const {
      id,
      quote,
      short_quote,
      long_quote,
      author,
      client_role,
      industry,
      display_location,
      is_featured,
      sort_order
    } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });
    try {
      await ensureTestimonialColumns();
      const rows = await sql`
        UPDATE testimonials
        SET
          quote = COALESCE(${quote}, quote),
          short_quote = COALESCE(${short_quote}, short_quote),
          long_quote = COALESCE(${long_quote}, long_quote),
          author = COALESCE(${author}, author),
          client_role = COALESCE(${client_role}, client_role),
          industry = COALESCE(${industry}, industry),
          display_location = COALESCE(${display_location}, display_location),
          is_featured = COALESCE(${is_featured}, is_featured),
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
      await ensureTestimonialColumns();
      await sql`DELETE FROM testimonials WHERE id = ${id}`;
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('testimonials DELETE error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
