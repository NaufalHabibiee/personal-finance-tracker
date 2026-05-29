require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./db');
const { uuid } = require('./util');
const { seedDefaultCategoriesForUser } = require('./seedHelpers');

const DEMO_EMAIL = 'demo@pft.app';
const DEMO_PASSWORD = 'demo1234';

function randint(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function isoDate(d) {
  return d.toISOString().slice(0, 10);
}

async function run() {
  // Ensure schema exists (cheap if already created)
  await db.ensureInit();

  console.log('Seeding demo data...');

  let user = await db.prepare('SELECT id FROM users WHERE email = ?').get(DEMO_EMAIL);
  if (user) {
    console.log('Demo user exists, wiping their data first...');
    await db.prepare('DELETE FROM transactions WHERE user_id = ?').run(user.id);
    await db.prepare('DELETE FROM budgets WHERE user_id = ?').run(user.id);
    await db.prepare('DELETE FROM categories WHERE user_id = ?').run(user.id);
  } else {
    const id = uuid();
    await db.prepare('INSERT INTO users (id,email,password_hash,full_name) VALUES (?,?,?,?)')
      .run(id, DEMO_EMAIL, bcrypt.hashSync(DEMO_PASSWORD, 10), 'Demo Rani');
    user = { id };
    console.log(`Created demo user: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  }

  await seedDefaultCategoriesForUser(user.id);
  const cats = await db.prepare('SELECT id,name,type FROM categories WHERE user_id = ?').all(user.id);
  const exp = cats.filter(c => c.type === 'expense');
  const inc = cats.filter(c => c.type === 'income');

  const expenseNotes = {
    'Makanan & Minuman': ['Makan siang warteg', 'Kopi pagi', 'Gojek food', 'Dinner sama tim', 'Sarapan nasi uduk'],
    'Transportasi': ['Gojek ke kantor', 'Grab pulang', 'Bensin motor', 'KRL', 'MRT Jakarta'],
    'Tagihan & Utilitas': ['Listrik PLN', 'Internet bulanan', 'Pulsa data', 'PDAM'],
    'Belanja': ['Indomaret', 'Tokopedia', 'Shopee', 'Belanja bulanan'],
    'Hiburan': ['Netflix', 'Spotify', 'Nonton bioskop', 'Konser'],
    'Kesehatan': ['Apotek', 'Vitamin', 'Konsul dokter'],
    'Edukasi': ['Buku Gramedia', 'Kursus online'],
    'Pakaian': ['Uniqlo', 'Sepatu olahraga'],
    'Travel': ['Tiket KA', 'Hotel weekend', 'Tiket pesawat'],
    'Lainnya': ['Misc']
  };

  const today = new Date();
  const txStmts = [];

  for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
    const base = new Date(today.getFullYear(), today.getMonth() - monthOffset, 1);
    const year = base.getFullYear();
    const month = base.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const gaji = inc.find(c => c.name === 'Gaji');
    if (gaji) {
      const payday = new Date(year, month, 25);
      txStmts.push({
        sql: 'INSERT INTO transactions (id,user_id,category_id,type,amount,note,transaction_date) VALUES (?,?,?,?,?,?,?)',
        args: [uuid(), user.id, gaji.id, 'income', 8500000 + randint(-200000, 500000), 'Gaji bulanan', isoDate(payday)]
      });
    }
    const freelance = inc.find(c => c.name === 'Freelance');
    if (freelance && Math.random() > 0.3) {
      const d = new Date(year, month, randint(5, 20));
      txStmts.push({
        sql: 'INSERT INTO transactions (id,user_id,category_id,type,amount,note,transaction_date) VALUES (?,?,?,?,?,?,?)',
        args: [uuid(), user.id, freelance.id, 'income', randint(1500000, 4500000), 'Project klien', isoDate(d)]
      });
    }

    const txCount = randint(25, 50);
    for (let i = 0; i < txCount; i++) {
      const cat = pick(exp);
      const day = randint(1, monthOffset === 0 ? today.getDate() : daysInMonth);
      const d = new Date(year, month, day);
      const amounts = {
        'Makanan & Minuman': () => randint(15000, 120000),
        'Transportasi': () => randint(10000, 80000),
        'Tagihan & Utilitas': () => randint(150000, 600000),
        'Belanja': () => randint(50000, 750000),
        'Hiburan': () => randint(35000, 350000),
        'Kesehatan': () => randint(25000, 400000),
        'Edukasi': () => randint(80000, 500000),
        'Pakaian': () => randint(150000, 800000),
        'Travel': () => randint(300000, 2500000),
        'Lainnya': () => randint(20000, 200000)
      };
      const amount = (amounts[cat.name] || (() => randint(20000, 200000)))();
      const notes = expenseNotes[cat.name] || ['—'];
      txStmts.push({
        sql: 'INSERT INTO transactions (id,user_id,category_id,type,amount,note,transaction_date) VALUES (?,?,?,?,?,?,?)',
        args: [uuid(), user.id, cat.id, 'expense', amount, pick(notes), isoDate(d)]
      });
    }
  }

  // libSQL batch caps around ~50 statements; chunk to be safe.
  const CHUNK = 40;
  for (let i = 0; i < txStmts.length; i += CHUNK) {
    await db.client.batch(txStmts.slice(i, i + CHUNK), 'write');
  }

  const budgetTargets = {
    'Makanan & Minuman': 1500000,
    'Transportasi': 700000,
    'Tagihan & Utilitas': 1200000,
    'Belanja': 1500000,
    'Hiburan': 500000
  };
  const m = today.getMonth() + 1;
  const y = today.getFullYear();
  const budgetStmts = [];
  for (const [name, amount] of Object.entries(budgetTargets)) {
    const c = exp.find(x => x.name === name);
    if (c) budgetStmts.push({
      sql: 'INSERT INTO budgets (id,user_id,category_id,limit_amount,period_month,period_year) VALUES (?,?,?,?,?,?)',
      args: [uuid(), user.id, c.id, amount, m, y]
    });
  }
  if (budgetStmts.length) await db.client.batch(budgetStmts, 'write');

  const totalRow = await db.prepare('SELECT COUNT(*) AS n FROM transactions WHERE user_id = ?').get(user.id);
  console.log(`Seeded ${totalRow.n} transactions for demo user.`);
  console.log(`Login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

run().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
