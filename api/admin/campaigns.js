import { sql } from '../_db.js';

async function ensureTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS campaign_emails (
      id SERIAL PRIMARY KEY,
      campaign_name TEXT NOT NULL,
      step_number INT NOT NULL,
      subject TEXT,
      body_html TEXT,
      delay_days INT DEFAULT 2,
      UNIQUE(campaign_name, step_number)
    )
  `;

  // Seed default 'hidden-ceiling' campaign if empty
  const existing = await sql`SELECT COUNT(*) as count FROM campaign_emails WHERE campaign_name = 'hidden-ceiling'`;
  if (parseInt(existing[0].count, 10) === 0) {
    for (let i = 1; i <= 5; i++) {
        await sql`
          INSERT INTO campaign_emails (campaign_name, step_number, subject, body_html, delay_days)
          VALUES ('hidden-ceiling', ${i}, ${'Follow-up Email ' + i}, '<p>This is your automated email content.</p>', 2)
        `;
    }
  }
}

export default async function handler(req, res) {
  // Ensure table and defaults exist
  try {
    await ensureTable();
  } catch(err) {
    console.error('campaign db init error:', err);
  }

  if (req.method === 'GET') {
    try {
      const campaignName = req.query.campaign || 'hidden-ceiling';
      const steps = await sql`
        SELECT * FROM campaign_emails 
        WHERE campaign_name = ${campaignName} 
        ORDER BY step_number ASC
      `;
      return res.status(200).json({ ok: true, data: steps });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to load campaigns' });
    }
  }

  if (req.method === 'PUT') {
    try {
      const { id, subject, body_html, delay_days } = req.body;
      if (!id) return res.status(400).json({ error: 'Missing step ID' });

      await sql`
        UPDATE campaign_emails
        SET 
          subject = ${subject},
          body_html = ${body_html},
          delay_days = ${delay_days}
        WHERE id = ${id}
      `;
      return res.status(200).json({ ok: true });
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Failed to update campaign template' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
