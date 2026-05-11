import { sql } from '../_db.js';
import { requireAuth } from '../_auth.js';
import { runMigrations } from '../_migrate.js';

const ALLOWED_WEEKS = new Set([4, 12, 26]);

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (!requireAuth(req, res)) return;
  await runMigrations();

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawWeeks = parseInt(req.query.weeks, 10);
  const weeks = ALLOWED_WEEKS.has(rawWeeks) ? rawWeeks : 12;

  try {
    // --- Subscribers over time ---
    const subscribersOverTime = await sql`
      SELECT
        TO_CHAR(DATE_TRUNC('week', gs.week_start), 'YYYY-MM-DD') AS week,
        COUNT(s.id)::int AS count
      FROM generate_series(
        DATE_TRUNC('week', NOW()) - (${weeks - 1} || ' weeks')::interval,
        DATE_TRUNC('week', NOW()),
        '1 week'::interval
      ) AS gs(week_start)
      LEFT JOIN subscribers s
        ON DATE_TRUNC('week', s.created_at AT TIME ZONE 'UTC') = gs.week_start
      GROUP BY gs.week_start
      ORDER BY gs.week_start
    `;

    // --- Assessments over time (subscribers with a result_center) ---
    const assessmentsOverTime = await sql`
      SELECT
        TO_CHAR(DATE_TRUNC('week', gs.week_start), 'YYYY-MM-DD') AS week,
        COUNT(s.id)::int AS count
      FROM generate_series(
        DATE_TRUNC('week', NOW()) - (${weeks - 1} || ' weeks')::interval,
        DATE_TRUNC('week', NOW()),
        '1 week'::interval
      ) AS gs(week_start)
      LEFT JOIN subscribers s
        ON DATE_TRUNC('week', s.created_at AT TIME ZONE 'UTC') = gs.week_start
        AND s.result_center IS NOT NULL
      GROUP BY gs.week_start
      ORDER BY gs.week_start
    `;

    // --- Contact form submissions over time ---
    const contactsOverTime = await sql`
      SELECT
        TO_CHAR(DATE_TRUNC('week', gs.week_start), 'YYYY-MM-DD') AS week,
        COUNT(c.id)::int AS count
      FROM generate_series(
        DATE_TRUNC('week', NOW()) - (${weeks - 1} || ' weeks')::interval,
        DATE_TRUNC('week', NOW()),
        '1 week'::interval
      ) AS gs(week_start)
      LEFT JOIN contact_submissions c
        ON DATE_TRUNC('week', c.created_at AT TIME ZONE 'UTC') = gs.week_start
      GROUP BY gs.week_start
      ORDER BY gs.week_start
    `;

    // --- Call bookings over time (subscribers where has_booked_call = true, grouped by booked_call_at) ---
    const bookingsOverTime = await sql`
      SELECT
        TO_CHAR(DATE_TRUNC('week', gs.week_start), 'YYYY-MM-DD') AS week,
        COUNT(s.id)::int AS count
      FROM generate_series(
        DATE_TRUNC('week', NOW()) - (${weeks - 1} || ' weeks')::interval,
        DATE_TRUNC('week', NOW()),
        '1 week'::interval
      ) AS gs(week_start)
      LEFT JOIN subscribers s
        ON DATE_TRUNC('week', s.booked_call_at AT TIME ZONE 'UTC') = gs.week_start
        AND s.has_booked_call = true
        AND s.booked_call_at IS NOT NULL
      GROUP BY gs.week_start
      ORDER BY gs.week_start
    `;

    // --- Result center distribution (all time) ---
    const resultCenterRows = await sql`
      SELECT result_center, COUNT(*)::int AS count
      FROM subscribers
      WHERE result_center IS NOT NULL
      GROUP BY result_center
    `;
    const resultCenterCounts = { heart: 0, head: 0, gut: 0 };
    for (const row of resultCenterRows) {
      const key = String(row.result_center).toLowerCase();
      if (key in resultCenterCounts) {
        resultCenterCounts[key] = row.count;
      }
    }

    // --- Drip step distribution (all time) ---
    const dripStepDistribution = await sql`
      SELECT drip_step AS step, COUNT(*)::int AS count
      FROM subscribers
      WHERE drip_step IS NOT NULL
      GROUP BY drip_step
      ORDER BY drip_step
    `;

    return res.status(200).json({
      subscribersOverTime,
      assessmentsOverTime,
      contactsOverTime,
      bookingsOverTime,
      resultCenterCounts,
      dripStepDistribution,
    });
  } catch (err) {
    console.error('analytics GET error:', err);
    return res.status(500).json({ error: 'Database error' });
  }
}
