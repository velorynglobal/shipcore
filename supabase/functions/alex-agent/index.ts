import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async () => {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Supabase environment variables not set' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Call AI Router for weekly AI agent network monitoring
    const aiRouterUrl = `${supabaseUrl}/functions/v1/ai-router`;
    const monitorRes = await fetch(aiRouterUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instruction: `Perform weekly monitoring of the AI agent network for Alex agent. Include:
- Agent availability status (12 agents)
- Recent activity from each agent
- Error rates and issues
- Performance metrics
- Agent health checks
- Recommendations for improvements
- Upcoming maintenance windows

Format as a comprehensive weekly report with tables and recommendations.`,
        context: { agent: 'alex', type: 'weekly_monitoring', timestamp: new Date().toISOString() },
      }),
    });

    const monitorData = await monitorRes.json();
    if (!monitorRes.ok) {
      throw new Error(monitorData.error || `AI Router failed with status ${monitorRes.status}`);
    }

    console.log('Alex weekly AI agent network monitoring generated:', monitorData.response);

    // Log the monitoring report
    await supabase.from('ai_requests').insert({
      company_id: '00000000-0000-0000-0000-000000000000',
      user_id: '00000000-0000-0000-0000-000000000000',
      endpoint: '/functions/alex-agent',
      provider: 'router',
      model: 'chain',
      status: 'success',
      latency_ms: 0,
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
    });

    return new Response(JSON.stringify({
      success: true,
      monitoring_report: monitorData.response,
      generated_at: new Date().toISOString(),
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

// To test locally:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/alex-agent'