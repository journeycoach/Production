import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const source=fs.readFileSync('api/admin/settings.js','utf8').replace(/^import .*;\n/gm,'').replace('export default async function handler','async function handler');
let writes=0,allow=true;
const context=vm.createContext({console,requireAuth:()=>true,runMigrations:async()=>{},validateConfig:d=>d,guardedAssessmentWrite:async()=>{writes++;return allow?[{setting_key:'ok'}]:[];},sql:()=>{throw Error('Unexpected generic settings write');}});
vm.runInContext(source,context);
async function put(body){const res={setHeader(){},status(n){this.code=n;return this;},json(data){this.body=data;return this;}};await context.handler({method:'PUT',body},res);return res;}
const key='leadership_lens_draft_v1',live='leadership_lens_published_v1';
assert.equal((await put({[key]:'{}'})).code,409);assert.equal(writes,0);
const payload={[key]:'{}',_lensExpected:{[key]:'old draft',[live]:'old live'}};
assert.equal((await put(payload)).code,200);
allow=false;assert.equal((await put(payload)).code,409);
assert.equal((await put({...payload,unrelated:'value'})).code,400);
console.log('PASS API rejects old clients without baselines, returns conflicts for stale writes, accepts guarded saves, and rejects mixed assessment/settings writes.');
