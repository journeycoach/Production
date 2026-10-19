import {validateConfig,upgradeConfig,formatText,alignStyle,ALIGNMENTS,PANEL_DEFAULTS,panelText} from '../../js/leadership-lens-core.js?v=7';
const KEY = 'leadership_lens_draft_v1';
const $ = id => document.getElementById(id);
const id = () => crypto.randomUUID();
const answer = () => ({ id: id(), text: '' });
const question = () => ({ id: id(), text: '', answers: [answer(), answer(), answer()] });
const section = () => ({ id: id(), title: '', questions: [question()] });
let draft = { version: 1, title: 'Leadership Lens', intro: '', instructions: '', sections: [section()], lenses: [], scoringNotes: '' };
if (window.LEADERSHIP_LENS_SEED) draft = upgradeConfig(window.LEADERSHIP_LENS_SEED);
const openScenarios = new Set();
const openProfiles = new Set();
let dirty = false;
let revision = 0;
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PANEL_FIELDS = [['panelTitle','Intro box heading'],['panelBody','Intro box text'],['panelNote','Intro box closing line']];
const DETAIL_FIELDS = ['title','intro','panelTitle','panelBody','instructions','panelNote'];
// Editors for the intro box lines, built with the same markup as the section 01 editors.
function addPanelEditors() {
  if ($('panelTitle')) return;
  const anchor = $('instructions-preview').closest?.('.text-editor'); if (!anchor) return;
  const editors = PANEL_FIELDS.map(([key,label]) => `<div class="text-editor"><label for="${key}">${label}</label><div class="format-toolbar" role="group" aria-label="${label} formatting">${[['**','Bold'],['*','Italic'],['__','Underline'],['clear','Clear formatting']].map(([m,l])=>`<button type="button" data-format="${m}" data-field="${key}">${l}</button>`).join('')}</div><textarea id="${key}" aria-describedby="format-help panel-help" rows="2"></textarea><div class="formatted-preview" id="${key}-preview" aria-label="${label} formatted preview"></div></div>`);
  anchor.insertAdjacentHTML('beforebegin', `<p id="panel-help" class="panel-help">These editors follow the order of the intro box on the assessment. Leave an intro box field empty to hide that line.</p>` + editors[0] + editors[1]);
  anchor.insertAdjacentHTML('afterend', editors[2]);
}
const COLORS = [['Charcoal','#1c2321'],['Forest green','#4a6741'],['Gold','#c5a065'],['Slate','#596575'],['Deep red','#9a3026']];
function updateTextPreviews() {
  for (const key of DETAIL_FIELDS) {
    const el = $(key+'-preview'); el.innerHTML = formatText(draft[key]);
    el.style.textAlign = ALIGNMENTS.includes(draft.align?.[key]) ? draft.align[key] : '';
    document.querySelectorAll(`[data-align][data-field="${key}"]`).forEach(b => b.setAttribute('aria-pressed', String((draft.align?.[key] || 'left') === b.dataset.align)));
  }
}
// Color and alignment controls are added to the section 01 toolbars only.
function addDetailControls() {
  for (const key of DETAIL_FIELDS) {
    const bar = document.querySelector(`#assessment-details .format-toolbar [data-field="${key}"]`)?.parentElement;
    if (!bar || bar.querySelector('.color-group')) continue;
    bar.insertAdjacentHTML('beforeend', `<span class="color-group" role="group" aria-label="Text color">${COLORS.map(([n,c]) => `<button type="button" class="swatch" data-color="${c}" data-field="${key}" title="${n}" aria-label="Color selected text ${n}" style="--swatch:${c}"></button>`).join('')}<label class="custom-color" title="Custom color">Custom<input type="color" data-color-input data-field="${key}" value="#4a6741" aria-label="Choose a custom text color"></label></span><span class="align-group" role="group" aria-label="Text alignment">${ALIGNMENTS.map(a => `<button type="button" data-align="${a}" data-field="${key}" aria-pressed="false">${a[0].toUpperCase()+a.slice(1)}</button>`).join('')}</span>`);
  }
}

// Question text gets the same formatting tools as section 01 (bold, italic, underline, color, alignment).
function questionEditor(si, qi, q) {
  const tid = `qtext-${si}-${qi}`, path = `sections.${si}.questions.${qi}`;
  const fmt = [['**','Bold'],['*','Italic'],['__','Underline'],['clear','Clear formatting']].map(([m,l]) => `<button type="button" data-qformat="${m}" data-target="${tid}">${l}</button>`).join('');
  const colors = COLORS.map(([n,c]) => `<button type="button" class="swatch" data-qcolor="${c}" data-target="${tid}" title="${n}" aria-label="Color selected text ${n}" style="--swatch:${c}"></button>`).join('');
  const aligns = ALIGNMENTS.map(a => `<button type="button" data-qalign="${a}" data-qpath="${path}" aria-pressed="${(q.align || 'left') === a}">${a[0].toUpperCase()+a.slice(1)}</button>`).join('');
  return `<div class="text-editor question-editor"><label for="${tid}">Question text</label><div class="format-toolbar" role="group" aria-label="Question ${qi+1} formatting">${fmt}<span class="color-group" role="group" aria-label="Text color">${colors}<label class="custom-color" title="Custom color">Custom<input type="color" data-qcolor-input data-target="${tid}" value="#4a6741" aria-label="Choose a custom text color"></label></span><span class="align-group" role="group" aria-label="Text alignment">${aligns}</span></div><textarea id="${tid}" data-path="${path}.text" data-preview="${tid}-preview" rows="2" maxlength="2000" placeholder="Write your question later">${esc(q.text)}</textarea><div class="formatted-preview" id="${tid}-preview"${alignStyle({align:{q:q.align}},'q')}>${formatText(q.text)}</div></div>`;
}
function pathTarget(path) { const parts = path.split('.'); let t = draft; for (const p of parts) t = t[p]; return t; }
function formatTextarea(field, marker) {
  const start = field.selectionStart, end = field.selectionEnd;
  if (marker === 'clear') {
    const from = start === end ? 0 : start, to = start === end ? field.value.length : end;
    field.setRangeText(field.value.slice(from,to).replace(/\*\*|__|\*|\{color:#[0-9a-fA-F]{6}\}|\{\/color\}/g,''), from, to, 'select');
  } else if (marker.startsWith('#')) {
    const text = field.value.slice(start,end) || 'your text', open = `{color:${marker}}`;
    field.setRangeText(open + text.replace(/\{color:#[0-9a-fA-F]{6}\}|\{\/color\}/g,'') + '{/color}', start, end, 'select');
    field.setSelectionRange(start + open.length, start + open.length + text.length);
  } else {
    const text = field.value.slice(start,end) || 'your text';
    field.setRangeText(marker + text + marker, start, end, 'select');
    field.setSelectionRange(start + marker.length, start + marker.length + text.length);
  }
  field.dispatchEvent(new Event('input', { bubbles: true })); field.focus();
}
function applyColor(key, color) {
  const field = $(key), start = field.selectionStart, end = field.selectionEnd;
  const text = field.value.slice(start,end) || 'your text';
  const open = `{color:${color}}`;
  field.setRangeText(open + text.replace(/\{color:#[0-9a-fA-F]{6}\}|\{\/color\}/g,'') + '{/color}', start, end, 'select');
  field.setSelectionRange(start + open.length, start + open.length + text.length);
  draft[key] = field.value; changed(); field.focus();
}
function changed() { updateTextPreviews(); dirty = true; revision++; $('status').textContent = 'Unsaved changes'; }
function field(label, path, value, placeholder = '') {
  return `<label>${label}<input data-path="${path}" value="${esc(value)}" placeholder="${esc(placeholder)}" maxlength="2000"></label>`;
}
function actions(type, index, length, extra = '') {
  return `<div class="item-actions"><button data-action="${type}-up" data-index="${index}" ${extra} ${index === 0 ? 'disabled' : ''} aria-label="Move ${type} ${index + 1} up">↑ Move up</button><button data-action="${type}-down" data-index="${index}" ${extra} ${index === length - 1 ? 'disabled' : ''} aria-label="Move ${type} ${index + 1} down">↓ Move down</button><button data-action="${type}-remove" data-index="${index}" ${extra}>Remove ${type}</button></div>`;
}
function render() {
  draft.tiebreaker ||= structuredClone(window.LEADERSHIP_LENS_SEED.tiebreaker);
  $('tiebreaker').innerHTML = field('Final question', 'tiebreaker.text', draft.tiebreaker.text) + draft.tiebreaker.answers.map((a,i)=>field(a.center.toUpperCase()+' answer (shown for eligible close or tied lenses)', `tiebreaker.answers.${i}.text`, a.text)).join('');
  for (const key of ['title','intro','instructions','scoringNotes']) $(key).value = draft[key];
  addPanelEditors(); for (const [k] of PANEL_FIELDS) { if (typeof draft[k] !== 'string') draft[k] = PANEL_DEFAULTS[k]; $(k).value = draft[k]; }
  addDetailControls(); updateTextPreviews();
  $('sections').innerHTML = draft.sections.map((s, si) => `<details class="section-item scenario-fold" data-scenario-id="${esc(s.id)}" ${openScenarios.has(s.id)?'open':''}><summary><span class="fold-label">Scenario ${si + 1}</span><span class="fold-title">${esc(s.title || 'Untitled scenario')}</span><span class="fold-count">${s.questions.length} questions</span></summary><div class="fold-body">${field('Section name',`sections.${si}.title`,s.title,'Add a section name')}<label>Scenario context<textarea data-path="sections.${si}.description">${esc(s.description || '')}</textarea></label>${actions('section',si,draft.sections.length)}${s.questions.map((q,qi) => `<div class="question-item"><h4>Question ${qi+1}</h4>${questionEditor(si,qi,q)}${actions('question',qi,s.questions.length,`data-section="${si}"`)}${q.answers.map((a,ai) => `<div class="answer-row"><label class="answer-text">Answer ${ai+1}${a.center ? ' · ' + a.center.toUpperCase() + ' (editor only)' : ''}<textarea data-path="sections.${si}.questions.${qi}.answers.${ai}.text" placeholder="Add an answer choice" maxlength="2000" rows="2">${esc(a.text)}</textarea></label><label class="answer-lens">Lens<select data-path="sections.${si}.questions.${qi}.answers.${ai}.center"><option value="">Choose lens</option>${['head','heart','gut'].map(c=>`<option value="${c}" ${a.center===c?'selected':''}>${c}</option>`).join('')}</select></label><button data-action="answer-remove" data-section="${si}" data-question="${qi}" data-index="${ai}" aria-label="Remove answer ${ai+1}">Remove</button></div>`).join('')}<button class="btn btn-ghost" data-action="answer-add" data-section="${si}" data-question="${qi}">+ Add answer</button></div>`).join('')}<button class="btn btn-ghost" data-action="question-add" data-section="${si}">+ Add question</button></div></details>`).join('') || '<p>No sections yet. Add a section to begin.</p>';
  $('lenses').innerHTML = draft.lenses.map((l,li) => `<details class="section-item profile-fold" data-profile-id="${esc(l.id)}" ${openProfiles.has(l.id)?'open':''}><summary><span class="fold-label">Result profile</span><span class="fold-title">${esc(l.name || 'Untitled lens')}</span></summary><div class="fold-body">${field('Lens name',`lenses.${li}.name`,l.name,'Name this lens later')}<label>Result headline<textarea data-path="lenses.${li}.description" placeholder="Describe this leadership lens">${esc(l.description)}</textarea></label>${['attention','high','low','opportunity','reflection'].map(key => `<label>${({attention:'Where your attention goes',high:'The high side',low:'The low side',opportunity:'Your leadership opportunity',reflection:'Reflection question'})[key]}<textarea data-path="lenses.${li}.${key}">${esc(l[key] || '')}</textarea></label>`).join('')}<a class="btn btn-ghost" href="/leadership-lens-results.html?lens=${encodeURIComponent(l.id)}" target="_blank" rel="noopener">View saved result draft</a>${actions('lens',li,draft.lenses.length)}</div></details>`).join('') || '<p>No lens types defined yet.</p>';
}
for (const [container, attribute, expanded] of [['sections','scenarioId',openScenarios],['lenses','profileId',openProfiles]]) {
  $(container).addEventListener('toggle', e => {
    const item=e.target;const key=item.dataset?.[attribute];if(!key)return;
    if(item.open)expanded.add(key);else expanded.delete(key);
  },true);
}
$('editor').addEventListener('input', e => {
  const path = e.target.dataset.path || (['title','intro','instructions','scoringNotes',...PANEL_FIELDS.map(f=>f[0])].includes(e.target.id) ? e.target.id : null);
  if (!path) return;
  const parts = path.split('.'); let target = draft;
  for (const part of parts.slice(0,-1)) target = target[part];
  target[parts.at(-1)] = e.target.value; changed();
  if (/^sections\.\d+\.title$|^lenses\.\d+\.name$/.test(path)) {
    const summary=e.target.closest?.('details')?.querySelector('.fold-title');
    if(summary)summary.textContent=e.target.value || (path.startsWith('sections.')?'Untitled scenario':'Untitled lens');
  }
  if (e.target.dataset.preview) $(e.target.dataset.preview).innerHTML = formatText(e.target.value);
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
$('add-section').onclick = () => { const added=section();openScenarios.add(added.id);draft.sections.push(added); changed(); render(); };
$('add-lens').onclick = () => { const added={id:id(),name:'',description:''};openProfiles.add(added.id);draft.lenses.push(added); changed(); render(); };
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
  $('preview-body').innerHTML = `<h1${alignStyle(draft,'title')}>${formatText(draft.title || 'Untitled assessment')}</h1><p${alignStyle(draft,'intro')}>${formatText(draft.intro)}</p><div class="preview-panel">${['panelTitle','panelBody','instructions','panelNote'].map(k => { const t = k === 'instructions' ? draft.instructions : panelText(draft,k); return t && t.trim() ? `<${k==='panelTitle'?'h3':'p'}${alignStyle(draft,k)}>${formatText(t)}</${k==='panelTitle'?'h3':'p'}>` : ''; }).join('')}</div>` + draft.sections.map((s,si) => `<h3>${esc(s.title || `Section ${si+1}`)}</h3><p>${esc(s.description || '')}</p>` + s.questions.map((q,qi) => `<fieldset class="preview-question"><legend${alignStyle({align:{q:q.align}},'q')}>${q.text ? formatText(q.text) : `Question ${qi+1} — text to be added`}</legend>${q.answers.map((a,ai) => `<label><input type="radio" name="preview-${si}-${qi}" value="${ai}">${esc(a.text || `Answer ${ai+1} — text to be added`)}</label>`).join('')}</fieldset>`).join('')).join('');
  $('preview-dialog').showModal();
};
$('close-preview').onclick = () => $('preview-dialog').close();
window.addEventListener('beforeunload', e => { if(dirty) { e.preventDefault(); e.returnValue = ''; } });
function valid(d) {
  const str = v => typeof v === 'string';
  return [1,2].includes(d?.version) && ['title','intro','instructions','scoringNotes'].every(k => str(d[k])) && Array.isArray(d.sections) && Array.isArray(d.lenses) && d.sections.every(s => str(s.id) && str(s.title) && Array.isArray(s.questions) && s.questions.every(q => str(q.id) && str(q.text) && Array.isArray(q.answers) && q.answers.every(a => str(a.id) && str(a.text)))) && d.lenses.every(l => str(l.id) && str(l.name) && str(l.description));
}
async function init() {
  if (!requireAdminAuth()) return;
  try {
    const response = await adminFetch('/api/admin/settings');
    if (!response.ok) throw new Error('Could not load your draft. Reload to try again.');
    const body = await response.json(); const stored = body.data?.[KEY];
    if (stored) { const parsed = JSON.parse(stored); if(!valid(parsed)) throw new Error('Saved draft format is not supported. No changes have been made.'); draft = upgradeConfig(parsed); }
    render(); $('editor').disabled = false; $('save').disabled = false; $('publish').disabled = false;
    $('status').textContent = stored ? 'Saved draft loaded.' : 'New draft — add your structure, then save.';
  } catch(error) { $('status').textContent = error.message; }
}
init();

$('publish').onclick = async () => {
  try { validateConfig(draft); if(draft.sections.length!==3)throw new Error('Publish three scenarios with three questions each.'); } catch(e) { $('status').textContent=e.message;return; }
  if(!confirm('Publish this wording to the participant assessment? Saved draft edits are separate until you publish.'))return;
  $('publish').disabled=true;
  try {const r=await adminFetch('/api/admin/settings',{method:'PUT',body:JSON.stringify({leadership_lens_published_v1:JSON.stringify(draft)})});if(!r.ok)throw new Error('Publishing failed. Your draft is unchanged.');$('status').textContent='Assessment wording published.'; } catch(e){$('status').textContent=e.message;}finally{$('publish').disabled=false;}
};

$('assessment-details').addEventListener('click', e => {
  const swatch=e.target.closest('[data-color]'); if(swatch) { applyColor(swatch.dataset.field, swatch.dataset.color); return; }
  const align=e.target.closest('[data-align]');
  if(align) { draft.align = {...(draft.align||{}), [align.dataset.field]: align.dataset.align}; changed(); return; }
  const button=e.target.closest('[data-format]'); if(!button) return;
  const field=$(button.dataset.field), start=field.selectionStart, end=field.selectionEnd;
  const selected=field.value.slice(start,end), marker=button.dataset.format;
  if(marker==='clear') {
    const from=start===end?0:start, to=start===end?field.value.length:end;
    field.setRangeText(field.value.slice(from,to).replace(/\*\*|__|\*|\{color:#[0-9a-fA-F]{6}\}|\{\/color\}/g,''),from,to,'select');
  } else {
    const text=selected || 'your text';
    field.setRangeText(marker+text+marker,start,end,'select');
    field.setSelectionRange(start+marker.length,start+marker.length+text.length);
  }
  draft[button.dataset.field]=field.value;changed();field.focus();
});

$('assessment-details').addEventListener('change', e => {
  if (e.target.matches('[data-color-input]')) applyColor(e.target.dataset.field, e.target.value);
});

// Floating Save in the sticky header: appears once the main Save button scrolls out of view.
(function floatingSave() {
  const main = $('save'), float = $('save-floating'), status = $('float-status');
  if (!main || !float || typeof IntersectionObserver === 'undefined') return;
  float.addEventListener('click', () => main.click());
  const sync = () => { float.disabled = main.disabled; if (status) status.textContent = $('status').textContent; };
  new MutationObserver(sync).observe(main, { attributes: true, attributeFilter: ['disabled'] });
  new MutationObserver(sync).observe($('status'), { childList: true, characterData: true, subtree: true });
  new IntersectionObserver(([entry]) => {
    const show = !entry.isIntersecting;
    float.hidden = !show; if (status) status.hidden = !show;
  }, { rootMargin: '-56px 0px 0px 0px' }).observe(main);
  sync();
})();

$('sections').addEventListener('click', e => {
  const f = e.target.closest('[data-qformat]'); if (f) { formatTextarea($(f.dataset.target), f.dataset.qformat); return; }
  const c = e.target.closest('[data-qcolor]'); if (c) { formatTextarea($(c.dataset.target), c.dataset.qcolor); return; }
  const a = e.target.closest('[data-qalign]');
  if (a) {
    const q = pathTarget(a.dataset.qpath); q.align = a.dataset.qalign; changed();
    const editor = a.closest('.question-editor');
    editor.querySelectorAll('[data-qalign]').forEach(b => b.setAttribute('aria-pressed', String(b === a)));
    editor.querySelector('.formatted-preview').style.textAlign = a.dataset.qalign;
  }
});
$('sections').addEventListener('change', e => { if (e.target.matches('[data-qcolor-input]')) formatTextarea($(e.target.dataset.target), e.target.value); });
// Floating Publish mirrors the main Publish button.
(function floatingPublish() {
  const main = $('publish'), float = $('publish-floating'), save = $('save-floating');
  if (!main || !float || !save) return;
  float.addEventListener('click', () => main.click());
  const sync = () => { float.disabled = main.disabled; float.hidden = save.hidden; };
  if (typeof MutationObserver !== 'undefined') {
    new MutationObserver(sync).observe(main, { attributes: true, attributeFilter: ['disabled'] });
    new MutationObserver(sync).observe(save, { attributes: true, attributeFilter: ['hidden'] });
  }
  sync();
})();
