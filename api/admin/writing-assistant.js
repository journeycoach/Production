import { sql } from '../_db.js';
import { requireAuth } from '../_auth.js';
import { corpus, checkRepetition, generatePost, WritingError } from '../_writing-assistant.js';
export const config = { maxDuration: 60 };
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store');
  if (!requireAuth(req, res)) return;
  if (req.method === 'GET') return res.status(200).json({ configured: !!process.env.OPENAI_API_KEY });
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const b = req.body || {};
  if (!['repetition','generate'].includes(b.action)) return res.status(400).json({ error: 'Unknown writing action.' });
  if (!process.env.OPENAI_API_KEY) return res.status(503).json({ error: 'AI writing is not connected yet. Add OPENAI_API_KEY to the server environment, then restart the local server. Your ChatGPT subscription does not supply this API key.', setup: true });
  if (typeof b.draft !== 'string' || b.draft.length > 24000 || typeof b.ideaId !== 'string') return res.status(400).json({ error: 'Choose a saved idea and use a draft under 24,000 characters.' });
  try {
    if (b.action === 'generate') {
      if (!['linkedin','blog'].includes(b.kind)) return res.status(400).json({ error: 'Choose LinkedIn or blog.' });
      if (typeof b.direction !== 'string' || b.direction.length > 2000) return res.status(400).json({ error: 'Keep direction under 2,000 characters.' });
      const rows = await sql`SELECT data FROM leadership_ideas WHERE id = ${b.ideaId}`;
      if (!rows.length) return res.status(404).json({ error: 'Idea not found. Save your idea first.' });
      const d = rows[0].data;
      // Source references, imported originals and private review notes are not needed for drafting.
      const idea = Object.fromEntries(['title','observation','themes','leadershipPattern','hiddenCeiling','practicalReframe','supportingExample','closingQuestion','different'].map(k=>[k,String(d[k] || '').slice(0,4000)]));
      if (!b.draft.trim() && !idea.observation && !idea.title) return res.status(400).json({ error: 'Add an idea or draft first.' });
      return res.status(200).json({ data: await generatePost({ idea, draft:b.draft, kind:b.kind, direction:b.direction }) });
    }
    if (!b.draft.trim()) return res.status(400).json({ error: 'Add a draft to check first.' });
    const [ideas, posts] = await Promise.all([
      sql`SELECT id, data FROM leadership_ideas ORDER BY updated_at DESC`,
      sql`SELECT id, title, body, post_date, slug FROM posts ORDER BY post_date DESC`
    ]);
    return res.status(200).json({ data: await checkRepetition(b.draft, corpus(ideas, posts, b.ideaId)) });
  } catch (error) {
    // Do not log draft content, credentials, or provider responses.
    return res.status(502).json({ error: error instanceof WritingError ? error.message : 'The writing assistant could not complete the request. Check the AI connection and API billing, then retry. Your draft is unchanged.' });
  }
}
