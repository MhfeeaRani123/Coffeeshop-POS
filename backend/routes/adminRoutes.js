const express = require('express');
const crypto = require('crypto');
const { createAdminToken, getTokenSecret } = require('../middleware/adminAuth');

const router = express.Router();

router.post('/login', (req, res) => {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  const tokenSecret = getTokenSecret();
  if (!configuredPassword || !tokenSecret) {
    return res.status(503).json({ message: 'Admin access is not configured on the server' });
  }

  const password = typeof req.body.password === 'string' ? req.body.password : '';
  const supplied = Buffer.from(password);
  const expected = Buffer.from(configuredPassword);
  const validPassword = supplied.length === expected.length &&
    crypto.timingSafeEqual(supplied, expected);

  if (!validPassword) {
    return res.status(401).json({ message: 'Invalid admin password' });
  }

  res.json({ token: createAdminToken(tokenSecret) });
});

module.exports = router;
