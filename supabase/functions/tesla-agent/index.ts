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

    // Call AI Router for daily logistics report
    const aiRouterUrl = `${supabaseUrl}/functions/v1/ai-router`;
    const reportRes = await fetch(aiRouterUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instruction: `Generate a daily logistics report for Tesla agent. Include:
- Active jobs count
- Total revenue this month
- Outstanding invoices
- Pending tasks
- Detention risk containers
- Any critical alerts

Format as a concise professional report with bullet points.`,
        context: { agent: 'tesla', type: 'daily_report', timestamp: new Date().toISOString() },
      }),
    });

    const reportData = await reportRes.json();
    if (!reportRes.ok) {
      throw new Error(reportData.error || `AI Router failed with status ${reportRes.status}`);
    }

    console.log('Tesla daily report generated:', reportData.response);

    // Log the report to ai_requests
    await supabase.from('ai_requests').insert({
      company_id: '00000000-0000-0000-0000-000000000000', // Placeholder
      user_id: '00000000-0000-0000-0000-000000000000', // Placeholder
      endpoint: '/functions/tesla-agent',
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
      report: reportData.response,
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
// curl -i --location --request POST 'http://localhost:54321/functions/v1/tesla-agent'