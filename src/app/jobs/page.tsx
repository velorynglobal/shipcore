'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Plus, Package, Filter } from 'lucide-react';
import {
  Button, Card, Table, Th, Td, Tr, Badge,
  SearchInput, EmptyState, PageLoader, Modal,
  Input, Select, Textarea,
} from '@/components/ui';
import {
  formatDate, formatCBM, JOB_STATUS_CONFIG,
  ALL_PORTS, INDIAN_PORTS,
} from '@/lib/utils';
import type { Job, JobStatus } from '@/types';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'draft',               label: 'Draft' },
  { value: 'booked',              label: 'Booked' },
  { value: 'in-transit',          label: 'In Transit' },
  { value: 'arrived',             label: 'Arrived' },
  { value: 'customs-clearance',   label: 'Customs' },
  { value: 'delivered',           label: 'Delivered' },
  { value: 'closed',              label: 'Closed' },
];

const PORT_OPTIONS = ALL_PORTS.map(p => ({ value: p, label: p }));
const POD_OPTIONS  = INDIAN_PORTS.map(p => ({ value: p, label: p }));

export default function JobsPage() {
  const [jobs, setJobs]         = useState<Job[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');
  const [status, setStatus]     = useState('');
  const [page, setPage]         = useState(1);
  const [creating, setCreating] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Customers & agents for dropdowns
  const [customers, setCustomers] = useState<any[]>([]);
  const [agents, setAgents]       = useState<any[]>([]);

  // Form state
  const [form, setForm] = useState({
    job_type: 'IMP', customer_id: '', consignee_name: '', agent_id: '',
    pol: '', pod: '', cargo_description: '', commodity: '',
    packages: '', package_type: 'CTN', gross_weight: '', cbm: '',
    carrier: '', vessel: '', voyage: '', etd: '', eta: '', remarks: '',
  });

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), per_page: '20' });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const res = await fetch(`/api/jobs?${params}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setJobs(json.data || []);
      setTotal(json.total || 0);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  useEffect(() => {
    fetch('/api/customers?per_page=100').then(r => r.json()).then(j => setCustomers(j.data || []));
    fetch('/api/agents?per_page=100').then(r => r.json()).then(j => setAgents(j.data || []));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.pol || !form.pod || !form.cargo_description) {
      toast.error('POL, POD and cargo description are required');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          packages:     form.packages     ? Number(form.packages)     : 0,
          gross_weight: form.gross_weight ? Number(form.gross_weight) : 0,
          cbm:          form.cbm          ? Number(form.cbm)          : 0,
          customer_id:  form.customer_id  || undefined,
          agent_id:     form.agent_id     || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Job ${json.data.job_number} created!`);
      setShowModal(false);
      setForm({ job_type: 'IMP', customer_id: '', consignee_name: '', agent_id: '',
        pol: '', pod: '', cargo_description: '', commodity: '',
        packages: '', package_type: 'CTN', gross_weight: '', cbm: '',
        carrier: '', vessel: '', voyage: '', etd: '', eta: '', remarks: '' });
      fetchJobs();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setCreating(false);
    }
  };

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">Jobs</h2>
          <p className="text-sm text-slate-500">{total} total shipment jobs</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
          New Job
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px] max-w-xs">
          <SearchInput value={search} onChange={v => { setSearch(v); setPage(1); }} placeholder="Search jobs, cargo, HBL..." />
        </div>
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          className="h-9 px-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white text-slate-700"
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? <PageLoader /> : jobs.length === 0 ? (
          <EmptyState
            icon={<Package className="w-8 h-8" />}
            title="No jobs found"
            description="Create your first shipment job to get started."
            action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>Create Job</Button>}
          />
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>Job No.</Th>
                <Th>Customer</Th>
                <Th>POL → POD</Th>
                <Th>Cargo</Th>
                <Th>CBM</Th>
                <Th>ETA</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => {
                const sc = JOB_STATUS_CONFIG[job.status as JobStatus];
                return (
                  <Tr key={job.id} onClick={() => window.location.href = `/jobs/${job.id}`}>
                    <Td>
                      <div className="font-mono text-sm font-semibold text-brand-700">{job.job_number}</div>
                      <div className="text-xs text-slate-400 font-mono">{job.hbl_number}</div>
                    </Td>
                    <Td>
                      <div className="text-sm text-slate-800">{job.customer?.company_name || job.consignee_name || '—'}</div>
                    </Td>
                    <Td>
                      <div className="text-xs font-mono text-slate-600">
                        {job.pol?.split(' ')[0]} → {job.pod?.split(' ')[0]}
                      </div>
                    </Td>
                    <Td>
                      <div className="text-sm text-slate-700 max-w-[180px] truncate">{job.cargo_description}</div>
                      <div className="text-xs text-slate-400">{job.packages} {job.package_type}</div>
                    </Td>
                    <Td><span className="font-mono text-sm">{job.cbm}</span></Td>
                    <Td><span className="text-sm">{formatDate(job.eta)}</span></Td>
                    <Td>
                      {sc && <Badge color={sc.color} bg={sc.bg}>{sc.label}</Badge>}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}

        {/* Pagination */}
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

      {/* Create Job Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create New Job" size="lg">
        <form onSubmit={handleCreate} className="space-y-5">
          <div className="form-section">
            <div className="form-section-title">Job Details</div>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Job Type"
                value={form.job_type}
                onChange={f('job_type')}
                options={[{ value: 'IMP', label: 'Import (IMP)' }, { value: 'EXP', label: 'Export (EXP)' }]}
              />
              <Select
                label="Customer"
                value={form.customer_id}
                onChange={f('customer_id')}
                placeholder="— Select Customer —"
                options={customers.map(c => ({ value: c.id, label: c.company_name }))}
              />
            </div>
            <div className="mt-4">
              <Input label="Consignee Name (if different)" value={form.consignee_name} onChange={f('consignee_name')} placeholder="Name of consignee" />
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Routing</div>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Port of Loading (POL)" value={form.pol} onChange={f('pol')} required
                placeholder="— Select POL —" options={PORT_OPTIONS} />
              <Select label="Port of Discharge (POD)" value={form.pod} onChange={f('pod')} required
                placeholder="— Select POD —" options={POD_OPTIONS} />
              <Select label="Agent" value={form.agent_id} onChange={f('agent_id')}
                placeholder="— Select Agent —" options={agents.map(a => ({ value: a.id, label: `${a.name} (${a.port})` }))} />
              <Input label="Carrier" value={form.carrier} onChange={f('carrier')} placeholder="e.g. MSC, MAERSK" />
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4">
              <Input label="Vessel" value={form.vessel} onChange={f('vessel')} placeholder="Vessel name" />
              <Input label="Voyage" value={form.voyage} onChange={f('voyage')} placeholder="Voyage no." />
              <Input label="Carrier" value={form.carrier} onChange={f('carrier')} placeholder="e.g. MSC" />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input type="date" label="ETD" value={form.etd} onChange={f('etd')} />
              <Input type="date" label="ETA" value={form.eta} onChange={f('eta')} />
            </div>
          </div>

          <div className="form-section">
            <div className="form-section-title">Cargo</div>
            <Textarea label="Cargo Description" value={form.cargo_description} onChange={f('cargo_description')} required
              placeholder="e.g. 1 x 20GP FCL Said to Contain General Merchandise" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4">
              <Input label="Packages" type="number" value={form.packages} onChange={f('packages')} placeholder="0" />
              <Select label="Package Type" value={form.package_type} onChange={f('package_type')}
                options={['CTN','PLT','BAG','BOX','PKG','ROLL','PCS'].map(v => ({ value: v, label: v }))} />
              <Input label="Gross Weight (KG)" type="number" value={form.gross_weight} onChange={f('gross_weight')} placeholder="0.00" step="0.001" />
              <Input label="CBM" type="number" value={form.cbm} onChange={f('cbm')} placeholder="0.000" step="0.001" />
            </div>
            <div className="mt-4">
              <Textarea label="Remarks" value={form.remarks} onChange={f('remarks')} placeholder="Internal notes..." rows={2} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={creating}>Create Job</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
