import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';
import { formatIDR, formatShort } from '../utils';
import { useToast } from '../components/Toast.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

export default function Budgets() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [data, setData] = useState([]);
  const [summary, setSummary] = useState({ total_limit: 0, total_spent: 0, total_remaining: 0 });
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const toast = useToast();

  const load = useCallback(() => {
    setLoading(true);
    api.listBudgets({ month, year })
      .then(r => { setData(r.data); setSummary(r.summary); })
      .finally(() => setLoading(false));
  }, [month, year]);

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener('tx:changed', onChange);
    return () => window.removeEventListener('tx:changed', onChange);
  }, [load]);

  async function handleDelete() {
    if (!confirmDelete) return;
    await api.deleteBudget(confirmDelete.id);
    toast.show('Budget dihapus');
    setConfirmDelete(null);
    load();
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  const today = new Date();
  const daysLeft = (today.getMonth() + 1 === month && today.getFullYear() === year)
    ? Math.max(0, daysInMonth - today.getDate())
    : daysInMonth;

  return (
    <>
      <div className="topbar"><h1>Budget</h1></div>
      <div className="page">
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <select className="select" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="select" value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>

        <div className="card card-lg" style={{ background: 'linear-gradient(135deg, #1a6b4a 0%, #2d9d6e 100%)', color: 'white', border: 'none' }}>
          <div style={{ fontSize: 12, opacity: 0.85 }}>Total Budget Bulan Ini</div>
          <div className="num" style={{ fontSize: 24, fontWeight: 700, margin: '4px 0 12px' }}>{formatIDR(summary.total_limit)}</div>
          <div className="row">
            <div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>Terpakai</div>
              <div className="num" style={{ fontWeight: 600 }}>{formatShort(summary.total_spent)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, opacity: 0.85 }}>Sisa</div>
              <div className="num" style={{ fontWeight: 600 }}>{formatShort(summary.total_remaining)}</div>
            </div>
          </div>
        </div>

        <button className="btn btn-block mb-3" onClick={() => setShowAdd(true)}>+ Tambah Budget</button>

        {loading ? (
          <div className="spinner-page"><div className="spinner" /></div>
        ) : data.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">🎯</div>
            <div className="empty-title">Belum ada budget</div>
            <div>Atur budget kategori untuk mulai memantau</div>
          </div>
        ) : (
          data.map(b => {
            const dailyAvail = daysLeft > 0 ? b.remaining_amount / daysLeft : 0;
            return (
              <div key={b.id} className="budget-item" onClick={() => setEditing(b)}>
                <div className="head">
                  <div className="name">{b.category.icon} {b.category.name}</div>
                  <span className={`badge ${b.status}`}>{b.percentage_used}%</span>
                </div>
                <div className="progress">
                  <div className={`bar ${b.status}`} style={{ width: Math.min(100, b.percentage_used) + '%' }} />
                </div>
                <div className="amounts flex-between">
                  <span>{formatIDR(b.spent_amount)} / {formatIDR(b.limit_amount)}</span>
                  {daysLeft > 0 && b.remaining_amount > 0 && (
                    <span style={{ fontSize: 11 }}>~{formatShort(dailyAvail)}/hari · {daysLeft} hari lagi</span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {showAdd && (
        <BudgetSheet
          month={month} year={year}
          existingCategoryIds={data.map(b => b.category.id)}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load(); }}
        />
      )}
      {editing && (
        <BudgetSheet
          editing={editing}
          month={month} year={year}
          existingCategoryIds={[]}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
          onDelete={() => { setConfirmDelete(editing); setEditing(null); }}
        />
      )}
      {confirmDelete && (
        <ConfirmModal
          title="Hapus budget?"
          message={`${confirmDelete.category.name} · ${formatIDR(confirmDelete.limit_amount)}`}
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </>
  );
}

function BudgetSheet({ editing, month, year, existingCategoryIds, onClose, onSaved, onDelete }) {
  const isEdit = !!editing;
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(editing?.category?.id || '');
  const [limit, setLimit] = useState(editing?.limit_amount ? String(editing.limit_amount) : '');
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  useEffect(() => {
    api.listCategories().then(r => {
      const expenses = r.data.filter(c => c.type === 'expense' || c.type === 'both');
      setCategories(isEdit ? expenses : expenses.filter(c => !existingCategoryIds.includes(c.id)));
    });
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    const num = Number(limit);
    if (!num || num <= 0) { setError('Limit harus > 0'); return; }
    if (!categoryId) { setError('Pilih kategori'); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await api.updateBudget(editing.id, { limit_amount: num });
        toast.show('Budget diperbarui');
      } else {
        await api.createBudget({ category_id: categoryId, limit_amount: num, period_month: month, period_year: year });
        toast.show('Budget tersimpan');
      }
      onSaved();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" onClick={e => e.stopPropagation()}>
        <div className="grab" />
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>{isEdit ? 'Edit Budget' : 'Tambah Budget'}</h3>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Kategori</label>
            <select className="select" value={categoryId} onChange={e => setCategoryId(e.target.value)} disabled={isEdit}>
              <option value="">Pilih kategori...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Limit (Rp)</label>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              value={limit}
              onChange={e => setLimit(e.target.value)}
              min="0"
              step="any"
              placeholder="1000000"
            />
          </div>
          {error && <div className="auth-error">{error}</div>}
          <div className="row">
            {isEdit && onDelete && (
              <button type="button" className="btn btn-danger" onClick={onDelete}>Hapus</button>
            )}
            <button type="submit" className="btn" disabled={saving}>
              {saving ? <span className="spinner" /> : 'Simpan'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
