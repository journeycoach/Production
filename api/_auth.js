import crypto from 'crypto';

const EXPIRES_MS = 24 * 60 * 60 * 1000;

export function createToken() {
  const expires = String(Date.now() + EXPIRES_MS);
  const payload = Buffer.from(expires).toString('base64');
  const sig = crypto.createHmac('sha256', process.env.ADMIN_JWT_SECRET).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyToken(token) {
  if (!token) return false;
  try {
    const [payload, sig] = token.split('.');
    if (!payload || !sig) return false;
    const expectedSig = crypto.createHmac('sha256', process.env.ADMIN_JWT_SECRET).update(payload).digest('hex');
    if (sig !== expectedSig) return false;
    const expires = parseInt(Buffer.from(payload, 'base64').toString(), 10);
    return Date.now() < expires;
  } catch { return false; }
}

export function getToken(req) {
  const auth = req.headers['authorization'] || '';
  return auth.startsWith('Bearer ') ? auth.slice(7) : null;
}

export function requireAuth(req, res) {
  const token = getToken(req);
  if (!verifyToken(token)) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }
  return true;
}
