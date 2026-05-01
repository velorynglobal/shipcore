/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { aiService, jobDraftInputSchema } from '@/lib/ai';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { logAiRequest } from '@/lib/ai/logger';

export async function POST(request: Request) {
  const startedAt = Date.now();
  let companyId = '';
  let userId = '';

  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    userId = user.id;

    const { data: profile } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    companyId = profile.company_id;

    const body = await request.json();
    const parsed = jobDraftInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input payload' },
        { status: 400 }
      );
    }

    const result = await aiService.generateJobDraft(parsed.data);

    await logAiRequest({
      company_id: companyId,
      user_id: userId,
      endpoint: '/api/ai/jobs/draft',
      provider: result.provider,
      model: result.model,
      status: 'success',
      latency_ms: Date.now() - startedAt,
      input_tokens: result.usage?.input_tokens,
      output_tokens: result.usage?.output_tokens,
      total_tokens: result.usage?.total_tokens,
      error_message: null,
    });

    return NextResponse.json({
      data: {
        draft: result.output,
        model: result.model,
        provider: result.provider,
        usage: result.usage || null,
      },
      error: null,
    });
  } catch (err: any) {
    await logAiRequest({
      company_id: companyId,
      user_id: userId,
      endpoint: '/api/ai/jobs/draft',
      provider: 'anthropic',
      model: process.env.AI_DEFAULT_MODEL || 'claude-haiku-4-5-20251001',
      status: 'error',
      latency_ms: Date.now() - startedAt,
      error_message: err.message,
    });

    return NextResponse.json({ error: err.message || 'AI request failed' }, { status: 500 });
  }
}
