import {plainDraft,draftStats,starterDraft,writingBrief,replaceEdge} from './writing-tools-core.js?v=1';
export function attachDraftTools({idea,readIdea,onDirty}) {
 const form=document.getElementById('versionForm'),body=form.elements.body,format=form.elements.format;
 const root=document.getElementById('studio');
 const status=document.getElementById('draftToolStatus');
 const dirty=()=>{onDirty();document.getElementById('versionSelect').value='';form.querySelectorAll('input[name^=review]').forEach(el=>el.checked=false);refresh();};
 const handle=(id,action)=>document.getElementById(id).addEventListener('click',async()=>{try{await action();}catch(e){status.textContent=e.message;}});
 const copy=async(text)=>{try{await navigator.clipboard.writeText(text);status.textContent='Copied. Paste into your ChatGPT conversation.';}catch{const box=document.getElementById('briefFallback');box.hidden=false;box.value=text;box.focus();box.select();status.textContent='Select and copy the brief below.';}};
 handle('copyWritingBrief',()=>copy(writingBrief(readIdea(),body.value,form.elements.kind.value,format.value)));
 handle('createStarter',()=>{
   if(body.value.trim()&&!confirm('Replace the current draft with a starter assembled from your source notes? Saved versions stay intact.'))return;
   body.value=starterDraft(readIdea(),form.elements.kind.value);format.value='text';
   if(!form.elements.name.value.trim())form.elements.name.value=(idea.data.title||'New idea')+' starter';
   dirty();status.textContent='Starter created from your notes. Edit it, then save a named version.';
 });
 let focused=false;
 const focusButton=document.getElementById('focusWriting');
 function setFocus(value){if(value&&!form.elements.name.value.trim()){form.elements.name.value=(idea.data.title||'New idea')+' draft';onDirty();}focused=value;root.classList.toggle('is-writing-focused',value);focusButton.textContent=value?'Exit focused writing':'Focused writing';focusButton.setAttribute('aria-pressed',String(value));if(value)body.focus();}
 handle('focusWriting',()=>setFocus(!focused));
 form.addEventListener('keydown',event=>{if(event.key==='Escape'&&focused){setFocus(false);event.preventDefault();}});
 root.classList.remove('is-writing-focused');
 for(const edge of ['opening','ending'])for(let n=1;n<=2;n++)handle(`use-${edge}-${n}`,()=>{
   if(format.value==='html')throw Error('Use plain text to swap openings and endings. HTML drafts are preserved.');
   const replacement=form.elements[edge+n].value;
   if(!confirm(`Replace the draft’s ${edge==='opening'?'first':'last'} paragraph with this alternative?`))return;
   body.value=replaceEdge(body.value,replacement,edge);dirty();status.textContent='Alternative applied. Save as a new version to keep it.';
 });
 function refresh(){
   const stats=draftStats(body.value,format.value);document.getElementById('draftWordCount').textContent=`${stats.words} words · ${stats.characters} characters`;
   document.getElementById('postPreview').textContent=plainDraft(body.value,format.value)||'Your post preview will appear here.';
   const flags=[];if(stats.longOpening)flags.push('The opening is over 200 characters. Consider whether the key point appears soon enough.');if(stats.longParagraphs)flags.push(`${stats.longParagraphs} dense paragraph${stats.longParagraphs===1?'':'s'} over 70 words. Consider shorter blocks.`);
   document.getElementById('previewFlags').textContent=!stats.words?'Add draft text to see readability notes.':flags.join(' ')||'Paragraph spacing looks easy to scan.';
 }
 form.addEventListener('input',refresh);form.addEventListener('change',refresh);
 document.getElementById('versionSelect').addEventListener('change',refresh);
 refresh();return {refresh};
}
