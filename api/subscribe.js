import { sql } from './_db.js';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email, name, source } = req.body || {};

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  // Create table if it doesn't exist
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS subscribers (
        id        SERIAL PRIMARY KEY,
        email     TEXT UNIQUE NOT NULL,
        name      TEXT,
        source    TEXT DEFAULT 'website',
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;
  } catch (err) {
    console.error('subscribe table init error:', err);
    return res.status(500).json({ error: 'Database error.' });
  }

  // Insert — silently ignore duplicate emails
  try {
    await sql`
      INSERT INTO subscribers (email, name, source)
      VALUES (${email.toLowerCase().trim()}, ${name?.trim() || null}, ${source || 'website'})
      ON CONFLICT (email) DO NOTHING
    `;
  } catch (err) {
    console.error('subscribe insert error:', err);
    return res.status(500).json({ error: 'Could not save your subscription.' });
  }

  // Send welcome email with the guide
  try {
    const smtpPassword = process.env.SMTP_PASSWORD;
    if (smtpPassword) {
      const firstName = (name || '').trim().split(' ')[0] || 'there';

      const transporter = nodemailer.createTransport({
        host: 'smtp.forwardemail.net',
        port: 465,
        secure: true,
        auth: { user: 'hello@journeycoach.co', pass: smtpPassword },
      });

      await transporter.sendMail({
        from: 'John Paine | Your Journey Coach <hello@journeycoach.co>',
        to: email,
        subject: 'Understanding Your Hidden Ceiling',
        html: `
<div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1a1d1e; background: #fff; padding: 40px 32px; border-radius: 8px; line-height: 1.7;">

  <p style="color: #888; font-size: 0.8rem; letter-spacing: 0.12em; text-transform: uppercase; margin-top: 0;">Your Journey Coach</p>

  <h1 style="font-family: Georgia, serif; font-size: 1.6rem; color: #1a1d1e; margin-bottom: 0.25em; line-height: 1.3;">Understanding Your<br><em style="color: #c7a96b;">Hidden Ceiling</em></h1>

  <p>Hi ${escapeHtml(firstName)},</p>

  <p>Thank you for taking the assessment. Here's the core idea — and the five patterns I see most often in the leaders I work with.</p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 2rem 0;">

  <p>The concept is counterintuitive: <strong>the behaviors that got you to your current level are frequently the exact behaviors that will limit your next level.</strong></p>

  <p>A Hidden Ceiling isn't a skill gap or a knowledge gap. It's an identity gap — the distance between who you've learned to be as a professional, and who you'll need to become to lead with full impact at the next level.</p>

  <p>Most executives hit it in one of five ways:</p>

  <h2 style="font-size: 1.1rem; color: #c7a96b; margin-top: 2rem; margin-bottom: 0.25em;">1. The Achiever's Ceiling</h2>
  <p style="margin-top: 0;">You've built your identity around results — delivery, execution, getting things done. The ceiling appears when your organization needs vision and trust-building, things that can't be measured the same way. You keep driving harder at a game that has quietly changed.</p>

  <h2 style="font-size: 1.1rem; color: #c7a96b; margin-top: 1.5rem; margin-bottom: 0.25em;">2. The Expert's Ceiling</h2>
  <p style="margin-top: 0;">You became senior because you knew more than others. Leadership now requires influencing people who know more than you in their own domains. Being the smartest person in the room is no longer the point — and that shift is deeply uncomfortable.</p>

  <h2 style="font-size: 1.1rem; color: #c7a96b; margin-top: 1.5rem; margin-bottom: 0.25em;">3. The Harmony Ceiling</h2>
  <p style="margin-top: 0;">You've built real trust by keeping the peace and making people feel heard. The ceiling appears when hard decisions need to be made — headcount, strategy pivots, difficult conversations. Conflict avoidance has a cost that compounds quietly over time.</p>

  <h2 style="font-size: 1.1rem; color: #c7a96b; margin-top: 1.5rem; margin-bottom: 0.25em;">4. The Control Ceiling</h2>
  <p style="margin-top: 0;">You built your reputation through personal execution. True delegation — letting others own things that matter to you — feels like risk rather than leverage. The ceiling is reached when your span of responsibility exceeds what any one person can personally oversee.</p>

  <h2 style="font-size: 1.1rem; color: #c7a96b; margin-top: 1.5rem; margin-bottom: 0.25em;">5. The Identity Ceiling</h2>
  <p style="margin-top: 0;">Your sense of self is closely tied to your role and title. When the role changes, a promotion arrives, or a major transition looms, you find yourself without a stable internal foundation. Success begins to feel fragile in ways you can't quite explain.</p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 2rem 0;">

  <h2 style="font-size: 1.1rem; color: #1a1d1e; margin-bottom: 0.25em;">What comes next</h2>
  <p style="margin-top: 0;">Your assessment results point toward one of these patterns. Awareness is the first real step — not because it changes behavior immediately, but because you cannot shift a pattern you cannot see.</p>

  <p>If you'd like to explore what your results mean in the context of your specific situation, I'd be glad to have a conversation. No agenda, no pitch — just a focused discussion about where you are and what might be possible.</p>

  <p style="margin-top: 2rem;">
    <a href="https://journeycoach.co/index.html#contact"
       style="display: inline-block; background: #c7a96b; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 4px; font-family: Inter, sans-serif; font-size: 0.9rem; letter-spacing: 0.04em;">
      Start a Conversation →
    </a>
  </p>

  <p style="margin-top: 2.5rem; color: #555;">With respect,</p>
  <p style="margin: 0; color: #1a1d1e; font-weight: bold;">John Paine</p>
  <p style="margin: 0; color: #888; font-size: 0.85rem;">ICF PCC &nbsp;·&nbsp; iEQ9 Accredited &nbsp;·&nbsp; iPEC Certified</p>
  <p style="margin: 0.25em 0 0; color: #888; font-size: 0.85rem;">
    <a href="https://journeycoach.co" style="color: #c7a96b; text-decoration: none;">journeycoach.co</a>
  </p>

  <hr style="border: none; border-top: 1px solid #eee; margin: 2rem 0;">
  <p style="color: #bbb; font-size: 0.75rem; margin: 0;">You received this because you requested the Hidden Ceiling guide at journeycoach.co. No further emails unless you reach out.</p>
</div>
        `,
      });
    }
  } catch (emailErr) {
    console.error('Welcome email failed (subscription was saved):', emailErr.message);
  }

  return res.status(200).json({ ok: true });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
