import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth.jsx';
import { useToast } from '../components/Toast.jsx';
import ConfirmModal from '../components/ConfirmModal.jsx';

export default function Profile() {
  const { user, setUser, signout } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [showLogout, setShowLogout] = useState(false);
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [currency, setCurrency] = useState(user?.currency || 'IDR');
  const [showCats, setShowCats] = useState(false);
  const [categories, setCategories] = useState([]);
  const [catForm, setCatForm] = useState({ name: '', icon: '🍔', color: '#1a6b4a', type: 'expense' });

  useEffect(() => {
    if (showCats) api.listCategories().then(r => setCategories(r.data));
  }, [showCats]);

  async function handleSaveProfile() {
    try {
      const r = await api.updateMe({ full_name: fullName, currency });
      setUser(r.user);
      toast.show('Profil diperbarui');
      setEditing(false);
    } catch (err) { toast.show(err.message); }
  }

  async function handleAddCategory(e) {
    e.preventDefault();
    try {
      await api.createCategory(catForm);
      const r = await api.listCategories();
      setCategories(r.data);
      setCatForm({ name: '', icon: '🍔', color: '#1a6b4a', type: 'expense' });
      toast.show('Kategori ditambahkan');
    } catch (err) { toast.show(err.message); }
  }

  async function handleDeleteCategory(id) {
    try {
      await api.deleteCategory(id);
      const r = await api.listCategories();
      setCategories(r.data);
      toast.show('Kategori dihapus');
    } catch (err) { toast.show(err.message); }
  }

  function doLogout() {
    signout();
    navigate('/login');
  }

  return (
    <>
      <div className="topbar"><h1>Profil</h1></div>
      <div className="page">
        <div className="card card-lg" style={{ textAlign: 'center' }}>
          <div style={{
            width: 72, height: 72, margin: '0 auto 8px',
            borderRadius: '50%', background: 'var(--primary)', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 28, fontWeight: 700
          }}>
            {(user?.full_name || user?.email || '?')[0].toUpperCase()}
          </div>
          <div style={{ fontWeight: 600, fontSize: 16 }}>{user?.full_name || '—'}</div>
          <div className="text-muted" style={{ fontSize: 13 }}>{user?.email}</div>
        </div>

        <div className="profile-menu mb-3">
          <div className="menu-item" onClick={() => setEditing(true)}>
            <span>✏️ Edit Profil</span>
            <span className="text-muted">›</span>
          </div>
          <div className="menu-item" onClick={() => setShowCats(true)}>
            <span>📁 Kelola Kategori</span>
            <span className="text-muted">›</span>
          </div>
          <div className="menu-item">
            <span>💱 Mata Uang</span>
            <span className="text-muted">{user?.currency || 'IDR'}</span>
          </div>
          <div className="menu-item" onClick={() => setShowLogout(true)}>
            <span style={{ color: 'var(--expense)' }}>🚪 Logout</span>
            <span className="text-muted">›</span>
          </div>
        </div>

        <div style={{ textAlign: 'center', color: 'var(--text-soft)', fontSize: 11 }}>
          Personal Finance Tracker v1.0
        </div>
      </div>

      {editing && (
        <>
          <div className="sheet-backdrop" onClick={() => setEditing(false)} />
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="grab" />
            <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Edit Profil</h3>
            <div className="form-group">
              <label className="form-label">Nama lengkap</label>
              <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Mata uang</label>
              <select className="select" value={currency} onChange={e => setCurrency(e.target.value)}>
                <option value="IDR">IDR — Rupiah</option>
                <option value="USD">USD — Dollar</option>
                <option value="EUR">EUR — Euro</option>
              </select>
            </div>
            <button className="btn btn-block" onClick={handleSaveProfile}>Simpan</button>
          </div>
        </>
      )}

      {showCats && (
        <>
          <div className="sheet-backdrop" onClick={() => setShowCats(false)} />
          <div className="sheet" onClick={e => e.stopPropagation()}>
            <div className="grab" />
            <h3 style={{ margin: '0 0 12px', fontSize: 16 }}>Kelola Kategori</h3>
            <form onSubmit={handleAddCategory} style={{ marginBottom: 16 }}>
              <div className="row" style={{ marginBottom: 8 }}>
                <input className="input" style={{ flex: 0, width: 60, textAlign: 'center', fontSize: 18 }} value={catForm.icon} onChange={e => setCatForm({ ...catForm, icon: e.target.value })} maxLength={2} />
                <input className="input" placeholder="Nama kategori" value={catForm.name} onChange={e => setCatForm({ ...catForm, name: e.target.value })} required />
              </div>
              <div className="row" style={{ marginBottom: 8 }}>
                <select className="select" value={catForm.type} onChange={e => setCatForm({ ...catForm, type: e.target.value })}>
                  <option value="expense">Pengeluaran</option>
                  <option value="income">Pemasukan</option>
                </select>
                <input className="input" type="color" value={catForm.color} onChange={e => setCatForm({ ...catForm, color: e.target.value })} style={{ height: 40 }} />
              </div>
              <button className="btn btn-block btn-sm">+ Tambah Kategori</button>
            </form>

            <div style={{ maxHeight: '50vh', overflowY: 'auto' }}>
              {categories.map(c => (
                <div key={c.id} className="flex-between" style={{ padding: '10px 4px', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{c.icon}</span>
                    <span>{c.name}</span>
                    <span className="badge" style={{ background: c.color + '22', color: c.color }}>{c.type}</span>
                  </span>
                  {!c.is_default && (
                    <button className="btn btn-sm btn-danger" onClick={() => handleDeleteCategory(c.id)}>🗑</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {showLogout && (
        <ConfirmModal
          title="Logout dari akun?"
          message="Anda perlu masuk kembali untuk mengakses data."
          confirmLabel="Logout"
          onConfirm={doLogout}
          onCancel={() => setShowLogout(false)}
        />
      )}
    </>
  );
}
