/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { AGENT_SLUGS } from '@/lib/agent-definitions';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return NextResponse.json({ error: 'Session expired' }, { status: 401 });

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

    const { agent_key } = await request.json();
    if (typeof agent_key !== 'string' || !AGENT_SLUGS[agent_key]) {
      return NextResponse.json({ error: 'Unknown agent' }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json({ error: 'Agent runtime is not configured' }, { status: 503 });
    }

    const url = `${supabaseUrl}/functions/v1/${AGENT_SLUGS[agent_key]}`;

    // Call edge function with timeout
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 55000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: supabaseAnonKey,
        },
        body: JSON.stringify({
          context: {
            triggered_by: user.id,
            company_id: profile.company_id,
            source: 'agent_dashboard',
          },
        }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      const data = await res.json().catch(() => ({ status: res.status }));
      const succeeded = res.ok && data?.success !== false;

      await supabase.from('agent_messages').insert({
        company_id: profile.company_id,
        from_agent: 'ajit_agent',
        to_agent: agent_key,
        message_type: 'task',
        priority: 'high',
        subject: `Manual trigger from dashboard`,
        payload: {
          triggered_by: user.id,
          timestamp: new Date().toISOString(),
          response: data,
          http_status: res.status,
        },
        status: succeeded ? 'processed' : 'failed',
      });

      if (!succeeded) {
        return NextResponse.json({
          success: false,
          agent: agent_key,
          error: data?.error || data?.response || `Agent returned HTTP ${res.status}`,
        }, { status: 502 });
      }

      return NextResponse.json({
        success: true,
        agent: agent_key,
        response: data,
      });

    } catch (fetchErr: any) {
      clearTimeout(timeout);
      if (fetchErr.name === 'AbortError') {
        return NextResponse.json({
          success: false,
          agent: agent_key,
          error: 'Agent timed out after 55 seconds',
        }, { status: 504 });
      }
      throw fetchErr;
    }

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
