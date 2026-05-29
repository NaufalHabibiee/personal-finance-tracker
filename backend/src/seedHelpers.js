const db = require('./db');
const { uuid } = require('./util');

const DEFAULT_EXPENSE = [
  { name: 'Makanan & Minuman', icon: '🍔', color: '#e85d24' },
  { name: 'Transportasi', icon: '🚗', color: '#2563eb' },
  { name: 'Tagihan & Utilitas', icon: '🏠', color: '#7c3aed' },
  { name: 'Belanja', icon: '🛒', color: '#db2777' },
  { name: 'Hiburan', icon: '🎬', color: '#f59e0b' },
  { name: 'Kesehatan', icon: '🏥', color: '#dc2626' },
  { name: 'Edukasi', icon: '📚', color: '#0891b2' },
  { name: 'Pakaian', icon: '👕', color: '#9333ea' },
  { name: 'Travel', icon: '✈️', color: '#0d9488' },
  { name: 'Lainnya', icon: '📦', color: '#64748b' }
];

const DEFAULT_INCOME = [
  { name: 'Gaji', icon: '💼', color: '#16a34a' },
  { name: 'Freelance', icon: '💰', color: '#059669' },
  { name: 'Bonus', icon: '🎁', color: '#f59e0b' },
  { name: 'Investasi', icon: '📈', color: '#0891b2' },
  { name: 'Lainnya', icon: '💵', color: '#64748b' }
];

async function seedDefaultCategoriesForUser(userId) {
  const sql = 'INSERT INTO categories (id,user_id,name,icon,color,type,is_default,sort_order) VALUES (?,?,?,?,?,?,1,?)';
  const stmts = [];
  DEFAULT_EXPENSE.forEach((c, i) => stmts.push({ sql, args: [uuid(), userId, c.name, c.icon, c.color, 'expense', i] }));
  DEFAULT_INCOME.forEach((c, i) => stmts.push({ sql, args: [uuid(), userId, c.name, c.icon, c.color, 'income', i] }));
  await db.client.batch(stmts, 'write');
}

module.exports = { seedDefaultCategoriesForUser, DEFAULT_EXPENSE, DEFAULT_INCOME };
