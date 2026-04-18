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
      .from('quotes')
      .select(`
        *,
        customer:customers(company_name, email, mobile),
        enquiry:enquiries(enquiry_number, origin, destination, cargo_type),
        job:jobs!job_id(job_number)
      `, { count: 'exact' })
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

    // Generate quote number
    const year = new Date().getFullYear();
    const { count } = await supabase.from('quotes').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id);
    const quoteNumber = `QT-${year}-${String((count || 0) + 1).padStart(4, '0')}`;

    // Calculate margin
    const buyRate  = Number(body.buy_rate) || 0;
    const sellRate = Number(body.sell_rate) || 0;
    const margin   = sellRate - buyRate;
    const marginPct = buyRate > 0 ? ((margin / buyRate) * 100) : 0;

    const { data, error } = await supabase.from('quotes').insert({
      ...body,
      company_id:   profile.company_id,
      quote_number: quoteNumber,
      margin,
      margin_pct:   Math.round(marginPct * 100) / 100,
      created_by:   user.id,
      status:       body.status || 'draft',
    }).select(`
      *,
      customer:customers(company_name),
      enquiry:enquiries(enquiry_number)
    `).single();

    if (error) throw error;

    // If linked to enquiry, update enquiry status to quoted
    if (body.enquiry_id) {
      await supabase.from('enquiries').update({ status: 'quoted' }).eq('id', body.enquiry_id);
    }

    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
