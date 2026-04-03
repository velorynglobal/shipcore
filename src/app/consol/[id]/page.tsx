'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Plus, Trash2, Package, Save } from 'lucide-react';
import {
  Button, Card, CardHeader, Badge, CBMBar,
  Table, Th, Td, Tr, PageLoader, Modal, Select, EmptyState,
} from '@/components/ui';
import {
  formatDate, formatCBM, formatWeight,
  CONSOL_STATUS_CONFIG, JOB_STATUS_CONFIG,
} from '@/lib/utils';
import type { Consol, Job, ConsolStatus, JobStatus } from '@/types';

export default function ConsolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router  = useRouter();

  const [consol, setConsol]   = useState<Consol | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [availableJobs, setAvailableJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [assigning, setAssigning] = useState(false);
  const [removing, setRemoving]   = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<ConsolStatus>('open');
  const [saving, setSaving]     = useState(false);

  const fetchConsol = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/consol/${id}`);
      const json = await res.json();
      if (json.error) { toast.error(json.error); router.push('/consol'); return; }
      setConsol(json.data);
      setEditStatus(json.data.status);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [id, router]);

  useEffect(() => { fetchConsol(); }, [fetchConsol]);

  // Load available (unassigned or draft/booked) jobs when assign modal opens
  const openAssign = async () => {
    const res  = await fetch('/api/jobs?per_page=100&status=booked');
    const json = await res.json();
    const assignedIds = new Set((consol as any)?.consol_mapping?.map((m: any) => m.job_id) || []);
    setAvailableJobs((json.data || []).filter((j: Job) => !assignedIds.has(j.id)));
    setSelectedJobId('');
    setShowAssign(true);
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId) { toast.error('Select a job'); return; }
    setAssigning(true);
    try {
      const res  = await fetch(`/api/consol/${id}/assign`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ job_id: selectedJobId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(json.message || 'Job assigned');
      setShowAssign(false);
      fetchConsol();
    } catch (err: any) { toast.error(err.message); }
    finally { setAssigning(false); }
  };

  const handleRemove = async (jobId: string) => {
    if (!confirm('Remove this job from the consol?')) return;
    setRemoving(jobId);
    try {
      const res = await fetch(`/api/consol/${id}/assign?job_id=${jobId}`, { method: 'DELETE' });
      const j   = await res.json();
      if (!res.ok) throw new Error(j.error);
      toast.success('Job removed');
      fetchConsol();
    } catch (e: any) { toast.error(e.message); }
    finally { setRemoving(null); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res  = await fetch(`/api/consol/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: editStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setConsol(json.data);
      toast.success('Consol updated');
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  if (loading) return <PageLoader />;
  if (!consol) return null;

  const sc      = CONSOL_STATUS_CONFIG[consol.status as ConsolStatus];
  const mappings = (consol as any).consol_mapping || [];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start gap-4 flex-wrap">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 mt-0.5">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-display font-bold text-2xl text-slate-900">{consol.consol_number}</h2>
            {sc && <Badge color={sc.color} bg={sc.bg}>{sc.label}</Badge>}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {consol.container_type} • {consol.pol?.split(' ')[0]} → {consol.pod?.split(' ')[0]}
          </p>
        </div>
        <Button size="sm" icon={<Save className="w-3.5 h-3.5" />} loading={saving} onClick={handleSave}>
          Save
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Jobs */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader
              title="Assigned Jobs"
              subtitle={`${mappings.length} jobs in this container`}
              action={
                consol.status !== 'closed' &&
                <Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={openAssign}>
                  Assign Job
                </Button>
              }
            />

            {/* CBM bar */}
            <div className="px-5 py-3 border-b border-slate-100">
              <CBMBar current={consol.total_cbm || 0} max={consol.container_size || 68} />
            </div>

            {mappings.length === 0 ? (
              <EmptyState
                icon={<Package className="w-7 h-7" />}
                title="No jobs assigned"
                description="Assign booked jobs to fill this container."
                action={<Button size="sm" icon={<Plus className="w-3.5 h-3.5" />} onClick={openAssign}>Assign Job</Button>}
              />
            ) : (
              <Table>
                <thead>
                  <tr>
                    <Th>Job No.</Th>
                    <Th>Customer</Th>
                    <Th>Cargo</Th>
                    <Th>CBM</Th>
                    <Th>Weight</Th>
                    <Th>Action</Th>
                  </tr>
                </thead>
                <tbody>
                  {mappings.map((m: any) => {
                    const job = m.job;
                    const jsc = job ? JOB_STATUS_CONFIG[job.status as JobStatus] : null;
                    return (
                      <Tr key={m.id}>
                        <Td>
                          <div className="font-mono text-sm font-semibold text-brand-700">{job?.job_number}</div>
                          {jsc && <Badge color={jsc.color} bg={jsc.bg} className="mt-0.5">{jsc.label}</Badge>}
                        </Td>
                        <Td><span className="text-sm">{job?.customer?.company_name || '—'}</span></Td>
                        <Td><span className="text-sm truncate max-w-[140px] block">{job?.cargo_description}</span></Td>
                        <Td><span className="font-mono text-sm">{m.cbm}</span></Td>
                        <Td><span className="font-mono text-sm">{m.weight} KG</span></Td>
                        <Td>
                          <button
                            onClick={() => handleRemove(m.job_id)}
                            disabled={removing === m.job_id}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <Card className="p-5">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Container Info</div>
            {[
              ['Type',     consol.container_type],
              ['Capacity', `${consol.container_size} CBM`],
              ['Total CBM', `${(consol.total_cbm || 0).toFixed(3)} CBM`],
              ['Total Wt.', `${(consol.total_weight || 0).toFixed(2)} KG`],
              ['Jobs',     String(consol.total_jobs || 0)],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
                <span className="text-xs text-slate-500">{l}</span>
                <span className="text-sm font-semibold text-slate-800">{v}</span>
              </div>
            ))}
          </Card>

          <Card className="p-5">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Vessel Details</div>
            {[
              ['POL',     consol.pol],
              ['POD',     consol.pod],
              ['Carrier', consol.carrier],
              ['Vessel',  consol.vessel],
              ['Voyage',  consol.voyage],
              ['MBL',     consol.mbl_number],
              ['ETD',     formatDate(consol.etd)],
              ['ETA',     formatDate(consol.eta)],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between py-2 border-b border-slate-100 last:border-0">
                <span className="text-xs text-slate-500">{l}</span>
                <span className="text-sm font-semibold text-slate-800 text-right max-w-[140px] truncate">{v || '—'}</span>
              </div>
            ))}
          </Card>

          <Card className="p-5">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Update Status</div>
            <select
              value={editStatus}
              onChange={e => setEditStatus(e.target.value as ConsolStatus)}
              className="w-full h-9 px-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white mb-3"
            >
              {['open','loading','departed','arrived','closed'].map(s => (
                <option key={s} value={s}>{CONSOL_STATUS_CONFIG[s as ConsolStatus]?.label || s}</option>
              ))}
            </select>
            <Button size="sm" className="w-full" loading={saving} onClick={handleSave}>Update Status</Button>
          </Card>
        </div>
      </div>

      {/* Assign Job Modal */}
      <Modal open={showAssign} onClose={() => setShowAssign(false)} title="Assign Job to Container">
        <form onSubmit={handleAssign} className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-sm text-amber-800">
              Available: <strong>{((consol.container_size || 68) - (consol.total_cbm || 0)).toFixed(3)} CBM</strong> remaining
            </p>
          </div>

          <Select
            label="Select Job"
            value={selectedJobId}
            onChange={e => setSelectedJobId(e.target.value)}
            placeholder="— Select a booked job —"
            options={availableJobs.map(j => ({
              value: j.id,
              label: `${j.job_number} — ${j.cargo_description.slice(0, 40)} (${j.cbm} CBM)`,
            }))}
            required
          />

          {selectedJobId && (() => {
            const job = availableJobs.find(j => j.id === selectedJobId);
            if (!job) return null;
            const newTotal = (consol.total_cbm || 0) + (job.cbm || 0);
            const overflow = newTotal > (consol.container_size || 68);
            return (
              <div className={`rounded-lg px-4 py-3 border text-sm ${overflow ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                {overflow
                  ? `⚠️ Exceeds capacity: ${newTotal.toFixed(3)} / ${consol.container_size} CBM`
                  : `✓ New total: ${newTotal.toFixed(3)} / ${consol.container_size} CBM`}
              </div>
            );
          })()}

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button type="submit" loading={assigning}>Assign Job</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
