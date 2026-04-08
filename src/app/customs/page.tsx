'use client';

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, FileCheck, ChevronDown, ChevronUp, Calculator } from 'lucide-react';
import {
  Button, Card, Table, Th, Td, Tr, Badge,
  EmptyState, PageLoader, Modal, Input, Select, Textarea,
} from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils';

const STATUS_OPTIONS = [
  { value: '',               label: 'All Statuses' },
  { value: 'pending',        label: 'Pending' },
  { value: 'filed',          label: 'Filed' },
  { value: 'queried',        label: 'Queried' },
  { value: 'assessed',       label: 'Assessed' },
  { value: 'out_of_charge',  label: 'Out of Charge' },
  { value: 'duty_paid',      label: 'Duty Paid' },
  { value: 'goods_released', label: 'Goods Released' },
];

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  pending:        { color: 'text-slate-500',   bg: 'bg-slate-100' },
  filed:          { color: 'text-blue-600',    bg: 'bg-blue-50' },
  queried:        { color: 'text-amber-600',   bg: 'bg-amber-50' },
  assessed:       { color: 'text-violet-600',  bg: 'bg-violet-50' },
  out_of_charge:  { color: 'text-orange-600',  bg: 'bg-orange-50' },
  duty_paid:      { color: 'text-teal-600',    bg: 'bg-teal-50' },
  goods_released: { color: 'text-emerald-600', bg: 'bg-emerald-50' },
};

const BE_TYPES = [
  { value: 'home_consumption', label: 'Home Consumption (B/E)' },
  { value: 'warehousing',      label: 'Into Warehousing' },
  { value: 'transit',          label: 'Transit' },
  { value: 'ex_bond',          label: 'Ex-Bond' },
];

const CURRENCIES = ['USD','EUR','GBP','JPY','CNY','AED','SGD','INR'].map(c => ({ value: c, label: c }));

const blank = {
  job_id: '', be_number: '', be_date: '', be_type: 'home_consumption',
  importer_name: '', iec_code: '', gstin: '', port_of_entry: '', country_of_origin: '',
  vessel_flight: '', awb_bl_number: '', description: '', hs_code: '',
  quantity: '', unit: 'KGS', cif_value: '', assessable_value: '',
  exchange_rate: '1', currency: 'USD',
  basic_duty_rate: '0', igst_rate: '18', remarks: '',
};

export default function CustomsPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [form, setForm]           = useState(blank);
  const [jobs, setJobs]           = useState<any[]>([]);
  const [showCalc, setShowCalc]   = useState(false);

  // Calculated duties preview
  const cifVal      = Number(form.cif_value) || 0;
  const assVal      = Number(form.assessable_value) || cifVal;
  const basicDuty   = assVal * (Number(form.basic_duty_rate) / 100);
  const sws         = basicDuty * 0.10;
  const igstBase    = assVal + basicDuty + sws;
  const igstAmt     = igstBase * (Number(form.igst_rate) / 100);
  const totalDuty   = basicDuty + sws + igstAmt;

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ per_page: '20' });
      if (statusFilter) p.set('status', statusFilter);
      const res  = await fetch(`/api/customs?${p}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setEntries(json.data || []);
      setTotal(json.total || 0);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  useEffect(() => {
    fetch('/api/jobs?per_page=100&status=arrived')
      .then(r => r.json()).then(j => setJobs(j.data || []));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.importer_name || !form.description) {
      toast.error('Importer name and description are required');
      return;
    }
    setSaving(true);
    try {
      const res  = await fetch('/api/customs', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...form,
          quantity:        form.quantity        ? Number(form.quantity)        : null,
          cif_value:       form.cif_value       ? Number(form.cif_value)       : 0,
          assessable_value:form.assessable_value? Number(form.assessable_value): 0,
          exchange_rate:   Number(form.exchange_rate),
          basic_duty_rate: Number(form.basic_duty_rate),
          igst_rate:       Number(form.igst_rate),
          job_id:          form.job_id || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Customs entry created!');
      setShowModal(false);
      setForm(blank);
      fetchEntries();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      const res  = await fetch(`/api/customs/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Status updated');
      fetchEntries();
    } catch (e: any) { toast.error(e.message); }
  };

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">Customs Clearance</h2>
          <p className="text-sm text-slate-500">{total} entries</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
          New Entry
        </Button>
      </div>

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        {STATUS_OPTIONS.map(s => (
          <button key={s.value}
            onClick={() => setStatusFilter(s.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              statusFilter === s.value
                ? 'bg-shell-800 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300'
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? <PageLoader /> : entries.length === 0 ? (
          <EmptyState
            icon={<FileCheck className="w-8 h-8" />}
            title="No customs entries"
            description="Create your first customs clearance entry."
            action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>New Entry</Button>}
          />
        ) : (
          <Table>
            <thead><tr>
              <Th>BE Number</Th>
              <Th>Importer</Th>
              <Th>Job</Th>
              <Th>Description</Th>
              <Th>Assessable Value</Th>
              <Th>Total Duty</Th>
              <Th>BE Date</Th>
              <Th>Status</Th>
            </tr></thead>
            <tbody>
              {entries.map(entry => {
                const sc = STATUS_COLORS[entry.status] || STATUS_COLORS.pending;
                return (
                  <Tr key={entry.id}>
                    <Td><span className="font-mono text-sm font-semibold text-brand-700">{entry.be_number || '—'}</span></Td>
                    <Td><span className="text-sm font-medium">{entry.importer_name}</span></Td>
                    <Td><span className="font-mono text-xs text-slate-600">{entry.job?.job_number || '—'}</span></Td>
                    <Td><span className="text-sm truncate max-w-[160px] block">{entry.description}</span></Td>
                    <Td><span className="font-mono text-sm">{formatCurrency(entry.assessable_value)}</span></Td>
                    <Td><span className="font-mono text-sm font-semibold text-red-600">{formatCurrency(entry.total_duty)}</span></Td>
                    <Td><span className="text-sm">{formatDate(entry.be_date)}</span></Td>
                    <Td>
                      <select
                        value={entry.status}
                        onChange={e => updateStatus(entry.id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer ${sc.bg} ${sc.color}`}
                      >
                        {STATUS_OPTIONS.filter(s => s.value).map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Create Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="New Customs Entry" size="xl">
        <form onSubmit={handleCreate} className="space-y-5">

          {/* BE Details */}
          <div className="form-section">
            <div className="form-section-title">Bill of Entry Details</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Input label="BE Number" value={form.be_number} onChange={f('be_number')} placeholder="e.g. 1234567" />
              <Input type="date" label="BE Date" value={form.be_date} onChange={f('be_date')} />
              <Select label="BE Type" value={form.be_type} onChange={f('be_type')} options={BE_TYPES} />
            </div>
            <div className="mt-4">
              <Select label="Link to Job" value={form.job_id} onChange={f('job_id')}
                placeholder="— Select Job (optional) —"
                options={jobs.map(j => ({ value: j.id, label: `${j.job_number} — ${j.cargo_description?.slice(0,40)}` }))} />
            </div>
          </div>

          {/* Importer */}
          <div className="form-section">
            <div className="form-section-title">Importer Details</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Importer Name" value={form.importer_name} onChange={f('importer_name')} required placeholder="Company name" />
              <Input label="IEC Code" value={form.iec_code} onChange={f('iec_code')} placeholder="10-digit IEC" />
              <Input label="GSTIN" value={form.gstin} onChange={f('gstin')} placeholder="GST number" />
            </div>
          </div>

          {/* Shipment */}
          <div className="form-section">
            <div className="form-section-title">Shipment Details</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              <Input label="Port of Entry" value={form.port_of_entry} onChange={f('port_of_entry')} placeholder="e.g. INJNP" />
              <Input label="Country of Origin" value={form.country_of_origin} onChange={f('country_of_origin')} placeholder="e.g. China" />
              <Input label="AWB / BL Number" value={form.awb_bl_number} onChange={f('awb_bl_number')} placeholder="Master BL" />
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Textarea label="Cargo Description" value={form.description} onChange={f('description')} required rows={2} placeholder="Description of goods" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="HS Code" value={form.hs_code} onChange={f('hs_code')} placeholder="8-digit HS code" />
                <Input label="Quantity" type="number" value={form.quantity} onChange={f('quantity')} placeholder="0" />
              </div>
            </div>
          </div>

          {/* Valuation & Duties */}
          <div className="form-section">
            <div className="flex items-center justify-between mb-4">
              <div className="form-section-title mb-0">Valuation &amp; Duty Calculation</div>
              <button type="button" onClick={() => setShowCalc(!showCalc)}
                className="flex items-center gap-1.5 text-xs text-brand-600 font-medium">
                <Calculator className="w-3.5 h-3.5" />
                {showCalc ? 'Hide' : 'Show'} Calculator
                {showCalc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <Input label="CIF Value" type="number" value={form.cif_value} onChange={f('cif_value')} placeholder="0.00" step="0.01" />
              <Input label="Assessable Value" type="number" value={form.assessable_value} onChange={f('assessable_value')} placeholder="Auto from CIF" step="0.01" />
              <Select label="Currency" value={form.currency} onChange={f('currency')} options={CURRENCIES} />
              <Input label="Exchange Rate" type="number" value={form.exchange_rate} onChange={f('exchange_rate')} placeholder="1.00" step="0.0001" />
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4">
              <Input label="Basic Duty %" type="number" value={form.basic_duty_rate} onChange={f('basic_duty_rate')} placeholder="0" step="0.01" />
              <Input label="IGST %" type="number" value={form.igst_rate} onChange={f('igst_rate')} placeholder="18" step="0.01" />
            </div>

            {/* Duty Calculator Preview */}
            {showCalc && (
              <div className="mt-4 bg-slate-50 rounded-xl border border-slate-200 p-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Duty Calculation Preview</div>
                <div className="space-y-1.5">
                  {[
                    ['Assessable Value', formatCurrency(assVal)],
                    ['Basic Customs Duty', `${form.basic_duty_rate}% = ${formatCurrency(basicDuty)}`],
                    ['Social Welfare Surcharge (10% of BCD)', formatCurrency(sws)],
                    ['IGST Base', formatCurrency(igstBase)],
                    [`IGST ${form.igst_rate}%`, formatCurrency(igstAmt)],
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between text-sm">
                      <span className="text-slate-500">{l}</span>
                      <span className="font-mono text-slate-700">{v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-2 mt-2">
                    <span>Total Duty Payable</span>
                    <span className="font-mono text-red-600">{formatCurrency(totalDuty)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <Textarea label="Remarks" value={form.remarks} onChange={f('remarks')} placeholder="Internal notes..." rows={2} />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Entry</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
