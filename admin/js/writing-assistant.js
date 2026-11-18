const safeLink = link => /^https?:\/\//i.test(link || '') || /^\/blog\//.test(link || '');
function text(tag, value, parent) { const el = document.createElement(tag); el.textContent = value; parent.append(el); return el; }
export function attachWritingAssistant(idea, onDirty) {
  const form = document.getElementById('versionForm');
  const panel = document.getElementById('writingAssistant');
  panel.innerHTML = `<h3>Writing partner</h3><p id="aiConnection" role="status">Checking AI connection…</p>
    <label>Develop for<select id="developKind"><option value="linkedin">LinkedIn post</option><option value="blog">Blog article</option></select></label>
    <label>Optional direction<textarea id="developDirection" rows="2" maxlength="2000" placeholder="For example: focus on ownership; keep my opening; give leaders one practical experiment."></textarea></label>
    <div class="studio-actions"><button type="button" id="developPost" class="btn btn-secondary">Turn this into a post</button><button type="button" id="checkRepetition" class="btn btn-secondary">Have I said this before?</button></div>
    <p>Uses the current draft text, including unsaved edits, and saved idea notes. AI suggestions are editable and can be wrong. Nothing is saved or published automatically.</p>
    <p id="writingStatus" role="status" aria-live="polite"></p><div id="writingResults"></div>`;
  const connection = panel.querySelector('#aiConnection');
  const status = panel.querySelector('#writingStatus');
  const results = panel.querySelector('#writingResults');
  const generate = panel.querySelector('#developPost');
  const check = panel.querySelector('#checkRepetition');
  const kind = panel.querySelector('#developKind');
  const direction = panel.querySelector('#developDirection');
  let busy = false, lastDraft = '', requestNumber = 0;
  async function run(action) {
    if (busy) return;
    const draft = form.elements.body.value;
    const requestedKind = kind.value;
    if (action === 'repetition' && !draft.trim()) { status.textContent = 'Write or select a draft first.'; return; }
    const token = ++requestNumber;
    busy = true; generate.disabled = check.disabled = true;
    results.replaceChildren(); lastDraft = draft;
    status.textContent = action === 'generate' ? 'Developing an editable post…' : 'Comparing meaning across your recorded library…';
    try {
      const response = await adminFetch('/api/admin/posts?workspace=writing', { method:'POST',body:JSON.stringify({action,draft,ideaId:idea.id,kind:requestedKind,direction:direction.value}) });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'The writing assistant could not complete this request.');
      if (!panel.isConnected || token !== requestNumber) return;
      if (form.elements.body.value !== draft) { status.textContent = 'Your draft changed during the check. Run it again for the current text.'; return; }
      status.textContent = action === 'generate' ? 'Your suggested post is ready. Review it below before using it.' : 'Comparison complete. These are editorial judgments based on the recorded material.';
      if (action === 'generate') showGenerated(payload.data, requestedKind); else showComparison(payload.data);
    } catch(e) { if(panel.isConnected) status.textContent=e.message; }
    finally { busy=false;generate.disabled=check.disabled=false; }
  }
  function showGenerated(data, targetKind) {
    text('h3',data.title,results);
    const label=text('label','Suggested post (editable)',results);
    const body=document.createElement('textarea');body.rows=16;body.value=data.body;label.append(body);
    text('p','Review notes: '+(data.notes || 'Review factual claims before sharing.'),results);
    const use=text('button','Use this draft',results);use.type='button';use.className='btn btn-primary';
    use.onclick=()=>{
      if(form.elements.body.value!==lastDraft && !confirm('Replace the current unsaved draft with this suggestion?'))return;
      form.elements.body.value=body.value;
      form.elements.name.value=data.title+' (AI draft)';
      form.elements.kind.value=targetKind;form.elements.format.value='text';
      form.elements.notes.value=data.notes;
      form.querySelectorAll('input[type=checkbox]').forEach(el=>el.checked=false);
      document.getElementById('versionSelect').value='';onDirty();
      results.replaceChildren();status.textContent='Draft placed in the editor. Make it yours, then choose Save named version. Nothing has been published.';
      form.elements.body.focus();
    };
  }
  function showComparison(data) {
    text('h3',data.summary,results);
    const c=data.counts;
    text('p',`Coverage: ${c.blog} blog articles, ${c.linkedin} recorded LinkedIn uses, ${c.drafts} saved draft versions. ${data.compared} distinct texts searched; ${data.reviewedPassages || 0} closest passages reviewed in depth.`,results);
    text('p',`The current idea’s ${c.excludedOwnDrafts} saved versions are excluded as revisions; its recorded uses are included. ${c.uncertain} records lacked comparable text. LinkedIn history is limited to what you have recorded or imported. No match does not establish that you have never shared the idea.`,results);
    for(const m of data.matches){
      const card=document.createElement('article');card.className='card';results.append(card);
      text('h3',m.verdict,card);text('h4',m.title,card);
      for(const s of m.sources){
        const p=text('p',`${s.status} · ${s.channel} · ${s.date ? String(s.date).slice(0,10) : 'Date unknown'}${s.versionName?' · '+s.versionName:''}`,card);
        if(safeLink(s.link)){const a=text('a',' Open piece',p);a.href=s.link;a.target='_blank';a.rel='noopener noreferrer';}
        if(s.ideaId){const a=text('a',' Open idea',p);a.href='posts.html?idea='+encodeURIComponent(s.ideaId);a.target='_blank';a.rel='noopener noreferrer';}
      }
      text('blockquote',m.excerpt,card);
      for(const [key,label]of [['insight','Core insight'],['problem','Leadership problem'],['example','Example'],['challenge','Practical challenge'],['freshAngle','A fresh direction']])text('p',label+': '+m[key],card);
    }
  }
  generate.onclick=()=>run('generate');check.onclick=()=>run('repetition');
  document.getElementById('versionSelect').addEventListener('change',()=>{requestNumber++;results.replaceChildren();status.textContent='';});
  form.elements.body.addEventListener('input',()=>{if(results.children.length){results.replaceChildren();status.textContent='Draft changed. Run the writing partner again for the current text.';}});
  fetch('/api/admin/posts?workspace=writing',{credentials:'same-origin',cache:'no-store'}).then(async r=>{
    if(!r.ok)throw new Error();const data=await r.json();
    connection.textContent=data.configured ? 'AI connected. Checking or developing sends the needed draft and library text to OpenAI.' : 'AI setup needed: add OPENAI_API_KEY to the server environment and restart the local server. Keep the key out of browser code. ChatGPT and API billing are separate.';
  }).catch(()=>{connection.textContent='Could not check the AI connection. Try an action to see its status.';});
}
