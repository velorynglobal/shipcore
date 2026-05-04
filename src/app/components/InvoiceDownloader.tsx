"use client";
import React, { useState } from 'react';

interface InvoiceDownloaderProps {
  invoiceId?: string; // If provided, fetches real data
}

export default function InvoiceDownloader({ invoiceId }: InvoiceDownloaderProps) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      let payload: any = {
        invoice: {
          invoice_number: 'INV-1001',
          customer: { company_name: 'ACME Corp' },
          total_amount: 1234.56,
        },
      };

      // If invoiceId is provided, fetch real data
      if (invoiceId) {
        const res = await fetch(`/api/invoices/${invoiceId}`);
        if (res.ok) {
          const data = await res.json();
          payload = { invoice: data.data || data };
        }
      }

      const res = await fetch('/api/pdf/invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Failed to fetch PDF');
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice_${payload.invoice?.invoice_number || 'download'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert('Failed to download PDF. See console for details.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleDownload} disabled={loading}>
      {loading ? 'Generating...' : 'Download Invoice PDF'}
    </button>
  );
}
