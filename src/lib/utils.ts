import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, parseISO } from 'date-fns';
import { JobStatus, ConsolStatus, InvoiceStatus } from '@/types';

// Tailwind class merger
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================================
// Job Number Generator
// Format: SC/IMP/2024/0001 or SC/EXP/2024/0001
// ============================================================
export function generateJobNumber(type: 'IMP' | 'EXP', sequence: number): string {
  const year = new Date().getFullYear();
  const seq = String(sequence).padStart(4, '0');
  return `SC/${type}/${year}/${seq}`;
}

// Consol number: SC/CON/2024/0001
export function generateConsolNumber(sequence: number): string {
  const year = new Date().getFullYear();
  const seq = String(sequence).padStart(4, '0');
  return `SC/CON/${year}/${seq}`;
}

// HBL number: SC/HBL/2024/0001
export function generateHBLNumber(sequence: number): string {
  const year = new Date().getFullYear();
  const seq = String(sequence).padStart(4, '0');
  return `SCHBL${year}${seq}`;
}

// Invoice number: SC/INV/2024/0001
export function generateInvoiceNumber(sequence: number): string {
  const year = new Date().getFullYear();
  const seq = String(sequence).padStart(4, '0');
  return `SC/INV/${year}/${seq}`;
}

// ============================================================
// Date formatting
// ============================================================
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd MMM yyyy');
  } catch {
    return '—';
  }
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '—';
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, 'dd MMM yyyy, HH:mm');
  } catch {
    return '—';
  }
}

export function formatDateForInput(date: string | null | undefined): string {
  if (!date) return '';
  try {
    return format(parseISO(date), 'yyyy-MM-dd');
  } catch {
    return '';
  }
}

// ============================================================
// Number formatting
// ============================================================
export function formatCurrency(amount: number | null | undefined, currency = 'INR'): string {
  if (amount == null) return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatNumber(n: number | null | undefined, decimals = 2): string {
  if (n == null) return '—';
  return n.toFixed(decimals);
}

export function formatCBM(cbm: number | null | undefined): string {
  if (cbm == null) return '—';
  return `${cbm.toFixed(3)} CBM`;
}

export function formatWeight(weight: number | null | undefined): string {
  if (weight == null) return '—';
  return `${weight.toFixed(2)} KG`;
}

// ============================================================
// Status helpers
// ============================================================
export const JOB_STATUS_CONFIG: Record<JobStatus, { label: string; color: string; bg: string }> = {
  draft:              { label: 'Draft',             color: 'text-slate-500',   bg: 'bg-slate-100' },
  booked:             { label: 'Booked',            color: 'text-blue-600',    bg: 'bg-blue-50' },
  'in-transit':       { label: 'In Transit',        color: 'text-amber-600',   bg: 'bg-amber-50' },
  arrived:            { label: 'Arrived',           color: 'text-violet-600',  bg: 'bg-violet-50' },
  'customs-clearance':{ label: 'Customs',           color: 'text-orange-600',  bg: 'bg-orange-50' },
  delivered:          { label: 'Delivered',         color: 'text-emerald-600', bg: 'bg-emerald-50' },
  closed:             { label: 'Closed',            color: 'text-slate-400',   bg: 'bg-slate-50' },
  cancelled:          { label: 'Cancelled',         color: 'text-red-500',     bg: 'bg-red-50' },
};

export const CONSOL_STATUS_CONFIG: Record<ConsolStatus, { label: string; color: string; bg: string }> = {
  open:      { label: 'Open',     color: 'text-emerald-600', bg: 'bg-emerald-50' },
  loading:   { label: 'Loading',  color: 'text-blue-600',    bg: 'bg-blue-50' },
  departed:  { label: 'Departed', color: 'text-amber-600',   bg: 'bg-amber-50' },
  arrived:   { label: 'Arrived',  color: 'text-violet-600',  bg: 'bg-violet-50' },
  closed:    { label: 'Closed',   color: 'text-slate-400',   bg: 'bg-slate-50' },
};

export const INVOICE_STATUS_CONFIG: Record<InvoiceStatus, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Draft',    color: 'text-slate-500',   bg: 'bg-slate-100' },
  sent:      { label: 'Sent',     color: 'text-blue-600',    bg: 'bg-blue-50' },
  paid:      { label: 'Paid',     color: 'text-emerald-600', bg: 'bg-emerald-50' },
  overdue:   { label: 'Overdue',  color: 'text-red-600',     bg: 'bg-red-50' },
  cancelled: { label: 'Cancelled',color: 'text-slate-400',   bg: 'bg-slate-50' },
};

// ============================================================
// Ports list (common Indian & global ports)
// ============================================================
export const INDIAN_PORTS = [
  'INJNP - Nhava Sheva (JNPT), Mumbai',
  'INMAA - Chennai',
  'INMUN - Mundra',
  'INPAV - Pipavav',
  'INCOK - Cochin (Kochi)',
  'INKAL - Kolkata',
  'INVIS - Visakhapatnam',
  'INNSA - Nava Sheva (General)',
  'INMUN - Mundra',
  'INTUT - ICD Tughlakabad (Delhi)',
  'INLUD - ICD Ludhiana',
  'INBOM - Mumbai',
];

export const WORLD_PORTS = [
  'CNSHA - Shanghai, China',
  'CNNBO - Ningbo, China',
  'CNSZX - Shenzhen (Yantian), China',
  'CNGGZ - Guangzhou (Nansha), China',
  'CNTAO - Qingdao, China',
  'SGSIN - Singapore',
  'MYTPP - Port Klang, Malaysia',
  'THBKK - Bangkok (Laem Chabang), Thailand',
  'VNSGN - Ho Chi Minh City, Vietnam',
  'AEAUH - Abu Dhabi, UAE',
  'AEDXB - Dubai (Jebel Ali), UAE',
  'USLAX - Los Angeles, USA',
  'USNYC - New York, USA',
  'DEHAM - Hamburg, Germany',
  'NLRTM - Rotterdam, Netherlands',
  'GBFXT - Felixstowe, UK',
  'ITGOA - Genoa, Italy',
  'BEANR - Antwerp, Belgium',
  'JPYOK - Yokohama, Japan',
  'KRPUS - Busan, South Korea',
  'AUBNE - Brisbane, Australia',
  'AUMEL - Melbourne, Australia',
];

export const ALL_PORTS = [...INDIAN_PORTS, ...WORLD_PORTS];

// ============================================================
// CBM Capacity per container type
// ============================================================
export const CONTAINER_CAPACITIES: Record<string, number> = {
  '20GP': 28.0,
  '40GP': 56.0,
  '40HC': 68.0,
  '45HC': 78.0,
};

// ============================================================
// Misc helpers
// ============================================================
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '…';
}

export function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
