/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateInvoicePDF } from '@/lib/pdf/InvoicePDF';

export async function POST(request: Request) {
  try {
    const { invoice } = await request.json();
    if (!invoice) {
      return new Response(JSON.stringify({ error: 'invoice payload required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const pdfBuffer = await generateInvoicePDF(invoice as any);
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="invoice.pdf"',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Failed to generate invoice pdf' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
