import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Register() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) { setError('Password minimal 8 karakter'); return; }
    if (password !== confirm) { setError('Password tidak cocok'); return; }
    setLoading(true);
    try {
      await signup(email, password, fullName || null);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="auth-logo">💰 Finance Tracker</div>
      <p className="auth-tagline">Mulai mengelola keuangan Anda</p>
      <form onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}
        <div className="form-group">
          <label className="form-label">Nama lengkap</label>
          <input className="input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Nama Anda" />
        </div>
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
        </div>
        <div className="form-group">
          <label className="form-label">Konfirmasi password</label>
          <input className="input" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={8} />
        </div>
        <button className="btn btn-block" type="submit" disabled={loading}>
          {loading ? <span className="spinner" /> : 'Daftar'}
        </button>
      </form>
      <div className="auth-link">
        Sudah punya akun? <Link to="/login">Masuk</Link>
      </div>
    </div>
  );
}
