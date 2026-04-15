/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { aiService, documentValidateInputSchema } from '@/lib/ai';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { logAiRequest } from '@/lib/ai/logger';

function buildHblContext(job: any): string {
  const lines = [
    `Job: ${job.job_number || 'N/A'} (${job.job_type || 'N/A'})`,
    `HBL: ${job.hbl_number || 'N/A'}`,
    `POL/POD: ${job.pol || 'N/A'} -> ${job.pod || 'N/A'}`,
    `Cargo: ${job.cargo_description || 'N/A'}`,
    `Packages: ${job.packages || 0} ${job.package_type || ''}`.trim(),
    `Weight/CBM: ${job.gross_weight || 0} KG / ${job.cbm || 0} CBM`,
    `Carrier/Vessel/Voyage: ${job.carrier || 'N/A'} / ${job.vessel || 'N/A'} / ${job.voyage || 'N/A'}`,
    `ETD/ETA: ${job.etd || 'N/A'} / ${job.eta || 'N/A'}`,
    `Consignee: ${job.consignee_name || job.customer?.company_name || 'N/A'}`,
  ];
  return lines.join('\n');
}

function buildInvoiceContext(invoice: any): string {
  const lineItemSummary = Array.isArray(invoice.line_items)
    ? invoice.line_items
        .slice(0, 10)
        .map((item: any, index: number) => {
          return `${index + 1}. ${item.description || 'N/A'} | qty ${item.quantity || 0} ${item.unit || ''} | rate ${
            item.rate || 0
          } | amount ${item.amount || 0}`;
        })
        .join('\n')
    : 'No line items';

  const lines = [
    `Invoice: ${invoice.invoice_number || 'N/A'} (${invoice.invoice_type || 'N/A'})`,
    `Status: ${invoice.status || 'N/A'}`,
    `Customer: ${invoice.customer?.company_name || 'N/A'}`,
    `Job: ${invoice.job?.job_number || 'N/A'} | ${invoice.job?.pol || 'N/A'} -> ${invoice.job?.pod || 'N/A'}`,
    `Taxable/GST/Total: ${invoice.taxable_amount || 0} / ${invoice.gst_amount || 0} / ${invoice.total_amount || 0}`,
    `GST rate: ${invoice.gst_rate || 0}%`,
    `Due date: ${invoice.due_date || 'N/A'}`,
    `Notes: ${invoice.notes || 'N/A'}`,
    'Line items:',
    lineItemSummary,
  ];
  return lines.join('\n');
}

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
    const parsed = documentValidateInputSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid input payload' },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    let contextSummary = '';

    if (payload.document_type === 'hbl') {
      const { data: job, error } = await supabase
        .from('jobs')
        .select('*, customer:customers(company_name)')
        .eq('id', payload.entity_id)
        .single();

      if (error || !job) {
        return NextResponse.json({ error: 'HBL source job not found' }, { status: 404 });
      }

      contextSummary = buildHblContext(job);
    } else {
      const { data: invoice, error } = await supabase
        .from('invoices')
        .select('*, job:jobs(job_number, pol, pod), customer:customers(company_name)')
        .eq('id', payload.entity_id)
        .single();

      if (error || !invoice) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }

      contextSummary = buildInvoiceContext(invoice);
    }

    const result = await aiService.validateDocumentData(payload, contextSummary);

    await logAiRequest({
      company_id: companyId,
      user_id: userId,
      endpoint: '/api/ai/documents/validate',
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
        validation: result.output,
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
      endpoint: '/api/ai/documents/validate',
      provider: 'openai',
      model: process.env.AI_DEFAULT_MODEL || 'gpt-4o-mini',
      status: 'error',
      latency_ms: Date.now() - startedAt,
      error_message: err.message,
    });

    return NextResponse.json({ error: err.message || 'AI document validation failed' }, { status: 500 });
  }
}
