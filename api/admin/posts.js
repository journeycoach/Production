import { sql } from '../_db.js';
import { getToken, requireAuth, verifyToken } from '../_auth.js';
import { handleUpload } from '@vercel/blob/client';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

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
              'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            ],
            addRandomSuffix: true,
            maximumSizeInBytes: 10 * 1024 * 1024, // 10 MB
          };
        },
      });
      return res.status(200).json(jsonResponse);
    } catch (err) {
      console.error('Post image upload error:', err);
      return res.status(err.message === 'Unauthorized' ? 401 : 400).json({ error: err.message });
    }
  }

  if (!requireAuth(req, res)) return;

  if (req.method === 'GET') {
    try {
      const rows = await sql`
        SELECT id, title, post_date, author, image_url, summary, body
        FROM posts
        ORDER BY post_date DESC
      `;
      return res.status(200).json({ data: rows });
    } catch (err) {
      console.error('posts GET error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (req.method === 'POST') {
    const { title, post_date, author = 'John Paine', image_url, summary, body } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title is required' });
    try {
      const rows = await sql`
        INSERT INTO posts (title, post_date, author, image_url, summary, body)
        VALUES (
          ${title},
          ${post_date || null},
          ${author},
          ${image_url || null},
          ${summary || null},
          ${body || null}
        )
        RETURNING *
      `;
      return res.status(201).json({ data: rows[0] });
    } catch (err) {
      console.error('posts POST error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (req.method === 'PUT') {
    const { id, title, post_date, author, image_url, summary, body } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });
    try {
      const rows = await sql`
        UPDATE posts
        SET
          title = COALESCE(${title}, title),
          post_date = COALESCE(${post_date || null}, post_date),
          author = COALESCE(${author}, author),
          image_url = ${image_url !== undefined ? image_url : null},
          summary = ${summary !== undefined ? summary : null},
          body = ${body !== undefined ? body : null}
        WHERE id = ${id}
        RETURNING *
      `;
      if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
      return res.status(200).json({ data: rows[0] });
    } catch (err) {
      console.error('posts PUT error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (req.method === 'DELETE') {
    const { id } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });
    try {
      await sql`DELETE FROM posts WHERE id = ${id}`;
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error('posts DELETE error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
