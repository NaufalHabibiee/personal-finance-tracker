const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { uuid, validate } = require('../util');
const { authRequired } = require('../middleware/auth');
const { seedDefaultCategoriesForUser } = require('../seedHelpers');

const router = express.Router();

function signToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

router.post('/signup', (req, res) => {
  const { email, password, full_name } = req.body || {};
  const errs = validate({ email, password }, {
    email: { required: true, type: 'string' },
    password: { required: true, type: 'string' }
  });
  if (errs.length) return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: errs.join('; ') } });
  if (password.length < 8) {
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Password min 8 chars' } });
  }

  const exists = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (exists) {
    return res.status(409).json({ error: { code: 'DUPLICATE_ENTRY', message: 'Email already registered' } });
  }
  const id = uuid();
  const hash = bcrypt.hashSync(password, 10);
  db.prepare('INSERT INTO users (id,email,password_hash,full_name) VALUES (?,?,?,?)')
    .run(id, email, hash, full_name || null);

  seedDefaultCategoriesForUser(id);

  const user = db.prepare('SELECT id,email,full_name,currency,locale FROM users WHERE id = ?').get(id);
  const token = signToken(user);
  res.status(201).json({ user, token });
});

router.post('/signin', (req, res) => {
  const { email, password } = req.body || {};
  const errs = validate({ email, password }, {
    email: { required: true, type: 'string' },
    password: { required: true, type: 'string' }
  });
  if (errs.length) return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: errs.join('; ') } });

  const row = db.prepare('SELECT id,email,password_hash,full_name,currency,locale FROM users WHERE email = ?').get(email);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: { code: 'AUTH_REQUIRED', message: 'Invalid email or password' } });
  }
  const { password_hash, ...user } = row;
  const token = signToken(user);
  res.json({ user, token });
});

router.get('/me', authRequired, (req, res) => {
  const user = db.prepare('SELECT id,email,full_name,currency,locale,created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'User not found' } });
  res.json({ user });
});

router.patch('/me', authRequired, (req, res) => {
  const { full_name, currency, locale } = req.body || {};
  db.prepare('UPDATE users SET full_name = COALESCE(?, full_name), currency = COALESCE(?, currency), locale = COALESCE(?, locale) WHERE id = ?')
    .run(full_name ?? null, currency ?? null, locale ?? null, req.user.id);
  const user = db.prepare('SELECT id,email,full_name,currency,locale FROM users WHERE id = ?').get(req.user.id);
  res.json({ user });
});

router.post('/signout', authRequired, (_req, res) => {
  res.json({ ok: true });
});

module.exports = router;
