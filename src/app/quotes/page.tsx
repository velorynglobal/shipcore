'use client';

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import {
  Plus, FileText, ArrowRight, TrendingUp, Send,
  CheckCircle, XCircle, RefreshCw, Calculator, Trash2,
} from 'lucide-react';
import {
  Button, Card, CardHeader, Table, Th, Td, Tr,
  EmptyState, PageLoader, Modal, Input, Select, Textarea,
} from '@/components/ui';
import { formatDate, formatCurrency, cn } from '@/lib/utils';

// ─── Types ───────────────────────────────────────────────────
interface LineItem {
  id: string;
  description: string;
  amount: number;
  currency: string;
  type: 'buy' | 'sell' | 'both';
}

// ─── Constants ───────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  draft:     'bg-slate-100 text-slate-600',
  sent:      'bg-blue-50 text-blue-700',
  accepted:  'bg-emerald-50 text-emerald-700',
  rejected:  'bg-red-50 text-red-600',
  expired:   'bg-slate-100 text-slate-400',
  converted: 'bg-violet-50 text-violet-700',
};

const STATUS_OPTIONS = [
  { value: 'draft',     label: 'Draft' },
  { value: 'sent',      label: 'Sent' },
  { value: 'accepted',  label: 'Accepted' },
  { value: 'rejected',  label: 'Rejected' },
  { value: 'expired',   label: 'Expired' },
];

const CARGO_OPTIONS = ['LCL','FCL_20','FCL_40','FCL_40HC','AIR','BREAKBULK'].map(s => ({ value: s, label: s }));
const CURRENCIES    = ['USD','EUR','GBP','CNY','AED','SGD','INR'].map(c => ({ value: c, label: c }));

const CHARGE_TYPES = [
  'Ocean Freight', 'THC (Origin)', 'THC (Destination)', 'BL Fee',
  'Documentation', 'CFS Charges', 'DO Charges', 'Inland Transport',
  'Customs Clearance', 'Agency Fee', 'Handling', 'Other',
];

const defaultLine = (): LineItem => ({
  id: Math.random().toString(36).slice(2),
  description: 'Ocean Freight',
  amount: 0,
  currency: 'USD',
  type: 'both',
});

const blank = {
  customer_id: '', enquiry_id: '', origin: '', destination: '',
  cargo_type: 'LCL', cbm: '', weight: '', validity_date: '',
  currency: 'USD', notes: '',
  buy_rate: '', sell_rate: '',
};

// ─── Main Component ──────────────────────────────────────────
export default function QuotesPage() {
  const [quotes, setQuotes]         = useState<any[]>([]);
  const [total, setTotal]           = useState(0);
  const [loading, setLoading]       = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Create modal
  const [showModal, setShowModal]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [form, setForm]             = useState(blank);
  const [lineItems, setLineItems]   = useState<LineItem[]>([defaultLine()]);
  const [useLineItems, setUseLineItems] = useState(false);

  // Detail modal
  const [detail, setDetail]         = useState<any | null>(null);
  const [converting, setConverting] = useState(false);

  // Data for selects
  const [customers, setCustomers]   = useState<any[]>([]);
  const [enquiries, setEnquiries]   = useState<any[]>([]);

  // ── Fetch ──────────────────────────────────────────────────
  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ per_page: '50' });
      if (statusFilter) p.set('status', statusFilter);
      const res  = await fetch(`/api/quotes?${p}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setQuotes(json.data || []);
      setTotal(json.total || 0);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);

  useEffect(() => {
    fetch('/api/customers?per_page=100').then(r => r.json()).then(j => setCustomers(j.data || []));
    fetch('/api/enquiries?per_page=100&status=new').then(r => r.json()).then(j => setEnquiries(j.data || []));
  }, []);

  // Auto-fill from enquiry
  useEffect(() => {
    if (!form.enquiry_id) return;
    const enq = enquiries.find(e => e.id === form.enquiry_id);
    if (!enq) return;
    setForm(p => ({
      ...p,
      origin:      enq.origin || p.origin,
      destination: enq.destination || p.destination,
      cargo_type:  enq.cargo_type || p.cargo_type,
      cbm:         enq.cbm?.toString() || p.cbm,
      weight:      enq.weight?.toString() || p.weight,
      customer_id: enq.customer_id || p.customer_id,
    }));
  }, [form.enquiry_id, enquiries]);

  // ── Calculated totals ──────────────────────────────────────
  const buyRate  = useLineItems
    ? lineItems.filter(l => l.type === 'buy' || l.type === 'both').reduce((s, l) => s + l.amount, 0)
    : Number(form.buy_rate) || 0;

  const sellRate = useLineItems
    ? lineItems.filter(l => l.type === 'sell' || l.type === 'both').reduce((s, l) => s + l.amount, 0)
    : Number(form.sell_rate) || 0;

  const margin    = sellRate - buyRate;
  const marginPct = buyRate > 0 ? ((margin / buyRate) * 100).toFixed(1) : '0.0';
  const marginColor = margin > 0 ? 'text-emerald-600' : margin < 0 ? 'text-red-600' : 'text-slate-500';

  // ── Line item helpers ──────────────────────────────────────
  const addLine = () => setLineItems(p => [...p, defaultLine()]);
  const removeLine = (id: string) => setLineItems(p => p.filter(l => l.id !== id));
  const updateLine = (id: string, key: keyof LineItem, val: string | number) =>
    setLineItems(p => p.map(l => l.id === id ? { ...l, [key]: val } : l));

  // ── Create quote ───────────────────────────────────────────
  const handleCreate = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.origin || !form.destination || !form.validity_date) {
      toast.error('Origin, destination and validity date are required');
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        ...form,
        cbm:    form.cbm    ? Number(form.cbm)    : null,
        weight: form.weight ? Number(form.weight) : null,
        buy_rate:  buyRate,
        sell_rate: sellRate,
        line_items: useLineItems ? lineItems : [],
        customer_id:  form.customer_id  || null,
        enquiry_id:   form.enquiry_id   || null,
      };

      const res  = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Quote ${json.data.quote_number} created!`);
      setShowModal(false);
      resetForm();
      fetchQuotes();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const resetForm = () => {
    setForm(blank);
    setLineItems([defaultLine()]);
    setUseLineItems(false);
  };

  // ── Update status ──────────────────────────────────────────
  const updateStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Status updated');
      fetchQuotes();
      if (detail?.id === id) setDetail((p: any) => ({ ...p, status }));
    } catch (e: any) { toast.error(e.message); }
  };

  // ── Convert to Job ─────────────────────────────────────────
  const convertToJob = async (quoteId: string) => {
    setConverting(true);
    try {
      const res  = await fetch(`/api/quotes/${quoteId}`, { method: 'PATCH' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(json.message);
      setDetail(null);
      fetchQuotes();
    } catch (err: any) { toast.error(err.message); }
    finally { setConverting(false); }
  };

  // ── Open detail ────────────────────────────────────────────
  const openDetail = async (quote: any) => {
    try {
      const res  = await fetch(`/api/quotes/${quote.id}`);
      const json = await res.json();
      setDetail(json.data);
    } catch { setDetail(quote); }
  };

  const f = (k: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [k]: e.target.value }));

  // ── Stats ──────────────────────────────────────────────────
  const totalValue  = quotes.filter(q => q.status === 'accepted').reduce((s, q) => s + (q.sell_rate || 0), 0);
  const winRate     = quotes.length > 0
    ? Math.round((quotes.filter(q => q.status === 'accepted' || q.status === 'converted').length / quotes.length) * 100)
    : 0;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">Quotes</h2>
          <p className="text-sm text-slate-500">{total} quotes</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>New Quote</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Draft',    value: quotes.filter(q => q.status === 'draft').length,    style: 'text-slate-600 bg-slate-50' },
          { label: 'Sent',     value: quotes.filter(q => q.status === 'sent').length,     style: 'text-blue-600 bg-blue-50' },
          { label: 'Accepted', value: quotes.filter(q => q.status === 'accepted' || q.status === 'converted').length, style: 'text-emerald-600 bg-emerald-50' },
          { label: 'Win Rate', value: `${winRate}%`, style: 'text-violet-600 bg-violet-50' },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <div className={`text-2xl font-bold ${s.style.split(' ')[0]}`}>{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.label}</div>
          </Card>
        ))}
      </div>

      {/* Accepted pipeline value */}
      {totalValue > 0 && (
        <Card className="p-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
            <div>
              <span className="text-sm text-emerald-700 font-medium">Accepted Quotes Value: </span>
              <span className="text-lg font-bold text-emerald-800">{formatCurrency(totalValue)}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Status filters */}
      <div className="flex gap-2 flex-wrap">
        {[{ value: '', label: 'All' }, ...STATUS_OPTIONS].map(s => (
          <button key={s.value} onClick={() => setStatusFilter(s.value)}
            className={cn('px-3 py-1.5 rounded-full text-xs font-medium transition-all',
              statusFilter === s.value ? 'bg-shell-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300')}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        {loading ? <PageLoader /> : quotes.length === 0 ? (
          <EmptyState icon={<FileText className="w-8 h-8" />} title="No quotes yet"
            description="Create a quote for a customer enquiry."
            action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>New Quote</Button>} />
        ) : (
          <Table>
            <thead><tr>
              <Th>Quote #</Th><Th>Customer</Th><Th>Route</Th>
              <Th>Type</Th><Th>Buy Rate</Th><Th>Sell Rate</Th>
              <Th>Margin</Th><Th>Valid Until</Th><Th>Status</Th>
            </tr></thead>
            <tbody>
              {quotes.map(q => (
                <Tr key={q.id} onClick={() => openDetail(q)} className="cursor-pointer hover:bg-slate-50">
                  <Td><span className="font-mono text-sm font-semibold text-brand-700">{q.quote_number}</span></Td>
                  <Td><span className="text-sm font-medium">{q.customer?.company_name || '—'}</span></Td>
                  <Td>
                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-slate-600 max-w-[80px] truncate">{q.origin}</span>
                      <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="text-slate-600 max-w-[80px] truncate">{q.destination}</span>
                    </div>
                  </Td>
                  <Td><span className="text-xs font-mono bg-slate-100 px-2 py-0.5 rounded">{q.cargo_type}</span></Td>
                  <Td><span className="font-mono text-sm text-slate-700">{q.currency} {q.buy_rate?.toLocaleString()}</span></Td>
                  <Td><span className="font-mono text-sm font-semibold">{q.currency} {q.sell_rate?.toLocaleString()}</span></Td>
                  <Td>
                    <span className={cn('font-mono text-sm font-bold',
                      q.margin > 0 ? 'text-emerald-600' : q.margin < 0 ? 'text-red-600' : 'text-slate-400')}>
                      {q.margin > 0 ? '+' : ''}{q.currency} {q.margin?.toLocaleString()}
                      <span className="text-xs font-normal ml-1">({q.margin_pct?.toFixed(1)}%)</span>
                    </span>
                  </Td>
                  <Td><span className="text-sm">{formatDate(q.validity_date)}</span></Td>
                  <Td onClick={e => e.stopPropagation()}>
                    <select value={q.status}
                      onChange={e => updateStatus(q.id, e.target.value)}
                      className={cn('text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer', STATUS_STYLE[q.status] || 'bg-slate-100 text-slate-500')}>
                      {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* ── Create Quote Modal ─────────────────────────────── */}
      <Modal open={showModal} onClose={() => { setShowModal(false); resetForm(); }} title="New Quote" size="xl">
        <form onSubmit={handleCreate} className="space-y-5">

          {/* Customer & Enquiry */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Link to Enquiry (optional)" value={form.enquiry_id} onChange={f('enquiry_id')}
              placeholder="— Select Enquiry (auto-fills) —"
              options={enquiries.map(e => ({ value: e.id, label: `${e.enquiry_number} • ${e.origin} → ${e.destination}` }))} />
            <Select label="Customer" value={form.customer_id} onChange={f('customer_id')}
              placeholder="— Select Customer —"
              options={customers.map(c => ({ value: c.id, label: c.company_name }))} />
          </div>

          {/* Route */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="Origin" value={form.origin} onChange={f('origin')} required placeholder="e.g. CNSHA" />
            <Input label="Destination" value={form.destination} onChange={f('destination')} required placeholder="e.g. INJNP" />
            <Select label="Cargo Type" value={form.cargo_type} onChange={f('cargo_type')} options={CARGO_OPTIONS} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Input label="CBM" type="number" value={form.cbm} onChange={f('cbm')} placeholder="0.00" step="0.01" />
            <Input label="Weight (KG)" type="number" value={form.weight} onChange={f('weight')} placeholder="0" />
            <Select label="Currency" value={form.currency} onChange={f('currency')} options={CURRENCIES} />
            <Input type="date" label="Valid Until" value={form.validity_date} onChange={f('validity_date')} required />
          </div>

          {/* Rate mode toggle */}
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <button type="button"
              onClick={() => setUseLineItems(!useLineItems)}
              className={cn('relative inline-flex h-5 w-9 rounded-full transition-colors flex-shrink-0',
                useLineItems ? 'bg-brand-600' : 'bg-slate-300')}>
              <span className={cn('inline-block w-4 h-4 bg-white rounded-full shadow transition-transform mt-0.5 ml-0.5',
                useLineItems ? 'translate-x-4' : 'translate-x-0')} />
            </button>
            <div>
              <div className="text-sm font-medium text-slate-700">
                {useLineItems ? 'Line Item Mode' : 'Simple Rate Mode'}
              </div>
              <div className="text-xs text-slate-400">
                {useLineItems ? 'Break down charges by type (Freight, THC, DO, etc.)' : 'Enter total buy/sell rates directly'}
              </div>
            </div>
          </div>

          {/* Simple rate inputs */}
          {!useLineItems && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label={`Buy Rate (${form.currency})`} type="number" value={form.buy_rate} onChange={f('buy_rate')} placeholder="0.00" step="0.01" />
              <Input label={`Sell Rate (${form.currency})`} type="number" value={form.sell_rate} onChange={f('sell_rate')} placeholder="0.00" step="0.01" />
            </div>
          )}

          {/* Line items */}
          {useLineItems && (
            <div className="space-y-2">
              <div className="text-sm font-medium text-slate-700 flex items-center justify-between">
                <span>Charge Breakdown</span>
                <button type="button" onClick={addLine}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1">
                  <Plus className="w-3 h-3" /> Add Line
                </button>
              </div>
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium w-[40%]">Description</th>
                      <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium w-[20%]">Amount</th>
                      <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium w-[15%]">Ccy</th>
                      <th className="text-left px-3 py-2 text-xs text-slate-500 font-medium w-[20%]">Type</th>
                      <th className="px-3 py-2 w-[5%]" />
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map(line => (
                      <tr key={line.id} className="border-b border-slate-100 last:border-0">
                        <td className="px-2 py-1.5">
                          <select value={line.description}
                            onChange={e => updateLine(line.id, 'description', e.target.value)}
                            className="w-full text-xs border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-brand-300 rounded px-1">
                            {CHARGE_TYPES.map(c => <option key={c}>{c}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <input type="number" value={line.amount || ''}
                            onChange={e => updateLine(line.id, 'amount', Number(e.target.value))}
                            className="w-full text-xs border border-slate-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-300"
                            placeholder="0" step="0.01" />
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={line.currency}
                            onChange={e => updateLine(line.id, 'currency', e.target.value)}
                            className="w-full text-xs border border-slate-200 rounded px-1 py-1 focus:outline-none">
                            {CURRENCIES.map(c => <option key={c.value}>{c.value}</option>)}
                          </select>
                        </td>
                        <td className="px-2 py-1.5">
                          <select value={line.type}
                            onChange={e => updateLine(line.id, 'type', e.target.value as any)}
                            className="w-full text-xs border border-slate-200 rounded px-1 py-1 focus:outline-none">
                            <option value="both">Buy+Sell</option>
                            <option value="buy">Buy only</option>
                            <option value="sell">Sell only</option>
                          </select>
                        </td>
                        <td className="px-2 py-1.5 text-center">
                          <button type="button" onClick={() => removeLine(line.id)}
                            className="text-slate-300 hover:text-red-500 transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Margin calculator — always visible */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-2 mb-3">
              <Calculator className="w-4 h-4 text-brand-600" />
              <span className="text-sm font-semibold text-slate-700">Margin Summary</span>
            </div>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-xs text-slate-500 mb-1">Buy Rate</div>
                <div className="text-lg font-bold text-slate-900">{form.currency} {buyRate.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Sell Rate</div>
                <div className="text-lg font-bold text-slate-900">{form.currency} {sellRate.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-xs text-slate-500 mb-1">Margin</div>
                <div className={cn('text-lg font-bold', marginColor)}>
                  {margin >= 0 ? '+' : ''}{form.currency} {margin.toLocaleString()}
                  <span className="text-sm font-normal ml-1">({marginPct}%)</span>
                </div>
              </div>
            </div>
          </div>

          <Textarea label="Notes / Terms" value={form.notes} onChange={f('notes')} rows={2}
            placeholder="Payment terms, validity conditions, exclusions..." />

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => { setShowModal(false); resetForm(); }}>Cancel</Button>
            <Button variant="outline" type="submit" onClick={() => setForm(p => ({ ...p, status: 'draft' } as any))}
              loading={saving} icon={<FileText className="w-4 h-4" />}>
              Save Draft
            </Button>
            <Button type="submit" loading={saving} icon={<Send className="w-4 h-4" />}
              onClick={() => setForm(p => ({ ...p, status: 'sent' } as any))}>
              Save & Mark Sent
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Quote Detail Modal ─────────────────────────────── */}
      {detail && (
        <Modal open={!!detail} onClose={() => setDetail(null)} title={`Quote ${detail.quote_number}`} size="lg">
          <div className="space-y-5">
            {/* Header info */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Customer</div>
                <div className="font-semibold">{detail.customer?.company_name || '—'}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Route</div>
                <div className="font-semibold flex items-center gap-1">
                  {detail.origin}
                  <ArrowRight className="w-3 h-3 text-slate-400" />
                  {detail.destination}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Valid Until</div>
                <div className="font-semibold">{formatDate(detail.validity_date)}</div>
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-0.5">Cargo Type</div>
                <div className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded inline-block">{detail.cargo_type}</div>
              </div>
              {detail.enquiry && (
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Enquiry</div>
                  <div className="font-mono text-sm text-brand-600">{detail.enquiry.enquiry_number}</div>
                </div>
              )}
              {detail.job && (
                <div>
                  <div className="text-xs text-slate-400 mb-0.5">Converted Job</div>
                  <div className="font-mono text-sm text-violet-600">{detail.job.job_number}</div>
                </div>
              )}
            </div>

            {/* Financial summary */}
            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { label: 'Buy Rate',  value: `${detail.currency} ${detail.buy_rate?.toLocaleString()}`,  color: 'text-slate-900' },
                { label: 'Sell Rate', value: `${detail.currency} ${detail.sell_rate?.toLocaleString()}`, color: 'text-slate-900' },
                { label: 'Margin',    value: `${detail.margin >= 0 ? '+' : ''}${detail.currency} ${detail.margin?.toLocaleString()} (${detail.margin_pct?.toFixed(1)}%)`,
                  color: detail.margin > 0 ? 'text-emerald-600' : detail.margin < 0 ? 'text-red-600' : 'text-slate-500' },
              ].map(s => (
                <div key={s.label} className="bg-slate-50 rounded-xl p-3">
                  <div className="text-xs text-slate-400 mb-1">{s.label}</div>
                  <div className={cn('font-bold text-sm', s.color)}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Line items if present */}
            {detail.line_items?.length > 0 && (
              <div>
                <div className="text-sm font-semibold text-slate-700 mb-2">Charge Breakdown</div>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-sm">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-3 py-2 text-xs text-slate-500">Description</th>
                        <th className="text-right px-3 py-2 text-xs text-slate-500">Amount</th>
                        <th className="text-center px-3 py-2 text-xs text-slate-500">Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.line_items.map((l: LineItem) => (
                        <tr key={l.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-3 py-2 text-slate-700">{l.description}</td>
                          <td className="px-3 py-2 text-right font-mono">{l.currency} {l.amount?.toLocaleString()}</td>
                          <td className="px-3 py-2 text-center">
                            <span className="text-xs bg-slate-100 px-2 py-0.5 rounded">{l.type}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {detail.notes && (
              <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600">
                <div className="text-xs text-slate-400 mb-1 font-medium">Notes / Terms</div>
                {detail.notes}
              </div>
            )}

            {/* Actions */}
            <div className="flex flex-wrap gap-3 pt-2">
              {detail.status === 'draft' && (
                <Button variant="outline" icon={<Send className="w-4 h-4" />}
                  onClick={() => updateStatus(detail.id, 'sent')}>
                  Mark as Sent
                </Button>
              )}
              {detail.status === 'sent' && (
                <>
                  <Button icon={<CheckCircle className="w-4 h-4" />}
                    onClick={() => updateStatus(detail.id, 'accepted')}>
                    Mark Accepted
                  </Button>
                  <Button variant="outline" icon={<XCircle className="w-4 h-4" />}
                    onClick={() => updateStatus(detail.id, 'rejected')}>
                    Mark Rejected
                  </Button>
                </>
              )}
              {detail.status === 'accepted' && !detail.job_id && (
                <Button
                  icon={converting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                  loading={converting}
                  onClick={() => convertToJob(detail.id)}
                  className="bg-emerald-600 hover:bg-emerald-700">
                  Convert to Job
                </Button>
              )}
              {detail.status === 'converted' && (
                <div className="flex items-center gap-2 text-sm text-violet-600 font-medium">
                  <CheckCircle className="w-4 h-4" />
                  Converted to Job {detail.job?.job_number}
                </div>
              )}
              <Button variant="outline" onClick={() => setDetail(null)} className="ml-auto">Close</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
