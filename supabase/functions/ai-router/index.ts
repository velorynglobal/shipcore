// Follows Supabase Edge Function format
export async function handler(request: Request) {
  try {
    const { instruction, context } = await request.json();

    if (!instruction) {
      return new Response(JSON.stringify({ error: 'instruction is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Model fallback chain (same as API route)
    const MODEL_CHAIN = [
      { provider: 'anthropic', model: 'claude-3-7-sonnet-20250219', maxTokens: 4000 },
      { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', maxTokens: 4000 },
      { provider: 'anthropic', model: 'claude-3-haiku-20240307', maxTokens: 4000 },
      { provider: 'openai', model: 'gpt-4o-2024-11-20', maxTokens: 4000 },
      { provider: 'openai', model: 'gpt-4o-mini-2024-07-18', maxTokens: 4000 },
      { provider: 'openai', model: 'o1-mini', maxTokens: 65000 },
    ];

    let lastError: Error | null = null;

    for (const model of MODEL_CHAIN) {
      try {
        const prompt = `You are an AI agent in ShipCore ERP. Respond concisely and professionally.

Context: ${JSON.stringify(context || {})}

Instruction: ${instruction}

Response:`;

        let responseText = '';
        let usage: any = null;

        if (model.provider === 'anthropic') {
          const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
          if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: model.model,
              max_tokens: model.maxTokens,
              messages: [{ role: 'user', content: prompt }],
            }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error?.message || 'Anthropic API error');
          responseText = data.content?.[0]?.text || '';
          usage = data.usage;
        } else if (model.provider === 'openai') {
          const apiKey = Deno.env.get('OPENAI_API_KEY');
          if (!apiKey) throw new Error('OPENAI_API_KEY not set');

          const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: model.model,
              messages: [{ role: 'user', content: prompt }],
              max_tokens: model.maxTokens,
            }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.error?.message || 'OpenAI API error');
          responseText = data.choices?.[0]?.message?.content || '';
          usage = data.usage;
        }

        return new Response(JSON.stringify({
          success: true,
          model: model.model,
          provider: model.provider,
          response: responseText,
          usage,
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (err: any) {
        lastError = err;
        continue; // Try next model
      }
    }

    return new Response(JSON.stringify({
      error: 'All AI models failed',
      details: lastError?.message,
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/ai-router' \
//   --header 'Content-Type: application/json' \
//   --data '{"instruction":"Hello, who are you?"}'