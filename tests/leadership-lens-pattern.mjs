import assert from 'node:assert/strict';
import {describePattern,describeLowest,DEFAULT_MISSED} from '../js/leadership-lens-pattern.js';
const config={lenses:[{id:'head',name:'The Analytical Lens'},{id:'heart',name:'The Relational Lens'},{id:'gut',name:'The Instinctive Lens'}]};
for(const scores of [{head:4,heart:3,gut:2},{head:2,heart:4,gut:3},{head:3,heart:2,gut:4}]) {
 const original=structuredClone(scores);
 const sorted=Object.keys(scores).sort((a,b)=>scores[b]-scores[a]);
 const p=describePattern(config,{scores,total:9,primary:sorted[1],reflectionResolved:true});
 assert.match(p.title,/close/);assert.match(p.reflection,/higher original score/);
 assert.deepEqual(p.candidates.map(l=>l.id),sorted.slice(0,2));assert.deepEqual(scores,original);
}
const tie=describePattern(config,{scores:{head:4,heart:1,gut:4},total:9,primary:'gut',reflectionResolved:true});
assert.match(tie.title,/share the lead/);assert.deepEqual(tie.candidates.map(l=>l.id),['head','gut']);assert.doesNotMatch(tie.reflection,/higher original score/);
const even=describePattern(config,{scores:{head:3,heart:3,gut:3},total:9,primary:'heart',reflectionResolved:true});
assert.match(even.explanation,/3–3–3/);assert.equal(even.candidates.length,3);assert.match(even.explanation,/do not point to a single/);
assert.equal(describePattern(config,{scores:{head:5,heart:3,gut:1},total:9}),null);
const old=describePattern(config,{scores:{head:3,heart:2,gut:1},total:6,primary:'head'});
assert.match(old.explanation,/6 answers/);assert.doesNotMatch(old.reflection,/Your final reflection/);
const pts=describePattern(config,{scores:{head:12,heart:10,gut:5},total:27,max:18,unit:'points',needsReflection:true,primary:'heart',reflectionResolved:true});
assert.match(pts.explanation,/earned 12 points and The Relational Lens earned 10/);assert.match(pts.reflection,/higher original score/);
assert.equal(describePattern(config,{scores:{head:13,heart:10,gut:4},total:27,max:18,unit:'points',needsReflection:false}),null);
const nearOnly=describePattern(config,{scores:{head:12,heart:11,gut:4},total:27,max:18,unit:'points',needsReflection:false,close:true,primary:'head',reflectionResolved:false});assert.match(nearOnly.title,/close/);assert.doesNotMatch(nearOnly.reflection,/higher original score/);assert.equal(describePattern(config,{scores:{head:13,heart:10,gut:4},total:27,max:18,unit:'points',needsReflection:false,close:false}),null);
console.log('PASS ranked points wording, close-score panel without reflection, and close-score threshold.');
console.log('PASS close scores across all leading lens pairs, lower-score reflection choice, two-way and three-way ties, clear winners, unchanged scores, and legacy results.');
{
 const pts=(scores)=>({scores,total:27,max:18,unit:'points'});
 const one=describeLowest(config,pts({head:10,heart:6,gut:11}));
 assert.equal(one.lenses.length,1);assert.equal(one.lenses[0].id,'heart');assert.equal(one.lenses[0].score,6);assert.equal(one.lenses[0].text,DEFAULT_MISSED.heart);assert.equal(one.max,18);
 const two=describeLowest(config,pts({head:15,heart:6,gut:6}));
 assert.deepEqual(two.lenses.map(l=>l.id).sort(),['gut','heart']);
 assert.equal(describeLowest(config,pts({head:10,heart:9,gut:8})),null);
 assert.equal(describeLowest(config,pts({head:9,heart:9,gut:9})),null);
 assert.equal(describeLowest(config,pts({head:12,heart:12,gut:3})).lenses[0].id,'gut');
 const custom={lenses:config.lenses.map(l=>l.id==='gut'?{...l,missed:'Custom gut text.'}:l)};
 assert.equal(describeLowest(custom,pts({head:12,heart:8,gut:7})),null);
 assert.equal(describeLowest(custom,pts({head:12,heart:9,gut:6})).lenses[0].text,'Custom gut text.');
 const blank={lenses:config.lenses.map(l=>l.id==='gut'?{...l,missed:'   '}:l)};
 assert.equal(describeLowest(blank,pts({head:12,heart:9,gut:6})).lenses[0].text,DEFAULT_MISSED.gut);
 assert.equal(describeLowest(config,{scores:{head:4,heart:3,gut:2},total:9,unit:'answers'}).lenses[0].id,'gut');
 console.log('PASS lowest-lens panel: single and tied lowest, near-even and three-way ties hidden, custom and blank wording, legacy answers.');
}
