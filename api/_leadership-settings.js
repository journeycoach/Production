// Returns a lazy Neon query so it can also be exercised in an isolated transaction.
export function guardedAssessmentWrite(sql, key, value, baseline) {
  const checks=['leadership_lens_draft_v1','leadership_lens_published_v1'].map(k=>({key:k,value:baseline[k]}));
  return sql`
          WITH locked AS MATERIALIZED (
            SELECT setting_key, setting_value FROM site_settings
            WHERE setting_key IN ('leadership_lens_draft_v1','leadership_lens_published_v1')
            ORDER BY setting_key FOR UPDATE
          ), expected AS (
            SELECT * FROM jsonb_to_recordset(${JSON.stringify(checks)}::jsonb) AS e(key text,value text)
          )
          INSERT INTO site_settings (setting_key,setting_value,updated_at)
          SELECT ${key},${value},NOW()
          WHERE NOT EXISTS (
            SELECT 1 FROM expected e LEFT JOIN locked l ON l.setting_key=e.key
            WHERE l.setting_value IS DISTINCT FROM e.value
          )
          ON CONFLICT (setting_key) DO UPDATE SET setting_value=EXCLUDED.setting_value,updated_at=NOW()
          WHERE site_settings.setting_value IS NOT DISTINCT FROM ${baseline[key]}
          RETURNING setting_key
        `;
}
