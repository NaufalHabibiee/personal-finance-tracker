const express = require('express');
const db = require('../db');
const { uuid } = require('../util');
const { authRequired } = require('../middleware/auth');
const { parseMessage } = require('../nlp');

const router = express.Router();
router.use(authRequired);

function rupiah(n) {
  return 'Rp ' + Math.round(Number(n)).toLocaleString('id-ID');
}

async function loadTx(id) {
  return db.prepare(`
    SELECT t.*, c.name AS cat_name, c.icon AS cat_icon, c.color AS cat_color
    FROM transactions t JOIN categories c ON c.id = t.category_id WHERE t.id = ?
  `).get(id);
}

function hydrate(row) {
  if (!row) return null;
  return {
    id: row.id,
    type: row.type,
    amount: row.amount,
    note: row.note,
    transaction_date: row.transaction_date,
    created_at: row.created_at,
    category: { id: row.category_id, name: row.cat_name, icon: row.cat_icon, color: row.cat_color },
  };
}

// POST /chat — parse a natural-language message and (when confident enough)
// auto-create the transaction. Returns a chat reply + the created transaction.
router.post('/', async (req, res, next) => {
  try {
    const { message } = req.body || {};
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'Pesan tidak boleh kosong' },
      });
    }

    const categories = await db.prepare(
      'SELECT id,name,icon,color,type FROM categories WHERE user_id = ?'
    ).all(req.user.id);

    if (categories.length === 0) {
      return res.json({
        reply: 'Kamu belum punya kategori. Buat kategori dulu ya, lalu coba lagi.',
        created: false,
      });
    }

    const parsed = parseMessage(message, categories);

    // Missing amount → ask for it instead of guessing.
    if (!parsed.amount || parsed.amount <= 0) {
      return res.json({
        reply: 'Aku belum nemu nominalnya 🤔. Coba sebutkan angkanya, misalnya "beli kopi 25 ribu" atau "gaji 5 juta".',
        created: false,
        parsed: { type: parsed.type, amount: null, category: parsed.category },
      });
    }

    if (!parsed.category) {
      return res.json({
        reply: `Aku ngerti ${parsed.type === 'income' ? 'pemasukan' : 'pengeluaran'} ${rupiah(parsed.amount)}, tapi belum nemu kategorinya. Tambah kategori dulu ya.`,
        created: false,
        parsed: { type: parsed.type, amount: parsed.amount, category: null },
      });
    }

    // Confident enough → create the transaction automatically.
    const id = uuid();
    const date = new Date().toISOString().slice(0, 10);
    await db.prepare(
      'INSERT INTO transactions (id,user_id,category_id,type,amount,note,transaction_date) VALUES (?,?,?,?,?,?,?)'
    ).run(id, req.user.id, parsed.category.id, parsed.type, parsed.amount, parsed.note || null, date);

    const tx = hydrate(await loadTx(id));

    const verb = parsed.type === 'income' ? 'Pemasukan' : 'Pengeluaran';
    const emoji = parsed.type === 'income' ? '💰' : '🧾';
    let reply = `${emoji} ${verb} ${rupiah(parsed.amount)} dicatat di kategori *${parsed.category.icon} ${parsed.category.name}*.`;
    if (!parsed.typeConfident) {
      reply += `\n\n(Aku menebak ini ${verb.toLowerCase()}. Kalau salah, tap "Urungkan" lalu sebutkan lebih jelas, mis. "pemasukan ..." / "pengeluaran ...".)`;
    }

    res.status(201).json({ reply, created: true, transaction: tx });
  } catch (e) { next(e); }
});

module.exports = router;
