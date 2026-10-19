import assert from 'node:assert/strict';
import {buildContactSummary,prefillContactSummary,CONTACT_SUMMARY_KEY} from '../js/leadership-lens-contact.js';
const config={lenses:[{id:'head',name:'The Analytical Lens'},{id:'heart',name:'The Relational Lens'},{id:'gut',name:'The Instinctive Lens'}]};
const outcome={total:6,primary:'heart',scores:{head:3,heart:2,gut:1},strength:'Moderate preference',usedClarification:true};
const summary=buildContactSummary(config,outcome);
assert.match(summary,/Primary lens: The Relational Lens/);
assert.match(summary,/Analytical Lens: 50% \(3 of 6 answers\)/);
assert.match(summary,/Relational Lens: 33.3%/);assert.match(summary,/Instinctive Lens: 16.7%/);
assert.match(summary,/original scores unchanged/);
const data=new Map([[CONTACT_SUMMARY_KEY,summary]]),storage={getItem:k=>data.get(k),removeItem:k=>data.delete(k)};
const field={value:'My own question.'};
assert.equal(prefillContactSummary(storage,field,''),false);assert.equal(field.value,'My own question.');
assert.equal(prefillContactSummary(storage,field,'?assessment=leadership-lens'),true);assert.ok(field.value.startsWith('My own question.\n\n'));assert.equal(data.has(CONTACT_SUMMARY_KEY),false);
assert.equal(prefillContactSummary(storage,field,'?assessment=leadership-lens'),false);
data.set(CONTACT_SUMMARY_KEY,summary);prefillContactSummary(storage,field,'?assessment=leadership-lens');assert.equal(field.value.split('My Leadership Lens assessment results').length,2);
assert.throws(()=>buildContactSummary(config,{...outcome,scores:{head:3,heart:3,gut:3}}));
assert.equal(prefillContactSummary({getItem(){throw Error();}},field,'?assessment=leadership-lens'),false);
const tied=buildContactSummary(config,{...outcome,scores:{head:2,heart:2,gut:2},usedTiebreaker:true});assert.equal((tied.match(/33.3%/g)||[]).length,3);
console.log('PASS result percentages, clarified primary, original scores, existing text preservation, one-time transfer, duplicate prevention, invalid scores and blocked storage.');

const nine={...config,sections:Array.from({length:3},()=>({questions:[{},{},{}]}))};const message=buildContactSummary(nine,{...outcome,total:9,scores:{head:5,heart:3,gut:1}});assert.match(message,/55.6% \(5 of 9 answers\)/);assert.match(message,/33.3% \(3 of 9 answers\)/);assert.match(message,/11.1% \(1 of 9 answers\)/);console.log('PASS nine-question percentages and denominator.');

const ranked=buildContactSummary(nine,{...outcome,unit:'points',total:27,max:18,scores:{head:12,heart:10,gut:5}});assert.match(ranked,/44.4% \(12 of 27 points\)/);assert.match(ranked,/18.5% \(5 of 27 points\)/);assert.match(ranked,/share of the 27 points/);console.log('PASS ranked 27-point summary.');
