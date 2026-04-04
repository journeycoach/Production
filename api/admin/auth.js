import crypto from 'crypto';
import { createToken } from '../_auth.js';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body || {};
  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  let match = false;
  try {
    const a = Buffer.from(password);
    const b = Buffer.from(adminPassword);
    if (a.length === b.length) {
      match = crypto.timingSafeEqual(a, b);
    }
  } catch {
    match = false;
  }

  if (!match) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  const token = createToken();
  return res.status(200).json({ ok: true, token });
}
