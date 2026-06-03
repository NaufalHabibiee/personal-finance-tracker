// Rule-based natural-language parser (Bahasa Indonesia) for the finance
// assistant. Turns a free-text message like "gaji 5 juta" or "beli kopi 25rb"
// into a structured transaction { type, amount, category, note }.
//
// No external API — 100% local, deterministic, free.

// ---------- Type detection ----------
const INCOME_KW = [
  'gaji', 'gajian', 'gajinya', 'pemasukan', 'pendapatan', 'penghasilan',
  'terima', 'diterima', 'nerima', 'dapat', 'dapet', 'masuk', 'uang masuk',
  'bonus', 'thr', 'untung', 'profit', 'laba', 'dividen', 'deviden', 'bunga',
  'hadiah', 'hibah', 'jual', 'terjual', 'penjualan', 'jualan', 'laku',
  'refund', 'cashback', 'komisi', 'fee', 'honor', 'honorarium', 'royalti',
  'kiriman', 'dikirimin', 'transferan', 'income', 'salary', 'freelance',
  'omzet', 'omset', 'gajih'
];

const EXPENSE_KW = [
  'beli', 'belanja', 'bayar', 'bayarin', 'jajan', 'makan', 'minum', 'ngopi',
  'ongkos', 'bensin', 'parkir', 'tol', 'transport', 'grab', 'gojek', 'ojek',
  'top up', 'topup', 'isi', 'pulsa', 'kuota', 'listrik', 'pdam', 'wifi',
  'internet', 'langganan', 'tagihan', 'cicilan', 'kredit', 'sewa', 'kos',
  'kontrakan', 'traktir', 'donasi', 'sedekah', 'zakat', 'kasih', 'ngasih',
  'keluar', 'pengeluaran', 'uang keluar', 'spend', 'nonton', 'tiket',
  'service', 'servis', 'potong', 'cukur'
];

function countHits(text, words) {
  let n = 0;
  for (const w of words) {
    // word-ish boundary match so "makan" doesn't match inside "memakan"... is fine here.
    const re = new RegExp('(^|[^a-z])' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)', 'i');
    if (re.test(text)) n++;
  }
  return n;
}

function detectType(text) {
  const inc = countHits(text, INCOME_KW);
  const exp = countHits(text, EXPENSE_KW);
  if (inc > exp) return { type: 'income', confident: true };
  if (exp > inc) return { type: 'expense', confident: true };
  // No / equal keyword signal → assume expense (the most common case).
  return { type: 'expense', confident: false };
}

// ---------- Amount parsing ----------
// Numbers preceding a multiplier word are treated as decimals ("1.5 juta").
function decimalNum(str) {
  return parseFloat(str.replace(',', '.')) || 0;
}

// Plain numbers: strip "." and "," as thousand separators → integer.
function plainNum(str) {
  const digits = str.replace(/[.,\s]/g, '');
  return parseInt(digits, 10) || 0;
}

const MULTIPLIERS = [
  { re: /(\d+(?:[.,]\d+)?)\s*(?:miliar|milyar)\b/gi, factor: 1e9 },
  { re: /(\d+(?:[.,]\d+)?)\s*(?:juta|jt)\b/gi, factor: 1e6 },
  { re: /(\d+(?:[.,]\d+)?)\s*(?:ribu|rb|rebu|k)\b/gi, factor: 1e3 },
];

function parseAmount(raw) {
  // Normalize a few common phrasings.
  let text = ' ' + raw.toLowerCase() + ' ';
  text = text
    .replace(/\bsetengah\s+juta\b/g, '500 ribu')
    .replace(/\bsetengah\s+(jt|juta)\b/g, '500 ribu')
    .replace(/\bse(?:tengah)?\s*juta\b/g, '500 ribu')
    .replace(/\bseratus\b/g, '100')
    .replace(/\bsejuta\b/g, '1 juta')
    .replace(/\bseribu\b/g, '1 ribu');

  let total = 0;
  let matched = false;
  for (const { re, factor } of MULTIPLIERS) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(text)) !== null) {
      total += decimalNum(m[1]) * factor;
      matched = true;
    }
  }
  if (matched && total > 0) return Math.round(total);

  // Fallback: pick the largest plain number-like token in the text.
  const tokens = text.match(/\d[\d.,]*/g) || [];
  let best = 0;
  for (const t of tokens) {
    const n = plainNum(t);
    if (n > best) best = n;
  }
  return best > 0 ? best : null;
}

// ---------- Category matching ----------
// Keyword → preferred default category name. We then resolve against the
// user's actual categories (by case-insensitive name match).
const EXPENSE_HINTS = {
  'Makanan & Minuman': ['makan', 'minum', 'ngopi', 'kopi', 'jajan', 'resto', 'restoran', 'warung', 'cafe', 'kafe', 'gofood', 'grabfood', 'nasi', 'ayam', 'bakso', 'mie', 'sarapan', 'lunch', 'dinner', 'snack', 'cemilan', 'kuliner'],
  'Transportasi': ['bensin', 'grab', 'gojek', 'ojek', 'ojol', 'transport', 'parkir', 'tol', 'busway', 'mrt', 'krl', 'kereta', 'taksi', 'taxi', 'ongkos', 'angkot', 'pertamax', 'pertalite', 'solar', 'travel pp'],
  'Tagihan & Utilitas': ['listrik', 'token', 'pdam', 'air', 'wifi', 'internet', 'pulsa', 'kuota', 'tagihan', 'indihome', 'pln'],
  'Belanja': ['belanja', 'mall', 'supermarket', 'indomaret', 'alfamart', 'shopee', 'tokopedia', 'lazada', 'olshop', 'groceries'],
  'Hiburan': ['nonton', 'film', 'bioskop', 'movie', 'game', 'spotify', 'netflix', 'youtube', 'hiburan', 'konser', 'karaoke', 'liburan kecil'],
  'Kesehatan': ['dokter', 'obat', 'rumah sakit', 'apotek', 'apotik', 'vitamin', 'sehat', 'klinik', 'bpjs', 'medis'],
  'Edukasi': ['sekolah', 'kuliah', 'kursus', 'buku', 'les', 'edukasi', 'seminar', 'webinar', 'pelatihan', 'spp'],
  'Pakaian': ['baju', 'celana', 'sepatu', 'pakaian', 'kaos', 'jaket', 'sandal', 'fashion'],
  'Travel': ['travel', 'liburan', 'hotel', 'pesawat', 'wisata', 'tiket pesawat', 'penginapan', 'villa', 'staycation'],
};

const INCOME_HINTS = {
  'Gaji': ['gaji', 'gajian', 'salary', 'gajih'],
  'Freelance': ['freelance', 'project', 'proyek', 'klien', 'client', 'fee', 'honor', 'jasa'],
  'Bonus': ['bonus', 'thr', 'hadiah', 'komisi', 'cashback'],
  'Investasi': ['investasi', 'saham', 'dividen', 'deviden', 'bunga', 'reksadana', 'reksa dana', 'crypto', 'kripto', 'profit', 'trading'],
};

function findCategory(categories, name) {
  const target = name.toLowerCase();
  return categories.find(c => c.name.toLowerCase() === target) || null;
}

function matchCategory(text, type, categories) {
  const lower = ' ' + text.toLowerCase() + ' ';
  const pool = categories.filter(c => c.type === type || c.type === 'both');
  if (pool.length === 0) return null;

  // 1) Direct: the user's own category name appears in the message.
  for (const c of pool) {
    const nm = c.name.toLowerCase();
    if (nm.length >= 4 && lower.includes(nm)) return c;
  }

  // 2) Keyword hints → preferred default category name.
  const hints = type === 'income' ? INCOME_HINTS : EXPENSE_HINTS;
  for (const [catName, keywords] of Object.entries(hints)) {
    for (const kw of keywords) {
      const re = new RegExp('(^|[^a-z])' + kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)', 'i');
      if (re.test(lower)) {
        const found = findCategory(pool, catName);
        if (found) return found;
      }
    }
  }

  // 3) Fallback: "Lainnya" of that type, else first available.
  return findCategory(pool, 'Lainnya') || pool[0];
}

// ---------- Orchestrator ----------
function parseMessage(text, categories) {
  const message = (text || '').trim();
  const amount = parseAmount(message);
  const { type, confident: typeConfident } = detectType(message);
  const category = matchCategory(message, type, categories);

  return {
    ok: amount !== null && amount > 0 && !!category,
    amount,
    type,
    typeConfident,
    category,
    note: message.slice(0, 200),
  };
}

module.exports = {
  parseMessage,
  parseAmount,
  detectType,
  matchCategory,
};
