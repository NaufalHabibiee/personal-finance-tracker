import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Legend, CartesianGrid,
  PieChart, Pie, Cell
} from 'recharts';
import { api } from '../api';
import { formatIDR, formatShort, monthLabel, formatDateID } from '../utils';
import { exportFinanceReport } from '../exportExcel';
import { useToast } from '../components/Toast.jsx';

export default function Reports() {
  const now = new Date();
  const toast = useToast();
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    if (exporting) return;
    setExporting(true);
    try {
      const { count } = await exportFinanceReport();
      toast.show(`✅ ${count} transaksi diekspor ke Excel`);
    } catch (err) {
      toast.show(err.code === 'EMPTY' ? err.message : 'Gagal ekspor: ' + err.message);
    } finally {
      setExporting(false);
    }
  }

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [trendMonths, setTrendMonths] = useState(6);
  const [overview, setOverview] = useState(null);
  const [trend, setTrend] = useState([]);
  const [breakdown, setBreakdown] = useState({ data: [], total: 0 });
  const [topExp, setTopExp] = useState([]);
  const [comp, setComp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.reportOverview({ month, year }),
      api.reportTrend({ months: trendMonths }),
      api.reportBreakdown({ month, year, type: 'expense' }),
      api.reportTopExpenses({ month, year, limit: 5 }),
      api.reportComparison({ month, year })
    ]).then(([o, t, b, top, c]) => {
      setOverview(o);
      setTrend(t.data);
      setBreakdown(b);
      setTopExp(top.data);
      setComp(c);
    }).finally(() => setLoading(false));
  }, [month, year, trendMonths]);

  const MONTHS = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const trendData = trend.map(t => ({ ...t, label: monthLabel(t.month) }));

  function deltaBadge(pct) {
    if (pct === 0) return <span style={{ color: 'var(--text-muted)' }}>0%</span>;
    const up = pct > 0;
    return <span style={{ color: up ? 'var(--income)' : 'var(--expense)' }}>{up ? '↑' : '↓'} {Math.abs(pct)}%</span>;
  }

  return (
    <>
      <div className="topbar">
        <h1>Laporan</h1>
        <button className="btn btn-sm" onClick={handleExport} disabled={exporting}>
          {exporting ? <span className="spinner" /> : '⬇️ Excel'}
        </button>
      </div>
      <div className="page">
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <select className="select" value={month} onChange={e => setMonth(parseInt(e.target.value))}>
            {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select className="select" value={year} onChange={e => setYear(parseInt(e.target.value))}>
            {[now.getFullYear() - 1, now.getFullYear()].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {loading || !overview ? (
          <div className="spinner-page"><div className="spinner" /></div>
        ) : (
          <>
            <div className="card card-lg">
              <div className="text-muted" style={{ fontSize: 12, marginBottom: 4 }}>Ringkasan Bulan Ini</div>
              <div className="num" style={{ fontSize: 24, fontWeight: 700, color: overview.net >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                {overview.net >= 0 ? '+' : ''}{formatIDR(overview.net)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Net (pemasukan − pengeluaran)</div>
              <div className="row" style={{ marginTop: 16 }}>
                <div>
                  <div className="text-muted" style={{ fontSize: 11 }}>Pemasukan</div>
                  <div className="num text-income" style={{ fontWeight: 600 }}>{formatShort(overview.income)}</div>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: 11 }}>Pengeluaran</div>
                  <div className="num text-expense" style={{ fontWeight: 600 }}>{formatShort(overview.expense)}</div>
                </div>
                <div>
                  <div className="text-muted" style={{ fontSize: 11 }}>Saving Rate</div>
                  <div className="num" style={{ fontWeight: 600 }}>{overview.saving_rate}%</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex-between mb-3">
                <div style={{ fontWeight: 600 }}>📈 Tren {trendMonths} Bulan</div>
                <div className="period-tabs" style={{ margin: 0, padding: 2 }}>
                  {[6, 12].map(n => (
                    <button key={n} className={trendMonths === n ? 'active' : ''} onClick={() => setTrendMonths(n)} style={{ padding: '4px 10px', fontSize: 11 }}>
                      {n}bln
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eee" vertical={false} />
                    <XAxis dataKey="label" fontSize={11} stroke="#999" />
                    <YAxis tickFormatter={v => formatShort(v).replace('Rp ', '')} fontSize={10} stroke="#999" />
                    <Tooltip formatter={(v) => formatIDR(v)} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="income" name="Pemasukan" fill="#16a34a" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expense" name="Pengeluaran" fill="#dc2626" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div style={{ fontWeight: 600, marginBottom: 12 }}>🍩 Distribusi Pengeluaran</div>
              {breakdown.data.length > 0 ? (
                <>
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={breakdown.data} dataKey="total" nameKey="category.name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                          {breakdown.data.map((entry, i) => (
                            <Cell key={i} fill={entry.category.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => formatIDR(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ marginTop: 12 }}>
                    {breakdown.data.map(b => (
                      <div key={b.category.id} className="flex-between" style={{ padding: '8px 0', borderTop: '1px solid var(--border)' }}>
                        <span style={{ fontSize: 13 }}>{b.category.icon} {b.category.name}</span>
                        <span className="num" style={{ fontSize: 13 }}>{formatIDR(b.total)} <span className="text-muted" style={{ fontSize: 11 }}>({b.percentage}%)</span></span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty">Tidak ada pengeluaran bulan ini</div>
              )}
            </div>

            {topExp.length > 0 && (
              <div className="card">
                <div style={{ fontWeight: 600, marginBottom: 12 }}>🏆 Top 5 Pengeluaran</div>
                {topExp.map((t, i) => (
                  <div key={t.id} className="flex-between" style={{ padding: '8px 0', borderTop: i === 0 ? 'none' : '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <span style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600, width: 20 }}>#{i + 1}</span>
                      <span>{t.category.icon}</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.note || t.category.name}</div>
                        <div className="text-muted" style={{ fontSize: 11 }}>{formatDateID(t.transaction_date)}</div>
                      </div>
                    </div>
                    <span className="num text-expense" style={{ fontWeight: 600, fontSize: 13 }}>{formatIDR(t.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {comp && (
              <div className="card">
                <div style={{ fontWeight: 600, marginBottom: 12 }}>📊 Perbandingan vs Bulan Lalu</div>
                <div className="row">
                  <div>
                    <div className="text-muted" style={{ fontSize: 11 }}>Pemasukan</div>
                    <div className="num" style={{ fontWeight: 600, fontSize: 14 }}>{formatShort(comp.current.income)}</div>
                    <div style={{ fontSize: 11 }}>{deltaBadge(comp.delta.income_pct)}</div>
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: 11 }}>Pengeluaran</div>
                    <div className="num" style={{ fontWeight: 600, fontSize: 14 }}>{formatShort(comp.current.expense)}</div>
                    <div style={{ fontSize: 11 }}>{deltaBadge(comp.delta.expense_pct)}</div>
                  </div>
                  <div>
                    <div className="text-muted" style={{ fontSize: 11 }}>Net</div>
                    <div className="num" style={{ fontWeight: 600, fontSize: 14 }}>{formatShort(comp.current.net)}</div>
                    <div style={{ fontSize: 11 }}>{deltaBadge(comp.delta.net_pct)}</div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
