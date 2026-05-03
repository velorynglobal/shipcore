"use client";
import React, { useState } from 'react';

interface HBLDownloaderProps {
  hblId?: string; // If provided, fetches real data
}

export default function HBLDownloader({ hblId }: HBLDownloaderProps) {
  const [loading, setLoading] = useState(false);

  async function handleDownload() {
    setLoading(true);
    try {
      let payload: any = {
        hbl: {
          hbl_number: 'HBL-1001',
          customer: { company_name: 'ACME Corp' },
          vessel: 'Vessel One',
        },
      };

      // If hblId is provided, fetch real data
      if (hblId) {
        const res = await fetch(`/api/hbl/${hblId}`);
        if (res.ok) {
          const data = await res.json();
          payload = { hbl: data.data || data };
        }
      }

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
      a.download = `hbl_${payload.hbl?.hbl_number || 'HBL-1001'}.pdf`;
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