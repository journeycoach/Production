import { sql } from './_db.js';
import { runMigrations } from './_migrate.js';

const PAGE_LABELS = {
  home: 'Home Page',
  assessment: 'Assessment',
};

function normalizePageKey(value) {
  const key = String(value || '').trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(PAGE_LABELS, key) ? key : null;
}

function normalizePath(value) {
  const path = String(value || '').trim();
  if (!path || path.length > 300) return null;
  return path.startsWith('/') ? path : null;
}

function getBody(req) {
  if (!req.body || typeof req.body !== 'string') return req.body || {};
  try {
    return JSON.parse(req.body);
  } catch (_) {
    return {};
  }
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = getBody(req);
  const pageKey = normalizePageKey(body.pageKey);
  if (!pageKey) return res.status(400).json({ error: 'Unknown page key' });

  try {
    await runMigrations();
    await sql`
      INSERT INTO page_visits (page_key, path)
      VALUES (${pageKey}, ${normalizePath(body.path)})
    `;
    return res.status(204).end();
  } catch (err) {
    console.error('analytics track error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
}
