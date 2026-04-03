'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Plus, Boxes } from 'lucide-react';
import {
  Button, Card, Badge, CBMBar,
  SearchInput, EmptyState, PageLoader,
  Modal, Input, Select,
} from '@/components/ui';
import {
  formatDate, CONSOL_STATUS_CONFIG, CONTAINER_CAPACITIES, ALL_PORTS, INDIAN_PORTS,
} from '@/lib/utils';
import type { Consol, ConsolStatus } from '@/types';

const CONTAINER_TYPES = ['20GP', '40GP', '40HC', '45HC'].map(v => ({ value: v, label: v }));
const PORT_OPTIONS    = ALL_PORTS.map(p => ({ value: p, label: p }));
const POD_OPTIONS     = INDIAN_PORTS.map(p => ({ value: p, label: p }));

export default function ConsolPage() {
  const [consols, setConsols] = useState<Consol[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);

  const [form, setForm] = useState({
    container_type: '40HC', pol: '', pod: '',
    carrier: '', vessel: '', voyage: '', etd: '', eta: '',
  });

  const fetchConsols = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ per_page: '20' });
      if (statusFilter) p.set('status', statusFilter);
      const res  = await fetch(`/api/consol?${p}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setConsols(json.data || []);
      setTotal(json.total || 0);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchConsols(); }, [fetchConsols]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pol || !form.pod) { toast.error('POL and POD are required'); return; }
    setSaving(true);
    try {
      const res  = await fetch('/api/consol', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...form,
          container_size: CONTAINER_CAPACITIES[form.container_type] || 68,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Consol ${json.data.consol_number} created!`);
      setShowModal(false);
      setForm({ container_type: '40HC', pol: '', pod: '', carrier: '', vessel: '', voyage: '', etd: '', eta: '' });
      fetchConsols();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">LCL Consolidation</h2>
          <p className="text-sm text-slate-500">{total} containers</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
          New Consol
        </Button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {['', 'open', 'loading', 'departed', 'arrived', 'closed'].map(s => {
          const sc = s ? CONSOL_STATUS_CONFIG[s as ConsolStatus] : null;
          return (
            <button key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                statusFilter === s
                  ? 'bg-shell-800 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
              }`}>
              {s === '' ? 'All' : (sc?.label || s)}
            </button>
          );
        })}
      </div>

      {/* Consol cards grid */}
      {loading ? <PageLoader /> : consols.length === 0 ? (
        <EmptyState
          icon={<Boxes className="w-8 h-8" />}
          title="No consolidations yet"
          description="Create a container to start assigning LCL jobs."
          action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>New Consol</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {consols.map(consol => {
            const sc = CONSOL_STATUS_CONFIG[consol.status as ConsolStatus];
            return (
              <Link key={consol.id} href={`/consol/${consol.id}`}>
                <Card className="p-5 hover:shadow-card-md transition-shadow cursor-pointer border hover:border-brand-200">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="font-mono font-bold text-slate-900 text-sm">{consol.consol_number}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{consol.container_type}</div>
                    </div>
                    {sc && <Badge color={sc.color} bg={sc.bg}>{sc.label}</Badge>}
                  </div>

                  {/* Route */}
                  <div className="flex items-center gap-2 mb-4">
                    <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">
                      {consol.pol?.split(' ')[0]}
                    </span>
                    <span className="text-slate-300 text-sm">→</span>
                    <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-700">
                      {consol.pod?.split(' ')[0]}
                    </span>
                  </div>

                  {/* CBM bar */}
                  <CBMBar current={consol.total_cbm || 0} max={consol.container_size || 68} />

                  {/* Footer */}
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-100">
                    <div className="text-xs text-slate-500">
                      <span className="font-semibold text-slate-800">{consol.total_jobs}</span> jobs
                    </div>
                    <div className="text-xs text-slate-400">
                      ETD: {formatDate(consol.etd)}
                    </div>
                  </div>

                  {consol.vessel && (
                    <div className="mt-2 text-xs text-slate-400 truncate">
                      {consol.vessel} / {consol.voyage}
                    </div>
                  )}
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Consolidation Container">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select
            label="Container Type"
            value={form.container_type}
            onChange={f('container_type')}
            options={CONTAINER_TYPES}
          />
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-sm text-blue-700">
            Capacity: <strong>{CONTAINER_CAPACITIES[form.container_type] || 68} CBM</strong>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Port of Loading (POL)" value={form.pol} onChange={f('pol')} required
              placeholder="— Select POL —" options={PORT_OPTIONS} />
            <Select label="Port of Discharge (POD)" value={form.pod} onChange={f('pod')} required
              placeholder="— Select POD —" options={POD_OPTIONS} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <Input label="Carrier" value={form.carrier} onChange={f('carrier')} placeholder="MSC" />
            <Input label="Vessel"  value={form.vessel}  onChange={f('vessel')}  placeholder="Vessel name" />
            <Input label="Voyage"  value={form.voyage}  onChange={f('voyage')}  placeholder="Voyage" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input type="date" label="ETD" value={form.etd} onChange={f('etd')} />
            <Input type="date" label="ETA" value={form.eta} onChange={f('eta')} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Consol</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
