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

    // Call AI Router for evening operations summary
    const aiRouterUrl = `${supabaseUrl}/functions/v1/ai-router`;
    const opsRes = await fetch(aiRouterUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instruction: `Generate an evening operations summary for Ganesh agent. Include:
- Jobs completed today
- Jobs in transit
- Jobs at customs
- Jobs delivered
- Pending invoices
- Overdue invoices
- Tasks completed
- Tasks pending
- Detention risk containers
- Any critical alerts or issues

Format as a concise professional report with bullet points and counts.`,
        context: { agent: 'ganesh', type: 'evening_summary', timestamp: new Date().toISOString() },
      }),
    });

    const opsData = await opsRes.json();
    if (!opsRes.ok) {
      throw new Error(opsData.error || `AI Router failed with status ${opsRes.status}`);
    }

    console.log('Ganesh evening operations summary generated:', opsData.response);

    // Log the report
    await supabase.from('ai_requests').insert({
      company_id: '00000000-0000-0000-0000-000000000000',
      user_id: '00000000-0000-0000-0000-000000000000',
      endpoint: '/functions/ganesh-agent',
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
      summary: opsData.response,
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
// curl -i --location --request POST 'http://localhost:54321/functions/v1/ganesh-agent'