import { sql } from '../_db.js';
import { requireAuth } from '../_auth.js';

function normalizeBookmarkUrl(value) {
  if (!value) return '';
  try {
    const url = new URL(String(value).trim());
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;

  // ── Bookmark categories sub-resource (?resource=categories) ──────────────
  if (req.query.resource === 'categories') {
    if (req.method === 'GET') {
      try {
        const rows = await sql`SELECT id, title, sort_order, created_at FROM bookmark_categories ORDER BY sort_order ASC, id ASC`;
        return res.status(200).json({ data: rows });
      } catch (err) { console.error('bookmark-categories GET error:', err); return res.status(500).json({ error: 'Database error' }); }
    }
    if (req.method === 'POST') {
      const { title, sort_order = 0 } = req.body || {};
      if (!title) return res.status(400).json({ error: 'title is required' });
      try {
        const rows = await sql`INSERT INTO bookmark_categories (title, sort_order) VALUES (${title}, ${sort_order}) RETURNING *`;
        return res.status(201).json({ data: rows[0] });
      } catch (err) { console.error('bookmark-categories POST error:', err); return res.status(500).json({ error: 'Database error' }); }
    }
    if (req.method === 'PUT') {
      const { id, title, sort_order } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id is required' });
      try {
        const rows = await sql`UPDATE bookmark_categories SET title=COALESCE(${title},title), sort_order=COALESCE(${sort_order!==undefined?sort_order:null},sort_order) WHERE id=${id} RETURNING *`;
        if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
        return res.status(200).json({ data: rows[0] });
      } catch (err) { console.error('bookmark-categories PUT error:', err); return res.status(500).json({ error: 'Database error' }); }
    }
    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id is required' });
      try {
        await sql`DELETE FROM bookmark_categories WHERE id=${id}`;
        return res.status(200).json({ ok: true });
      } catch (err) { console.error('bookmark-categories DELETE error:', err); return res.status(500).json({ error: 'Database error' }); }
    }
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ── Bookmarks ─────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT b.id, b.title, b.url, b.description, b.sort_order, b.category_id,
          bc.title as category_title
        FROM bookmarks b
        LEFT JOIN bookmark_categories bc ON b.category_id = bc.id
        ORDER BY bc.sort_order ASC, b.sort_order ASC
      `;
      return res.status(200).json({ data: rows });
    } catch (err) {
      console.error('bookmarks GET error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (req.method === 'POST') {
    const { title, url, category_id, description, sort_order = 0 } = req.body || {};
    if (!title || !url) return res.status(400).json({ error: 'title and url are required' });
    const normalizedUrl = normalizeBookmarkUrl(url);
    if (!normalizedUrl) return res.status(400).json({ error: 'A valid http or https URL is required' });
    try {
      const rows = await sql`
        INSERT INTO bookmarks (title, url, category_id, description, sort_order)
        VALUES (
          ${title},
          ${normalizedUrl},
          ${category_id || null},
          ${description || null},
          ${sort_order}
        )
        RETURNING *
      `;
      return res.status(201).json({ data: rows[0] });
    } catch (err) {
      console.error('bookmarks POST error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (req.method === 'PUT') {
    const { id, title, url, category_id, description, sort_order } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });
    const normalizedUrl = url === undefined ? undefined : normalizeBookmarkUrl(url);
    if (url !== undefined && !normalizedUrl) {
      return res.status(400).json({ error: 'A valid http or https URL is required' });
    }
    try {
      const rows = await sql`
        UPDATE bookmarks
        SET
          title = COALESCE(${title}, title),
          url = COALESCE(${normalizedUrl !== undefined ? normalizedUrl : null}, url),
          category_id = ${category_id !== undefined ? category_id : null},
          description = COALESCE(${description}, description),
          sort_order = COALESCE(${sort_order !== undefined ? sort_order : null}, sort_order)
        WHERE id = ${id}
        RETURNING *
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ data: rows[0] });
    } catch (err) {
      console.error('bookmarks PUT error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });
    try {
      await sql`DELETE FROM bookmarks WHERE id = ${id}`;
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('bookmarks DELETE error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
