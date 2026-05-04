import { sql } from './_db.js';

let migrated = false;

export async function runMigrations() {
  if (migrated) return;

  await sql`
    CREATE TABLE IF NOT EXISTS subscribers (
      id             SERIAL PRIMARY KEY,
      email          TEXT UNIQUE NOT NULL,
      name           TEXT,
      source         TEXT DEFAULT 'website',
      created_at     TIMESTAMPTZ DEFAULT NOW(),
      result_center  TEXT,
      score_heart    INT,
      score_head     INT,
      score_action   INT
    )
  `;
  await sql`
    ALTER TABLE subscribers
      ADD COLUMN IF NOT EXISTS result_center             TEXT,
      ADD COLUMN IF NOT EXISTS score_heart               INT,
      ADD COLUMN IF NOT EXISTS score_head                INT,
      ADD COLUMN IF NOT EXISTS score_action              INT,
      ADD COLUMN IF NOT EXISTS source_history            JSONB DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS drip_step                 INT DEFAULT 0,
      ADD COLUMN IF NOT EXISTS last_email_sent_at        TIMESTAMPTZ DEFAULT NOW(),
      ADD COLUMN IF NOT EXISTS is_unsubscribed           BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS notes                     TEXT,
      ADD COLUMN IF NOT EXISTS attribution_source        TEXT,
      ADD COLUMN IF NOT EXISTS first_attribution_source  TEXT,
      ADD COLUMN IF NOT EXISTS landing_page              TEXT,
      ADD COLUMN IF NOT EXISTS referrer                  TEXT,
      ADD COLUMN IF NOT EXISTS utm_source                TEXT,
      ADD COLUMN IF NOT EXISTS utm_medium                TEXT,
      ADD COLUMN IF NOT EXISTS utm_campaign              TEXT,
      ADD COLUMN IF NOT EXISTS utm_term                  TEXT,
      ADD COLUMN IF NOT EXISTS utm_content               TEXT,
      ADD COLUMN IF NOT EXISTS attribution               JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS email_status              TEXT,
      ADD COLUMN IF NOT EXISTS email_status_at           TIMESTAMPTZ
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS contact_submissions (
      id         SERIAL PRIMARY KEY,
      name       TEXT,
      email      TEXT,
      phone      TEXT,
      interest   TEXT,
      message    TEXT,
      source     TEXT DEFAULT 'website',
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    ALTER TABLE contact_submissions
      ADD COLUMN IF NOT EXISTS attribution_source        TEXT,
      ADD COLUMN IF NOT EXISTS first_attribution_source  TEXT,
      ADD COLUMN IF NOT EXISTS landing_page              TEXT,
      ADD COLUMN IF NOT EXISTS referrer                  TEXT,
      ADD COLUMN IF NOT EXISTS utm_source                TEXT,
      ADD COLUMN IF NOT EXISTS utm_medium                TEXT,
      ADD COLUMN IF NOT EXISTS utm_campaign              TEXT,
      ADD COLUMN IF NOT EXISTS utm_term                  TEXT,
      ADD COLUMN IF NOT EXISTS utm_content               TEXT,
      ADD COLUMN IF NOT EXISTS attribution               JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS email_status              TEXT,
      ADD COLUMN IF NOT EXISTS email_status_at           TIMESTAMPTZ
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS posts (
      id        SERIAL PRIMARY KEY,
      title     TEXT,
      post_date DATE,
      author    TEXT,
      image_url TEXT,
      summary   TEXT,
      body      TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS slug TEXT`;

  await sql`
    CREATE TABLE IF NOT EXISTS testimonials (
      id         SERIAL PRIMARY KEY,
      quote      TEXT,
      author     TEXT,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  await sql`
    ALTER TABLE testimonials
      ADD COLUMN IF NOT EXISTS short_quote      TEXT,
      ADD COLUMN IF NOT EXISTS long_quote       TEXT,
      ADD COLUMN IF NOT EXISTS client_role      TEXT,
      ADD COLUMN IF NOT EXISTS industry         TEXT,
      ADD COLUMN IF NOT EXISTS display_location TEXT DEFAULT 'homepage',
      ADD COLUMN IF NOT EXISTS is_featured      BOOLEAN DEFAULT FALSE
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS campaign_emails (
      id            SERIAL PRIMARY KEY,
      campaign_name TEXT NOT NULL,
      step_number   INT NOT NULL,
      subject       TEXT,
      body_html     TEXT,
      delay_days    INT DEFAULT 2,
      is_active     BOOLEAN DEFAULT TRUE,
      UNIQUE(campaign_name, step_number)
    )
  `;
  await sql`ALTER TABLE campaign_emails ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE`;

  await sql`
    CREATE TABLE IF NOT EXISTS submission_attempts (
      id         SERIAL PRIMARY KEY,
      action     TEXT NOT NULL,
      ip_hash    TEXT NOT NULL,
      email_hash TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS admin_login_attempts (
      id         SERIAL PRIMARY KEY,
      ip_hash    TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;

  await sql`ALTER TABLE navigation ADD COLUMN IF NOT EXISTS footer_links jsonb DEFAULT '[]'::jsonb`;

  migrated = true;
}
