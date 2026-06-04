import crypto from 'crypto';
import { sql } from '../_db.js';
import { clearAuthCookie, createToken, requireAuth, setAuthCookie } from '../_auth.js';
import { runMigrations } from '../_migrate.js';

const LOGIN_RATE_LIMIT_SALT = process.env.RATE_LIMIT_SALT || process.env.ADMIN_JWT_SECRET;

function getClientIp(req) {
  const forwarded = String(
    req.headers['x-forwarded-for']
    || req.headers['x-real-ip']
    || req.socket?.remoteAddress
    || ''
  );
  return forwarded.split(',')[0].trim() || 'unknown';
}

function hashValue(value) {
  return crypto.createHash('sha256').update(`${LOGIN_RATE_LIMIT_SALT}:${value}`).digest('hex');
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getRecentFailedLoginCount(ipHash) {
  const [row] = await sql`
    SELECT COUNT(*)::int AS count
    FROM admin_login_attempts
    WHERE ip_hash = ${ipHash}
      AND created_at > NOW() - INTERVAL '15 minutes'
  `;
  return row?.count || 0;
}

async function recordFailedLogin(ipHash) {
  await sql`
    INSERT INTO admin_login_attempts (ip_hash)
    VALUES (${ipHash})
  `;
  await sql`
    DELETE FROM admin_login_attempts
    WHERE created_at < NOW() - INTERVAL '1 day'
  `;
}

async function clearFailedLogins(ipHash) {
  await sql`
    DELETE FROM admin_login_attempts
    WHERE ip_hash = ${ipHash}
  `;
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.query?.action === 'logout') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    clearAuthCookie(req, res);
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'GET') {
    if (!requireAuth(req, res)) return;
    return res.status(200).json({ ok: true });
  }

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

  const ipHash = hashValue(getClientIp(req));
  try {
    await runMigrations();
    const failedAttempts = await getRecentFailedLoginCount(ipHash);
    if (failedAttempts >= 8) {
      return res.status(429).json({ error: 'Too many login attempts. Please wait 15 minutes and try again.' });
    }
  } catch (err) {
    console.error('admin login rate limit check error:', err);
  }

  // HMAC both values with the same key so the comparison is always over equal-length
  // 32-byte digests — never leaks the correct password's length via timing.
  let match = false;
  try {
    const secret = process.env.ADMIN_JWT_SECRET;
    const hmacA = crypto.createHmac('sha256', secret).update(String(password)).digest();
    const hmacB = crypto.createHmac('sha256', secret).update(String(adminPassword)).digest();
    match = crypto.timingSafeEqual(hmacA, hmacB);
  } catch {
    match = false;
  }

  if (!match) {
    try {
      await runMigrations();
      await recordFailedLogin(ipHash);
    } catch (err) {
      console.error('admin login rate limit record error:', err);
    }
    await wait(800);
    return res.status(401).json({ error: 'Invalid password' });
  }

  try {
    await clearFailedLogins(ipHash);
  } catch (err) {
    console.error('admin login rate limit clear error:', err);
  }

  const token = createToken();
  setAuthCookie(req, res, token);
  return res.status(200).json({ ok: true });
}
