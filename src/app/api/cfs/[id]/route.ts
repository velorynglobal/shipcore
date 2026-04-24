/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { id, company_id, created_at, created_by, job, storage_days, ...updates } = body;
    void id; void company_id; void created_at; void created_by; void job; void storage_days;

    const { data, error } = await supabase
      .from('cfs_operations')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select('id, container_number, status')
      .single();

    if (error) throw error;
    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
