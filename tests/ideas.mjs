import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { metadata, version, usage, historyCheck, importRecords } from '../api/_ideas.js';
assert.equal(metadata({observation:'Control can crowd out initiative.'}).title,'');
assert.throws(()=>metadata({}),/title or core/);
const a=version({name:'First',body:'A first draft',kind:'linkedin'});
const b=version({name:'Second',body:'A practical challenge',kind:'blog',review:{0:true}});
assert.notEqual(a.id,b.id);
const use=usage({versionId:a.id,date:'2026-11-18',channel:'linkedin',link:'https://linkedin.com/posts/example'},[a,b]);
assert.equal(use.snapshot.body,'A first draft');
assert.equal(use.channel,'linkedin');
assert.throws(()=>usage({versionId:'missing'},[a]),/exact saved/);
assert.throws(()=>usage({versionId:a.id,date:'2026-11-18',channel:'linkedin',link:'javascript:alert(1)'},[a]),/http/);
assert.equal(historyCheck({channel:'linkedin',from:'2020-01-01',to:'2026-11-18',result:'none'}).result,'none');
assert.throws(()=>historyCheck({channel:'both',from:'2026-11-18',to:'2020-01-01'}));
const raw={id:'old-1',title:'Ownership',sourceNotes:'Coaching reflection',themes:['ownership'],draftVersions:[a,b],usageHistory:[use],customNotes:'Preserve me'};
const imported=importRecords({ideas:[raw]})[0];
assert.equal(imported.data.sourceReference,raw.sourceNotes);
assert.deepEqual(imported.data.importOriginal,raw);
assert.equal(imported.data.versions[1].body,b.body);
assert.deepEqual(imported.data.uses,[use]);
assert.equal(importRecords([raw])[0].key,imported.key);
console.log('PASS capture, immutable versions, LinkedIn snapshot, review range, import preservation and duplicate key');

// Run the real route with auth and storage boundaries mocked, including direct-ID requests.
const context=vm.createContext({console,crypto});
let calls=[],authorized=false,stored=null;
const sql=async(strings,...values)=>{
 const q=strings.join('?');calls.push({q,values});
 if(q.startsWith('CREATE'))return [];
 if(q.startsWith('INSERT INTO leadership_ideas (id,data)')){stored={id:values[0],revision:1,data:JSON.parse(values[1])};return [stored];}
 if(q.startsWith('SELECT *'))return stored?[stored]:[];
 if(q.startsWith('UPDATE')){if(values[2]!==stored.revision)return [];stored={...stored,data:JSON.parse(values[0]),revision:stored.revision+1};return [stored];}
 return [];
};
const modules={
 '../_db.js':new vm.SyntheticModule(['sql'],function(){this.setExport('sql',sql);},{context}),
 '../_auth.js':new vm.SyntheticModule(['requireAuth'],function(){this.setExport('requireAuth',(_req,res)=>{if(!authorized)res.status(401).json({error:'Unauthorized'});return authorized;});},{context}),
 '../_ideas.js':new vm.SyntheticModule(['metadata','version','usage','historyCheck','importRecords'],function(){for(const [k,v]of Object.entries({metadata,version,usage,historyCheck,importRecords}))this.setExport(k,v);},{context}),
 'node:crypto':new vm.SyntheticModule(['default'],function(){this.setExport('default',{randomUUID:()=>globalThis.crypto.randomUUID()});},{context})
};
const route=new vm.SourceTextModule(await readFile(new URL('../api/admin/ideas.js',import.meta.url),'utf8'),{context});
await route.link(name=>modules[name]);await route.evaluate();
async function request(method,body={},query={}){const res={code:200,headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.body=v;return this;}};await route.namespace.default({method,body,query},res);return res;}
for(const method of ['GET','POST','PUT']){const r=await request(method,{title:'Private'}, {id:'secret'});assert.equal(r.code,401);assert.equal(r.headers['Cache-Control'],'private, no-store');}
assert.equal(calls.length,0,'No database access before authentication');authorized=true;
let r=await request('POST',{observation:'One line'});assert.equal(r.code,201);assert.equal(stored.data.observation,'One line');
r=await request('PUT',{id:stored.id,revision:1,action:'version',...a});assert.equal(r.code,200);
r=await request('PUT',{id:stored.id,revision:2,action:'version',...b});assert.equal(r.code,200);
r=await request('PUT',{id:stored.id,revision:3,action:'usage',versionId:stored.data.versions[0].id,channel:'linkedin',date:'2026-11-18'});assert.equal(r.code,200);assert.equal(stored.data.uses[0].channel,'linkedin');
assert(!calls.some(c=>/INSERT INTO posts/.test(c.q)),'LinkedIn never publishes a blog post');
r=await request('PUT',{id:stored.id,revision:1,title:'Stale'});assert.equal(r.code,409);
console.log('PASS real route: signed-out direct access rejected before DB, private capture, versions, independent LinkedIn record, stale-write protection');
const editor=await readFile(new URL('../admin/post-edit.html',import.meta.url),'utf8');
assert.match(editor,/sourceIdea\?\.data.versions.find/);assert.match(editor,/if \(draftLoading\) return/);
const publicRoute=await readFile(new URL('../api/content.js',import.meta.url),'utf8');assert(!publicRoute.includes('leadership_ideas'));
const posts=await readFile(new URL('../api/admin/posts.js',import.meta.url),'utf8');assert.match(posts,/WITH source AS/);assert.match(posts,/publishedSnapshot/);
console.log('PASS editor saved-version handoff and atomic blog-history SQL structure; public API has no private-table access');
