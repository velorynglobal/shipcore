/* eslint-disable @typescript-eslint/no-explicit-any */
import { createServerSupabaseClient } from '@/lib/supabase-server';

type AiRouterOptions = {
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
};

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

    const res = await fetch(AI_ROUTER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      return {
        success: false,
        error: errorData.error || `AI Router failed with status ${res.status}`,
      };
    }

    const data = await res.json();
    return data as AiRouterResponse;
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
