/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { requireRouteAccess } from '@/lib/route-auth';

export async function GET(request: Request) {
  try {
    const auth = await requireRouteAccess();
    if (auth.errorResponse) return auth.errorResponse;

    const { supabase, profile } = auth;

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
    const auth = await requireRouteAccess({ minimumRole: 'operator' });
    if (auth.errorResponse) return auth.errorResponse;

    const { supabase, profile, user } = auth;

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
