'use client';

import React, { useState } from 'react';
import { Button, Card, CardHeader, Input, Select, Textarea } from '@/components/ui';

async function postJson(url: string, payload: unknown) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await response.json();
  if (!response.ok) {
    throw new Error(json?.error || 'Request failed');
  }
  return json;
}

export default function AiPlaygroundPage() {
  const [jobsPayload, setJobsPayload] = useState(`{
  "free_text": "Import shipment from Shanghai to Chennai. Cargo: electronic parts. 120 cartons. ETA 2026-04-21.",
  "context": { "job_type": "IMP" }
}`);
  const [jobsResult, setJobsResult] = useState('');
  const [jobsLoading, setJobsLoading] = useState(false);

  const [invoicePayload, setInvoicePayload] = useState(`{
  "invoice_type": "sales",
  "currency": "INR",
  "notes": "Include destination THC, documentation charges, and handling."
}`);
  const [invoiceResult, setInvoiceResult] = useState('');
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const [docType, setDocType] = useState<'hbl' | 'invoice'>('hbl');
  const [entityId, setEntityId] = useState('');
  const [docChecks, setDocChecks] = useState('completeness,consistency');
  const [docResult, setDocResult] = useState('');
  const [docLoading, setDocLoading] = useState(false);

  const runJobsDraft = async () => {
    setJobsLoading(true);
    try {
      const payload = JSON.parse(jobsPayload);
      const json = await postJson('/api/ai/jobs/draft', payload);
      setJobsResult(JSON.stringify(json, null, 2));
    } catch (error: any) {
      setJobsResult(error.message || 'Invalid JSON payload');
    } finally {
      setJobsLoading(false);
    }
  };

  const runInvoiceSuggest = async () => {
    setInvoiceLoading(true);
    try {
      const payload = JSON.parse(invoicePayload);
      const json = await postJson('/api/ai/invoices/suggest-line-items', payload);
      setInvoiceResult(JSON.stringify(json, null, 2));
    } catch (error: any) {
      setInvoiceResult(error.message || 'Invalid JSON payload');
    } finally {
      setInvoiceLoading(false);
    }
  };

  const runDocumentValidate = async () => {
    setDocLoading(true);
    try {
      const checks = docChecks
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean);
      const json = await postJson('/api/ai/documents/validate', {
        document_type: docType,
        entity_id: entityId,
        checks,
      });
      setDocResult(JSON.stringify(json, null, 2));
    } catch (error: any) {
      setDocResult(error.message || 'Request failed');
    } finally {
      setDocLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-display font-bold text-slate-900">AI Playground</h2>
        <p className="text-sm text-slate-500">
          Internal testing page for ShipCore AI endpoints.
        </p>
      </div>

      <Card>
        <CardHeader title="POST /api/ai/jobs/draft" subtitle="Create a structured job draft from free text." />
        <div className="p-5 space-y-3">
          <Textarea
            value={jobsPayload}
            onChange={(event) => setJobsPayload(event.target.value)}
            className="font-mono text-xs min-h-40"
          />
          <Button onClick={runJobsDraft} loading={jobsLoading}>
            Run Jobs Draft
          </Button>
          <Textarea
            value={jobsResult}
            readOnly
            className="font-mono text-xs min-h-56"
            placeholder="Response JSON will appear here."
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="POST /api/ai/invoices/suggest-line-items"
          subtitle="Suggest invoice line items and anomaly signals."
        />
        <div className="p-5 space-y-3">
          <Textarea
            value={invoicePayload}
            onChange={(event) => setInvoicePayload(event.target.value)}
            className="font-mono text-xs min-h-36"
          />
          <Button onClick={runInvoiceSuggest} loading={invoiceLoading}>
            Run Invoice Suggestion
          </Button>
          <Textarea
            value={invoiceResult}
            readOnly
            className="font-mono text-xs min-h-56"
            placeholder="Response JSON will appear here."
          />
        </div>
      </Card>

      <Card>
        <CardHeader
          title="POST /api/ai/documents/validate"
          subtitle="Validate HBL or invoice completeness and consistency."
        />
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Select
              label="Document Type"
              value={docType}
              onChange={(event) => setDocType(event.target.value as 'hbl' | 'invoice')}
              options={[
                { value: 'hbl', label: 'HBL' },
                { value: 'invoice', label: 'Invoice' },
              ]}
            />
            <Input
              label="Entity ID"
              placeholder="UUID"
              value={entityId}
              onChange={(event) => setEntityId(event.target.value)}
            />
            <Input
              label="Checks (comma separated)"
              placeholder="completeness,consistency,wording"
              value={docChecks}
              onChange={(event) => setDocChecks(event.target.value)}
            />
          </div>
          <Button onClick={runDocumentValidate} loading={docLoading}>
            Run Document Validate
          </Button>
          <Textarea
            value={docResult}
            readOnly
            className="font-mono text-xs min-h-56"
            placeholder="Response JSON will appear here."
          />
        </div>
      </Card>
    </div>
  );
}
