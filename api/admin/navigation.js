import { sql } from '../_db.js';
import { requireAuth } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;

  if (req.method === 'GET') {
    try {
      const rows = await sql`SELECT * FROM navigation LIMIT 1`;
      return res.status(200).json({ data: rows[0] || null });
    } catch (err) {
      console.error('navigation GET error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  if (req.method === 'PUT') {
    const { brand_name, nav_links, cta_button } = req.body || {};
    try {
      const existing = await sql`SELECT id FROM navigation LIMIT 1`;
      let row;
      if (existing.length > 0) {
        const navLinksJson = JSON.stringify(nav_links || []);
        const ctaButtonJson = JSON.stringify(cta_button || {});
        const rows = await sql`
          UPDATE navigation
          SET
            brand_name = COALESCE(${brand_name}, brand_name),
            nav_links = ${navLinksJson}::jsonb,
            cta_button = ${ctaButtonJson}::jsonb
          WHERE id = ${existing[0].id}
          RETURNING *
        `;
        row = rows[0];
      } else {
        const navLinksJson = JSON.stringify(nav_links || []);
        const ctaButtonJson = JSON.stringify(cta_button || {});
        const rows = await sql`
          INSERT INTO navigation (brand_name, nav_links, cta_button)
          VALUES (
            ${brand_name || 'Your Journey Coach'},
            ${navLinksJson}::jsonb,
            ${ctaButtonJson}::jsonb
          )
          RETURNING *
        `;
        row = rows[0];
      }
      return res.status(200).json({ data: row });
    } catch (err) {
      console.error('navigation PUT error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
