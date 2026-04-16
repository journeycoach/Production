import crypto from 'crypto';
import { sql } from './_db.js';

function generateToken(subscriberId) {
  const secret = process.env.ADMIN_JWT_SECRET || 'journeycoach-unsub';
  return crypto.createHmac('sha256', secret).update(String(subscriberId)).digest('hex');
}

export default async function handler(req, res) {
  const { id, token } = req.query || {};

  if (!id || !token) {
    return res.status(400).send(renderPage('error', 'Invalid unsubscribe link.'));
  }

  if (token !== generateToken(id)) {
    return res.status(400).send(renderPage('error', 'This unsubscribe link is not valid.'));
  }

  try {
    await sql`ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS is_unsubscribed BOOLEAN DEFAULT FALSE`;

    const result = await sql`
      UPDATE subscribers SET is_unsubscribed = TRUE WHERE id = ${parseInt(id, 10)} RETURNING email
    `;

    if (result.length === 0) {
      return res.status(404).send(renderPage('error', 'Subscriber not found.'));
    }

    return res.status(200).send(renderPage('success'));
  } catch (err) {
    console.error('Unsubscribe error:', err);
    return res.status(500).send(renderPage('error', 'Something went wrong. Please try again.'));
  }
}

function renderPage(type, message = '') {
  const isSuccess = type === 'success';
  const title    = isSuccess ? "You've been unsubscribed." : 'Something went wrong.';
  const body     = isSuccess
    ? "You won't receive any further emails from Journey Coach. If this was a mistake, feel free to reach out directly."
    : message;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
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
