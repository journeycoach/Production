import { sql } from '../_db.js';
import { requireAuth } from '../_auth.js';
import { metadata, version, usage, historyCheck, importRecords } from '../_ideas.js';
import crypto from 'node:crypto';
let ready;
async function prepare() {
  if (!ready) ready = sql`CREATE TABLE IF NOT EXISTS leadership_ideas (id TEXT PRIMARY KEY, import_key TEXT UNIQUE, revision INTEGER NOT NULL DEFAULT 1, data JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW())`.catch(e => { ready = null; throw e; });
  await ready;
}
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (!requireAuth(req, res)) return;
  if (!['GET','POST','PUT'].includes(req.method)) return res.status(405).json({ error: 'Method not allowed' });
  try {
    await prepare();
    if (req.method === 'GET') {
      const rows = req.query.id ? await sql`SELECT * FROM leadership_ideas WHERE id = ${req.query.id}` : await sql`SELECT * FROM leadership_ideas ORDER BY updated_at DESC`;
      return res.status(200).json({ data: req.query.id ? rows[0] || null : rows });
    }
    const b = req.body || {};
    if (b.action === 'import-preview' || b.action === 'import') {
      const records = importRecords(b.backup);
      const keys = await sql`SELECT import_key FROM leadership_ideas WHERE import_key IS NOT NULL`;
      const seen = new Set(keys.map(r => r.import_key));
      const preview = records.map(r => { const skip = seen.has(r.key); seen.add(r.key); return { ...r, skip }; });
      if (b.action === 'import') {
        let imported = 0;
        // Each record is atomic. Retrying a partially completed import skips committed keys.
        for (const r of preview.filter(r => !r.skip)) {
          const result = await sql`INSERT INTO leadership_ideas (id, import_key, data) VALUES (${crypto.randomUUID()}, ${r.key}, ${JSON.stringify(r.data)}::jsonb) ON CONFLICT (import_key) DO NOTHING RETURNING id`;
          imported += result.length;
        }
        return res.status(200).json({ imported, skipped: records.length - imported });
      }
      return res.status(200).json({ data: preview.map(r => ({ title: r.data.title || r.data.observation, versions: r.data.versions.length, uses: r.data.uses.length, skip: r.skip, preserved: r.data })) });
    }
    if (req.method === 'POST') {
      const data = { ...metadata(b), versions: [], uses: [], checks: [] };
      const rows = await sql`INSERT INTO leadership_ideas (id,data) VALUES (${crypto.randomUUID()}, ${JSON.stringify(data)}::jsonb) RETURNING *`;
      return res.status(201).json({ data: rows[0] });
    }
    const rows = await sql`SELECT * FROM leadership_ideas WHERE id = ${b.id}`;
    if (!rows[0]) return res.status(404).json({ error: 'Idea not found.' });
    let data = rows[0].data;
    if (b.action === 'version') data = { ...data, versions: [...data.versions, version(b)] };
    else if (b.action === 'usage') data = { ...data, uses: [...data.uses, usage(b, data.versions)] };
    else if (b.action === 'check') data = { ...data, checks: [...data.checks, historyCheck(b.check)] };
    else data = { ...data, ...metadata(b) };
    const saved = await sql`UPDATE leadership_ideas SET data = ${JSON.stringify(data)}::jsonb, revision = revision + 1, updated_at = NOW() WHERE id = ${b.id} AND revision = ${b.revision} RETURNING *`;
    if (!saved.length) return res.status(409).json({ error: 'This idea changed on another device. Copy your unsaved text, reload, and try again.' });
    return res.status(200).json({ data: saved[0] });
  } catch (e) {
    console.error('Ideas request failed', e.message);
    return res.status(e.code ? 500 : 400).json({ error: e.code ? 'Storage unavailable. Please retry.' : e.message });
  }
}
