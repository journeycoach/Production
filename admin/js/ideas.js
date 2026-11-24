import { attachWritingAssistant } from './writing-assistant.js?v=2';
const root = document.getElementById('studio');
const esc = escHtml;
let items = [], current = null, backup = null, dirty = false;
let editorSection = 'source';
const dirtyForms = new Set();
const libraryFilters = { query: '', history: 'all', stage: 'all' };
const metadataFields = { title:'Working title', observation:'Core observation', themes:'Themes (comma separated)', sourceType:'Source type', sourceReference:'Source reference / notes', leadershipPattern:'Leadership pattern', hiddenCeiling:'Hidden Ceiling (limiting behavior)', practicalReframe:'Practical reframe', supportingExample:'Supporting example', closingQuestion:'Reflective closing question', visualConcept:'Visual concept', different:'What’s different this time?', parentId:'Linked idea ID' };
const checks = ['Clarity: Is the central observation clear?','Accuracy: Have I verified factual claims and protected client identities?','Usefulness: Can a leader put this into practice?','Originality: Does this add a fresh problem, example, or practical challenge?','Challenge: Does the closing question invite meaningful action?'];
const today = () => new Date().toLocaleDateString('en-CA');
async function api(body, method='PUT') {
  const response = await adminFetch('/api/admin/posts?workspace=ideas', body ? {method,body:JSON.stringify(body)} : {});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not save.');
  return result;
}
function guarded(fn) { return async (...args) => {try {await fn(...args);} catch(e) {showFlash(e.message,'error');}}; }
function bind(id, fn, event='click') {document.getElementById(id).addEventListener(event,guarded(fn));}
function canLeave() {return !dirty || confirm('Leave unsaved changes? Saved versions are kept.');}
function select(row) {current=row;dirty=false;dirtyForms.clear();render();}
function options() {return (current?.data.versions || []).map(v=>`<option value="${esc(v.id)}">${esc(v.name)} (${esc(v.kind)})</option>`).join('');}
function sourceField(key, data) {
 const label = metadataFields[key];
 if (key === 'sourceType') return `<label>${label}<select name="${key}"><option value="">Optional</option>${['executive coaching','business trend','leadership experience'].map(t=>`<option ${data[key]===t?'selected':''}>${t}</option>`).join('')}</select></label>`;
 if (['title','themes','parentId'].includes(key)) return `<label>${label}<input type="text" name="${key}" value="${esc(data[key])}"></label>`;
 return `<label>${label}<textarea name="${key}" rows="${key==='observation'?4:3}">${esc(data[key])}</textarea></label>`;
}
function showEditorSection(section, focus = false) {
 editorSection = section;
 root.querySelectorAll('[data-idea-section]').forEach(tab => {
   const active = tab.dataset.ideaSection === section;
   tab.classList.toggle('is-active', active);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;
   document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
   if(active && focus)tab.focus();
 });
}
function render() {
 const d=current?.data || {};
 root.innerHTML=`
 <div class="studio-heading"><div><h2>Post ideas</h2><p class="studio-hint">Capture an observation. Develop it when you’re ready.</p></div><details class="import-menu"><summary>Import backup</summary><label>Leadership Notebook JSON<input id="importFile" type="file" accept=".json,application/json"></label></details></div>
 <div id="importPreview"></div>
 <div class="idea-workspace">
   <aside class="card idea-sidebar" aria-label="Idea library">
     <div class="library-heading"><h3>Library <span class="studio-hint">${items.length}</span></h3><button id="newIdea" class="btn btn-primary btn-sm">+ New idea</button></div>
     <label class="search-label">Search ideas<input id="ideaSearch" type="search" placeholder="Title, theme, or text" value="${esc(libraryFilters.query)}"></label>
     <details class="library-filters" ${libraryFilters.history!=='all'||libraryFilters.stage!=='all'?'open':''}><summary>Filter ideas</summary>
       <label>History<select id="historyFilter"><option value="all">All ideas</option><option value="needs">Needs history check</option><option value="none">No match in reviewed period</option><option value="used">Confirmed use</option></select></label>
       <label>Development<select id="stageFilter"><option value="all">All stages</option><option>Captured</option><option>Developing</option><option>Ready</option></select></label>
     </details>
     <p id="libraryCount" class="studio-hint" aria-live="polite"></p><div id="ideaList" class="studio-list"></div>
   </aside>
   <div class="idea-editor">
     <div class="editor-heading"><div><span class="studio-eyebrow">${current?'Selected idea':'Quick capture'}</span><h3>${esc(current?(d.title||d.observation):'What are you noticing?')}</h3></div><div class="idea-heading-actions"><span id="ideaSaveStatus" role="status" class="studio-hint">${current?'Saved privately':'New idea'}</span>${current?'<button type="button" id="deleteIdea" class="btn btn-danger btn-sm">Delete idea</button>':''}</div></div>
     ${current?`<div class="page-tabs idea-tabs" role="tablist" aria-label="Idea sections">${[['source','Source notes'],['drafts','Drafts · '+d.versions.length],['history','History · '+d.uses.length],['related','Related ideas']].map(([id,label])=>`<button type="button" role="tab" class="page-tab" id="ideaTab-${id}" aria-controls="ideaPanel-${id}" aria-selected="false" tabindex="-1" data-idea-section="${id}">${label}</button>`).join('')}</div>`:''}
     <section id="ideaPanel-source" ${current?'role="tabpanel" aria-labelledby="ideaTab-source"':''}>
       <div class="card"><form id="ideaForm"><p class="studio-hint">A working title or core observation is enough to save.</p>
         ${sourceField('title',d)}${sourceField('observation',d)}
         <div class="source-settings">${sourceField('themes',d)}<label>Stage<select name="stage">${['Captured','Developing','Ready'].map(t=>`<option ${d.stage===t?'selected':''}>${t}</option>`).join('')}</select></label></div>
         <details><summary>Source &amp; reference</summary>${sourceField('sourceType',d)}${sourceField('sourceReference',d)}</details>
         <details><summary>Develop the insight</summary>${['leadershipPattern','hiddenCeiling','practicalReframe','supportingExample','closingQuestion','visualConcept'].map(k=>sourceField(k,d)).join('')}</details>
         ${d.parentId?`<details open><summary>A fresh direction</summary>${sourceField('different',d)}${sourceField('parentId',d)}</details>`:`<details><summary>Link to another idea</summary>${sourceField('different',d)}${sourceField('parentId',d)}</details>`}
         <div class="studio-savebar"><button class="btn btn-primary">Save idea</button></div>
       </form></div>
     </section>
     ${current?`<section id="ideaPanel-drafts" role="tabpanel" aria-labelledby="ideaTab-drafts" hidden><div class="card"><h2>Drafts</h2><label>Saved version<select id="versionSelect"><option value="">New draft</option>${options()}</select></label><form id="versionForm"><div class="draft-settings"><label>Version name<input name="name" required></label><label>Format<select name="kind"><option value="linkedin">LinkedIn post</option><option value="blog">Blog article</option><option value="tool">Leadership tool</option></select></label><label>Text format<select name="format"><option value="text">Plain text</option><option value="html">HTML for blog editor</option></select></label></div><label>Draft<textarea name="body" rows="14" required></textarea></label><details class="review-details"><summary>Review checklist &amp; notes</summary><label>Review notes<textarea name="notes" rows="3"></textarea></label>${checks.map((t,i)=>`<label class="check"><input type="checkbox" name="review${i}">${t}</label>`).join('')}</details><p>Saving creates a new version. Earlier versions and shared snapshots stay intact.</p><button class="btn btn-primary">Save named version</button></form>
 <details class="writing-tools"><summary>AI writing tools <span class="studio-hint">Optional, requires an API connection</span></summary><section id="writingAssistant" aria-label="Writing partner"></section></details>
 <div class="studio-actions"><button id="copyDraft" class="btn btn-secondary">Copy draft</button><button id="openEditor" class="btn btn-secondary">Open saved version in blog editor</button></div><details><summary>Compare two saved versions</summary><div class="compare-grid"><div><label>First version<select id="compareA">${options()}</select></label><pre id="textA"></pre></div><div><label>Second version<select id="compareB">${options()}</select></label><pre id="textB"></pre></div></div></details><details class="voice-guide"><summary>Writing guidance</summary><p>Write conversationally for senior leaders: reflective, practical, and slightly provocative. Avoid clichés, buzzwords, artificial contrasts, and overly polished language. Preserve your language around Hidden Ceilings, ownership, attention, growth, balcony perspective, leadership presence, feedback, trust, and strategic credibility.</p><p>A Hidden Ceiling identifies a limiting behavior. Explore the underlying belief through coaching.</p>
 </details></div></section>
       <section id="ideaPanel-history" role="tabpanel" aria-labelledby="ideaTab-history" hidden><div class="card"><h2>Publishing history</h2><p>Recording a use does not publish anything. Select the exact saved version shared.</p><form id="usageForm"><label>Version<select name="versionId" required>${options()}</select></label><label>Channel<select name="channel"><option value="linkedin">LinkedIn</option><option value="blog">Blog</option></select></label><label>Date<input type="date" name="date" value="${today()}" required></label><label>Link (optional)<input type="url" name="link"></label><button class="btn btn-secondary">Record use</button></form><div id="uses"></div>
 <details><summary>Record an older-material history check</summary><form id="checkForm"><label>Channel<select name="channel"><option value="both">Both</option><option value="linkedin">LinkedIn</option><option value="blog">Blog</option></select></label><label>From<input name="from" type="date" required></label><label>Through<input name="to" type="date" required></label><label>Finding<select name="result"><option value="none">No match in this period</option><option value="uncertain">Still uncertain</option></select></label><label>Notes<textarea name="notes"></textarea></label><button class="btn btn-secondary">Save history check</button></form></details><div id="historyChecks"></div></div></section>
       <section id="ideaPanel-related" role="tabpanel" aria-labelledby="ideaTab-related" hidden><div class="card"><h2>Revisit a theme</h2><p>What leadership problem, example, or practical challenge is different this time?</p><button id="linkedIdea" class="btn btn-secondary">Create linked idea with these themes</button><div id="related"></div></div></section>`:''}
   </div>
 </div>`;
 document.getElementById('historyFilter').value=libraryFilters.history;
 document.getElementById('stageFilter').value=libraryFilters.stage;
 list();
 bind('ideaSearch',list,'input');bind('historyFilter',list,'change');bind('stageFilter',list,'change');
 bind('newIdea',()=>{if(canLeave()){editorSection='source';select(null);document.querySelector('#ideaForm [name=title]').focus();}});
 root.querySelectorAll('form').forEach(f=>f.addEventListener('input',()=>{dirty=true;dirtyForms.add(f.id);document.getElementById('ideaSaveStatus').textContent='Unsaved changes';}));
 bind('ideaForm',async e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.target));await save(data,current?'PUT':'POST');},'submit');
 bind('importFile',previewImport,'change');
 if (!current) return;
 bind('deleteIdea', async () => {
   const title=current.data.title||current.data.observation||'this idea';
   if(!confirm(`Delete “${title}”?\n\nThis permanently removes this idea, its saved versions, and its usage history. Published blog articles and LinkedIn posts will stay online. This cannot be undone.`))return;
   const button=document.getElementById('deleteIdea');button.disabled=true;
   try {
     await api({id:current.id,revision:current.revision},'DELETE');
     dirty=false;dirtyForms.clear();editorSection='source';current=null;
     await reload();select(null);showFlash('Idea deleted.');
   } finally {button.disabled=false;}
 });
 const sections=['source','drafts','history','related'];
 root.querySelectorAll('[data-idea-section]').forEach(tab=>{
   tab.addEventListener('click',()=>showEditorSection(tab.dataset.ideaSection));
   tab.addEventListener('keydown',event=>{
     if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
     event.preventDefault();const index=sections.indexOf(tab.dataset.ideaSection);
     const next=event.key==='Home'?0:event.key==='End'?sections.length-1:(index+(event.key==='ArrowRight'?1:-1)+sections.length)%sections.length;
     showEditorSection(sections[next],true);
   });
 });
 showEditorSection(editorSection);
 attachWritingAssistant(current, () => { dirty = true;dirtyForms.add('versionForm');document.getElementById('ideaSaveStatus').textContent='Unsaved changes'; });
 bind('versionForm',async e=>{e.preventDefault();const b=Object.fromEntries(new FormData(e.target));b.review=Object.fromEntries(checks.map((_,i)=>[i,!!b['review'+i]]));await save({...b,action:'version'});},'submit');
 bind('versionSelect',()=>{if(!canLeave())return;const v=d.versions.find(v=>v.id===document.getElementById('versionSelect').value); const f=document.getElementById('versionForm'); f.reset(); if(v){for(const k of ['name','body','kind','format','notes']) f.elements[k].value=v[k]||''; checks.forEach((_,i)=>f.elements['review'+i].checked=!!v.review?.[i]);} dirtyForms.delete('versionForm');dirty=dirtyForms.size>0;document.getElementById('ideaSaveStatus').textContent=dirty?'Unsaved changes':'Saved privately';},'change');
 bind('copyDraft',async()=>{await navigator.clipboard.writeText(document.getElementById('versionForm').elements.body.value);showFlash('Draft copied.');});
 bind('openEditor',()=>{const id=document.getElementById('versionSelect').value;if(!id)throw new Error('Select a saved version first.');if(canLeave())location.href=`post-edit.html?idea=${encodeURIComponent(current.id)}&version=${encodeURIComponent(id)}`;});
 for(const side of ['A','B'])bind('compare'+side,()=>compare(),'change');
 const cb=document.getElementById('compareB');if(cb.options.length>1)cb.selectedIndex=1;compare();
 bind('usageForm',async e=>{e.preventDefault();await save({...Object.fromEntries(new FormData(e.target)),action:'usage'});},'submit');
 bind('checkForm',async e=>{e.preventDefault();await save({action:'check',check:Object.fromEntries(new FormData(e.target))});},'submit');
 document.getElementById('uses').textContent='';
 for(const u of d.uses){const el=document.createElement('details');el.className='history-item';const summary=document.createElement('summary');summary.textContent=`${u.date||'Unknown date'} · ${u.channel||'Imported use'} · ${u.snapshot?.name||u.versionId||'Version uncertain'}`;el.append(summary);const pre=document.createElement('pre');pre.textContent=u.publishedSnapshot?.body||u.snapshot?.body||JSON.stringify(u,null,2);el.append(pre);if(/^https?:\/\//i.test(u.link||'')){const a=document.createElement('a');a.href=u.link;a.textContent='Open published piece';a.target='_blank';a.rel='noopener noreferrer';el.append(a);}document.getElementById('uses').append(el);}
 document.getElementById('historyChecks').textContent=d.checks.map(c=>`${c.channel}: ${c.from} to ${c.to}, ${c.result}. ${c.notes||''}`).join('\n');
 const themes=(d.themes||'').toLowerCase().split(',').map(t=>t.trim()).filter(Boolean);
 const related=items.filter(r=>r.id!==current.id&&(r.id===d.parentId||r.data.parentId===current.id||themes.some(t=>(r.data.themes||'').toLowerCase().split(',').map(t=>t.trim()).includes(t))));
 for(const r of related){const b=document.createElement('button');b.className='btn btn-ghost';b.textContent=`${r.data.title||r.data.observation} · ${r.data.uses.length} recorded uses`;b.onclick=()=>{if(canLeave())select(r);};document.getElementById('related').append(b);}
 bind('linkedIdea',async()=>{if(!canLeave())return;await save({title:'Revisit: '+(d.title||d.observation),themes:d.themes,parentId:current.id,different:'',stage:'Captured'},'POST');showEditorSection('source');const field=document.querySelector('[name=different]');field.closest('details').open=true;field.focus();});
}
function compare(){for(const s of ['A','B']){const v=current.data.versions.find(v=>v.id===document.getElementById('compare'+s).value);document.getElementById('text'+s).textContent=v?`${v.name}\n\n${v.body}\n\nReview notes: ${v.notes||''}\n${checks.map((c,i)=>`${v.review?.[i]?'✓':'☐'} ${c}`).join('\n')}`:'';}}
function list(){const q=document.getElementById('ideaSearch').value.toLowerCase(), filter=document.getElementById('historyFilter').value, stage=document.getElementById('stageFilter').value;Object.assign(libraryFilters,{query:document.getElementById('ideaSearch').value,history:filter,stage});const box=document.getElementById('ideaList');box.replaceChildren();let matches=0;for(const row of items){const d=row.data;const state=d.uses.length?'used':d.checks.some(c=>c.result==='none')?'none':'needs';if(!JSON.stringify(d).toLowerCase().includes(q)||(filter!=='all'&&state!==filter)||(stage!=='all'&&(d.stage||'Captured')!==stage))continue;matches++;const b=document.createElement('button');b.classList.toggle('selected',row.id===current?.id);if(row.id===current?.id)b.setAttribute('aria-current','true');b.textContent=d.title||d.observation;const small=document.createElement('small');small.textContent=`${d.stage||'Captured'} · ${d.versions.length} drafts · ${d.uses.length} uses`;b.title=[d.themes,state==='none'?'No match in reviewed period':state==='needs'?'Needs history check':'Confirmed use'].filter(Boolean).join(' · ');b.append(small);b.onclick=()=>{if(canLeave()){editorSection='source';select(row);}};box.append(b);}document.getElementById('libraryCount').textContent=`${matches} ${matches===1?'idea':'ideas'}`;if(!box.children.length)box.textContent=items.length?'No ideas match these filters.':'Your first idea can be just one line.';}
async function save(data, method='PUT') {
 const savedForm = data.action==='version'?'versionForm':data.action==='usage'?'usageForm':data.action==='check'?'checkForm':'ideaForm';
 const pending = (method==='PUT'?[...dirtyForms]:[]).filter(id=>id!==savedForm).map(id=>({id, fields:Array.from(document.getElementById(id)?.elements||[]).filter(el=>el.name).map(el=>({name:el.name,value:el.value,checked:el.checked}))}));
 const previousVersion = document.getElementById('versionSelect')?.value;
 const r=await api({...data,...(method==='PUT'?{id:current.id,revision:current.revision}:{})},method);
 await reload();select(items.find(i=>i.id===r.data.id));
 if(data.action==='version'){
   const el=document.getElementById('versionSelect');el.value=r.data.data.versions.at(-1).id;el.dispatchEvent(new Event('change'));
 }
 for(const form of pending){const target=document.getElementById(form.id);if(!target)continue;for(const value of form.fields){const el=target.elements.namedItem(value.name);if(el){el.value=value.value;if(el.type==='checkbox')el.checked=value.checked;}}dirtyForms.add(form.id);}
 if(pending.some(f=>f.id==='versionForm'))document.getElementById('versionSelect').value=previousVersion||'';
 dirty=dirtyForms.size>0;document.getElementById('ideaSaveStatus').textContent=dirty?'Unsaved changes in another tab':'Saved privately';
 showFlash('Saved privately.');
}
async function reload(){items=(await api()).data;}
async function previewImport(e){if(!canLeave())return;const file=e.target.files[0];if(!file)return;if(file.size>3000000)throw new Error('Use a JSON backup smaller than 3 MB.');backup=JSON.parse(await file.text());const result=await api({action:'import-preview',backup},'POST');const box=document.getElementById('importPreview');box.innerHTML='<h3>Import preview</h3><p>Existing import IDs are skipped. Original records are preserved alongside mapped notes, versions, and history. Review the mapping before importing.</p>';for(const r of result.data){const details=document.createElement('details');const summary=document.createElement('summary');summary.textContent=`${r.skip?'Skip duplicate':'Import'}: ${r.title} · ${r.versions} versions · ${r.uses} uses`;const pre=document.createElement('pre');pre.textContent=JSON.stringify(r.preserved,null,2);details.append(summary,pre);box.append(details);}const button=document.createElement('button');button.className='btn btn-primary';button.textContent='Import previewed records';button.onclick=guarded(async()=>{button.disabled=true;try{const r=await api({action:'import',backup},'POST');await reload();select(null);showFlash(`${r.imported} imported, ${r.skipped} skipped.`);}finally{button.disabled=false;}});box.append(button);}
window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
guarded(async()=>{const auth=await fetch('/api/admin/auth',{credentials:'same-origin',cache:'no-store'});if(!auth.ok)return;await reload();root.hidden=false;const requested=new URLSearchParams(location.search).get('idea');if(requested)current=items.find(i=>i.id===requested)||null;render();}) ();
