import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
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

    // Call AI Router for Andrew agent tasks (Quote PDF generation, etc.)
    const aiRouterUrl = `${supabaseUrl}/functions/v1/ai-router`;
    const taskRes = await fetch(aiRouterUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instruction: `You are Andrew, a quote and document specialist. Generate a branded quote PDF, enable download and email to customer.`,
        context: { agent: 'andrew', type: 'quote_generation', timestamp: new Date().toISOString() },
      }),
    });

    const taskData = await taskRes.json();
    if (!taskRes.ok) {
      throw new Error(taskData.error || `AI Router failed with status ${taskRes.status}`);
    }

    console.log('Andrew agent task completed:', taskData.response);

    return new Response(JSON.stringify({
      success: true,
      response: taskData.response,
      model: taskData.model,
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
// curl -i --location --request POST 'http://localhost:54321/functions/v1/andrew-agent'