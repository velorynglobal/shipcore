/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    let query = supabase.from('agents').select('*', { count: 'exact' }).eq('is_active', true).order('name');
    if (search) query = query.or(`name.ilike.%${search}%,port.ilike.%${search}%,country.ilike.%${search}%`);
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
    const { name, port, country, contact_name, email, phone, address } = body;
    if (!name || !port || !country) return NextResponse.json({ error: 'Name, port and country are required' }, { status: 400 });
    const { data, error } = await supabase.from('agents').insert({
      company_id: profile.company_id, name, port, country, contact_name, email, phone, address, created_by: user.id,
    }).select().single();
    if (error) throw error;
    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
