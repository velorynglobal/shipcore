/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { mockAgentDashboard, isSupabaseConfigured } from '@/lib/mock-data';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  // Return mock data if Supabase is not configured
  if (!isSupabaseConfigured()) {
    return NextResponse.json(mockAgentDashboard);
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // Fetch all 12 agents
    const { data: agents, error } = await supabase
      .from('ai_agents')
      .select('agent_key, display_name, agent_domain, agent_class, status, last_run_at, run_count, error_count, permissions, can_approve')
      .eq('company_id', profile.company_id)
      .order('display_name', { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      agents: agents ?? [],
      total: agents?.length ?? 0,
      error: null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
