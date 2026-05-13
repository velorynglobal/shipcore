import { generateInvoicePDF } from '@/lib/pdf/InvoicePDF';
import { sendEmail, buildInvoiceEmail, type EmailMessage } from '@/lib/email';
import { pdfLimiter } from '@/lib/rate-limit';
import type { Company } from '@/types';

// Default company info for demo / when DB is unavailable
const DEMO_COMPANY: Company = {
  id: 'demo-company',
  name: 'Veloryn Global Logistics Pvt. Ltd.',
  address: 'Unit No. 22, 2nd Floor, Maker Chamber VI, Nariman Point',
  city: 'Mumbai',
  country: 'India',
  phone: '+91 22 4050 1234',
  email: 'operations@velorynglobal.com',
  gst_number: '27AAFCV1234M1Z5',
  plan: 'enterprise',
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// GET — demo endpoint (returns sample invoice PDF)
export async function GET() {
  const sampleInvoice = {
    id: 'demo-inv-001',
    company_id: 'demo',
    invoice_number: 'VG/2025-26/001',
    invoice_type: 'sales' as const,
    taxable_amount: 150000,
    gst_rate: 18,
    gst_amount: 27000,
    total_amount: 177000,
    customer_amount: 177000,
    cost_amount: 120000,
    profit: 57000,
    status: 'sent' as const,
    due_date: new Date(Date.now() + 30 * 86400000).toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    line_items: [
      { description: 'Ocean Freight — Mumbai to Dubai (40HC)', quantity: 1, unit: 'Container', rate: 75000, amount: 75000 },
      { description: 'Documentation Fee', quantity: 1, unit: 'Shipment', rate: 3500, amount: 3500 },
      { description: 'CFS Handling & Stuffing', quantity: 1, unit: 'Container', rate: 15000, amount: 15000 },
      { description: 'BL Fee & AMS Filing', quantity: 1, unit: 'Shipment', rate: 2500, amount: 2500 },
      { description: 'Local Transport — Mumbai', quantity: 2, unit: 'Trips', rate: 12000, amount: 24000 },
      { description: 'Customs Clearance & Doc Attestation', quantity: 1, unit: 'Shipment', rate: 30000, amount: 30000 },
    ],
    customer: {
      id: 'cust-1', company_id: 'demo',
      company_name: 'Dubai Trading Co. LLC', address: 'Al Fahidi Street, Bur Dubai',
      gst_number: '', city: 'Dubai', credit_limit: 500000, is_active: true,
      created_at: '', updated_at: '',
    },
  };

  const pdfBuffer = await generateInvoicePDF(sampleInvoice, DEMO_COMPANY);

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="invoice_VG-2025-26-001.pdf"',
    },
  });
}

export async function POST(request: Request) {
  try {
    const { limited, resetTime } = await pdfLimiter(request);
    if (limited) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil((resetTime - Date.now()) / 1000)),
          'X-RateLimit-Remaining': '0',
        },
      });
    }

    const { invoice, email_to, company } = await request.json();
    if (!invoice) {
      return new Response(JSON.stringify({ error: 'invoice payload required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const pdfBuffer = await generateInvoicePDF(invoice, company || DEMO_COMPANY);

    if (email_to) {
      const emailMsg: EmailMessage = {
        to: email_to,
        subject: `Tax Invoice ${invoice.invoice_number || ''} — Veloryn Global Logistics`,
        html: buildInvoiceEmail(invoice.invoice_number || '', invoice.customer?.company_name || 'Valued Customer'),
        attachment: {
          content: pdfBuffer,
          filename: `Tax_Invoice_${invoice.invoice_number || 'N/A'}.pdf`,
          type: 'application/pdf',
        },
      };
      await sendEmail(emailMsg);
    }

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice_${invoice.invoice_number || 'N/A'}.pdf"`,
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Failed to generate invoice PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}