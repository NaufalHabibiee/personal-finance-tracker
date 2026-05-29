require('dotenv').config();
const express = require('express');
const cors = require('cors');

require('./db');

const app = express();
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(express.json({ limit: '1mb' }));

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

const port = parseInt(process.env.PORT) || 4000;
app.listen(port, () => {
  console.log(`Backend listening on http://localhost:${port}`);
});
