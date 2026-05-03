/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { callAiRouterWithRetry } from '@/lib/ai/router';
import { agentInstructLimiter } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // Apply rate limiting
    const { limited, remaining, resetTime } = await agentInstructLimiter(request);
    if (limited) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.' },
        { 
          status: 429,
          headers: {
            'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Remaining': '0',
          }
        }
      );
    }

    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users').select('company_id, role').eq('id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const { instruction, target_agent, priority } = await request.json();
    if (!instruction || !target_agent)
      return NextResponse.json({ error: 'instruction and target_agent required' }, { status: 400 });

    // Look up both agent UUIDs — required for NOT NULL FK columns
    const { data: agentRows } = await supabase
      .from('ai_agents')
      .select('id, agent_key')
      .eq('company_id', profile.company_id)
      .in('agent_key', ['ajit_agent', target_agent]);

    const fromAgent = agentRows?.find((a: any) => a.agent_key === 'ajit_agent');
    const toAgent   = agentRows?.find((a: any) => a.agent_key === target_agent);

    if (!fromAgent) return NextResponse.json({ error: 'Ajit agent not found' }, { status: 404 });
    if (!toAgent)   return NextResponse.json({ error: `Agent ${target_agent} not found` }, { status: 404 });

    const basePayload = { instruction, from: 'md_dashboard', timestamp: new Date().toISOString() };
    const { data, error } = await supabase
      .from('agent_messages')
      .insert({
        company_id:    profile.company_id,
        from_agent:    'ajit_agent',
        to_agent:      target_agent,
        from_agent_id: fromAgent.id,
        to_agent_id:   toAgent.id,
        message_type:  'task',
        priority:      priority || 'high',
        subject:       instruction.slice(0, 100),
        payload:       basePayload,
        status:        'pending',
        created_by:    user.id,
      })
      .select('id')
      .single();

    if (error) throw error;

    // Send instruction to Ajit agent via AI Router (7-model fallback chain)
    const aiResult = await callAiRouterWithRetry({
      instruction: `Forward this instruction to ${target_agent}: ${instruction}`,
      context: { from_agent: 'ajit_agent', target_agent, priority: priority || 'high' },
      modelHint: 'claude', // Prefer Claude models for logistics tasks
    });

    // Optionally update message status based on AI result
    const updatedPayload = aiResult.success && aiResult.response
      ? { ...basePayload, ai_response: aiResult.response, model: aiResult.model }
      : { ...basePayload, error: aiResult.error };

    await supabase
      .from('agent_messages')
      .update({ status: aiResult.success ? 'completed' : 'failed', payload: updatedPayload })
      .eq('id', data.id);

    return NextResponse.json({ success: true, message_id: data.id, ai_model: aiResult.model });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
