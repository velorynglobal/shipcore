'use client';

import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Bell, MessageCircle, Mail, CheckCircle, XCircle, Clock } from 'lucide-react';
import {
  Button, Card, CardHeader, Table, Th, Td, Tr, Badge,
  EmptyState, PageLoader, Modal, Input, Select, Textarea,
} from '@/components/ui';
import { formatDate } from '@/lib/utils';

const STATUS_ICONS: Record<string, React.ReactNode> = {
  sent:    <CheckCircle className="w-4 h-4 text-emerald-500" />,
  failed:  <XCircle    className="w-4 h-4 text-red-500" />,
  pending: <Clock      className="w-4 h-4 text-amber-500" />,
};

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  sent:    { color: 'text-emerald-600', bg: 'bg-emerald-50' },
  failed:  { color: 'text-red-600',     bg: 'bg-red-50' },
  pending: { color: 'text-amber-600',   bg: 'bg-amber-50' },
};

const blank = { type: 'whatsapp', recipient: '', subject: '', message: '', job_id: '', invoice_id: '' };

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [total, setTotal]     = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [sending, setSending]     = useState(false);
  const [form, setForm]           = useState(blank);
  const [jobs, setJobs]       = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'compose'|'history'>('compose');

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch('/api/notifications?per_page=50');
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setNotifications(json.data || []);
      setTotal(json.total || 0);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);
  useEffect(() => {
    fetch('/api/jobs?per_page=100').then(r => r.json()).then(j => setJobs(j.data || []));
    fetch('/api/invoices?per_page=100').then(r => r.json()).then(j => setInvoices(j.data || []));
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.recipient || !form.message) { toast.error('Recipient and message are required'); return; }
    setSending(true);
    try {
      const res  = await fetch('/api/notifications', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...form,
          job_id:     form.job_id     || undefined,
          invoice_id: form.invoice_id || undefined,
        }),
      });
      const json = await res.json();
      if (res.status === 207) {
        toast(`Saved but not delivered: ${json.warning}`, { icon: '⚠️' });
      } else if (!res.ok) {
        throw new Error(json.error);
      } else {
        toast.success(json.message || 'Sent successfully!');
      }
      setShowModal(false);
      setForm(blank);
      fetchNotifications();
    } catch (err: any) { toast.error(err.message); }
    finally { setSending(false); }
  };

  const quickSend = async (docType: string, docId: string, recipient: string, channel: string) => {
    if (!recipient) { toast.error('No recipient contact found'); return; }
    try {
      const res  = await fetch('/api/notifications/quick', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ doc_type: docType, doc_id: docId, recipient, channel }),
      });
      const json = await res.json();
      if (res.status === 207) toast(`Saved but not delivered: ${json.warning}`, { icon: '⚠️' });
      else if (!res.ok) throw new Error(json.error);
      else toast.success(`${channel === 'whatsapp' ? 'WhatsApp' : 'Email'} sent!`);
      fetchNotifications();
    } catch (err: any) { toast.error(err.message); }
  };

  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }));

  const whatsappCount = notifications.filter(n => n.type === 'whatsapp').length;
  const emailCount    = notifications.filter(n => n.type === 'email').length;
  const sentCount     = notifications.filter(n => n.status === 'sent').length;
  const failedCount   = notifications.filter(n => n.status === 'failed').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-display font-bold text-slate-900">Notifications</h2>
          <p className="text-sm text-slate-500">{total} messages sent</p>
        </div>
        <Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>
          Send Message
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'WhatsApp',  value: whatsappCount, icon: <MessageCircle className="w-5 h-5" />, color: 'bg-green-50 text-green-600' },
          { label: 'Email',     value: emailCount,    icon: <Mail          className="w-5 h-5" />, color: 'bg-blue-50 text-blue-600' },
          { label: 'Delivered', value: sentCount,     icon: <CheckCircle   className="w-5 h-5" />, color: 'bg-emerald-50 text-emerald-600' },
          { label: 'Failed',    value: failedCount,   icon: <XCircle       className="w-5 h-5" />, color: 'bg-red-50 text-red-600' },
        ].map(s => (
          <Card key={s.label} className="p-4 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${s.color}`}>{s.icon}</div>
            <div>
              <div className="text-xl font-bold text-slate-900">{s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Send from Jobs */}
      <Card>
        <CardHeader title="Quick Send" subtitle="Send HBL or Invoice directly from a job" />
        <div className="p-5">
          {jobs.slice(0, 5).map(job => (
            <div key={job.id} className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0 flex-wrap gap-2">
              <div>
                <span className="font-mono text-sm font-semibold text-brand-700">{job.job_number}</span>
                <span className="text-xs text-slate-500 ml-2">{job.customer?.company_name || '—'}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => quickSend('hbl', job.id, job.customer?.mobile || '', 'whatsapp')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 hover:bg-green-100 text-green-700 text-xs font-medium rounded-lg transition-colors"
                >
                  <MessageCircle className="w-3.5 h-3.5" /> HBL via WhatsApp
                </button>
                <button
                  onClick={() => quickSend('hbl', job.id, job.customer?.email || '', 'email')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-medium rounded-lg transition-colors"
                >
                  <Mail className="w-3.5 h-3.5" /> HBL via Email
                </button>
              </div>
            </div>
          ))}
          {jobs.length === 0 && <p className="text-sm text-slate-400 text-center py-4">No jobs found</p>}
        </div>
      </Card>

      {/* History */}
      <Card className="overflow-hidden">
        <CardHeader title="Message History" subtitle="All sent notifications" />
        {loading ? <PageLoader /> : notifications.length === 0 ? (
          <EmptyState
            icon={<Bell className="w-8 h-8" />}
            title="No messages sent yet"
            description="Send your first WhatsApp or Email message."
            action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setShowModal(true)}>Send Message</Button>}
          />
        ) : (
          <Table>
            <thead><tr>
              <Th>Type</Th>
              <Th>Recipient</Th>
              <Th>Subject / Message</Th>
              <Th>Job / Invoice</Th>
              <Th>Sent At</Th>
              <Th>Status</Th>
            </tr></thead>
            <tbody>
              {notifications.map(n => {
                const sc = STATUS_COLORS[n.status] || STATUS_COLORS.pending;
                return (
                  <Tr key={n.id}>
                    <Td>
                      <div className="flex items-center gap-2">
                        {n.type === 'whatsapp'
                          ? <MessageCircle className="w-4 h-4 text-green-600" />
                          : <Mail          className="w-4 h-4 text-blue-600" />}
                        <span className="text-xs capitalize">{n.type}</span>
                      </div>
                    </Td>
                    <Td><span className="text-sm font-mono">{n.recipient}</span></Td>
                    <Td>
                      {n.subject && <div className="text-sm font-medium text-slate-800">{n.subject}</div>}
                      <div className="text-xs text-slate-400 truncate max-w-[200px]">{n.message?.slice(0, 60)}...</div>
                    </Td>
                    <Td>
                      <span className="font-mono text-xs text-brand-700">
                        {n.job?.job_number || n.invoice?.invoice_number || '—'}
                      </span>
                    </Td>
                    <Td><span className="text-sm">{formatDate(n.sent_at || n.created_at)}</span></Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        {STATUS_ICONS[n.status]}
                        <Badge color={sc.color} bg={sc.bg}>{n.status}</Badge>
                      </div>
                      {n.error_message && (
                        <div className="text-xs text-red-500 mt-0.5 max-w-[160px] truncate" title={n.error_message}>
                          {n.error_message}
                        </div>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        )}
      </Card>

      {/* Compose Modal */}
      <Modal open={showModal} onClose={() => setShowModal(false)} title="Send Message" size="md">
        <form onSubmit={handleSend} className="space-y-4">
          <Select label="Channel" value={form.type} onChange={f('type')}
            options={[
              { value: 'whatsapp', label: '💬 WhatsApp' },
              { value: 'email',    label: '✉️ Email' },
            ]} />

          <Input
            label={form.type === 'whatsapp' ? 'WhatsApp Number' : 'Email Address'}
            value={form.recipient}
            onChange={f('recipient')}
            required
            placeholder={form.type === 'whatsapp' ? '919876543210' : 'customer@email.com'}
            hint={form.type === 'whatsapp' ? 'Include country code, no + or spaces' : ''}
          />

          {form.type === 'email' && (
            <Input label="Subject" value={form.subject} onChange={f('subject')} placeholder="e.g. Your HBL is ready" />
          )}

          <Select label="Link to Job (optional)" value={form.job_id} onChange={f('job_id')}
            placeholder="— Select Job —"
            options={jobs.map(j => ({ value: j.id, label: `${j.job_number} — ${j.customer?.company_name || ''}` }))} />

          <Select label="Link to Invoice (optional)" value={form.invoice_id} onChange={f('invoice_id')}
            placeholder="— Select Invoice —"
            options={invoices.map(i => ({ value: i.id, label: `${i.invoice_number} — ${i.customer?.company_name || ''}` }))} />

          <Textarea label="Message" value={form.message} onChange={f('message')} required rows={5}
            placeholder="Type your message here..." />

          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
            ⚠️ Requires <strong>WHATSAPP_API_TOKEN</strong> or <strong>RESEND_API_KEY</strong> in Vercel environment variables.
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" type="button" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button type="submit" loading={sending}
              icon={form.type === 'whatsapp' ? <MessageCircle className="w-4 h-4" /> : <Mail className="w-4 h-4" />}>
              Send {form.type === 'whatsapp' ? 'WhatsApp' : 'Email'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
