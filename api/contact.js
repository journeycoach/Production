import { sql } from './_db.js';
import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  try {
    // Only allow POST
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    const { name, email, phone, interest, message, _honey, 'cf-turnstile-response': turnstileToken } = req.body;

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
