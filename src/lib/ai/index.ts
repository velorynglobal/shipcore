import {
  generateInvoiceLineItemSuggestions,
  generateJobDraft,
  validateDocumentData,
} from '@/lib/ai/providers/anthropic';

export const aiService = {
  generateJobDraft,
  generateInvoiceLineItemSuggestions,
  validateDocumentData,
};

export * from '@/lib/ai/types';
export * from '@/lib/ai/schemas';
