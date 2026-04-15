'use client';

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search, FileSearch, TrendingUp, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import {
  Button, Card, CardHeader, Table, Th, Td, Tr,
  EmptyState, PageLoader, Modal, Input, Select, Textarea,
} from '@/components/ui';
import { formatDate, cn } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'new', label: 'New' },
  { value: 'quoted', label: 'Quoted' },
  { value: 'follow_up', label: 'Follow Up' },
  { value: 'won', label: 'Won' },
  { value: 'lost', label: 'Lost' },
  { value: 'expired', label: 'Expired' },
];

const STATUS_STYLE: Record<string, string> = {
  new:       'bg-blue-50 text-blue-700',
  quoted:    'bg-violet-50 text-violet-700',
  follow_up: 'bg-amber-50 text-amber-700',
  won:       'bg-emerald-50 text-emerald-700',
  lost:      'bg-red-50 text-red-600',
  expired:   'bg-slate-100 text-slate-500',
  cancelled: 'bg-slate-100 text-slate-400',
};

const SOURCE_OPTIONS = ['email','whatsapp','phone','website','referral','walk_in'].map(s => ({ value: s, label: s.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase()) }));
const CARGO_OPTIONS  = ['LCL','FCL_20','FCL_40','FCL_40HC','AIR','BREAKBULK'].map(s => ({ value: s, label: s }));

const blank = {
  customer_name: '', origin: '', destination: '', cargo_type: 'LCL',
  cbm: '', weight: '', packages: '', commodity: '', incoterm: '',
  target_rate: '', currency: 'USD', special_requirements: '',
  source: 'email', follow_up_date: '', validity_days: '7', remarks: '',
};

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blank);

  const fetchEnquiries = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ per_page: '50' });
      if (statusFilter) p.set('status', statusFilter);
      const res = await fetch(`/api/enquiries?${p}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setEnquiries(json.data || []);
      setTotal(json.total || 0);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchEnquiries(); }, [fetchEnquiries]);

  const filtered = enquiries.filter(e =>
    !search ||
    e.enquiry_number?.toLowerCase().includes(search.toLowerCase()) ||
    e.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.customer?.company_name?.toLowerCase().includes(search.toLowerCase()) ||
    e.origin?.toLowerCase().includes(search.toLowerCase()) ||
    e.destination?.toLowerCase().includes(search.toLowerCase())
  );

  const handleCreate = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.origin || !form.destination) { toast.error('Origin and destination required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          cbm: form.cbm ? Number(form.cbm) : null,
          weight: form.weight ? Number(form.weight) : null,
          packages: form.packages ? Number(form.packages) : null,
          target_rate: form.target_rate ? Number(form.target_rate) : null,
          validity_days: Number(form.validity_days),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Enquiry created!');
      setShowModal(false);
      setForm(blank);
      fetchEnquiries();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/enquiries/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Status updated');
      fetchEnquiries();
    } catch (e: any) { toast.error(e.message); }
  };

  const f = (k: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [k]: e.target.value }));

  const stats = [
    { label: 'New',      value: enquiries.filter(e => e.status === 'new').length,      color: 'text-blue-600',    bg: 'bg-blue-50',    icon: <FileSearch className="w-5 h-5" /> },
    { label: 'Quoted',   value: enquiries.filter(e => e.status === 'quoted').length,    color: 'text-violet-600',  bg: 'bg-violet-50',  icon: <Clock className="w-5 h-5" /> },
    { label: 'Won',      value: enquiries.filter(e => e.status === 'won').length,       color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <CheckCircle className="w-5 h-5" /> },
    { label: 'Lost',     value: enquiries.filter(e => e.status === 'lost').length,      color: 'text-red-600',     bg: 'bg-red-50',     icon: <XCircle className="w-5 h-5" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">Enquiries</h2>
          <p className="text-sm text-slate-500">{total} total enquiries</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>New Enquiry</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} className="p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setStatusFilter(s.label.toLowerCase())}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.bg} ${s.color}`}>{s.icon}</div>
            <div>
              <div className="text-xl font-bold text-slate-900">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="w-full h-9 pl-9 pr-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            placeholder="Search enquiries..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {STATUS_OPTIONS.map(s => (
            <button key={s.value}
              onClick={() => setStatusFilter(s.value)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-all',
                statusFilter === s.value ? 'bg-shell-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              )}>
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? <PageLoader /> : filtered.length === 0 ? (
          <EmptyState icon={<FileSearch className="w-8 h-8" />} title="No enquiries found"
            description="Create your first enquiry to start tracking business opportunities."
            action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>New Enquiry</Button>} />
        ) : (
          <Table>
            <thead><tr>
              <Th>Enquiry #</Th><Th>Customer</Th><Th>Route</Th>
              <Th>Type</Th><Th>CBM</Th><Th>Source</Th>
              <Th>Follow-up</Th><Th>Status</Th>
            </tr></thead>
            <tbody>
              {filtered.map(e => (
                <Tr key={e.id}>
                  <Td><span className="font-mono text-sm font-semibold text-brand-700">{e.enquiry_number}</span></Td>
                  <Td>
                    <div className="text-sm font-medium">{e.customer?.company_name || e.customer_name || '—'}</div>
                  </Td>
                  <Td>
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-slate-600">{e.origin}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                      <span className="text-slate-600">{e.destination}</span>
                    </div>
                  </Td>
                  <Td><span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">{e.cargo_type}</span></Td>
                  <Td><span className="text-sm">{e.cbm ? `${e.cbm} CBM` : '—'}</span></Td>
                  <Td><span className="text-xs capitalize text-slate-500">{e.source?.replace('_',' ')}</span></Td>
                  <Td><span className="text-sm">{formatDate(e.follow_up_date) || '—'}</span></Td>
                  <Td>
                    <select value={e.status}
                      onChange={ev => updateStatus(e.id, ev.target.value)}
                      className={cn('text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer', STATUS_STYLE[e.status] || 'bg-slate-100 text-slate-500')}>
                      {STATUS_OPTIONS.filter(s => s.value).map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Create Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Enquiry" size="xl">
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Customer Name" value={form.customer_name} onChange={f('customer_name')} placeholder="Company or person name" />
            <Select label="Source" value={form.source} onChange={f('source')} options={SOURCE_OPTIONS} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Origin" value={form.origin} onChange={f('origin')} required placeholder="e.g. CNSHA - Shanghai" />
            <Input label="Destination" value={form.destination} onChange={f('destination')} required placeholder="e.g. INJNP - JNPT" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Select label="Cargo Type" value={form.cargo_type} onChange={f('cargo_type')} options={CARGO_OPTIONS} />
            <Input label="CBM" type="number" value={form.cbm} onChange={f('cbm')} placeholder="0.00" step="0.01" />
            <Input label="Weight (KG)" type="number" value={form.weight} onChange={f('weight')} placeholder="0" />
            <Input label="Packages" type="number" value={form.packages} onChange={f('packages')} placeholder="0" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Commodity" value={form.commodity} onChange={f('commodity')} placeholder="e.g. Machinery parts" />
            <Input label="Incoterm" value={form.incoterm} onChange={f('incoterm')} placeholder="e.g. CIF, FOB" />
            <Input label="Target Rate (USD)" type="number" value={form.target_rate} onChange={f('target_rate')} placeholder="0" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input type="date" label="Follow-up Date" value={form.follow_up_date} onChange={f('follow_up_date')} />
            <Input label="Validity (days)" type="number" value={form.validity_days} onChange={f('validity_days')} />
          </div>
          <Textarea label="Special Requirements / Remarks" value={form.remarks} onChange={f('remarks')} rows={2} placeholder="Any special cargo requirements..." />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Enquiry</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
