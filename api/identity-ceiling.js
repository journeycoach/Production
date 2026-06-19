import { sql } from './_db.js';
import { runMigrations } from './_migrate.js';
import crypto from 'crypto';
import { Resend } from 'resend';

// Helper: verify CAPTCHA
async function verifyCaptcha(token) {
  if (!token) return false;
  try {
    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${process.env.CLOUDFLARE_TURNSTILE_SECRET}&response=${encodeURIComponent(token)}`,
    });
    const data = await res.json();
    return data.success === true;
  } catch {
    return false;
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function determineResult(scores, tieBreaker) {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [first, second] = sorted;
  
  if (first[1] === second[1]) {
    // Tie, use tieBreaker
    if (tieBreaker && scores[tieBreaker] !== undefined) {
      return tieBreaker;
    }
  }
  return first[0];
}

export default async function handler(req, res) {
  try {
    await runMigrations();

    if (req.method === 'GET') {
      const configRows = await sql`SELECT setting_key, setting_value FROM identity_ceiling_config`;
      const config = {};
      for (const row of configRows) {
        config[row.setting_key] = row.setting_value;
      }
      return res.status(200).json(config);
    }

    if (req.method === 'POST') {
      const { name, email, answers, tieBreaker, 'cf-turnstile-response': turnstileToken } = req.body;
      
      const captchaOk = await verifyCaptcha(turnstileToken);
      if (!captchaOk) {
        return res.status(400).json({ error: 'CAPTCHA verification failed. Please try again.' });
      }

      if (!name?.trim()) return res.status(400).json({ error: 'Please enter your name.' });
      if (!email?.trim()) return res.status(400).json({ error: 'Please enter a valid email address.' });
      if (!answers || typeof answers !== 'object') return res.status(400).json({ error: 'Assessment answers are required.' });

      const configRows = await sql`SELECT setting_key, setting_value FROM identity_ceiling_config WHERE setting_key = 'questions'`;
      if (!configRows.length) return res.status(500).json({ error: 'Assessment configuration not found.' });

      const questions = configRows[0].setting_value;
      const scores = { achiever: 0, expert: 0, harmony: 0, control: 0, visionary: 0, rescuer: 0 };
      
      for (let i = 0; i < 10; i++) {
        const qId = `q${i + 1}`;
        const answerIdx = answers[qId];
        if (answerIdx !== undefined && answerIdx !== null) {
          const q = questions.find(q => q.id === qId);
          if (q && q.options[answerIdx]) {
            scores[q.options[answerIdx].ceiling]++;
          }
        }
      }

      let winningCeiling = determineResult(scores, tieBreaker);

      // Save to subscribers
      const normalizedEmail = normalizeEmail(email);
      await sql`
        INSERT INTO subscribers (
          email, name, source, result_center
        )
        VALUES (
          ${normalizedEmail}, ${name.trim()}, 'identity-ceiling', ${winningCeiling}
        )
        ON CONFLICT (email) DO UPDATE SET
          name = COALESCE(EXCLUDED.name, subscribers.name),
          source = EXCLUDED.source,
          result_center = EXCLUDED.result_center
      `;

      let emailSent = false;
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey) {
        try {
          const resend = new Resend(resendKey);
          await resend.emails.send({
            from: 'John Paine | Your Journey Coach <hello@journeycoach.co>',
            to: normalizedEmail,
            subject: 'Your Identity Ceiling Assessment Result',
            html: `<p>Hi ${escapeHtml(name.split(' ')[0])},</p><p>Your dominant leadership ceiling is: <strong>${winningCeiling}</strong>.</p>`
          });
          emailSent = true;
        } catch (e) {
          console.error('Email send failed:', e);
        }
      }

      // Fetch the result text
      const resultRow = await sql`SELECT setting_value FROM identity_ceiling_config WHERE setting_key = 'results'`;
      const resultsMap = resultRow.length ? resultRow[0].setting_value : {};
      const resultData = resultsMap[winningCeiling] || {};

      return res.status(200).json({ ok: true, center: winningCeiling, result: resultData, scores, emailSent });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Identity Ceiling API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
