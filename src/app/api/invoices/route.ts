/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { nextInvoiceNumber } from '@/lib/numbering';

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const status  = searchParams.get('status') || '';
    const page    = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '20');
    const offset  = (page - 1) * perPage;
    let query = supabase.from('invoices').select(`
      *, job:jobs(id, job_number, pol, pod), customer:customers(id, company_name, email)
    `, { count: 'exact' }).order('created_at', { ascending: false }).range(offset, offset + perPage - 1);
    if (status) query = query.eq('status', status);
    const { data, error, count } = await query;
    if (error) throw error;
    return NextResponse.json({ data: data || [], total: count || 0, page, per_page: perPage, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data: profile } = await supabase.from('users').select('company_id, role').eq('id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (profile.role === 'viewer') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

    const body = await request.json();
    const { job_id, customer_id, invoice_type = 'sales', customer_amount = 0, cost_amount = 0,
            taxable_amount, gst_rate = 18, line_items = [], due_date, notes } = body;

    const taxable: number = taxable_amount || customer_amount;
    const gst_amount: number = taxable * (gst_rate / 100);
    const total_amount: number = taxable + gst_amount;
    const invoice_number = await nextInvoiceNumber(supabase);
    const companyId: string = profile.company_id;

    const { data, error } = await supabase.from('invoices').insert({
      company_id:     companyId,
      invoice_number, invoice_type,
      job_id:         job_id || null,
      customer_id:    customer_id || null,
      customer_amount, cost_amount,
      taxable_amount: taxable,
      gst_rate, gst_amount, total_amount,
      line_items,
      due_date:       due_date || null,
      notes:          notes || null,
      created_by:     user.id,
      status:         'draft',
    }).select(`*, job:jobs(id, job_number), customer:customers(id, company_name)`).single();

    if (error) throw error;
    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
