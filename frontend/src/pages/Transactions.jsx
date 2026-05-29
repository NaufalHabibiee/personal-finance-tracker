import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { formatIDR, formatDateID, groupByDate } from '../utils';
import AddTransactionSheet from '../components/AddTransactionSheet.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';
import { useToast } from '../components/Toast.jsx';

export default function Transactions() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState({ type: '', search: '' });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    const params = { limit: 100 };
    if (filter.type) params.type = filter.type;
    if (filter.search) params.search = filter.search;
    api.listTransactions(params)
      .then(r => setItems(r.data))
      .finally(() => setLoading(false));
  }, [filter]);

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener('tx:changed', onChange);
    return () => window.removeEventListener('tx:changed', onChange);
  }, [load]);

  async function handleDelete() {
    if (!confirmDelete) return;
    try {
      await api.deleteTransaction(confirmDelete.id);
      toast.show('Transaksi dihapus');
      setConfirmDelete(null);
      load();
    } catch (err) {
      toast.show(err.message);
    }
  }

  const grouped = groupByDate(items);

  return (
    <>
      <div className="topbar"><h1>Transaksi</h1></div>
      <div className="page">
        <input
          className="input mb-3"
          placeholder="🔍 Cari catatan..."
          value={filter.search}
          onChange={e => setFilter(f => ({ ...f, search: e.target.value }))}
        />
        <div className="filter-bar">
          <div className={`chip ${filter.type === '' ? 'active' : ''}`} onClick={() => setFilter(f => ({ ...f, type: '' }))}>Semua</div>
          <div className={`chip ${filter.type === 'expense' ? 'active' : ''}`} onClick={() => setFilter(f => ({ ...f, type: 'expense' }))}>Pengeluaran</div>
          <div className={`chip ${filter.type === 'income' ? 'active' : ''}`} onClick={() => setFilter(f => ({ ...f, type: 'income' }))}>Pemasukan</div>
        </div>

        {loading ? (
          <div className="spinner-page"><div className="spinner" /></div>
        ) : grouped.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📝</div>
            <div className="empty-title">Belum ada transaksi</div>
            <div>Tekan tombol + untuk menambah</div>
          </div>
        ) : (
          grouped.map(([date, list]) => {
            const dayTotal = list.reduce((acc, t) => acc + (t.type === 'income' ? t.amount : -t.amount), 0);
            return (
              <div key={date}>
                <div className="tx-group-header">
                  <span>{formatDateID(date, { long: true })}</span>
                  <span className={`num ${dayTotal >= 0 ? 'text-income' : 'text-expense'}`}>
                    {dayTotal >= 0 ? '+' : ''}{formatIDR(dayTotal)}
                  </span>
                </div>
                <div className="tx-list">
                  {list.map(t => (
                    <div key={t.id} className="tx-item" onClick={() => setEditing(t)}>
                      <div className="tx-icon" style={{ background: t.category.color + '22' }}>{t.category.icon}</div>
                      <div className="tx-info">
                        <div className="tx-name">{t.category.name}</div>
                        {t.note && <div className="tx-note">{t.note}</div>}
                      </div>
                      <div className={`tx-amount ${t.type}`}>
                        {t.type === 'expense' ? '-' : '+'}{formatIDR(t.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {editing && (
        <>
          <AddTransactionSheet
            initial={editing}
            onClose={() => setEditing(null)}
            onSaved={() => { setEditing(null); load(); }}
          />
          <button
            className="btn btn-danger"
            style={{ position: 'fixed', bottom: 24, left: 24, zIndex: 102 }}
            onClick={() => { setConfirmDelete(editing); setEditing(null); }}
          >
            🗑 Hapus
          </button>
        </>
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Hapus transaksi?"
          message={`${confirmDelete.category.name} · ${formatIDR(confirmDelete.amount)}. Tindakan ini tidak bisa dibatalkan.`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
}
