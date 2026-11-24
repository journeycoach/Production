import {themeSummary,readyPieces,plainDraft,draftStats} from './writing-tools-core.js?v=1';
function text(tag,value,parent){const el=document.createElement(tag);el.textContent=value;parent.append(el);return el;}
export function attachLibraryViews({rows,view,onView,onTheme,onOpen}){
 const root=document.getElementById('studio'),overview=document.getElementById('libraryOverview'),library=document.getElementById('libraryWorkspace');
 const tabs=Array.from(root.querySelectorAll('[data-workspace-view]'));
 function select(mode){
  onView(mode);library.hidden=mode!=='library';overview.hidden=mode==='library';
  tabs.forEach(tab=>{const active=tab.dataset.workspaceView===mode;tab.classList.toggle('is-active',active);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
  if(mode==='library')return;
  overview.setAttribute('aria-labelledby','workspaceTab-'+mode);
  overview.replaceChildren();text('h3',mode==='themes'?'Explore your themes':'Ready to share',overview);
  const grid=document.createElement('div');grid.className='overview-grid';overview.append(grid);
  if(mode==='themes'){
   text('p','Browse recorded themes to see what you have developed and used. Counts reflect this idea library, not every published article.',overview);
   const themes=themeSummary(rows);
   if(!themes.length)text('p','Add comma-separated themes to your ideas to build this overview.',grid);
   for(const theme of themes){const card=document.createElement('article');card.className='card';grid.append(card);text('h3',theme.name,card);text('p',`${theme.ideas.length} ideas · ${theme.drafts} draft versions · ${theme.used} ideas used`,card);const button=text('button','Browse ideas',card);button.type='button';button.className='btn btn-secondary';button.onclick=()=>{select('library');onTheme(theme.name);};}
  }else{
   text('p','Latest versions marked Ready to share, plus the latest saved version of ideas at the Ready stage. Older revisions are kept in Drafts. Publishing is always a separate step.',overview);
   const pieces=readyPieces(rows);
   if(!pieces.length)text('p','In Drafts, mark a version Ready to share and save it to collect it here.',grid);
   for(const {idea,version}of pieces){
    const card=document.createElement('article');card.className='card';grid.append(card);
    text('h3',idea.data.title||idea.data.observation,card);text('p',`${version.name} · ${version.kind} · ${draftStats(version.body,version.format).words} words · ${Object.values(version.review||{}).filter(Boolean).length}/5 reviewed`,card);
    const uses=(idea.data.uses||[]).filter(u=>u.versionId===version.id);text('p',uses.length?`${uses.length} recorded use${uses.length===1?'':'s'} for this version`:'No recorded use for this version',card);
    if(idea.data.visualConcept)text('p','Visual concept: '+idea.data.visualConcept,card);
    const details=document.createElement('details');text('summary','Read saved version',details);text('pre',plainDraft(version.body,version.format),details);card.append(details);
    const actions=document.createElement('div');actions.className='studio-actions';card.append(actions);
    const open=text('button','Open draft',actions);open.className='btn btn-secondary';open.type='button';open.onclick=()=>onOpen(idea,version);
    const copy=text('button','Copy text',actions);copy.className='btn btn-primary';copy.type='button';copy.onclick=async()=>{try{await navigator.clipboard.writeText(plainDraft(version.body,version.format));copy.textContent='Copied';}catch{details.open=true;showFlash('Open the saved version above and select the text to copy.','error');}};
   }
  }
 }
 tabs.forEach((tab,index)=>{tab.addEventListener('click',()=>select(tab.dataset.workspaceView));tab.addEventListener('keydown',event=>{if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;select(tabs[next].dataset.workspaceView);tabs[next].focus();});});select(view);
}
