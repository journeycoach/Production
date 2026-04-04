import { sql } from './_db.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const type = req.query?.type ?? new URL(req.url, 'http://localhost').searchParams.get('type');

  try {
    switch (type) {
      case 'testimonials': {
        const rows = await sql`
          SELECT id, quote, author
          FROM testimonials
          ORDER BY sort_order ASC, created_at ASC
        `;
        return res.status(200).json({ data: rows });
      }

      case 'navigation': {
        const rows = await sql`SELECT * FROM navigation LIMIT 1`;
        return res.status(200).json({ data: rows[0] || null });
      }

      case 'tools': {
        const rows = await sql`
          SELECT id, title, category, description, type,
            file_url as "fileUrl",
            external_url as "externalUrl",
            is_hidden as "isHidden",
            image_url as "imageUrl"
          FROM tools
          ORDER BY sort_order ASC, created_at ASC
        `;
        return res.status(200).json({ data: rows });
      }

      case 'posts': {
        const rows = await sql`
          SELECT id, title, post_date as date, author, image_url, summary, body
          FROM posts
          ORDER BY post_date DESC
        `;
        return res.status(200).json({ data: rows });
      }

      case 'settings': {
        const rows = await sql`SELECT setting_key, setting_value FROM site_settings ORDER BY setting_key`;
        const data = Object.fromEntries(rows.map(r => [r.setting_key, r.setting_value]));
        return res.status(200).json({ data });
      }

      case 'sections': {
        const page = req.query?.page ?? new URL(req.url, 'http://localhost').searchParams.get('page');
        const rows = page
          ? await sql`SELECT id, page, section_key, label, is_visible, sort_order, status, admin_notes
              FROM page_sections WHERE page = ${page} ORDER BY sort_order ASC`
          : await sql`SELECT id, page, section_key, label, is_visible, sort_order, status, admin_notes
              FROM page_sections ORDER BY page ASC, sort_order ASC`;
        return res.status(200).json({ data: rows });
      }

      case 'bookmarks': {
        const rows = await sql`
          SELECT b.id, b.title, b.url, b.description, b.sort_order,
            bc.id as category_id, bc.title as category_title
          FROM bookmarks b
          LEFT JOIN bookmark_categories bc ON b.category_id = bc.id
          ORDER BY bc.sort_order ASC, b.sort_order ASC
        `;
        return res.status(200).json({ data: rows });
      }

      default:
        return res.status(400).json({ error: 'Unknown content type' });
    }
  } catch (err) {
    console.error(`content[${type}] GET error:`, err);
    return res.status(500).json({ error: 'Database error' });
  }
}
