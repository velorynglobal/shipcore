'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { ArrowLeft, Download, FileText, Save } from 'lucide-react';
import { Button, Badge, Card, CardHeader, PageLoader } from '@/components/ui';
import { formatDate, formatCBM, formatWeight, JOB_STATUS_CONFIG } from '@/lib/utils';
import type { Job, JobStatus } from '@/types';

type EditFieldKey = 'vessel' | 'voyage' | 'mbl_number' | 'container_no' | 'seal_no' | 'be_number';

const STATUS_OPTIONS: { value: JobStatus; label: string }[] = [
  { value: 'draft',             label: 'Draft' },
  { value: 'booked',            label: 'Booked' },
  { value: 'in-transit',        label: 'In Transit' },
  { value: 'arrived',           label: 'Arrived' },
  { value: 'customs-clearance', label: 'Customs Clearance' },
  { value: 'delivered',         label: 'Delivered' },
  { value: 'closed',            label: 'Closed' },
  { value: 'cancelled',         label: 'Cancelled' },
];

const FIELD_CONFIG: { key: EditFieldKey; label: string; placeholder: string }[] = [
  { key: 'vessel',       label: 'Vessel',     placeholder: 'Vessel name' },
  { key: 'voyage',       label: 'Voyage',     placeholder: 'Voyage no.' },
  { key: 'mbl_number',   label: 'MBL No.',    placeholder: 'Master B/L' },
  { key: 'container_no', label: 'Container',  placeholder: 'MSCU1234567' },
  { key: 'seal_no',      label: 'Seal No.',   placeholder: 'Seal number' },
  { key: 'be_number',    label: 'BE Number',  placeholder: 'Bill of Entry' },
];

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-1 py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider w-36 flex-shrink-0">{label}</span>
      <span className="text-sm text-slate-800 font-medium">{value || '—'}</span>
    </div>
  );
}

export default function JobDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [job, setJob]         = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving]   = useState(false);
  const [editStatus, setEditStatus] = useState<JobStatus>('draft');
  const [editFields, setEditFields] = useState<Record<EditFieldKey, string>>({
    mbl_number: '', container_no: '', seal_no: '', vessel: '', voyage: '', be_number: '',
  });

  useEffect(() => {
    fetch(`/api/jobs/${id}`)
      .then(r => r.json())
      .then(j => {
        if (j.error) { toast.error(j.error); router.push('/jobs'); return; }
        setJob(j.data);
        setEditStatus(j.data.status);
        setEditFields({
          mbl_number:   j.data.mbl_number   || '',
          container_no: j.data.container_no || '',
          seal_no:      j.data.seal_no      || '',
          vessel:       j.data.vessel       || '',
          voyage:       j.data.voyage       || '',
          be_number:    j.data.be_number    || '',
        });
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res  = await fetch(`/api/jobs/${id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ status: editStatus, ...editFields }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setJob(json.data);
      toast.success('Job updated');
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const downloadHBL = () => window.open(`/api/documents/hbl/${id}`, '_blank');

  const f = (k: EditFieldKey) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setEditFields(p => ({ ...p, [k]: e.target.value }));

  if (loading) return <PageLoader />;
  if (!job)    return null;

  const sc = JOB_STATUS_CONFIG[job.status as JobStatus];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-start gap-4 flex-wrap">
        <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors mt-0.5">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="font-display font-bold text-2xl text-slate-900">{job.job_number}</h2>
            {sc && <Badge color={sc.color} bg={sc.bg}>{sc.label}</Badge>}
          </div>
          <p className="text-sm text-slate-500 font-mono mt-1">HBL: {job.hbl_number || '—'}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={downloadHBL}>
            HBL PDF
          </Button>
          <Button size="sm" icon={<Save className="w-3.5 h-3.5" />} loading={saving} onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-5">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex-1">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Job Status</p>
                <select
                  value={editStatus}
                  onChange={e => setEditStatus(e.target.value as JobStatus)}
                  className="h-9 px-3 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 bg-white"
                >
                  {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">Created</p>
                <p className="text-sm text-slate-700">{formatDate(job.created_at)}</p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Routing" subtitle="Ports and vessel info" />
            <div className="p-5">
              <InfoRow label="Port of Loading"   value={job.pol} />
              <InfoRow label="Port of Discharge" value={job.pod} />
              <InfoRow label="Agent" value={job.agent ? `${job.agent.name} — ${job.agent.port}, ${job.agent.country}` : undefined} />
              <InfoRow label="ETD"   value={formatDate(job.etd)} />
              <InfoRow label="ETA"   value={formatDate(job.eta)} />
              <div className="mt-4 grid grid-cols-2 gap-3">
                {FIELD_CONFIG.map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-slate-500 block mb-1">{label}</label>
                    <input
                      value={editFields[key]}
                      onChange={f(key)}
                      placeholder={placeholder}
                      className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-brand-400 bg-white"
                    />
                  </div>
                ))}
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Cargo Details" />
            <div className="p-5">
              <InfoRow label="Description"  value={job.cargo_description} />
              <InfoRow label="Commodity"    value={job.commodity} />
              <InfoRow label="Packages"     value={`${job.packages} ${job.package_type}`} />
              <InfoRow label="Gross Weight" value={formatWeight(job.gross_weight)} />
              <InfoRow label="Measurement"  value={formatCBM(job.cbm)} />
              {job.remarks && <InfoRow label="Remarks" value={job.remarks} />}
            </div>
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <CardHeader title="Customer" />
            <div className="p-5">
              {job.customer ? (
                <>
                  <p className="font-semibold text-slate-900">{job.customer.company_name}</p>
                  {job.customer.contact_person && <p className="text-sm text-slate-500 mt-1">{job.customer.contact_person}</p>}
                  {job.customer.mobile && <p className="text-sm text-slate-500">{job.customer.mobile}</p>}
                  {job.customer.email  && <p className="text-sm text-brand-600">{job.customer.email}</p>}
                </>
              ) : (
                <p className="text-sm text-slate-400">{job.consignee_name || 'No customer assigned'}</p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Key Dates" />
            <div className="p-5 space-y-2">
              {[
                { label: 'ETD',     value: formatDate(job.etd) },
                { label: 'ETA',     value: formatDate(job.eta) },
                { label: 'ATD',     value: formatDate(job.atd) },
                { label: 'ATA',     value: formatDate(job.ata) },
                { label: 'BE Date', value: formatDate(job.be_date) },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-sm font-medium text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4 space-y-2">
            <Button variant="outline" size="sm" className="w-full" icon={<Download className="w-3.5 h-3.5" />} onClick={downloadHBL}>
              Download HBL
            </Button>
            <Button variant="ghost" size="sm" className="w-full text-slate-600"
              onClick={() => window.location.href = `/invoices?job_id=${job.id}`}
              icon={<FileText className="w-3.5 h-3.5" />}>
              View Invoices
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
