import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {validateConfig,score,shuffle} from '../js/leadership-lens-core.js';
const context={window:{}};vm.runInNewContext(fs.readFileSync(new URL('../data/leadership-lens-draft.js',import.meta.url),'utf8'),context);
const d=JSON.parse(JSON.stringify(context.window.LEADERSHIP_LENS_SEED));validateConfig(d);
let cases=0,ties=new Set();
for(let n=0;n<729;n++){
 let x=n,answers={};for(const q of d.sections.flatMap(s=>s.questions)){answers[q.id]=q.answers[x%3].id;x=Math.floor(x/3);}
 const r=score(d,answers);assert.equal(Object.values(r.scores).reduce((a,b)=>a+b),6);
 if(r.tied.length>1){assert.equal(r.primary,null);ties.add(Object.values(r.scores).sort().join(','));for(const c of r.tied){const resolved=score(d,answers,d.tiebreaker.answers.find(a=>a.center===c).id);assert.equal(resolved.primary,c);assert.deepEqual(resolved.scores,r.scores);assert.equal(resolved.strength,'Moderate preference');}const outside=d.tiebreaker.answers.find(a=>!r.tied.includes(a.center));if(outside)assert.equal(score(d,answers,outside.id).primary,null);}
 else {assert.equal(r.scores[r.primary],Math.max(...Object.values(r.scores)));assert.equal(r.strength,r.gap>=3?'Strong preference':r.gap===2?'Clear preference':'Moderate preference');}
 cases++;
}
assert.deepEqual([...ties].sort(),['0,3,3','2,2,2']);
assert.throws(()=>score(d,{}));const invalid=structuredClone(d);invalid.sections[0].questions[0].answers[0].center='head';assert.throws(()=>validateConfig(invalid));
const q=d.sections[0].questions[0],before=q.answers.map(a=>a.id);assert.deepEqual(shuffle(q.answers,()=>0).map(a=>a.id).sort(),before.slice().sort());assert.deepEqual(q.answers.map(a=>a.id),before);
console.log(`PASS ${cases} answer distributions, all tied-center resolutions, strength thresholds, missing answers, invalid mappings, and shuffle identity.`);
