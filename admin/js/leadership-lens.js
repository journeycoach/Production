import {validateConfig,formatText} from '../../js/leadership-lens-core.js?v=2';
const KEY = 'leadership_lens_draft_v1';
const $ = id => document.getElementById(id);
const id = () => crypto.randomUUID();
const answer = () => ({ id: id(), text: '' });
const question = () => ({ id: id(), text: '', answers: [answer(), answer(), answer()] });
const section = () => ({ id: id(), title: '', questions: [question()] });
let draft = { version: 1, title: 'Leadership Lens', intro: '', instructions: '', sections: [section()], lenses: [], scoringNotes: '' };
if (window.LEADERSHIP_LENS_SEED) draft = structuredClone(window.LEADERSHIP_LENS_SEED);
let dirty = false;
let revision = 0;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function updateTextPreviews() { for (const key of ['title','intro','instructions']) $(key+'-preview').innerHTML = formatText(draft[key]); }
function changed() { updateTextPreviews(); dirty = true; revision++; $('status').textContent = 'Unsaved changes'; }
function field(label, path, value, placeholder = '') {
  return `<label>${label}<input data-path="${path}" value="${esc(value)}" placeholder="${esc(placeholder)}" maxlength="2000"></label>`;
}
function actions(type, index, length, extra = '') {
  return `<div class="item-actions"><button data-action="${type}-up" data-index="${index}" ${extra} ${index === 0 ? 'disabled' : ''} aria-label="Move ${type} ${index + 1} up">↑ Move up</button><button data-action="${type}-down" data-index="${index}" ${extra} ${index === length - 1 ? 'disabled' : ''} aria-label="Move ${type} ${index + 1} down">↓ Move down</button><button data-action="${type}-remove" data-index="${index}" ${extra}>Remove ${type}</button></div>`;
}
function render() {
  draft.tiebreaker ||= structuredClone(window.LEADERSHIP_LENS_SEED.tiebreaker);
  $('tiebreaker').innerHTML = field('Final question', 'tiebreaker.text', draft.tiebreaker.text) + draft.tiebreaker.answers.map((a,i)=>field(a.center.toUpperCase()+' answer (shown only when tied)', `tiebreaker.answers.${i}.text`, a.text)).join('');
  for (const key of ['title','intro','instructions','scoringNotes']) $(key).value = draft[key];
  updateTextPreviews();
  $('sections').innerHTML = draft.sections.map((s, si) => `<div class="section-item"><h3>Section ${si + 1}</h3>${field('Section name',`sections.${si}.title`,s.title,'Add a section name')}<label>Scenario context<textarea data-path="sections.${si}.description">${esc(s.description || '')}</textarea></label>${actions('section',si,draft.sections.length)}${s.questions.map((q,qi) => `<div class="question-item"><h4>Question ${qi+1}</h4>${field('Question text',`sections.${si}.questions.${qi}.text`,q.text,'Write your question later')}${actions('question',qi,s.questions.length,`data-section="${si}"`)}${q.answers.map((a,ai) => `<div class="answer-row">${field(`Answer ${ai+1}${a.center ? ' · ' + a.center.toUpperCase() + ' (editor only)' : ''}`,`sections.${si}.questions.${qi}.answers.${ai}.text`,a.text,'Add an answer choice')}<label>Lens mapping<select data-path="sections.${si}.questions.${qi}.answers.${ai}.center"><option value="">Choose lens</option>${['head','heart','gut'].map(c=>`<option value="${c}" ${a.center===c?'selected':''}>${c}</option>`).join('')}</select></label><button data-action="answer-remove" data-section="${si}" data-question="${qi}" data-index="${ai}" aria-label="Remove answer ${ai+1}">Remove</button></div>`).join('')}<button class="btn btn-ghost" data-action="answer-add" data-section="${si}" data-question="${qi}">+ Add answer</button></div>`).join('')}<button class="btn btn-ghost" data-action="question-add" data-section="${si}">+ Add question</button></div>`).join('') || '<p>No sections yet. Add a section to begin.</p>';
  $('lenses').innerHTML = draft.lenses.map((l,li) => `<div class="section-item">${field('Lens name',`lenses.${li}.name`,l.name,'Name this lens later')}<label>Result headline<textarea data-path="lenses.${li}.description" placeholder="Describe this leadership lens">${esc(l.description)}</textarea></label>${['attention','high','low','opportunity','reflection'].map(key => `<label>${({attention:'Where your attention goes',high:'The high side',low:'The low side',opportunity:'Your leadership opportunity',reflection:'Reflection question'})[key]}<textarea data-path="lenses.${li}.${key}">${esc(l[key] || '')}</textarea></label>`).join('')}<a class="btn btn-ghost" href="/leadership-lens-results.html?lens=${encodeURIComponent(l.id)}" target="_blank" rel="noopener">View saved result draft</a>${actions('lens',li,draft.lenses.length)}</div>`).join('') || '<p>No lens types defined yet.</p>';
}
$('editor').addEventListener('input', e => {
  const path = e.target.dataset.path || (['title','intro','instructions','scoringNotes'].includes(e.target.id) ? e.target.id : null);
  if (!path) return;
  const parts = path.split('.'); let target = draft;
  for (const part of parts.slice(0,-1)) target = target[part];
  target[parts.at(-1)] = e.target.value; changed();
});
$('editor').addEventListener('click', e => {
  const b = e.target.closest('[data-action]'); if (!b) return;
  const [type, action] = b.dataset.action.split('-');
  const si = Number(b.dataset.section), qi = Number(b.dataset.question), i = Number(b.dataset.index);
  const list = type === 'section' ? draft.sections : type === 'lens' ? draft.lenses : type === 'question' ? draft.sections[si].questions : draft.sections[si].questions[qi].answers;
  if (action === 'add') list.push(type === 'question' ? question() : answer());
  if (action === 'remove') {
    if (!confirm(`Remove this ${type}? This will also remove its contents.`)) return;
    list.splice(i,1);
  }
  if (action === 'up' || action === 'down') { const next = i + (action === 'up' ? -1 : 1); if(next < 0 || next >= list.length) return; [list[i],list[next]] = [list[next],list[i]]; }
  changed(); render();
});
$('add-section').onclick = () => { draft.sections.push(section()); changed(); render(); };
$('add-lens').onclick = () => { draft.lenses.push({id:id(),name:'',description:''}); changed(); render(); };
$('save').onclick = async () => {
  const savedRevision = revision; $('save').disabled = true; $('status').textContent = 'Saving…';
  try {
    const response = await adminFetch('/api/admin/settings', {method:'PUT',body:JSON.stringify({[KEY]:JSON.stringify(draft)})});
    if (!response.ok) throw new Error('Could not save. Your edits are still on this page. Try again.');
    dirty = revision !== savedRevision;
    $('status').textContent = dirty ? 'Earlier changes saved. You have newer unsaved changes.' : 'Draft saved. It is not published.';
  } catch(error) { $('status').textContent = error.message; }
  finally { $('save').disabled = false; }
};
$('export').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(draft,null,2)],{type:'application/json'}));
  const a = document.createElement('a'); a.href = url; a.download = 'leadership-lens-draft.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
};
$('preview').onclick = () => {
  $('preview-body').innerHTML = `<h1>${formatText(draft.title || 'Untitled assessment')}</h1><p>${formatText(draft.intro)}</p><p>${formatText(draft.instructions)}</p>` + draft.sections.map((s,si) => `<h3>${esc(s.title || `Section ${si+1}`)}</h3><p>${esc(s.description || '')}</p>` + s.questions.map((q,qi) => `<fieldset class="preview-question"><legend>${esc(q.text || `Question ${qi+1} — text to be added`)}</legend>${q.answers.map((a,ai) => `<label><input type="radio" name="preview-${si}-${qi}" value="${ai}">${esc(a.text || `Answer ${ai+1} — text to be added`)}</label>`).join('')}</fieldset>`).join('')).join('');
  $('preview-dialog').showModal();
};
$('close-preview').onclick = () => $('preview-dialog').close();
window.addEventListener('beforeunload', e => { if(dirty) { e.preventDefault(); e.returnValue = ''; } });
function valid(d) {
  const str = v => typeof v === 'string';
  return d?.version === 1 && ['title','intro','instructions','scoringNotes'].every(k => str(d[k])) && Array.isArray(d.sections) && Array.isArray(d.lenses) && d.sections.every(s => str(s.id) && str(s.title) && Array.isArray(s.questions) && s.questions.every(q => str(q.id) && str(q.text) && Array.isArray(q.answers) && q.answers.every(a => str(a.id) && str(a.text)))) && d.lenses.every(l => str(l.id) && str(l.name) && str(l.description));
}
async function init() {
  if (!requireAdminAuth()) return;
  try {
    const response = await adminFetch('/api/admin/settings');
    if (!response.ok) throw new Error('Could not load your draft. Reload to try again.');
    const body = await response.json(); const stored = body.data?.[KEY];
    if (stored) { const parsed = JSON.parse(stored); if(!valid(parsed)) throw new Error('Saved draft format is not supported. No changes have been made.'); draft = parsed; }
    render(); $('editor').disabled = false; $('save').disabled = false;
    $('status').textContent = stored ? 'Saved draft loaded.' : 'New draft — add your structure, then save.';
  } catch(error) { $('status').textContent = error.message; }
}
init();

$('publish').onclick = async () => {
  try { validateConfig(draft); } catch(e) { $('status').textContent=e.message;return; }
  if(!confirm('Publish this wording to the participant assessment? Saved draft edits are separate until you publish.'))return;
  $('publish').disabled=true;
  try {const r=await adminFetch('/api/admin/settings',{method:'PUT',body:JSON.stringify({leadership_lens_published_v1:JSON.stringify(draft)})});if(!r.ok)throw new Error('Publishing failed. Your draft is unchanged.');$('status').textContent='Assessment wording published.'; } catch(e){$('status').textContent=e.message;}finally{$('publish').disabled=false;}
};

$('assessment-details').addEventListener('click', e => {
  const button=e.target.closest('[data-format]'); if(!button) return;
  const field=$(button.dataset.field), start=field.selectionStart, end=field.selectionEnd;
  const selected=field.value.slice(start,end), marker=button.dataset.format;
  if(marker==='clear') {
    const from=start===end?0:start, to=start===end?field.value.length:end;
    field.setRangeText(field.value.slice(from,to).replace(/\*\*|__|\*/g,''),from,to,'select');
  } else {
    const text=selected || 'your text';
    field.setRangeText(marker+text+marker,start,end,'select');
    field.setSelectionRange(start+marker.length,start+marker.length+text.length);
  }
  draft[button.dataset.field]=field.value;changed();field.focus();
});
