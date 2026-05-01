/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { requireRouteAccess } from '@/lib/route-auth';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('company_id, role').eq('id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (profile.role === 'viewer') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

    const { job_id } = await request.json();
    if (!job_id) return NextResponse.json({ error: 'job_id is required' }, { status: 400 });

    const { data: consolData, error: consolErr } = await supabase.from('consol').select('*').eq('id', params.id).single();
    if (consolErr || !consolData) return NextResponse.json({ error: 'Consol not found' }, { status: 404 });
    if (consolData.status === 'closed') return NextResponse.json({ error: 'Cannot assign to closed consol' }, { status: 400 });

    const { data: jobData, error: jobErr } = await supabase.from('jobs').select('cbm, gross_weight').eq('id', job_id).single();
    if (jobErr || !jobData) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

    const { data: existing } = await supabase.from('consol_mapping').select('id').eq('consol_id', params.id).eq('job_id', job_id).maybeSingle();
    if (existing) return NextResponse.json({ error: 'Job already assigned to this consol' }, { status: 409 });

    const currentCBM: number = consolData.total_cbm || 0;
    const jobCBM: number = jobData.cbm || 0;
    const containerSize: number = consolData.container_size || 68;
    const newTotal = currentCBM + jobCBM;

    if (newTotal > containerSize) {
      return NextResponse.json({
        error: `Capacity exceeded. Current: ${currentCBM.toFixed(3)}, Job: ${jobCBM}, Limit: ${containerSize}`,
        details: { current_cbm: currentCBM, job_cbm: jobCBM, container_size: containerSize, available_cbm: containerSize - currentCBM }
      }, { status: 422 });
    }

    const companyId: string = profile.company_id;
    const { data: mapping, error: mapErr } = await supabase.from('consol_mapping').insert({
      company_id:  companyId,
      consol_id:   params.id,
      job_id,
      cbm:         jobCBM,
      weight:      jobData.gross_weight || 0,
      assigned_by: user.id,
    }).select().single();

    if (mapErr) throw mapErr;

    const { data: updatedConsol } = await supabase.from('consol').select('*').eq('id', params.id).single();
    return NextResponse.json({
      data: { mapping, consol: updatedConsol },
      message: `Job assigned. Container now ${newTotal.toFixed(3)} / ${containerSize} CBM`,
      error: null,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireRouteAccess({ minimumRole: 'operator' });
    if (auth.errorResponse) return auth.errorResponse;

    const { supabase } = auth;
    const { searchParams } = new URL(request.url);
    const job_id = searchParams.get('job_id');
    if (!job_id) return NextResponse.json({ error: 'job_id is required' }, { status: 400 });
    const { error } = await supabase.from('consol_mapping').delete().eq('consol_id', params.id).eq('job_id', job_id);
    if (error) throw error;
    return NextResponse.json({ data: { job_id, consol_id: params.id }, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
