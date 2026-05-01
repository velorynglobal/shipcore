/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { generateHBLPDF } from '@/lib/pdf';
import { verifyDocumentShareToken } from '@/lib/document-share';

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient();
    const shareToken = new URL(request.url).searchParams.get('share');
    const hasValidShare = verifyDocumentShareToken(shareToken, 'hbl', params.id);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user && !hasValidShare) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .select('*, customer:customers(*), agent:agents(*), company:companies(*)')
      .eq('id', params.id)
      .single();
    if (jobErr || !job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    let company = (job as any)?.company ?? null;
    if (!company && user) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('company:companies(*)')
        .eq('id', user.id)
        .single();
      company = (userProfile as any)?.company ?? null;
    }
    if (!company) return NextResponse.json({ error: 'Company not found' }, { status: 404 });

    const pdfBuffer = await generateHBLPDF(job, company);
    const uint8Array = new Uint8Array(pdfBuffer);

    return new NextResponse(uint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="HBL-${job.hbl_number || job.job_number}.pdf"`,
        'Content-Length': uint8Array.byteLength.toString(),
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
