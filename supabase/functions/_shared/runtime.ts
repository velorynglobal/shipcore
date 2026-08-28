import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export interface AgentAuth {
  mode: 'user' | 'cron';
  companyId: string | null;
  userId: string | null;
}

export interface ReportingAgentConfig {
  key: string;
  name: string;
  systemPrompt: string;
  defaultInstruction: string;
}

const JSON_HEADERS = { 'Content-Type': 'application/json' };

export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

export async function authorizeAgentRequest(request: Request): Promise<AgentAuth | Response> {
  const cronSecret = Deno.env.get('AGENT_CRON_SECRET');
  const suppliedCronSecret = request.headers.get('x-agent-cron-secret');

  if (cronSecret && suppliedCronSecret === cronSecret) {
    return { mode: 'cron', companyId: null, userId: null };
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const authorization = request.headers.get('Authorization');

  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: 'Agent authentication is not configured' }, 503);
  }

  if (!authorization?.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const authClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: { user }, error: userError } = await authClient.auth.getUser();

  if (userError || !user) return jsonResponse({ error: 'Unauthorized' }, 401);

  const { data: profile, error: profileError } = await authClient
    .from('users')
    .select('company_id, role, is_active')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.company_id || profile.is_active === false) {
    return jsonResponse({ error: 'Active user profile not found' }, 403);
  }

  if (!['admin', 'operator'].includes(profile.role)) {
    return jsonResponse({ error: 'Insufficient permissions' }, 403);
  }

  return { mode: 'user', companyId: profile.company_id, userId: user.id };
}

export function authorizeInternalRequest(request: Request): Response | null {
  const expected = Deno.env.get('AGENT_INTERNAL_SECRET');
  const supplied = request.headers.get('x-agent-internal-secret');

  if (!expected) return jsonResponse({ error: 'Internal AI routing is not configured' }, 503);
  if (supplied !== expected) return jsonResponse({ error: 'Unauthorized' }, 401);
  return null;
}

export async function getAuthorizedCompanies(client: SupabaseClient, auth: AgentAuth) {
  let query = client.from('companies').select('id, name').eq('is_active', true);
  if (auth.companyId) query = query.eq('id', auth.companyId);

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

export async function callAgentRouter(
  prompt: string,
  systemPrompt: string,
  agentKey: string,
): Promise<{ text: string; model: string; provider: string }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const internalSecret = Deno.env.get('AGENT_INTERNAL_SECRET');
  if (!supabaseUrl || !internalSecret) throw new Error('AI router is not configured');

  const response = await fetch(`${supabaseUrl}/functions/v1/ai-router`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-agent-internal-secret': internalSecret,
    },
    body: JSON.stringify({ prompt, system_prompt: systemPrompt, agent: agentKey }),
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok || data.model === 'exhausted' || !data.text) {
    throw new Error(data.error || data.text || `AI router returned HTTP ${response.status}`);
  }

  return { text: data.text, model: data.model, provider: data.provider };
}

function countBy(items: Array<Record<string, unknown>>, key: string) {
  return items.reduce<Record<string, number>>((counts, item) => {
    const value = String(item[key] ?? 'unknown');
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

export async function runReportingAgent(request: Request, config: ReportingAgentConfig) {
  const startedAt = Date.now();
  const auth = await authorizeAgentRequest(request);
  if (auth instanceof Response) return auth;

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: 'Agent database access is not configured' }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const body = request.method === 'POST' ? await request.json().catch(() => ({})) : {};
  const instruction = typeof body.instruction === 'string' && body.instruction.trim()
    ? body.instruction.trim()
    : config.defaultInstruction;

  try {
    const companies = await getAuthorizedCompanies(admin, auth);
    if (!companies.length) return jsonResponse({ error: 'No authorized companies found' }, 404);

    const results = [];
    let failures = 0;

    for (const company of companies) {
      try {
        const [jobsResult, invoicesResult, tasksResult, logsResult, proposalsResult] = await Promise.all([
          admin.from('jobs').select('status, job_type, profit, eta').eq('company_id', company.id).limit(250),
          admin.from('invoices').select('status, total_amount, due_date').eq('company_id', company.id).limit(250),
          admin.from('tasks').select('status, priority, title').eq('company_id', company.id).limit(250),
          admin.from('agent_logs').select('agent_id, status, summary, started_at').eq('company_id', company.id).order('started_at', { ascending: false }).limit(30),
          admin.from('feature_proposals').select('status, feature_name, impact_score, priority_score').eq('company_id', company.id).limit(50),
        ]);

        const queryError = [jobsResult, invoicesResult, tasksResult, logsResult, proposalsResult]
          .map((result) => result.error)
          .find(Boolean);
        if (queryError) throw new Error(queryError.message);

        const jobs = jobsResult.data ?? [];
        const invoices = invoicesResult.data ?? [];
        const tasks = tasksResult.data ?? [];
        const snapshot = {
          company: company.name,
          jobs_by_status: countBy(jobs, 'status'),
          invoices_by_status: countBy(invoices, 'status'),
          invoice_total: invoices.reduce((sum, invoice) => sum + Number(invoice.total_amount ?? 0), 0),
          tasks_by_status: countBy(tasks, 'status'),
          critical_tasks: tasks.filter((task) => task.priority === 'critical').slice(0, 10),
          recent_agent_logs: logsResult.data ?? [],
          feature_proposals: proposalsResult.data ?? [],
          generated_at: new Date().toISOString(),
        };

        const ai = await callAgentRouter(
          `${instruction}\n\nCompany operational snapshot:\n${JSON.stringify(snapshot)}`,
          config.systemPrompt,
          config.key,
        );

        await admin.from('ai_agents').update({
          status: 'active',
          last_run_at: new Date().toISOString(),
        }).eq('company_id', company.id).eq('agent_key', config.key);

        await admin.from('agent_logs').insert({
          company_id: company.id,
          agent_id: config.key,
          status: 'completed',
          summary: `${config.name} completed using ${ai.model}.`,
          duration_ms: Date.now() - startedAt,
          completed_at: new Date().toISOString(),
          details: { response: ai.text, model: ai.model, provider: ai.provider, trigger: auth.mode },
        });

        results.push({ company_id: company.id, company: company.name, response: ai.text, ...ai });
      } catch (error) {
        failures += 1;
        const message = error instanceof Error ? error.message : 'Agent execution failed';
        await admin.from('ai_agents').update({ status: 'error' })
          .eq('company_id', company.id).eq('agent_key', config.key);
        await admin.from('agent_logs').insert({
          company_id: company.id,
          agent_id: config.key,
          status: 'failed',
          summary: `${config.name}: ${message}`,
          duration_ms: Date.now() - startedAt,
          completed_at: new Date().toISOString(),
          error_message: message,
          details: { error: message, trigger: auth.mode },
        });
        results.push({ company_id: company.id, company: company.name, error: message });
      }
    }

    if (failures === results.length) {
      return jsonResponse({ success: false, agent: config.name, results }, 502);
    }

    return jsonResponse({ success: failures === 0, agent: config.name, results }, failures ? 207 : 200);
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : 'Agent execution failed' }, 500);
  }
}
