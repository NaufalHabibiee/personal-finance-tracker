const express = require('express');
const db = require('../db');
const { uuid, validate } = require('../util');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

function hydrate(row) {
  if (!row) return row;
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    note: row.note,
    transaction_date: row.transaction_date,
    created_at: row.created_at,
    category: {
      id: row.category_id,
      name: row.cat_name,
      icon: row.cat_icon,
      color: row.cat_color
    }
  };
}

router.get('/', (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const offset = (page - 1) * limit;

  const where = ['t.user_id = ?'];
  const params = [req.user.id];
  if (req.query.type) { where.push('t.type = ?'); params.push(req.query.type); }
  if (req.query.category_id) { where.push('t.category_id = ?'); params.push(req.query.category_id); }
  if (req.query.start_date) { where.push('t.transaction_date >= ?'); params.push(req.query.start_date); }
  if (req.query.end_date) { where.push('t.transaction_date <= ?'); params.push(req.query.end_date); }
  if (req.query.search) { where.push('t.note LIKE ?'); params.push('%' + req.query.search + '%'); }

  const whereSql = where.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) AS n FROM transactions t WHERE ${whereSql}`).get(...params).n;
  const rows = db.prepare(`
    SELECT t.*, c.name AS cat_name, c.icon AS cat_icon, c.color AS cat_color
    FROM transactions t JOIN categories c ON c.id = t.category_id
    WHERE ${whereSql}
    ORDER BY t.transaction_date DESC, t.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  res.json({
    data: rows.map(hydrate),
    pagination: { page, limit, total, total_pages: Math.ceil(total / limit) }
  });
});

router.get('/summary', (req, res) => {
  const start = req.query.start_date;
  const end = req.query.end_date;
  const where = ['user_id = ?'];
  const params = [req.user.id];
  if (start) { where.push('transaction_date >= ?'); params.push(start); }
  if (end) { where.push('transaction_date <= ?'); params.push(end); }
  const sums = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type='income' THEN amount ELSE 0 END),0) AS income,
      COALESCE(SUM(CASE WHEN type='expense' THEN amount ELSE 0 END),0) AS expense
    FROM transactions WHERE ${where.join(' AND ')}
  `).get(...params);
  const balance = db.prepare('SELECT COALESCE(SUM(CASE WHEN type=\'income\' THEN amount ELSE -amount END),0) AS bal FROM transactions WHERE user_id = ?').get(req.user.id).bal;
  res.json({
    income: sums.income,
    expense: sums.expense,
    net: sums.income - sums.expense,
    balance
  });
});

router.get('/:id', (req, res) => {
  const row = db.prepare(`
    SELECT t.*, c.name AS cat_name, c.icon AS cat_icon, c.color AS cat_color
    FROM transactions t JOIN categories c ON c.id = t.category_id
    WHERE t.id = ? AND t.user_id = ?
  `).get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Transaction not found' } });
  res.json(hydrate(row));
});

router.post('/', (req, res) => {
  const { category_id, type, amount, note, transaction_date } = req.body || {};
  const errs = validate({ category_id, type, amount }, {
    category_id: { required: true, type: 'string' },
    type: { required: true, type: 'string', enum: ['income', 'expense'] },
    amount: { required: true, type: 'number', min: 0.01 }
  });
  if (errs.length) return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: errs.join('; ') } });

  const cat = db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(category_id, req.user.id);
  if (!cat) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Category not found' } });

  const id = uuid();
  const date = transaction_date || new Date().toISOString().slice(0, 10);
  db.prepare(
    'INSERT INTO transactions (id,user_id,category_id,type,amount,note,transaction_date) VALUES (?,?,?,?,?,?,?)'
  ).run(id, req.user.id, category_id, type, amount, note || null, date);

  const row = db.prepare(`
    SELECT t.*, c.name AS cat_name, c.icon AS cat_icon, c.color AS cat_color
    FROM transactions t JOIN categories c ON c.id = t.category_id WHERE t.id = ?
  `).get(id);
  res.status(201).json(hydrate(row));
});

router.patch('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM transactions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Transaction not found' } });
  const { category_id, type, amount, note, transaction_date } = req.body || {};
  db.prepare(`
    UPDATE transactions SET
      category_id = COALESCE(?, category_id),
      type = COALESCE(?, type),
      amount = COALESCE(?, amount),
      note = COALESCE(?, note),
      transaction_date = COALESCE(?, transaction_date),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(category_id ?? null, type ?? null, amount ?? null, note ?? null, transaction_date ?? null, req.params.id);

  const row = db.prepare(`
    SELECT t.*, c.name AS cat_name, c.icon AS cat_icon, c.color AS cat_color
    FROM transactions t JOIN categories c ON c.id = t.category_id WHERE t.id = ?
  `).get(req.params.id);
  res.json(hydrate(row));
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT id FROM transactions WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!existing) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Transaction not found' } });
  db.prepare('DELETE FROM transactions WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
