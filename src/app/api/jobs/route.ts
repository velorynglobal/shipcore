/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { nextJobNumbers } from '@/lib/numbering';

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const search  = searchParams.get('search') || '';
    const status  = searchParams.get('status') || '';
    const page    = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '20');
    const offset  = (page - 1) * perPage;

    let query = supabase.from('jobs').select(`
      *, customer:customers(id, company_name, contact_person, mobile, email),
      agent:agents(id, name, port, country)
    `, { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + perPage - 1);

    if (status) query = query.eq('status', status);
    if (search) query = query.or(`job_number.ilike.%${search}%,cargo_description.ilike.%${search}%,pol.ilike.%${search}%,pod.ilike.%${search}%,hbl_number.ilike.%${search}%`);

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
    const { job_type = 'IMP', customer_id, consignee_name, agent_id, pol, pod,
            cargo_description, commodity, packages, package_type, gross_weight, cbm,
            carrier, vessel, voyage, etd, eta, remarks } = body;

    if (!pol || !pod || !cargo_description) {
      return NextResponse.json({ error: 'POL, POD and cargo description are required' }, { status: 400 });
    }

    const { jobNumber: job_number, hblNumber: hbl_number } = await nextJobNumbers(supabase, job_type);

    const { data, error } = await supabase.from('jobs').insert({
      company_id: profile.company_id,
      job_number, job_type, hbl_number,
      customer_id: customer_id || null,
      consignee_name: consignee_name || null,
      agent_id: agent_id || null,
      pol, pod,
      cargo_description,
      commodity: commodity || null,
      packages: packages || 0,
      package_type: package_type || 'CTN',
      gross_weight: gross_weight || 0,
      cbm: cbm || 0,
      carrier: carrier || null,
      vessel: vessel || null,
      voyage: voyage || null,
      etd: etd || null,
      eta: eta || null,
      remarks: remarks || null,
      created_by: user.id,
      status: 'draft',
    }).select(`*, customer:customers(id, company_name), agent:agents(id, name, port, country)`).single();

    if (error) throw error;
    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
