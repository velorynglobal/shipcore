import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  try {
    const { instruction, target_agent, priority } = await req.json();
    if (!instruction) {
      return new Response(JSON.stringify({ error: 'instruction is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    if (!supabaseUrl || !supabaseKey) {
      return new Response(JSON.stringify({ error: 'Supabase environment variables not set' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Call AI Router Edge Function
    const aiRouterUrl = `${supabaseUrl}/functions/v1/ai-router`;
    const aiRes = await fetch(aiRouterUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instruction: `You are Ajit, a logistics AI agent. Forward this instruction to ${target_agent}:

${instruction}

Context: { target_agent: "${target_agent}", priority: "${priority || 'high'}" }`,
        context: { agent: 'ajit', target_agent, priority: priority || 'high' },
      }),
    });

    const aiData = await aiRes.json();
    if (!aiRes.ok) {
      throw new Error(aiData.error || `AI Router failed with status ${aiRes.status}`);
    }

    // Log the response to agent_messages
    const { data: userData } = await supabase
      .from('users')
      .select('id, company_id')
      .eq('email', 'ai@veloryn.com')
      .maybeSingle();

    const userId = userData?.id || null;
    const companyId = userData?.company_id || null;

    if (companyId && userId) {
      await supabase.from('agent_messages').insert({
        company_id: companyId,
        from_agent: 'ajit_agent',
        to_agent: target_agent,
        from_agent_id: '00000000-0000-0000-0000-000000000000', // Placeholder
        to_agent_id: '00000000-0000-0000-0000-000000000000', // Placeholder
        message_type: 'task',
        priority: priority || 'high',
        subject: `Instruction to ${target_agent}`,
        payload: { instruction, ai_response: aiData.response, model: aiData.model },
        status: 'completed',
        created_by: userId,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      response: aiData.response,
      model: aiData.model,
      provider: aiData.provider,
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
// curl -i --location --request POST 'http://localhost:54321/functions/v1/ajit-agent' \
//   --header 'Content-Type: application/json' \
//   --data '{"instruction":"Hello, who are you?","target_agent":"german_agent"}'