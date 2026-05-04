import { sql } from '../_db.js';
import { requireAuth } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;

  // GET — ?page=home returns sections for that page; no param returns all
  if (req.method === 'GET') {
    try {
      const page = req.query?.page ?? new URL(req.url, 'http://localhost').searchParams.get('page');
      const rows = page
        ? await sql`SELECT * FROM page_sections WHERE page = ${page} ORDER BY sort_order ASC, id ASC`
        : await sql`SELECT * FROM page_sections ORDER BY page ASC, sort_order ASC, id ASC`;
      return res.status(200).json({ data: rows });
    } catch (err) {
      console.error('sections GET error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  // PUT — update a single section (visibility, status, content, notes)
  if (req.method === 'PUT') {
    const { id, is_visible, status, content, admin_notes, label, sort_order } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });
    try {
      const rows = await sql`
        UPDATE page_sections SET
          is_visible   = COALESCE(${is_visible  !== undefined ? is_visible  : null}, is_visible),
          status       = COALESCE(${status       !== undefined ? status       : null}, status),
          content      = COALESCE(${content      !== undefined ? JSON.stringify(content) : null}::jsonb, content),
          admin_notes  = COALESCE(${admin_notes  !== undefined ? admin_notes  : null}, admin_notes),
          label        = COALESCE(${label        !== undefined ? label        : null}, label),
          sort_order   = COALESCE(${sort_order   !== undefined ? sort_order   : null}, sort_order)
        WHERE id = ${id}
        RETURNING *
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ data: rows[0] });
    } catch (err) {
      console.error('sections PUT error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  // PATCH — bulk update sort_order for drag-and-drop
  // Body: { orders: [{ id, sort_order }, ...] }
  if (req.method === 'PATCH') {
    const { orders } = req.body || {};
    if (!Array.isArray(orders) || orders.length === 0) {
      return res.status(400).json({ error: 'orders array required' });
    }
    try {
      for (const { id, sort_order } of orders) {
        if (id == null || sort_order == null) continue;
        await sql`UPDATE page_sections SET sort_order = ${sort_order} WHERE id = ${id}`;
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('sections PATCH error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  // POST — create a new section
  if (req.method === 'POST') {
    const { page, section_key, label, sort_order } = req.body || {};
    if (!page || !section_key) return res.status(400).json({ error: 'page and section_key are required' });
    try {
      const rows = await sql`
        INSERT INTO page_sections (page, section_key, label, sort_order, is_visible, status)
        VALUES (${page}, ${section_key.trim().toLowerCase()}, ${(label || section_key).trim()}, ${sort_order ?? 999}, true, 'published')
        ON CONFLICT (page, section_key) DO NOTHING
        RETURNING *
      `;
      if (rows.length === 0) return res.status(409).json({ error: 'A section with that key already exists for this page.' });
      return res.status(201).json({ data: rows[0] });
    } catch (err) {
      console.error('sections POST error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
