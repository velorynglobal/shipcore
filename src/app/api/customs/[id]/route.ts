/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

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
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    // Recalculate duties if values changed
    if (body.basic_duty_rate !== undefined || body.assessable_value !== undefined || body.igst_rate !== undefined) {
      const av           = body.assessable_value || body.cif_value || 0;
      const bd           = av * ((body.basic_duty_rate || 0) / 100);
      const sws          = bd * 0.10;
      const igst_base    = av + bd + sws;
      const igst_amount  = igst_base * ((body.igst_rate || 18) / 100);
      body.basic_duty               = bd;
      body.social_welfare_surcharge = sws;
      body.igst_amount              = igst_amount;
      body.total_duty               = bd + sws + igst_amount;
    }

    const { data, error } = await supabase
      .from('customs_entries')
      .update(body)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
