'use client';
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Scale, Plus, Search, FileText, CheckCircle, Clock,
  AlertCircle, Bot, Calendar, ChevronRight, RefreshCw,
  X, Save, Package, Hash, DollarSign
} from 'lucide-react';

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
  job?: { job_number: string; cargo_description?: string; customer?: { company_name: string } };
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending:        { label: 'Pending',        color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',  icon: <Clock className="w-3 h-3" /> },
  filed:          { label: 'Filed',          color: 'bg-blue-500/20 text-blue-400 border-blue-500/30',        icon: <FileText className="w-3 h-3" /> },
  under_assessment:{ label: 'Under Assessment', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30', icon: <Scale className="w-3 h-3" /> },
  examination:    { label: 'Examination',    color: 'bg-orange-500/20 text-orange-400 border-orange-500/30',  icon: <AlertCircle className="w-3 h-3" /> },
  query_raised:   { label: 'Query Raised',   color: 'bg-red-500/20 text-red-400 border-red-500/30',           icon: <AlertCircle className="w-3 h-3" /> },
  duty_paid:      { label: 'Duty Paid',      color: 'bg-teal-500/20 text-teal-400 border-teal-500/30',        icon: <DollarSign className="w-3 h-3" /> },
  out_of_charge:  { label: 'Out of Charge',  color: 'bg-green-500/20 text-green-400 border-green-500/30',     icon: <CheckCircle className="w-3 h-3" /> },
  completed:      { label: 'Completed',      color: 'bg-slate-600/20 text-slate-400 border-slate-600/30',     icon: <CheckCircle className="w-3 h-3" /> },
};

const BE_TYPES    = ['into_bond','ex_bond','home_consumption','warehouse','ata_carnet'];
const EXAM_TYPES  = ['first_check','second_check','scanning','rms','pca'];
const CURRENCIES  = ['USD','EUR','GBP','JPY','CNY','INR'];
const STATUSES    = Object.keys(STATUS_CONFIG);

const DOC_LABELS: Record<string, string> = {
  invoice: 'Commercial Invoice',
  packing_list: 'Packing List',
  bl_awb: 'BL / AWB',
  certificate_of_origin: 'Certificate of Origin',
  test_report: 'Test Report',
  iec_copy: 'IEC Copy',
  gst_registration: 'GST Registration',
  technical_writeup: 'Technical Write-up',
};

export default function CustomsPage() {
  const [entries, setEntries] = useState<CustomsEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<CustomsEntry | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Partial<CustomsEntry>>({});
  const [saving, setSaving] = useState(false);
  const [jobs, setJobs] = useState<{ id: string; job_number: string; customer?: { company_name: string } }[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/customs?per_page=100');
      const data = await res.json();
      setEntries(data.data || []);
    } catch { toast.error('Failed to load customs entries'); }
    setLoading(false);
  }, []);

  const loadJobs = useCallback(async () => {
    const res = await fetch('/api/jobs?per_page=200');
    const data = await res.json();
    setJobs(data.data || []);
  }, []);

  useEffect(() => { load(); loadJobs(); }, [load, loadJobs]);

  const filtered = entries.filter(e => {
    const q = search.toLowerCase();
    if (q && !e.be_number?.toLowerCase().includes(q) && !e.job?.job_number?.toLowerCase().includes(q) && !e.importer_name?.toLowerCase().includes(q)) return false;
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    return true;
  });

  const save = async () => {
    if (!form.job_id) return toast.error('Job required');
    setSaving(true);
    try {
      const isEdit = !!form.id;
      const url = isEdit ? `/api/customs/${form.id}` : '/api/customs';
      const res = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(isEdit ? 'Entry updated' : 'BE created');
      setShowForm(false);
      setSelected(null);
      load();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    setSaving(false);
  };

  const toggleDoc = (key: string) => {
    setForm(f => ({
      ...f,
      document_checklist: {
        ...(f.document_checklist || {}),
        [key]: !f.document_checklist?.[key],
      }
    }));
  };

  // Stats
  const stats = [
    { label: 'Total', value: entries.length },
    { label: 'Pending / Filed', value: entries.filter(e => ['pending','filed','under_assessment'].includes(e.status)).length },
    { label: 'Examination', value: entries.filter(e => e.status === 'examination').length },
    { label: 'Out of Charge', value: entries.filter(e => e.status === 'out_of_charge' || e.status === 'completed').length },
  ];

  const F = ({ label, fkey, type = 'text', options }: { label: string; fkey: string; type?: string; options?: string[] }) => (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
      {options ? (
        <select value={String((form as Record<string, unknown>)[fkey] || '')} onChange={e => setForm(f => ({ ...f, [fkey]: e.target.value }))}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500">
          <option value="">—</option>
          {options.map(o => <option key={o} value={o}>{o.replace(/_/g,' ')}</option>)}
        </select>
      ) : (
        <input type={type} value={String((form as Record<string, unknown>)[fkey] || '')}
          onChange={e => setForm(f => ({ ...f, [fkey]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500" />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Customs Clearance</h1>
          <p className="text-slate-400 text-sm mt-1">Bill of Entry, duty calculation, examination tracking</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => { setForm({}); setSelected(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold">
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
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search BE, job, importer..."
            className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-brand-500" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-400 focus:outline-none">
          <option value="all">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{STATUS_CONFIG[s]?.label || s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800">
              {['Job','BE Number','Importer','Port','HS Code','Total Duty','Status','AI'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(e => {
              const sc = STATUS_CONFIG[e.status] || STATUS_CONFIG.pending;
              return (
                <tr key={e.id} onClick={() => { setForm(e); setSelected(e); setShowForm(true); }}
                  className="border-b border-slate-800/50 hover:bg-slate-800/40 cursor-pointer transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-mono text-xs text-brand-400">{e.job?.job_number || '—'}</p>
                    <p className="text-xs text-slate-500">{e.job?.customer?.company_name || '—'}</p>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{e.be_number || '—'}</td>
                  <td className="px-4 py-3 text-slate-300">{e.importer_name || '—'}</td>
                  <td className="px-4 py-3 text-slate-400">{e.port_of_entry || '—'}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{e.hs_code || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-slate-200">
                    {e.total_duty ? `₹${e.total_duty.toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${sc.color}`}>
                      {sc.icon}{sc.label}
                    </span>
                    {e.status === 'examination' && (
                      <p className="text-xs text-orange-400 mt-0.5">{e.examination_type?.replace('_', ' ')}</p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {e.ai_notes ? (
                      <span className="flex items-center gap-1 text-xs text-purple-400">
                        <Bot className="w-3 h-3" /> Checked
                      </span>
                    ) : '—'}
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

      {/* FORM DRAWER */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-end z-50">
          <div className="bg-slate-900 border-l border-slate-700 h-full w-full max-w-2xl overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{form.id ? `BE: ${form.be_number || 'Edit Entry'}` : 'New Bill of Entry'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-6 space-y-8">
              {/* Job Link */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Job</h4>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Link to Job *</label>
                  <select value={form.job_id || ''} onChange={e => setForm(f => ({ ...f, job_id: e.target.value }))}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none">
                    <option value="">Select job…</option>
                    {jobs.map(j => <option key={j.id} value={j.id}>{j.job_number} — {j.customer?.company_name}</option>)}
                  </select>
                </div>
              </div>

              {/* BE Details */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">BE Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <F label="BE Number" fkey="be_number" />
                  <F label="BE Type" fkey="be_type" options={BE_TYPES} />
                  <F label="BE Date" fkey="be_date" type="date" />
                  <F label="Filing Date" fkey="filing_date" type="date" />
                  <F label="Port of Entry" fkey="port_of_entry" />
                  <F label="HS Code" fkey="hs_code" />
                  <F label="Status" fkey="status" options={STATUSES} />
                  <F label="IEC Code" fkey="iec_code" />
                </div>
              </div>

              {/* Importer */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Importer</h4>
                <div className="grid grid-cols-2 gap-4">
                  <F label="Importer Name" fkey="importer_name" />
                  <F label="GSTIN" fkey="gstin" />
                  <F label="Country of Origin" fkey="country_of_origin" />
                </div>
              </div>

              {/* Value */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Valuation</h4>
                <div className="grid grid-cols-2 gap-4">
                  <F label="Currency" fkey="currency" options={CURRENCIES} />
                  <F label="Exchange Rate" fkey="exchange_rate" type="number" />
                  <F label="CIF Value (Foreign)" fkey="cif_value" type="number" />
                  <F label="Assessable Value (INR)" fkey="assessable_value" type="number" />
                </div>
              </div>

              {/* Duty */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Duty Calculation</h4>
                <div className="grid grid-cols-2 gap-4">
                  <F label="Basic Duty Rate (%)" fkey="basic_duty_rate" type="number" />
                  <F label="Basic Duty (₹)" fkey="basic_duty" type="number" />
                  <F label="SWS (₹)" fkey="social_welfare_surcharge" type="number" />
                  <F label="IGST Rate (%)" fkey="igst_rate" type="number" />
                  <F label="IGST Amount (₹)" fkey="igst_amount" type="number" />
                  <F label="Total Duty (₹)" fkey="total_duty" type="number" />
                  <F label="Duty Paid (₹)" fkey="duty_paid_amount" type="number" />
                  <F label="Duty Paid Date" fkey="duty_paid_date" type="date" />
                </div>
              </div>

              {/* Timeline */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Timeline</h4>
                <div className="grid grid-cols-2 gap-4">
                  <F label="Assessment Date" fkey="assessment_date" type="date" />
                  <F label="Out of Charge Date" fkey="out_of_charge_date" type="date" />
                  <F label="Release Date" fkey="release_date" type="date" />
                </div>
              </div>

              {/* Examination */}
              {(form.status === 'examination' || form.examination_type) && (
                <div>
                  <h4 className="text-xs font-bold text-orange-400 uppercase tracking-widest mb-3">⚠ Examination Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <F label="Examination Type" fkey="examination_type" options={EXAM_TYPES} />
                    <F label="Exam Date" fkey="examination_date" type="date" />
                    <F label="Examination Officer" fkey="examination_officer" />
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Examination Notes</label>
                    <textarea value={form.examination_notes || ''} onChange={e => setForm(f => ({ ...f, examination_notes: e.target.value }))} rows={3}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-orange-500" />
                  </div>
                </div>
              )}

              {/* AI Notes from Dipika */}
              {form.ai_notes && (
                <div>
                  <h4 className="text-xs font-bold text-purple-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Bot className="w-4 h-4" /> Dipika AI Analysis
                  </h4>
                  <div className="bg-purple-950/30 border border-purple-800/30 rounded-lg p-4">
                    <p className="text-xs text-slate-300 whitespace-pre-wrap">{form.ai_notes}</p>
                    {form.ai_checked_at && (
                      <p className="text-xs text-slate-500 mt-2">Checked: {new Date(form.ai_checked_at).toLocaleString('en-IN')}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Document Checklist */}
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Document Checklist</h4>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(DOC_LABELS).map(([key, label]) => (
                    <button key={key} onClick={() => toggleDoc(key)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-colors text-left ${
                        form.document_checklist?.[key]
                          ? 'bg-green-600/20 border-green-600/40 text-green-400'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}>
                      <CheckCircle className={`w-3.5 h-3.5 shrink-0 ${form.document_checklist?.[key] ? 'text-green-400' : 'text-slate-600'}`} />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Remarks</label>
                <textarea value={form.remarks || ''} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500" />
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 px-6 py-4 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm border border-slate-700">Cancel</button>
              <button onClick={save} disabled={saving} className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />{saving ? 'Saving…' : form.id ? 'Update BE' : 'Create BE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
