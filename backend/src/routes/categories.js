const express = require('express');
const db = require('../db');
const { uuid, validate } = require('../util');
const { authRequired } = require('../middleware/auth');

const router = express.Router();
router.use(authRequired);

router.get('/', (req, res) => {
  const rows = db.prepare(
    'SELECT id,name,icon,color,type,is_default,sort_order FROM categories WHERE user_id = ? ORDER BY type, sort_order, name'
  ).all(req.user.id);
  res.json({ data: rows });
});

router.post('/', (req, res) => {
  const { name, icon, color, type } = req.body || {};
  const errs = validate({ name, icon, color, type }, {
    name: { required: true, type: 'string' },
    icon: { required: true, type: 'string' },
    color: { required: true, type: 'string' },
    type: { required: true, type: 'string', enum: ['income', 'expense', 'both'] }
  });
  if (errs.length) return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: errs.join('; ') } });

  const dup = db.prepare('SELECT id FROM categories WHERE user_id = ? AND name = ?').get(req.user.id, name);
  if (dup) return res.status(409).json({ error: { code: 'DUPLICATE_ENTRY', message: 'Category name exists' } });

  const id = uuid();
  db.prepare('INSERT INTO categories (id,user_id,name,icon,color,type,is_default) VALUES (?,?,?,?,?,?,0)')
    .run(id, req.user.id, name, icon, color, type);
  const row = db.prepare('SELECT id,name,icon,color,type,is_default FROM categories WHERE id = ?').get(id);
  res.status(201).json(row);
});

router.patch('/:id', (req, res) => {
  const row = db.prepare('SELECT id FROM categories WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Category not found' } });
  const { name, icon, color, type } = req.body || {};
  db.prepare('UPDATE categories SET name = COALESCE(?,name), icon = COALESCE(?,icon), color = COALESCE(?,color), type = COALESCE(?,type) WHERE id = ?')
    .run(name ?? null, icon ?? null, color ?? null, type ?? null, req.params.id);
  const updated = db.prepare('SELECT id,name,icon,color,type,is_default FROM categories WHERE id = ?').get(req.params.id);
  res.json(updated);
});

router.delete('/:id', (req, res) => {
  const row = db.prepare('SELECT id,is_default FROM categories WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (!row) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Category not found' } });
  const used = db.prepare('SELECT COUNT(*) AS n FROM transactions WHERE category_id = ?').get(req.params.id);
  if (used.n > 0) {
    return res.status(409).json({ error: { code: 'DUPLICATE_ENTRY', message: 'Category in use by transactions' } });
  }
  db.prepare('DELETE FROM categories WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
