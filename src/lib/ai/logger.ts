import { createServerSupabaseClient } from '@/lib/supabase-server';

interface LogAiRequestParams {
  company_id: string;
  user_id: string;
  endpoint: string;
  provider: string;
  model: string;
  status: 'success' | 'error';
  latency_ms: number;
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
  error_message?: string | null;
}

export async function logAiRequest(params: LogAiRequestParams): Promise<void> {
  try {
    const supabase = createServerSupabaseClient();
    await supabase.from('ai_requests').insert(params);
  } catch {
    // Logging must not break endpoint responses.
  }
}
