/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { CONTAINER_CAPACITIES } from '@/lib/utils';
import { nextConsolNumber } from '@/lib/numbering';

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
    let query = supabase.from('consol').select('*', { count: 'exact' })
      .order('created_at', { ascending: false }).range(offset, offset + perPage - 1);
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
    const { container_type = '40HC', container_size, pol, pod, carrier, vessel, voyage, etd, eta } = body;
    if (!pol || !pod) return NextResponse.json({ error: 'POL and POD are required' }, { status: 400 });
    const capacity: number = container_size || (CONTAINER_CAPACITIES[container_type] as number) || 68;
    const consol_number = await nextConsolNumber(supabase);
    const { data, error } = await supabase.from('consol').insert({
      company_id: profile.company_id,
      consol_number, container_type, container_size: capacity,
      pol, pod,
      carrier: carrier || null, vessel: vessel || null, voyage: voyage || null,
      etd: etd || null, eta: eta || null,
      created_by: user.id, status: 'open',
    }).select().single();
    if (error) throw error;
    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
