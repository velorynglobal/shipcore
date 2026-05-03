import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

interface MarketplaceAgent {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  rating: number;
  installs: number;
  tags: string[];
  installed: boolean;
}

// Mock marketplace agents (replace with real DB table later)
const MOCK_AGENTS: MarketplaceAgent[] = [
  {
    id: 'agent-weather',
    name: 'Weather Agent',
    description: 'Provides weather forecasts for shipping routes',
    version: '1.0.0',
    author: 'ShipCore Team',
    rating: 4.5,
    installs: 120,
    tags: ['weather', 'routing'],
    installed: false,
  },
  {
    id: 'agent-compliance',
    name: 'Compliance Agent',
    description: 'Automated compliance checks for customs',
    version: '2.1.0',
    author: 'ShipCore Team',
    rating: 4.8,
    installs: 85,
    tags: ['compliance', 'customs'],
    installed: false,
  },
  {
    id: 'agent-analytics',
    name: 'Analytics Agent',
    description: 'Advanced analytics and forecasting',
    version: '1.5.0',
    author: 'Third Party Dev',
    rating: 4.2,
    installs: 45,
    tags: ['analytics', 'reporting'],
    installed: false,
  },
];

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // In real implementation, fetch from marketplace_agents table
    // For now, return mock data with installed status from user's company
    const { data: installedAgents } = await supabase
      .from('ai_agents')
      .select('agent_key')
      .eq('company_id', (await supabase.from('users').select('company_id').eq('id', user.id).single()).data?.company_id || '');

    const installedKeys = (installedAgents || []).map(a => a.agent_key);
    const agents = MOCK_AGENTS.map(a => ({
      ...a,
      installed: installedKeys.includes(a.id),
    }));

    return NextResponse.json({ agents });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// Install an agent
export async function POST(request: Request) {
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
    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { agent_id } = await request.json();
    if (!agent_id) {
      return NextResponse.json({ error: 'agent_id required' }, { status: 400 });
    }

    // In real implementation, copy agent from marketplace to company's ai_agents
    // For now, just log the installation
    await supabase.from('agent_messages').insert({
      company_id: profile.company_id,
      from_agent: 'system',
      to_agent: 'admin',
      message_type: 'notification',
      subject: `Agent installed: ${agent_id}`,
      payload: { agent_id, installed_by: user.id },
      status: 'completed',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, message: `Agent ${agent_id} installed successfully` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
