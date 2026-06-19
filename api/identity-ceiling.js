import { sql } from './_db.js';
import { runMigrations } from './_migrate.js';
import { Resend } from 'resend';

// Helper: verify Cloudflare Turnstile CAPTCHA
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

// Determine winning ceiling, using tie-breaker ceiling key if provided
function determineResult(scores, tieBreakerCeiling) {
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const [first, second] = sorted;

  if (second && first[1] === second[1]) {
    const tiedCeilings = sorted
      .filter(([, score]) => score === first[1])
      .map(([ceiling]) => ceiling);

    // There is a tie — use the tie-breaker only if it resolves one of the tied ceilings.
    if (tieBreakerCeiling && tiedCeilings.includes(tieBreakerCeiling)) {
      return tieBreakerCeiling;
    }
    // No tie-breaker provided — still return the first-sorted (alphabetically stable)
  }
  return first[0];
}

// Build a rich HTML email using the actual profile content
function buildResultEmail(name, profile, winningCeiling) {
  const esc = escapeHtml;
  const firstName = esc((name || '').split(' ')[0] || 'there');
  const stepsHtml = Array.isArray(profile.steps)
    ? profile.steps.map((s, i) => `
        <tr>
          <td style="padding-right:12px;vertical-align:top;color:#c7a96b;font-weight:bold;white-space:nowrap;">${i + 1}.</td>
          <td style="color:#333;padding-bottom:0.75em;">${esc(s)}</td>
        </tr>`).join('')
    : '';

  return `
<div style="font-family:Georgia,serif;max-width:600px;margin:0 auto;color:#1a1d1e;background:#fff;padding:40px 32px;border-radius:8px;line-height:1.7;">
  <p style="color:#888;font-size:0.8rem;letter-spacing:0.12em;text-transform:uppercase;margin-top:0;">Your Journey Coach</p>
  <p style="display:inline-block;background:#f5ead8;color:#c7a96b;font-size:0.75rem;letter-spacing:0.1em;text-transform:uppercase;padding:0.3em 0.8em;border-radius:100px;font-family:Inter,sans-serif;margin-bottom:1rem;">${esc(profile.label || winningCeiling)}</p>
  <h1 style="font-family:Georgia,serif;font-size:1.6rem;color:#1a1d1e;margin-bottom:0.25em;line-height:1.3;">Your Identity Hidden Ceiling</h1>
  <p>Hi ${firstName},</p>
  <p>Thank you for completing the Identity Hidden Ceiling assessment. Here is what your responses reveal about the pattern that may be quietly limiting your next level of leadership.</p>
  <hr style="border:none;border-top:1px solid #eee;margin:2rem 0;">
  <h2 style="font-size:1rem;color:#c7a96b;margin-bottom:0.25em;">The Diagnosis</h2>
  <p style="margin-top:0;">${esc(profile.diagnosis)}</p>
  <h2 style="font-size:1rem;color:#c7a96b;margin-top:1.5rem;margin-bottom:0.25em;">The Ceiling</h2>
  <p style="margin-top:0;">${esc(profile.ceiling)}</p>
  <h2 style="font-size:1rem;color:#c7a96b;margin-top:1.5rem;margin-bottom:0.25em;">Your Core Pattern</h2>
  <p style="margin-top:0;font-style:italic;color:#555;">"${esc(profile.pattern)}"</p>
  <h2 style="font-size:1rem;color:#c7a96b;margin-top:1.5rem;margin-bottom:0.25em;">The Cost</h2>
  <p style="margin-top:0;">${esc(profile.cost)}</p>
  <h2 style="font-size:1rem;color:#c7a96b;margin-top:1.5rem;margin-bottom:0.25em;">The Shift</h2>
  <p style="margin-top:0;">${esc(profile.shift)}</p>
  <h2 style="font-size:1rem;color:#c7a96b;margin-top:1.5rem;margin-bottom:0.25em;">Your Development Guide</h2>
  <table style="width:100%;border-collapse:collapse;margin-top:0.5rem;">${stepsHtml}</table>
  <hr style="border:none;border-top:1px solid #eee;margin:2rem 0;">
  <p>If you would like to explore what your results mean for your specific situation, I would be glad to have a conversation.</p>
  <p style="margin-top:1.5rem;">
    <a href="${process.env.CALENDLY_URL || 'https://journeycoach.co/contact.html'}" style="display:inline-block;background:#c7a96b;color:#fff;text-decoration:none;padding:12px 28px;border-radius:4px;font-family:Inter,sans-serif;font-size:0.9rem;letter-spacing:0.04em;">Schedule an Alignment Call →</a>
  </p>
  <p style="margin-top:2.5rem;color:#555;">With respect,</p>
  <p style="margin:0;color:#1a1d1e;font-weight:bold;">John Paine</p>
  <p style="margin:0;color:#888;font-size:0.85rem;">ICF PCC &nbsp;·&nbsp; iEQ9 Accredited &nbsp;·&nbsp; iPEC Certified</p>
  <p style="margin:0.25em 0 0;color:#888;font-size:0.85rem;"><a href="https://journeycoach.co" style="color:#c7a96b;text-decoration:none;">journeycoach.co</a></p>
  <hr style="border:none;border-top:1px solid #eee;margin:2rem 0;">
  <p style="color:#bbb;font-size:0.75rem;margin:0;">You received this because you completed the Identity Hidden Ceiling Assessment at journeycoach.co.</p>
</div>`;
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
      const { name, email, answers, 'cf-turnstile-response': turnstileToken } = req.body;

      // CAPTCHA
      const captchaOk = await verifyCaptcha(turnstileToken);
      if (!captchaOk) {
        return res.status(400).json({ error: 'CAPTCHA verification failed. Please try again.' });
      }

      // Input validation
      if (!name?.trim()) return res.status(400).json({ error: 'Please enter your name.' });
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email?.trim() || !emailRegex.test(email.trim())) {
        return res.status(400).json({ error: 'Please enter a valid email address.' });
      }
      if (!answers || typeof answers !== 'object') {
        return res.status(400).json({ error: 'Assessment answers are required.' });
      }

      // Rate limiting: max 5 submissions per email per hour
      const normalizedEmail = normalizeEmail(email);
      try {
        const recent = await sql`
          SELECT COUNT(*) as count FROM subscribers
          WHERE email = ${normalizedEmail}
            AND source = 'identity-ceiling'
            AND created_at > NOW() - INTERVAL '1 hour'
        `;
        if (parseInt(recent[0]?.count || 0, 10) >= 5) {
          return res.status(429).json({ error: 'Too many submissions. Please try again later.' });
        }
      } catch (e) {
        // Non-blocking — table may not have created_at for existing rows
      }

      // Load question config
      const configRows = await sql`SELECT setting_key, setting_value FROM identity_ceiling_config WHERE setting_key = 'questions'`;
      if (!configRows.length) return res.status(500).json({ error: 'Assessment configuration not found.' });

      const questions = configRows[0].setting_value;
      const scores = { achiever: 0, expert: 0, harmony: 0, control: 0, visionary: 0, rescuer: 0 };

      // Score main 10 questions (q1–q10)
      for (let i = 1; i <= 10; i++) {
        const qId = `q${i}`;
        const answerIdx = answers[qId];
        if (answerIdx !== undefined && answerIdx !== null) {
          const q = questions.find(q => q.id === qId);
          if (q && q.options[answerIdx]) {
            const ceiling = q.options[answerIdx].ceiling;
            if (ceiling && scores[ceiling] !== undefined) scores[ceiling]++;
          }
        }
      }

      // Resolve tie-breaker: look up the ceiling from the tie-breaker question in DB
      // (the seeded ID uses a hyphen, frontend stores answer under 'tie_breaker' key)
      let tieBreakerCeiling = null;
      const tbAnswerIdx = answers['tie_breaker'];
      if (tbAnswerIdx !== undefined && tbAnswerIdx !== null) {
        const tbQ = questions.find(q => q.id === 'tie-breaker' || q.id === 'tie_breaker');
        if (tbQ && tbQ.options[tbAnswerIdx]) {
          tieBreakerCeiling = tbQ.options[tbAnswerIdx].ceiling;
        }
      }

      const winningCeiling = determineResult(scores, tieBreakerCeiling);

      // Persist lead in subscribers table
      await sql`
        INSERT INTO subscribers (email, name, source, result_center)
        VALUES (${normalizedEmail}, ${name.trim()}, 'identity-ceiling', ${winningCeiling})
        ON CONFLICT (email) DO UPDATE SET
          name         = COALESCE(EXCLUDED.name, subscribers.name),
          source       = EXCLUDED.source,
          result_center = EXCLUDED.result_center
      `;

      // Fetch the full result profile from DB
      const resultRow = await sql`SELECT setting_value FROM identity_ceiling_config WHERE setting_key = 'results'`;
      const resultsMap = resultRow.length ? resultRow[0].setting_value : {};
      const resultData = resultsMap[winningCeiling] || {};

      // Send rich result email
      let emailSent = false;
      const resendKey = process.env.RESEND_API_KEY;
      if (resendKey && resultData.diagnosis) {
        try {
          const resend = new Resend(resendKey);
          await resend.emails.send({
            from: 'John Paine | Your Journey Coach <hello@journeycoach.co>',
            to: normalizedEmail,
            subject: `Your Identity Hidden Ceiling: ${resultData.label || winningCeiling}`,
            html: buildResultEmail(name.trim(), resultData, winningCeiling),
          });
          emailSent = true;
        } catch (e) {
          console.error('Identity Ceiling email send failed:', e);
        }
      }

      // Return center key + full profile so frontend can render without a second fetch
      return res.status(200).json({
        ok: true,
        center: winningCeiling,
        result: resultData,
        scores,
        emailSent,
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Identity Ceiling API Error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
