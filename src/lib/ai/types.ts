import type { JobType } from '@/types';

export interface AiUsage {
  input_tokens?: number;
  output_tokens?: number;
  total_tokens?: number;
}

export interface AiGenerateResult<T> {
  output: T;
  model: string;
  provider: 'openai' | 'anthropic';
  usage?: AiUsage;
}

export interface JobDraftInput {
  free_text: string;
  context?: {
    customer_id?: string;
    agent_id?: string;
    job_type?: JobType;
  };
}

export interface JobDraftOutput {
  job_type: JobType;
  pol: string;
  pod: string;
  cargo_description: string;
  commodity: string | null;
  packages: number;
  package_type: string;
  gross_weight: number;
  cbm: number;
  carrier: string | null;
  vessel: string | null;
  voyage: string | null;
  etd: string | null;
  eta: string | null;
  consignee_name: string | null;
  remarks: string | null;
  missing_fields: string[];
  warnings: string[];
  confidence: number;
}

export interface InvoiceLineItemSuggestionInput {
  job_id?: string;
  customer_id?: string;
  invoice_type?: 'sales' | 'purchase' | 'credit_note';
  currency?: string;
  notes?: string;
}

export interface InvoiceLineItemSuggestion {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface InvoiceLineItemSuggestionOutput {
  line_items: InvoiceLineItemSuggestion[];
  suggested_gst_rate: number;
  taxable_amount: number;
  gst_amount: number;
  total_amount: number;
  anomalies: Array<{
    field: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
  }>;
  warnings: string[];
  confidence: number;
}

export interface DocumentValidateInput {
  document_type: 'hbl' | 'invoice';
  entity_id: string;
  checks?: Array<'completeness' | 'consistency' | 'wording'>;
}

export interface DocumentValidateOutput {
  score: number;
  issues: Array<{
    field: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
  }>;
  rewrite_suggestions: {
    notes?: string | null;
    cargo_description?: string | null;
  };
  warnings: string[];
  confidence: number;
}
