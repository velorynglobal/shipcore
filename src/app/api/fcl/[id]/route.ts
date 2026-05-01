/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { requireRouteAccess } from '@/lib/route-auth';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireRouteAccess({ minimumRole: 'operator' });
    if (auth.errorResponse) return auth.errorResponse;

    const { supabase } = auth;
    const body = await request.json();
    const { id, company_id, created_at, job, ...updates } = body;
    void id; void company_id; void created_at; void job;

    const { data, error } = await supabase.from('containers').update(updates).eq('id', params.id).select().single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
