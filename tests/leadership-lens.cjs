const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
let source = fs.readFileSync(require('node:path').join(__dirname, '../admin/js/leadership-lens.js'),'utf8');
source=source.replace(/^import .*;\n/, '');
async function setup(body={data:{}}, ok=true) {
 const nodes = new Map(); const get = id => { if(!nodes.has(id)) nodes.set(id,{disabled:true,style:{},value:'',textContent:'',innerHTML:'',listeners:{},addEventListener(k,f){this.listeners[k]=f},showModal(){this.open=true},close(){this.open=false}}); return nodes.get(id); };
 const calls=[];
 const context=vm.createContext({structuredClone,formatText:v=>String(v??'').replaceAll('<','&lt;').replaceAll('>','&gt;'),validateConfig:()=>true,upgradeConfig:d=>structuredClone(d),alignStyle:()=>'',PANEL_DEFAULTS:{panelTitle:'T',panelBody:'B',panelNote:'N'},panelText:(d,k)=>d[k]??'',ALIGNMENTS:['left','center','right','justify'],document:{getElementById:get,querySelector:()=>null,querySelectorAll:()=>[]},window:{LEADERSHIP_LENS_SEED:{tiebreaker:{text:'Tie',answers:[]}},addEventListener(){}},crypto:require('node:crypto').webcrypto,requireAdminAuth:()=>true,adminFetch:async(url,options)=>{calls.push({url,options});return {ok,json:async()=>body}},confirm:()=>true,setTimeout});
 vm.runInContext(source.replace('if (window.LEADERSHIP_LENS_SEED) draft = upgradeConfig(window.LEADERSHIP_LENS_SEED);',''),context); await new Promise(r=>setImmediate(r)); return {get,calls,context};
}
(async()=>{
 const t=await setup(); assert.equal(t.get('editor').disabled,false); assert.match(t.get('sections').innerHTML,/Write your question later/);
 t.get('add-section').onclick(); t.get('add-lens').onclick();
 t.get('editor').listeners.input({target:{dataset:{path:'sections.0.questions.0.text'},value:'<script>alert(1)</script>'}});
 t.get('preview').onclick(); assert.match(t.get('preview-body').innerHTML,/&lt;script&gt;/); assert.equal(t.get('preview-dialog').open,true); assert.match(t.get('preview-body').innerHTML,/Most like me/); assert.match(t.get('preview-body').innerHTML,/Least like me/); assert.match(t.get('preview-body').innerHTML,/aria-label=/);
 await t.get('save').onclick(); const payload=JSON.parse(t.calls.at(-1).options.body); assert.deepEqual(payload._lensExpected,{leadership_lens_draft_v1:null,leadership_lens_published_v1:null}); const draft=JSON.parse(payload.leadership_lens_draft_v1); assert.equal(draft.sections.length,2);assert.equal(draft.lenses.length,1);assert.equal(draft.sections[0].questions[0].answers[0].text,'');
 const reload=await setup({data:payload});assert.equal(reload.get('status').textContent,'Saved draft loaded.');assert.match(reload.get('sections').innerHTML,/&lt;script&gt;/);
 const bad=await setup({data:{leadership_lens_draft_v1:'{}'}});assert.equal(bad.get('editor').disabled,true);
 const failed=await setup({},false);assert.equal(failed.get('save').disabled,true);
 t.get('editor').listeners.click({target:{closest:()=>({dataset:{action:'section-up',index:'1'}})}});await t.get('save').onclick();const moved=JSON.parse(JSON.parse(t.calls.at(-1).options.body).leadership_lens_draft_v1);assert.equal(moved.sections[1].questions[0].text,'<script>alert(1)</script>');
 console.log('PASS: blank defaults, add sections/lenses, escaped preview, save/load roundtrip, reorder, malformed draft and load failure protection.');
})().catch(e=>{console.error(e);process.exitCode=1});
