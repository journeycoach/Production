import crypto from 'crypto';
import { sql } from './_db.js';
import { Resend } from 'resend';
import { Webhook } from 'svix';
import { runMigrations } from './_migrate.js';

const RATE_LIMIT_SALT = process.env.RATE_LIMIT_SALT || process.env.ADMIN_JWT_SECRET;
const UNSUBSCRIBE_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const BLENDED_HEAD_HEART_GUIDE_URL = 'https://ygqljhwrzlmxcysm.public.blob.vercel-storage.com/hidden_ceiling_blended_head_heart_leader-2brzSPbUNrrU6V1du7rVfPcH2uTLsc.pdf';
const BLENDED_HEAD_ACTION_GUIDE_URL = 'https://ygqljhwrzlmxcysm.public.blob.vercel-storage.com/hidden_ceiling_blended_head_action_leader-WI9P4x8V9zcuI4gjloEP3MtgsLUbGi.pdf';
const BLENDED_HEART_ACTION_GUIDE_URL = 'https://ygqljhwrzlmxcysm.public.blob.vercel-storage.com/hidden_ceiling_blended_heart_action_leader-9BI5nB03jV1HMPNpRcZ5tko5HtP90O.pdf';
const RESULT_CENTER_KEYS = ['head', 'heart', 'action', 'head_heart', 'head_action', 'heart_action'];

// Verify a Cloudflare Turnstile token. Returns true if valid, false otherwise.
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

// Helper: fetch email settings from database
async function getEmailSettings(keys) {
  try {
    const settings = await sql`
      SELECT setting_key, setting_value FROM site_settings
      WHERE setting_key = ANY(${keys})
    `;
    return Object.fromEntries(settings.map(r => [r.setting_key, r.setting_value]));
  } catch (err) {
    console.error('Error fetching email settings:', err);
    return {};
  }
}

const DEFAULT_ASSESSMENT_FORM = {
  intro: {
    eyebrow: 'Start Here',
    title: 'Tell me where to send your guide',
    copy: 'You will see your result immediately on the page, and I will also email the matching Hidden Ceiling guide so you can revisit it later.',
  },
  questions: [
    {
      id: 'q1',
      eyebrow: 'Question 1 of 7',
      title: 'When a high-stakes initiative suddenly goes off track, what is your first internal reaction?',
      options: [
        { text: 'I pull back to analyze the data and find where the logic failed.', center: 'head' },
        { text: 'I move quickly to take charge and get things back on track.', center: 'action' },
        { text: 'I worry about how this failure reflects on the team and how others will respond.', center: 'heart' },
      ],
    },
    {
      id: 'q2',
      eyebrow: 'Question 2 of 7',
      title: 'Under pressure, what do others most often need more of from you?',
      options: [
        { text: 'Move forward with less over-analysis and trust your judgment sooner.', center: 'head' },
        { text: 'Be more direct about priorities instead of managing everyone\'s feelings first.', center: 'heart' },
        { text: 'Slow down long enough to consider how decisions are affecting people.', center: 'action' },
      ],
    },
    {
      id: 'q3',
      eyebrow: 'Question 3 of 7',
      title: 'In high-level leadership conversations, where do you naturally contribute most?',
      options: [
        { text: 'Systems, long-term implications, and what risks others may be missing.', center: 'head' },
        { text: 'How people will experience the decision and what it will mean relationally.', center: 'heart' },
        { text: 'What needs to happen next, who owns it, and how to keep momentum.', center: 'action' },
      ],
    },
    {
      id: 'q4',
      eyebrow: 'Question 4 of 7',
      title: 'When a peer gives you hard feedback, what is your first instinct?',
      options: [
        { text: 'Wonder what it means about the relationship or how you are being perceived.', center: 'heart' },
        { text: 'Step back and assess whether the feedback is accurate and logically sound.', center: 'head' },
        { text: 'Push back immediately if the feedback feels unfair or unsupported.', center: 'action' },
      ],
    },
    {
      id: 'q5',
      eyebrow: 'Question 5 of 7',
      title: 'In leadership meetings, what kind of contribution do you instinctively value most?',
      options: [
        { text: 'Clear thinking, objectivity, and well-reasoned ideas.', center: 'head' },
        { text: 'Awareness of people, tone, and how decisions affect the room.', center: 'heart' },
        { text: 'Directness, conviction, and the ability to move toward action.', center: 'action' },
      ],
    },
    {
      id: 'q6',
      eyebrow: 'Question 6 of 7',
      title: 'When faced with a dense set of details, metrics, or analysis, what is your natural response?',
      options: [
        { text: 'I can do it, but I\'d rather focus on the people and context behind the numbers.', center: 'heart' },
        { text: 'I enjoy it when it helps me understand patterns, structure, and what is really going on.', center: 'head' },
        { text: 'I lose patience if it slows decisions down or gets in the way of moving forward.', center: 'action' },
      ],
    },
    {
      id: 'q7',
      eyebrow: 'Question 7 of 7',
      title: 'When the pressure is high, what most naturally guides your leadership decisions?',
      options: [
        { text: 'Connection: staying aligned with people, meaning, and shared purpose.', center: 'heart' },
        { text: 'Truth: understanding what is accurate, objective, and really happening.', center: 'head' },
        { text: 'Integrity in action: moving with conviction, clarity, and grounded instinct.', center: 'action' },
      ],
    },
  ],
};

function sanitizeAssessmentFormConfig(config) {
  const incoming = config && typeof config === 'object' ? config : {};
  const defaultQuestions = DEFAULT_ASSESSMENT_FORM.questions;
  const incomingQuestions = Array.isArray(incoming.questions) ? incoming.questions : [];

  return {
    intro: {
      eyebrow: cleanText(incoming.intro?.eyebrow || DEFAULT_ASSESSMENT_FORM.intro.eyebrow, 80),
      title: cleanText(incoming.intro?.title || DEFAULT_ASSESSMENT_FORM.intro.title, 180),
      copy: cleanText(incoming.intro?.copy || DEFAULT_ASSESSMENT_FORM.intro.copy, 600),
    },
    questions: defaultQuestions.map((fallback, index) => {
      const question = incomingQuestions[index] && typeof incomingQuestions[index] === 'object'
        ? incomingQuestions[index]
        : {};
      const incomingOptions = Array.isArray(question.options) ? question.options : [];
      return {
        id: fallback.id,
        eyebrow: cleanText(question.eyebrow || fallback.eyebrow, 80),
        title: cleanText(question.title || fallback.title, 400),
        options: fallback.options.map((fallbackOption, optionIndex) => {
          const option = incomingOptions[optionIndex] && typeof incomingOptions[optionIndex] === 'object'
            ? incomingOptions[optionIndex]
            : {};
          const center = ['heart', 'head', 'action'].includes(option.center) ? option.center : fallbackOption.center;
          return {
            text: cleanText(option.text || fallbackOption.text, 500),
            center,
          };
        }),
      };
    }),
  };
}

async function getAssessmentFormConfig() {
  try {
    const settings = await getEmailSettings(['assessment_form_config']);
    if (!settings.assessment_form_config) return DEFAULT_ASSESSMENT_FORM;
    return sanitizeAssessmentFormConfig(JSON.parse(settings.assessment_form_config));
  } catch (err) {
    console.error('assessment config error:', err);
    return DEFAULT_ASSESSMENT_FORM;
  }
}

// Helper: replace {{placeholder}} with value
function interpolateEmail(template, placeholder, value) {
  return template.replace(new RegExp(`\\{\\{${placeholder}\\}\\}`, 'g'), value);
}

function unsubscribeSignature(subscriberId, expires) {
  return crypto.createHmac('sha256', process.env.ADMIN_JWT_SECRET).update(`${subscriberId}.${expires}`).digest('hex');
}

// Helper: generate a signed unsubscribe token for a subscriber ID
function unsubscribeToken(subscriberId) {
  const expires = Date.now() + UNSUBSCRIBE_TOKEN_TTL_MS;
  return `${expires}.${unsubscribeSignature(subscriberId, expires)}`;
}

function isValidUnsubscribeToken(subscriberId, token) {
  const value = String(token || '');
  const [expiresRaw, sig] = value.split('.');

  if (expiresRaw && sig) {
    try {
      const expires = parseInt(expiresRaw, 10);
      if (Number.isFinite(expires) && Date.now() <= expires) {
        const expected = unsubscribeSignature(subscriberId, expires);
        const a = Buffer.from(sig.slice(0, 64).padEnd(64, '0'), 'hex');
        const b = Buffer.from(expected, 'hex');
        if (sig.length === expected.length && crypto.timingSafeEqual(a, b)) {
          return true;
        }
      }
    } catch {
      // Fall back to the legacy token format below.
    }
  }

  try {
    const legacy = crypto.createHmac('sha256', process.env.ADMIN_JWT_SECRET).update(String(subscriberId)).digest('hex');
    const a = Buffer.from(value.slice(0, 64).padEnd(64, '0'), 'hex');
    const b = Buffer.from(legacy, 'hex');
    return value.length === legacy.length && crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

function determineAssessmentCenter(scores) {
  if (scores.head === scores.heart && scores.head > scores.action) return 'head_heart';
  if (scores.head === scores.action && scores.head > scores.heart) return 'head_action';
  if (scores.heart === scores.action && scores.heart > scores.head) return 'heart_action';
  return Object.entries(scores).sort((a, b) => b[1] - a[1])[0][0];
}

// Helper: append unsubscribe footer to drip email HTML
function withUnsubscribeFooter(html, subscriberId) {
  const token = unsubscribeToken(subscriberId);
  const url = `https://journeycoach.co/api/contact?action=unsubscribe&id=${subscriberId}&token=${token}`;
  const footer = `
<div style="text-align:center;padding:24px 0 0;margin-top:24px;border-top:1px solid #eee;">
  <p style="color:#bbb;font-size:0.75rem;margin:0;line-height:1.8;">
    You're receiving this because you completed the Hidden Ceiling Assessment at journeycoach.co.<br>
    <a href="${url}" style="color:#bbb;text-decoration:underline;">Unsubscribe</a>
  </p>
</div>`;
  return html + footer;
}

function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

function cleanText(value, maxLength = 500) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeAttribution(value = {}) {
  const attr = value && typeof value === 'object' ? value : {};
  const firstTouch = attr.first_touch && typeof attr.first_touch === 'object' ? attr.first_touch : {};
  const session = attr.session && typeof attr.session === 'object' ? attr.session : {};
  const source = cleanText(attr.source || session.source || firstTouch.source || 'direct', 120).toLowerCase() || 'direct';

  return {
    source,
    firstSource: cleanText(attr.first_source || firstTouch.source || source, 120).toLowerCase() || source,
    landingPage: cleanText(attr.landing_page || firstTouch.landing_page || session.landing_page, 1000),
    referrer: cleanText(attr.referrer || firstTouch.referrer || session.referrer, 1000),
    utmSource: cleanText(attr.utm_source || session.source || firstTouch.source, 120).toLowerCase(),
    utmMedium: cleanText(attr.utm_medium || session.medium || firstTouch.medium, 120),
    utmCampaign: cleanText(attr.utm_campaign || session.campaign || firstTouch.campaign, 200),
    utmTerm: cleanText(attr.utm_term || session.term || firstTouch.term, 200),
    utmContent: cleanText(attr.utm_content || session.content || firstTouch.content, 200),
    raw: attr
  };
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

async function enforceSubmissionRateLimit(req, action, email, { maxPerHour = 8, maxPerDayPerEmail = 3 } = {}) {
  try {
    const limitDisabled = await sql`SELECT setting_value FROM site_settings WHERE setting_key = 'rate_limit_disabled'`;
    if (limitDisabled[0]?.setting_value === 'true') return { allowed: true };

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
  const { email, name, source, attribution, 'cf-turnstile-response': turnstileToken } = req.body || {};
  const attr = normalizeAttribution(attribution);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ error: 'A valid email address is required.' });
  }

  const captchaOk = await verifyCaptcha(turnstileToken);
  if (!captchaOk) {
    return res.status(400).json({ error: 'CAPTCHA verification failed. Please try again.' });
  }

  const limit = await enforceSubmissionRateLimit(req, 'subscribe', email, {
    maxPerHour: 6,
    maxPerDayPerEmail: 2,
  });
  if (!limit.allowed) {
    return res.status(429).json({ error: limit.error });
  }

  try {
    await runMigrations();
    await sql`
      INSERT INTO subscribers (
        email, name, source, attribution_source, first_attribution_source,
        landing_page, referrer, utm_source, utm_medium, utm_campaign, utm_term, utm_content, attribution
      )
      VALUES (
        ${email.toLowerCase().trim()}, ${name?.trim() || null}, ${source || 'website'},
        ${attr.source}, ${attr.firstSource}, ${attr.landingPage}, ${attr.referrer},
        ${attr.utmSource}, ${attr.utmMedium}, ${attr.utmCampaign}, ${attr.utmTerm}, ${attr.utmContent},
        ${JSON.stringify(attr.raw)}::jsonb
      )
      ON CONFLICT (email) DO UPDATE SET
        name = COALESCE(EXCLUDED.name, subscribers.name),
        source = COALESCE(EXCLUDED.source, subscribers.source),
        attribution_source = COALESCE(EXCLUDED.attribution_source, subscribers.attribution_source),
        first_attribution_source = COALESCE(subscribers.first_attribution_source, EXCLUDED.first_attribution_source),
        landing_page = COALESCE(subscribers.landing_page, EXCLUDED.landing_page),
        referrer = COALESCE(subscribers.referrer, EXCLUDED.referrer),
        utm_source = COALESCE(EXCLUDED.utm_source, subscribers.utm_source),
        utm_medium = COALESCE(EXCLUDED.utm_medium, subscribers.utm_medium),
        utm_campaign = COALESCE(EXCLUDED.utm_campaign, subscribers.utm_campaign),
        utm_term = COALESCE(EXCLUDED.utm_term, subscribers.utm_term),
        utm_content = COALESCE(EXCLUDED.utm_content, subscribers.utm_content),
        attribution = COALESCE(EXCLUDED.attribution, subscribers.attribution)
    `;
  } catch (err) {
    console.error('subscribe insert error:', err);
    return res.status(500).json({ error: 'Could not save your subscription.' });
  }
  try {
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      const firstName = escapeHtml((name || '').trim().split(' ')[0] || 'there');
      const gs = await getEmailSettings(['guide_email_subject', 'guide_email_body']);
      const subject = interpolateEmail(gs.guide_email_subject || 'Understanding Your Hidden Ceiling', 'firstName', firstName);
      const html = gs.guide_email_body
        ? interpolateEmail(gs.guide_email_body, 'firstName', firstName)
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
  const { name, email, company, source, answers, attribution, preview, 'cf-turnstile-response': turnstileToken } = req.body || {};
  const attr = normalizeAttribution(attribution);

  if (preview && RESULT_CENTER_KEYS.includes(preview)) {
      const center = preview;
      const result = { center };
      const scores = { heart: 0, head: 0, action: 0 };
      
      const resultFields = ['label', 'title', 'summary', 'description', 'blindspot', 'step1', 'step2', 'step3'];
      const rcKeys = resultFields.map(f => `hc_result_${center}_${f}`);
      const rcRaw  = await getEmailSettings(rcKeys);
      const resultContent = {
        centerLabel: rcRaw[`hc_result_${center}_label`]       || null,
        title:       rcRaw[`hc_result_${center}_title`]        || null,
        summary:     rcRaw[`hc_result_${center}_summary`]      || null,
        description: rcRaw[`hc_result_${center}_description`]  || null,
        blindspot:   rcRaw[`hc_result_${center}_blindspot`]    || null,
        nextSteps:   [
          rcRaw[`hc_result_${center}_step1`] || null,
          rcRaw[`hc_result_${center}_step2`] || null,
          rcRaw[`hc_result_${center}_step3`] || null,
        ].filter(Boolean),
      };
      const hasResultOverride = Object.values(rcRaw).some(v => v);
      return res.status(200).json({ ok: true, result, scores, emailSent: true, calendly_url: process.env.CALENDLY_URL || null, result_content: hasResultOverride ? resultContent : null });
  }

  // Honeypot — bots fill the company field
  if (company) {
    return res.status(200).json({ ok: true, result: { center: 'heart' }, scores: { heart: 0, head: 0, action: 0 }, emailSent: false });
  }

  const captchaOk = await verifyCaptcha(turnstileToken);
  if (!captchaOk) {
    return res.status(400).json({ error: 'CAPTCHA verification failed. Please try again.' });
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

  const assessmentForm = await getAssessmentFormConfig();
  const scoreMap = Object.fromEntries(
    assessmentForm.questions.map(question => [
      question.id,
      question.options.map(option => option.center),
    ])
  );

  const scores = { heart: 0, head: 0, action: 0 };
  for (const [qId, centers] of Object.entries(scoreMap)) {
    const idx = answers[qId];
    if (idx !== null && idx !== undefined && centers[idx]) {
      scores[centers[idx]]++;
    }
  }

  const center = determineAssessmentCenter(scores);
  const result = { center };

  // Save to subscribers with assessment result (best-effort)
  try {
    await runMigrations();
    await sql`
      INSERT INTO subscribers (
        email, name, source, result_center, score_heart, score_head, score_action,
        attribution_source, first_attribution_source, landing_page, referrer,
        utm_source, utm_medium, utm_campaign, utm_term, utm_content, attribution
      )
      VALUES (
        ${email.toLowerCase().trim()}, ${name.trim() || null}, ${source || 'hidden-ceiling'},
        ${center}, ${scores.heart}, ${scores.head}, ${scores.action},
        ${attr.source}, ${attr.firstSource}, ${attr.landingPage}, ${attr.referrer},
        ${attr.utmSource}, ${attr.utmMedium}, ${attr.utmCampaign}, ${attr.utmTerm}, ${attr.utmContent},
        ${JSON.stringify(attr.raw)}::jsonb
      )
      ON CONFLICT (email) DO UPDATE SET
        source_history = CASE
          WHEN subscribers.source IS DISTINCT FROM EXCLUDED.source
          THEN COALESCE(subscribers.source_history, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('source', subscribers.source, 'at', NOW()))
          ELSE COALESCE(subscribers.source_history, '[]'::jsonb)
        END,
        name          = COALESCE(EXCLUDED.name, subscribers.name),
        source        = EXCLUDED.source,
        result_center = EXCLUDED.result_center,
        score_heart   = EXCLUDED.score_heart,
        score_head    = EXCLUDED.score_head,
        score_action  = EXCLUDED.score_action,
        attribution_source = COALESCE(EXCLUDED.attribution_source, subscribers.attribution_source),
        first_attribution_source = COALESCE(subscribers.first_attribution_source, EXCLUDED.first_attribution_source),
        landing_page = COALESCE(subscribers.landing_page, EXCLUDED.landing_page),
        referrer = COALESCE(subscribers.referrer, EXCLUDED.referrer),
        utm_source = COALESCE(EXCLUDED.utm_source, subscribers.utm_source),
        utm_medium = COALESCE(EXCLUDED.utm_medium, subscribers.utm_medium),
        utm_campaign = COALESCE(EXCLUDED.utm_campaign, subscribers.utm_campaign),
        utm_term = COALESCE(EXCLUDED.utm_term, subscribers.utm_term),
        utm_content = COALESCE(EXCLUDED.utm_content, subscribers.utm_content),
        attribution = COALESCE(EXCLUDED.attribution, subscribers.attribution)
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
      emailError = 'Results email could not be delivered automatically.';
    } else {
      const firstName = escapeHtml(name.trim().split(' ')[0] || 'there');

      // Load DB-overridden email template (if set in Admin → Subscribers → Assessment Emails)
      const dbKeys = [`hc_email_${center}_subject`, `hc_email_${center}_body`];
      const es = await getEmailSettings(dbKeys);
      const dbBody = es[`hc_email_${center}_body`];
      const dbSubject = es[`hc_email_${center}_subject`];

      let subject, html;
      if (dbBody) {
        // Use the admin-edited template; interpolate all supported placeholders
        const calendlyUrl = process.env.CALENDLY_URL || '#';
        subject = dbSubject || 'Your Hidden Ceiling Assessment Result';
        html = dbBody;
        html = interpolateEmail(html, 'firstName',    firstName);
        html = interpolateEmail(html, 'scoreHeart',   String(scores.heart));
        html = interpolateEmail(html, 'scoreHead',    String(scores.head));
        html = interpolateEmail(html, 'scoreAction',  String(scores.action));
        html = interpolateEmail(html, 'calendlyUrl',  calendlyUrl);
        subject = interpolateEmail(subject, 'firstName', firstName);
      } else {
        // Fall back to the hardcoded template
        subject = 'Your Hidden Ceiling Assessment Result';
        html = buildHiddenCeilingEmail(firstName, center, scores);
      }

      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: 'John Paine | Your Journey Coach <hello@journeycoach.co>',
        to: email,
        subject,
        html,
      });
      emailSent = true;
    }
  } catch (emailErr) {
    emailError = 'Results email could not be delivered automatically.';
    console.error('Hidden ceiling email failed:', emailErr.message);
  }

  // Load result page content overrides (if saved in Admin → Result Pages)
  const resultFields = ['label', 'title', 'summary', 'description', 'blindspot', 'step1', 'step2', 'step3'];
  const rcKeys = resultFields.map(f => `hc_result_${center}_${f}`);
  const rcRaw  = await getEmailSettings(rcKeys);
  const resultContent = {
    centerLabel: rcRaw[`hc_result_${center}_label`]       || null,
    title:       rcRaw[`hc_result_${center}_title`]        || null,
    summary:     rcRaw[`hc_result_${center}_summary`]      || null,
    description: rcRaw[`hc_result_${center}_description`]  || null,
    blindspot:   rcRaw[`hc_result_${center}_blindspot`]    || null,
    nextSteps:   [
      rcRaw[`hc_result_${center}_step1`] || null,
      rcRaw[`hc_result_${center}_step2`] || null,
      rcRaw[`hc_result_${center}_step3`] || null,
    ].filter(Boolean),
  };
  const hasResultOverride = Object.values(rcRaw).some(v => v);

  return res.status(200).json({ ok: true, result, scores, emailSent, emailError, calendly_url: process.env.CALENDLY_URL || null, result_content: hasResultOverride ? resultContent : null });
}

async function handleCronDrip(req, res) {
  try {
    await runMigrations();

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
      WHERE result_center IS NOT NULL
        AND drip_step < ${maxStep}
        AND (is_unsubscribed IS NULL OR is_unsubscribed = FALSE)
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
          const firstName = escapeHtml((sub.name || '').trim().split(' ')[0] || 'there');
          const personalizedBody = withUnsubscribeFooter(
            template.body_html.replace(/\{\{\s*firstName\s*\}\}/g, firstName),
            sub.id
          );

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

async function handleUnsubscribe(req, res) {
  const { id, token } = req.query || {};
  if (!id || !token) return res.status(400).send(renderUnsubscribePage('error', 'Invalid unsubscribe link.'));
  const tokenValid = isValidUnsubscribeToken(id, token);
  if (!tokenValid) return res.status(400).send(renderUnsubscribePage('error', 'This unsubscribe link is not valid.'));

  try {
    const result = await sql`UPDATE subscribers SET is_unsubscribed = TRUE WHERE id = ${parseInt(id, 10)} RETURNING email`;
    if (result.length === 0) return res.status(404).send(renderUnsubscribePage('error', 'Subscriber not found.'));
    return res.status(200).send(renderUnsubscribePage('success'));
  } catch (err) {
    console.error('Unsubscribe error:', err);
    return res.status(500).send(renderUnsubscribePage('error', 'Something went wrong. Please try again.'));
  }
}

function renderUnsubscribePage(type, message = '') {
  const isSuccess = type === 'success';
  const title = isSuccess ? "You've been unsubscribed." : 'Something went wrong.';
  const body  = isSuccess ? "You won't receive any further emails from Journey Coach. If this was a mistake, feel free to reach out directly." : message;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${isSuccess ? 'Unsubscribed' : 'Unsubscribe Error'} — Journey Coach</title>
  <style>
    body { font-family: Georgia, serif; background: #1a1d1e; color: #f0ece4; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 2rem; box-sizing: border-box; }
    .card { max-width: 480px; text-align: center; }
    h1 { font-size: 1.5rem; margin-bottom: 0.75rem; line-height: 1.3; }
    p { color: #888; line-height: 1.7; margin-bottom: 1.5rem; }
    a { color: #c7a96b; text-decoration: none; font-size: 0.9rem; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="card">
    <h1>${title}</h1>
    <p>${body}</p>
    <a href="https://journeycoach.co">← Back to journeycoach.co</a>
  </div>
</body>
</html>`;
}

export default async function handler(req, res) {
  try {
    // Route cron drip — requires CRON_SECRET to match Vercel's Authorization header
    if (req.query?.action === 'cron_drip') {
      const cronSecret = process.env.CRON_SECRET;
      const authHeader  = req.headers['authorization'] || '';
      if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      return handleCronDrip(req, res);
    }
    // Route unsubscribe (GET with signed token)
    if (req.query?.action === 'unsubscribe') {
      return handleUnsubscribe(req, res);
    }

    // Route Resend webhook — POST /api/contact?action=resend_webhook
    if (req.query?.action === 'resend_webhook') {
      const signingSecret = process.env.RESEND_WEBHOOK_SECRET;
      if (!signingSecret) return res.status(401).json({ error: 'Unauthorized' });

      // Verify Svix signature sent by Resend
      const svixId        = req.headers['svix-id'];
      const svixTimestamp = req.headers['svix-timestamp'];
      const svixSignature = req.headers['svix-signature'];
      if (!svixId || !svixTimestamp || !svixSignature) {
        return res.status(401).json({ error: 'Missing webhook signature headers' });
      }

      let payload;
      try {
        const wh = new Webhook(signingSecret);
        payload = wh.verify(JSON.stringify(req.body), {
          'svix-id':        svixId,
          'svix-timestamp': svixTimestamp,
          'svix-signature': svixSignature,
        });
      } catch {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }

      const EVENT_MAP = {
        'email.sent': 'sent', 'email.delivered': 'delivered', 'email.delivery_delayed': 'delayed',
        'email.bounced': 'bounced', 'email.complained': 'complained',
        'email.opened': 'opened', 'email.clicked': 'clicked',
      };
      const { type, data } = payload || {};
      const status = EVENT_MAP[type];
      if (!status) return res.status(200).json({ ok: true, ignored: true });
      const to = Array.isArray(data?.to) ? data.to[0] : data?.to;
      if (!to) return res.status(400).json({ error: 'No recipient' });
      const occurredAt = data.created_at || new Date().toISOString();

      // Only overwrite a terminal status (bounced/complained) with another terminal status.
      // Otherwise always write — events arrive in order from Resend.
      const terminal = ['bounced', 'complained'];
      const isTerminal = terminal.includes(status);

      try {
        await sql`
          UPDATE subscribers SET email_status=${status}, email_status_at=${occurredAt}
          WHERE LOWER(email)=LOWER(${to})
            AND (email_status IS NULL OR email_status <> ALL(${terminal}) OR ${isTerminal})
        `;
        await sql`
          UPDATE contact_submissions SET email_status=${status}, email_status_at=${occurredAt}
          WHERE LOWER(email)=LOWER(${to})
            AND (email_status IS NULL OR email_status <> ALL(${terminal}) OR ${isTerminal})
        `;
        return res.status(200).json({ ok: true, status, to });
      } catch (err) {
        console.error('resend webhook error:', err);
        return res.status(500).json({ error: 'db error' });
      }
    }
    // Public config endpoint — exposes safe public values (no secrets)
    if (req.method === 'GET' && req.query?.action === 'config') {
      return res.status(200).json({
        calendly_url: process.env.CALENDLY_URL || null,
        assessment_form: await getAssessmentFormConfig(),
      });
    }

    // Only allow POST
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action, name, email, phone, interest, message, _honey, attribution, 'cf-turnstile-response': turnstileToken } = req.body;

    // Route subscribe action
    if (action === 'subscribe') return handleSubscribe(req, res);

    // Route hidden ceiling assessment
    if (action === 'hidden_ceiling') return handleHiddenCeiling(req, res);

    if (action === 'track_click') {
      const trackEmail = normalizeEmail(req.body.email);
      if (trackEmail) {
        try {
          await runMigrations();
          await sql`UPDATE subscribers SET assessment_call_clicked_at = NOW() WHERE email = ${trackEmail}`;
        } catch (e) {
          console.error('track_click error:', e);
        }
      }
      return res.status(200).json({ ok: true });
    }

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
      body: `secret=${process.env.CLOUDFLARE_TURNSTILE_SECRET}&response=${encodeURIComponent(turnstileToken)}`,
    });

    const verifyData = await verifyResponse.json();

    if (!verifyData.success) {
      const codes = (verifyData['error-codes'] || []).join(', ') || 'none';
      return res.status(400).json({ error: `CAPTCHA verification failed. [${codes}]` });
    }

    // Basic validation
    if (!name || !email || !phone || !message) {
      return res.status(400).json({ error: 'Name, email, phone, and message are required.' });
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
      const attr = normalizeAttribution(attribution);
      await runMigrations();
      await sql`
        INSERT INTO contact_submissions (
          name, email, phone, interest, message, attribution_source, first_attribution_source,
          landing_page, referrer, utm_source, utm_medium, utm_campaign, utm_term, utm_content, attribution
        )
        VALUES (
          ${name}, ${email}, ${phone}, ${interest}, ${message}, ${attr.source}, ${attr.firstSource},
          ${attr.landingPage}, ${attr.referrer}, ${attr.utmSource}, ${attr.utmMedium}, ${attr.utmCampaign},
          ${attr.utmTerm}, ${attr.utmContent}, ${JSON.stringify(attr.raw)}::jsonb
        )
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
        const rs = await getEmailSettings(['contact_reply_enabled', 'contact_reply_subject', 'contact_reply_body']);

        if (rs.contact_reply_enabled === 'true' && rs.contact_reply_body) {
          const firstName = escapeHtml(name.split(' ')[0]);
          const subject = interpolateEmail(rs.contact_reply_subject || 'Got your message, {{firstName}}', 'firstName', firstName);
          const html = interpolateEmail(rs.contact_reply_body, 'firstName', firstName);

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
    return res.status(500).json({ error: 'An unexpected error occurred. Please try again.' });
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
    head_heart: {
      centerLabel: 'Head + Heart Blend',
      title: 'You lead like a Thinking-Connection Blended Leader',
      summary: 'Your responses point to a leadership pattern that moves between careful understanding and relational attunement.',
      description: 'You likely notice both the logic of a situation and the way people are experiencing it. That blend can help you see risks, patterns, trust dynamics, and alignment needs at the same time.',
      blindspot: 'Under pressure, this blend can become a loop between analyzing what is true and managing how people will feel. The ceiling appears when clarity and connection both matter, but neither fully moves into action.',
      nextSteps: [
        'Notice when gathering more perspective is becoming a way to delay the next move.',
        'Name both the truth of the situation and the relational impact it is creating.',
        'Use the guide to see where thinking and connection can work together without slowing your leadership.',
      ],
      guideUrl: BLENDED_HEAD_HEART_GUIDE_URL,
      guideLabel: 'Download Your Guide: The Blended Head-Heart Leader',
    },
    head_action: {
      centerLabel: 'Head + Action Blend',
      title: 'You lead like a Thinking-Action Blended Leader',
      summary: 'Your responses point to a leadership pattern that moves between careful analysis and decisive forward motion.',
      description: 'You likely see structure, risk, and next steps quickly. That blend can help you make sense of complexity while still moving people and work toward practical outcomes.',
      blindspot: 'Under pressure, this blend can become a cycle of tightening control: think harder, move faster, and leave less room for the human signals that would help the decision land.',
      nextSteps: [
        'Notice when the need for certainty is pairing with urgency.',
        'Separate the next responsible action from the impulse to force resolution.',
        'Use the guide to see where clear thinking and decisive movement can serve the system without overrunning it.',
      ],
      guideUrl: BLENDED_HEAD_ACTION_GUIDE_URL,
      guideLabel: 'Download Your Guide: The Blended Head-Action Leader',
    },
    heart_action: {
      centerLabel: 'Heart + Action Blend',
      title: 'You lead like a Connection-Action Blended Leader',
      summary: 'Your responses point to a leadership pattern that moves between relational awareness and decisive forward motion.',
      description: 'You likely sense how decisions affect people while also wanting movement, clarity, and practical traction. That blend can help teams feel both cared for and mobilized.',
      blindspot: 'Under pressure, this blend can become a push-pull between keeping people with you and getting things moving. The ceiling appears when urgency and relational responsibility start competing instead of collaborating.',
      nextSteps: [
        'Notice when momentum is trying to outrun trust.',
        'Name the relational impact and the next action in the same conversation.',
        'Use the guide to see where connection and action can reinforce each other instead of pulling your leadership in two directions.',
      ],
      guideUrl: BLENDED_HEART_ACTION_GUIDE_URL,
      guideLabel: 'Download Your Guide: The Blended Heart-Action Leader',
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
    <a href="${process.env.CALENDLY_URL || '#'}" style="display:inline-block;background:transparent;color:#c7a96b;text-decoration:none;padding:12px 28px;border-radius:4px;border:1px solid #c7a96b;font-family:Inter,sans-serif;font-size:0.9rem;letter-spacing:0.04em;">Book an Alignment Call →</a>
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
  <p>These patterns show up differently depending on how you're wired. The Hidden Ceiling Assessment takes about 2 minutes and will identify which one is most active for you — with a personalized guide and specific next steps.</p>
  <p style="margin-top:2rem;">
    <a href="https://journeycoach.co/Hidden-Ceiling.html" style="display:inline-block;background:#c7a96b;color:#fff;text-decoration:none;padding:12px 28px;border-radius:4px;font-family:Inter,sans-serif;font-size:0.9rem;letter-spacing:0.04em;">Take the Free Assessment →</a>
  </p>
  <p style="margin-top:2.5rem;color:#555;">With respect,</p>
  <p style="margin:0;color:#1a1d1e;font-weight:bold;">John Paine</p>
  <p style="margin:0;color:#888;font-size:0.85rem;">ICF PCC &nbsp;·&nbsp; iEQ9 Accredited &nbsp;·&nbsp; iPEC Certified</p>
  <p style="margin:0.25em 0 0;color:#888;font-size:0.85rem;"><a href="https://journeycoach.co" style="color:#c7a96b;text-decoration:none;">journeycoach.co</a></p>
  <hr style="border:none;border-top:1px solid #eee;margin:2rem 0;">
  <p style="color:#bbb;font-size:0.75rem;margin:0;">You received this because you requested the Hidden Ceiling guide at journeycoach.co.</p>
</div>`;
}
