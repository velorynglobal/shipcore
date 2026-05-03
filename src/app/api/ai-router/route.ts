/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

type AgentRequest = {
  instruction: string;
  target_agent?: string;
  priority?: 'low' | 'medium' | 'high';
  context?: any;
};

// Model configuration with fallback chain
type ModelConfig = {
  provider: 'anthropic' | 'openai';
  model: string;
  maxTokens: number;
  apiKeyEnv: string;
};

const MODEL_CHAIN: ModelConfig[] = [
  // Anthropic models (Claude)
  { provider: 'anthropic', model: 'claude-3-7-sonnet-20250219', maxTokens: 4000, apiKeyEnv: 'ANTHROPIC_API_KEY' },
  { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022', maxTokens: 4000, apiKeyEnv: 'ANTHROPIC_API_KEY' },
  { provider: 'anthropic', model: 'claude-3-haiku-20240307', maxTokens: 4000, apiKeyEnv: 'ANTHROPIC_API_KEY' },
  // OpenAI models (GPT)
  { provider: 'openai', model: 'gpt-4o-2024-11-20', maxTokens: 4000, apiKeyEnv: 'OPENAI_API_KEY' },
  { provider: 'openai', model: 'gpt-4o-mini-2024-07-18', maxTokens: 4000, apiKeyEnv: 'OPENAI_API_KEY' },
  { provider: 'openai', model: 'o1-mini', maxTokens: 65000, apiKeyEnv: 'OPENAI_API_KEY' },
];

async function callAnthropic(model: ModelConfig, prompt: string): Promise<{ text: string; usage?: any }> {
  const apiKey = process.env[model.apiKeyEnv] as string | undefined;
  if (!apiKey) throw new Error(`${model.apiKeyEnv} not configured`);

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
  return { text: data.content?.[0]?.text || '', usage: data.usage };
}

async function callOpenAI(model: ModelConfig, prompt: string): Promise<{ text: string; usage?: any }> {
  const apiKey = process.env[model.apiKeyEnv] as string | undefined;
  if (!apiKey) throw new Error(`${model.apiKeyEnv} not configured`);

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
  return { text: data.choices?.[0]?.message?.content || '', usage: data.usage };
}

async function callModel(model: ModelConfig, prompt: string): Promise<{ text: string; usage?: any }> {
  switch (model.provider) {
    case 'anthropic':
      return callAnthropic(model, prompt);
    case 'openai':
      return callOpenAI(model, prompt);
    default:
      throw new Error('Unsupported provider');
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const body: AgentRequest = await request.json();
    if (!body.instruction) {
      return NextResponse.json({ error: 'instruction is required' }, { status: 400 });
    }

    // Log the request
    await supabase.from('ai_requests').insert({
      company_id: profile.company_id,
      user_id: user.id,
      endpoint: '/api/ai-router',
      provider: 'router',
      model: 'chain',
      status: 'success',
      latency_ms: 0,
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0,
    });

    // Try each model in chain until one succeeds
    let lastError: Error | null = null;
    for (const model of MODEL_CHAIN) {
      try {
        const start = Date.now();
        const prompt = `You are an AI agent in ShipCore ERP. Respond concisely and professionally.

Context: ${JSON.stringify(body.context || {})}

Instruction: ${body.instruction}

Response:`;
        const result = await callModel(model, prompt);
        const latency = Date.now() - start;

        // Log successful request
        await supabase.from('ai_requests').insert({
          company_id: profile.company_id,
          user_id: user.id,
          endpoint: '/api/ai-router',
          provider: model.provider,
          model: model.model,
          status: 'success',
          latency_ms: latency,
          input_tokens: result.usage?.prompt_tokens || 0,
          output_tokens: result.usage?.completion_tokens || 0,
          total_tokens: result.usage?.total_tokens || 0,
        });

        return NextResponse.json({
          success: true,
          model: model.model,
          provider: model.provider,
          response: result.text,
          latency_ms: latency,
        });
      } catch (err: any) {
        lastError = err;
        // Log failed attempt
        await supabase.from('ai_requests').insert({
          company_id: profile.company_id,
          user_id: user.id,
          endpoint: '/api/ai-router',
          provider: model.provider,
          model: model.model,
          status: 'error',
          latency_ms: 0,
          error_message: err.message,
        });
        continue; // Try next model
      }
    }

    // All models failed
    return NextResponse.json(
      { error: 'All AI models failed', details: lastError?.message },
      { status: 500 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
