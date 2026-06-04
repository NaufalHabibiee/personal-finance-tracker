// Parse raw OCR text from a shopping receipt into a transaction draft.
// Pure function (no DOM) so it can be unit-tested in Node.
//
// Returns: { amount, date, note, categoryName }
//   amount       number|null  — detected total
//   date         string|null  — ISO yyyy-mm-dd, or null if not found
//   note         string       — merchant / description guess
//   categoryName string       — best-guess expense category name

// Convert a money-like token ("Rp 50.000", "125.500,00", "12000") to integer rupiah.
function toRupiah(raw) {
  let t = String(raw).toLowerCase().replace(/rp\.?/g, '').replace(/\s/g, '');
  // Drop ",00" / ".00" cents at the end.
  t = t.replace(/[.,]\d{2}$/, m => (m.slice(1) === '00' ? '' : m));
  const digits = t.replace(/[.,]/g, '');
  const n = parseInt(digits, 10);
  return Number.isFinite(n) ? n : 0;
}

// Find money tokens in a line: grouped (1.500 / 12,000 / 125.500,00) or 4+ plain digits.
const MONEY_RE = /(?:rp\.?\s*)?(\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{2})?|\d{4,})/gi;
function extractMoney(line) {
  const out = [];
  let m;
  MONEY_RE.lastIndex = 0;
  while ((m = MONEY_RE.exec(line)) !== null) {
    const val = toRupiah(m[1]);
    if (val > 0) out.push(val);
  }
  return out;
}

// Priority order: more specific "total" wins over generic / cash-tendered lines.
const TOTAL_KEYWORDS = [
  'grand total', 'total bayar', 'total belanja', 'total tagihan', 'total harga',
  'total akhir', 'total', 'jumlah', 'subtotal', 'tunai', 'cash', 'bayar', 'dibayar',
];

function detectAmount(lines, fullText) {
  for (const kw of TOTAL_KEYWORDS) {
    for (const line of lines) {
      if (!line.includes(kw)) continue;
      if (line.includes('kembali') || line.includes('change')) continue; // skip change line
      if (kw === 'total' && line.includes('subtotal')) continue;          // handled separately
      const nums = extractMoney(line);
      if (nums.length) return nums[nums.length - 1]; // amount is usually right-most
    }
  }
  // Fallback: the largest money token anywhere (totals are usually the biggest).
  let best = 0;
  for (const line of lines) {
    for (const n of extractMoney(line)) if (n > best) best = n;
  }
  if (best === 0) {
    for (const n of extractMoney(fullText)) if (n > best) best = n;
  }
  return best > 0 ? best : null;
}

function detectDate(text) {
  const m = text.match(/(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*[\/\-.]\s*(\d{2,4})/);
  if (!m) return null;
  let d = parseInt(m[1], 10);
  let mo = parseInt(m[2], 10);
  let y = parseInt(m[3], 10);
  if (y < 100) y += 2000;
  // If first group can't be a day but second can, assume mm/dd ordering.
  if (d > 31 && mo <= 31) { const t = d; d = mo; mo = t; }
  if (mo > 12 && d <= 12) { const t = d; d = mo; mo = t; } // swap if month invalid
  if (mo < 1 || mo > 12 || d < 1 || d > 31 || y < 2000 || y > 2100) return null;
  const iso = `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  return iso;
}

const CATEGORY_HINTS = [
  { name: 'Makanan & Minuman', kw: ['resto', 'restaurant', 'cafe', 'kafe', 'kopi', 'coffee', 'warung', 'rumah makan', 'food', 'menu', 'ayam', 'bakso', 'mie', 'nasi', 'seafood', 'steak', 'pizza', 'burger', 'kfc', 'mcd', 'mcdonald', 'starbucks', 'bakery', 'roti', 'donut', 'es teh', 'minuman'] },
  { name: 'Kesehatan', kw: ['apotek', 'apotik', 'farma', 'guardian', 'watson', 'klinik', 'rumah sakit', 'apotech'] },
  { name: 'Transportasi', kw: ['spbu', 'pertamina', 'shell', 'vivo', 'bensin', 'pertamax', 'pertalite', 'solar', 'parkir', 'tol'] },
  { name: 'Belanja', kw: ['indomaret', 'alfamart', 'supermarket', 'minimarket', 'hypermart', 'superindo', 'transmart', 'mall', 'store', 'mart', 'swalayan'] },
];

function detectCategory(text, header = '') {
  // The store name (top of receipt) is a stronger signal than item names,
  // so match the header first, then fall back to the whole text.
  for (const scope of [header, text]) {
    if (!scope) continue;
    for (const { name, kw } of CATEGORY_HINTS) {
      for (const k of kw) {
        if (scope.includes(k)) return name;
      }
    }
  }
  return 'Belanja'; // sensible default for a shopping receipt
}

function detectMerchant(rawLines) {
  for (const line of rawLines) {
    const l = line.trim();
    if (l.length < 3) continue;
    const letters = (l.match(/[a-zA-Z]/g) || []).length;
    const digits = (l.match(/\d/g) || []).length;
    // First line that's mostly letters → likely the store name.
    if (letters >= 3 && letters >= digits) {
      return l.replace(/\s+/g, ' ').slice(0, 60);
    }
  }
  return '';
}

export function parseReceipt(rawText) {
  const text = (rawText || '').toLowerCase();
  const rawLines = (rawText || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const lines = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);

  const amount = detectAmount(lines, text);
  const date = detectDate(text);
  const merchant = detectMerchant(rawLines);
  // Header = first ~3 lines (lowercased) — where the store name lives.
  const header = lines.slice(0, 3).join(' ');
  const categoryName = detectCategory(text, header);

  const note = merchant
    ? `Struk: ${merchant}`
    : 'Struk belanja';

  return { amount, date, note, categoryName };
}

// Exposed for tests.
export const __test = { toRupiah, extractMoney, detectAmount, detectDate, detectCategory };
