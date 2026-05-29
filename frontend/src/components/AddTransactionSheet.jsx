import { useEffect, useState } from 'react';
import { api } from '../api';
import { formatIDR, todayISO, formatDateID } from '../utils';
import { useToast } from './Toast.jsx';

export default function AddTransactionSheet({ onClose, onSaved, initial }) {
  const isEdit = !!initial;
  const [type, setType] = useState(initial?.type || 'expense');
  const [amount, setAmount] = useState(initial?.amount ? String(initial.amount) : '');
  const [categoryId, setCategoryId] = useState(initial?.category?.id || '');
  const [date, setDate] = useState(initial?.transaction_date || todayISO());
  const [note, setNote] = useState(initial?.note || '');
  const [categories, setCategories] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const toast = useToast();

  useEffect(() => {
    api.listCategories().then(r => setCategories(r.data)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!isEdit) setCategoryId('');
  }, [type, isEdit]);

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
        <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>{isEdit ? 'Edit Transaksi' : 'Tambah Transaksi'}</h3>
        <div className="toggle-group">
          <button type="button" className={`toggle-btn ${type === 'expense' ? 'active expense' : ''}`} onClick={() => setType('expense')}>
            ↓ Pengeluaran
          </button>
          <button type="button" className={`toggle-btn ${type === 'income' ? 'active income' : ''}`} onClick={() => setType('income')}>
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
