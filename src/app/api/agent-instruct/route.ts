/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: profile } = await supabase.from('users').select('company_id, role').eq('id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const { instruction, target_agent, priority } = await request.json();
    if (!instruction || !target_agent) return NextResponse.json({ error: 'instruction and target_agent required' }, { status: 400 });

    const { data, error } = await supabase.from('agent_messages').insert({
      company_id: profile.company_id,
      from_agent: 'ajit_agent',
      to_agent: target_agent,
      message_type: 'task',
      priority: priority || 'high',
      subject: instruction.slice(0, 100),
      payload: { instruction, from: 'md_dashboard', timestamp: new Date().toISOString() },
      status: 'pending',
    }).select().single();

    if (error) throw error;

    // Also trigger ajit-agent to forward the instruction
    const ajitUrl = 'https://wceiurzrlrcahviywlky.supabase.co/functions/v1/ajit-agent';
    fetch(ajitUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instruction, target_agent, priority }),
    }).catch(() => {});

    return NextResponse.json({ success: true, message_id: data.id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
