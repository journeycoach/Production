import { sql } from '../_db.js';
import { getToken, requireAuth, verifyToken } from '../_auth.js';
import { handleUpload } from '@vercel/blob/client';
import { runMigrations } from '../_migrate.js';

function toSlug(title) {
  return String(title || '')
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

async function uniqueSlug(base, excludeId = null) {
  let slug = base;
  let n = 2;
  while (true) {
    const rows = excludeId
      ? await sql`SELECT id FROM posts WHERE slug = ${slug} AND id != ${excludeId}`
      : await sql`SELECT id FROM posts WHERE slug = ${slug}`;
    if (!rows.length) return slug;
    slug = `${base}-${n++}`;
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.query.action === 'upload') {
    try {
      const blobToken = process.env.BLOB_READ_WRITE_TOKEN;
      if (!blobToken) throw new Error('Blob token not configured');
      const jsonResponse = await handleUpload({
        body: req.body,
        request: req,
        token: blobToken,
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
  await runMigrations();

  if (req.method === 'GET') {
    try {
      // Back-fill any posts missing a slug
      const unslugged = await sql`SELECT id, title FROM posts WHERE slug IS NULL OR slug = ''`;
      for (const p of unslugged) {
        const slug = await uniqueSlug(toSlug(p.title), p.id);
        await sql`UPDATE posts SET slug = ${slug} WHERE id = ${p.id}`;
      }
      const rows = await sql`
        SELECT id, title, post_date, author, image_url, summary, body, slug
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
    const { title, post_date, author = 'John Paine', image_url, summary, body, slug: rawSlug } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title is required' });
    try {
      const slug = await uniqueSlug(toSlug(rawSlug || title));
      const rows = await sql`
        INSERT INTO posts (title, post_date, author, image_url, summary, body, slug)
        VALUES (
          ${title},
          ${post_date || null},
          ${author},
          ${image_url || null},
          ${summary || null},
          ${body || null},
          ${slug}
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
    const { id, title, post_date, author, image_url, summary, body, slug: rawSlug } = req.body || {};
    if (!id) return res.status(400).json({ error: 'id is required' });
    try {
      // If a new slug is explicitly provided, use it (unique-ified); otherwise keep existing
      let slugUpdate = null;
      if (rawSlug !== undefined) {
        slugUpdate = await uniqueSlug(toSlug(rawSlug || title || ''), id);
      }
      const rows = await sql`
        UPDATE posts
        SET
          title     = COALESCE(${title}, title),
          post_date = CASE WHEN ${post_date !== undefined} THEN ${post_date || null} ELSE post_date END,
          author    = COALESCE(${author}, author),
          image_url = CASE WHEN ${image_url !== undefined} THEN ${image_url || null} ELSE image_url END,
          summary   = CASE WHEN ${summary !== undefined} THEN ${summary || null} ELSE summary END,
          body      = CASE WHEN ${body !== undefined} THEN ${body || null} ELSE body END,
          slug      = COALESCE(${slugUpdate}, slug)
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
