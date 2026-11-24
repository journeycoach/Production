// Pure, local writing helpers. No AI calls or network access.
export function plainDraft(value, format='text') {
  if(format!=='html')return String(value||'');
  return String(value||'').replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<br\s*\/?\s*>/gi,'\n').replace(/<\/(p|div|h[1-6]|li|blockquote)>/gi,'\n\n').replace(/<[^>]*>/g,'').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\n{3,}/g,'\n\n').trim();
}
export function draftStats(body,format='text') {
 const text=plainDraft(body,format),paragraphs=text.trim()?text.trim().split(/\n\s*\n/):[];
 return {words:text.trim()?text.trim().split(/\s+/u).length:0,characters:Array.from(text).length,paragraphs:paragraphs.length,longParagraphs:paragraphs.filter(p=>p.trim().split(/\s+/u).length>70).length,longOpening:(paragraphs[0]||'').length>200};
}
export function starterDraft(idea,kind) {
 if(kind==='tool')return [['When to use this',idea.observation],['Notice the pattern',[idea.leadershipPattern,idea.hiddenCeiling].filter(Boolean).join('\n\n')],['Try this',idea.practicalReframe],['Example',idea.supportingExample],['Discuss',idea.closingQuestion]].map(([title,text])=>`${title}\n${text||'[Add your own observation or example.]'}`).join('\n\n');
 const parts=[idea.observation,idea.leadershipPattern,idea.hiddenCeiling,idea.supportingExample,idea.practicalReframe,idea.closingQuestion].filter(Boolean);
 if(!parts.length)parts.push(idea.title||'[Start with your observation.]');
 if(!idea.closingQuestion)parts.push('[Close with a specific question or action for the reader.]');
 return kind==='blog'?`${idea.title||'Working title'}\n\n${parts.join('\n\n')}`:parts.join('\n\n');
}
export function writingBrief(idea,body,kind='linkedin',format='text') {
 const labels={title:'Working title',observation:'Core observation',themes:'Themes',sourceType:'Source type',sourceReference:'Source reference',leadershipPattern:'Leadership pattern',hiddenCeiling:'Hidden Ceiling behavior',practicalReframe:'Practical reframe',supportingExample:'Supporting example',closingQuestion:'Closing question',visualConcept:'Visual concept',different:'What is different this time?'};
 return `Help me develop this ${kind==='tool'?'leadership tool':kind==='blog'?'blog article':'LinkedIn post'} for senior leaders.\n\nWrite in my voice: conversational, reflective, practical, and slightly provocative. Preserve useful original phrases. Avoid clichés, buzzwords, em dashes, artificial contrasts, and overly polished AI language. Do not invent client stories, quotations, research, or facts. Distinguish supported observations from assumptions and flag claims needing verification.\n\nKeep my language around Hidden Ceilings, ownership, attention, growth, balcony perspective, leadership presence, feedback, trust, and strategic credibility. A Hidden Ceiling identifies limiting behavior; explore underlying beliefs in coaching rather than presenting them as diagnoses.\n\nFirst identify the central insight and what needs strengthening. Then help me refine the opening, example, practical reframe, and closing challenge. Ask focused questions when key information is missing.\n\n${Object.entries(labels).filter(([k])=>idea[k]).map(([k,label])=>`${label}: ${idea[k]}`).join('\n\n')}\n\nCurrent draft:\n${plainDraft(body,format)||'[No draft yet.]'}\n\nEditorial question: What will a leader recognize in themselves, and what can they try differently?`;
}
export function replaceEdge(body,replacement,edge) {
 const paragraphs=String(body||'').trim().split(/\n\s*\n/).filter(Boolean);
 if(!replacement.trim())throw Error('Write an alternative first.');
 if(!paragraphs.length)return replacement.trim();
 if(paragraphs.length===1)throw Error('Add paragraph breaks before replacing an opening or ending.');
 paragraphs[edge==='opening'?0:paragraphs.length-1]=replacement.trim();return paragraphs.join('\n\n');
}
export function themeSummary(rows) {
 const themes=new Map();
 for(const row of rows){for(const raw of new Set(String(row.data.themes||'').split(',').map(t=>t.trim()).filter(Boolean))){const key=raw.toLowerCase();if(!themes.has(key))themes.set(key,{name:raw,ideas:[],used:0,drafts:0});const t=themes.get(key);if(t.ideas.includes(row.id))continue;t.ideas.push(row.id);t.used+=(row.data.uses||[]).length?1:0;t.drafts+=(row.data.versions||[]).length;}}
 return [...themes.values()].sort((a,b)=>a.name.localeCompare(b.name));
}
export function readyPieces(rows) {
 return rows.flatMap(row=>(row.data.versions||[]).filter((v,i,all)=>!all.slice(i+1).some(next=>next.kind===v.kind)&&(v.ready===true||(row.data.stage==='Ready'&&i===all.length-1))).map(v=>({idea:row,version:v})));
}
