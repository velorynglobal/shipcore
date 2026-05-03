"use client";
import React from 'react';
import InvoiceDownloader from '@/app/components/InvoiceDownloader';
import QuoteDownloader from '@/app/components/QuoteDownloader';
import HBLDownloader from '@/app/components/HBLDownloader';

export default function DemoPdfPage() {
  return (
    <div style={{ padding: 20 }}>
      <h1>PDF Demo</h1>
      <p>Click to download sample PDFs using the new API routes.</p>
      <div style={{ display: 'flex', gap: 20, flexDirection: 'column' }}>
        <InvoiceDownloader />
        <QuoteDownloader />
        <HBLDownloader />
      </div>
    </div>
  );
}
