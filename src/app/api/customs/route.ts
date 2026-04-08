/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const status  = searchParams.get('status') || '';
    const page    = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '20');
    const offset  = (page - 1) * perPage;

    let query = supabase
      .from('customs_entries')
      .select('*, job:jobs(id, job_number, pol, pod)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (status) query = query.eq('status', status);

    const { data, error, count } = await query;
    if (error) throw error;

    return NextResponse.json({ data: data || [], total: count || 0, page, per_page: perPage, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('company_id, role').eq('id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (profile.role === 'viewer') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

    const body = await request.json();
    const {
      job_id, be_number, be_date, be_type = 'home_consumption',
      importer_name, iec_code, gstin, port_of_entry, country_of_origin,
      vessel_flight, awb_bl_number, description, hs_code, quantity, unit,
      cif_value = 0, assessable_value = 0, exchange_rate = 1, currency = 'USD',
      basic_duty_rate = 0, igst_rate = 18, remarks,
    } = body;

    if (!importer_name || !description) {
      return NextResponse.json({ error: 'Importer name and description are required' }, { status: 400 });
    }

    // Auto-calculate duties
    const basic_duty        = (assessable_value || cif_value) * (basic_duty_rate / 100);
    const sws               = basic_duty * 0.10; // 10% Social Welfare Surcharge
    const igst_base         = (assessable_value || cif_value) + basic_duty + sws;
    const igst_amount       = igst_base * (igst_rate / 100);
    const total_duty        = basic_duty + sws + igst_amount;

    const companyId: string = profile.company_id;

    const { data, error } = await supabase.from('customs_entries').insert({
      company_id: companyId,
      job_id: job_id || null,
      be_number: be_number || null,
      be_date: be_date || null,
      be_type,
      importer_name, iec_code, gstin,
      port_of_entry, country_of_origin,
      vessel_flight, awb_bl_number,
      description, hs_code,
      quantity, unit,
      cif_value, assessable_value, exchange_rate, currency,
      basic_duty_rate, basic_duty,
      igst_rate, igst_amount,
      social_welfare_surcharge: sws,
      total_duty,
      remarks: remarks || null,
      created_by: user.id,
      status: 'pending',
    }).select('*, job:jobs(id, job_number)').single();

    if (error) throw error;
    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
