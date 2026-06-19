import { sql } from '../_db.js';
import { requireAuth } from '../_auth.js';

export default async function handler(req, res) {
  if (!requireAuth(req, res)) return;

  if (req.method === 'GET') {
    try {
      const configRows = await sql`SELECT setting_key, setting_value FROM identity_ceiling_config`;
      const config = {};
      for (const row of configRows) {
        config[row.setting_key] = row.setting_value;
      }
      return res.status(200).json(config);
    } catch (err) {
      return res.status(500).json({ error: 'Failed to load config' });
    }
  }

  if (req.method === 'PUT') {
    const { questions, results } = req.body;
    try {
      if (questions) {
        await sql`
          INSERT INTO identity_ceiling_config (setting_key, setting_value, updated_at)
          VALUES ('questions', ${JSON.stringify(questions)}::jsonb, NOW())
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
        `;
      }
      if (results) {
        await sql`
          INSERT INTO identity_ceiling_config (setting_key, setting_value, updated_at)
          VALUES ('results', ${JSON.stringify(results)}::jsonb, NOW())
          ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = NOW()
        `;
      }
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to save config' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
