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
const pts=describePattern(config,{scores:{head:8,heart:6,gut:4},total:18,max:12,unit:'points',needsReflection:true,primary:'heart',reflectionResolved:true});
assert.match(pts.explanation,/earned 8 points and The Relational Lens earned 6/);assert.match(pts.reflection,/higher original score/);
assert.equal(describePattern(config,{scores:{head:9,heart:6,gut:3},total:18,max:12,unit:'points',needsReflection:false}),null);
const nearOnly=describePattern(config,{scores:{head:8,heart:7,gut:3},total:18,max:12,unit:'points',needsReflection:false,close:true,primary:'head',reflectionResolved:false});assert.match(nearOnly.title,/close/);assert.doesNotMatch(nearOnly.reflection,/higher original score/);assert.equal(describePattern(config,{scores:{head:9,heart:6,gut:3},total:18,max:12,unit:'points',needsReflection:false,close:false}),null);
console.log('PASS ranked points wording, close-score panel without reflection, and close-score threshold.');
console.log('PASS close scores across all leading lens pairs, lower-score reflection choice, two-way and three-way ties, clear winners, unchanged scores, and legacy results.');
{
 const pts=(scores)=>({scores,total:18,max:12,unit:'points'});
 const one=describeLowest(config,pts({head:7,heart:4,gut:7}));
 assert.equal(one.lenses.length,1);assert.equal(one.lenses[0].id,'heart');assert.equal(one.lenses[0].score,4);assert.equal(one.lenses[0].text,DEFAULT_MISSED.heart);assert.equal(one.max,12);
 const two=describeLowest(config,pts({head:10,heart:4,gut:4}));
 assert.deepEqual(two.lenses.map(l=>l.id).sort(),['gut','heart']);
 const near=describeLowest(config,pts({head:7,heart:6,gut:5}));assert.equal(near.lenses[0].id,'gut');assert.equal(near.close,true);assert.equal(one.close,false);
 const even=describeLowest(config,pts({head:6,heart:6,gut:6}));assert.equal(even.even,true);assert.equal(even.lenses.length,3);assert.equal(even.close,false);
 assert.equal(describeLowest(config,pts({head:8,heart:8,gut:2})).lenses[0].id,'gut');
 const custom={lenses:config.lenses.map(l=>l.id==='gut'?{...l,missed:'Custom gut text.'}:l)};
 assert.equal(describeLowest(custom,pts({head:8,heart:6,gut:5})).close,true);
 assert.equal(describeLowest(custom,pts({head:8,heart:7,gut:3})).lenses[0].text,'Custom gut text.');
 const blank={lenses:config.lenses.map(l=>l.id==='gut'?{...l,missed:'   '}:l)};
 assert.equal(describeLowest(blank,pts({head:8,heart:7,gut:3})).lenses[0].text,DEFAULT_MISSED.gut);
 assert.equal(describeLowest(config,{scores:{head:4,heart:3,gut:2},total:9,unit:'answers'}).lenses[0].id,'gut');
 console.log('PASS lowest-lens panel: single and tied lowest, near-even flagged as close, three-way tie shows all three, custom and blank wording, legacy answers.');
}
