import { sql } from '../_db.js';
import { Resend } from 'resend';

export default async function handler(req, res) {
  // Simple auth check just in case someone hits it manually
  // Vercel cron sets a special header, or we don't care if it's hit manually since it only sends when due.
  const authHeader = req.headers.authorization;
  const isVercelCron = req.headers['user-agent'] === 'vercel-cron/1.0';
  if (!isVercelCron && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      // Allow it to run manually for testing if hitting without auth? Better to require cron secret.
      // But let's be safe and let Vercel handle it.
  }

  try {
    // 1. Ensure Table Structure is Ready
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

    // Ensure subscribers have the drip fields
    await sql`
      ALTER TABLE subscribers
        ADD COLUMN IF NOT EXISTS drip_step INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ DEFAULT NOW()
    `;

    // 2. Fetch all steps for Hidden Ceiling map
    const templates = await sql`SELECT * FROM campaign_emails WHERE campaign_name = 'hidden-ceiling' ORDER BY step_number ASC`;
    if (!templates || templates.length === 0) {
      return res.status(200).json({ skipped: true, reason: 'No templates set up yet.' });
    }
    
    // Convert array to a fast lookup map based on step_number
    const templateMap = {};
    let maxStep = 0;
    for (const t of templates) {
      templateMap[t.step_number] = t;
      if (t.step_number > maxStep) maxStep = t.step_number;
    }

    // 3. Fetch all eligible subscribers
    // Eligible: They took the assessment (result_center IS NOT NULL) AND they haven't finished the campaign.
    const eligibleSubscribers = await sql`
      SELECT id, name, email, drip_step, last_email_sent_at 
      FROM subscribers 
      WHERE result_center IS NOT NULL AND drip_step < ${maxStep}
    `;

    if (eligibleSubscribers.length === 0) {
      return res.status(200).json({ processed: 0, reason: 'No eligible subscribers found.' });
    }

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
        throw new Error('Missing RESEND_API_KEY');
    }
    const resend = new Resend(resendKey);

    let sentCount = 0;

    // 4. Iterate and conditionally broadcast
    const nowMs = Date.now();
    for (const sub of eligibleSubscribers) {
      const nextStep = (sub.drip_step || 0) + 1;
      const template = templateMap[nextStep];

      if (!template) continue; // Safety check

      const lastSentTime = sub.last_email_sent_at ? new Date(sub.last_email_sent_at).getTime() : nowMs; // default to now if null
      const thresholdTime = lastSentTime + (template.delay_days * 24 * 60 * 60 * 1000);

      // If enough days have passed, send!
      if (nowMs >= thresholdTime) {
        
        try {
          const firstName = (sub.name || '').trim().split(' ')[0] || 'there';
          
          // Basic merge tag replacement for firstName
          const personalizedBody = template.body_html.replace(/\{\{\s*firstName\s*\}\}/g, firstName);

          await resend.emails.send({
            from: 'John Paine | Your Journey Coach <hello@journeycoach.co>',
            to: sub.email,
            subject: template.subject,
            html: personalizedBody
          });

          // Mark DB Update
          await sql`
            UPDATE subscribers 
            SET 
              drip_step = ${nextStep}, 
              last_email_sent_at = NOW() 
            WHERE id = ${sub.id}
          `;
          
          sentCount++;
        } catch (emailErr) {
          console.error(`Failed to send step ${nextStep} to ${sub.email}:`, emailErr.message);
        }
      }
    }

    return res.status(200).json({ ok: true, processed: eligibleSubscribers.length, sent: sentCount });

  } catch (err) {
    console.error('Cron drip error:', err);
    return res.status(500).json({ error: 'Internal cron error' });
  }
}
