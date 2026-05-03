"use client";
import React, { useState } from 'react'

export default function HBLDownloader() {
  const [loading, setLoading] = useState(false)

  async function handleDownload() {
    setLoading(true)
    try {
      const payload = {
        hbl: {
          hbl_number: 'HBL-1001',
          customer: { company_name: 'ACME Corp' },
          vessel: 'Vessel One',
        },
      };
      const res = await fetch('/api/pdf/hbl', {
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
      a.download = 'hbl_HBL-1001.pdf';
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
      {loading ? 'Generating...' : 'Download HBL PDF'}
    </button>
  );
}