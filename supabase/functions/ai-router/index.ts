// ============================================================
// ShipCore AI Router — Smart model fallback chain
// Tries Gemini + Groq models in priority order, skips on rate limit
// Request contract: { prompt, system_prompt?, agent? }
// ============================================================

import { authorizeInternalRequest, jsonResponse } from '../_shared/runtime.ts';

const GEMINI_KEY    = Deno.env.get('GEMINI_API_KEY');
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY');
const OPENAI_KEY    = Deno.env.get('OPENAI_API_KEY');
const GROQ_KEY       = Deno.env.get('GROQ_API_KEY');
const MISTRAL_KEY   = Deno.env.get('MISTRAL_API_KEY');
const DEEPSEEK_KEY  = Deno.env.get('DEEPSEEK_API_KEY');

interface ModelConfig {
  id: string;
  name: string;
  provider: string;
  call: (prompt: string, systemPrompt?: string) => Promise<string>;
}

function isRateLimitError(status: number): boolean {
  return [429, 503, 529, 500, 502, 504].includes(status);
}

async function callGemini(model: string, key: string, prompt: string, systemPrompt?: string): Promise<string> {
  const contents = systemPrompt
    ? [{ role: 'user', parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }]
    : [{ role: 'user', parts: [{ text: prompt }] }];
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({ contents, generationConfig: { maxOutputTokens: 2048 } }) }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e: any = new Error(err.error?.message || `Gemini ${res.status}`);
    e.status = res.status; throw e;
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini: empty response');
  return text;
}

async function callAnthropic(model: string, key: string, prompt: string, systemPrompt?: string): Promise<string> {
  const body: Record<string, unknown> = { model, max_tokens: 2048, messages: [{ role: 'user', content: prompt }] };
  if (systemPrompt) body.system = systemPrompt;
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e: any = new Error(err.error?.message || `Anthropic ${res.status}`);
    e.status = res.status; throw e;
  }
  const data = await res.json();
  return data.content?.[0]?.text || '';
}

async function callOpenAI(model: string, key: string, prompt: string, systemPrompt?: string): Promise<string> {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model, messages, max_tokens: 2048 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e: any = new Error(err.error?.message || `OpenAI ${res.status}`);
    e.status = res.status; throw e;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callGroq(model: string, key: string, prompt: string, systemPrompt?: string): Promise<string> {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model, messages, max_tokens: 2048 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e: any = new Error(err.error?.message || `Groq ${res.status}`);
    e.status = res.status; throw e;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callMistral(model: string, key: string, prompt: string, systemPrompt?: string): Promise<string> {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });
  const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model, messages, max_tokens: 2048 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e: any = new Error(err.error?.message || `Mistral ${res.status}`);
    e.status = res.status; throw e;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

async function callDeepSeek(model: string, key: string, prompt: string, systemPrompt?: string): Promise<string> {
  const messages = [];
  if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
  messages.push({ role: 'user', content: prompt });
  const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
    body: JSON.stringify({ model, messages, max_tokens: 2048 }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const e: any = new Error(err.error?.message || `DeepSeek ${res.status}`);
    e.status = res.status; throw e;
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

function buildModelChain(): ModelConfig[] {
  const chain: ModelConfig[] = [];
  if (GEMINI_KEY) {
    const primaryGemini = Deno.env.get('GEMINI_MODEL') || 'gemini-3.7-flash';
    chain.push({ id: primaryGemini, name: 'Gemini Primary', provider: 'Google', call: (p, s) => callGemini(primaryGemini, GEMINI_KEY!, p, s) });
    chain.push({ id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', provider: 'Google', call: (p, s) => callGemini('gemini-2.5-flash', GEMINI_KEY!, p, s) });
  }
  if (GROQ_KEY) {
    const primaryGroq = Deno.env.get('GROQ_MODEL') || 'openai/gpt-oss-120b';
    chain.push({ id: primaryGroq, name: 'Groq Primary', provider: 'Groq', call: (p, s) => callGroq(primaryGroq, GROQ_KEY!, p, s) });
    chain.push({ id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', provider: 'Groq', call: (p, s) => callGroq('llama-3.3-70b-versatile', GROQ_KEY!, p, s) });
    chain.push({ id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B', provider: 'Groq', call: (p, s) => callGroq('llama-3.1-8b-instant', GROQ_KEY!, p, s) });
  }
  if (ANTHROPIC_KEY) {
    const anthropicModel = Deno.env.get('ANTHROPIC_MODEL') || 'claude-haiku-4-5-20251001';
    chain.push({ id: anthropicModel, name: 'Claude', provider: 'Anthropic', call: (p, s) => callAnthropic(anthropicModel, ANTHROPIC_KEY!, p, s) });
  }
  if (MISTRAL_KEY)   chain.push({ id: 'mistral-small-latest', name: 'Mistral Small', provider: 'Mistral', call: (p, s) => callMistral('mistral-small-latest', MISTRAL_KEY!, p, s) });
  if (OPENAI_KEY) {
    const openAIModel = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini';
    chain.push({ id: openAIModel, name: 'OpenAI', provider: 'OpenAI', call: (p, s) => callOpenAI(openAIModel, OPENAI_KEY!, p, s) });
  }
  if (DEEPSEEK_KEY)  chain.push({ id: 'deepseek-chat', name: 'DeepSeek Chat', provider: 'DeepSeek', call: (p, s) => callDeepSeek('deepseek-chat', DEEPSEEK_KEY!, p, s) });
  return chain;
}

export async function routeAI(prompt: string, systemPrompt?: string): Promise<{ text: string; model: string; provider: string; attempts: number }> {
  const chain = buildModelChain();
  if (chain.length === 0) {
    return { text: 'No AI keys configured.', model: 'none', provider: 'none', attempts: 0 };
  }
  let attempts = 0;
  const skipped: string[] = [];
  for (const model of chain) {
    attempts++;
    try {
      const text = await model.call(prompt, systemPrompt);
      if (text && text.trim()) return { text, model: model.id, provider: model.provider, attempts };
      skipped.push(`${model.name}:empty`);
    } catch (err: any) {
      const status = err?.status || 0;
      skipped.push(`${model.name}:${status || 'error'}`);
      continue;
    }
  }
  return { text: `AI temporarily unavailable. All ${chain.length} models failed.`, model: 'exhausted', provider: 'none', attempts };
}

Deno.serve(async (req: Request) => {
  if (req.method === 'GET') {
    const chain = buildModelChain();
    return new Response(JSON.stringify({
      status: 'ok',
      models_configured: chain.length,
      models: chain.map(m => ({ id: m.id, name: m.name, provider: m.provider })),
    }), { headers: { 'Content-Type': 'application/json' } });
  }

  const unauthorized = authorizeInternalRequest(req);
  if (unauthorized) return unauthorized;

  try {
    const body = await req.json();
    // Accept both contracts for backwards compatibility: {prompt, system_prompt} OR {instruction, context}
    const prompt = body.prompt || body.instruction;
    const systemPrompt = body.system_prompt || (body.context ? `Context: ${JSON.stringify(body.context)}` : undefined);
    const agent = body.agent;

    if (!prompt) return jsonResponse({ error: 'prompt required' }, 400);

    const result = await routeAI(prompt, systemPrompt);
    const status = result.model === 'exhausted' || result.model === 'none' ? 502 : 200;
    return jsonResponse({ ...result, response: result.text, agent }, status);
  } catch (err: any) {
    return jsonResponse({ error: err.message }, 500);
  }
});
