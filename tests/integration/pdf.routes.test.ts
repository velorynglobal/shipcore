import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NextResponse } from 'next/server';
import { POST as invoicePOST } from '../src/app/api/pdf/invoice/route';
import { POST as quotePOST } from '../src/app/api/pdf/quote/route';
import { POST as hblPOST } from '../src/app/api/pdf/hbl/route';

// Mock PDF generation
jest.mock('../src/lib/pdf/InvoicePDF', () => ({
  generateInvoicePDF: jest.fn().mockResolvedValue(Buffer.from('fake-pdf')),
}));
jest.mock('../src/lib/pdf/QuotePDF', () => ({
  generateQuotePDF: jest.fn().mockResolvedValue(Buffer.from('fake-pdf')),
}));
jest.mock('../src/lib/pdf/HBLPDF', () => ({
  generateHBLPDF: jest.fn().mockResolvedValue(Buffer.from('fake-pdf')),
}));

describe('PDF API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('invoice route should return 400 for missing payload', async () => {
    const req = new Request('http://localhost/api/pdf/invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ }),
    });
    const res = await invoicePOST(req);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBeDefined();
  });

  it('invoice route should return PDF for valid payload', async () => {
    const invoice = { invoice_number: 'INV-001', customer: { company_name: 'Test' }, total_amount: 100 };
    const req = new Request('http://localhost/api/pdf/invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice }),
    });
    const res = await invoicePOST(req);
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    const blob = await res.blob();
    expect(blob.size).toBeGreaterThan(0);
  });

  it('quote route should return 400 for missing payload', async () => {
    const req = new Request('http://localhost/api/pdf/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ }),
    });
    const res = await quotePOST(req);
    expect(res.status).toBe(400);
  });

  it('hbl route should return 400 for missing payload', async () => {
    const req = new Request('http://localhost/api/pdf/hbl', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ }),
    });
    const res = await hblPOST(req);
    expect(res.status).toBe(400);
  });
});
