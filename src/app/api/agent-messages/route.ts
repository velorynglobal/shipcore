/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { mockAgentMessages, isSupabaseConfigured } from '@/lib/mock-data';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  // Return mock data if Supabase is not configured
  if (!isSupabaseConfigured()) {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '30');
    return NextResponse.json({ data: mockAgentMessages.slice(0, limit) });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '30');
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await supabase
      .from('agent_messages')
      .select('id, from_agent, to_agent, subject, message_type, status, priority, created_at')
      .eq('company_id', profile.company_id)
      .gte('created_at', since)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return NextResponse.json({ data: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
