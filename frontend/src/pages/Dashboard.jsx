import { useEffect, useState, useCallback } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { api } from '../api';
import { useAuth } from '../auth.jsx';
import { formatIDR, formatShort, formatDateID } from '../utils';

export default function Dashboard() {
  const { user } = useAuth();
  const { openAdd } = useOutletContext();
  const [summary, setSummary] = useState(null);
  const [breakdown, setBreakdown] = useState({ data: [], total: 0 });
  const [budgets, setBudgets] = useState([]);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  const start = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const end = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.txSummary({ start_date: start, end_date: end }),
      api.reportBreakdown({ month, year }),
      api.listBudgets({ month, year }),
      api.listTransactions({ limit: 5 })
    ]).then(([s, b, bg, r]) => {
      setSummary(s);
      setBreakdown(b);
      setBudgets(bg.data.slice(0, 3));
      setRecent(r.data);
    }).finally(() => setLoading(false));
  }, [start, end, month, year]);

  useEffect(() => {
    load();
    const onChange = () => load();
    window.addEventListener('tx:changed', onChange);
    return () => window.removeEventListener('tx:changed', onChange);
  }, [load]);

  if (loading && !summary) return <div className="spinner-page"><div className="spinner" /></div>;

  return (
    <>
      <div className="topbar">
        <div>
          <div className="greet">Halo,</div>
          <h1>{user?.full_name || user?.email?.split('@')[0]}</h1>
        </div>
      </div>

      <div className="page">
        <div className="balance-card">
          <div className="label">Saldo Total</div>
          <div className="balance num">{formatIDR(summary?.balance || 0)}</div>
          <div className="row">
            <div className="stat">
              <div className="stat-label">↑ Pemasukan bulan ini</div>
              <div className="stat-value num">{formatShort(summary?.income || 0)}</div>
            </div>
            <div className="stat">
              <div className="stat-label">↓ Pengeluaran bulan ini</div>
              <div className="stat-value num">{formatShort(summary?.expense || 0)}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex-between mb-3">
            <div style={{ fontWeight: 600 }}>📊 Pengeluaran Bulan Ini</div>
            <Link to="/reports" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>Detail →</Link>
          </div>
          {breakdown.data.length > 0 ? (
            <>
              <div style={{ height: 180 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={breakdown.data}
                      dataKey="total"
                      nameKey="category.name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                    >
                      {breakdown.data.map((entry, i) => (
                        <Cell key={i} fill={entry.category.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v) => formatIDR(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                {breakdown.data.slice(0, 4).map(b => (
                  <div key={b.category.id} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: b.category.color }} />
                    <span>{b.category.icon} {b.category.name} · {b.percentage}%</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="empty">
              <div className="empty-icon">📊</div>
              <div className="empty-title">Belum ada pengeluaran</div>
              <div>Tambahkan transaksi untuk melihat chart</div>
            </div>
          )}
        </div>

        {budgets.length > 0 && (
          <div className="card">
            <div className="flex-between mb-3">
              <div style={{ fontWeight: 600 }}>🎯 Budget Progress</div>
              <Link to="/budgets" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>Semua →</Link>
            </div>
            {budgets.map(b => (
              <div key={b.id} style={{ marginBottom: 12 }}>
                <div className="flex-between mb-2">
                  <span style={{ fontSize: 13 }}>{b.category.icon} {b.category.name}</span>
                  <span className="num" style={{ fontSize: 12, color: 'var(--text-muted)' }}>{b.percentage_used}%</span>
                </div>
                <div className="progress">
                  <div className={`bar ${b.status}`} style={{ width: Math.min(100, b.percentage_used) + '%' }} />
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex-between" style={{ margin: '20px 4px 12px' }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>📋 Transaksi Terbaru</div>
          <Link to="/transactions" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none' }}>Lihat semua →</Link>
        </div>

        {recent.length > 0 ? (
          <div className="tx-list">
            {recent.map(t => (
              <div key={t.id} className="tx-item">
                <div className="tx-icon" style={{ background: t.category.color + '22' }}>{t.category.icon}</div>
                <div className="tx-info">
                  <div className="tx-name">{t.category.name}</div>
                  <div className="tx-note">{t.note || formatDateID(t.transaction_date)}</div>
                </div>
                <div className={`tx-amount ${t.type}`}>
                  {t.type === 'expense' ? '-' : '+'}{formatShort(t.amount)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty">
            <div className="empty-icon">📝</div>
            <div className="empty-title">Belum ada transaksi</div>
            <button className="btn mt-2" onClick={openAdd}>+ Tambah Transaksi Pertama</button>
          </div>
        )}
      </div>
    </>
  );
}
