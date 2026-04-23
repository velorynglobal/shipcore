/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users').select('company_id').eq('id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const status  = searchParams.get('status');
    const perPage = parseInt(searchParams.get('per_page') || '50');

    // Step 1: fetch customs entries (no embed — avoids schema cache issue)
    let query = supabase
      .from('customs_entries')
      .select('*', { count: 'exact' })
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })
      .limit(perPage);

    if (status) query = query.eq('status', status);

    const { data: entries, error, count } = await query;
    if (error) throw error;
    if (!entries?.length) return NextResponse.json({ data: [], total: 0, error: null });

    // Step 2: fetch related jobs separately
    const jobIds = [...new Set(entries.map((e: any) => e.job_id).filter(Boolean))];
    let jobMap: Record<string, any> = {};

    if (jobIds.length > 0) {
      const { data: jobs } = await supabase
        .from('jobs')
        .select('id, job_number, cargo_description, customer_id, customers!customer_id(company_name)')
        .in('id', jobIds);

      if (jobs) {
        jobs.forEach((j: any) => {
          jobMap[j.id] = {
            job_number: j.job_number,
            cargo_description: j.cargo_description,
            customer: j.customers ?? null,
          };
        });
      }
    }

    // Step 3: merge
    const data = entries.map((e: any) => ({
      ...e,
      job: e.job_id ? (jobMap[e.job_id] ?? null) : null,
    }));

    return NextResponse.json({ data, total: count || 0, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users').select('company_id, role').eq('id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (profile.role === 'viewer') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

    const body = await request.json();
    const { data, error } = await supabase
      .from('customs_entries')
      .insert({ ...body, company_id: profile.company_id, created_by: user.id, status: body.status || 'pending' })
      .select('id, be_number, job_id, status, created_at')
      .single();

    if (error) throw error;
    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
