const crypto = require('crypto');

const TOKEN_LIFETIME_SECONDS = 8 * 60 * 60;

const getTokenSecret = () => {
  const secret = process.env.ADMIN_TOKEN_SECRET;
  return secret && secret.length >= 32 ? secret : null;
};

const sign = (payload, secret) =>
  crypto.createHmac('sha256', secret).update(payload).digest('hex');

const safeCompare = (left, right) => {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};

const createAdminToken = (secret) => {
  const payload = Buffer.from(JSON.stringify({
    role: 'admin',
    expiresAt: Math.floor(Date.now() / 1000) + TOKEN_LIFETIME_SECONDS,
  })).toString('base64url');

  return `${payload}.${sign(payload, secret)}`;
};

const isValidAdminToken = (token, secret) => {
  if (!token || !secret) return false;

  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra || !safeCompare(signature, sign(payload, secret))) return false;

  try {
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return claims.role === 'admin' && Number.isFinite(claims.expiresAt) &&
      claims.expiresAt > Math.floor(Date.now() / 1000);
  } catch (error) {
    return false;
  }
};

const requireAdmin = (req, res, next) => {
  const secret = getTokenSecret();
  if (!secret) {
    return res.status(503).json({ message: 'Admin access is not configured on the server' });
  }

  const authorization = req.get('Authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : '';
  if (!isValidAdminToken(token, secret)) {
    return res.status(401).json({ message: 'Admin authentication required' });
  }

  next();
};

module.exports = { createAdminToken, getTokenSecret, requireAdmin };
