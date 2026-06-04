import { useEffect, useState } from 'react';
import { api } from '../api';
import { formatIDR, todayISO, formatDateID } from '../utils';
import { useToast } from './Toast.jsx';

export default function AddTransactionSheet({ onClose, onSaved, initial, prefill }) {
  const isEdit = !!initial;
  const src = initial || prefill || {};
  const [type, setType] = useState(src.type || 'expense');
  const [amount, setAmount] = useState(src.amount ? String(src.amount) : '');
  const [categoryId, setCategoryId] = useState(src.category?.id || src.category_id || '');
  const [date, setDate] = useState(src.transaction_date || src.date || todayISO());
  const [note, setNote] = useState(src.note || '');
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  useEffect(() => {
    api.listCategories().then(r => {
      setCategories(r.data);
      // Resolve a prefilled category name (from receipt scan) → real category id.
      if (!isEdit && prefill?.categoryName) {
        const want = prefill.categoryName.toLowerCase();
        const wantType = prefill.type || 'expense';
        const match = r.data.find(c => c.name.toLowerCase() === want && (c.type === wantType || c.type === 'both'));
        if (match) setCategoryId(match.id);
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function switchType(next) {
    setType(next);
    if (!isEdit) setCategoryId('');
  }

  const filtered = categories.filter(c => c.type === type || c.type === 'both');

  async function handleSubmit(e, addAnother = false) {
    e.preventDefault();
    setError(null);
    const num = Number(amount);
    if (!num || num <= 0) { setError('Nominal harus lebih dari 0'); return; }
    if (!categoryId) { setError('Pilih kategori'); return; }
    setSaving(true);
    try {
      const body = { type, amount: num, category_id: categoryId, transaction_date: date, note: note || null };
      if (isEdit) await api.updateTransaction(initial.id, body);
      else await api.createTransaction(body);
      toast.show(isEdit ? 'Transaksi diperbarui' : 'Transaksi tersimpan');
      onSaved?.();
      if (addAnother) {
        setAmount(''); setNote(''); setError(null);
      } else {
        onClose();
      }
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
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>
          {isEdit ? 'Edit Transaksi' : prefill ? '🧾 Konfirmasi dari Struk' : 'Tambah Transaksi'}
        </h3>
        {prefill && (
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: -8, marginBottom: 12 }}>
            Hasil scan otomatis — periksa & koreksi bila perlu, lalu Simpan.
          </div>
        )}
        <div className="toggle-group">
          <button type="button" className={`toggle-btn ${type === 'expense' ? 'active expense' : ''}`} onClick={() => switchType('expense')}>
            ↓ Pengeluaran
          </button>
          <button type="button" className={`toggle-btn ${type === 'income' ? 'active income' : ''}`} onClick={() => switchType('income')}>
            ↑ Pemasukan
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nominal</label>
            <input
              className="amount-input"
              type="number"
              inputMode="numeric"
              placeholder="0"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              autoFocus
              min="0"
              step="any"
            />
            {amount && <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>{formatIDR(amount)}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Kategori</label>
            <div className="cat-grid">
              {filtered.map(c => (
                <button
                  type="button"
                  key={c.id}
                  className={`cat-item ${categoryId === c.id ? 'active' : ''}`}
                  onClick={() => setCategoryId(c.id)}
                >
                  <span className="ico">{c.icon}</span>
                  <span>{c.name.length > 10 ? c.name.slice(0, 9) + '…' : c.name}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Tanggal</label>
            <input className="input" type="date" value={date} onChange={e => setDate(e.target.value)} />
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{formatDateID(date, { long: true })}</div>
          </div>

          <div className="form-group">
            <label className="form-label">Catatan (opsional)</label>
            <textarea
              className="textarea"
              placeholder="Catatan..."
              value={note}
              onChange={e => setNote(e.target.value.slice(0, 200))}
              maxLength={200}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <div className="row">
            {!isEdit && (
              <button type="button" className="btn btn-secondary" onClick={(e) => handleSubmit(e, true)} disabled={saving}>
                Simpan & Lagi
              </button>
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
