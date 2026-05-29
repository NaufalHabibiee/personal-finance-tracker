import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

export default function Login() {
  const [email, setEmail] = useState('demo@pft.app');
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const { signin } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null); setLoading(true);
    try {
      await signin(email, password);
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
      <p className="auth-tagline">Catat keuangan, capai tujuan</p>
      <form onSubmit={handleSubmit}>
        {error && <div className="auth-error">{error}</div>}
        <div className="form-group">
          <label className="form-label">Email</label>
          <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Password</label>
          <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={8} />
        </div>
        <button className="btn btn-block" type="submit" disabled={loading}>
          {loading ? <span className="spinner" /> : 'Masuk'}
        </button>
      </form>
      <div className="auth-link">
        Belum punya akun? <Link to="/register">Daftar di sini</Link>
      </div>
      <div className="auth-link" style={{ marginTop: 24, fontSize: 11 }}>
        Demo: demo@pft.app / demo1234
      </div>
    </div>
  );
}
