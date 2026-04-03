/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data, error } = await supabase.from('jobs').select(`
      *, customer:customers(*), agent:agents(*),
      consol_mapping:consol_mapping(*, consol:consol(*))
    `).eq('id', params.id).single();
    if (error || !data) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
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
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (profile?.role === 'viewer') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    const body = await request.json();
    const allowed = ['status','customer_id','consignee_name','agent_id','pol','pod',
      'cargo_description','commodity','packages','package_type','gross_weight','cbm',
      'mbl_number','hbl_number','carrier','vessel','voyage','container_no','seal_no',
      'etd','eta','atd','ata','be_number','be_date','assessed_value','remarks'];
    const updates: Record<string, any> = {};
    for (const key of allowed) { if (key in body) updates[key] = body[key]; }
    const { data, error } = await supabase.from('jobs').update(updates).eq('id', params.id)
      .select(`*, customer:customers(id, company_name), agent:agents(id, name, port, country)`).single();
    if (error) throw error;
    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: profile } = await supabase.from('users').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Admins only' }, { status: 403 });
    await supabase.from('jobs').update({ status: 'cancelled' }).eq('id', params.id);
    return NextResponse.json({ data: { id: params.id }, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
