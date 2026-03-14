// Vercel Serverless Function: POST /api/contact
// Sends form submissions via Resend (resend.com)
//
// Required Environment Variables (set in Vercel dashboard):
//   RESEND_API_KEY  — your Resend API key (starts with "re_")
//   CONTACT_EMAIL   — the inbox where submissions are delivered (e.g. john@yourjourneycoach.com)

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, phone, interest, message, _honey } = req.body;

  // Honeypot check — bots fill hidden fields; humans leave them blank
  if (_honey) {
    // Silently succeed so the bot thinks it worked
    return res.status(200).json({ ok: true });
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

  const apiKey = process.env.RESEND_API_KEY;
  const toEmail = process.env.CONTACT_EMAIL;

  if (!apiKey || !toEmail) {
    console.error('Missing RESEND_API_KEY or CONTACT_EMAIL environment variable.');
    return res.status(500).json({ error: 'Server configuration error. Please try again later.' });
  }

  // Build the email HTML
  const html = `
    <div style="font-family: Georgia, serif; max-width: 600px; margin: 0 auto; color: #1a1d1e; background: #fff; padding: 32px; border-radius: 8px;">
      <h2 style="color: #c7a96b; margin-top: 0; border-bottom: 1px solid #eee; padding-bottom: 16px;">
        New Inquiry — Your Journey Coach
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
        Sent via yourjourneycoach.com contact form · ${new Date().toLocaleString('en-US', { timeZone: 'America/New_York' })} ET
      </p>
    </div>
  `;

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // ── Sender ────────────────────────────────────────────────────────────
        // Using Resend's sandbox sender for initial testing.
        // Once your domain is verified in Resend, swap this to:
        //   "Your Journey Coach <noreply@yourjourneycoach.com>"
        from: 'Your Journey Coach <onboarding@resend.dev>',
        // ─────────────────────────────────────────────────────────────────────
        to: [toEmail],
        reply_to: email,
        subject: `New Inquiry from ${name}`,
        html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('Resend API error:', response.status, errorBody);
      return res.status(502).json({ error: 'Failed to send email. Please try again.' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Unexpected error in /api/contact:', err);
    return res.status(500).json({ error: 'An unexpected error occurred.' });
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
