import type {
  AiGenerateResult,
} from '@/lib/ai/types';
import {
  documentValidateOutputSchema,
  invoiceLineItemSuggestionOutputSchema,
  jobDraftOutputSchema,
} from '@/lib/ai/schemas';
import type { z } from 'zod';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const DEFAULT_MODEL = process.env.AI_DEFAULT_MODEL || 'gpt-4o-mini';
const MOCK_MODEL = 'mock-ai-v1';

function isEnabled(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

function shouldUseMockMode(): boolean {
  return isEnabled(process.env.AI_MOCK_MODE);
}

function shouldFallbackOnQuota(): boolean {
  return isEnabled(process.env.AI_MOCK_ON_QUOTA);
}

function isQuotaErrorMessage(errorMessage: string): boolean {
  const text = errorMessage.toLowerCase();
  return text.includes('429') || text.includes('insufficient_quota') || text.includes('quota');
}

function buildPrompt(input: { free_text?: string; context?: { job_type?: string } }): string {
  const context = input.context || {};

  return [
    'Extract and normalize a logistics job draft from user text.',
    'Return strict JSON only. No markdown, no prose.',
    'Use null for unknown nullable fields and empty string only for required text fields when unknown.',
    'Output keys: job_type, pol, pod, cargo_description, commodity, packages, package_type, gross_weight, cbm, carrier, vessel, voyage, etd, eta, consignee_name, remarks, missing_fields, warnings, confidence.',
    `Preferred job_type: ${context.job_type || 'IMP'}`,
    '',
    'User input:',
    input.free_text || '',
  ].join('\n');
}

async function callOpenAiJson<T>(params: {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  schema: z.ZodType<T>;
}): Promise<AiGenerateResult<T>> {
  if (shouldUseMockMode()) {
    throw new Error('__MOCK_MODE__');
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is missing');
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: params.temperature ?? 0.1,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: params.systemPrompt,
        },
        {
          role: 'user',
          content: params.userPrompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${text}`);
  }

  const payload = await response.json();
  const content: string | undefined = payload?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('OpenAI response did not include content');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new Error('OpenAI returned invalid JSON');
  }

  const normalized = params.schema.parse(parsed);

  return {
    output: normalized,
    model: payload?.model || DEFAULT_MODEL,
    provider: 'openai',
    usage: {
      input_tokens: payload?.usage?.prompt_tokens,
      output_tokens: payload?.usage?.completion_tokens,
      total_tokens: payload?.usage?.total_tokens,
    },
  };
}

function buildInvoicePrompt(input: {
  job_id?: string;
  customer_id?: string;
  invoice_type?: string;
  currency?: string;
  notes?: string;
}): string {
  return [
    'Suggest invoice line items for a logistics shipment.',
    'Return strict JSON only. No markdown, no prose.',
    'Output keys: line_items, suggested_gst_rate, taxable_amount, gst_amount, total_amount, anomalies, warnings, confidence.',
    'For each line item include: description, quantity, unit, rate, amount.',
    `Invoice type: ${input.invoice_type || 'sales'}`,
    `Currency: ${input.currency || 'INR'}`,
    input.job_id ? `Job ID: ${input.job_id}` : 'Job ID: unknown',
    input.customer_id ? `Customer ID: ${input.customer_id}` : 'Customer ID: unknown',
    input.notes ? `Notes: ${input.notes}` : 'Notes: none',
  ].join('\n');
}

function buildDocumentValidatePrompt(
  input: { document_type?: string; entity_id?: string; checks?: string[] },
  contextSummary: string
): string {
  return [
    'Validate logistics document data quality.',
    'Return strict JSON only. No markdown, no prose.',
    'Output keys: score, issues, rewrite_suggestions, warnings, confidence.',
    'issues items must include field, severity, message.',
    'rewrite_suggestions can include notes and cargo_description when useful.',
    `Document type: ${input.document_type}`,
    `Entity id: ${input.entity_id}`,
    `Checks requested: ${(input.checks || ['completeness', 'consistency']).join(', ')}`,
    '',
    'Document context:',
    contextSummary || 'No additional context provided.',
  ].join('\n');
}

export async function generateJobDraft(input: {
  free_text?: string;
  context?: { customer_id?: string; agent_id?: string; job_type?: string };
}): Promise<AiGenerateResult<any>> {
  const mockOutput = jobDraftOutputSchema.parse({
    job_type: input.context?.job_type === 'EXP' ? 'EXP' : 'IMP',
    pol: 'CNSHA - Shanghai, China',
    pod: 'INMAA - Chennai',
    cargo_description: 'Electronic parts and accessories',
    commodity: 'Electronics',
    packages: 120,
    package_type: 'CTN',
    gross_weight: 2450,
    cbm: 18.6,
    carrier: 'MAERSK',
    vessel: 'MV DEMO STAR',
    voyage: 'VS-27',
    etd: null,
    eta: '2026-04-21',
    consignee_name: null,
    remarks: 'Mock response. Replace with real provider when quota is available.',
    missing_fields: ['etd'],
    warnings: ['Using mock data output.'],
    confidence: 0.72,
  });

  try {
    return await callOpenAiJson({
      systemPrompt:
        'You are a shipping operations assistant. Extract only what is present or can be safely inferred. Never fabricate values.',
      userPrompt: buildPrompt(input),
      temperature: 0.1,
      schema: jobDraftOutputSchema,
    });
  } catch (error: any) {
    if (error.message === '__MOCK_MODE__' || (shouldFallbackOnQuota() && isQuotaErrorMessage(error.message || ''))) {
      return {
        output: mockOutput,
        model: MOCK_MODEL,
        provider: 'openai',
        usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
      };
    }
    throw error;
  }
}

export async function generateInvoiceLineItemSuggestions(
  input: { job_id?: string; customer_id?: string; invoice_type?: string; currency?: string; notes?: string }
): Promise<AiGenerateResult<any>> {
  const mockOutput = invoiceLineItemSuggestionOutputSchema.parse({
    line_items: [
      { description: 'Ocean Freight', quantity: 1, unit: 'LOT', rate: 85000, amount: 85000 },
      { description: 'Destination THC', quantity: 1, unit: 'LOT', rate: 12000, amount: 12000 },
      { description: 'Documentation Charges', quantity: 1, unit: 'LOT', rate: 2500, amount: 2500 },
    ],
    suggested_gst_rate: 18,
    taxable_amount: 99500,
    gst_amount: 17910,
    total_amount: 117410,
    anomalies: [
      { field: 'Ocean Freight', severity: 'low', message: 'Rate appears within normal lane range.' },
    ],
    warnings: ['Using mock data output.'],
    confidence: 0.7,
  });

  try {
    return await callOpenAiJson({
      systemPrompt:
        'You are a logistics invoicing assistant. Suggest realistic draft charges and flag anomalies conservatively.',
      userPrompt: buildInvoicePrompt(input),
      temperature: 0.1,
      schema: invoiceLineItemSuggestionOutputSchema,
    });
  } catch (error: any) {
    if (error.message === '__MOCK_MODE__' || (shouldFallbackOnQuota() && isQuotaErrorMessage(error.message || ''))) {
      return {
        output: mockOutput,
        model: MOCK_MODEL,
        provider: 'openai',
        usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
      };
    }
    throw error;
  }
}

export async function validateDocumentData(
  input: { document_type?: string; entity_id?: string; checks?: string[] },
  contextSummary: string
): Promise<AiGenerateResult<any>> {
  const mockOutput = documentValidateOutputSchema.parse({
    score: 0.86,
    issues: [
      { field: 'consignee_name', severity: 'medium', message: 'Consignee details appear incomplete.' },
      { field: 'etd', severity: 'low', message: 'ETD is missing or unclear in source context.' },
    ],
    rewrite_suggestions: {
      notes: 'Please verify consignee address and add expected ETD before final document generation.',
      cargo_description: '120 cartons of electronic parts and accessories, packed for ocean freight.',
    },
    warnings: ['Using mock data output.'],
    confidence: 0.69,
  });

  try {
    return await callOpenAiJson({
      systemPrompt:
        'You are a document QA assistant for freight operations. Be conservative and only flag issues supported by provided context.',
      userPrompt: buildDocumentValidatePrompt(input, contextSummary),
      temperature: 0.1,
      schema: documentValidateOutputSchema,
    });
  } catch (error: any) {
    if (error.message === '__MOCK_MODE__' || (shouldFallbackOnQuota() && isQuotaErrorMessage(error.message || ''))) {
      return {
        output: mockOutput,
        model: MOCK_MODEL,
        provider: 'openai',
        usage: { input_tokens: 0, output_tokens: 0, total_tokens: 0 },
      };
    }
    throw error;
  }
}
