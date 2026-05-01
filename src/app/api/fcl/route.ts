/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { requireRouteAccess } from '@/lib/route-auth';

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const perPage = parseInt(searchParams.get('per_page') || '200');

    const { data: containers, error } = await supabase
      .from('containers')
      .select('*', { count: 'exact' })
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })
      .limit(perPage);

    if (error) throw error;
    if (!containers?.length) return NextResponse.json({ data: [], total: 0 });

    const jobIds = [...new Set(containers.map((c: any) => c.job_id).filter(Boolean))];
    let jobMap: Record<string, any> = {};
    if (jobIds.length > 0) {
      const { data: jobs } = await supabase
        .from('jobs').select('id, job_number, customers!customer_id(company_name)').in('id', jobIds);
      jobs?.forEach((j: any) => { jobMap[j.id] = { job_number: j.job_number, customer: j.customers ?? null }; });
    }

    const data = containers.map((c: any) => ({ ...c, job: c.job_id ? (jobMap[c.job_id] ?? null) : null }));
    return NextResponse.json({ data, total: data.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRouteAccess({ minimumRole: 'operator' });
    if (auth.errorResponse) return auth.errorResponse;

    const { profile, supabase } = auth;
    const body = await request.json();
    const { data, error } = await supabase.from('containers')
      .insert({ ...body, company_id: profile.company_id }).select().single();
    if (error) throw error;
    return NextResponse.json({ data }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
