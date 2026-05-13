"use client";
import React from 'react';
import InvoiceDownloader from '@/app/components/InvoiceDownloader';
import QuoteDownloader from '@/app/components/QuoteDownloader';
import HBLDownloader from '@/app/components/HBLDownloader';

export default function DemoPdfPage() {
  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>PDF Demo</h1>
      <p style={{ color: '#6b7280', marginBottom: 24 }}>
        Click to generate or preview sample PDFs.
      </p>

      <div style={{ display: 'flex', gap: 20, flexDirection: 'column' }}>
        <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
          <strong>Tax Invoice (CGST/SGST/IGST)</strong>
          <br />
          <a href="/api/pdf/invoice" target="_blank" style={{ color: '#1e40af', fontSize: 12 }}>
            Preview in browser →
          </a>
          <div style={{ marginTop: 8 }}>
            <InvoiceDownloader />
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
          <strong>Quote PDF</strong>
          <div style={{ marginTop: 8 }}>
            <QuoteDownloader />
          </div>
        </div>

        <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8 }}>
          <strong>HBL (House Bill of Lading)</strong>
          <div style={{ marginTop: 8 }}>
            <HBLDownloader />
          </div>
        </div>
      </div>
    </div>
  );
}
