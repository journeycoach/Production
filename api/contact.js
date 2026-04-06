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

export default async function handler(req, res) {
  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action, name, email, phone, interest, message, _honey, 'cf-turnstile-response': turnstileToken } = req.body;

    // Route subscribe action
    if (action === 'subscribe') return handleSubscribe(req, res);

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
