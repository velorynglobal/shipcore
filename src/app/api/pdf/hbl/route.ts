/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateHBLPDF } from '@/lib/pdf/HBLPDF';

export async function POST(request: Request) {
  try {
    const { hbl } = await request.json();
    if (!hbl) {
      return new Response(JSON.stringify({ error: 'hbl payload required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const pdfBuffer = await generateHBLPDF(hbl as any);
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="hbl.pdf"',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Failed to generate hbl pdf' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
