"use client";
import React from 'react';
import InvoiceDownloader from '@/app/components/InvoiceDownloader';

export default function DemoPdfPage() {
  return (
    <div style={{ padding: 20 }}>
      <h1>PDF Demo</h1>
      <p>Click to download a sample invoice PDF using the new API route.</p>
      <InvoiceDownloader />
    </div>
  );
}
