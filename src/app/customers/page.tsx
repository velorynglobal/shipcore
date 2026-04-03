'use client';

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Users, Mail, Phone, Edit2 } from 'lucide-react';
import {
  Button, Card, Table, Th, Td, Tr,
  SearchInput, EmptyState, PageLoader,
  Modal, Input, Textarea,
} from '@/components/ui';
import type { Customer } from '@/types';

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage]     = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<Customer | null>(null);
  const [saving, setSaving]       = useState(false);

  const blank = { company_name: '', contact_person: '', mobile: '', email: '', address: '', city: '', gst_number: '', credit_limit: '' };
  const [form, setForm] = useState(blank);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page: String(page), per_page: '20' });
      if (search) p.set('search', search);
      const res  = await fetch(`/api/customers?${p}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setCustomers(json.data || []);
      setTotal(json.total || 0);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [page, search]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const openCreate = () => { setEditing(null); setForm(blank); setShowModal(true); };
  const openEdit   = (c: Customer) => {
    setEditing(c);
    setForm({ company_name: c.company_name, contact_person: c.contact_person || '', mobile: c.mobile || '',
              email: c.email || '', address: c.address || '', city: c.city || '',
              gst_number: c.gst_number || '', credit_limit: String(c.credit_limit || '') });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.company_name) { toast.error('Company name is required'); return; }
    setSaving(true);
    try {
      const url    = editing ? `/api/customers/${editing.id}` : '/api/customers';
      const method = editing ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, credit_limit: form.credit_limit ? Number(form.credit_limit) : 0 }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(editing ? 'Customer updated' : 'Customer created');
      setShowModal(false);
      fetchCustomers();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">Customers</h2>
          <p className="text-sm text-slate-500">{total} active customers</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Add Customer</Button>
      </div>

      <div className="max-w-sm">
        <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search customers..." />
      </div>

      <Card className="overflow-hidden">
        {loading ? <PageLoader /> : customers.length === 0 ? (
          <EmptyState
            icon={<Users className="w-8 h-8" />}
            title="No customers yet"
            description="Add your first customer to start creating jobs."
            action={<Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Add Customer</Button>}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Company</Th>
                <Th>Contact</Th>
                <Th>Mobile</Th>
                <Th>Email</Th>
                <Th>City</Th>
                <Th>GST</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <Tr key={c.id}>
                  <Td>
                    <div className="font-semibold text-slate-900">{c.company_name}</div>
                  </Td>
                  <Td><span className="text-sm">{c.contact_person || '—'}</span></Td>
                  <Td>
                    {c.mobile
                      ? <a href={`tel:${c.mobile}`} className="text-sm text-brand-600 flex items-center gap-1">
                          <Phone className="w-3 h-3" />{c.mobile}
                        </a>
                      : <span className="text-slate-400">—</span>}
                  </Td>
                  <Td>
                    {c.email
                      ? <a href={`mailto:${c.email}`} className="text-sm text-brand-600 flex items-center gap-1">
                          <Mail className="w-3 h-3" />{c.email}
                        </a>
                      : <span className="text-slate-400">—</span>}
                  </Td>
                  <Td><span className="text-sm">{c.city || '—'}</span></Td>
                  <Td><span className="text-xs font-mono text-slate-500">{c.gst_number || '—'}</span></Td>
                  <Td>
                    <button onClick={() => openEdit(c)}
                      className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
        {total > 20 && (
          <div className="px-5 py-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-500">Page {page} of {Math.ceil(total / 20)}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page * 20 >= total} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Customer' : 'Add Customer'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Company Name" value={form.company_name} onChange={f('company_name')} required placeholder="ABC Enterprises Pvt Ltd" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Contact Person" value={form.contact_person} onChange={f('contact_person')} placeholder="Full name" />
            <Input label="Mobile" value={form.mobile} onChange={f('mobile')} placeholder="+91 98765 43210" />
          </div>
          <Input label="Email" type="email" value={form.email} onChange={f('email')} placeholder="contact@company.com" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="City" value={form.city} onChange={f('city')} placeholder="Mumbai" />
            <Input label="GST Number" value={form.gst_number} onChange={f('gst_number')} placeholder="27AAAAA0000A1Z5" />
          </div>
          <Input label="Address" value={form.address} onChange={f('address')} placeholder="Street address" />
          <Input label="Credit Limit (₹)" type="number" value={form.credit_limit} onChange={f('credit_limit')} placeholder="0" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? 'Update' : 'Create'} Customer</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
