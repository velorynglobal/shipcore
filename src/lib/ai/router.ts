/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerSupabaseClient } from '@/lib/supabase-server';

export type AiRouterOptions = {
  instruction: string;
  context?: any;
  modelHint?: string; // Optional: prefer a model
};

type AiRouterResponse = {
  success: boolean;
  model?: string;
  provider?: string;
  response?: string;
  usage?: any;
  error?: string;
  cached?: boolean;
};

// Simple in-memory cache (per server instance)
const responseCache = new Map<string, { response: AiRouterResponse; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(options: AiRouterOptions): string {
  return JSON.stringify({ instruction: options.instruction, context: options.context, modelHint: options.modelHint });
}

function getCached(key: string): AiRouterResponse | null {
  const cached = responseCache.get(key);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
    return { ...cached.response, cached: true };
  }
  responseCache.delete(key);
  return null;
}

function setCache(key: string, response: AiRouterResponse): void {
  responseCache.set(key, { response, timestamp: Date.now() });
  // Clean up old entries
  if (responseCache.size > 100) {
    const entries = [...responseCache.entries()];
    entries.slice(0, 50).forEach(([k]) => responseCache.delete(k));
  }
}

const AI_ROUTER_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/ai-router`
  : 'http://localhost:54321/functions/v1/ai-router';

/**
 * Call the AI Router Edge Function with fallback chain
 * @param options.instruction - The instruction to send to AI
 * @param options.context - Optional context for the AI
 * @param options.modelHint - Optional model preference (e.g., 'claude', 'gpt')
 * @returns AiRouterResponse with AI output or error
 */
export async function callAiRouter(options: AiRouterOptions): Promise<AiRouterResponse> {
  try {
    // Check cache first
    const cacheKey = getCacheKey(options);
    const cached = getCached(cacheKey);
    if (cached) return cached;

    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: 'Unauthorized' };

    const { data: profile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();
    if (!profile) return { success: false, error: 'Profile not found' };

    const payload = {
      instruction: options.instruction,
      context: options.context,
      modelHint: options.modelHint,
    };

    const startTime = Date.now();
    const res = await fetch(AI_ROUTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const latency = Date.now() - startTime;

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `AI Router failed with status ${res.status}`,
      };
    }

    const data = await res.json() as AiRouterResponse;
    
    // Log the request to ai_requests table
    try {
      await supabase.from('ai_requests').insert({
        company_id: profile.company_id,
        user_id: user.id,
        endpoint: '/api/ai-router',
        provider: data.provider || 'router',
        model: data.model || 'unknown',
        status: 'success',
        latency_ms: latency,
        input_tokens: data.usage?.input_tokens || 0,
        output_tokens: data.usage?.output_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0,
      });
    } catch {
      // Ignore logging errors so API responses are not affected.
    }

    // Cache successful responses
    if (data.success) {
      setCache(cacheKey, data);
    }

    return data;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Call AI Router with automatic retry on failure
 * @param options - Same as callAiRouter
 * @param retries - Number of retries (default: 1)
 */
export async function callAiRouterWithRetry(
  options: AiRouterOptions,
  retries = 1
): Promise<AiRouterResponse> {
  let lastError: Error | null = null;

  for (let i = 0; i <= retries; i++) {
    const result = await callAiRouter(options);
    if (result.success) return result;
    lastError = new Error(result.error);
  }

  return { success: false, error: lastError?.message || 'Unknown error' };
}

// Example usage:
// const result = await callAiRouter({ instruction: 'Analyze this shipment', context: { job_id: '123' } });
// if (result.success) console.log(result.response);
