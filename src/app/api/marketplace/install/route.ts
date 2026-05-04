import { NextResponse } from 'next/server';
import { pdfLimiter } from '@/lib/rate-limit';

// Mock agent installation logic
const installedAgents = new Set<string>();

// POST /api/marketplace/install
// Body: { agent_id: string }
export async function POST(request: Request) {
  try {
    // Rate limit this endpoint to prevent abuse
    const result = await pdfLimiter(request);
    if (result.limited) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
    }

    const { agent_id } = await request.json();

    if (!agent_id || typeof agent_id !== 'string') {
      return NextResponse.json({ error: 'agent_id is required' }, { status: 400 });
    }

    // Simulate installation
    installedAgents.add(agent_id);

    return NextResponse.json({ success: 'Agent installed', agent_id });
  } catch (error) {
    console.error('Install failed:', error);
    return NextResponse.json({ error: 'Install failed' }, { status: 500 });
  }
}

// GET /api/marketplace/install (optional health check)
export async function GET() {
  return NextResponse.json({ installedAgents: Array.from(installedAgents) });
}

export const dynamic = 'force-dynamic';