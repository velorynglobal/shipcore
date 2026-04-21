'use client';
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Building2, Plus, Search, Star, Phone, Mail,
  CreditCard, FileText, CheckCircle, Clock, XCircle,
  ChevronDown, Save, X, IndianRupee, RefreshCw
} from 'lucide-react';

type Vendor = {
  id: string; name: string; vendor_type: string; contact_person?: string;
  mobile?: string; email?: string; city?: string; country?: string;
  pan_number?: string; gstin?: string; credit_days?: number; credit_limit?: number;
  bank_name?: string; bank_account?: string; bank_ifsc?: string;
  rating?: number; preferred?: boolean; is_active: boolean; notes?: string;
};

type VendorBill = {
  id: string; vendor_id: string; bill_number?: string; bill_date?: string;
  amount: number; gst_amount?: number; total_amount?: number;
  due_date?: string; status: string; description?: string;
  vendor?: { name: string };
};

const VENDOR_TYPES = ['shipping_line','airline','cfs','transporter','cha','surveyor','warehouse','freight_forwarder','customs_broker','port_authority','other'];
const TYPE_LABELS: Record<string, string> = {
  shipping_line:'Shipping Line', airline:'Airline', cfs:'CFS', transporter:'Transporter',
  cha:'CHA', surveyor:'Surveyor', warehouse:'Warehouse', freight_forwarder:'Freight Forwarder',
  customs_broker:'Customs Broker', port_authority:'Port Authority', other:'Other',
};
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Pending',  color: 'bg-yellow-500/20 text-yellow-400' },
  approved: { label: 'Approved', color: 'bg-blue-500/20 text-blue-400'    },
  paid:     { label: 'Paid',     color: 'bg-green-500/20 text-green-400'  },
  overdue:  { label: 'Overdue',  color: 'bg-red-500/20 text-red-400'      },
  cancelled:{ label: 'Cancelled',color: 'bg-slate-600/20 text-slate-400'  },
};

const EMPTY_VENDOR: Partial<Vendor> = {
  name:'', vendor_type:'shipping_line', contact_person:'', mobile:'', email:'',
  city:'', country:'India', gstin:'', pan_number:'', credit_days: 30,
  credit_limit: 0, bank_name:'', bank_account:'', bank_ifsc:'',
  is_active: true, preferred: false, notes:'',
};

export default function VendorsPage() {
  const [vendors, setVendors]   = useState<Vendor[]>([]);
  const [bills, setBills]       = useState<VendorBill[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [typeFilter, setType]   = useState('all');
  const [mainTab, setMainTab]   = useState<'vendors'|'bills'>('vendors');
  const [selected, setSelected] = useState<Vendor | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState<Partial<Vendor>>(EMPTY_VENDOR);
  const [saving, setSaving]     = useState(false);
  const [showBillForm, setShowBillForm] = useState(false);
  const [billForm, setBillForm] = useState({ vendor_id:'', bill_number:'', bill_date:'', amount:'', gst_amount:'', due_date:'', description:'' });

  const loadVendors = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/vendors?per_page=200');
      const data = await res.json();
      setVendors(data.data || []);
    } catch { toast.error('Failed to load vendors'); }
    setLoading(false);
  }, []);

  const loadBills = useCallback(async () => {
    try {
      const res = await fetch('/api/vendor-bills?per_page=100');
      const data = await res.json();
      setBills(data.data || []);
    } catch { toast.error('Failed to load bills'); }
  }, []);

  useEffect(() => { loadVendors(); loadBills(); }, [loadVendors, loadBills]);

  const filtered = vendors.filter(v => {
    const q = search.toLowerCase();
    if (q && !v.name?.toLowerCase().includes(q) && !v.city?.toLowerCase().includes(q)) return false;
    if (typeFilter !== 'all' && v.vendor_type !== typeFilter) return false;
    return true;
  });

  const saveVendor = async () => {
    if (!form.name) return toast.error('Vendor name required');
    setSaving(true);
    try {
      const isEdit = !!form.id;
      const url  = isEdit ? `/api/vendors/${form.id}` : '/api/vendors';
      const method = isEdit ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(isEdit ? 'Vendor updated' : 'Vendor added');
      setShowForm(false);
      setForm(EMPTY_VENDOR);
      loadVendors();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed'); }
    setSaving(false);
  };

  const saveBill = async () => {
    if (!billForm.vendor_id || !billForm.amount) return toast.error('Vendor and amount required');
    try {
      const total = parseFloat(billForm.amount) + parseFloat(billForm.gst_amount || '0');
      const res = await fetch('/api/vendor-bills', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...billForm, amount: parseFloat(billForm.amount), gst_amount: parseFloat(billForm.gst_amount || '0'), total_amount: total }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success('Bill recorded');
      setShowBillForm(false);
      setBillForm({ vendor_id:'', bill_number:'', bill_date:'', amount:'', gst_amount:'', due_date:'', description:'' });
      loadBills();
    } catch (e: unknown) { toast.error(e instanceof Error ? e.message : 'Failed'); }
  };

  const totalPending = bills.filter(b => b.status === 'pending' || b.status === 'approved').reduce((s, b) => s + (b.total_amount || b.amount || 0), 0);
  const totalOverdue = bills.filter(b => b.status === 'overdue').reduce((s, b) => s + (b.total_amount || b.amount || 0), 0);

  const F = ({ label, name, type = 'text', options, full = false }: { label: string; name: keyof Vendor; type?: string; options?: string[]; full?: boolean }) => (
    <div className={full ? 'md:col-span-2' : ''}>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</label>
      {options ? (
        <select value={String(form[name] || '')} onChange={e => setForm(f => ({ ...f, [name]: e.target.value }))}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500">
          {options.map(o => <option key={o} value={o}>{TYPE_LABELS[o] || o}</option>)}
        </select>
      ) : type === 'toggle' ? (
        <button onClick={() => setForm(f => ({ ...f, [name]: !f[name] }))}
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form[name] ? 'bg-brand-600' : 'bg-slate-700'}`}>
          <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${form[name] ? 'translate-x-6' : 'translate-x-1'}`} />
        </button>
      ) : (
        <input type={type} value={String(form[name] || '')} onChange={e => setForm(f => ({ ...f, [name]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500" />
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Vendors</h1>
          <p className="text-slate-400 text-sm mt-1">Shipping Lines, Airlines, CFS, Transporters & Service Providers</p>
        </div>
        <div className="flex gap-2">
          <button onClick={loadVendors} className="p-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-400">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          {mainTab === 'bills' ? (
            <button onClick={() => setShowBillForm(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold">
              <Plus className="w-4 h-4" /> Record Bill
            </button>
          ) : (
            <button onClick={() => { setForm(EMPTY_VENDOR); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold">
              <Plus className="w-4 h-4" /> Add Vendor
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total Vendors', value: vendors.length, color: 'text-slate-300' },
          { label: 'Active', value: vendors.filter(v => v.is_active).length, color: 'text-green-400' },
          { label: 'Bills Payable', value: `₹${totalPending.toLocaleString('en-IN')}`, color: 'text-yellow-400' },
          { label: 'Overdue Bills', value: `₹${totalOverdue.toLocaleString('en-IN')}`, color: 'text-red-400' },
        ].map(s => (
          <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 w-fit mb-6">
        {(['vendors','bills'] as const).map(t => (
          <button key={t} onClick={() => setMainTab(t)}
            className={`px-5 py-2 rounded-md text-sm font-semibold transition-colors ${mainTab === t ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}>
            {t === 'vendors' ? `Vendors (${vendors.length})` : `Bills (${bills.length})`}
          </button>
        ))}
      </div>

      {/* VENDORS LIST */}
      {mainTab === 'vendors' && (
        <>
          <div className="flex gap-3 mb-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search vendors..."
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500" />
            </div>
            <select value={typeFilter} onChange={e => setType(e.target.value)}
              className="px-3 py-2 bg-slate-900 border border-slate-800 rounded-lg text-sm text-slate-400 focus:outline-none">
              <option value="all">All Types</option>
              {VENDOR_TYPES.map(t => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(v => (
              <div key={v.id}
                onClick={() => { setForm(v); setShowForm(true); }}
                className="bg-slate-900 border border-slate-800 hover:border-brand-600/50 rounded-xl p-5 cursor-pointer transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-slate-200 text-sm">{v.name}</p>
                      {v.preferred && <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />}
                    </div>
                    <span className="text-xs px-2 py-0.5 bg-slate-800 text-slate-400 rounded-full mt-1 inline-block">
                      {TYPE_LABELS[v.vendor_type] || v.vendor_type}
                    </span>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${v.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {v.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {v.contact_person && <p className="text-xs text-slate-400 flex items-center gap-1.5"><Building2 className="w-3 h-3" />{v.contact_person}</p>}
                  {v.mobile && <p className="text-xs text-slate-400 flex items-center gap-1.5"><Phone className="w-3 h-3" />{v.mobile}</p>}
                  {v.email && <p className="text-xs text-slate-400 flex items-center gap-1.5"><Mail className="w-3 h-3" />{v.email}</p>}
                  {v.city && <p className="text-xs text-slate-500">{v.city}{v.country ? `, ${v.country}` : ''}</p>}
                </div>
                {(v.gstin || v.pan_number) && (
                  <div className="mt-3 pt-3 border-t border-slate-800 flex gap-4">
                    {v.gstin && <p className="text-xs text-slate-500 font-mono">GST: {v.gstin}</p>}
                    {v.pan_number && <p className="text-xs text-slate-500 font-mono">PAN: {v.pan_number}</p>}
                  </div>
                )}
                {v.credit_days != null && (
                  <div className="mt-2 flex gap-3 text-xs text-slate-500">
                    <span>Credit: {v.credit_days} days</span>
                    {v.credit_limit ? <span>Limit: ₹{v.credit_limit?.toLocaleString('en-IN')}</span> : null}
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && !loading && (
              <div className="col-span-3 text-center py-16 text-slate-500">
                <Building2 className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No vendors found</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* BILLS LIST */}
      {mainTab === 'bills' && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800">
                {['Vendor','Bill No.','Date','Amount','GST','Total','Due Date','Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bills.map(b => {
                const sc = STATUS_CONFIG[b.status] || STATUS_CONFIG.pending;
                const overdue = b.due_date && new Date(b.due_date) < new Date() && b.status !== 'paid';
                return (
                  <tr key={b.id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-200">{b.vendor?.name || '—'}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">{b.bill_number || '—'}</td>
                    <td className="px-4 py-3 text-slate-400">{b.bill_date ? new Date(b.bill_date).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="px-4 py-3 text-slate-300">₹{(b.amount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 text-slate-400">₹{(b.gst_amount || 0).toLocaleString('en-IN')}</td>
                    <td className="px-4 py-3 font-semibold text-slate-200">₹{(b.total_amount || b.amount || 0).toLocaleString('en-IN')}</td>
                    <td className={`px-4 py-3 text-xs ${overdue ? 'text-red-400 font-semibold' : 'text-slate-400'}`}>
                      {b.due_date ? new Date(b.due_date).toLocaleDateString('en-IN') : '—'}
                      {overdue ? ' ⚠' : ''}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.color}`}>{sc.label}</span>
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

      {/* VENDOR FORM MODAL */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-end z-50">
          <div className="bg-slate-900 border-l border-slate-700 h-full w-full max-w-2xl overflow-y-auto">
            <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{form.id ? 'Edit Vendor' : 'Add Vendor'}</h3>
              <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Basic Info</h4>
                <div className="grid grid-cols-2 gap-4">
                  <F label="Vendor Name *" name="name" full />
                  <F label="Type" name="vendor_type" options={VENDOR_TYPES} />
                  <F label="Contact Person" name="contact_person" />
                  <F label="Mobile" name="mobile" />
                  <F label="Email" name="email" type="email" />
                  <F label="City" name="city" />
                  <F label="Country" name="country" />
                  <div><label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Preferred Vendor</label><br />
                    <button onClick={() => setForm(f => ({ ...f, preferred: !f.preferred }))}
                      className={`mt-2 relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.preferred ? 'bg-yellow-500' : 'bg-slate-700'}`}>
                      <span className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${form.preferred ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Tax Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <F label="GSTIN" name="gstin" />
                  <F label="PAN Number" name="pan_number" />
                  <F label="Credit Days" name="credit_days" type="number" />
                  <F label="Credit Limit (₹)" name="credit_limit" type="number" />
                </div>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Bank Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <F label="Bank Name" name="bank_name" />
                  <F label="IFSC Code" name="bank_ifsc" />
                  <F label="Account Number" name="bank_account" full />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Notes</label>
                <textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3}
                  className="mt-1 w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-brand-500" />
              </div>
            </div>
            <div className="sticky bottom-0 bg-slate-900 border-t border-slate-800 px-6 py-4 flex gap-3">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-sm border border-slate-700">Cancel</button>
              <button onClick={saveVendor} disabled={saving} className="flex-1 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" />{saving ? 'Saving…' : form.id ? 'Update Vendor' : 'Add Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BILL FORM MODAL */}
      {showBillForm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-white">Record Vendor Bill</h3>
              <button onClick={() => setShowBillForm(false)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Vendor *</label>
                <select value={billForm.vendor_id} onChange={e => setBillForm(f => ({ ...f, vendor_id: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none">
                  <option value="">Select vendor…</option>
                  {vendors.filter(v => v.is_active).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['Bill Number', 'bill_number', 'text'],
                  ['Bill Date', 'bill_date', 'date'],
                  ['Amount (₹)', 'amount', 'number'],
                  ['GST Amount (₹)', 'gst_amount', 'number'],
                  ['Due Date', 'due_date', 'date'],
                ].map(([label, key, type]) => (
                  <div key={key}>
                    <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">{label}</label>
                    <input type={type} value={billForm[key as keyof typeof billForm]}
                      onChange={e => setBillForm(f => ({ ...f, [key]: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none" />
                  </div>
                ))}
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold uppercase tracking-wide">Description</label>
                <textarea value={billForm.description} onChange={e => setBillForm(f => ({ ...f, description: e.target.value }))} rows={2}
                  className="w-full mt-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none" />
              </div>
              {billForm.amount && (
                <div className="bg-slate-800 rounded-lg p-3 text-sm">
                  <p className="text-slate-400">Total: <span className="text-white font-bold">₹{(parseFloat(billForm.amount || '0') + parseFloat(billForm.gst_amount || '0')).toLocaleString('en-IN')}</span></p>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowBillForm(false)} className="flex-1 py-2.5 bg-slate-800 text-slate-300 rounded-lg text-sm border border-slate-700">Cancel</button>
              <button onClick={saveBill} className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold">Record Bill</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
