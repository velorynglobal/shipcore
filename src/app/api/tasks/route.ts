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
    const status   = searchParams.get('status');
    const priority = searchParams.get('priority');
    const type     = searchParams.get('type');
    const perPage  = parseInt(searchParams.get('per_page') || '100');

    let query = supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .eq('company_id', profile.company_id)
      .order('priority', { ascending: false })
      .order('due_date',  { ascending: true })
      .limit(perPage);

    if (status)   query = query.eq('status',    status);
    if (priority) query = query.eq('priority',  priority);
    if (type)     query = query.eq('task_type', type);

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
      .from('tasks')
      .insert({
        ...body,
        company_id:  profile.company_id,
        created_by:  user.id,
        status:      body.status || 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
