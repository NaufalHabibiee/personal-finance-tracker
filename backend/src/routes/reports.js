const express = require('express');
const db = require('../db');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function ymKey(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`;
}

function monthBounds(year, month) {
  const m = String(month).padStart(2, '0');
  const start = `${year}-${m}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${m}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

router.get('/overview', (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month) || (now.getMonth() + 1);
  const year = parseInt(req.query.year) || now.getFullYear();
  const { start, end } = monthBounds(year, month);
  const s = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) AS income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) AS expense
    FROM transactions WHERE user_id = ? AND transaction_date BETWEEN ? AND ?
  `).get(req.user.id, start, end);
  const saving_rate = s.income > 0 ? Math.round(((s.income - s.expense) / s.income) * 10000) / 100 : 0;
  res.json({
    period_month: month,
    period_year: year,
    income: s.income,
    expense: s.expense,
    net: s.income - s.expense,
    saving_rate
  });
});

router.get('/trend', (req, res) => {
  const months = Math.min(24, parseInt(req.query.months) || 6);
  const now = new Date();
  const items = [];
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth() + 1;
    const { start, end } = monthBounds(year, month);
    const s = db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) AS income,
        COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) AS expense
      FROM transactions WHERE user_id = ? AND transaction_date BETWEEN ? AND ?
    `).get(req.user.id, start, end);
    items.push({
      month: ymKey(year, month),
      income: s.income,
      expense: s.expense,
      net: s.income - s.expense
    });
  }
  res.json({ data: items });
});

router.get('/category-breakdown', (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month) || (now.getMonth() + 1);
  const year = parseInt(req.query.year) || now.getFullYear();
  const type = req.query.type === 'income' ? 'income' : 'expense';
  const { start, end } = monthBounds(year, month);
  const rows = db.prepare(`
    SELECT c.id, c.name, c.icon, c.color, COALESCE(SUM(t.amount),0) AS total
    FROM categories c
    LEFT JOIN transactions t ON t.category_id = c.id
      AND t.user_id = ? AND t.type = ? AND t.transaction_date BETWEEN ? AND ?
    WHERE c.user_id = ?
    GROUP BY c.id
    HAVING total > 0
    ORDER BY total DESC
  `).all(req.user.id, type, start, end, req.user.id);
  const grand = rows.reduce((acc, r) => acc + r.total, 0);
  const data = rows.map(r => ({
    category: { id: r.id, name: r.name, icon: r.icon, color: r.color },
    total: r.total,
    percentage: grand > 0 ? Math.round((r.total / grand) * 10000) / 100 : 0
  }));
  res.json({ data, total: grand });
});

router.get('/top-expenses', (req, res) => {
  const limit = Math.min(50, parseInt(req.query.limit) || 5);
  const now = new Date();
  const month = parseInt(req.query.month) || (now.getMonth() + 1);
  const year = parseInt(req.query.year) || now.getFullYear();
  const { start, end } = monthBounds(year, month);
  const rows = db.prepare(`
    SELECT t.id, t.amount, t.note, t.transaction_date,
           c.id AS cat_id, c.name AS cat_name, c.icon AS cat_icon, c.color AS cat_color
    FROM transactions t JOIN categories c ON c.id = t.category_id
    WHERE t.user_id = ? AND t.type = 'expense' AND t.transaction_date BETWEEN ? AND ?
    ORDER BY t.amount DESC LIMIT ?
  `).all(req.user.id, start, end, limit);
  res.json({
    data: rows.map(r => ({
      id: r.id,
      amount: r.amount,
      note: r.note,
      transaction_date: r.transaction_date,
      category: { id: r.cat_id, name: r.cat_name, icon: r.cat_icon, color: r.cat_color }
    }))
  });
});

router.get('/comparison', (req, res) => {
  const now = new Date();
  const month = parseInt(req.query.month) || (now.getMonth() + 1);
  const year = parseInt(req.query.year) || now.getFullYear();
  const prev = new Date(year, month - 2, 1);
  const prevMonth = prev.getMonth() + 1;
  const prevYear = prev.getFullYear();

  const cur = monthBounds(year, month);
  const prv = monthBounds(prevYear, prevMonth);

  const sumOf = (start, end) => db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) AS income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) AS expense
    FROM transactions WHERE user_id = ? AND transaction_date BETWEEN ? AND ?
  `).get(req.user.id, start, end);

  const c = sumOf(cur.start, cur.end);
  const p = sumOf(prv.start, prv.end);
  const delta = (a, b) => (b === 0 ? (a === 0 ? 0 : 100) : Math.round(((a - b) / b) * 10000) / 100);

  res.json({
    current: { month, year, ...c, net: c.income - c.expense },
    previous: { month: prevMonth, year: prevYear, ...p, net: p.income - p.expense },
    delta: {
      income_pct: delta(c.income, p.income),
      expense_pct: delta(c.expense, p.expense),
      net_pct: delta(c.income - c.expense, p.income - p.expense)
    }
  });
});

module.exports = router;
