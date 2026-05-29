// Pure Express app factory — no `.listen()`. Used by both the local dev
// server (src/index.js) and the Vercel serverless handler (/api/index.js).
const express = require('express');
const cors = require('cors');
const db = require('./db');

function createApp() {
  const app = express();
  app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
  app.use(express.json({ limit: '1mb' }));

  // Make sure schema is initialised before any request runs. On warm
  // invocations this is a no-op (memoized promise).
  app.use(async (_req, _res, next) => {
    try { await db.ensureInit(); next(); }
    catch (e) { next(e); }
  });

  app.get('/api/v1/health', (_req, res) => res.json({ ok: true, ts: Date.now() }));

  app.use('/api/v1/auth', require('./routes/auth'));
  app.use('/api/v1/categories', require('./routes/categories'));
  app.use('/api/v1/transactions', require('./routes/transactions'));
  app.use('/api/v1/budgets', require('./routes/budgets'));
  app.use('/api/v1/reports', require('./routes/reports'));

  app.use((req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
  });

  app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: { code: 'INTERNAL_ERROR', message: err.message || 'Internal error' } });
  });

  return app;
}

module.exports = { createApp };
