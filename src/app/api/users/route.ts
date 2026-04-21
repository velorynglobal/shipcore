/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('company_id, role').eq('id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (profile.role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 });

    const { data, error } = await supabase
      .from('users')
      .select('id, full_name, email, role, created_at')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ data: data || [], error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
