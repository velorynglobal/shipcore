/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const perPage = parseInt(searchParams.get('per_page') || '50');
    const vendorId = searchParams.get('vendor_id');

    let query = supabase
      .from('vendor_bills')
      .select('*, vendor:vendors(name)', { count: 'exact' })
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })
      .limit(perPage);

    if (vendorId) query = query.eq('vendor_id', vendorId);

    const { data, error, count } = await query;
    if (error) throw error;
    return NextResponse.json({ data: data || [], total: count || 0, error: null });
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
    const { data, error } = await supabase
      .from('vendor_bills')
      .insert({ ...body, company_id: profile.company_id, created_by: user.id, status: body.status || 'pending' })
      .select('*, vendor:vendors(name)')
      .single();

    if (error) throw error;
    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
