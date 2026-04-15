'use client';
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Building2, Ship, Truck, Warehouse, Package } from 'lucide-react';
import { Button, Card, Table, Th, Td, Tr, EmptyState, PageLoader, Modal, Input, Select } from '@/components/ui';
import { cn } from '@/lib/utils';

const VENDOR_TYPES = [
  { value: 'shipping_line', label: 'Shipping Line',    icon: <Ship className="w-4 h-4" />,      color: 'text-blue-600 bg-blue-50' },
  { value: 'nvocc',         label: 'NVOCC',            icon: <Package className="w-4 h-4" />,    color: 'text-violet-600 bg-violet-50' },
  { value: 'cfs',           label: 'CFS',              icon: <Warehouse className="w-4 h-4" />, color: 'text-amber-600 bg-amber-50' },
  { value: 'transporter',   label: 'Transporter',      icon: <Truck className="w-4 h-4" />,     color: 'text-emerald-600 bg-emerald-50' },
  { value: 'port_agent',    label: 'Port Agent',       icon: <Building2 className="w-4 h-4" />, color: 'text-teal-600 bg-teal-50' },
  { value: 'customs_broker',label: 'Customs Broker',   icon: <Building2 className="w-4 h-4" />, color: 'text-orange-600 bg-orange-50' },
  { value: 'air_carrier',   label: 'Air Carrier',      icon: <Package className="w-4 h-4" />,   color: 'text-indigo-600 bg-indigo-50' },
  { value: 'other',         label: 'Other',            icon: <Building2 className="w-4 h-4" />, color: 'text-slate-600 bg-slate-100' },
];

const blank = {
  name: '', vendor_type: 'shipping_line', contact_person: '', mobile: '',
  email: '', address: '', city: 'Mumbai', country: 'India',
  pan_number: '', gstin: '', credit_days: '30', credit_limit: '',
  bank_name: '', bank_account: '', bank_ifsc: '', notes: '',
};

export default function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blank);

  const fetchVendors = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (typeFilter) p.set('type', typeFilter);
      const res = await fetch(`/api/vendors?${p}`);
      const json = await res.json();
      setVendors(json.data || []);
      setTotal(json.total || 0);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [typeFilter]);

  useEffect(() => { fetchVendors(); }, [fetchVendors]);

  const handleCreate = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.name || !form.vendor_type) { toast.error('Name and type required'); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/vendors', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, credit_days: Number(form.credit_days), credit_limit: form.credit_limit ? Number(form.credit_limit) : 0 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Vendor added!');
      setShowModal(false); setForm(blank); fetchVendors();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const f = (k: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [k]: e.target.value }));

  const typeCounts = VENDOR_TYPES.map(t => ({
    ...t, count: vendors.filter(v => v.vendor_type === t.value).length,
  }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">Vendors</h2>
          <p className="text-sm text-slate-500">{total} vendors</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>Add Vendor</Button>
      </div>

      {/* Type filters as cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {typeCounts.map(t => (
          <button key={t.value} onClick={() => setTypeFilter(typeFilter === t.value ? '' : t.value)}
            className={cn('p-3 rounded-xl border text-left transition-all hover:shadow-md',
              typeFilter === t.value ? 'border-brand-500 bg-brand-50 shadow-md' : 'bg-white border-slate-200')}>
            <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center mb-2', t.color)}>{t.icon}</div>
            <div className="text-lg font-bold text-slate-900">{t.count}</div>
            <div className="text-[10px] text-slate-500 leading-tight">{t.label}</div>
          </button>
        ))}
      </div>

      <Card className="overflow-hidden">
        {loading ? <PageLoader /> : vendors.length === 0 ? (
          <EmptyState icon={<Building2 className="w-8 h-8" />} title="No vendors yet"
            description="Add your shipping lines, CFS, transporters and other vendors."
            action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>Add Vendor</Button>} />
        ) : (
          <Table>
            <thead><tr>
              <Th>Name</Th><Th>Type</Th><Th>Contact</Th>
              <Th>Mobile</Th><Th>Email</Th><Th>City</Th>
              <Th>Credit Days</Th><Th>GSTIN</Th>
            </tr></thead>
            <tbody>
              {vendors.map(v => {
                const type = VENDOR_TYPES.find(t => t.value === v.vendor_type);
                return (
                  <Tr key={v.id}>
                    <Td><span className="font-medium text-sm">{v.name}</span></Td>
                    <Td>
                      <span className={cn('text-xs font-medium px-2 py-1 rounded-full', type?.color || 'bg-slate-100 text-slate-600')}>
                        {type?.label || v.vendor_type}
                      </span>
                    </Td>
                    <Td><span className="text-sm">{v.contact_person || '—'}</span></Td>
                    <Td><span className="text-sm font-mono">{v.mobile || '—'}</span></Td>
                    <Td><span className="text-sm text-slate-500">{v.email || '—'}</span></Td>
                    <Td><span className="text-sm">{v.city || '—'}</span></Td>
                    <Td><span className="text-sm font-mono">{v.credit_days} days</span></Td>
                    <Td><span className="text-xs font-mono text-slate-500">{v.gstin || '—'}</span></Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Add Vendor" size="xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Vendor Name" value={form.name} onChange={f('name')} required placeholder="Company name" />
            <Select label="Type" value={form.vendor_type} onChange={f('vendor_type')} options={VENDOR_TYPES.map(t => ({ value: t.value, label: t.label }))} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Contact Person" value={form.contact_person} onChange={f('contact_person')} />
            <Input label="Mobile" value={form.mobile} onChange={f('mobile')} placeholder="91XXXXXXXXXX" />
            <Input label="Email" type="email" value={form.email} onChange={f('email')} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <Input label="City" value={form.city} onChange={f('city')} />
            <Input label="Country" value={form.country} onChange={f('country')} />
            <Input label="Credit Days" type="number" value={form.credit_days} onChange={f('credit_days')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="PAN Number" value={form.pan_number} onChange={f('pan_number')} />
            <Input label="GSTIN" value={form.gstin} onChange={f('gstin')} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Bank Name" value={form.bank_name} onChange={f('bank_name')} />
            <Input label="Account Number" value={form.bank_account} onChange={f('bank_account')} />
            <Input label="IFSC Code" value={form.bank_ifsc} onChange={f('bank_ifsc')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Add Vendor</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
