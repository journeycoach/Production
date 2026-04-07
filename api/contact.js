import { sql } from './_db.js';
import nodemailer from 'nodemailer';

async function handleSubscribe(req, res) {
  const { email, name, source } = req.body || {};
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
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
    const smtpPassword = process.env.SMTP_PASSWORD;
    if (smtpPassword) {
      const firstName = (name || '').trim().split(' ')[0] || 'there';
      const transporter = nodemailer.createTransport({
        host: 'smtp.forwardemail.net', port: 465, secure: true,
        auth: { user: 'hello@journeycoach.co', pass: smtpPassword },
      });
      await transporter.sendMail({
        from: 'John Paine | Your Journey Coach <hello@journeycoach.co>',
        to: email,
        subject: 'Understanding Your Hidden Ceiling',
        html: buildGuideEmail(firstName),
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

  // Save to subscribers (best-effort)
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
      VALUES (${email.toLowerCase().trim()}, ${name.trim() || null}, ${source || 'hidden-ceiling'})
      ON CONFLICT (email) DO NOTHING
    `;
  } catch (dbErr) {
    console.error('hidden ceiling subscriber save error:', dbErr);
  }

  // Send personalised result email (best-effort)
  let emailSent = false;
  try {
    const smtpPassword = process.env.SMTP_PASSWORD;
    if (smtpPassword) {
      const firstName = name.trim().split(' ')[0] || 'there';
      const transporter = nodemailer.createTransport({
        host: 'smtp.forwardemail.net', port: 465, secure: true,
        auth: { user: 'hello@journeycoach.co', pass: smtpPassword },
      });
      await transporter.sendMail({
        from: 'John Paine | Your Journey Coach <hello@journeycoach.co>',
        to: email,
        subject: 'Your Hidden Ceiling Assessment Result',
        html: buildHiddenCeilingEmail(firstName, center, scores),
      });
      emailSent = true;
    }
  } catch (emailErr) {
    console.error('Hidden ceiling email failed:', emailErr.message);
  }

  return res.status(200).json({ ok: true, result, scores, emailSent });
}

export default async function handler(req, res) {
  try {
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
      // Cloudflare says the token is fake or expired. Reject it.
      return res.status(400).json({ error: "CAPTCHA verification failed." });
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
      const smtpPassword = process.env.SMTP_PASSWORD;
      const toEmail = process.env.CONTACT_EMAIL;

      if (!smtpPassword || !toEmail) {
        console.error('Missing SMTP_PASSWORD or CONTACT_EMAIL — skipping email notification.');
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

        const transporter = nodemailer.createTransport({
          host: 'smtp.forwardemail.net',
          port: 465,
          secure: true,
          auth: { user: 'hello@journeycoach.co', pass: smtpPassword },
        });

        await transporter.sendMail({
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
    <a href="https://journeycoach.co/index.html#contact" style="display:inline-block;background:transparent;color:#c7a96b;text-decoration:none;padding:12px 28px;border-radius:4px;border:1px solid #c7a96b;font-family:Inter,sans-serif;font-size:0.9rem;letter-spacing:0.04em;">Book an Alignment Call →</a>
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
    <a href="https://journeycoach.co/index.html#contact" style="display:inline-block;background:#c7a96b;color:#fff;text-decoration:none;padding:12px 28px;border-radius:4px;font-family:Inter,sans-serif;font-size:0.9rem;letter-spacing:0.04em;">Start a Conversation →</a>
  </p>
  <p style="margin-top:2.5rem;color:#555;">With respect,</p>
  <p style="margin:0;color:#1a1d1e;font-weight:bold;">John Paine</p>
  <p style="margin:0;color:#888;font-size:0.85rem;">ICF PCC &nbsp;·&nbsp; iEQ9 Accredited &nbsp;·&nbsp; iPEC Certified</p>
  <p style="margin:0.25em 0 0;color:#888;font-size:0.85rem;"><a href="https://journeycoach.co" style="color:#c7a96b;text-decoration:none;">journeycoach.co</a></p>
  <hr style="border:none;border-top:1px solid #eee;margin:2rem 0;">
  <p style="color:#bbb;font-size:0.75rem;margin:0;">You received this because you requested the Hidden Ceiling guide at journeycoach.co. No further emails unless you reach out.</p>
</div>`;
}
