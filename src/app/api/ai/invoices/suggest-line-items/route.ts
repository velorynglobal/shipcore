/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { aiService, invoiceLineItemSuggestionInputSchema } from '@/lib/ai';
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

    if (profile.role === 'viewer') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    companyId = profile.company_id;

    const body = await request.json();
    const parsed = invoiceLineItemSuggestionInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input payload' },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const notes: string[] = [];

    if (payload.job_id) {
      const { data: job } = await supabase
        .from('jobs')
        .select('job_number, job_type, pol, pod, cargo_description, packages, gross_weight, cbm')
        .eq('id', payload.job_id)
        .single();

      if (job) {
        notes.push(
          `Job context: ${job.job_number}, ${job.job_type}, ${job.pol} to ${job.pod}, cargo ${job.cargo_description}, packages ${job.packages}, weight ${job.gross_weight}, cbm ${job.cbm}.`
        );
      }
    }

    if (payload.customer_id) {
      const { data: customer } = await supabase
        .from('customers')
        .select('company_name, city')
        .eq('id', payload.customer_id)
        .single();

      if (customer) {
        notes.push(`Customer context: ${customer.company_name}${customer.city ? `, ${customer.city}` : ''}.`);
      }
    }

    if (payload.notes) {
      notes.push(`Operator notes: ${payload.notes}`);
    }

    const result = await aiService.generateInvoiceLineItemSuggestions({
      ...payload,
      notes: notes.join(' '),
    });

    await logAiRequest({
      company_id: companyId,
      user_id: userId,
      endpoint: '/api/ai/invoices/suggest-line-items',
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
        suggestions: result.output,
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
      endpoint: '/api/ai/invoices/suggest-line-items',
      provider: 'openai',
      model: process.env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
      status: 'error',
      latency_ms: Date.now() - startedAt,
      error_message: err.message,
    });

    return NextResponse.json(
      { error: err.message || 'AI invoice suggestion request failed' },
      { status: 500 }
    );
  }
}
