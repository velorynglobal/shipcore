import { z } from 'zod';

export const jobDraftInputSchema = z.object({
  free_text: z.string().min(10, 'Please provide more shipment details.').max(8000),
  context: z
    .object({
      customer_id: z.string().uuid().optional(),
      agent_id: z.string().uuid().optional(),
      job_type: z.enum(['IMP', 'EXP']).optional(),
    })
    .optional(),
});

export const jobDraftOutputSchema = z.object({
  job_type: z.enum(['IMP', 'EXP']).default('IMP'),
  pol: z.string().default(''),
  pod: z.string().default(''),
  cargo_description: z.string().default(''),
  commodity: z.string().nullable().default(null),
  packages: z.number().nonnegative().default(0),
  package_type: z.string().default('CTN'),
  gross_weight: z.number().nonnegative().default(0),
  cbm: z.number().nonnegative().default(0),
  carrier: z.string().nullable().default(null),
  vessel: z.string().nullable().default(null),
  voyage: z.string().nullable().default(null),
  etd: z.string().nullable().default(null),
  eta: z.string().nullable().default(null),
  consignee_name: z.string().nullable().default(null),
  remarks: z.string().nullable().default(null),
  missing_fields: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
});

export type JobDraftInputPayload = z.infer<typeof jobDraftInputSchema>;
export type JobDraftOutputPayload = z.infer<typeof jobDraftOutputSchema>;

export const invoiceLineItemSuggestionInputSchema = z.object({
  job_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  invoice_type: z.enum(['sales', 'purchase', 'credit_note']).default('sales'),
  currency: z.string().default('INR'),
  notes: z.string().max(2000).optional(),
}).refine(
  (value) => Boolean(value.job_id || value.customer_id || value.notes),
  'Provide at least one of job_id, customer_id, or notes.'
);

export const invoiceLineItemSuggestionOutputSchema = z.object({
  line_items: z
    .array(
      z.object({
        description: z.string().min(1),
        quantity: z.number().positive(),
        unit: z.string().min(1).default('LOT'),
        rate: z.number().nonnegative(),
        amount: z.number().nonnegative(),
      })
    )
    .default([]),
  suggested_gst_rate: z.number().min(0).max(100).default(18),
  taxable_amount: z.number().nonnegative().default(0),
  gst_amount: z.number().nonnegative().default(0),
  total_amount: z.number().nonnegative().default(0),
  anomalies: z
    .array(
      z.object({
        field: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
        message: z.string(),
      })
    )
    .default([]),
  warnings: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
});

export type InvoiceLineItemSuggestionInputPayload = z.infer<
  typeof invoiceLineItemSuggestionInputSchema
>;
export type InvoiceLineItemSuggestionOutputPayload = z.infer<
  typeof invoiceLineItemSuggestionOutputSchema
>;

export const documentValidateInputSchema = z.object({
  document_type: z.enum(['hbl', 'invoice']),
  entity_id: z.string().uuid(),
  checks: z
    .array(z.enum(['completeness', 'consistency', 'wording']))
    .default(['completeness', 'consistency']),
});

export const documentValidateOutputSchema = z.object({
  score: z.number().min(0).max(1).default(0.5),
  issues: z
    .array(
      z.object({
        field: z.string(),
        severity: z.enum(['low', 'medium', 'high']),
        message: z.string(),
      })
    )
    .default([]),
  rewrite_suggestions: z
    .object({
      notes: z.string().nullable().optional(),
      cargo_description: z.string().nullable().optional(),
    })
    .default({}),
  warnings: z.array(z.string()).default([]),
  confidence: z.number().min(0).max(1).default(0.5),
});

export type DocumentValidateInputPayload = z.infer<typeof documentValidateInputSchema>;
export type DocumentValidateOutputPayload = z.infer<typeof documentValidateOutputSchema>;
