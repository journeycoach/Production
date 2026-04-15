import crypto from 'crypto';
import { sql } from './_db.js';
import { Resend } from 'resend';

const RATE_LIMIT_SALT = process.env.RATE_LIMIT_SALT || process.env.ADMIN_JWT_SECRET || 'journeycoach-rate-limit';

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function getClientIp(req) {
  const forwarded = String(
    req.headers['x-forwarded-for']
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || ''
  );
  return forwarded.split(',')[0].trim() || 'unknown';
}

function hashRateLimitValue(value) {
  return crypto.createHash('sha256').update(`${RATE_LIMIT_SALT}:${value}`).digest('hex');
}

async function ensureSubmissionAttemptTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS submission_attempts (
      id SERIAL PRIMARY KEY,
      action TEXT NOT NULL,
      ip_hash TEXT NOT NULL,
      email_hash TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
}

async function enforceSubmissionRateLimit(req, action, email, { maxPerHour = 8, maxPerDayPerEmail = 3 } = {}) {
  try {
    await ensureSubmissionAttemptTable();

    const ipHash = hashRateLimitValue(getClientIp(req));
    const emailHash = email ? hashRateLimitValue(normalizeEmail(email)) : null;

    const [hourlyCountRow] = await sql`
      SELECT COUNT(*)::int AS count
      FROM submission_attempts
      WHERE action = ${action}
        AND ip_hash = ${ipHash}
        AND created_at > NOW() - INTERVAL '1 hour'
    `;

    if ((hourlyCountRow?.count || 0) >= maxPerHour) {
      return { allowed: false, error: 'Too many requests from this device. Please wait a bit and try again.' };
    }

    if (emailHash) {
      const [dailyCountRow] = await sql`
        SELECT COUNT(*)::int AS count
        FROM submission_attempts
        WHERE action = ${action}
          AND email_hash = ${emailHash}
          AND created_at > NOW() - INTERVAL '1 day'
      `;

      if ((dailyCountRow?.count || 0) >= maxPerDayPerEmail) {
        return { allowed: false, error: 'That email has reached the daily submission limit. Please try again tomorrow.' };
      }
    }

    await sql`
      INSERT INTO submission_attempts (action, ip_hash, email_hash)
      VALUES (${action}, ${ipHash}, ${emailHash})
    `;

    await sql`
      DELETE FROM submission_attempts
      WHERE created_at < NOW() - INTERVAL '7 days'
    `;

    return { allowed: true };
  } catch (err) {
    console.error('submission rate limit error:', err);
    return { allowed: true };
  }
}

async function handleSubscribe(req, res) {
  const { email, name, source } = req.body || {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const limit = await enforceSubmissionRateLimit(req, 'subscribe', email, {
    maxPerHour: 6,
    maxPerDayPerEmail: 2,
  });
  if (!limit.allowed) {
    return res.status(429).json({ error: limit.error });
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS subscribers (
        id         SERIAL PRIMARY KEY,
        email      TEXT UNIQUE NOT NULL,
        name       TEXT,
        source     TEXT DEFAULT 'website',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
    await sql`
      INSERT INTO subscribers (email, name, source)
      VALUES (${email.toLowerCase().trim()}, ${name?.trim() || null}, ${source || 'website'})
      ON CONFLICT (email) DO NOTHING
    `;
  } catch (err) {
    console.error('subscribe insert error:', err);
    return res.status(500).json({ error: 'Could not save your subscription.' });
  }
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const firstName = (name || '').trim().split(' ')[0] || 'there';
      const guideSettings = await sql`
        SELECT setting_key, setting_value FROM site_settings
        WHERE setting_key IN ('guide_email_subject', 'guide_email_body')
      `;
      const gs = Object.fromEntries(guideSettings.map(r => [r.setting_key, r.setting_value]));
      const subject = (gs.guide_email_subject || 'Understanding Your Hidden Ceiling').replace(/\{\{firstName\}\}/g, firstName);
      const html = gs.guide_email_body
        ? gs.guide_email_body.replace(/\{\{firstName\}\}/g, firstName)
        : buildGuideEmail(firstName);
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: 'John Paine | Your Journey Coach <hello@journeycoach.co>',
        to: email,
        subject,
        html,
      });
    }
  } catch (emailErr) {
    console.error('Welcome email failed:', emailErr.message);
  }
  return res.status(200).json({ ok: true });
}

async function handleHiddenCeiling(req, res) {
  const { name, email, company, source, answers } = req.body || {};

  // Honeypot — bots fill the company field
  if (company) {
    return res.status(200).json({ ok: true, result: { center: 'heart' }, scores: { heart: 0, head: 0, action: 0 }, emailSent: false });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!name?.trim()) return res.status(400).json({ error: 'Please enter your name.' });
  if (!email || !emailRegex.test(email)) return res.status(400).json({ error: 'Please enter a valid email address.' });
  if (!answers || typeof answers !== 'object') return res.status(400).json({ error: 'Assessment answers are required.' });

  const limit = await enforceSubmissionRateLimit(req, 'hidden_ceiling', email, {
    maxPerHour: 8,
    maxPerDayPerEmail: 3,
  });
  if (!limit.allowed) {
    return res.status(429).json({ error: limit.error });
  }

  // Score: each question maps answer index → center
  const SCORE_MAP = {
    q1: ['head', 'action', 'heart'],
    q2: ['head', 'heart', 'action'],
    q3: ['head', 'heart', 'action'],
    q4: ['heart', 'head', 'action'],
    q5: ['head', 'heart', 'action'],
    q6: ['heart', 'head', 'action'],
    q7: ['heart', 'head', 'action'],
  };

  const scores = { heart: 0, head: 0, action: 0 };
  for (const [qId, centers] of Object.entries(SCORE_MAP)) {
    const idx = answers[qId];
    if (idx !== null && idx !== undefined && centers[idx]) {
      scores[centers[idx]]++;
    }
  }

  const center = Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
  const result = { center };

  // Save to subscribers with assessment result (best-effort)
  try {
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
        ADD COLUMN IF NOT EXISTS result_center TEXT,
        ADD COLUMN IF NOT EXISTS score_heart   INT,
        ADD COLUMN IF NOT EXISTS score_head    INT,
        ADD COLUMN IF NOT EXISTS score_action  INT
    `;
    await sql`
      INSERT INTO subscribers (email, name, source, result_center, score_heart, score_head, score_action)
      VALUES (
        ${email.toLowerCase().trim()}, ${name.trim() || null}, ${source || 'hidden-ceiling'},
        ${center}, ${scores.heart}, ${scores.head}, ${scores.action}
      )
      ON CONFLICT (email) DO UPDATE SET
        result_center = EXCLUDED.result_center,
        score_heart   = EXCLUDED.score_heart,
        score_head    = EXCLUDED.score_head,
        score_action  = EXCLUDED.score_action
    `;
  } catch (dbErr) {
    console.error('hidden ceiling subscriber save error:', dbErr);
  }

  // Send personalised result email (best-effort)
  let emailSent = false;
  let emailError = null;
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) {
      emailError = 'RESEND_API_KEY environment variable is not set in Vercel.';
    } else {
      const firstName = name.trim().split(' ')[0] || 'there';
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: 'John Paine | Your Journey Coach <hello@journeycoach.co>',
        to: email,
        subject: 'Your Hidden Ceiling Assessment Result',
        html: buildHiddenCeilingEmail(firstName, center, scores),
      });
      emailSent = true;
    }
  } catch (emailErr) {
    emailError = emailErr.message;
    console.error('Hidden ceiling email failed:', emailErr.message);
  }

  return res.status(200).json({ ok: true, result, scores, emailSent, emailError, calendly_url: 'https://calendly.com/johnpaine/hidden-ceiling-debrief' });
}

async function handleCronDrip(req, res) {
  try {
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

    await sql`
      ALTER TABLE subscribers
        ADD COLUMN IF NOT EXISTS drip_step INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMPTZ DEFAULT NOW()
    `;

    // Check Master Switch
    let isActive = false;
    try {
        const activeSetting = await sql`SELECT setting_value FROM site_settings WHERE setting_key = 'campaign_hidden_ceiling_active'`;
        isActive = activeSetting.length > 0 && activeSetting[0].setting_value === 'true';
    } catch(e) {
        // Table doesn't exist or setting missing, default to false
    }

    if (!isActive) {
      return res.status(200).json({ skipped: true, reason: 'Campaign is currently paused in the Admin dashboard.' });
    }

    const templates = await sql`SELECT * FROM campaign_emails WHERE campaign_name = 'hidden-ceiling' ORDER BY step_number ASC`;
    if (!templates || templates.length === 0) return res.status(200).json({ skipped: true, reason: 'No templates set up yet.' });
    
    const templateMap = {};
    let maxStep = 0;
    for (const t of templates) {
      if (t.is_active === false) continue; // skip disabled steps
      templateMap[t.step_number] = t;
      if (t.step_number > maxStep) maxStep = t.step_number;
    }

    const eligibleSubscribers = await sql`
      SELECT id, name, email, drip_step, last_email_sent_at 
      FROM subscribers 
      WHERE result_center IS NOT NULL AND drip_step < ${maxStep}
    `;

    if (eligibleSubscribers.length === 0) return res.status(200).json({ processed: 0, reason: 'No eligible subscribers found.' });

    const resendKey = process.env.RESEND_API_KEY;
    if (!resendKey) throw new Error('Missing RESEND_API_KEY');
    const resend = new Resend(resendKey);

    let sentCount = 0;
    const nowMs = Date.now();
    for (const sub of eligibleSubscribers) {
      const nextStep = (sub.drip_step || 0) + 1;
      const template = templateMap[nextStep];
      if (!template) continue;

      const lastSentTime = sub.last_email_sent_at ? new Date(sub.last_email_sent_at).getTime() : nowMs;
      const thresholdTime = lastSentTime + (template.delay_days * 24 * 60 * 60 * 1000);

      if (nowMs >= thresholdTime) {
        try {
          const firstName = (sub.name || '').trim().split(' ')[0] || 'there';
          const personalizedBody = template.body_html.replace(/\{\{\s*firstName\s*\}\}/g, firstName);

          await resend.emails.send({
            from: 'John Paine | Your Journey Coach <hello@journeycoach.co>',
            to: sub.email,
            subject: template.subject,
            html: personalizedBody
          });

          await sql`
            UPDATE subscribers 
            SET drip_step = ${nextStep}, last_email_sent_at = NOW() 
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

export default async function handler(req, res) {
  try {
    // Route cron drip (Vercel Cron triggers via GET usually)
    if (req.query?.action === 'cron_drip' || req.headers['user-agent'] === 'vercel-cron/1.0') {
      return handleCronDrip(req, res);
    }
    // Only allow POST
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action, name, email, phone, interest, message, _honey, 'cf-turnstile-response': turnstileToken } = req.body;

    // Route subscribe action
    if (action === 'subscribe') return handleSubscribe(req, res);

    // Route hidden ceiling assessment
    if (action === 'hidden_ceiling') return handleHiddenCeiling(req, res);

    // Honeypot check — bots fill hidden fields; humans leave them blank
    if (_honey) {
      // Silently succeed so the bot thinks it worked
      return res.status(200).json({ ok: true });
    }

    // --- CLOUDFLARE TURNSTILE ---
    if (!turnstileToken) {
      // The token is missing entirely. Reject it.
      return res.status(400).json({ error: "CAPTCHA token missing." });
    }

    // Ask Cloudflare if the token is valid
    const verifyEndpoint = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
    const verifyResponse = await fetch(verifyEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${process.env.CLOUDFLARE_TURNSTILE_SECRET}&response=${turnstileToken}`,
    });

    const verifyData = await verifyResponse.json();

    if (!verifyData.success) {
      const codes = (verifyData['error-codes'] || []).join(', ') || 'none';
      return res.status(400).json({ error: `CAPTCHA verification failed. [${codes}]` });
    }

    // Basic validation
    if (!name || !email || !phone || !interest || !message) {
      return res.status(400).json({ error: 'Name, email, phone, area of interest, and message are required.' });
    }

    // Simple email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const limit = await enforceSubmissionRateLimit(req, 'contact', email, {
      maxPerHour: 6,
      maxPerDayPerEmail: 3,
    });
    if (!limit.allowed) {
      return res.status(429).json({ error: limit.error });
    }

    // Save to database — this is the source of truth; email is best-effort
    try {
      await sql`
        INSERT INTO contact_submissions (name, email, phone, interest, message)
        VALUES (${name}, ${email}, ${phone}, ${interest}, ${message})
      `;
    } catch (dbErr) {
      console.error('Failed to save submission to DB:', dbErr);
      return res.status(500).json({ error: 'Could not save your submission. Please try again.' });
    }

    // Attempt email notification — failure does NOT affect the 200 response
    try {
      const resendKey = process.env.RESEND_API_KEY;
      const toEmail = process.env.CONTACT_EMAIL;

      if (!resendKey || !toEmail) {
        console.error('Missing RESEND_API_KEY or CONTACT_EMAIL — skipping email notification.');
      } else {
        const html = `
          <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1a1d1e; background: #fff; padding: 32px; border-radius: 8px;">
            <h2 style="color: #c7a96b; margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 16px;">
              New Inquiry — Journey Coach
            </h2>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
              <tr>
                <td style="padding: 10px 0; font-weight: bold; width: 140px; vertical-align: top; color: #555;">Name</td>
                <td style="padding: 10px 0;">${escapeHtml(name)}</td>
              </tr>
              <tr style="background: #f9f9f9;">
                <td style="padding: 10px 0; font-weight: bold; vertical-align: top; color: #555;">Email</td>
                <td style="padding: 10px 0;"><a href="mailto:${escapeHtml(email)}" style="color: #c7a96b;">${escapeHtml(email)}</a></td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; vertical-align: top; color: #555;">Phone</td>
                <td style="padding: 10px 0;">${escapeHtml(phone)}</td>
              </tr>
              <tr style="background: #f9f9f9;">
                <td style="padding: 10px 0; font-weight: bold; vertical-align: top; color: #555;">Area of Interest</td>
                <td style="padding: 10px 0;">${escapeHtml(interest)}</td>
              </tr>
              <tr>
                <td style="padding: 10px 0; font-weight: bold; vertical-align: top; color: #555;">Message</td>
                <td style="padding: 10px 0; white-space: pre-wrap;">${escapeHtml(message)}</td>
              </tr>
            </table>
            <p style="color: #999; font-size: 0.85rem; margin-bottom: 0;">
              Sent via journeycoach.co contact form · ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET
            </p>
          </div>
        `;

        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: 'Journey Coach <hello@journeycoach.co>',
          to: toEmail,
          replyTo: email,
          subject: `New Inquiry from ${name}`,
          html,
        });
      }
    } catch (emailErr) {
      // Log but do not fail — submission is already saved to the database
      console.error('Email notification failed (submission was saved):', emailErr.message);
    }

    // Auto-reply to the submitter — best-effort, does not affect the 200 response
    try {
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        const replySettings = await sql`
          SELECT setting_key, setting_value FROM site_settings
          WHERE setting_key IN ('contact_reply_enabled','contact_reply_subject','contact_reply_body')
        `;
        const rs = Object.fromEntries(replySettings.map(r => [r.setting_key, r.setting_value]));

        if (rs.contact_reply_enabled === 'true' && rs.contact_reply_body) {
          const firstName = escapeHtml(name.split(' ')[0]);
          const subject = (rs.contact_reply_subject || 'Got your message, {{firstName}}').replace(/\{\{firstName\}\}/g, firstName);
          const html    = rs.contact_reply_body.replace(/\{\{firstName\}\}/g, firstName);

          const resend = new Resend(resendKey);
          await resend.emails.send({
            from: 'John Paine | Your Journey Coach <hello@journeycoach.co>',
            to: email,
            replyTo: 'hello@journeycoach.co',
            subject,
            html,
          });
        }
      }
    } catch (autoReplyErr) {
      console.error('Auto-reply failed (submission was saved):', autoReplyErr.message);
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Unexpected error in /api/contact:', err);
    return res.status(500).json({ error: 'Runtime API Error: ' + err.message });
  }
}

// Prevent XSS in email HTML
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildHiddenCeilingEmail(firstName, center, scores) {
  const esc = escapeHtml;
  const meta = {
    heart: {
      centerLabel: 'Heart Center',
      title: 'You lead like a Connection-Oriented Leader',
      summary: 'Your responses point to a leadership pattern that instinctively tracks people, morale, and the emotional temperature of the room.',
      description: 'You are often the person who can sense the undercurrent nobody else is naming. That makes you a stabilizing presence in culture, trust, and relationship repair.',
      blindspot: 'Under pressure, that same strength can turn into over-identifying with how others are feeling, over-functioning relationally, or softening hard decisions until the moment has passed.',
      nextSteps: [
        'Notice where harmony is becoming more important than clarity.',
        "Name the decision before you manage everyone's reaction to it.",
        'Use the guide to spot the situations where connection quietly turns into self-protection.',
      ],
      guideUrl: 'https://journeycoach.co/assets/downloads/hidden_ceiling_connection_oriented_leader.pdf',
      guideLabel: 'Download Your Guide: The Connection-Oriented Leader',
    },
    head: {
      centerLabel: 'Head Center',
      title: 'You lead like a Thinking-Oriented Leader',
      summary: 'Your responses point to a leadership pattern that instinctively searches for clarity, logic, and the cleanest explanation of what is happening.',
      description: 'You likely bring rigor, objectivity, and strong pattern recognition to complex systems. People rely on you to see risk, ask the smart question, and think around corners.',
      blindspot: 'Under pressure, that strength can become over-analysis, emotional distance, or a subtle dependence on certainty before moving. The room can feel managed by logic but not fully led through tension.',
      nextSteps: [
        'Watch for the moment information-gathering becomes a delay tactic.',
        'Pair your analysis with a visible relational read on the team.',
        'Use the guide to identify where objectivity is protecting you from discomfort rather than serving the decision.',
      ],
      guideUrl: 'https://journeycoach.co/assets/downloads/hidden_ceiling_thinking_oriented_leader.pdf',
      guideLabel: 'Download Your Guide: The Thinking-Oriented Leader',
    },
    action: {
      centerLabel: 'Gut Center',
      title: 'You lead from the Gut Center',
      summary: 'Your responses point to a leadership pattern that instinctively values movement, decisiveness, and the ability to convert energy into results.',
      description: 'You likely create traction quickly. People experience you as someone who can cut through noise, set direction, and keep a team from stalling out in uncertainty.',
      blindspot: 'Under pressure, that strength can harden into impatience, over-control, or the urge to move faster than the system around you can metabolize. Speed starts solving anxiety instead of solving the right problem.',
      nextSteps: [
        'Notice where urgency is outrunning reflection or buy-in.',
        'Slow down long enough to separate momentum from reactivity.',
        'Use the guide to spot where force and clarity are getting conflated inside your leadership.',
      ],
      guideUrl: 'https://journeycoach.co/assets/downloads/hidden_ceiling_action_oriented_leader.pdf',
      guideLabel: 'Download Your Guide: The Action-Oriented Leader',
    },
  };

  const m = meta[center] || meta.heart;
  const stepsHtml = m.nextSteps.map(s => `<li style="margin-bottom:0.5em;">${esc(s)}</li>`).join('');

  return `
<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1a1d1e;background:#fff;padding:40px 32px;border-radius:8px;line-height:1.7;">
  <p style="color:#888;font-size:0.8rem;letter-spacing:0.12em;text-transform:uppercase;margin-top:0;">Your Journey Coach</p>
  <p style="display:inline-block;background:#f5ead8;color:#c7a96b;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.3em 0.8em;border-radius:100px;font-family:Inter,sans-serif;margin-bottom:1rem;">${esc(m.centerLabel)}</p>
  <h1 style="font-family:Georgia,serif;font-size:1.5rem;color:#1a1d1e;margin-bottom:0.5em;line-height:1.3;">${esc(m.title)}</h1>
  <p>Hi ${esc(firstName)},</p>
  <p>${esc(m.summary)}</p>
  <hr style="border:none;border-top:1px solid #eee;margin:2rem 0;">
  <h2 style="font-size:1rem;color:#c7a96b;margin-bottom:0.25em;">What this says about you</h2>
  <p style="margin-top:0;">${esc(m.description)}</p>
  <h2 style="font-size:1rem;color:#c7a96b;margin-top:1.5rem;margin-bottom:0.25em;">Watch for this pattern</h2>
  <p style="margin-top:0;">${esc(m.blindspot)}</p>
  <h2 style="font-size:1rem;color:#c7a96b;margin-top:1.5rem;margin-bottom:0.25em;">Start here this week</h2>
  <ul style="margin-top:0;padding-left:1.25em;color:#333;">${stepsHtml}</ul>
  <hr style="border:none;border-top:1px solid #eee;margin:2rem 0;">
  <p style="color:#888;font-size:0.85rem;">Your scores &nbsp;—&nbsp; Heart: ${scores.heart} &nbsp;·&nbsp; Head: ${scores.head} &nbsp;·&nbsp; Action: ${scores.action}</p>
  <p style="margin-top:1.5rem;">
    <a href="${m.guideUrl}" style="display:inline-block;background:#c7a96b;color:#fff;text-decoration:none;padding:12px 28px;border-radius:4px;font-family:Inter,sans-serif;font-size:0.9rem;letter-spacing:0.04em;">${esc(m.guideLabel)} ↓</a>
  </p>
  <p>If you would like to explore what your results mean in the context of your specific situation, I would be glad to have a conversation.</p>
  <p style="margin-top:1rem;">
    <a href="https://calendly.com/johnpaine/hidden-ceiling-debrief" style="display:inline-block;background:transparent;color:#c7a96b;text-decoration:none;padding:12px 28px;border-radius:4px;border:1px solid #c7a96b;font-family:Inter,sans-serif;font-size:0.9rem;letter-spacing:0.04em;">Book an Alignment Call →</a>
  </p>
  <p style="margin-top:2.5rem;color:#555;">With respect,</p>
  <p style="margin:0;color:#1a1d1e;font-weight:bold;">John Paine</p>
  <p style="margin:0;color:#888;font-size:0.85rem;">ICF PCC &nbsp;·&nbsp; iEQ9 Accredited &nbsp;·&nbsp; iPEC Certified</p>
  <p style="margin:0.25em 0 0;color:#888;font-size:0.85rem;"><a href="https://journeycoach.co" style="color:#c7a96b;text-decoration:none;">journeycoach.co</a></p>
  <hr style="border:none;border-top:1px solid #eee;margin:2rem 0;">
  <p style="color:#bbb;font-size:0.75rem;margin:0;">You received this because you completed the Hidden Ceiling Assessment at journeycoach.co.</p>
</div>`;
}

function buildGuideEmail(firstName) {
  const esc = escapeHtml;
  return `
<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1a1d1e;background:#fff;padding:40px 32px;border-radius:8px;line-height:1.7;">
  <p style="color:#888;font-size:0.8rem;letter-spacing:0.12em;text-transform:uppercase;margin-top:0;">Your Journey Coach</p>
  <h1 style="font-family:Georgia,serif;font-size:1.6rem;color:#1a1d1e;margin-bottom:0.25em;line-height:1.3;">Understanding Your<br><em style="color:#c7a96b;">Hidden Ceiling</em></h1>
  <p>Hi ${esc(firstName)},</p>
  <p>Thank you for requesting the guide. Here's the core idea — and the five patterns I see most often in the leaders I work with.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:2rem 0;">
  <p>The concept is counterintuitive: <strong>the behaviors that got you to your current level are frequently the exact behaviors that will limit your next level.</strong></p>
  <p>A Hidden Ceiling isn't a skill gap or a knowledge gap. It's an identity gap — the distance between who you've learned to be as a professional, and who you'll need to become to lead with full impact.</p>
  <h2 style="font-size:1.1rem;color:#c7a96b;margin-top:2rem;margin-bottom:0.25em;">1. The Achiever's Ceiling</h2>
  <p style="margin-top:0;">You've built your identity around results — delivery, execution, getting things done. The ceiling appears when your organization needs vision and trust-building. You keep driving harder at a game that has quietly changed.</p>
  <h2 style="font-size:1.1rem;color:#c7a96b;margin-top:1.5rem;margin-bottom:0.25em;">2. The Expert's Ceiling</h2>
  <p style="margin-top:0;">You became senior because you knew more than others. Leadership now requires influencing people who know more than you in their own domains. Being the smartest person in the room is no longer the point.</p>
  <h2 style="font-size:1.1rem;color:#c7a96b;margin-top:1.5rem;margin-bottom:0.25em;">3. The Harmony Ceiling</h2>
  <p style="margin-top:0;">You've built real trust by keeping the peace and making people feel heard. The ceiling appears when hard decisions need to be made. Conflict avoidance has a cost that compounds quietly over time.</p>
  <h2 style="font-size:1.1rem;color:#c7a96b;margin-top:1.5rem;margin-bottom:0.25em;">4. The Control Ceiling</h2>
  <p style="margin-top:0;">You built your reputation through personal execution. True delegation — letting others own things that matter — feels like risk rather than leverage. The ceiling is reached when your span of responsibility exceeds what any one person can personally oversee.</p>
  <h2 style="font-size:1.1rem;color:#c7a96b;margin-top:1.5rem;margin-bottom:0.25em;">5. The Identity Ceiling</h2>
  <p style="margin-top:0;">Your sense of self is closely tied to your role and title. When the role changes or a major transition looms, you find yourself without a stable internal foundation. Success begins to feel fragile.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:2rem 0;">
  <p>Your assessment results point toward one of these patterns. Awareness is the first real step — you cannot shift a pattern you cannot see.</p>
  <p>If you'd like to explore what your results mean in the context of your specific situation, I'd be glad to have a conversation.</p>
  <p style="margin-top:2rem;">
    <a href="https://journeycoach.co/#contact" style="display:inline-block;background:#c7a96b;color:#fff;text-decoration:none;padding:12px 28px;border-radius:4px;font-family:Inter,sans-serif;font-size:0.9rem;letter-spacing:0.04em;">Start a Conversation →</a>
  </p>
  <p style="margin-top:2.5rem;color:#555;">With respect,</p>
  <p style="margin:0;color:#1a1d1e;font-weight:bold;">John Paine</p>
  <p style="margin:0;color:#888;font-size:0.85rem;">ICF PCC &nbsp;·&nbsp; iEQ9 Accredited &nbsp;·&nbsp; iPEC Certified</p>
  <p style="margin:0.25em 0 0;color:#888;font-size:0.85rem;"><a href="https://journeycoach.co" style="color:#c7a96b;text-decoration:none;">journeycoach.co</a></p>
  <hr style="border:none;border-top:1px solid #eee;margin:2rem 0;">
  <p style="color:#bbb;font-size:0.75rem;margin:0;">You received this because you requested the Hidden Ceiling guide at journeycoach.co. No further emails unless you reach out.</p>
</div>`;
}
