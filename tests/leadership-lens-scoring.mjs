import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {validateConfig,score,shuffle,upgradeConfig} from '../js/leadership-lens-core.js';
const context={window:{}};vm.runInNewContext(fs.readFileSync(new URL('../data/leadership-lens-draft.js',import.meta.url),'utf8'),context);
const d=JSON.parse(JSON.stringify(context.window.LEADERSHIP_LENS_SEED));validateConfig(d);
assert.match(upgradeConfig(d).scoringNotes,/4\+ points is Strong, 3 is Clear/);
const typo=structuredClone(d);typo.panelBody="Inspired by the centers, this assessments offers a useful reflection.";assert.equal(upgradeConfig(typo).panelBody,"Inspired by the centers, this assessment offers a useful reflection.");
assert.equal(d.sections.length,3);assert.deepEqual(d.sections.map(s=>s.questions.length),[2,2,2]);
const [q1,q2,q3,q4,q5,q6]=d.sections.flatMap(s=>s.questions);
assert.equal(q1.text,'What draws your attention first?');assert.deepEqual(q1.answers.map(a=>[a.center,a.text]),[['head','The information and reasoning behind each perspective.'],['heart','How the decision will affect the people involved.'],['gut','The direction I believe we should take.']]);
assert.equal(q2.text,'As the disagreement continues, what occupies your attention most?');assert.deepEqual(q2.answers.map(a=>[a.center,a.text]),[['head','Whether we have considered the decision fully.'],['heart','Whether the disagreement is weakening trust between us.'],['gut','Whether I can stand behind the direction we choose.']]);
assert.equal(q3.text,'What draws your attention first?');assert.deepEqual(q3.answers.map(a=>[a.center,a.text]),[['head','What we still need to understand about the problem.'],['heart','How the situation is affecting the people involved.'],['gut','What needs to happen to restore momentum.']]);
assert.equal(q4.text,'The team turns the initiative around and achieves a strong result. Looking back, what gives you the greatest satisfaction?');assert.deepEqual(q4.answers.map(a=>[a.center,a.text]),[['head','Understanding what made the turnaround successful.'],['heart','Seeing what the accomplishment meant to the team.'],['gut','Knowing we carried the initiative through to completion.']]);
assert.equal(q5.text,'When pressure rises, what do you seek first?');assert.deepEqual(q5.answers.map(a=>[a.center,a.text]),[['head','Clarity'],['heart','Connection'],['gut','Choice']]);
assert.equal(q6.text,'What is hardest for you to tolerate?');assert.deepEqual(q6.answers.map(a=>[a.center,a.text]),[['head','Uncertainty / Ambiguity'],['heart','Disconnection / Separation'],['gut','Constraint / Restriction']]);
const questionCount=d.sections.flatMap(s=>s.questions).length;
let cases=0,ties=new Set();
for(let n=0;n<3**questionCount;n++){
 let x=n,answers={};for(const q of d.sections.flatMap(s=>s.questions)){answers[q.id]=q.answers[x%3].id;x=Math.floor(x/3);}
 const r=score(d,answers);assert.equal(Object.values(r.scores).reduce((a,b)=>a+b),questionCount);
 if(r.tied.length>1){assert.equal(r.primary,null);ties.add(Object.values(r.scores).sort().join(','));for(const c of r.tied){const resolved=score(d,answers,d.tiebreaker.answers.find(a=>a.center===c).id);assert.equal(resolved.primary,c);assert.deepEqual(resolved.scores,r.scores);assert.equal(resolved.strength,'Moderate preference');}const outside=d.tiebreaker.answers.find(a=>!r.tied.includes(a.center));if(outside)assert.equal(score(d,answers,outside.id).primary,null);}
 else {assert.equal(r.scores[r.primary],Math.max(...Object.values(r.scores)));assert.equal(r.strength,r.gap>=3?'Strong preference':r.gap===2?'Clear preference':'Moderate preference');}
 assert.equal(r.needsReflection,r.gap<=1);
 if(r.gap===1){assert.equal(r.candidates.length,2);for(const c of r.candidates){const clarified=score(d,answers,d.tiebreaker.answers.find(a=>a.center===c).id);assert.equal(clarified.primary,c);assert.equal(clarified.usedClarification,true);assert.equal(clarified.reflectionResolved,true);assert.deepEqual(clarified.scores,r.scores);assert.equal(clarified.strength,'Moderate preference');}const outside=d.tiebreaker.answers.find(a=>!r.candidates.includes(a.center));assert.equal(score(d,answers,outside.id).reflectionResolved,false);}
 if(r.gap>=2){for(const a of d.tiebreaker.answers)assert.equal(score(d,answers,a.id).primary,r.primary);}
 cases++;
}
assert.ok(ties.size>0);
assert.throws(()=>score(d,{}));const invalid=structuredClone(d);invalid.sections[0].questions[0].answers[0].center=invalid.sections[0].questions[0].answers[1].center;assert.throws(()=>validateConfig(invalid));
const q=d.sections[0].questions[0],before=q.answers.map(a=>a.id);assert.deepEqual(shuffle(q.answers,()=>0).map(a=>a.id).sort(),before.slice().sort());assert.deepEqual(q.answers.map(a=>a.id),before);
console.log(`PASS ${cases} answer distributions, all tied-center resolutions, strength thresholds, missing answers, invalid mappings, and shuffle identity.`);

const legacy=structuredClone(d);legacy.version=1;const oldAnswers=Object.fromEntries(legacy.sections.flatMap(s=>s.questions).map(q=>[q.id,q.answers[0].id]));assert.equal(score(legacy,oldAnswers).total,6);const upgraded=upgradeConfig(legacy);assert.equal(upgraded.sections.length,3);assert.deepEqual(upgraded.sections,legacy.sections);assert.equal(legacy.version,1);assert.equal(upgradeConfig(upgraded).version,3);assert.equal(score(upgraded,oldAnswers).total,6);console.log('PASS legacy six-answer results and idempotent upgrade preserving existing wording.');

const incomplete=structuredClone(legacy);incomplete.sections[0].questions[0].text='';assert.equal(upgradeConfig(incomplete).sections.length,3);assert.throws(()=>validateConfig(upgradeConfig(incomplete)));console.log('PASS incomplete Admin drafts can be upgraded but cannot be published.');

// Ranked (most / least) scoring
{
 const qs=d.sections.flatMap(s=>s.questions);let seed=7;const rand=()=>{seed=(seed*1103515245+12345)%2147483648;return seed/2147483648;};
 const perms=[[0,1],[0,2],[1,0],[1,2],[2,0],[2,1]];let n=0;const seen=new Set();
 for(let i=0;i<40000;i++){
  const answers={};for(const q of qs){const [m,l]=perms[Math.floor(rand()*6)];answers[q.id]={most:q.answers[m].id,least:q.answers[l].id};}
  const r=score(d,answers);n++;
  assert.equal(r.mode,'ranked');assert.equal(r.total,18);assert.equal(r.max,12);
  assert.equal(Object.values(r.scores).reduce((a,b)=>a+b),18);for(const v of Object.values(r.scores)){assert.ok(v>=0&&v<=12);}
  assert.equal(r.needsReflection,r.gap===0);assert.equal(r.close,r.gap<=2);if(r.gap>0)assert.equal(r.primary,Object.keys(r.scores).find(c=>r.scores[c]===Math.max(...Object.values(r.scores))));
  assert.equal(r.strength,r.gap<=2?'Moderate preference':r.gap>=4?'Strong preference':'Clear preference');
  if(r.tied.length>1)assert.equal(r.primary,null);else assert.equal(r.scores[r.primary],Math.max(...Object.values(r.scores)));
  if(r.needsReflection){for(const c of r.candidates){const x=score(d,answers,d.tiebreaker.answers.find(a=>a.center===c).id);assert.equal(x.primary,c);assert.deepEqual(x.scores,r.scores);}}
  else {for(const a of d.tiebreaker.answers)assert.equal(score(d,answers,a.id).primary,r.primary);}
  seen.add(r.strength);
 }
 assert.deepEqual([...seen].sort(),['Clear preference','Moderate preference','Strong preference']);
 const full={};for(const q of qs)full[q.id]={most:q.answers.find(a=>a.center==='head').id,least:q.answers.find(a=>a.center==='gut').id};
 const top=score(d,full);assert.deepEqual(top.scores,{head:12,heart:6,gut:0});assert.equal(top.primary,'head');assert.equal(top.strength,'Strong preference');
 const missingLeast=structuredClone(full);missingLeast[qs[0].id]={most:qs[0].answers[0].id};assert.throws(()=>score(d,missingLeast));
 const same=structuredClone(full);same[qs[0].id]={most:qs[0].answers[0].id,least:qs[0].answers[0].id};assert.throws(()=>score(d,same));
 const mixed=structuredClone(full);mixed[qs[0].id]=qs[0].answers[0].id;assert.throws(()=>score(d,mixed));
 console.log(`PASS ${n} ranked answer sets: 18-point totals, 12-point lens maximum, Strong/Clear/Moderate thresholds, tie-only reflection, close-score flag, incomplete and invalid rankings.`);
}
