// Integration test: temporary table shadows site_settings only within this transaction.
// No production records are read or changed. Run with node --env-file=.env.local.
import assert from 'node:assert/strict';
import {sql} from '../api/_db.js';
import {guardedAssessmentWrite} from '../api/_leadership-settings.js';
const draft='leadership_lens_draft_v1',live='leadership_lens_published_v1';
const baseline={[draft]:'original draft',[live]:'original live'};
const queries=[
 sql`CREATE TEMP TABLE site_settings (setting_key text PRIMARY KEY,setting_value text,updated_at timestamptz) ON COMMIT DROP`,
 sql`INSERT INTO pg_temp.site_settings (setting_key,setting_value) VALUES (${draft},${baseline[draft]}),(${live},${baseline[live]})`,
 guardedAssessmentWrite(sql,draft,'saved draft',baseline),
 guardedAssessmentWrite(sql,draft,'stale draft',baseline),
 guardedAssessmentWrite(sql,live,'stale publish',baseline),
 guardedAssessmentWrite(sql,live,'new live',{...baseline,[draft]:'saved draft'}),
 guardedAssessmentWrite(sql,draft,'stale after publish',{...baseline,[draft]:'saved draft'}),
 sql`SELECT setting_key,setting_value FROM pg_temp.site_settings ORDER BY setting_key`
];
const results=await sql.transaction(queries);
assert.equal(results[2].length,1);assert.equal(results[3].length,0);assert.equal(results[4].length,0);assert.equal(results[5].length,1);assert.equal(results[6].length,0);
assert.deepEqual(Object.fromEntries(results[7].map(r=>[r.setting_key,r.setting_value])),{[draft]:'saved draft',[live]:'new live'});
console.log('PASS guarded SQL writes: current draft saves, stale saves/publishes rejected, fresh publish succeeds, published changes invalidate older draft saves. Isolated temporary table only.');
