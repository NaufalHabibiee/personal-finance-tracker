export function formatIDR(n) {
  if (n === null || n === undefined || isNaN(n)) return 'Rp 0';
  return 'Rp ' + Math.round(Number(n)).toLocaleString('id-ID');
}

export function formatShort(n) {
  const abs = Math.abs(Number(n) || 0);
  if (abs >= 1_000_000_000) return 'Rp ' + (n / 1_000_000_000).toFixed(1) + 'M';
  if (abs >= 1_000_000) return 'Rp ' + (n / 1_000_000).toFixed(1) + 'jt';
  if (abs >= 1_000) return 'Rp ' + (n / 1_000).toFixed(0) + 'rb';
  return formatIDR(n);
}

export function todayISO() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

const MONTHS_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const MONTHS_ID_LONG = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export function formatDateID(iso, opts = {}) {
  if (!iso) return '';
  const d = new Date(iso);
  const day = d.getDate();
  const month = (opts.long ? MONTHS_ID_LONG : MONTHS_ID)[d.getMonth()];
  return `${day} ${month} ${d.getFullYear()}`;
}

export function monthLabel(ym) {
  const [y, m] = ym.split('-');
  return `${MONTHS_ID[parseInt(m) - 1]} ${y.slice(2)}`;
}

export function groupByDate(items) {
  const map = new Map();
  items.forEach(it => {
    const key = it.transaction_date;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(it);
  });
  return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}
