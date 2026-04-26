'use client';
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Ship, Plus, Search, RefreshCw, X, Save, AlertTriangle, CheckCircle } from 'lucide-react';

type Container = {
  id?: string; job_id?: string; container_number?: string; container_type?: string;
  seal_number?: string; stuffing_type?: string; stuffing_date?: string;
  stuffed_weight?: number; vgm_weight?: number; vgm_method?: string;
  gate_in_date?: string; gate_out_date?: string; on_board_date?: string;
  discharge_date?: string; pickup_date?: string; return_date?: string;
  last_free_day_destination?: string; free_days?: number;
  detention_rate_per_day?: number; detention_days?: number; detention_amount?: number;
  risk_level?: string; is_returned?: boolean; status?: string; notes?: string;
  job?: { job_number: string; customer?: { company_name: string } | null };
};

type Job = { id: string; job_number: string; customer?: { company_name: string } | null };

const CONTAINER_TYPES = ['20GP','40GP','40HC','20RF','40RF','45HC','20OT','40OT','20FR','40FR'];
const STUFFING_TYPES  = ['factory','dock','cfs'];
const VGM_METHODS     = ['sm1','sm2'];

const RISK_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  low:      { label: 'Low',      color: 'text-green-400',  bg: 'bg-green-500/20'  },
  medium:   { label: 'Medium',   color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  high:     { label: 'High',     color: 'text-orange-400', bg: 'bg-orange-500/20' },
  critical: { label: 'Critical', color: 'text-red-400',    bg: 'bg-red-500/20'    },
};

const inp = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500';
const sel = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500';
const lbl = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';

function Sect({ title }: { title: string }) {
  return <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b border-slate-800">{title}</h4>;
}

export default function FCLPage() {
  const [containers, setContainers] = useState<Container[]>([]);
  const [jobs, setJobs]             = useState<Job[]>([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [riskFilter, setRiskFilter] = useState('all');
  const [showForm, setShowForm]     = useState(false);
  const [saving, setSaving]         = useState(false);

  // Form fields
  const [fId,         setFId]         = useState('');
  const [fJobId,      setFJobId]      = useState('');
  const [fContNum,    setFContNum]    = useState('');
  const [fType,       setFType]       = useState('40GP');
  const [fSealNum,    setFSealNum]    = useState('');
  const [fStuffType,  setFStuffType]  = useState('');
  const [fStuffDate,  setFStuffDate]  = useState('');
  const [fStuffedWt,  setFStuffedWt]  = useState('');
  const [fVgmWt,      setFVgmWt]      = useState('');
  const [fVgmMethod,  setFVgmMethod]  = useState('');
  const [fGateIn,     setFGateIn]     = useState('');
  const [fGateOut,    setFGateOut]    = useState('');
  const [fOnBoard,    setFOnBoard]    = useState('');
  const [fDischarge,  setFDischarge]  = useState('');
  const [fPickup,     setFPickup]     = useState('');
  const [fReturn,     setFReturn]     = useState('');
  const [fLfd,        setFLfd]        = useState('');
  const [fFreeDays,   setFFreeDays]   = useState('14');
  const [fDetRate,    setFDetRate]    = useState('0');
  const [fIsReturned, setFIsReturned] = useState(false);
  const [fNotes,      setFNotes]      = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, jRes] = await Promise.all([
        fetch('/api/fcl?per_page=200'),
        fetch('/api/jobs?per_page=200'),
      ]);
      const cData = await cRes.json(); setContainers(cData.data ?? []);
      const jData = await jRes.json(); setJobs(jData.data ?? []);
    } catch { toast.error('Failed to load'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setFId(''); setFJobId(''); setFContNum(''); setFType('40GP'); setFSealNum('');
    setFStuffType(''); setFStuffDate(''); setFStuffedWt(''); setFVgmWt(''); setFVgmMethod('');
    setFGateIn(''); setFGateOut(''); setFOnBoard(''); setFDischarge(''); setFPickup('');
    setFReturn(''); setFLfd(''); setFFreeDays('14'); setFDetRate('0');
    setFIsReturned(false); setFNotes('');
    setShowForm(true);
  };

  const openEdit = (c: Container) => {
    setFId(c.id ?? ''); setFJobId(c.job_id ?? ''); setFContNum(c.container_number ?? '');
    setFType(c.container_type ?? '40GP'); setFSealNum(c.seal_number ?? '');
    setFStuffType(c.stuffing_type ?? ''); setFStuffDate(c.stuffing_date ?? '');
    setFStuffedWt(String(c.stuffed_weight ?? '')); setFVgmWt(String(c.vgm_weight ?? ''));
    setFVgmMethod(c.vgm_method ?? ''); setFGateIn(c.gate_in_date ?? '');
    setFGateOut(c.gate_out_date ?? ''); setFOnBoard(c.on_board_date ?? '');
    setFDischarge(c.discharge_date ?? ''); setFPickup(c.pickup_date ?? '');
    setFReturn(c.return_date ?? ''); setFLfd(c.last_free_day_destination ?? '');
    setFFreeDays(String(c.free_days ?? 14)); setFDetRate(String(c.detention_rate_per_day ?? 0));
    setFIsReturned(c.is_returned ?? false); setFNotes(c.notes ?? '');
    setShowForm(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = {
        job_id: fJobId || undefined, container_number: fContNum || undefined,
        container_type: fType, seal_number: fSealNum || undefined,
        stuffing_type: fStuffType || undefined, stuffing_date: fStuffDate || undefined,
        stuffed_weight: fStuffedWt ? parseFloat(fStuffedWt) : undefined,
        vgm_weight: fVgmWt ? parseFloat(fVgmWt) : undefined,
        vgm_method: fVgmMethod || undefined,
        gate_in_date: fGateIn || undefined, gate_out_date: fGateOut || undefined,
        on_board_date: fOnBoard || undefined, discharge_date: fDischarge || undefined,
        pickup_date: fPickup || undefined, return_date: fReturn || undefined,
        last_free_day_destination: fLfd || undefined,
        free_days: parseInt(fFreeDays) || 14,
        detention_rate_per_day: parseFloat(fDetRate) || 0,
        is_returned: fIsReturned, notes: fNotes || undefined,
      };
      const url    = fId ? `/api/fcl/${fId}` : '/api/fcl';
      const method = fId ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data   = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(fId ? 'Container updated' : 'Container added');
      setShowForm(false); load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    setSaving(false);
  };

  const filtered = containers.filter(c => {
    const q = search.toLowerCase();
    if (q && !c.container_number?.toLowerCase().includes(q) && !c.job?.job_number?.toLowerCase().includes(q)) return false;
    if (riskFilter !== 'all' && c.risk_level !== riskFilter) return false;
    if (riskFilter === 'active' && c.is_returned) return false;
    return true;
  });

  const atRisk = containers.filter(c => !c.is_returned && ['high','critical'].includes(c.risk_level ?? ''));
  const overdue = containers.filter(c => !c.is_returned && c.detention_days && c.detention_days > 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">FCL Containers</h1>
          <p className="text-slate-400 text-sm mt-1">Full container tracking — stuffing, VGM, gate-in, detention — managed by Ganesh</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold">
            <Plus className="w-4 h-4" /> Add Container
          </button>
        </div>
      </div>

      {/* Detention alerts */}
      {atRisk.length > 0 && (
        <div className="mb-4 p-3 bg-red-950/40 border border-red-800/50 rounded-xl flex items-center gap-3 text-sm">
          <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          <span className="text-red-300"><strong>{atRisk.length} container(s) at detention risk</strong> — {overdue.length} already overdue</span>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label:'Total',       value: containers.length,                              color:'text-slate-300' },
          { label:'Active',      value: containers.filter(c => !c.is_returned).length,  color:'text-blue-400'  },
          { label:'At Risk',     value: atRisk.length,                                  color:'text-orange-400'},
          { label:'Overdue',     value: overdue.length,                                 color:'text-red-400'   },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Container no., job no.…"
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-brand-500" />
        </div>
        <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-1">
          {['all','low','medium','high','critical'].map(r => (
            <button key={r} onClick={() => setRiskFilter(r)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors capitalize ${riskFilter === r ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-800">
            {['Container','Type','Job','LFD','Free Days','Detention','Status','Risk'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map(c => {
              const rc = RISK_CONFIG[c.risk_level ?? 'low'];
              const today = new Date();
              const lfd   = c.last_free_day_destination ? new Date(c.last_free_day_destination) : null;
              const daysLeft = lfd ? Math.ceil((lfd.getTime() - today.getTime()) / 86400000) : null;
              return (
                <tr key={c.id} onClick={() => openEdit(c)}
                  className="border-b border-slate-800/50 hover:bg-slate-800/40 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-bold text-slate-200">{c.container_number || '—'}</p>
                    {c.seal_number && <p className="text-xs text-slate-500">Seal: {c.seal_number}</p>}
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-300">{c.container_type || '—'}</td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-mono text-brand-400">{c.job?.job_number || '—'}</p>
                    <p className="text-xs text-slate-500">{c.job?.customer?.company_name || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {lfd ? (
                      <span className={daysLeft !== null && daysLeft < 0 ? 'text-red-400 font-bold' : daysLeft !== null && daysLeft <= 3 ? 'text-orange-400 font-bold' : 'text-slate-400'}>
                        {lfd.toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                        {daysLeft !== null && daysLeft >= 0 && ` (${daysLeft}d)`}
                        {daysLeft !== null && daysLeft < 0 && ` (${Math.abs(daysLeft)}d OD)`}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{c.free_days ?? 14}d</td>
                  <td className="px-4 py-3 text-xs">
                    {(c.detention_days ?? 0) > 0
                      ? <span className="text-red-400 font-semibold">{c.detention_days}d / ₹{(c.detention_amount ?? 0).toLocaleString('en-IN')}</span>
                      : <span className="text-slate-500">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.is_returned ? 'bg-slate-600/20 text-slate-500' : 'bg-green-500/20 text-green-400'}`}>
                      {c.is_returned ? 'Returned' : 'Active'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${rc.bg} ${rc.color}`}>{rc.label}</span>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && !loading && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                <Ship className="w-8 h-8 mx-auto mb-2 opacity-30" />No containers found
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Form Drawer */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-end z-50">
          <div className="bg-slate-900 border-l border-slate-700 h-full w-full max-w-xl overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{fId ? `Edit: ${fContNum}` : 'Add Container'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <Sect title="Container & Job" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className={lbl}>Linked Job</label>
                    <select className={sel} value={fJobId} onChange={e => setFJobId(e.target.value)}>
                      <option value="">None</option>
                      {jobs.map(j => <option key={j.id} value={j.id}>{j.job_number} — {j.customer?.company_name ?? ''}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>Container No.</label><input className={inp} value={fContNum} onChange={e => setFContNum(e.target.value)} placeholder="MSCU1234567" /></div>
                  <div><label className={lbl}>Type</label>
                    <select className={sel} value={fType} onChange={e => setFType(e.target.value)}>
                      {CONTAINER_TYPES.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>Seal Number</label><input className={inp} value={fSealNum} onChange={e => setFSealNum(e.target.value)} /></div>
                </div>
              </div>

              <div>
                <Sect title="Stuffing & VGM" />
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Stuffing Type</label>
                    <select className={sel} value={fStuffType} onChange={e => setFStuffType(e.target.value)}>
                      <option value="">—</option>
                      {STUFFING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>Stuffing Date</label><input type="date" className={inp} value={fStuffDate} onChange={e => setFStuffDate(e.target.value)} /></div>
                  <div><label className={lbl}>Stuffed Weight (kg)</label><input type="number" className={inp} value={fStuffedWt} onChange={e => setFStuffedWt(e.target.value)} /></div>
                  <div><label className={lbl}>VGM Weight (kg)</label><input type="number" className={inp} value={fVgmWt} onChange={e => setFVgmWt(e.target.value)} /></div>
                  <div><label className={lbl}>VGM Method</label>
                    <select className={sel} value={fVgmMethod} onChange={e => setFVgmMethod(e.target.value)}>
                      <option value="">—</option>
                      {VGM_METHODS.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <Sect title="Movement Dates" />
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Gate In</label><input type="date" className={inp} value={fGateIn} onChange={e => setFGateIn(e.target.value)} /></div>
                  <div><label className={lbl}>Gate Out</label><input type="date" className={inp} value={fGateOut} onChange={e => setFGateOut(e.target.value)} /></div>
                  <div><label className={lbl}>On Board</label><input type="date" className={inp} value={fOnBoard} onChange={e => setFOnBoard(e.target.value)} /></div>
                  <div><label className={lbl}>Discharge</label><input type="date" className={inp} value={fDischarge} onChange={e => setFDischarge(e.target.value)} /></div>
                  <div><label className={lbl}>Pickup Date</label><input type="date" className={inp} value={fPickup} onChange={e => setFPickup(e.target.value)} /></div>
                  <div><label className={lbl}>Return Date</label><input type="date" className={inp} value={fReturn} onChange={e => setFReturn(e.target.value)} /></div>
                </div>
              </div>

              <div>
                <Sect title="Detention" />
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Last Free Day</label><input type="date" className={inp} value={fLfd} onChange={e => setFLfd(e.target.value)} /></div>
                  <div><label className={lbl}>Free Days</label><input type="number" className={inp} value={fFreeDays} onChange={e => setFFreeDays(e.target.value)} /></div>
                  <div><label className={lbl}>Detention Rate / Day ($)</label><input type="number" className={inp} value={fDetRate} onChange={e => setFDetRate(e.target.value)} /></div>
                  <div className="flex items-end gap-3">
                    <div>
                      <label className={lbl}>Empty Returned</label>
                      <button onClick={() => setFIsReturned(r => !r)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${fIsReturned ? 'bg-green-600' : 'bg-slate-700'}`}>
                        <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${fIsReturned ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className={lbl}>Notes</label>
                <textarea rows={2} className={inp} value={fNotes} onChange={e => setFNotes(e.target.value)} />
              </div>
            </div>
            <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 px-6 py-4 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm border border-slate-700">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />{saving ? 'Saving…' : fId ? 'Update' : 'Add Container'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
