/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { requireRouteAccess } from '@/lib/route-auth';
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireRouteAccess({ minimumRole: 'operator' });
    if (auth.errorResponse) return auth.errorResponse;

    const { supabase } = auth;
    const body = await request.json();
    const { id, company_id, created_at, created_by, ...updates } = body;
    void id; void company_id; void created_at; void created_by;

    const { data, error } = await supabase.from('vendors').update(updates).eq('id', params.id).select().single();
    if (error) throw error;
    return NextResponse.json({ data, error: null });
  } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }); }
}
