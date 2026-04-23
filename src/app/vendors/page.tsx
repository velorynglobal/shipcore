'use client';
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Building2, Plus, Search, Star, Phone, Mail, Save, X, RefreshCw, Trash2 } from 'lucide-react';

type Vendor = {
  id?: string; name: string; vendor_type: string; contact_person?: string;
  mobile?: string; email?: string; city?: string; country?: string;
  pan_number?: string; gstin?: string; credit_days?: number | string; credit_limit?: number | string;
  bank_name?: string; bank_account?: string; bank_ifsc?: string;
  rating?: number | string; preferred?: boolean; is_active?: boolean; notes?: string;
};

type VendorBill = {
  id: string; vendor_id: string; bill_number?: string; bill_date?: string;
  amount: number; gst_amount?: number; total_amount?: number;
  due_date?: string; status: string; vendor?: { name: string };
};

const VENDOR_TYPES = [
  { value: 'shipping_line',    label: 'Shipping Line'    },
  { value: 'nvocc',            label: 'NVOCC'            },
  { value: 'airline',          label: 'Airline'          },
  { value: 'air_carrier',      label: 'Air Carrier'      },
  { value: 'cfs',              label: 'CFS'              },
  { value: 'transporter',      label: 'Transporter'      },
  { value: 'cha',              label: 'CHA'              },
  { value: 'customs_broker',   label: 'Customs Broker'   },
  { value: 'port_agent',       label: 'Port Agent'       },
  { value: 'port_authority',   label: 'Port Authority'   },
  { value: 'freight_forwarder',label: 'Freight Forwarder'},
  { value: 'surveyor',         label: 'Surveyor'         },
  { value: 'warehouse',        label: 'Warehouse'        },
  { value: 'other',            label: 'Other'            },
];

const TYPE_MAP = Object.fromEntries(VENDOR_TYPES.map(t => [t.value, t.label]));

const BILL_STATUS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-400', approved: 'bg-blue-500/20 text-blue-400',
  paid: 'bg-green-500/20 text-green-400', overdue: 'bg-red-500/20 text-red-400',
  cancelled: 'bg-slate-600/20 text-slate-400',
};

const inp = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500 placeholder-slate-600';
const sel = 'w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500';
const lbl = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';

const EMPTY: Vendor = { name: '', vendor_type: 'shipping_line', contact_person: '', mobile: '', email: '', city: '', country: 'India', gstin: '', pan_number: '', credit_days: 30, credit_limit: 0, bank_name: '', bank_account: '', bank_ifsc: '', is_active: true, preferred: false, notes: '' };

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [bills, setBills]     = useState<VendorBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [typeFilter, setType] = useState('all');
  const [tab, setTab]         = useState<'vendors' | 'bills'>('vendors');
  const [form, setForm]       = useState<Vendor>(EMPTY);
  const [showForm, setShowForm]     = useState(false);
  const [saving, setSaving]         = useState(false);
  const [showBill, setShowBill]     = useState(false);
  const [bVendor, setBVendor]       = useState('');
  const [bNumber, setBNumber]       = useState('');
  const [bDate, setBDate]           = useState('');
  const [bAmount, setBAmount]       = useState('');
  const [bGst, setBGst]             = useState('');
  const [bDue, setBDue]             = useState('');
  const [bDesc, setBDesc]           = useState('');

  const loadVendors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vendors?per_page=200');
      const data = await res.json();
      setVendors(data.data ?? []);
    } catch { toast.error('Failed to load vendors'); }
    setLoading(false);
  }, []);

  const loadBills = useCallback(async () => {
    try {
      const res = await fetch('/api/vendor-bills?per_page=100');
      const data = await res.json();
      setBills(data.data ?? []);
    } catch { toast.error('Failed to load bills'); }
  }, []);

  useEffect(() => { loadVendors(); loadBills(); }, [loadVendors, loadBills]);

  // Single stable change handler
  const chg = (key: keyof Vendor) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const v = e.target.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value;
    setForm(f => ({ ...f, [key]: v }));
  };

  const filtered = vendors.filter(v => {
    const q = search.toLowerCase();
    if (q && !v.name?.toLowerCase().includes(q) && !v.city?.toLowerCase().includes(q)) return false;
    if (typeFilter !== 'all' && v.vendor_type !== typeFilter) return false;
    return true;
  });

  const saveVendor = async () => {
    if (!form.name?.trim()) return toast.error('Vendor name required');
    setSaving(true);
    try {
      const isEdit = !!form.id;
      const res = await fetch(isEdit ? `/api/vendors/${form.id}` : '/api/vendors', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(isEdit ? 'Vendor updated' : 'Vendor added');
      setShowForm(false); setForm(EMPTY); loadVendors();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    setSaving(false);
  };

  const saveBill = async () => {
    if (!bVendor || !bAmount) return toast.error('Vendor and amount required');
    try {
      const amount = parseFloat(bAmount) || 0;
      const gst    = parseFloat(bGst) || 0;
      const res = await fetch('/api/vendor-bills', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendor_id: bVendor, bill_number: bNumber, bill_date: bDate || undefined, amount, gst_amount: gst, total_amount: amount + gst, due_date: bDue || undefined, description: bDesc }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success('Bill recorded');
      setShowBill(false);
      setBVendor(''); setBNumber(''); setBDate(''); setBAmount(''); setBGst(''); setBDue(''); setBDesc('');
      loadBills();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed'); }
  };

  const totalPending = bills.filter(b => ['pending','approved'].includes(b.status)).reduce((s, b) => s + (b.total_amount ?? b.amount ?? 0), 0);
  const totalOverdue = bills.filter(b => b.status === 'overdue').reduce((s, b) => s + (b.total_amount ?? b.amount ?? 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Vendors</h1>
          <p className="text-slate-400 text-sm mt-1">Shipping Lines, Airlines, CFS, Transporters & Service Providers</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { loadVendors(); loadBills(); }} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {tab === 'bills'
            ? <button onClick={() => setShowBill(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold"><Plus className="w-4 h-4" />Record Bill</button>
            : <button onClick={() => { setForm(EMPTY); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold"><Plus className="w-4 h-4" />Add Vendor</button>
          }
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Vendors', value: vendors.length,                          color: 'text-slate-300' },
          { label: 'Active',        value: vendors.filter(v => v.is_active).length, color: 'text-green-400' },
          { label: 'Bills Payable', value: `₹${totalPending.toLocaleString('en-IN')}`, color: 'text-yellow-400' },
          { label: 'Overdue Bills', value: `₹${totalOverdue.toLocaleString('en-IN')}`,  color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit mb-6">
        {(['vendors', 'bills'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${tab === t ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {t === 'vendors' ? `Vendors (${vendors.length})` : `Bills (${bills.length})`}
          </button>
        ))}
      </div>

      {/* VENDORS GRID */}
      {tab === 'vendors' && (
        <>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors…"
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-brand-500" />
            </div>
            <select value={typeFilter} onChange={e => setType(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-400 focus:outline-none">
              <option value="all">All Types</option>
              {VENDOR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(v => (
              <div key={v.id} onClick={() => { setForm(v); setShowForm(true); }}
                className="bg-slate-900 border border-slate-800 hover:border-brand-600/50 rounded-xl p-5 cursor-pointer transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-200 text-sm">{v.name}</p>
                      {v.preferred && <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />}
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full mt-1 inline-block">{TYPE_MAP[v.vendor_type] ?? v.vendor_type}</span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {v.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs text-slate-400">
                  {v.contact_person && <p className="flex items-center gap-1.5"><Building2 className="w-3 h-3" />{v.contact_person}</p>}
                  {v.mobile && <p className="flex items-center gap-1.5"><Phone className="w-3 h-3" />{v.mobile}</p>}
                  {v.email && <p className="flex items-center gap-1.5"><Mail className="w-3 h-3" />{v.email}</p>}
                  {v.city && <p className="text-slate-500">{v.city}{v.country ? `, ${v.country}` : ''}</p>}
                </div>
                {(v.gstin || v.pan_number) && (
                  <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-500 font-mono space-y-0.5">
                    {v.gstin && <p>GST: {v.gstin}</p>}
                    {v.pan_number && <p>PAN: {v.pan_number}</p>}
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && !loading && (
              <div className="col-span-3 text-center py-16 text-slate-500">
                <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" /><p>No vendors found</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* BILLS TABLE */}
      {tab === 'bills' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-800">
              {['Vendor','Bill No.','Date','Amount','GST','Total','Due','Status'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {bills.map(b => {
                const overdue = b.due_date && new Date(b.due_date) < new Date() && b.status !== 'paid';
                return (
                  <tr key={b.id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-200">{b.vendor?.name ?? '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{b.bill_number ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{b.bill_date ? new Date(b.bill_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-4 py-3 text-slate-300">₹{(b.amount ?? 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-slate-400">₹{(b.gst_amount ?? 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 font-semibold text-slate-200">₹{(b.total_amount ?? b.amount ?? 0).toLocaleString('en-IN')}</td>
                    <td className={`px-4 py-3 text-xs ${overdue ? 'text-red-400 font-bold' : 'text-slate-400'}`}>
                      {b.due_date ? new Date(b.due_date).toLocaleDateString('en-IN') : '—'}{overdue ? ' ⚠' : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${BILL_STATUS[b.status] ?? ''}`}>{b.status}</span>
                    </td>
                  </tr>
                );
              })}
              {bills.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-slate-500">No vendor bills recorded</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* VENDOR FORM DRAWER */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-end z-50">
          <div className="bg-slate-900 border-l border-slate-700 h-full w-full max-w-2xl overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{form.id ? 'Edit Vendor' : 'Add Vendor'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-6">

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Basic Info</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2"><label className={lbl}>Vendor Name *</label>
                    <input className={inp} value={form.name} onChange={chg('name')} placeholder="e.g. MSC Shipping" /></div>
                  <div><label className={lbl}>Type</label>
                    <select className={sel} value={form.vendor_type} onChange={chg('vendor_type')}>
                      {VENDOR_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select></div>
                  <div><label className={lbl}>Contact Person</label>
                    <input className={inp} value={form.contact_person ?? ''} onChange={chg('contact_person')} /></div>
                  <div><label className={lbl}>Mobile</label>
                    <input className={inp} value={form.mobile ?? ''} onChange={chg('mobile')} /></div>
                  <div><label className={lbl}>Email</label>
                    <input className={inp} type="email" value={form.email ?? ''} onChange={chg('email')} /></div>
                  <div><label className={lbl}>City</label>
                    <input className={inp} value={form.city ?? ''} onChange={chg('city')} /></div>
                  <div><label className={lbl}>Country</label>
                    <input className={inp} value={form.country ?? ''} onChange={chg('country')} /></div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Preferred</span>
                    <button onClick={() => setForm(f => ({ ...f, preferred: !f.preferred }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.preferred ? 'bg-yellow-500' : 'bg-slate-700'}`}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${form.preferred ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active</span>
                    <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-green-600' : 'bg-slate-700'}`}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Tax Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>GSTIN</label><input className={inp} value={form.gstin ?? ''} onChange={chg('gstin')} /></div>
                  <div><label className={lbl}>PAN</label><input className={inp} value={form.pan_number ?? ''} onChange={chg('pan_number')} /></div>
                  <div><label className={lbl}>Credit Days</label><input className={inp} type="number" value={form.credit_days ?? ''} onChange={chg('credit_days')} /></div>
                  <div><label className={lbl}>Credit Limit (₹)</label><input className={inp} type="number" value={form.credit_limit ?? ''} onChange={chg('credit_limit')} /></div>
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Bank Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className={lbl}>Bank Name</label><input className={inp} value={form.bank_name ?? ''} onChange={chg('bank_name')} /></div>
                  <div><label className={lbl}>IFSC</label><input className={inp} value={form.bank_ifsc ?? ''} onChange={chg('bank_ifsc')} /></div>
                  <div className="col-span-2"><label className={lbl}>Account Number</label><input className={inp} value={form.bank_account ?? ''} onChange={chg('bank_account')} /></div>
                </div>
              </div>

              <div>
                <label className={lbl}>Notes</label>
                <textarea value={form.notes ?? ''} onChange={chg('notes')} rows={3}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500" />
              </div>
            </div>

            <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 px-6 py-4 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm border border-slate-700">Cancel</button>
              <button onClick={saveVendor} disabled={saving}
                className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />{saving ? 'Saving…' : form.id ? 'Update' : 'Add Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BILL FORM MODAL */}
      {showBill && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">Record Vendor Bill</h3>
              <button onClick={() => setShowBill(false)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={lbl}>Vendor *</label>
                <select value={bVendor} onChange={e => setBVendor(e.target.value)} className={sel}>
                  <option value="">Select vendor…</option>
                  {vendors.filter(v => v.is_active).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Bill Number</label><input className={inp} value={bNumber} onChange={e => setBNumber(e.target.value)} /></div>
                <div><label className={lbl}>Bill Date</label><input type="date" className={inp} value={bDate} onChange={e => setBDate(e.target.value)} /></div>
                <div><label className={lbl}>Amount (₹) *</label><input type="number" className={inp} value={bAmount} onChange={e => setBAmount(e.target.value)} /></div>
                <div><label className={lbl}>GST Amount (₹)</label><input type="number" className={inp} value={bGst} onChange={e => setBGst(e.target.value)} /></div>
                <div className="col-span-2"><label className={lbl}>Due Date</label><input type="date" className={inp} value={bDue} onChange={e => setBDue(e.target.value)} /></div>
              </div>
              <div><label className={lbl}>Description</label>
                <textarea value={bDesc} onChange={e => setBDesc(e.target.value)} rows={2}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none" /></div>
              {bAmount && (
                <div className="bg-slate-800 rounded-lg p-3 text-sm text-slate-400">
                  Total: <span className="text-white font-bold">₹{((parseFloat(bAmount) || 0) + (parseFloat(bGst) || 0)).toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowBill(false)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-lg text-sm border border-slate-700">Cancel</button>
              <button onClick={saveBill} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold">Record Bill</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
