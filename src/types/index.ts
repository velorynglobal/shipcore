// ============================================================
// ShipCore - Core TypeScript Types
// ============================================================

export type UserRole = 'admin' | 'operator' | 'viewer';
export type JobType = 'IMP' | 'EXP';
export type ContainerType = '20GP' | '40GP' | '40HC' | '45HC';
export type InvoiceType = 'sales' | 'purchase' | 'credit_note';

export type JobStatus =
  | 'draft'
  | 'booked'
  | 'in-transit'
  | 'arrived'
  | 'customs-clearance'
  | 'delivered'
  | 'closed'
  | 'cancelled';

export type ConsolStatus = 'open' | 'loading' | 'departed' | 'arrived' | 'closed';

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';

// ============================================================
// Database Models
// ============================================================

export interface Company {
  id: string;
  name: string;
  address?: string;
  city?: string;
  country: string;
  phone?: string;
  email?: string;
  gst_number?: string;
  logo_url?: string;
  plan: 'starter' | 'growth' | 'enterprise';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  company_id: string;
  full_name: string;
  email: string;
  role: UserRole;
  avatar_url?: string;
  is_active: boolean;
  last_login?: string;
  created_at: string;
  updated_at: string;
  // Joined
  company?: Company;
}

export interface Customer {
  id: string;
  company_id: string;
  company_name: string;
  contact_person?: string;
  mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  gst_number?: string;
  credit_limit: number;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  company_id: string;
  name: string;
  port: string;
  country: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface Job {
  id: string;
  company_id: string;
  job_number: string;
  job_type: JobType;
  status: JobStatus;
  enquiry_id?: string;
  quote_id?: string;
  
  customer_id?: string;
  consignee_name?: string;
  agent_id?: string;
  
  pol: string;
  pod: string;
  
  cargo_description: string;
  commodity?: string;
  packages: number;
  package_type: string;
  gross_weight: number;
  cbm: number;
  
  mbl_number?: string;
  hbl_number?: string;
  carrier?: string;
  vessel?: string;
  voyage?: string;
  container_no?: string;
  seal_no?: string;
  
  etd?: string;
  eta?: string;
  atd?: string;
  ata?: string;
  
  be_number?: string;
  be_date?: string;
  assessed_value?: number;
  buy_total: number;
  sell_total: number;
  profit: number;
  
  remarks?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Joined
  customer?: Customer;
  agent?: Agent;
}

export interface Consol {
  id: string;
  company_id: string;
  consol_number: string;
  container_no?: string;
  container_type: ContainerType;
  container_size: number;
  
  pol: string;
  pod: string;
  
  carrier?: string;
  vessel?: string;
  voyage?: string;
  mbl_number?: string;
  
  etd?: string;
  eta?: string;
  
  status: ConsolStatus;
  
  total_cbm: number;
  total_weight: number;
  total_jobs: number;
  
  remarks?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Joined
  jobs?: ConsolMapping[];
}

export interface ConsolMapping {
  id: string;
  company_id: string;
  consol_id: string;
  job_id: string;
  cbm: number;
  weight: number;
  assigned_at: string;
  assigned_by?: string;
  
  // Joined
  job?: Job;
  consol?: Consol;
}

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

export interface Invoice {
  id: string;
  company_id: string;
  invoice_number: string;
  invoice_type: InvoiceType;
  
  job_id?: string;
  customer_id?: string;
  
  customer_amount: number;
  cost_amount: number;
  profit: number;
  
  taxable_amount: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  
  status: InvoiceStatus;
  due_date?: string;
  paid_date?: string;
  payment_ref?: string;
  
  line_items: InvoiceLineItem[];
  notes?: string;
  
  created_by?: string;
  created_at: string;
  updated_at: string;
  
  // Joined
  job?: Job;
  customer?: Customer;
}

// ============================================================
// API Response Types
// ============================================================

export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
  error: string | null;
}

// ============================================================
// Dashboard / Analytics
// ============================================================

export interface DashboardStats {
  total_jobs: number;
  active_jobs: number;
  total_customers: number;
  total_agents: number;
  monthly_revenue: number;
  monthly_profit: number;
  open_consols: number;
  pending_invoices: number;
}

export interface MonthlyData {
  month: string;
  revenue: number;
  profit: number;
  jobs: number;
}

// ============================================================
// Form Types
// ============================================================

export interface CustomerFormData {
  company_name: string;
  contact_person?: string;
  mobile?: string;
  email?: string;
  address?: string;
  city?: string;
  gst_number?: string;
  credit_limit?: number;
}

export interface AgentFormData {
  name: string;
  port: string;
  country: string;
  contact_name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface JobFormData {
  job_type: JobType;
  customer_id?: string;
  consignee_name?: string;
  agent_id?: string;
  pol: string;
  pod: string;
  cargo_description: string;
  commodity?: string;
  packages?: number;
  package_type?: string;
  gross_weight?: number;
  cbm?: number;
  carrier?: string;
  vessel?: string;
  voyage?: string;
  etd?: string;
  eta?: string;
  remarks?: string;
}

export interface ConsolFormData {
  container_type: ContainerType;
  container_size?: number;
  pol: string;
  pod: string;
  carrier?: string;
  vessel?: string;
  voyage?: string;
  etd?: string;
  eta?: string;
}

export interface InvoiceFormData {
  job_id?: string;
  customer_id?: string;
  invoice_type: InvoiceType;
  customer_amount: number;
  cost_amount: number;
  taxable_amount?: number;
  gst_rate?: number;
  line_items?: InvoiceLineItem[];
  due_date?: string;
  notes?: string;
}

// ============================================================
// Auth Context
// ============================================================

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  company_id: string;
  company?: Company;
}
