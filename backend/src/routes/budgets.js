const express = require('express');
const db = require('../db');
const { uuid, validate } = require('../util');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function monthBounds(year, month) {
  const m = String(month).padStart(2, '0');
  const start = `${year}-${m}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${m}-${String(lastDay).padStart(2, '0')}`;
  return { start, end };
}

function statusFromPct(pct) {
  if (pct >= 100) return 'over';
  if (pct >= 75) return 'warning';
  return 'safe';
}

async function expandBudget(b) {
  const { start, end } = monthBounds(b.period_year, b.period_month);
  const spentRow = await db.prepare(
    "SELECT COALESCE(SUM(amount),0) AS s FROM transactions WHERE user_id = ? AND category_id = ? AND type = 'expense' AND transaction_date BETWEEN ? AND ?"
  ).get(b.user_id, b.category_id, start, end);
  const spent = spentRow.s;
  const cat = await db.prepare('SELECT id,name,icon,color FROM categories WHERE id = ?').get(b.category_id);
  const pct = b.limit_amount > 0 ? Math.round((spent / b.limit_amount) * 10000) / 100 : 0;
  return {
    id: b.id,
    category: cat,
    limit_amount: b.limit_amount,
    spent_amount: spent,
    remaining_amount: Math.max(0, b.limit_amount - spent),
    percentage_used: pct,
    status: statusFromPct(pct),
    period_month: b.period_month,
    period_year: b.period_year
  };
}

router.get('/', async (req, res, next) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const year = parseInt(req.query.year) || now.getFullYear();
    const rows = await db.prepare('SELECT * FROM budgets WHERE user_id = ? AND period_month = ? AND period_year = ?')
      .all(req.user.id, month, year);
    const data = await Promise.all(rows.map(expandBudget));
    const summary = data.reduce((acc, b) => ({
      total_limit: acc.total_limit + b.limit_amount,
      total_spent: acc.total_spent + b.spent_amount,
      total_remaining: acc.total_remaining + b.remaining_amount
    }), { total_limit: 0, total_spent: 0, total_remaining: 0 });
    res.json({ data, summary, period_month: month, period_year: year });
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const b = await db.prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!b) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Budget not found' } });
    res.json(await expandBudget(b));
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { category_id, limit_amount, period_month, period_year } = req.body || {};
    const errs = validate({ category_id, limit_amount, period_month, period_year }, {
      category_id: { required: true, type: 'string' },
      limit_amount: { required: true, type: 'number', min: 0.01 },
      period_month: { required: true, type: 'number', min: 1, max: 12 },
      period_year: { required: true, type: 'number', min: 2020 }
    });
    if (errs.length) return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: errs.join('; ') } });

    const cat = await db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(category_id, req.user.id);
    if (!cat) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Category not found' } });

    const dup = await db.prepare('SELECT id FROM budgets WHERE user_id = ? AND category_id = ? AND period_month = ? AND period_year = ?')
      .get(req.user.id, category_id, period_month, period_year);
    if (dup) return res.status(409).json({ error: { code: 'DUPLICATE_ENTRY', message: 'Budget for this category & period already exists' } });

    const id = uuid();
    await db.prepare('INSERT INTO budgets (id,user_id,category_id,limit_amount,period_month,period_year) VALUES (?,?,?,?,?,?)')
      .run(id, req.user.id, category_id, limit_amount, period_month, period_year);
    const b = await db.prepare('SELECT * FROM budgets WHERE id = ?').get(id);
    res.status(201).json(await expandBudget(b));
  } catch (e) { next(e); }
});

router.patch('/:id', async (req, res, next) => {
  try {
    const b = await db.prepare('SELECT * FROM budgets WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!b) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Budget not found' } });
    const { limit_amount } = req.body || {};
    if (limit_amount !== undefined) {
      if (typeof limit_amount !== 'number' || limit_amount <= 0) {
        return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'limit_amount must be positive number' } });
      }
      await db.prepare("UPDATE budgets SET limit_amount = ?, updated_at = datetime('now') WHERE id = ?").run(limit_amount, req.params.id);
    }
    const updated = await db.prepare('SELECT * FROM budgets WHERE id = ?').get(req.params.id);
    res.json(await expandBudget(updated));
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const b = await db.prepare('SELECT id FROM budgets WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
    if (!b) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Budget not found' } });
    await db.prepare('DELETE FROM budgets WHERE id = ?').run(req.params.id);
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
