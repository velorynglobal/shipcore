/* eslint-disable @typescript-eslint/no-explicit-any */
import type { AiGenerateResult } from '@/lib/ai/types';
import {
  documentValidateInputSchema,
  documentValidateOutputSchema,
  invoiceLineItemSuggestionInputSchema,
  invoiceLineItemSuggestionOutputSchema,
  jobDraftInputSchema,
  jobDraftOutputSchema,
} from '@/lib/ai/schemas';
import type { z } from 'zod';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';

function getApiKey(): string | undefined {
  return process.env.ANTHROPIC_API_KEY;
}

function shouldUseMockMode(): boolean {
  return !getApiKey();
}

async function callAnthropic(prompt: string, maxTokens = 1000): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured');

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Anthropic API error');
  return data.content?.[0]?.text || '';
}

function safeParseJson(text: string): any {
  const clean = text.replace(/```json|```/g, '').trim();
  try {
    return JSON.parse(clean);
  } catch {
    return null;
  }
}

function buildResult<T>(output: T, model: string): AiGenerateResult<T> {
  return {
    output,
    model,
    provider: 'openai',
  };
}

export async function generateJobDraft(
  payload: z.infer<typeof jobDraftInputSchema>
): Promise<AiGenerateResult<z.infer<typeof jobDraftOutputSchema>>> {
  const parsedPayload = jobDraftInputSchema.parse(payload);

  if (shouldUseMockMode()) {
    const mockOutput = jobDraftOutputSchema.parse({
      job_type: parsedPayload.context?.job_type || 'IMP',
      pol: 'CNSHA',
      pod: 'INJNP',
      cargo_description: parsedPayload.free_text,
      commodity: null,
      packages: 0,
      package_type: 'CTN',
      gross_weight: 0,
      cbm: 0,
      carrier: null,
      vessel: null,
      voyage: null,
      etd: null,
      eta: null,
      consignee_name: null,
      remarks: null,
      missing_fields: [],
      warnings: ['Mock mode response'],
      confidence: 0.5,
    });
    return buildResult(mockOutput, 'mock');
  }

  const prompt = `Extract logistics job details from this text and return JSON only:
Text: "${parsedPayload.free_text}"
Context: ${JSON.stringify(parsedPayload.context || {})}

Return JSON: { "job_type": "IMP|EXP", "pol": "port code", "pod": "port code", "cargo_description": "...", "cbm": number, "gross_weight": number, "packages": number, "commodity": "...", "eta": "YYYY-MM-DD or null" }`;

  const text = await callAnthropic(prompt);
  const data = safeParseJson(text) || {};
  const output = jobDraftOutputSchema.parse({
    ...data,
    cargo_description: data.cargo_description || parsedPayload.free_text,
  });

  return buildResult(output, DEFAULT_MODEL);
}

export async function generateInvoiceLineItemSuggestions(
  payload: z.infer<typeof invoiceLineItemSuggestionInputSchema>
): Promise<AiGenerateResult<z.infer<typeof invoiceLineItemSuggestionOutputSchema>>> {
  const parsedPayload = invoiceLineItemSuggestionInputSchema.parse(payload);

  if (shouldUseMockMode()) {
    const mockOutput = invoiceLineItemSuggestionOutputSchema.parse({
      line_items: [],
      suggested_gst_rate: 18,
      taxable_amount: 0,
      gst_amount: 0,
      total_amount: 0,
      anomalies: [],
      warnings: ['Mock mode response'],
      confidence: 0.5,
    });
    return buildResult(mockOutput, 'mock');
  }

  const prompt = `Suggest invoice line items for a freight forwarding invoice.
Context: ${JSON.stringify(parsedPayload)}

Return JSON: { "line_items": [{ "description": "...", "quantity": number, "unit": "LOT", "rate": number, "amount": number }], "suggested_gst_rate": number, "taxable_amount": number, "gst_amount": number, "total_amount": number, "anomalies": [], "warnings": [], "confidence": number }`;

  const text = await callAnthropic(prompt);
  const data = safeParseJson(text) || {};
  const output = invoiceLineItemSuggestionOutputSchema.parse(data);

  return buildResult(output, DEFAULT_MODEL);
}

export async function validateDocumentData(
  payload: z.infer<typeof documentValidateInputSchema>,
  contextSummary: string
): Promise<AiGenerateResult<z.infer<typeof documentValidateOutputSchema>>> {
  const parsedPayload = documentValidateInputSchema.parse(payload);

  if (shouldUseMockMode()) {
    const mockOutput = documentValidateOutputSchema.parse({
      score: 0.9,
      issues: [],
      rewrite_suggestions: {},
      warnings: ['Mock mode response'],
      confidence: 0.9,
    });
    return buildResult(mockOutput, 'mock');
  }

  const prompt = `Validate this logistics document.
Type: ${parsedPayload.document_type}
Checks: ${parsedPayload.checks.join(', ')}
Context:
${contextSummary}

Return JSON: { "score": 0.0-1.0, "issues": [{"field":"...","severity":"low|medium|high","message":"..."}], "rewrite_suggestions": {"notes":"...","cargo_description":"..."}, "warnings": ["..."], "confidence": 0.0-1.0 }`;

  const text = await callAnthropic(prompt);
  const data = safeParseJson(text) || {};
  const output = documentValidateOutputSchema.parse(data);

  return buildResult(output, DEFAULT_MODEL);
}
