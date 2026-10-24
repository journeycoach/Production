export const OPPORTUNITY_SCENARIO = {"id":"opportunity","title":"An opportunity to shape something new","description":"You are invited to help shape a promising new initiative. Its direction is still open, and you would have meaningful influence over how it develops. Imagine that you have the time and resources to participate.","questions":[{"id":"opportunity-q7","text":"As you consider the invitation, what naturally draws your attention first?","answers":[{"id":"opportunity-q7-head","center":"head","text":"The exciting possibilities and all the different directions this could grow."},{"id":"opportunity-q7-heart","center":"heart","text":"The people involved, and how I could help them do their best work."},{"id":"opportunity-q7-gut","center":"gut","text":"The freedom to shape the direction without compromising my own judgment or what matters to me."}]},{"id":"opportunity-q8","text":"Beyond whether it succeeds, what would make participating feel worthwhile to you?","answers":[{"id":"opportunity-q8-head","center":"head","text":"Learning something new in depth and seeing how all the pieces fit together."},{"id":"opportunity-q8-heart","center":"heart","text":"Delivering a standout result that people recognize as a real accomplishment."},{"id":"opportunity-q8-gut","center":"gut","text":"Building something done well, with integrity, that I can be proud of."}]},{"id":"opportunity-q9","text":"As you become invested, which inner pattern would you most recognize in yourself?","answers":[{"id":"opportunity-q9-head","center":"head","text":"I test every risk and second-guess commitments before I feel ready to move."},{"id":"opportunity-q9-heart","center":"heart","text":"I worry the work will lose what makes it meaningful to me, and I pull away."},{"id":"opportunity-q9-gut","center":"gut","text":"I go along outwardly rather than disturb things, but become quietly resistant when my own priorities disappear."}]}]};
export const CENTERS = ['head', 'heart', 'gut'];
export function validateConfig(d) {
  if (!d || !d.title?.trim() || ![2,3].includes(d.sections?.length) || d.lenses?.length !== 3) throw new Error('Use three scenarios and three lens profiles (older two-scenario results remain supported).');
  const ids = new Set();
  function check(q) {
    if (!q.id || ids.has(q.id) || !q.text?.trim() || q.answers?.length !== 3) throw new Error('Each question needs a unique ID, text, and three answers.');
    ids.add(q.id);
    if (new Set(q.answers.map(a=>a.id)).size !== 3 || !CENTERS.every(c=>q.answers.some(a=>a.center===c && a.id && a.text?.trim()))) throw new Error('Each question needs one Head, Heart, and Gut answer.');
  }
  for (const s of d.sections) { if(!s.title?.trim() || s.questions?.length!==3) throw new Error('Each scenario needs a name and three questions.'); s.questions.forEach(check); }
  check(d.tiebreaker);
  for(const c of CENTERS) { const l=d.lenses.find(l=>l.id===c); if(!l || !['name','description','attention','high','low','opportunity','reflection'].every(k=>l[k]?.trim())) throw new Error('Complete every result profile before publishing.'); }
  return d;
}
// Ranked mode: each question records {most, least}. Most = 2 points, unmarked middle = 1, least = 0.
// Single mode (older saved results): each question records one answer id worth 1 point.
export const RANK_POINTS = {most:2, middle:1, least:0};
export function isCompleteRanking(q, value) {
  return !!value && typeof value === 'object' && value.most && value.least && value.most !== value.least
    && q.answers.some(a=>a.id===value.most) && q.answers.some(a=>a.id===value.least);
}
export function score(d, answers, tieAnswer) {
  validateConfig(d);
  const questions=d.sections.flatMap(s=>s.questions);
  const values=questions.map(q=>answers?.[q.id]);
  const ranked=values.some(v=>v && typeof v==='object');
  const scores = {head:0,heart:0,gut:0};
  for(const q of questions) {
    const v=answers?.[q.id];
    if(ranked) {
      if(!isCompleteRanking(q,v)) throw new Error('Please mark one answer most like you and one least like you for every question.');
      for(const a of q.answers) scores[a.center]+= a.id===v.most ? RANK_POINTS.most : a.id===v.least ? RANK_POINTS.least : RANK_POINTS.middle;
    } else {
      const a=q.answers.find(a=>a.id===v);
      if(!a) throw new Error('Please answer every question.');
      scores[a.center]++;
    }
  }
  const n=questions.length;
  const total=ranked ? n*3 : n;          // all points awarded across the three lenses
  const max=ranked ? n*2 : n;            // most points one lens can earn
  const closeGap=ranked ? 2 : 1;         // leads this small get the final reflection
  const clearGap=ranked ? 3 : 2;         // leads from here up to strongGap-1 are Clear
  const strongGap=ranked ? 6 : 3;
  const sorted=CENTERS.slice().sort((a,b)=>scores[b]-scores[a]);
  const tied=sorted.filter(c=>scores[c]===scores[sorted[0]]);
  const gap=scores[sorted[0]]-scores[sorted[1]];
  const needsReflection=gap<=closeGap;
  const candidates=tied.length>1 ? tied : needsReflection ? sorted.slice(0,2) : [sorted[0]];
  const tie=d.tiebreaker.answers.find(a=>a.id===tieAnswer);
  const reflectionResolved=needsReflection && candidates.includes(tie?.center);
  const primary=reflectionResolved ? tie.center : tied.length===1 ? sorted[0] : null;
  const strength=needsReflection ? 'Moderate preference' : gap>=strongGap ? 'Strong preference' : gap>=clearGap ? 'Clear preference' : 'Moderate preference';
  return {mode:ranked?'ranked':'single',unit:ranked?'points':'answers',questions:n,total,max,scores,tied,primary,strength,usedTiebreaker:tied.length>1,usedClarification:gap>0&&reflectionResolved,needsReflection,reflectionResolved,candidates,gap};
}
export function shuffle(items, random=Math.random) {
  const a=items.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a;
}
export async function loadConfig() {
  let d=window.LEADERSHIP_LENS_SEED;
  try { const r=await fetch('/api/content?type=leadership-lens',{cache:'no-store'}); if(r.ok){const body=await r.json();if(body.data) d=validateConfig(body.data);} } catch { /* The shipped version remains available during an API outage. */ }
  return validateConfig(upgradeConfig(d));
}
export const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

// Escape first: formatting never permits authored HTML or executable markup.
// Color uses {color:#RRGGBB}text{/color}; only six-digit hex values are honored.
export function formatText(value) {
  return escapeHtml(value).replace(/\{color:(#[0-9a-fA-F]{6})\}([\s\S]*?)\{\/color\}/g,'<span style="color:$1">$2</span>').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>').replace(/__([^_]+)__/g,'<u>$1</u>').replace(/\*([^*]+)\*/g,'<em>$1</em>').replace(/\r?\n/g,'<br>');
}

// Section 01 paragraph alignment. Unknown values fall back to the page default.
export const ALIGNMENTS = ['left','center','right','justify'];
export function alignStyle(d, key) {
  const a = d?.align?.[key];
  return ALIGNMENTS.includes(a) ? ` style="text-align:${a}"` : '';
}

// Intro box text. Undefined uses the default; an empty string hides that line.
export const PANEL_DEFAULTS = {
  panelTitle: 'A perspective, not a label',
  panelBody: 'Explore what gets your attention, how it serves you, and what it may cause you to overlook. This is an Enneagram-informed reflection tool, not a typing assessment or a validated psychological instrument.',
  panelNote: 'Three scenarios, three questions each. A short follow-up helps clarify your motivation when your leading scores are close or tied. No email required.',
};
export const panelText = (d, key) => { const text=typeof d?.[key] === 'string' ? d[key] : PANEL_DEFAULTS[key]; return key==='panelNote' ? text.replace('A short follow-up appears only if your scores tie.','A short follow-up helps clarify your motivation when your leading scores are close or tied.') : text; };

// Add the new scenario to earlier saved configurations without rewriting their content.
export function upgradeConfig(config) {
  const d=structuredClone(config);
  if(!d || !Array.isArray(d.sections))throw new Error('Assessment sections are missing.');
  if(d.sections.length===2)d.sections.push(structuredClone(OPPORTUNITY_SCENARIO));
  d.version=2;
  for(const key of ['panelBody','panelNote'])if(typeof d[key]==='string')d[key]=d[key].replace(/Two scenarios, three questions each\./g,'Three scenarios, three questions each.').replace(/Two scenarios, six questions/g,'Three scenarios, nine questions');
  d.scoringNotes='For each of the nine questions, participants mark the answer most like them (2 points) and least like them (0 points); the remaining answer earns 1 point. Each lens can earn up to 18 of the 27 points. A lead of 6+ points is Strong, 3 to 5 is Clear, and 0 to 2 is Moderate. A top tie or a lead of 2 or fewer points shows the final reflection, limited to the leading lenses; it suggests a primary profile without changing the scores. Preference describes answer consistency, not diagnostic confidence.';
  return d;
}
