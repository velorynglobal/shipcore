/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { requireRouteAccess } from '@/lib/route-auth';

const AGENT_KEY_PATTERN = /^[a-z0-9]+_agent$/;

function getExpectedAgentUrl(agentKey: string): string | null {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!supabaseUrl) return null;

  const origin = new URL(supabaseUrl).origin;
  const slug = agentKey.replace(/_/g, '-');
  return `${origin}/functions/v1/${slug}`;
}

export async function POST(request: Request) {
  try {
    const auth = await requireRouteAccess({ minimumRole: 'admin' });
    if (auth.errorResponse) return auth.errorResponse;

    const { url, agent_key } = await request.json();
    if (!url || !agent_key) return NextResponse.json({ error: 'agent_key and url are required' }, { status: 400 });
    if (!AGENT_KEY_PATTERN.test(agent_key)) {
      return NextResponse.json({ error: 'Invalid agent_key' }, { status: 400 });
    }

    const expectedUrl = getExpectedAgentUrl(agent_key);
    if (!expectedUrl) {
      return NextResponse.json({ error: 'Supabase URL is not configured' }, { status: 500 });
    }
    if (url !== expectedUrl) {
      return NextResponse.json({ error: 'URL is not allowed for this agent' }, { status: 400 });
    }

    const res = await fetch(expectedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: AbortSignal.timeout(10000),
    });
    const raw = await res.text();
    let data: unknown = {};
    try {
      data = raw ? JSON.parse(raw) : {};
    } catch {
      data = { raw };
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: 'Agent trigger failed', agent: agent_key, response: data },
        { status: res.status }
      );
    }

    return NextResponse.json({ success: true, agent: agent_key, response: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
