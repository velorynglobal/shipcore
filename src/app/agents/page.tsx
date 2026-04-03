'use client';

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Globe2, Edit2, Mail, Phone } from 'lucide-react';
import {
  Button, Card, Table, Th, Td, Tr,
  SearchInput, EmptyState, PageLoader, Modal, Input,
} from '@/components/ui';
import type { Agent } from '@/types';

export default function AgentsPage() {
  const [agents, setAgents]   = useState<Agent[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing]     = useState<Agent | null>(null);
  const [saving, setSaving]       = useState(false);

  const blank = { name: '', port: '', country: '', contact_name: '', email: '', phone: '', address: '' };
  const [form, setForm] = useState(blank);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const p   = new URLSearchParams({ per_page: '100' });
      if (search) p.set('search', search);
      const res = await fetch(`/api/agents?${p}`);
      const j   = await res.json();
      if (j.error) throw new Error(j.error);
      setAgents(j.data || []);
      setTotal(j.total || 0);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const openCreate = () => { setEditing(null); setForm(blank); setShowModal(true); };
  const openEdit   = (a: Agent) => {
    setEditing(a);
    setForm({ name: a.name, port: a.port, country: a.country, contact_name: a.contact_name || '',
              email: a.email || '', phone: a.phone || '', address: a.address || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.port || !form.country) { toast.error('Name, Port and Country are required'); return; }
    setSaving(true);
    try {
      const url    = editing ? `/api/agents/${editing.id}` : '/api/agents';
      const method = editing ? 'PUT' : 'POST';
      const res    = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(editing ? 'Agent updated' : 'Agent created');
      setShowModal(false);
      fetchAgents();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">Agents</h2>
          <p className="text-sm text-slate-500">{total} overseas agents</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Add Agent</Button>
      </div>

      <div className="max-w-sm">
        <SearchInput value={search} onChange={setSearch} placeholder="Search agents, ports, countries..." />
      </div>

      <Card className="overflow-hidden">
        {loading ? <PageLoader /> : agents.length === 0 ? (
          <EmptyState
            icon={<Globe2 className="w-8 h-8" />}
            title="No agents yet"
            description="Add your overseas agent network to assign them to jobs."
            action={<Button icon={<Plus className="w-4 h-4" />} onClick={openCreate}>Add Agent</Button>}
          />
        ) : (
          <Table>
            <thead><tr>
              <Th>Agent Name</Th>
              <Th>Port</Th>
              <Th>Country</Th>
              <Th>Contact</Th>
              <Th>Email</Th>
              <Th>Action</Th>
            </tr></thead>
            <tbody>
              {agents.map(a => (
                <Tr key={a.id}>
                  <Td><div className="font-semibold text-slate-900">{a.name}</div></Td>
                  <Td><span className="text-sm font-mono text-slate-700">{a.port}</span></Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <Globe2 className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-sm">{a.country}</span>
                    </div>
                  </Td>
                  <Td><span className="text-sm">{a.contact_name || '—'}</span></Td>
                  <Td>
                    {a.email
                      ? <a href={`mailto:${a.email}`} className="text-sm text-brand-600">{a.email}</a>
                      : <span className="text-slate-400 text-sm">—</span>}
                  </Td>
                  <Td>
                    <button onClick={() => openEdit(a)}
                      className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title={editing ? 'Edit Agent' : 'Add Agent'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input label="Agent Name" value={form.name} onChange={f('name')} required placeholder="YDS-SCM Shanghai" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Port" value={form.port} onChange={f('port')} required placeholder="CNSHA - Shanghai" />
            <Input label="Country" value={form.country} onChange={f('country')} required placeholder="China" />
          </div>
          <Input label="Contact Name" value={form.contact_name} onChange={f('contact_name')} placeholder="e.g. Eric Chow" />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Email" type="email" value={form.email} onChange={f('email')} placeholder="agent@company.com" />
            <Input label="Phone / WhatsApp" value={form.phone} onChange={f('phone')} placeholder="+86 ..." />
          </div>
          <Input label="Address" value={form.address} onChange={f('address')} placeholder="Office address" />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{editing ? 'Update' : 'Create'} Agent</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
