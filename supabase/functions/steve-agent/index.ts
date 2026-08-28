import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { authorizeAgentRequest, callAgentRouter, getAuthorizedCompanies } from '../_shared/runtime.ts';

const supabase   = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
const AGENT_KEY  = 'steve_agent';
const AGENT_NAME = 'Steve';
const ROUTER_URL = `${Deno.env.get('SUPABASE_URL')}/functions/v1/ai-router`;
const ROUTER_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

async function callAI(prompt: string, systemPrompt?: string): Promise<{ text: string; model: string }> {
  try {
    return await callAgentRouter(prompt, systemPrompt || '', AGENT_KEY);
  } catch {
    return { text: '', model: 'error' };
  }
}

Deno.serve(async (req: Request) => {
  const auth = await authorizeAgentRequest(req);
  if (auth instanceof Response) return auth;
  const startTime = Date.now();
  const companies = await getAuthorizedCompanies(supabase, auth);
  if (!companies?.length) return new Response(JSON.stringify({ message: 'No companies' }));

  const processed: any[] = [];

  for (const company of companies) {
    await supabase.from('ai_agents').update({ last_run_at: new Date().toISOString() }).eq('company_id', company.id).eq('agent_key', AGENT_KEY);

    const { data: messages } = await supabase.from('agent_messages')
      .select('*').eq('company_id', company.id)
      .eq('to_agent', AGENT_KEY).eq('message_type', 'feature_proposal').eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (!messages?.length) continue;

    for (const msg of messages) {
      const payload = msg.payload as Record<string, unknown>;

      const systemPrompt = `You are Steve, Developer Agent for ShipCore Pro (Next.js 14 + Supabase + TypeScript). You design practical implementation plans for logistics ERP features. Be specific about file paths, SQL, and component names.`;
      const prompt = `Design implementation plan for:
- Feature: ${payload.feature_name}
- Problem: ${payload.business_problem}
- Impact: ${payload.business_impact}
- Complexity: ${payload.complexity} | Effort: ${payload.effort_days} days
- Affected agents: ${JSON.stringify(payload.affected_agents)}

Include: Database changes (SQL), API routes (Next.js paths), UI components (file paths), Agent updates, Ordered steps, Effort estimate.`;

      const { text: plan, model } = await callAI(prompt, systemPrompt);
      console.log(`[Steve] Used model: ${model} for ${payload.feature_name}`);

      const fallbackPlan = `## Feature: ${payload.feature_name}\n### Problem\n${payload.business_problem}\n### Implementation\n1. Database schema changes\n2. API routes\n3. UI components\n4. Agent updates\n### Effort: ${payload.effort_days} days`;

      if (payload.proposal_id) {
        await supabase.from('feature_proposals').update({
          implementation_plan: plan || fallbackPlan, status: 'under_review',
          reviewed_by: AGENT_KEY, reviewed_at: new Date().toISOString(),
        }).eq('id', payload.proposal_id);
      }

      // Broadcast to all named agents
      const allAgents = ['tesla_agent','alex_agent','ganesh_agent','pranali_agent','komal_agent','dipika_agent','german_agent','andrew_agent','aslesha_agent','ajit_agent'];
      for (const agentKey of allAgents) {
        await supabase.from('agent_messages').insert({
          company_id: company.id, from_agent: AGENT_KEY, to_agent: agentKey,
          message_type: 'broadcast', priority: 'medium',
          subject: `Steve: Plan ready — ${payload.feature_name} (via ${model})`,
          payload: { proposal_number: payload.proposal_number, feature: payload.feature_name, plan_summary: (plan || fallbackPlan).slice(0, 300), model },
          status: 'pending',
        });
      }

      await supabase.from('agent_messages').update({ status: 'processed', processed_at: new Date().toISOString() }).eq('id', msg.id);
      processed.push({ proposal: payload.proposal_number, feature: payload.feature_name, model });
    }

    await supabase.from('agent_logs').insert({
      company_id: company.id, agent_id: AGENT_KEY, status: 'completed',
      summary: `Steve: ${messages.length} proposals processed via AI Router.`,
      details: { processed }, completed_at: new Date().toISOString(), duration_ms: Date.now() - startTime,
    });
  }

  return new Response(JSON.stringify({ success: true, agent: AGENT_NAME, processed }), { headers: { 'Content-Type': 'application/json' } });
});
