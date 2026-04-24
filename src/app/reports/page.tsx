'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TrendingUp, RefreshCw, IndianRupee, FileText, AlertCircle, Download } from 'lucide-react';
import toast from 'react-hot-toast';

type PnLRow = {
  id: string; job_number: string; job_type: string; status: string;
  pol: string; pod: string; customer_name: string;
  sell_total: number; buy_total: number; profit: number; margin_pct: number;
  invoiced_amount: number; collected_amount: number; vendor_cost: number;
  created_at: string;
};
type AgingRow = {
  id: string; invoice_number: string; customer_name: string;
  total_amount: number; balance_due: number; paid_amount: number;
  due_date: string; days_overdue: number; aging_bucket: string;
  mobile: string; email: string;
};
type GstRow = {
  month: string; invoice_type: string; invoice_count: number;
  total_amount: number; sales_amount: number; purchase_amount: number;
};

const BUCKET_COLOR: Record<string, string> = {
  current: 'bg-green-500/20 text-green-400',
  '1-30':  'bg-yellow-500/20 text-yellow-400',
  '31-60': 'bg-orange-500/20 text-orange-400',
  '61-90': 'bg-red-500/20 text-red-400',
  '90+':   'bg-red-700/30 text-red-300 font-bold',
};

const fmt = (n: number) => `₹${(n ?? 0).toLocaleString('en-IN')}`;
const fmtM = (n: number) => n >= 10000000 ? `₹${(n/10000000).toFixed(2)}Cr` : n >= 100000 ? `₹${(n/100000).toFixed(1)}L` : fmt(n);

export default function ReportsPage() {
  const [tab, setTab]         = useState<'pnl'|'aging'|'gst'>('pnl');
  const [pnl, setPnl]         = useState<PnLRow[]>([]);
  const [aging, setAging]     = useState<AgingRow[]>([]);
  const [gst, setGst]         = useState<GstRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [period, setPeriod]   = useState('this_year');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, aRes, gRes] = await Promise.all([
        fetch(`/api/reports/pnl?period=${period}`),
        fetch('/api/reports/aging'),
        fetch('/api/reports/gst'),
      ]);
      const pData = await pRes.json(); setPnl(pData.data ?? []);
      const aData = await aRes.json(); setAging(aData.data ?? []);
      const gData = await gRes.json(); setGst(gData.data ?? []);
    } catch { toast.error('Failed to load reports'); }
    setLoading(false);
  }, [period]);

  useEffect(() => { load(); }, [load]);

  // PnL aggregates
  const totalRevenue  = pnl.reduce((s, r) => s + (r.sell_total ?? 0), 0);
  const totalCost     = pnl.reduce((s, r) => s + (r.buy_total ?? 0), 0);
  const totalProfit   = pnl.reduce((s, r) => s + (r.profit ?? 0), 0);
  const totalCollected= pnl.reduce((s, r) => s + (r.collected_amount ?? 0), 0);
  const avgMargin     = pnl.length ? pnl.reduce((s,r) => s + (r.margin_pct ?? 0), 0) / pnl.length : 0;

  // Aging aggregates
  const agingTotals = ['current','1-30','31-60','61-90','90+'].map(b => ({
    bucket: b,
    count: aging.filter(a => a.aging_bucket === b).length,
    amount: aging.filter(a => a.aging_bucket === b).reduce((s, a) => s + (a.balance_due ?? 0), 0),
  }));
  const totalOutstanding = aging.reduce((s, a) => s + (a.balance_due ?? 0), 0);

  // GST chart data
  const gstChartData = gst
    .filter(g => g.invoice_type === 'sales')
    .map(g => ({
      month: new Date(g.month).toLocaleDateString('en-IN', { month:'short', year:'2-digit' }),
      revenue: g.sales_amount ?? 0,
    }))
    .sort((a,b) => a.month.localeCompare(b.month));

  // PnL chart - top 10 jobs by profit
  const pnlChart = [...pnl]
    .sort((a,b) => (b.profit ?? 0) - (a.profit ?? 0))
    .slice(0, 10)
    .map(r => ({ name: r.job_number, profit: r.profit ?? 0, margin: r.margin_pct ?? 0 }));

  const exportCSV = (data: Record<string,unknown>[], filename: string) => {
    if (!data.length) return;
    const keys = Object.keys(data[0]);
    const csv  = [keys.join(','), ...data.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Reports</h1>
          <p className="text-slate-400 text-sm mt-1">P&L, Aging, GST — compiled by Pranali & Aslesha</p>
        </div>
        <div className="flex gap-2 items-center">
          <select value={period} onChange={e => setPeriod(e.target.value)}
            className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-300 focus:outline-none">
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="this_quarter">This Quarter</option>
            <option value="this_year">This Year</option>
            <option value="all">All Time</option>
          </select>
          <button onClick={load} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit mb-6">
        {([['pnl','P&L / Jobs'], ['aging','Aging'], ['gst','GST']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${tab === t ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── P&L TAB ── */}
      {tab === 'pnl' && (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: 'Total Revenue',  value: fmtM(totalRevenue),   color: 'text-blue-400'   },
              { label: 'Total Cost',     value: fmtM(totalCost),      color: 'text-orange-400' },
              { label: 'Gross Profit',   value: fmtM(totalProfit),    color: totalProfit >= 0 ? 'text-green-400' : 'text-red-400' },
              { label: 'Avg Margin',     value: `${avgMargin.toFixed(1)}%`, color: avgMargin >= 15 ? 'text-green-400' : 'text-yellow-400' },
              { label: 'Cash Collected', value: fmtM(totalCollected), color: 'text-teal-400'   },
            ].map(s => (
              <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-slate-500 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Chart */}
          {pnlChart.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
              <h3 className="text-sm font-bold text-slate-400 mb-4">Top 10 Jobs by Profit</h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={pnlChart} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 10 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => fmtM(v)} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background:'#0f172a', border:'1px solid #334155', borderRadius:8 }} labelStyle={{ color:'#e2e8f0' }} />
                  <Bar dataKey="profit" radius={[4,4,0,0]}>
                    {pnlChart.map((e, i) => <Cell key={i} fill={e.profit >= 0 ? '#22c55e' : '#ef4444'} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Jobs table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <span className="text-sm font-semibold text-slate-300">{pnl.length} Jobs</span>
              <button onClick={() => exportCSV(pnl as unknown as Record<string,unknown>[], 'pnl-report.csv')}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-lg border border-slate-700">
                <Download className="w-3 h-3" /> Export CSV
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-800">
                  {['Job','Customer','Route','Revenue','Cost','Profit','Margin','Invoiced','Collected'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {pnl.map(r => (
                    <tr key={r.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-xs text-brand-400 whitespace-nowrap">{r.job_number}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-300 whitespace-nowrap">{r.customer_name ?? '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-400 whitespace-nowrap">{r.pol} → {r.pod}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-300 whitespace-nowrap">{fmt(r.sell_total)}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-400 whitespace-nowrap">{fmt(r.buy_total)}</td>
                      <td className={`px-3 py-2.5 text-xs font-semibold whitespace-nowrap ${(r.profit ?? 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>{fmt(r.profit)}</td>
                      <td className={`px-3 py-2.5 text-xs whitespace-nowrap ${(r.margin_pct ?? 0) >= 15 ? 'text-green-400' : 'text-yellow-400'}`}>{(r.margin_pct ?? 0).toFixed(1)}%</td>
                      <td className="px-3 py-2.5 text-xs text-slate-400 whitespace-nowrap">{fmt(r.invoiced_amount)}</td>
                      <td className="px-3 py-2.5 text-xs text-teal-400 whitespace-nowrap">{fmt(r.collected_amount)}</td>
                    </tr>
                  ))}
                  {pnl.length === 0 && !loading && (
                    <tr><td colSpan={9} className="px-4 py-10 text-center text-slate-500">No job data for this period</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── AGING TAB ── */}
      {tab === 'aging' && (
        <>
          {/* Aging buckets */}
          <div className="grid grid-cols-5 gap-3 mb-6">
            {agingTotals.map(b => (
              <div key={b.bucket} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${BUCKET_COLOR[b.bucket]}`}>{b.bucket === 'current' ? 'Current' : `${b.bucket} days`}</span>
                <p className="text-lg font-bold text-white mt-2">{fmtM(b.amount)}</p>
                <p className="text-xs text-slate-500">{b.count} invoice{b.count !== 1 ? 's' : ''}</p>
              </div>
            ))}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Total Outstanding</p>
              <p className="text-2xl font-bold text-red-400">{fmtM(totalOutstanding)}</p>
            </div>
            <button onClick={() => exportCSV(aging as unknown as Record<string,unknown>[], 'aging-report.csv')}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg border border-slate-700 hover:bg-slate-700">
              <Download className="w-3 h-3" /> Export CSV
            </button>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-800">
                  {['Invoice','Customer','Total','Paid','Balance','Due Date','Days','Bucket'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {aging.map(a => (
                    <tr key={a.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-3 py-2.5 font-mono text-xs text-brand-400">{a.invoice_number}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-200">{a.customer_name ?? '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-300">{fmt(a.total_amount)}</td>
                      <td className="px-3 py-2.5 text-xs text-green-400">{fmt(a.paid_amount)}</td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-red-400">{fmt(a.balance_due)}</td>
                      <td className="px-3 py-2.5 text-xs text-slate-400">{a.due_date ? new Date(a.due_date).toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : '—'}</td>
                      <td className={`px-3 py-2.5 text-xs font-semibold ${(a.days_overdue ?? 0) > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {(a.days_overdue ?? 0) > 0 ? `+${a.days_overdue}d` : 'Current'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${BUCKET_COLOR[a.aging_bucket] ?? ''}`}>{a.aging_bucket}</span>
                      </td>
                    </tr>
                  ))}
                  {aging.length === 0 && !loading && (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                      <AlertCircle className="w-6 h-6 mx-auto mb-2 opacity-30" />No outstanding invoices
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── GST TAB ── */}
      {tab === 'gst' && (
        <>
          {/* Revenue chart */}
          {gstChartData.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 mb-6">
              <h3 className="text-sm font-bold text-slate-400 mb-4">Monthly Revenue Trend</h3>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={gstChartData}>
                  <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => fmtM(v)} />
                  <Tooltip formatter={(v: number) => fmt(v)} contentStyle={{ background:'#0f172a', border:'1px solid #334155', borderRadius:8 }} labelStyle={{ color:'#e2e8f0' }} />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} dot={{ fill:'#3b82f6', r:3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* GST table */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <span className="text-sm font-semibold text-slate-300">Monthly GST Summary</span>
              <button onClick={() => exportCSV(gst as unknown as Record<string,unknown>[], 'gst-summary.csv')}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-slate-800 text-slate-400 rounded-lg border border-slate-700 hover:bg-slate-700">
                <Download className="w-3 h-3" /> Export CSV
              </button>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-800">
                {['Month','Type','Invoices','Total Amount','Sales','Purchases'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {gst.length === 0 && !loading ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">No GST data yet</td></tr>
                ) : gst.map((g, i) => (
                  <tr key={i} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-2.5 text-xs text-slate-300">{new Date(g.month).toLocaleDateString('en-IN', { month:'long', year:'numeric' })}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${g.invoice_type === 'sales' ? 'bg-blue-500/20 text-blue-400' : 'bg-orange-500/20 text-orange-400'}`}>{g.invoice_type}</span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-400">{g.invoice_count}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold text-slate-200">{fmt(g.total_amount)}</td>
                    <td className="px-4 py-2.5 text-xs text-blue-400">{fmt(g.sales_amount)}</td>
                    <td className="px-4 py-2.5 text-xs text-orange-400">{fmt(g.purchase_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
