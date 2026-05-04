"use client";
import React, { useState } from 'react';

interface QuoteDownloaderProps {
  quoteId?: string; // If provided, fetches real data
}

export default function QuoteDownloader({ quoteId }: QuoteDownloaderProps) {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      let payload: any = {
        quote: {
          quote_number: 'QT-1001',
          customer: { company_name: 'ACME Corp' },
          total_amount: 5000.00,
        },
      };

      // If quoteId is provided, fetch real data
      if (quoteId) {
        const res = await fetch(`/api/quotes/${quoteId}`);
        if (res.ok) {
          const data = await res.json();
          payload = { quote: data.data || data };
        }
      }

      const res = await fetch('/api/pdf/quote', {
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
      a.download = `quote_${payload.quote?.quote_number || 'QT-1001'}.pdf`;
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
      {loading ? 'Generating...' : 'Download Quote PDF'}
    </button>
  );
}