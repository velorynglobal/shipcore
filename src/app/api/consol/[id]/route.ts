/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { requireRouteAccess } from '@/lib/route-auth';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data, error } = await supabase.from('consol').select(`
      *, consol_mapping:consol_mapping(
        *, job:jobs(id, job_number, hbl_number, cargo_description, cbm, gross_weight, packages, customer:customers(company_name))
      )
    `).eq('id', params.id).single();
    if (error || !data) return NextResponse.json({ error: 'Consol not found' }, { status: 404 });
    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireRouteAccess({ minimumRole: 'operator' });
    if (auth.errorResponse) return auth.errorResponse;

    const { supabase } = auth;
    const body = await request.json();
    const { id, company_id, created_at, created_by, total_cbm, total_weight, total_jobs, consol_mapping, ...updates } = body;
    void id; void company_id; void created_at; void created_by; void total_cbm; void total_weight; void total_jobs; void consol_mapping;

    const { data, error } = await supabase.from('consol').update(updates).eq('id', params.id).select().single();
    if (error) throw error;
    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
