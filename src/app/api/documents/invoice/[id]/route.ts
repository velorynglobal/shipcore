/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateInvoicePDF } from '@/lib/pdf';
import { verifyDocumentShareToken } from '@/lib/document-share';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient();
    const shareToken = new URL(request.url).searchParams.get('share');
    const hasValidShare = verifyDocumentShareToken(shareToken, 'invoice', params.id);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && !hasValidShare) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .select('*, job:jobs(id, job_number, pol, pod), customer:customers(*), company:companies(*)')
      .eq('id', params.id)
      .single();
    if (invErr || !invoice) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });

    let company = (invoice as any)?.company ?? null;
    if (!company && user) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('company:companies(*)')
        .eq('id', user.id)
        .single();
      company = (userProfile as any)?.company ?? null;
    }
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const pdfBuffer = await generateInvoicePDF(invoice, company);
    const uint8Array = new Uint8Array(pdfBuffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="INV-${invoice.invoice_number}.pdf"`,
        'Content-Length': uint8Array.byteLength.toString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
