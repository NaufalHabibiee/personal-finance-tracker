import { NavLink } from 'react-router-dom';

const items = [
  { to: '/', label: 'Home', icon: '🏠', end: true },
  { to: '/transactions', label: 'Transaksi', icon: '📋' },
  { to: '/budgets', label: 'Budget', icon: '🎯' },
  { to: '/reports', label: 'Laporan', icon: '📊' },
  { to: '/profile', label: 'Profil', icon: '👤' }
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      <div className="inner">
        {items.map(it => (
          <NavLink key={it.to} to={it.to} end={it.end} className={({ isActive }) => isActive ? 'active' : ''}>
            <span className="icon">{it.icon}</span>
            <span>{it.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
