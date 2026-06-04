import { api } from './api';
import { formatDateID } from './utils';

// Fetch every transaction across all pages (API caps limit at 100/page).
export async function fetchAllTransactions() {
  let page = 1;
  let all = [];
  // Hard safety cap so a bug can never loop forever.
  for (let guard = 0; guard < 1000; guard++) {
    const r = await api.listTransactions({ page, limit: 100 });
    all = all.concat(r.data || []);
    const totalPages = r.pagination?.total_pages || 1;
    if (page >= totalPages) break;
    page++;
  }
  return all;
}

const MONEY_FMT = '#,##0';

function setNumberFormat(XLSX, ws, colIndexes) {
  if (!ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    for (const c of colIndexes) {
      const addr = XLSX.utils.encode_cell({ r, c });
      const cell = ws[addr];
      if (cell && typeof cell.v === 'number') cell.z = MONEY_FMT;
    }
  }
}

function monthKey(iso) {
  return (iso || '').slice(0, 7); // YYYY-MM
}

const MONTHS_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
function monthLabelLong(ym) {
  const [y, m] = ym.split('-');
  const idx = parseInt(m, 10) - 1;
  return `${MONTHS_LONG[idx] || m} ${y}`;
}

// Build and download the .xlsx workbook from all the user's transactions.
export async function exportFinanceReport() {
  const txs = await fetchAllTransactions();
  if (txs.length === 0) {
    const err = new Error('Belum ada transaksi untuk diekspor');
    err.code = 'EMPTY';
    throw err;
  }

  // Lazy-load SheetJS only when exporting (keeps the main bundle small).
  const xlsxMod = await import('xlsx');
  const XLSX = xlsxMod.default ?? xlsxMod;

  const wb = XLSX.utils.book_new();

  // ---- Sheet 1: Transaksi (detail) ----
  const sorted = txs.slice().sort((a, b) => {
    if (a.transaction_date === b.transaction_date) return (b.created_at || '').localeCompare(a.created_at || '');
    return b.transaction_date.localeCompare(a.transaction_date);
  });
  const txHeader = ['Tanggal', 'Tipe', 'Kategori', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Catatan'];
  const txRows = sorted.map(t => [
    formatDateID(t.transaction_date, { long: true }),
    t.type === 'income' ? 'Pemasukan' : 'Pengeluaran',
    t.category?.name || '-',
    t.type === 'income' ? t.amount : '',
    t.type === 'expense' ? t.amount : '',
    t.note || '',
  ]);
  const totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  txRows.push([]);
  txRows.push(['', '', 'TOTAL', totalIncome, totalExpense, '']);
  txRows.push(['', '', 'SALDO (Net)', totalIncome - totalExpense, '', '']);

  const wsTx = XLSX.utils.aoa_to_sheet([txHeader, ...txRows]);
  wsTx['!cols'] = [{ wch: 20 }, { wch: 13 }, { wch: 22 }, { wch: 16 }, { wch: 16 }, { wch: 32 }];
  setNumberFormat(XLSX, wsTx, [3, 4]);
  XLSX.utils.book_append_sheet(wb, wsTx, 'Transaksi');

  // ---- Sheet 2: Ringkasan Bulanan ----
  const monthly = new Map();
  for (const t of txs) {
    const k = monthKey(t.transaction_date);
    if (!monthly.has(k)) monthly.set(k, { income: 0, expense: 0 });
    const m = monthly.get(k);
    if (t.type === 'income') m.income += t.amount; else m.expense += t.amount;
  }
  const monthlyKeys = Array.from(monthly.keys()).sort();
  const monHeader = ['Bulan', 'Pemasukan (Rp)', 'Pengeluaran (Rp)', 'Net (Rp)'];
  const monRows = monthlyKeys.map(k => {
    const m = monthly.get(k);
    return [monthLabelLong(k), m.income, m.expense, m.income - m.expense];
  });
  monRows.push([]);
  monRows.push(['TOTAL', totalIncome, totalExpense, totalIncome - totalExpense]);
  const wsMon = XLSX.utils.aoa_to_sheet([monHeader, ...monRows]);
  wsMon['!cols'] = [{ wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 16 }];
  setNumberFormat(XLSX, wsMon, [1, 2, 3]);
  XLSX.utils.book_append_sheet(wb, wsMon, 'Ringkasan Bulanan');

  // ---- Sheet 3: Per Kategori ----
  const byCat = new Map();
  for (const t of txs) {
    const name = t.category?.name || '-';
    const key = `${t.type}::${name}`;
    if (!byCat.has(key)) byCat.set(key, { name, type: t.type, total: 0, count: 0 });
    const c = byCat.get(key);
    c.total += t.amount;
    c.count += 1;
  }
  const catRows = Array.from(byCat.values())
    .sort((a, b) => (a.type === b.type ? b.total - a.total : a.type === 'income' ? -1 : 1))
    .map(c => [c.name, c.type === 'income' ? 'Pemasukan' : 'Pengeluaran', c.total, c.count]);
  const wsCat = XLSX.utils.aoa_to_sheet([['Kategori', 'Tipe', 'Total (Rp)', 'Jumlah Transaksi'], ...catRows]);
  wsCat['!cols'] = [{ wch: 22 }, { wch: 13 }, { wch: 16 }, { wch: 16 }];
  setNumberFormat(XLSX, wsCat, [2]);
  XLSX.utils.book_append_sheet(wb, wsCat, 'Per Kategori');

  const today = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `Laporan-Keuangan-${today}.xlsx`);
  return { count: txs.length };
}
