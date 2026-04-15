'use client';
import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, IndianRupee, CreditCard, CheckCircle, TrendingUp } from 'lucide-react';
import { Button, Card, Table, Th, Td, Tr, EmptyState, PageLoader, Modal, Input, Select } from '@/components/ui';
import { formatDate, formatCurrency } from '@/lib/utils';

const PAYMENT_MODES = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'neft',          label: 'NEFT' },
  { value: 'rtgs',          label: 'RTGS' },
  { value: 'imps',          label: 'IMPS' },
  { value: 'upi',           label: 'UPI' },
  { value: 'cheque',        label: 'Cheque' },
  { value: 'cash',          label: 'Cash' },
  { value: 'razorpay',      label: 'Razorpay' },
  { value: 'other',         label: 'Other' },
];

const MODE_COLORS: Record<string, string> = {
  upi:           'bg-violet-50 text-violet-700',
  neft:          'bg-blue-50 text-blue-700',
  rtgs:          'bg-blue-50 text-blue-700',
  imps:          'bg-teal-50 text-teal-700',
  bank_transfer: 'bg-blue-50 text-blue-700',
  cheque:        'bg-amber-50 text-amber-700',
  cash:          'bg-emerald-50 text-emerald-700',
  razorpay:      'bg-indigo-50 text-indigo-700',
};

const blank = {
  invoice_id: '', customer_id: '', amount: '', currency: 'INR',
  payment_date: new Date().toISOString().split('T')[0],
  payment_mode: 'bank_transfer', reference_number: '',
  bank_name: '', tds_deducted: false, tds_amount: '', notes: '',
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(blank);
  const [invoices, setInvoices] = useState<any[]>([]);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/payments?per_page=50');
      const json = await res.json();
      setPayments(json.data || []);
      setTotal(json.total || 0);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);
  useEffect(() => {
    fetch('/api/invoices?per_page=100&status=sent').then(r => r.json()).then(j => setInvoices(j.data || []));
  }, []);

  const totalReceived = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const thisMonth = payments.filter(p => new Date(p.payment_date).getMonth() === new Date().getMonth())
    .reduce((s, p) => s + (p.amount || 0), 0);

  const handleCreate = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.invoice_id || !form.amount) { toast.error('Invoice and amount required'); return; }
    setSaving(true);
    try {
      const selectedInv = invoices.find(i => i.id === form.invoice_id);
      const res = await fetch('/api/payments', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form, amount: Number(form.amount),
          tds_amount: form.tds_amount ? Number(form.tds_amount) : 0,
          customer_id: selectedInv?.customer_id || null,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success('Payment recorded!');
      setShowModal(false); setForm(blank); fetchPayments();
    } catch (err: any) { toast.error(err.message); }
    finally { setSaving(false); }
  };

  const f = (k: string) => (e: React.ChangeEvent<any>) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">Payments Received</h2>
          <p className="text-sm text-slate-500">{total} receipts recorded</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>Record Payment</Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total Receipts', value: total, sub: 'All time', icon: <CreditCard className="w-5 h-5" />, color: 'text-blue-600 bg-blue-50' },
          { label: 'Total Received', value: formatCurrency(totalReceived), sub: 'All time', icon: <IndianRupee className="w-5 h-5" />, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'This Month', value: formatCurrency(thisMonth), sub: new Date().toLocaleString('default', { month: 'long' }), icon: <TrendingUp className="w-5 h-5" />, color: 'text-violet-600 bg-violet-50' },
        ].map(s => (
          <Card key={s.label} className="p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
            <div>
              <div className="text-xl font-bold text-slate-900">{s.value}</div>
              <div className="text-sm text-slate-500">{s.label}</div>
              <div className="text-xs text-slate-400">{s.sub}</div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        {loading ? <PageLoader /> : payments.length === 0 ? (
          <EmptyState icon={<CheckCircle className="w-8 h-8" />} title="No payments recorded"
            description="Record your first payment receipt against an invoice."
            action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>Record Payment</Button>} />
        ) : (
          <Table>
            <thead><tr>
              <Th>Receipt #</Th><Th>Customer</Th><Th>Invoice</Th>
              <Th>Amount</Th><Th>Mode</Th><Th>Reference</Th>
              <Th>Date</Th><Th>TDS</Th>
            </tr></thead>
            <tbody>
              {payments.map(p => (
                <Tr key={p.id}>
                  <Td><span className="font-mono text-sm font-semibold text-brand-700">{p.payment_number}</span></Td>
                  <Td><span className="text-sm font-medium">{p.customer?.company_name || '—'}</span></Td>
                  <Td><span className="font-mono text-xs text-slate-600">{p.invoice?.invoice_number || '—'}</span></Td>
                  <Td><span className="font-mono text-sm font-bold text-emerald-700">{formatCurrency(p.amount)}</span></Td>
                  <Td>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${MODE_COLORS[p.payment_mode] || 'bg-slate-100 text-slate-600'}`}>
                      {p.payment_mode?.toUpperCase().replace('_',' ')}
                    </span>
                  </Td>
                  <Td><span className="font-mono text-xs text-slate-500">{p.reference_number || '—'}</span></Td>
                  <Td><span className="text-sm">{formatDate(p.payment_date)}</span></Td>
                  <Td>
                    {p.tds_deducted
                      ? <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">{formatCurrency(p.tds_amount)}</span>
                      : <span className="text-xs text-slate-400">—</span>}
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      <Modal open={showModal} onClose={() => setShowModal(false)} title="Record Payment" size="md">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select label="Invoice" value={form.invoice_id} onChange={f('invoice_id')} required
            placeholder="— Select Invoice —"
            options={invoices.map(i => ({ value: i.id, label: `${i.invoice_number} — ${i.customer?.company_name || ''} — ₹${i.total_amount?.toLocaleString()}` }))} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Amount (₹)" type="number" value={form.amount} onChange={f('amount')} required placeholder="0.00" step="0.01" />
            <Input type="date" label="Payment Date" value={form.payment_date} onChange={f('payment_date')} required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Payment Mode" value={form.payment_mode} onChange={f('payment_mode')} options={PAYMENT_MODES} />
            <Input label="Reference / UTR Number" value={form.reference_number} onChange={f('reference_number')} placeholder="UTR / Cheque no." />
          </div>
          <Input label="Bank Name" value={form.bank_name} onChange={f('bank_name')} placeholder="e.g. HDFC Bank" />
          <div className="flex items-center gap-3">
            <input type="checkbox" id="tds" checked={form.tds_deducted}
              onChange={e => setForm(p => ({ ...p, tds_deducted: e.target.checked }))}
              className="w-4 h-4 rounded text-brand-600" />
            <label htmlFor="tds" className="text-sm text-slate-700">TDS deducted?</label>
            {form.tds_deducted && (
              <Input label="" type="number" value={form.tds_amount} onChange={f('tds_amount')} placeholder="TDS amount" className="w-32" />
            )}
          </div>
          <Input label="Notes" value={form.notes} onChange={f('notes')} placeholder="Optional notes..." />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Record Payment</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
