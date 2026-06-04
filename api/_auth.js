import crypto from 'crypto';

const EXPIRES_MS = 24 * 60 * 60 * 1000;
export const ADMIN_SESSION_COOKIE = 'yjc_admin_session';

export function createToken() {
  const expires = String(Date.now() + EXPIRES_MS);
  const nonce   = crypto.randomBytes(16).toString('hex');
  const payload = Buffer.from(`${expires}:${nonce}`).toString('base64');
  const sig = crypto.createHmac('sha256', process.env.ADMIN_JWT_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyToken(token) {
  if (!token) return false;
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return false;
    const expectedSig = crypto.createHmac('sha256', process.env.ADMIN_JWT_SECRET).update(payload).digest('hex');
    // Both digests are always 64 hex chars — safe to compare without length check
    const sigBuf = Buffer.from(sig.slice(0, 64).padEnd(64, '0'), 'hex');
    const expBuf = Buffer.from(expectedSig, 'hex');
    if (sig.length !== expectedSig.length) return false;
    if (!crypto.timingSafeEqual(sigBuf, expBuf)) return false;
    // Payload is "expires:nonce" (new) or just "expires" (legacy) — both parse correctly
    const decoded = Buffer.from(payload, 'base64').toString();
    const expires = parseInt(decoded.split(':')[0], 10);
    return Number.isFinite(expires) && Date.now() < expires;
  } catch { return false; }
}

function parseCookies(req) {
  const header = String(req.headers?.cookie || '');
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        if (index === -1) return [part, ''];
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function shouldUseSecureCookies(req) {
  const host = String(req.headers?.['x-forwarded-host'] || req.headers?.host || '').toLowerCase();
  return host && !host.includes('localhost') && !host.startsWith('127.0.0.1');
}

function appendSetCookie(res, cookie) {
  const existing = res.getHeader('Set-Cookie');
  if (!existing) {
    res.setHeader('Set-Cookie', cookie);
    return;
  }

  res.setHeader('Set-Cookie', [...(Array.isArray(existing) ? existing : [existing]), cookie]);
}

function buildCookie(name, value, req, maxAgeMs) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax'
  ];

  if (typeof maxAgeMs === 'number') {
    const seconds = Math.max(0, Math.floor(maxAgeMs / 1000));
    parts.push(`Max-Age=${seconds}`);
    parts.push(`Expires=${new Date(Date.now() + maxAgeMs).toUTCString()}`);
  }

  if (shouldUseSecureCookies(req)) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export function setAuthCookie(req, res, token) {
  appendSetCookie(res, buildCookie(ADMIN_SESSION_COOKIE, token, req, EXPIRES_MS));
}

export function clearAuthCookie(req, res) {
  appendSetCookie(res, buildCookie(ADMIN_SESSION_COOKIE, '', req, 0));
}

export function getToken(req) {
  const auth = req.headers['authorization'] || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);

  const cookies = parseCookies(req);
  return cookies[ADMIN_SESSION_COOKIE] || null;
}

export function requireAuth(req, res) {
  const token = getToken(req);
  if (!verifyToken(token)) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}
