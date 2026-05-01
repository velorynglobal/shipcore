/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export const maxDuration = 30; // Allow 30s for cold starts

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Allow admin or operator to trigger agents
    const { data: profile } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (!['admin', 'operator'].includes(profile.role || '')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const { url, agent_key } = await request.json();
    if (!url) return NextResponse.json({ error: 'URL required' }, { status: 400 });

    // Call edge function with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000); // 25s timeout

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      // Don't fail if response isn't JSON
      const data = await res.json().catch(() => ({ status: res.status }));
      
      // Log the trigger in agent_messages
      await supabase.from('agent_messages').insert({
        company_id: profile.company_id,
        from_agent: 'ajit_agent',
        to_agent: agent_key,
        message_type: 'task',
        priority: 'high',
        subject: `Manual trigger from dashboard`,
        payload: { triggered_by: user.id, timestamp: new Date().toISOString() },
        status: 'processed',
      }).single();

      return NextResponse.json({
        success: true,
        agent: agent_key,
        response: data,
      });

    } catch (fetchErr: any) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        // Timeout — but agent may still be running
        return NextResponse.json({
          success: true,
          agent: agent_key,
          note: 'Agent triggered — running in background (took >25s)',
        });
      }
      throw fetchErr;
    }

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
