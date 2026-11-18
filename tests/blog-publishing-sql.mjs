// Integration test uses transaction-scoped TEMP tables that shadow public tables.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sql } from '../api/_db.js';
const source=await readFile(new URL('../api/admin/posts.js',import.meta.url),'utf8');
const statement=source.match(/const rows = await sql`\s*(WITH source AS[\s\S]*?SELECT published\.\* FROM published JOIN recorded ON TRUE)\s*`/)[1];
const query=new Function('sql','ideaId','versionId','title','post_date','author','image_url','summary','body','slug','return sql`'+statement+'`;');
const data={versions:[{id:'v1',name:'Exact source',body:'Original saved text'}],uses:[]};
const results=await sql.transaction([
 sql`CREATE TEMP TABLE posts (id SERIAL PRIMARY KEY,title TEXT,post_date DATE,author TEXT,image_url TEXT,summary TEXT,body TEXT,slug TEXT) ON COMMIT DROP`,
 sql`CREATE TEMP TABLE leadership_ideas (id TEXT PRIMARY KEY,data JSONB,revision INTEGER DEFAULT 1,updated_at TIMESTAMPTZ DEFAULT NOW()) ON COMMIT DROP`,
 sql`INSERT INTO leadership_ideas (id,data) VALUES ('integration-idea',${JSON.stringify(data)}::jsonb)`,
 query(sql,'integration-idea','v1','Example','2026-11-18','John',null,null,'Edited publication text','integration-only'),
 sql`SELECT data,revision FROM leadership_ideas`,
 query(sql,'integration-idea','missing','Must not publish',null,'John',null,null,'No publication','must-not-publish'),
 sql`SELECT COUNT(*)::int AS total FROM posts`
]);
assert.equal(results[3].length,1);
assert.equal(results[4][0].data.uses[0].snapshot.body,'Original saved text');
assert.equal(results[4][0].data.uses[0].publishedSnapshot.body,'Edited publication text');
assert.equal(results[4][0].data.uses[0].date,'2026-11-18');
assert.equal(results[4][0].revision,2);
assert.equal(results[5].length,0);
assert.equal(results[6][0].total,1);
console.log('PASS real Neon transaction: publication and exact private history commit together; missing source cannot publish; only temporary tables used');
