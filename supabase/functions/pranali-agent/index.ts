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

    // Call AI Router for tax compliance calendar
    const aiRouterUrl = `${supabaseUrl}/functions/v1/ai-router`;
    const taxRes = await fetch(aiRouterUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instruction: `Generate a tax compliance calendar for Pranali agent. Include:
- GSTR-3B due dates
- GSTR-1 due dates
- TDS due dates
- Advance Tax due dates
- PF/ESIC due dates
- ITR due dates
- Any pending filings
- Upcoming deadlines in next 30 days

Format as a concise professional report with bullet points and dates.`,
        context: { agent: 'pranali', type: 'tax_compliance_calendar', timestamp: new Date().toISOString() },
      }),
    });

    const taxData = await taxRes.json();
    if (!taxRes.ok) {
      throw new Error(taxData.error || `AI Router failed with status ${taxRes.status}`);
    }

    console.log('Pranali tax compliance calendar generated:', taxData.response);

    // Log the report
    await supabase.from('ai_requests').insert({
      company_id: '00000000-0000-0000-0000-000000000000',
      user_id: '00000000-0000-0000-0000-000000000000',
      endpoint: '/functions/pranali-agent',
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
      calendar: taxData.response,
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
// curl -i --location --request POST 'http://localhost:54321/functions/v1/pranali-agent'