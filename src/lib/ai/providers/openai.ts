/* eslint-disable @typescript-eslint/no-explicit-any */
// AI Provider — uses Anthropic Claude API
import type { AiGenerateResult } from '@/lib/ai/types';
import {
  documentValidateOutputSchema,
  invoiceLineItemSuggestionOutputSchema,
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
  try { return JSON.parse(clean); } catch { return null; }
}

export async function generateJobDraft(freeText: string, context: any): Promise<AiGenerateResult<z.infer<typeof jobDraftOutputSchema>>> {
  if (shouldUseMockMode()) {
    return {
      success: true,
      data: { job_type: 'IMP', pol: 'CNSHA', pod: 'INJNP', cargo_description: freeText, cbm: 0, gross_weight: 0, packages: 0 } as any,
      model: 'mock',
    };
  }

  const prompt = `Extract logistics job details from this text and return JSON only:
Text: "${freeText}"
Context: ${JSON.stringify(context)}

Return JSON: { "job_type": "IMP|EXP", "pol": "port code", "pod": "port code", "cargo_description": "...", "cbm": number, "gross_weight": number, "packages": number, "commodity": "...", "eta": "YYYY-MM-DD or null" }`;

  const text = await callAnthropic(prompt);
  const data = safeParseJson(text);

  return data
    ? { success: true, data, model: DEFAULT_MODEL }
    : { success: false, error: 'Failed to parse response', model: DEFAULT_MODEL };
}

export async function suggestInvoiceLineItems(context: any): Promise<AiGenerateResult<z.infer<typeof invoiceLineItemSuggestionOutputSchema>>> {
  if (shouldUseMockMode()) {
    return { success: true, data: { line_items: [] } as any, model: 'mock' };
  }

  const prompt = `Suggest invoice line items for a freight forwarding invoice.
Context: ${JSON.stringify(context)}

Return JSON: { "line_items": [{ "description": "...", "amount": number, "gst_rate": number }] }`;

  const text = await callAnthropic(prompt);
  const data = safeParseJson(text);

  return data
    ? { success: true, data, model: DEFAULT_MODEL }
    : { success: false, error: 'Failed to parse response', model: DEFAULT_MODEL };
}

export async function validateDocument(documentType: string, extractedData: any): Promise<AiGenerateResult<z.infer<typeof documentValidateOutputSchema>>> {
  if (shouldUseMockMode()) {
    return { success: true, data: { is_valid: true, issues: [], confidence: 0.9 } as any, model: 'mock' };
  }

  const prompt = `Validate this logistics document.
Type: ${documentType}
Data: ${JSON.stringify(extractedData)}

Return JSON: { "is_valid": boolean, "issues": ["..."], "confidence": 0.0-1.0, "suggestions": ["..."] }`;

  const text = await callAnthropic(prompt);
  const data = safeParseJson(text);

  return data
    ? { success: true, data, model: DEFAULT_MODEL }
    : { success: false, error: 'Failed to parse response', model: DEFAULT_MODEL };
}
