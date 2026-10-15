export const CENTERS = ['head', 'heart', 'gut'];
export function validateConfig(d) {
  if (!d || !d.title?.trim() || d.sections?.length !== 2 || d.lenses?.length !== 3) throw new Error('Use two scenarios and three lens profiles.');
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
export function score(d, answers, tieAnswer) {
  validateConfig(d);
  const scores = {head:0,heart:0,gut:0};
  for(const q of d.sections.flatMap(s=>s.questions)) {
    const a=q.answers.find(a=>a.id===answers[q.id]);
    if(!a) throw new Error('Please answer all six questions.');
    scores[a.center]++;
  }
  const sorted=CENTERS.slice().sort((a,b)=>scores[b]-scores[a]);
  const tied=sorted.filter(c=>scores[c]===scores[sorted[0]]);
  const tie=d.tiebreaker.answers.find(a=>a.id===tieAnswer);
  const primary=tied.length===1 ? tied[0] : tied.includes(tie?.center) ? tie.center : null;
  const gap=scores[sorted[0]]-scores[sorted[1]];
  const strength=tied.length>1 || gap===1 ? 'Moderate preference' : gap===2 ? 'Clear preference' : 'Strong preference';
  return {scores,tied,primary,strength,usedTiebreaker:tied.length>1,gap};
}
export function shuffle(items, random=Math.random) {
  const a=items.slice(); for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];} return a;
}
export async function loadConfig() {
  let d=window.LEADERSHIP_LENS_SEED;
  try { const r=await fetch('/api/content?type=leadership-lens',{cache:'no-store'}); if(r.ok){const body=await r.json();if(body.data) d=validateConfig(body.data);} } catch { /* The shipped version remains available during an API outage. */ }
  return validateConfig(d);
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
  panelNote: 'Two scenarios, three questions each. A short follow-up appears only if your scores tie. No email required.',
};
export const panelText = (d, key) => (typeof d?.[key] === 'string' ? d[key] : PANEL_DEFAULTS[key]);
