import { sql } from '../_db.js';
import { getToken, requireAuth, verifyToken } from '../_auth.js';
import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  // Blob client upload endpoint — must come before requireAuth because
  // auth is enforced inside onBeforeGenerateToken via clientPayload.
  if (req.query.action === 'upload') {
    try {
      const jsonResponse = await handleUpload({
        body: req.body,
        request: req,
        onBeforeGenerateToken: async (_pathname, clientPayload) => {
          const requestToken = getToken(req);
          if (!verifyToken(requestToken || clientPayload || '')) throw new Error('Unauthorized');
          return {
            allowedContentTypes: [
              'application/pdf',
              'image/jpeg', 'image/png', 'image/gif', 'image/webp',
              'text/plain',
              'text/csv',
              'application/rtf',
              'application/msword',
              'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              'application/vnd.ms-excel',
              'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
              'application/vnd.ms-powerpoint',
              'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            ],
            addRandomSuffix: true,
            maximumSizeInBytes: 50 * 1024 * 1024, // 50 MB
          };
        },
      });
      return res.status(200).json(jsonResponse);
    } catch (err) {
      console.error('Blob upload error:', err);
      return res.status(err.message === 'Unauthorized' ? 401 : 400).json({ error: err.message });
    }
  }

  if (!requireAuth(req, res)) return;

  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT id, title, category, description, type, file_url, external_url, image_url, is_hidden, sort_order, created_at
        FROM tools
        ORDER BY sort_order ASC, created_at ASC
      `;
      return res.status(200).json({ data: rows });
    } catch (err) {
      console.error('tools GET error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (req.method === 'POST') {
    const { title, category = 'General', description, type, file_url, external_url, image_url, is_hidden = false, sort_order = 0 } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title is required' });
    try {
      const rows = await sql`
        INSERT INTO tools (title, category, description, type, file_url, external_url, image_url, is_hidden, sort_order)
        VALUES (
          ${title},
          ${category},
          ${description || null},
          ${type || null},
          ${file_url || null},
          ${external_url || null},
          ${image_url || null},
          ${is_hidden},
          ${sort_order}
        )
        RETURNING *
      `;
      return res.status(201).json({ data: rows[0] });
    } catch (err) {
      console.error('tools POST error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (req.method === 'PUT') {
    const { id, title, category, description, type, file_url, external_url, image_url, is_hidden, sort_order } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });
    try {
      const rows = await sql`
        UPDATE tools
        SET
          title = COALESCE(${title}, title),
          category = COALESCE(${category}, category),
          description = COALESCE(${description}, description),
          type = COALESCE(${type}, type),
          file_url = COALESCE(${file_url !== undefined ? file_url : null}, file_url),
          external_url = COALESCE(${external_url !== undefined ? external_url : null}, external_url),
          image_url = COALESCE(${image_url !== undefined ? image_url : null}, image_url),
          is_hidden = COALESCE(${is_hidden !== undefined ? is_hidden : null}, is_hidden),
          sort_order = COALESCE(${sort_order !== undefined ? sort_order : null}, sort_order)
        WHERE id = ${id}
        RETURNING *
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ data: rows[0] });
    } catch (err) {
      console.error('tools PUT error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (req.method === 'PATCH') {
    // Bulk sort order update: { orders: [{ id, sort_order }, ...] }
    const { orders } = req.body || {};
    if (!Array.isArray(orders)) return res.status(400).json({ error: 'orders array is required' });
    try {
      for (const { id, sort_order } of orders) {
        await sql`UPDATE tools SET sort_order = ${sort_order} WHERE id = ${id}`;
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('tools PATCH error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });
    try {
      await sql`DELETE FROM tools WHERE id = ${id}`;
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('tools DELETE error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
