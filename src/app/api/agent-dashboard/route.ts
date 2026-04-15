/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'agents';

    let data: any[] = [];

    if (type === 'agents') {
      const { data: d } = await supabase.from('ai_agents').select('*').order('agent_type');
      data = d || [];
    } else if (type === 'logs') {
      const { data: d } = await supabase.from('agent_logs').select('*')
        .order('started_at', { ascending: false }).limit(100);
      data = d || [];
    } else if (type === 'messages') {
      const { data: d } = await supabase.from('agent_messages').select('*')
        .order('created_at', { ascending: false }).limit(50);
      data = d || [];
    } else if (type === 'proposals') {
      const { data: d } = await supabase.from('feature_proposals').select('*')
        .order('priority_score', { ascending: false }).limit(20);
      data = d || [];
    } else if (type === 'tasks') {
      const { data: d } = await supabase.from('tasks').select('*')
        .eq('status', 'pending').order('due_date', { ascending: true }).limit(50);
      data = d || [];
    }

    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
