/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  generateConsolNumber,
  generateHBLNumber,
  generateInvoiceNumber,
  generateJobNumber,
} from '@/lib/utils';

async function nextSequenceValue(supabase: any, sequenceName: string) {
  const { data, error } = await supabase.rpc('nextval', { seq: sequenceName });
  if (error) throw error;
  return Number(data);
}

export async function nextJobNumbers(supabase: any, jobType: 'IMP' | 'EXP') {
  const [jobSequence, hblSequence] = await Promise.all([
    nextSequenceValue(supabase, 'job_number_seq'),
    nextSequenceValue(supabase, 'hbl_number_seq'),
  ]);

  return {
    jobNumber: generateJobNumber(jobType, jobSequence),
    hblNumber: generateHBLNumber(hblSequence),
  };
}

export async function nextJobNumber(supabase: any, jobType: 'IMP' | 'EXP') {
  const jobSequence = await nextSequenceValue(supabase, 'job_number_seq');
  return generateJobNumber(jobType, jobSequence);
}

export async function nextConsolNumber(supabase: any) {
  const sequence = await nextSequenceValue(supabase, 'consol_number_seq');
  return generateConsolNumber(sequence);
}

export async function nextInvoiceNumber(supabase: any) {
  const sequence = await nextSequenceValue(supabase, 'invoice_number_seq');
  return generateInvoiceNumber(sequence);
}

export async function nextQuoteNumber(supabase: any) {
  const sequence = await nextSequenceValue(supabase, 'quote_number_seq');
  const year = new Date().getFullYear();
  return `QT-${year}-${String(sequence).padStart(4, '0')}`;
}

export async function nextColoadNumber(supabase: any) {
  const sequence = await nextSequenceValue(supabase, 'coload_number_seq');
  const year = new Date().getFullYear();
  return `CL-${year}-${String(sequence).padStart(4, '0')}`;
}
