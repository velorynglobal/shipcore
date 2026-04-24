'use client';
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Warehouse, Plus, Search, RefreshCw, X, Save, Truck, CheckCircle, Clock, Package } from 'lucide-react';

type CfsOp = {
  id?: string; job_id?: string; container_number?: string; seal_number?: string;
  cfs_number?: string; cfs_location?: string; operation_type: string;
  vessel_name?: string; voyage_number?: string; mbl_number?: string; hbl_number?: string; line_name?: string;
  inward_date?: string; inward_time?: string; gross_weight_inward?: number; packages_inward?: number;
  condition_on_arrival?: string; damage_remarks?: string;
  destuff_type?: string; destuff_date?: string; gross_weight_actual?: number;
  packages_actual?: number; cbm_actual?: number; destuff_remarks?: string; destuff_done_by?: string;
  storage_start_date?: string; storage_end_date?: string; storage_charges?: number;
  do_number?: string; do_date?: string; do_expiry?: string;
  out_date?: string; delivered_to?: string; transporter_name?: string;
  vehicle_number?: string; driver_name?: string; driver_mobile?: string; delivery_challan?: string;
  empty_return_date?: string; empty_return_location?: string; empty_returned_to?: string; empty_receipt_number?: string;
  status: string; handling_charges?: number; examination_charges?: number; total_cfs_charges?: number;
  documents?: Record<string, boolean>; notes?: string;
  job?: { job_number: string; customer?: { company_name: string } | null };
};

type Job = { id: string; job_number: string; customer?: { company_name: string } | null };

const STATUS_FLOW = [
  { key: 'inward_pending',      label: 'Inward Pending',      color: 'bg-slate-600/20 text-slate-400'    },
  { key: 'inward_done',         label: 'Inward Done',         color: 'bg-blue-500/20 text-blue-400'      },
  { key: 'destuffing',          label: 'Destuffing',          color: 'bg-yellow-500/20 text-yellow-400'  },
  { key: 'destuff_done',        label: 'Destuff Done',        color: 'bg-purple-500/20 text-purple-400'  },
  { key: 'in_storage',          label: 'In Storage',          color: 'bg-orange-500/20 text-orange-400'  },
  { key: 'do_received',         label: 'DO Received',         color: 'bg-teal-500/20 text-teal-400'      },
  { key: 'delivery_in_progress',label: 'Delivery In Progress',color: 'bg-indigo-500/20 text-indigo-400'  },
  { key: 'delivered',           label: 'Delivered',           color: 'bg-green-500/20 text-green-400'    },
  { key: 'empty_returned',      label: 'Empty Returned',      color: 'bg-green-700/20 text-green-300'    },
  { key: 'closed',              label: 'Closed',              color: 'bg-slate-700/20 text-slate-500'    },
];
const STATUS_MAP = Object.fromEntries(STATUS_FLOW.map(s => [s.key, s]));

const CONDITION_TYPES  = ['good','damaged','partially_damaged','seal_broken'];
const DESTUFF_TYPES    = ['factory','dock','cfs','direct_delivery'];
const DOC_LABELS: Record<string, string> = {
  do_received: 'DO Received', custom_cleared: 'Custom Cleared',
  delivery_challan: 'Delivery Challan', empty_receipt: 'Empty Receipt', weighment_slip: 'Weighment Slip',
};

const inp = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500';
const sel = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500';
const lbl = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';

function Sect({ title }: { title: string }) {
  return <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b border-slate-800">{title}</h4>;
}

export default function CfsPage() {
  const [ops, setOps]         = useState<CfsOp[]>([]);
  const [jobs, setJobs]       = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [editId, setEditId]   = useState<string | null>(null);

  // Form fields
  const [fJobId,       setFJobId]       = useState('');
  const [fOpType,      setFOpType]      = useState('import');
  const [fStatus,      setFStatus]      = useState('inward_pending');
  const [fCfsNum,      setFCfsNum]      = useState('');
  const [fCfsLoc,      setFCfsLoc]      = useState('');
  const [fContainer,   setFContainer]   = useState('');
  const [fSeal,        setFSeal]        = useState('');
  const [fVessel,      setFVessel]      = useState('');
  const [fVoyage,      setFVoyage]      = useState('');
  const [fMbl,         setFMbl]         = useState('');
  const [fHbl,         setFHbl]         = useState('');
  const [fLine,        setFLine]        = useState('');
  const [fInwardDate,  setFInwardDate]  = useState('');
  const [fInwardTime,  setFInwardTime]  = useState('');
  const [fWtInward,    setFWtInward]    = useState('');
  const [fPkgInward,   setFPkgInward]   = useState('');
  const [fCondition,   setFCondition]   = useState('good');
  const [fDamageRmk,   setFDamageRmk]   = useState('');
  const [fDestuffType, setFDestuffType] = useState('');
  const [fDestuffDate, setFDestuffDate] = useState('');
  const [fWtActual,    setFWtActual]    = useState('');
  const [fPkgActual,   setFPkgActual]   = useState('');
  const [fCbm,         setFCbm]         = useState('');
  const [fDestuffRmk,  setFDestuffRmk]  = useState('');
  const [fDestuffBy,   setFDestuffBy]   = useState('');
  const [fStorageStart,setFStorageStart]= useState('');
  const [fStorageEnd,  setFStorageEnd]  = useState('');
  const [fStorageChg,  setFStorageChg]  = useState('');
  const [fDoNum,       setFDoNum]       = useState('');
  const [fDoDate,      setFDoDate]      = useState('');
  const [fDoExpiry,    setFDoExpiry]    = useState('');
  const [fOutDate,     setFOutDate]     = useState('');
  const [fDeliveredTo, setFDeliveredTo] = useState('');
  const [fTransporter, setFTransporter] = useState('');
  const [fVehicle,     setFVehicle]     = useState('');
  const [fDriver,      setFDriver]      = useState('');
  const [fDriverMob,   setFDriverMob]   = useState('');
  const [fChallan,     setFChallan]     = useState('');
  const [fEmptyDate,   setFEmptyDate]   = useState('');
  const [fEmptyLoc,    setFEmptyLoc]    = useState('');
  const [fEmptyTo,     setFEmptyTo]     = useState('');
  const [fEmptyReceipt,setFEmptyReceipt]= useState('');
  const [fHandling,    setFHandling]    = useState('');
  const [fExamChg,     setFExamChg]     = useState('');
  const [fNotes,       setFNotes]       = useState('');
  const [fDocs,        setFDocs]        = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, jRes] = await Promise.all([fetch('/api/cfs?per_page=100'), fetch('/api/jobs?per_page=200')]);
      const cData = await cRes.json(); setOps(cData.data ?? []);
      const jData = await jRes.json(); setJobs(jData.data ?? []);
    } catch { toast.error('Failed to load'); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setEditId(null); setFJobId(''); setFOpType('import'); setFStatus('inward_pending');
    setFCfsNum(''); setFCfsLoc(''); setFContainer(''); setFSeal('');
    setFVessel(''); setFVoyage(''); setFMbl(''); setFHbl(''); setFLine('');
    setFInwardDate(''); setFInwardTime(''); setFWtInward(''); setFPkgInward('');
    setFCondition('good'); setFDamageRmk(''); setFDestuffType(''); setFDestuffDate('');
    setFWtActual(''); setFPkgActual(''); setFCbm(''); setFDestuffRmk(''); setFDestuffBy('');
    setFStorageStart(''); setFStorageEnd(''); setFStorageChg('');
    setFDoNum(''); setFDoDate(''); setFDoExpiry(''); setFOutDate('');
    setFDeliveredTo(''); setFTransporter(''); setFVehicle(''); setFDriver(''); setFDriverMob(''); setFChallan('');
    setFEmptyDate(''); setFEmptyLoc(''); setFEmptyTo(''); setFEmptyReceipt('');
    setFHandling(''); setFExamChg(''); setFNotes(''); setFDocs({});
  };

  const openEdit = (op: CfsOp) => {
    setEditId(op.id ?? null);
    setFJobId(op.job_id ?? ''); setFOpType(op.operation_type); setFStatus(op.status);
    setFCfsNum(op.cfs_number ?? ''); setFCfsLoc(op.cfs_location ?? '');
    setFContainer(op.container_number ?? ''); setFSeal(op.seal_number ?? '');
    setFVessel(op.vessel_name ?? ''); setFVoyage(op.voyage_number ?? '');
    setFMbl(op.mbl_number ?? ''); setFHbl(op.hbl_number ?? ''); setFLine(op.line_name ?? '');
    setFInwardDate(op.inward_date ?? ''); setFInwardTime(op.inward_time ?? '');
    setFWtInward(String(op.gross_weight_inward ?? '')); setFPkgInward(String(op.packages_inward ?? ''));
    setFCondition(op.condition_on_arrival ?? 'good'); setFDamageRmk(op.damage_remarks ?? '');
    setFDestuffType(op.destuff_type ?? ''); setFDestuffDate(op.destuff_date ?? '');
    setFWtActual(String(op.gross_weight_actual ?? '')); setFPkgActual(String(op.packages_actual ?? ''));
    setFCbm(String(op.cbm_actual ?? '')); setFDestuffRmk(op.destuff_remarks ?? ''); setFDestuffBy(op.destuff_done_by ?? '');
    setFStorageStart(op.storage_start_date ?? ''); setFStorageEnd(op.storage_end_date ?? '');
    setFStorageChg(String(op.storage_charges ?? ''));
    setFDoNum(op.do_number ?? ''); setFDoDate(op.do_date ?? ''); setFDoExpiry(op.do_expiry ?? '');
    setFOutDate(op.out_date ?? ''); setFDeliveredTo(op.delivered_to ?? '');
    setFTransporter(op.transporter_name ?? ''); setFVehicle(op.vehicle_number ?? '');
    setFDriver(op.driver_name ?? ''); setFDriverMob(op.driver_mobile ?? ''); setFChallan(op.delivery_challan ?? '');
    setFEmptyDate(op.empty_return_date ?? ''); setFEmptyLoc(op.empty_return_location ?? '');
    setFEmptyTo(op.empty_returned_to ?? ''); setFEmptyReceipt(op.empty_receipt_number ?? '');
    setFHandling(String(op.handling_charges ?? '')); setFExamChg(String(op.examination_charges ?? ''));
    setFNotes(op.notes ?? ''); setFDocs(op.documents ?? {});
    setShowForm(true);
  };

  const save = async () => {
    if (!fContainer && !fJobId) return toast.error('Container number or Job required');
    setSaving(true);
    try {
      const handling = parseFloat(fHandling) || 0;
      const exam     = parseFloat(fExamChg) || 0;
      const storage  = parseFloat(fStorageChg) || 0;
      const body = {
        job_id: fJobId || undefined, operation_type: fOpType, status: fStatus,
        cfs_number: fCfsNum || undefined, cfs_location: fCfsLoc || undefined,
        container_number: fContainer || undefined, seal_number: fSeal || undefined,
        vessel_name: fVessel || undefined, voyage_number: fVoyage || undefined,
        mbl_number: fMbl || undefined, hbl_number: fHbl || undefined, line_name: fLine || undefined,
        inward_date: fInwardDate || undefined, inward_time: fInwardTime || undefined,
        gross_weight_inward: fWtInward ? parseFloat(fWtInward) : undefined,
        packages_inward: fPkgInward ? parseInt(fPkgInward) : undefined,
        condition_on_arrival: fCondition, damage_remarks: fDamageRmk || undefined,
        destuff_type: fDestuffType || undefined, destuff_date: fDestuffDate || undefined,
        gross_weight_actual: fWtActual ? parseFloat(fWtActual) : undefined,
        packages_actual: fPkgActual ? parseInt(fPkgActual) : undefined,
        cbm_actual: fCbm ? parseFloat(fCbm) : undefined,
        destuff_remarks: fDestuffRmk || undefined, destuff_done_by: fDestuffBy || undefined,
        storage_start_date: fStorageStart || undefined, storage_end_date: fStorageEnd || undefined,
        storage_charges: storage,
        do_number: fDoNum || undefined, do_date: fDoDate || undefined, do_expiry: fDoExpiry || undefined,
        out_date: fOutDate || undefined, delivered_to: fDeliveredTo || undefined,
        transporter_name: fTransporter || undefined, vehicle_number: fVehicle || undefined,
        driver_name: fDriver || undefined, driver_mobile: fDriverMob || undefined,
        delivery_challan: fChallan || undefined,
        empty_return_date: fEmptyDate || undefined, empty_return_location: fEmptyLoc || undefined,
        empty_returned_to: fEmptyTo || undefined, empty_receipt_number: fEmptyReceipt || undefined,
        handling_charges: handling, examination_charges: exam,
        total_cfs_charges: handling + exam + storage,
        documents: fDocs, notes: fNotes || undefined,
      };
      const url    = editId ? `/api/cfs/${editId}` : '/api/cfs';
      const method = editId ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data   = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(editId ? 'CFS record updated' : 'CFS record created');
      setShowForm(false); load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    setSaving(false);
  };

  const filtered = ops.filter(op => {
    const q = search.toLowerCase();
    if (q && !op.container_number?.toLowerCase().includes(q) && !op.job?.job_number?.toLowerCase().includes(q) && !op.cfs_location?.toLowerCase().includes(q)) return false;
    if (statusFilter !== 'all' && op.status !== statusFilter) return false;
    return true;
  });

  const stats = [
    { label: 'Total',          value: ops.length },
    { label: 'Inward/Destuff', value: ops.filter(o => ['inward_done','destuffing','destuff_done'].includes(o.status)).length },
    { label: 'In Storage',     value: ops.filter(o => o.status === 'in_storage').length },
    { label: 'Delivered',      value: ops.filter(o => ['delivered','empty_returned','closed'].includes(o.status)).length },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">CFS Operations</h1>
          <p className="text-slate-400 text-sm mt-1">Container inward, destuffing, storage, delivery — managed by Ganesh</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold">
            <Plus className="w-4 h-4" /> New CFS Record
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-2xl font-bold text-white">{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search container, job, CFS…"
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-brand-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-400 focus:outline-none">
          <option value="all">All Status</option>
          {STATUS_FLOW.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-800">
            {['Container','Job','CFS Location','Inward Date','Destuff','DO No.','Status','Charges'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map(op => {
              const sc = STATUS_MAP[op.status] ?? STATUS_FLOW[0];
              return (
                <tr key={op.id} onClick={() => openEdit(op)}
                  className="border-b border-slate-800/50 hover:bg-slate-800/40 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs font-bold text-slate-200">{op.container_number ?? '—'}</p>
                    <p className="text-xs text-slate-500">{op.seal_number ? `Seal: ${op.seal_number}` : ''}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold text-brand-400">{op.job?.job_number ?? '—'}</p>
                    <p className="text-xs text-slate-500">{op.job?.customer?.company_name ?? ''}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{op.cfs_location ?? '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {op.inward_date ? new Date(op.inward_date).toLocaleDateString('en-IN', { day:'numeric', month:'short' }) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-400">{op.destuff_type ? op.destuff_type.replace('_',' ') : '—'}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-400">{op.do_number ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.color}`}>{sc.label}</span>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-slate-300">
                    {op.total_cfs_charges ? `₹${op.total_cfs_charges.toLocaleString('en-IN')}` : '—'}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && !loading && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                <Warehouse className="w-8 h-8 mx-auto mb-2 opacity-30" />No CFS records found
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Form Drawer */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-end z-50">
          <div className="bg-slate-900 border-l border-slate-700 h-full w-full max-w-2xl overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{editId ? `CFS: ${fContainer || 'Edit Record'}` : 'New CFS Record'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-6 space-y-8">
              {/* Basic */}
              <div>
                <Sect title="Basic Info" />
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Operation Type</label>
                    <select className={sel} value={fOpType} onChange={e => setFOpType(e.target.value)}>
                      <option value="import">Import</option><option value="export">Export</option>
                    </select>
                  </div>
                  <div><label className={lbl}>Status</label>
                    <select className={sel} value={fStatus} onChange={e => setFStatus(e.target.value)}>
                      {STATUS_FLOW.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>Link to Job</label>
                    <select className={sel} value={fJobId} onChange={e => setFJobId(e.target.value)}>
                      <option value="">None</option>
                      {jobs.map(j => <option key={j.id} value={j.id}>{j.job_number} — {j.customer?.company_name ?? ''}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>CFS Number</label><input className={inp} value={fCfsNum} onChange={e => setFCfsNum(e.target.value)} /></div>
                  <div className="col-span-2"><label className={lbl}>CFS Location / Name</label><input className={inp} value={fCfsLoc} onChange={e => setFCfsLoc(e.target.value)} placeholder="e.g. Balaji CFS, Nhava Sheva" /></div>
                </div>
              </div>

              {/* Container */}
              <div>
                <Sect title="Container & Vessel" />
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Container Number *</label><input className={inp} value={fContainer} onChange={e => setFContainer(e.target.value)} placeholder="MSCU1234567" /></div>
                  <div><label className={lbl}>Seal Number</label><input className={inp} value={fSeal} onChange={e => setFSeal(e.target.value)} /></div>
                  <div><label className={lbl}>Vessel Name</label><input className={inp} value={fVessel} onChange={e => setFVessel(e.target.value)} /></div>
                  <div><label className={lbl}>Voyage No.</label><input className={inp} value={fVoyage} onChange={e => setFVoyage(e.target.value)} /></div>
                  <div><label className={lbl}>MBL Number</label><input className={inp} value={fMbl} onChange={e => setFMbl(e.target.value)} /></div>
                  <div><label className={lbl}>HBL Number</label><input className={inp} value={fHbl} onChange={e => setFHbl(e.target.value)} /></div>
                  <div className="col-span-2"><label className={lbl}>Shipping Line</label><input className={inp} value={fLine} onChange={e => setFLine(e.target.value)} placeholder="MSC, Maersk, COSCO…" /></div>
                </div>
              </div>

              {/* Inward */}
              <div>
                <Sect title="Container Inward" />
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Inward Date</label><input type="date" className={inp} value={fInwardDate} onChange={e => setFInwardDate(e.target.value)} /></div>
                  <div><label className={lbl}>Inward Time</label><input type="time" className={inp} value={fInwardTime} onChange={e => setFInwardTime(e.target.value)} /></div>
                  <div><label className={lbl}>Gross Weight (kg)</label><input type="number" className={inp} value={fWtInward} onChange={e => setFWtInward(e.target.value)} /></div>
                  <div><label className={lbl}>Packages</label><input type="number" className={inp} value={fPkgInward} onChange={e => setFPkgInward(e.target.value)} /></div>
                  <div><label className={lbl}>Condition on Arrival</label>
                    <select className={sel} value={fCondition} onChange={e => setFCondition(e.target.value)}>
                      {CONDITION_TYPES.map(c => <option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}
                    </select>
                  </div>
                  {fCondition !== 'good' && (
                    <div><label className={lbl}>Damage Remarks</label><input className={inp} value={fDamageRmk} onChange={e => setFDamageRmk(e.target.value)} /></div>
                  )}
                </div>
              </div>

              {/* Destuffing */}
              <div>
                <Sect title="Destuffing" />
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Destuff Type</label>
                    <select className={sel} value={fDestuffType} onChange={e => setFDestuffType(e.target.value)}>
                      <option value="">— Select —</option>
                      {DESTUFF_TYPES.map(d => <option key={d} value={d}>{d.replace(/_/g,' ')}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>Destuff Date</label><input type="date" className={inp} value={fDestuffDate} onChange={e => setFDestuffDate(e.target.value)} /></div>
                  <div><label className={lbl}>Actual Weight (kg)</label><input type="number" className={inp} value={fWtActual} onChange={e => setFWtActual(e.target.value)} /></div>
                  <div><label className={lbl}>Actual Packages</label><input type="number" className={inp} value={fPkgActual} onChange={e => setFPkgActual(e.target.value)} /></div>
                  <div><label className={lbl}>CBM</label><input type="number" className={inp} value={fCbm} onChange={e => setFCbm(e.target.value)} /></div>
                  <div><label className={lbl}>Done By</label><input className={inp} value={fDestuffBy} onChange={e => setFDestuffBy(e.target.value)} /></div>
                  <div className="col-span-2"><label className={lbl}>Destuff Remarks</label><textarea rows={2} className={inp} value={fDestuffRmk} onChange={e => setFDestuffRmk(e.target.value)} /></div>
                </div>
              </div>

              {/* Storage */}
              <div>
                <Sect title="Storage" />
                <div className="grid grid-cols-3 gap-4">
                  <div><label className={lbl}>Start Date</label><input type="date" className={inp} value={fStorageStart} onChange={e => setFStorageStart(e.target.value)} /></div>
                  <div><label className={lbl}>End Date</label><input type="date" className={inp} value={fStorageEnd} onChange={e => setFStorageEnd(e.target.value)} /></div>
                  <div><label className={lbl}>Charges (₹)</label><input type="number" className={inp} value={fStorageChg} onChange={e => setFStorageChg(e.target.value)} /></div>
                </div>
              </div>

              {/* DO & Delivery */}
              <div>
                <Sect title="Delivery Order & Delivery" />
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>DO Number</label><input className={inp} value={fDoNum} onChange={e => setFDoNum(e.target.value)} /></div>
                  <div><label className={lbl}>DO Date</label><input type="date" className={inp} value={fDoDate} onChange={e => setFDoDate(e.target.value)} /></div>
                  <div><label className={lbl}>DO Expiry</label><input type="date" className={inp} value={fDoExpiry} onChange={e => setFDoExpiry(e.target.value)} /></div>
                  <div><label className={lbl}>Out Date</label><input type="date" className={inp} value={fOutDate} onChange={e => setFOutDate(e.target.value)} /></div>
                  <div className="col-span-2"><label className={lbl}>Delivered To</label><input className={inp} value={fDeliveredTo} onChange={e => setFDeliveredTo(e.target.value)} /></div>
                  <div><label className={lbl}>Transporter</label><input className={inp} value={fTransporter} onChange={e => setFTransporter(e.target.value)} /></div>
                  <div><label className={lbl}>Vehicle No.</label><input className={inp} value={fVehicle} onChange={e => setFVehicle(e.target.value)} /></div>
                  <div><label className={lbl}>Driver Name</label><input className={inp} value={fDriver} onChange={e => setFDriver(e.target.value)} /></div>
                  <div><label className={lbl}>Driver Mobile</label><input className={inp} value={fDriverMob} onChange={e => setFDriverMob(e.target.value)} /></div>
                  <div className="col-span-2"><label className={lbl}>Delivery Challan No.</label><input className={inp} value={fChallan} onChange={e => setFChallan(e.target.value)} /></div>
                </div>
              </div>

              {/* Empty Return */}
              <div>
                <Sect title="Empty Return to Line" />
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Return Date</label><input type="date" className={inp} value={fEmptyDate} onChange={e => setFEmptyDate(e.target.value)} /></div>
                  <div><label className={lbl}>Return Location</label><input className={inp} value={fEmptyLoc} onChange={e => setFEmptyLoc(e.target.value)} placeholder="Depot name" /></div>
                  <div><label className={lbl}>Returned To (Line)</label><input className={inp} value={fEmptyTo} onChange={e => setFEmptyTo(e.target.value)} /></div>
                  <div><label className={lbl}>Empty Receipt No.</label><input className={inp} value={fEmptyReceipt} onChange={e => setFEmptyReceipt(e.target.value)} /></div>
                </div>
              </div>

              {/* Charges */}
              <div>
                <Sect title="CFS Charges" />
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Handling Charges (₹)</label><input type="number" className={inp} value={fHandling} onChange={e => setFHandling(e.target.value)} /></div>
                  <div><label className={lbl}>Examination Charges (₹)</label><input type="number" className={inp} value={fExamChg} onChange={e => setFExamChg(e.target.value)} /></div>
                </div>
                {(fHandling || fExamChg || fStorageChg) && (
                  <div className="mt-3 p-3 bg-slate-800 rounded-lg text-sm">
                    <span className="text-slate-400">Total CFS Charges: </span>
                    <span className="text-white font-bold">₹{((parseFloat(fHandling)||0)+(parseFloat(fExamChg)||0)+(parseFloat(fStorageChg)||0)).toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              {/* Documents */}
              <div>
                <Sect title="Document Checklist" />
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(DOC_LABELS).map(([key, label]) => (
                    <button key={key} onClick={() => setFDocs(d => ({ ...d, [key]: !d[key] }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium text-left transition-colors ${
                        fDocs[key] ? 'bg-green-600/20 border-green-600/40 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}>
                      <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${fDocs[key] ? 'text-green-400' : 'text-slate-600'}`} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className={lbl}>Notes</label>
                <textarea rows={2} className={inp} value={fNotes} onChange={e => setFNotes(e.target.value)} />
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 px-6 py-4 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm border border-slate-700">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />{saving ? 'Saving…' : editId ? 'Update' : 'Create CFS Record'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
