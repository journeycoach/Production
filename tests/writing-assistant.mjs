import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import * as writing from '../api/_writing-assistant.js';
const { corpus, cosine, generatePost, checkRepetition, plain, WritingError } = writing;
const ideas=[{id:'current',data:{title:'Control',versions:[{body:'Own current draft'}],uses:[{channel:'linkedin',date:'2026-01-01',snapshot:{body:'Let the team own decisions.'},link:'https://linkedin.com/posts/example'}]}},{id:'other',data:{title:'Trust',versions:[{body:'Let people decide.',kind:'linkedin',name:'First'}],uses:[{channel:'linkedin',date:'2020-01-01'}]}}];
const posts=[{id:1,title:'Ownership',body:'<p>Let the team own decisions.</p>',post_date:'2026-01-02',slug:'ownership'}];
const library=corpus(ideas,posts,'current');
assert.equal(library.pieces.length,2);
assert.equal(library.pieces[0].sources.length,2);
assert.equal(library.counts.uncertain,1);
assert.equal(library.counts.excludedOwnDrafts,1);
assert.equal(library.pieces[1].sources[0].status,'Saved draft (publication not inferred)');
assert.equal(plain('<script>alert(1)</script><p>Hello &amp; welcome</p>'),'Hello & welcome');
assert.equal(cosine([1,0],[0,1]),0);assert.equal(cosine([1,0],[1,0]),1);
const calls=[];
let mode='generate';
const fakeFetch=async(url,options)=>{
 const b=JSON.parse(options.body);calls.push({url,b});
 if(url.endsWith('/embeddings'))return {ok:true,json:async()=>({data:b.input.map((_,index)=>({index,embedding:index===2?[0,1]:[1,0]}))})};
 assert.equal(b.store,false);
 assert.equal(b.text.format.strict,true);
 assert.match(b.instructions,/Never invent client experiences/);
 let output;
 if(mode==='generate')output={title:'Whose problem is it?',body:'Leaders can make room for ownership. What decision could your team own?',notes:'Hypothetical example; no research claims added.'};
 else {const candidates=JSON.parse(b.input).candidates;output={summary:'A related leadership lesson exists.',matches:[{id:candidates[0].id,verdict:'Substantial overlap',insight:'Same central lesson',problem:'Dependency',example:'Different example',challenge:'Delegate decisions',freshAngle:'Explore why teams still wait for permission',excerpt:mode==='bad-excerpt'?'Invented evidence':candidates[0].text.slice(0,20)}]};}
 return {ok:true,json:async()=>({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(output)}]}]})};
};
const draft=await generatePost({idea:{title:'Ownership'},draft:'Let the team decide.',kind:'linkedin',direction:''},fakeFetch);
assert.match(draft.body,/ownership/);
assert.match(calls[0].b.instructions,/LinkedIn post/);
mode='compare';const result=await checkRepetition('Leaders must stop solving every problem.',library,fakeFetch);
assert.equal(result.matches.length,1);assert.equal(result.matches[0].title,'Ownership');
assert.equal(result.matches[0].sources[0].link,'/blog/ownership');
assert.equal(result.compared,2);
const embeddingsBefore=calls.filter(c=>c.url.endsWith('/embeddings')).length;
mode='bad-excerpt';const second=await checkRepetition('Leaders must stop solving every problem.',library,fakeFetch);
assert(!second.matches[0].excerpt.includes('Invented'));
assert.equal(calls.filter(c=>c.url.endsWith('/embeddings')).length,embeddingsBefore,'Embeddings reused for unchanged text');
await assert.rejects(()=>checkRepetition('a'.repeat(24001),library,fakeFetch),/24,000/);
assert.equal((await checkRepetition('A draft',{pieces:[],counts:{}},fakeFetch)).compared,0);
await assert.rejects(()=>generatePost({kind:'blog'},async()=>({ok:false,status:429})),/usage limit/);
console.log('PASS semantic ranking, source/date separation, current-version exclusions, unknown history, exact excerpts, embedding cache, generation and provider failures');

const context=vm.createContext({console,process:{env:{}},Promise});let authorized=false,dbCalls=0,aiCalls=0;
const sql=async(strings,...values)=>{dbCalls++;const q=strings.join('?');if(q.includes('SELECT data'))return [{data:{title:'Ownership',sourceReference:'Private source',importOriginal:{secret:'not needed'},observation:'Make space'}}];if(q.includes('FROM posts'))return posts;return ideas;};
const helper={...writing,generatePost:async input=>{aiCalls++;assert(!('sourceReference'in input.idea));assert(!('importOriginal'in input.idea));return {title:'T',body:'B',notes:''};},checkRepetition:async()=>{aiCalls++;return result;}};
const modules={
 '../_db.js':new vm.SyntheticModule(['sql'],function(){this.setExport('sql',sql);},{context}),
 '../_auth.js':new vm.SyntheticModule(['requireAuth'],function(){this.setExport('requireAuth',(_req,res)=>{if(!authorized)res.status(401).json({error:'Unauthorized'});return authorized;});},{context}),
 '../_writing-assistant.js':new vm.SyntheticModule(['corpus','checkRepetition','generatePost','WritingError'],function(){for(const k of ['corpus','checkRepetition','generatePost','WritingError'])this.setExport(k,helper[k]);},{context})
};
const route=new vm.SourceTextModule(await readFile(new URL('../api/admin/writing-assistant.js',import.meta.url),'utf8'),{context});await route.link(k=>modules[k]);await route.evaluate();
async function req(method,body={}){const r={code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.body=v;return this;}};await route.namespace.default({method,body},r);return r;}
for(const method of ['GET','POST'])assert.equal((await req(method,{action:'generate',draft:'x',ideaId:'current'})).code,401);
assert.equal(dbCalls,0);assert.equal(aiCalls,0);
authorized=true;
assert.equal((await req('GET')).body.configured,false);
assert.equal((await req('POST',{action:'generate'})).code,503);
assert.equal(dbCalls,0);
context.process.env.OPENAI_API_KEY='test-only';
assert.equal((await req('POST',{action:'generate',draft:'x',ideaId:'current',kind:'linkedin',direction:''})).code,200);
assert.equal((await req('POST',{action:'repetition',draft:'x',ideaId:'current'})).code,200);
assert.equal(aiCalls,2);
assert.equal((await req('POST',{action:'generate',draft:'x',ideaId:'current',kind:'unknown',direction:''})).code,400);
assert.equal((await req('GET')).headers['Cache-Control'],'private, no-store');
console.log('PASS route authentication before DB/provider, setup status without secrets, private/no-store, input validation and no automatic writes');
