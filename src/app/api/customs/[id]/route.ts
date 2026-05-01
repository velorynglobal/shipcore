/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { requireRouteAccess } from '@/lib/route-auth';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('customs_entries')
      .select('*, job:jobs(id, job_number, pol, pod, cargo_description, customer:customers(company_name))')
      .eq('id', params.id)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Entry not found' }, { status: 404 });
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
    const { id, company_id, created_at, created_by, job, ...updates } = body;
    void id; void company_id; void created_at; void created_by; void job;

    // Recalculate duties if values changed
    if (updates.basic_duty_rate !== undefined || updates.assessable_value !== undefined || updates.igst_rate !== undefined) {
      const av           = updates.assessable_value || updates.cif_value || 0;
      const bd           = av * ((updates.basic_duty_rate || 0) / 100);
      const sws          = bd * 0.10;
      const igst_base    = av + bd + sws;
      const igst_amount  = igst_base * ((updates.igst_rate || 18) / 100);
      updates.basic_duty               = bd;
      updates.social_welfare_surcharge = sws;
      updates.igst_amount              = igst_amount;
      updates.total_duty               = bd + sws + igst_amount;
    }

    const { data, error } = await supabase
      .from('customs_entries')
      .update(updates)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
