const path = require('path');
const fs = require('fs');
const { createClient } = require('@libsql/client');

let url = process.env.DATABASE_URL || 'file:./data/app.db';
const authToken = process.env.TURSO_AUTH_TOKEN || undefined;

// For local file URLs, ensure the directory exists and the path is absolute.
if (url.startsWith('file:')) {
  const rel = url.slice('file:'.length);
  const abs = path.isAbsolute(rel) ? rel : path.resolve(__dirname, '..', rel);
  const dir = path.dirname(abs);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  url = 'file:' + abs;
}

const client = createClient({ url, authToken, intMode: 'number' });

// A thin wrapper that mimics the better-sqlite3 API (.prepare().get/all/run)
// but returns promises. Lets route handlers stay close to their original form.
function prepare(sql) {
  return {
    async get(...args) {
      const r = await client.execute({ sql, args });
      return r.rows[0] || null;
    },
    async all(...args) {
      const r = await client.execute({ sql, args });
      return r.rows;
    },
    async run(...args) {
      const r = await client.execute({ sql, args });
      return { changes: r.rowsAffected, lastInsertRowid: r.lastInsertRowid };
    }
  };
}

async function exec(sqlText) {
  // Split a multi-statement script by `;` while preserving content inside
  // single-quoted strings. Good enough for our schema bootstrap.
  const stmts = [];
  let buf = '';
  let inStr = false;
  for (let i = 0; i < sqlText.length; i++) {
    const ch = sqlText[i];
    if (ch === "'") inStr = !inStr;
    if (ch === ';' && !inStr) {
      const s = buf.trim();
      if (s) stmts.push(s);
      buf = '';
    } else {
      buf += ch;
    }
  }
  const tail = buf.trim();
  if (tail) stmts.push(tail);
  for (const s of stmts) {
    await client.execute(s);
  }
}

async function init() {
  await exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      currency TEXT DEFAULT 'IDR',
      locale TEXT DEFAULT 'id-ID',
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT NOT NULL,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income','expense','both')),
      is_default INTEGER DEFAULT 0,
      sort_order INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income','expense')),
      amount REAL NOT NULL CHECK (amount > 0),
      note TEXT,
      transaction_date TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, transaction_date DESC);
    CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category_id);

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category_id TEXT NOT NULL,
      limit_amount REAL NOT NULL CHECK (limit_amount > 0),
      period_month INTEGER NOT NULL CHECK (period_month BETWEEN 1 AND 12),
      period_year INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(user_id, category_id, period_month, period_year)
    );

    CREATE INDEX IF NOT EXISTS idx_budgets_user_period ON budgets(user_id, period_year, period_month);
  `);
}

// Schema init runs once per cold start. Cheap (all CREATE IF NOT EXISTS) and
// keeps deploys hands-off: no separate migration step required.
let _initPromise = null;
function ensureInit() {
  if (!_initPromise) _initPromise = init().catch(err => {
    _initPromise = null;
    throw err;
  });
  return _initPromise;
}

// Run init eagerly when this module is first required (e.g. in `node src/index.js`).
// Serverless handlers should `await ensureInit()` in middleware to be safe.
ensureInit().catch(err => console.error('DB init failed:', err));

module.exports = { client, prepare, exec, init, ensureInit };
