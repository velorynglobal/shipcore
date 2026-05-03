/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateQuotePDF } from '@/lib/pdf/QuotePDF';

export async function POST(request: Request) {
  try {
    const { quote } = await request.json();
    if (!quote) {
      return new Response(JSON.stringify({ error: 'quote payload required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const pdfBuffer = await generateQuotePDF(quote as any);
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="quote.pdf"',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Failed to generate quote pdf' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
