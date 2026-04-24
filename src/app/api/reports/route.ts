/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const { searchParams } = new URL(request.url);
    const report   = searchParams.get('report') || 'pnl'; // pnl | aging | gst | dashboard
    const fromDate = searchParams.get('from');
    const toDate   = searchParams.get('to');
    const cid      = profile.company_id;

    if (report === 'pnl') {
      let query = supabase
        .from('vw_job_pnl')
        .select('*')
        .eq('company_id', cid)
        .order('created_at', { ascending: false })
        .limit(200);

      if (fromDate) query = query.gte('created_at', fromDate);
      if (toDate)   query = query.lte('created_at', toDate + 'T23:59:59');

      const { data, error } = await query;
      if (error) throw error;

      // Summary stats
      const summary = {
        total_jobs:      data?.length ?? 0,
        total_revenue:   data?.reduce((s: number, j: any) => s + (j.sell_total ?? 0), 0) ?? 0,
        total_cost:      data?.reduce((s: number, j: any) => s + (j.buy_total ?? 0), 0) ?? 0,
        total_profit:    data?.reduce((s: number, j: any) => s + (j.profit ?? 0), 0) ?? 0,
        total_invoiced:  data?.reduce((s: number, j: any) => s + (j.invoiced_amount ?? 0), 0) ?? 0,
        total_collected: data?.reduce((s: number, j: any) => s + (j.collected_amount ?? 0), 0) ?? 0,
        avg_margin_pct:  data?.length ? (data.reduce((s: number, j: any) => s + (j.margin_pct ?? 0), 0) / data.length).toFixed(1) : 0,
      };
      return NextResponse.json({ data, summary, error: null });
    }

    if (report === 'aging') {
      const { data, error } = await supabase
        .from('vw_aging')
        .select('*')
        .eq('company_id', cid)
        .order('days_overdue', { ascending: false });

      if (error) throw error;

      // Bucket totals
      const buckets: Record<string, { count: number; amount: number }> = {
        current: { count: 0, amount: 0 },
        '1-30':  { count: 0, amount: 0 },
        '31-60': { count: 0, amount: 0 },
        '61-90': { count: 0, amount: 0 },
        '90+':   { count: 0, amount: 0 },
      };
      data?.forEach((inv: any) => {
        const b = inv.aging_bucket ?? 'current';
        if (buckets[b]) { buckets[b].count++; buckets[b].amount += inv.balance_due ?? 0; }
      });
      const total = Object.values(buckets).reduce((s, b) => s + b.amount, 0);
      return NextResponse.json({ data, buckets, total, error: null });
    }

    if (report === 'gst') {
      let query = supabase
        .from('vw_gst_summary')
        .select('*')
        .eq('company_id', cid)
        .order('month', { ascending: false })
        .limit(24);

      const { data, error } = await query;
      if (error) throw error;
      return NextResponse.json({ data, error: null });
    }

    if (report === 'dashboard') {
      // Executive dashboard — multiple queries in parallel
      const thisMonth = new Date();
      thisMonth.setDate(1); thisMonth.setHours(0, 0, 0, 0);

      const [jobs, invoices, payments, tasks, containers] = await Promise.all([
        supabase.from('jobs').select('status, created_at, sell_total, profit').eq('company_id', cid),
        supabase.from('invoices').select('status, total_amount, due_date').eq('company_id', cid).neq('status', 'cancelled'),
        supabase.from('payments').select('amount, created_at').eq('company_id', cid).gte('created_at', thisMonth.toISOString()),
        supabase.from('tasks').select('status, priority').eq('company_id', cid).eq('status', 'pending'),
        supabase.from('containers').select('risk_level, is_returned').eq('company_id', cid).eq('is_returned', false),
      ]);

      const activeStatuses = ['booking_confirmed','in_transit','arrived','customs_clearance','documentation','cargo_received'];
      const summary = {
        active_jobs:         jobs.data?.filter((j: any) => activeStatuses.includes(j.status)).length ?? 0,
        total_jobs_month:    jobs.data?.filter((j: any) => new Date(j.created_at) >= thisMonth).length ?? 0,
        revenue_collected:   payments.data?.reduce((s: number, p: any) => s + (p.amount ?? 0), 0) ?? 0,
        outstanding:         invoices.data?.filter((i: any) => ['sent','overdue'].includes(i.status)).reduce((s: number, i: any) => s + (i.total_amount ?? 0), 0) ?? 0,
        overdue_invoices:    invoices.data?.filter((i: any) => i.status === 'overdue').length ?? 0,
        critical_tasks:      tasks.data?.filter((t: any) => t.priority === 'critical').length ?? 0,
        pending_tasks:       tasks.data?.length ?? 0,
        detention_risk:      containers.data?.filter((c: any) => ['high','critical'].includes(c.risk_level)).length ?? 0,
        total_profit_month:  jobs.data?.filter((j: any) => new Date(j.created_at) >= thisMonth).reduce((s: number, j: any) => s + (j.profit ?? 0), 0) ?? 0,
      };
      return NextResponse.json({ data: summary, error: null });
    }

    return NextResponse.json({ error: 'Unknown report type' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
