/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { requireRouteAccess } from '@/lib/route-auth';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireRouteAccess({ minimumRole: 'operator' });
    if (auth.errorResponse) return auth.errorResponse;

    const { supabase, profile } = auth;

    const body = await request.json();
    const { id, company_id, created_at, created_by, ...rest } = body;
    void id; void company_id; void created_at; void created_by;

    const updates: Record<string, any> = { ...rest };

    if (body.status === 'completed') {
      updates.completed_at = body.completed_at || new Date().toISOString();
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', params.id)
      .eq('company_id', profile.company_id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await requireRouteAccess({ minimumRole: 'operator' });
    if (auth.errorResponse) return auth.errorResponse;

    const { supabase, profile } = auth;
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', params.id)
      .eq('company_id', profile.company_id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
