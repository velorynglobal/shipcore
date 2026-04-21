/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('company_id', profile.company_id)
      .single();

    if (error && error.code === 'PGRST116') {
      // No settings yet — create defaults
      const { data: newData } = await supabase
        .from('company_settings')
        .insert({ company_id: profile.company_id })
        .select()
        .single();
      return NextResponse.json({ data: newData, error: null });
    }

    if (error) throw error;
    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('company_id, role').eq('id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (profile.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const body = await request.json();
    const { id, company_id, created_at, ...updates } = body;
    void id; void company_id; void created_at;

    const { data, error } = await supabase
      .from('company_settings')
      .upsert({
        ...updates,
        company_id: profile.company_id,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'company_id' })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
