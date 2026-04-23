'use client';
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Scale, Plus, Search, FileText, CheckCircle, AlertCircle, Bot, RefreshCw, X, Save, DollarSign, Clock } from 'lucide-react';

type CustomsEntry = {
  id: string; job_id: string; be_number?: string; entry_number?: string;
  be_date?: string; be_type?: string; importer_name?: string; iec_code?: string;
  gstin?: string; port_of_entry?: string; hs_code?: string;
  cif_value?: number; assessable_value?: number; exchange_rate?: number;
  declared_value?: number; currency?: string;
  basic_duty_rate?: number; basic_duty?: number; igst_rate?: number;
  igst_amount?: number; social_welfare_surcharge?: number; total_duty?: number;
  duty_paid_amount?: number; status: string;
  filing_date?: string; assessment_date?: string; duty_paid_date?: string;
  out_of_charge_date?: string; release_date?: string;
  examination_type?: string; examination_date?: string;
  examination_officer?: string; examination_notes?: string;
  ai_notes?: string; ai_checked_at?: string;
  document_checklist?: Record<string, boolean>;
  remarks?: string; created_at: string;
  job?: { job_number: string; cargo_description?: string; customer?: { company_name: string } | null };
};

type Job = { id: string; job_number: string; customer?: { company_name: string } | null };

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:          { label: 'Pending',          color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',  icon: <Clock className="w-3 h-3" /> },
  filed:            { label: 'Filed',            color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',        icon: <FileText className="w-3 h-3" /> },
  under_assessment: { label: 'Under Assessment', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: <Scale className="w-3 h-3" /> },
  examination:      { label: 'Examination',      color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: <AlertCircle className="w-3 h-3" /> },
  query_raised:     { label: 'Query Raised',     color: 'bg-red-500/20 text-red-400 border-red-500/30',          icon: <AlertCircle className="w-3 h-3" /> },
  duty_paid:        { label: 'Duty Paid',        color: 'bg-teal-500/20 text-teal-400 border-teal-500/30',       icon: <DollarSign className="w-3 h-3" /> },
  out_of_charge:    { label: 'Out of Charge',    color: 'bg-green-500/20 text-green-400 border-green-500/30',    icon: <CheckCircle className="w-3 h-3" /> },
  completed:        { label: 'Completed',        color: 'bg-slate-600/20 text-slate-400 border-slate-600/30',    icon: <CheckCircle className="w-3 h-3" /> },
};
const STATUSES    = Object.keys(STATUS_CONFIG);
const BE_TYPES    = ['home_consumption','into_bond','ex_bond','warehouse','ata_carnet'];
const EXAM_TYPES  = ['first_check','second_check','scanning','rms','pca'];
const CURRENCIES  = ['USD','EUR','GBP','JPY','CNY','INR'];

const DOC_LABELS: Record<string, string> = {
  invoice: 'Commercial Invoice', packing_list: 'Packing List', bl_awb: 'BL / AWB',
  certificate_of_origin: 'Certificate of Origin', test_report: 'Test Report',
  iec_copy: 'IEC Copy', gst_registration: 'GST Registration', technical_writeup: 'Technical Write-up',
};

// ── Styles (defined at module level — stable references) ──────────────────
const inp = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500';
const sel = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500';
const lbl = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';

// ── Section header — defined OUTSIDE component ────────────────────────────
function Sect({ title }: { title: string }) {
  return <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 pb-1 border-b border-slate-800">{title}</h4>;
}

export default function CustomsPage() {
  const [entries, setEntries] = useState<CustomsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [jobs, setJobs]       = useState<Job[]>([]);

  // Form fields — individual useState to prevent cursor jumping
  const [fJobId,       setFJobId]       = useState('');
  const [fBeNumber,    setFBeNumber]    = useState('');
  const [fEntryNum,    setFEntryNum]    = useState('');
  const [fBeDate,      setFBeDate]      = useState('');
  const [fBeType,      setFBeType]      = useState('');
  const [fStatus,      setFStatus]      = useState('pending');
  const [fImporter,    setFImporter]    = useState('');
  const [fIec,         setFIec]         = useState('');
  const [fGstin,       setFGstin]       = useState('');
  const [fPort,        setFPort]        = useState('');
  const [fHsCode,      setFHsCode]      = useState('');
  const [fCurrency,    setFCurrency]    = useState('USD');
  const [fExRate,      setFExRate]      = useState('');
  const [fCifValue,    setFCifValue]    = useState('');
  const [fAssessable,  setFAssessable]  = useState('');
  const [fBcdRate,     setFBcdRate]     = useState('');
  const [fBcd,         setFBcd]         = useState('');
  const [fSws,         setFSws]         = useState('');
  const [fIgstRate,    setFIgstRate]    = useState('');
  const [fIgst,        setFIgst]        = useState('');
  const [fTotalDuty,   setFTotalDuty]   = useState('');
  const [fDutyPaid,    setFDutyPaid]    = useState('');
  const [fDutyPaidDate,setFDutyPaidDate]= useState('');
  const [fFilingDate,  setFFilingDate]  = useState('');
  const [fAssessDate,  setFAssessDate]  = useState('');
  const [fOocDate,     setFOocDate]     = useState('');
  const [fReleaseDate, setFReleaseDate] = useState('');
  const [fExamType,    setFExamType]    = useState('');
  const [fExamDate,    setFExamDate]    = useState('');
  const [fExamOfficer, setFExamOfficer] = useState('');
  const [fExamNotes,   setFExamNotes]   = useState('');
  const [fRemarks,     setFRemarks]     = useState('');
  const [fDocs,        setFDocs]        = useState<Record<string, boolean>>({});
  const [editId,       setEditId]       = useState<string | null>(null);
  const [aiNotes,      setAiNotes]      = useState('');
  const [aiCheckedAt,  setAiCheckedAt]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/customs?per_page=100');
      const data = await res.json();
      setEntries(data.data ?? []);
    } catch { toast.error('Failed to load'); }
    setLoading(false);
  }, []);

  const loadJobs = useCallback(async () => {
    const res  = await fetch('/api/jobs?per_page=200');
    const data = await res.json();
    setJobs(data.data ?? []);
  }, []);

  useEffect(() => { load(); loadJobs(); }, [load, loadJobs]);

  const openCreate = () => {
    setEditId(null);
    setFJobId(''); setFBeNumber(''); setFEntryNum(''); setFBeDate(''); setFBeType('');
    setFStatus('pending'); setFImporter(''); setFIec(''); setFGstin(''); setFPort('');
    setFHsCode(''); setFCurrency('USD'); setFExRate(''); setFCifValue(''); setFAssessable('');
    setFBcdRate(''); setFBcd(''); setFSws(''); setFIgstRate(''); setFIgst(''); setFTotalDuty('');
    setFDutyPaid(''); setFDutyPaidDate(''); setFFilingDate(''); setFAssessDate('');
    setFOocDate(''); setFReleaseDate(''); setFExamType(''); setFExamDate('');
    setFExamOfficer(''); setFExamNotes(''); setFRemarks(''); setFDocs({});
    setAiNotes(''); setAiCheckedAt('');
    setShowForm(true);
  };

  const openEdit = (e: CustomsEntry) => {
    setEditId(e.id);
    setFJobId(e.job_id ?? '');
    setFBeNumber(e.be_number ?? ''); setFEntryNum(e.entry_number ?? '');
    setFBeDate(e.be_date ?? ''); setFBeType(e.be_type ?? '');
    setFStatus(e.status ?? 'pending'); setFImporter(e.importer_name ?? '');
    setFIec(e.iec_code ?? ''); setFGstin(e.gstin ?? ''); setFPort(e.port_of_entry ?? '');
    setFHsCode(e.hs_code ?? ''); setFCurrency(e.currency ?? 'USD');
    setFExRate(String(e.exchange_rate ?? '')); setFCifValue(String(e.cif_value ?? ''));
    setFAssessable(String(e.assessable_value ?? ''));
    setFBcdRate(String(e.basic_duty_rate ?? '')); setFBcd(String(e.basic_duty ?? ''));
    setFSws(String(e.social_welfare_surcharge ?? '')); setFIgstRate(String(e.igst_rate ?? ''));
    setFIgst(String(e.igst_amount ?? '')); setFTotalDuty(String(e.total_duty ?? ''));
    setFDutyPaid(String(e.duty_paid_amount ?? '')); setFDutyPaidDate(e.duty_paid_date ?? '');
    setFFilingDate(e.filing_date ?? ''); setFAssessDate(e.assessment_date ?? '');
    setFOocDate(e.out_of_charge_date ?? ''); setFReleaseDate(e.release_date ?? '');
    setFExamType(e.examination_type ?? ''); setFExamDate(e.examination_date ?? '');
    setFExamOfficer(e.examination_officer ?? ''); setFExamNotes(e.examination_notes ?? '');
    setFRemarks(e.remarks ?? '');
    setFDocs(e.document_checklist ?? {});
    setAiNotes(e.ai_notes ?? ''); setAiCheckedAt(e.ai_checked_at ?? '');
    setShowForm(true);
  };

  const save = async () => {
    if (!fJobId) return toast.error('Please select a job');
    setSaving(true);
    try {
      const body = {
        job_id: fJobId, be_number: fBeNumber || undefined, entry_number: fEntryNum || undefined,
        be_date: fBeDate || undefined, be_type: fBeType || undefined, status: fStatus,
        importer_name: fImporter || undefined, iec_code: fIec || undefined,
        gstin: fGstin || undefined, port_of_entry: fPort || undefined, hs_code: fHsCode || undefined,
        currency: fCurrency || undefined,
        exchange_rate: fExRate ? parseFloat(fExRate) : undefined,
        cif_value: fCifValue ? parseFloat(fCifValue) : undefined,
        assessable_value: fAssessable ? parseFloat(fAssessable) : undefined,
        basic_duty_rate: fBcdRate ? parseFloat(fBcdRate) : undefined,
        basic_duty: fBcd ? parseFloat(fBcd) : undefined,
        social_welfare_surcharge: fSws ? parseFloat(fSws) : undefined,
        igst_rate: fIgstRate ? parseFloat(fIgstRate) : undefined,
        igst_amount: fIgst ? parseFloat(fIgst) : undefined,
        total_duty: fTotalDuty ? parseFloat(fTotalDuty) : undefined,
        duty_paid_amount: fDutyPaid ? parseFloat(fDutyPaid) : undefined,
        duty_paid_date: fDutyPaidDate || undefined,
        filing_date: fFilingDate || undefined, assessment_date: fAssessDate || undefined,
        out_of_charge_date: fOocDate || undefined, release_date: fReleaseDate || undefined,
        examination_type: fExamType || undefined, examination_date: fExamDate || undefined,
        examination_officer: fExamOfficer || undefined, examination_notes: fExamNotes || undefined,
        remarks: fRemarks || undefined, document_checklist: fDocs,
      };
      const url    = editId ? `/api/customs/${editId}` : '/api/customs';
      const method = editId ? 'PUT' : 'POST';
      const res    = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data   = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(editId ? 'Entry updated' : 'BE created');
      setShowForm(false); load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    setSaving(false);
  };

  const filtered = entries.filter(e => {
    const q = search.toLowerCase();
    if (q && !e.be_number?.toLowerCase().includes(q) && !e.job?.job_number?.toLowerCase().includes(q) && !e.importer_name?.toLowerCase().includes(q)) return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    return true;
  });

  const stats = [
    { label: 'Total',         value: entries.length },
    { label: 'Active',        value: entries.filter(e => ['pending','filed','under_assessment'].includes(e.status)).length },
    { label: 'Examination',   value: entries.filter(e => e.status === 'examination').length },
    { label: 'Out of Charge', value: entries.filter(e => ['out_of_charge','completed'].includes(e.status)).length },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Customs Clearance</h1>
          <p className="text-slate-400 text-sm mt-1">Bill of Entry, duty calculation, examination tracking — Dipika</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold">
            <Plus className="w-4 h-4" /> New BE
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
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search BE, job, importer…"
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-brand-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-400 focus:outline-none">
          <option value="all">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-slate-800">
            {['Job','BE Number','Importer','Port','HS Code','Total Duty','Status','AI'].map(h => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map(e => {
              const sc = STATUS_CONFIG[e.status] ?? STATUS_CONFIG.pending;
              return (
                <tr key={e.id} onClick={() => openEdit(e)}
                  className="border-b border-slate-800/50 hover:bg-slate-800/40 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-brand-400">{e.job?.job_number ?? '—'}</p>
                    <p className="text-xs text-slate-500">{e.job?.customer?.company_name ?? '—'}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{e.be_number ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-300 text-xs">{e.importer_name ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-400 text-xs">{e.port_of_entry ?? '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{e.hs_code ?? '—'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-200 text-xs">{e.total_duty ? `₹${e.total_duty.toLocaleString('en-IN')}` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${sc.color}`}>
                      {sc.icon}{sc.label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {e.ai_notes ? <span className="flex items-center gap-1 text-xs text-purple-400"><Bot className="w-3 h-3" />Checked</span> : '—'}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && !loading && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">
                <Scale className="w-8 h-8 mx-auto mb-2 opacity-30" />No customs entries found
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
              <h3 className="text-lg font-bold text-white">{editId ? `Edit BE: ${fBeNumber || '—'}` : 'New Bill of Entry'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-6 space-y-8">

              {/* Job */}
              <div>
                <Sect title="Job" />
                <label className={lbl}>Link to Job *</label>
                <select className={sel} value={fJobId} onChange={e => setFJobId(e.target.value)}>
                  <option value="">Select job…</option>
                  {jobs.map(j => <option key={j.id} value={j.id}>{j.job_number} — {j.customer?.company_name ?? ''}</option>)}
                </select>
              </div>

              {/* BE Details */}
              <div>
                <Sect title="BE Details" />
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>BE Number</label><input className={inp} value={fBeNumber} onChange={e => setFBeNumber(e.target.value)} /></div>
                  <div><label className={lbl}>Entry Number</label><input className={inp} value={fEntryNum} onChange={e => setFEntryNum(e.target.value)} /></div>
                  <div><label className={lbl}>BE Type</label>
                    <select className={sel} value={fBeType} onChange={e => setFBeType(e.target.value)}>
                      <option value="">—</option>
                      {BE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>Status</label>
                    <select className={sel} value={fStatus} onChange={e => setFStatus(e.target.value)}>
                      {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s]?.label ?? s}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>BE Date</label><input type="date" className={inp} value={fBeDate} onChange={e => setFBeDate(e.target.value)} /></div>
                  <div><label className={lbl}>Filing Date</label><input type="date" className={inp} value={fFilingDate} onChange={e => setFFilingDate(e.target.value)} /></div>
                  <div><label className={lbl}>Port of Entry</label><input className={inp} value={fPort} onChange={e => setFPort(e.target.value)} /></div>
                  <div><label className={lbl}>HS Code</label><input className={inp} value={fHsCode} onChange={e => setFHsCode(e.target.value)} /></div>
                </div>
              </div>

              {/* Importer */}
              <div>
                <Sect title="Importer" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className={lbl}>Importer Name</label><input className={inp} value={fImporter} onChange={e => setFImporter(e.target.value)} /></div>
                  <div><label className={lbl}>IEC Code</label><input className={inp} value={fIec} onChange={e => setFIec(e.target.value)} /></div>
                  <div><label className={lbl}>GSTIN</label><input className={inp} value={fGstin} onChange={e => setFGstin(e.target.value)} /></div>
                </div>
              </div>

              {/* Valuation */}
              <div>
                <Sect title="Valuation" />
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Currency</label>
                    <select className={sel} value={fCurrency} onChange={e => setFCurrency(e.target.value)}>
                      {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div><label className={lbl}>Exchange Rate</label><input type="number" className={inp} value={fExRate} onChange={e => setFExRate(e.target.value)} /></div>
                  <div><label className={lbl}>CIF Value (foreign)</label><input type="number" className={inp} value={fCifValue} onChange={e => setFCifValue(e.target.value)} /></div>
                  <div><label className={lbl}>Assessable Value (₹)</label><input type="number" className={inp} value={fAssessable} onChange={e => setFAssessable(e.target.value)} /></div>
                </div>
              </div>

              {/* Duty */}
              <div>
                <Sect title="Duty Calculation" />
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>BCD Rate (%)</label><input type="number" className={inp} value={fBcdRate} onChange={e => setFBcdRate(e.target.value)} /></div>
                  <div><label className={lbl}>BCD Amount (₹)</label><input type="number" className={inp} value={fBcd} onChange={e => setFBcd(e.target.value)} /></div>
                  <div><label className={lbl}>SWS (₹)</label><input type="number" className={inp} value={fSws} onChange={e => setFSws(e.target.value)} /></div>
                  <div><label className={lbl}>IGST Rate (%)</label><input type="number" className={inp} value={fIgstRate} onChange={e => setFIgstRate(e.target.value)} /></div>
                  <div><label className={lbl}>IGST Amount (₹)</label><input type="number" className={inp} value={fIgst} onChange={e => setFIgst(e.target.value)} /></div>
                  <div><label className={lbl}>Total Duty (₹)</label><input type="number" className={inp} value={fTotalDuty} onChange={e => setFTotalDuty(e.target.value)} /></div>
                  <div><label className={lbl}>Duty Paid (₹)</label><input type="number" className={inp} value={fDutyPaid} onChange={e => setFDutyPaid(e.target.value)} /></div>
                  <div><label className={lbl}>Duty Paid Date</label><input type="date" className={inp} value={fDutyPaidDate} onChange={e => setFDutyPaidDate(e.target.value)} /></div>
                </div>
              </div>

              {/* Timeline */}
              <div>
                <Sect title="Timeline" />
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Assessment Date</label><input type="date" className={inp} value={fAssessDate} onChange={e => setFAssessDate(e.target.value)} /></div>
                  <div><label className={lbl}>Out of Charge Date</label><input type="date" className={inp} value={fOocDate} onChange={e => setFOocDate(e.target.value)} /></div>
                  <div><label className={lbl}>Release Date</label><input type="date" className={inp} value={fReleaseDate} onChange={e => setFReleaseDate(e.target.value)} /></div>
                </div>
              </div>

              {/* Examination */}
              {(fStatus === 'examination' || fExamType) && (
                <div>
                  <Sect title="⚠ Examination Details" />
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={lbl}>Exam Type</label>
                      <select className={sel} value={fExamType} onChange={e => setFExamType(e.target.value)}>
                        <option value="">—</option>
                        {EXAM_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                      </select>
                    </div>
                    <div><label className={lbl}>Exam Date</label><input type="date" className={inp} value={fExamDate} onChange={e => setFExamDate(e.target.value)} /></div>
                    <div className="col-span-2"><label className={lbl}>Examining Officer</label><input className={inp} value={fExamOfficer} onChange={e => setFExamOfficer(e.target.value)} /></div>
                    <div className="col-span-2">
                      <label className={lbl}>Examination Notes</label>
                      <textarea rows={3} className={inp} value={fExamNotes} onChange={e => setFExamNotes(e.target.value)} />
                    </div>
                  </div>
                </div>
              )}

              {/* AI Notes */}
              {aiNotes && (
                <div>
                  <Sect title="Dipika AI Analysis" />
                  <div className="bg-purple-950/30 border border-purple-800/30 rounded-lg p-4">
                    <p className="text-xs text-slate-300 whitespace-pre-wrap">{aiNotes}</p>
                    {aiCheckedAt && <p className="text-xs text-slate-500 mt-2">Checked: {new Date(aiCheckedAt).toLocaleString('en-IN')}</p>}
                  </div>
                </div>
              )}

              {/* Document Checklist */}
              <div>
                <Sect title="Document Checklist" />
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(DOC_LABELS).map(([key, label]) => (
                    <button key={key}
                      onClick={() => setFDocs(d => ({ ...d, [key]: !d[key] }))}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors text-left ${
                        fDocs[key] ? 'bg-green-600/20 border-green-600/40 text-green-400' : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}>
                      <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${fDocs[key] ? 'text-green-400' : 'text-slate-600'}`} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className={lbl}>Remarks</label>
                <textarea rows={2} className={inp} value={fRemarks} onChange={e => setFRemarks(e.target.value)} />
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 px-6 py-4 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm border border-slate-700">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />{saving ? 'Saving…' : editId ? 'Update BE' : 'Create BE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
