import crypto from 'node:crypto';
export const fields = ['title','observation','sourceType','sourceReference','themes','leadershipPattern','hiddenCeiling','practicalReframe','supportingExample','closingQuestion','visualConcept','different','parentId','stage'];
export function metadata(input) {
  const out = {};
  for (const key of fields) out[key] = String(input[key] || '').trim();
  if (!out.title && !out.observation) throw new Error('Add a working title or core observation.');
  return out;
}
export function version(input) {
  if (!String(input.name || '').trim() || !String(input.body || '').trim()) throw new Error('Name the version and add draft text.');
  if (!['linkedin','blog','tool'].includes(input.kind)) throw new Error('Choose a draft format.');
  const alternatives = {};
  for (const edge of ['openings','endings']) {
    const values=input.alternatives?.[edge]||[];
    if(!Array.isArray(values)||values.length>2||values.some(v=>typeof v!=='string'||v.length>4000))throw new Error('Use up to two alternatives of 4,000 characters each.');
    alternatives[edge]=values;
  }
  return { ready: input.ready === true, alternatives, id: crypto.randomUUID(), name: input.name.trim(), body: input.body, kind: input.kind, format: input.format === 'html' ? 'html' : 'text', review: input.review || {}, notes: String(input.notes || ''), createdAt: new Date().toISOString() };
}
function validDate(value) { return /^\d{4}-\d{2}-\d{2}$/.test(value || '') && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value; }
export function usage(input, versions) {
  const selected = versions.find(v => v.id === input.versionId);
  if (!selected) throw new Error('Choose the exact saved version shared.');
  if (!['linkedin','blog'].includes(input.channel) || !validDate(input.date)) throw new Error('Choose a channel and valid date.');
  if (input.link && !/^https?:\/\//i.test(input.link)) throw new Error('Use an http or https link.');
  return { id: crypto.randomUUID(), date: input.date, channel: input.channel, link: input.link || '', versionId: selected.id, snapshot: selected };
}
export function historyCheck(input) {
  if (!['linkedin','blog','both'].includes(input.channel) || !validDate(input.from) || !validDate(input.to) || !['none','uncertain'].includes(input.result) || input.from > input.to) throw new Error('Choose the channel and date range checked.');
  return { ...input, checkedAt: new Date().toISOString() };
}
export function importRecords(backup) {
  const rows = Array.isArray(backup) ? backup : backup.ideas || backup.entries || backup.data?.ideas;
  if (!Array.isArray(rows) || rows.length > 500) throw new Error('Expected a JSON array, ideas, or entries (up to 500 records).');
  return rows.map(raw => {
    const data = metadata({ ...raw, observation: raw.observation || raw.coreObservation || raw.content, sourceReference: raw.sourceReference || raw.sourceNotes, themes: Array.isArray(raw.themes) ? raw.themes.join(', ') : raw.themes });
    const versions = raw.versions || raw.draftVersions || [];
    const uses = raw.uses || raw.usageHistory || [];
    if (!Array.isArray(versions) || !Array.isArray(uses)) throw new Error('Versions and usage history must be arrays.');
    data.versions = versions.map(v => ({ ...v, id: String(v.id || crypto.randomUUID()), name: String(v.name || v.title || 'Imported version'), body: String(v.body || v.content || v.text || ''), kind: v.kind || v.channel || 'blog', format: v.format || 'text' }));
    data.uses = uses;
    data.checks = Array.isArray(raw.checks) ? raw.checks : [];
    data.importOriginal = raw;
    const key = 'leadership-notebook:' + (raw.id ? String(raw.id) : crypto.createHash('sha256').update(JSON.stringify(raw)).digest('hex'));
    return { key, data };
  });
}
