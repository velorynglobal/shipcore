/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateInvoicePDF } from '@/lib/pdf';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: invoice, error: invErr } = await supabase.from('invoices')
      .select('*, job:jobs(id, job_number, pol, pod), customer:customers(*)')
      .eq('id', params.id).single();
    if (invErr || !invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    const { data: userProfile } = await supabase.from('users').select('company:companies(*)').eq('id', user.id).single();
    const company = (userProfile as any)?.company;
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const pdfBuffer = await generateInvoicePDF(invoice, company);
    const uint8Array = new Uint8Array(pdfBuffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type':        'application/pdf',
        'Content-Disposition': `attachment; filename="INV-${invoice.invoice_number}.pdf"`,
        'Content-Length':      uint8Array.byteLength.toString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
