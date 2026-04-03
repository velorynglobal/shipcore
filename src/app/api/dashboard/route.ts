/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString();

    const [jobs, activeJobs, customers, agents, monthlyInv, openConsols, pendingInv, trend] = await Promise.all([
      supabase.from('jobs').select('id', { count: 'exact', head: true }),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).in('status', ['booked','in-transit','arrived','customs-clearance']),
      supabase.from('customers').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('agents').select('id', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('invoices').select('customer_amount, profit').gte('created_at', monthStart).lte('created_at', monthEnd).eq('invoice_type', 'sales').neq('status', 'cancelled'),
      supabase.from('consol').select('id', { count: 'exact', head: true }).in('status', ['open','loading']),
      supabase.from('invoices').select('id', { count: 'exact', head: true }).in('status', ['draft','sent','overdue']),
      supabase.from('invoices').select('created_at, customer_amount, profit').gte('created_at', new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString()).eq('invoice_type', 'sales').neq('status', 'cancelled'),
    ]);

    const monthlyRevenue = (monthlyInv.data || []).reduce((s: number, i: any) => s + (i.customer_amount || 0), 0);
    const monthlyProfit  = (monthlyInv.data || []).reduce((s: number, i: any) => s + (i.profit || 0), 0);

    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const trendMap: Record<string, { revenue: number; profit: number; jobs: number }> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      trendMap[`${months[d.getMonth()]} ${d.getFullYear()}`] = { revenue: 0, profit: 0, jobs: 0 };
    }
    (trend.data || []).forEach((inv: any) => {
      const d = new Date(inv.created_at);
      const key = `${months[d.getMonth()]} ${d.getFullYear()}`;
      if (trendMap[key]) { trendMap[key].revenue += inv.customer_amount || 0; trendMap[key].profit += inv.profit || 0; trendMap[key].jobs += 1; }
    });

    return NextResponse.json({
      data: {
        total_jobs:       jobs.count        || 0,
        active_jobs:      activeJobs.count  || 0,
        total_customers:  customers.count   || 0,
        total_agents:     agents.count      || 0,
        monthly_revenue:  monthlyRevenue,
        monthly_profit:   monthlyProfit,
        open_consols:     openConsols.count || 0,
        pending_invoices: pendingInv.count  || 0,
        trend: Object.entries(trendMap).map(([month, val]) => ({ month, ...val })),
      },
      error: null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
