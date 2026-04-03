'use client';

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, FileText, Download, Trash2 } from 'lucide-react';
import {
  Button, Card, Table, Th, Td, Tr, Badge,
  EmptyState, PageLoader, Modal, Input, Select, Textarea,
} from '@/components/ui';
import {
  formatCurrency, formatDate, INVOICE_STATUS_CONFIG,
} from '@/lib/utils';
import type { Invoice, InvoiceStatus, InvoiceLineItem } from '@/types';

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'draft',     label: 'Draft' },
  { value: 'sent',      label: 'Sent' },
  { value: 'paid',      label: 'Paid' },
  { value: 'overdue',   label: 'Overdue' },
  { value: 'cancelled', label: 'Cancelled' },
];

const emptyLine = (): InvoiceLineItem => ({
  description: '', quantity: 1, unit: 'LOT', rate: 0, amount: 0,
});

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal]       = useState(0);
  const [loading, setLoading]   = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);

  // Customers & jobs for dropdowns
  const [customers, setCustomers] = useState<any[]>([]);
  const [jobs, setJobs]           = useState<any[]>([]);

  const [form, setForm] = useState({
    customer_id: '', job_id: '', invoice_type: 'sales',
    customer_amount: '', cost_amount: '',
    taxable_amount: '', gst_rate: '18', due_date: '', notes: '',
  });
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([emptyLine()]);

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ per_page: '20' });
      if (statusFilter) p.set('status', statusFilter);
      const res  = await fetch(`/api/invoices?${p}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setInvoices(json.data || []);
      setTotal(json.total || 0);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [statusFilter]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);
  useEffect(() => {
    fetch('/api/customers?per_page=100').then(r => r.json()).then(j => setCustomers(j.data || []));
    fetch('/api/jobs?per_page=100').then(r => r.json()).then(j => setJobs(j.data || []));
  }, []);

  // Auto-calc customer_amount from line items
  useEffect(() => {
    const total = lineItems.reduce((s, l) => s + (l.amount || 0), 0);
    if (total > 0) {
      setForm(p => ({ ...p, customer_amount: String(total), taxable_amount: String(total) }));
    }
  }, [lineItems]);

  const updateLine = (i: number, k: keyof InvoiceLineItem, v: string) => {
    setLineItems(prev => {
      const updated = [...prev];
      const line = { ...updated[i], [k]: k === 'description' || k === 'unit' ? v : Number(v) };
      if (k === 'quantity' || k === 'rate') {
        line.amount = Number(line.quantity) * Number(line.rate);
      }
      updated[i] = line;
      return updated;
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res  = await fetch('/api/invoices', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...form,
          customer_amount: Number(form.customer_amount),
          cost_amount:     Number(form.cost_amount),
          taxable_amount:  Number(form.taxable_amount || form.customer_amount),
          gst_rate:        Number(form.gst_rate),
          customer_id:     form.customer_id || undefined,
          job_id:          form.job_id      || undefined,
          line_items:      lineItems.filter(l => l.description),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success(`Invoice ${json.data.invoice_number} created!`);
      setShowModal(false);
      setLineItems([emptyLine()]);
      setForm({ customer_id: '', job_id: '', invoice_type: 'sales',
        customer_amount: '', cost_amount: '', taxable_amount: '', gst_rate: '18', due_date: '', notes: '' });
      fetchInvoices();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const downloadInvoicePDF = (invId: string) => window.open(`/api/documents/invoice/${invId}`, '_blank');

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const subtotal    = lineItems.reduce((s, l) => s + (l.amount || 0), 0);
  const gstAmount   = subtotal * (Number(form.gst_rate) / 100);
  const totalAmount = subtotal + gstAmount;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">Invoices</h2>
          <p className="text-sm text-slate-500">{total} invoices</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>New Invoice</Button>
      </div>

      {/* Status filter */}
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

      <Card className="overflow-hidden">
        {loading ? <PageLoader /> : invoices.length === 0 ? (
          <EmptyState
            icon={<FileText className="w-8 h-8" />}
            title="No invoices yet"
            description="Create your first invoice for a job."
            action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>New Invoice</Button>}
          />
        ) : (
          <Table>
            <thead><tr>
              <Th>Invoice No.</Th>
              <Th>Customer</Th>
              <Th>Job</Th>
              <Th>Revenue</Th>
              <Th>Cost</Th>
              <Th>Profit</Th>
              <Th>Total</Th>
              <Th>Due</Th>
              <Th>Status</Th>
              <Th>Action</Th>
            </tr></thead>
            <tbody>
              {invoices.map(inv => {
                const sc = INVOICE_STATUS_CONFIG[inv.status as InvoiceStatus];
                return (
                  <Tr key={inv.id}>
                    <Td><span className="font-mono text-sm font-semibold text-slate-800">{inv.invoice_number}</span></Td>
                    <Td><span className="text-sm">{inv.customer?.company_name || '—'}</span></Td>
                    <Td>
                      <span className="font-mono text-xs text-brand-700">{inv.job?.job_number || '—'}</span>
                    </Td>
                    <Td><span className="font-mono text-sm">{formatCurrency(inv.customer_amount)}</span></Td>
                    <Td><span className="font-mono text-sm text-red-600">{formatCurrency(inv.cost_amount)}</span></Td>
                    <Td>
                      <span className={`font-mono text-sm font-semibold ${(inv.profit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                        {formatCurrency(inv.profit)}
                      </span>
                    </Td>
                    <Td><span className="font-mono text-sm">{formatCurrency(inv.total_amount)}</span></Td>
                    <Td><span className="text-sm">{formatDate(inv.due_date)}</span></Td>
                    <Td>{sc && <Badge color={sc.color} bg={sc.bg}>{sc.label}</Badge>}</Td>
                    <Td>
                      <button onClick={() => downloadInvoicePDF(inv.id)}
                        className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors">
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Create Invoice Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Create Invoice" size="lg">
        <form onSubmit={handleCreate} className="space-y-5">
          {/* Links */}
          <div className="grid grid-cols-2 gap-4">
            <Select label="Customer" value={form.customer_id} onChange={f('customer_id')}
              placeholder="— Select Customer —"
              options={customers.map(c => ({ value: c.id, label: c.company_name }))} />
            <Select label="Job" value={form.job_id} onChange={f('job_id')}
              placeholder="— Link to Job —"
              options={jobs.map(j => ({ value: j.id, label: `${j.job_number} — ${j.cargo_description?.slice(0,30)}` }))} />
          </div>

          {/* Line Items */}
          <div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Line Items</div>
            <div className="space-y-2">
              {lineItems.map((line, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <input value={line.description}
                      onChange={e => updateLine(i, 'description', e.target.value)}
                      placeholder="Description"
                      className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-400" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" value={line.quantity}
                      onChange={e => updateLine(i, 'quantity', e.target.value)}
                      placeholder="Qty"
                      className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-400" />
                  </div>
                  <div className="col-span-2">
                    <input type="number" value={line.rate}
                      onChange={e => updateLine(i, 'rate', e.target.value)}
                      placeholder="Rate"
                      className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-400" />
                  </div>
                  <div className="col-span-2 text-sm font-mono text-right text-slate-700 pb-1">
                    ₹{line.amount.toLocaleString()}
                  </div>
                  <div className="col-span-1">
                    <button type="button" onClick={() => setLineItems(p => p.filter((_, j) => j !== i))}
                      className="p-1.5 text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" type="button"
              onClick={() => setLineItems(p => [...p, emptyLine()])}
              icon={<Plus className="w-3.5 h-3.5" />}
              className="mt-2 text-brand-600">
              Add Line
            </Button>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <Input label="Customer Amount (₹)" type="number" value={form.customer_amount}
              onChange={f('customer_amount')} placeholder="Total billed to customer" />
            <Input label="Our Cost (₹)" type="number" value={form.cost_amount}
              onChange={f('cost_amount')} placeholder="Total cost incurred" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Taxable Amount (₹)" type="number" value={form.taxable_amount}
              onChange={f('taxable_amount')} placeholder="Base for GST" />
            <Select label="GST Rate" value={form.gst_rate} onChange={f('gst_rate')}
              options={[{ value: '0', label: '0%' }, { value: '5', label: '5%' },
                        { value: '12', label: '12%' }, { value: '18', label: '18%' }, { value: '28', label: '28%' }]} />
          </div>

          {/* Summary */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
            {[
              ['Subtotal',  formatCurrency(subtotal)],
              [`GST @ ${form.gst_rate}%`, formatCurrency(gstAmount)],
              ['Profit',    formatCurrency(Number(form.customer_amount || 0) - Number(form.cost_amount || 0))],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between text-sm">
                <span className="text-slate-500">{l}</span>
                <span className="font-mono font-semibold text-slate-800">{v}</span>
              </div>
            ))}
            <div className="flex justify-between text-base font-bold border-t border-slate-200 pt-2 mt-2">
              <span>Total</span>
              <span className="font-mono text-brand-700">{formatCurrency(totalAmount)}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input type="date" label="Due Date" value={form.due_date} onChange={f('due_date')} />
            <Textarea label="Notes" value={form.notes} onChange={f('notes')} placeholder="Payment instructions..." rows={2} />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Invoice</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
