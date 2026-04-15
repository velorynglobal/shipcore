/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '20');
    const offset = (page - 1) * perPage;
    const { data, error, count } = await supabase
      .from('payments')
      .select('*, invoice:invoices(invoice_number, total_amount), customer:customers(company_name)', { count: 'exact' })
      .order('payment_date', { ascending: false })
      .range(offset, offset + perPage - 1);
    if (error) throw error;
    return NextResponse.json({ data: data || [], total: count || 0, error: null });
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
    if (!profile || profile.role === 'viewer') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    const body = await request.json();
    const seq = await supabase.rpc('nextval', { seq: 'payment_seq' });
    const paymentNumber = `RCP-${new Date().getFullYear()}-${String(seq.data || Date.now()).padStart(4, '0')}`;
    const { data, error } = await supabase.from('payments').insert({
      ...body, company_id: profile.company_id,
      payment_number: paymentNumber, created_by: user.id,
    }).select('*, invoice:invoices(invoice_number), customer:customers(company_name)').single();
    if (error) throw error;
    // Auto-update invoice status to paid if fully paid
    if (body.invoice_id) {
      const { data: inv } = await supabase.from('invoices').select('total_amount').eq('id', body.invoice_id).single();
      const { data: allPayments } = await supabase.from('payments').select('amount').eq('invoice_id', body.invoice_id);
      const totalPaid = allPayments?.reduce((s, p) => s + (p.amount || 0), 0) || 0;
      if (inv && totalPaid >= (inv.total_amount || 0)) {
        await supabase.from('invoices').update({ status: 'paid', paid_date: body.payment_date }).eq('id', body.invoice_id);
      }
    }
    return NextResponse.json({ data, error: null }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
