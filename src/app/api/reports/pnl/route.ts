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
    const period = searchParams.get('period') || 'this_year';

    let fromDate: string | undefined;
    const now = new Date();
    if (period === 'this_month') {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    } else if (period === 'last_month') {
      fromDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
    } else if (period === 'this_year') {
      fromDate = new Date(now.getFullYear(), 3, 1).toISOString(); // April 1 (Indian FY)
      if (now.getMonth() < 3) fromDate = new Date(now.getFullYear() - 1, 3, 1).toISOString();
    }

    let query = supabase
      .from('vw_job_pnl')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })
      .limit(500);

    if (fromDate) query = query.gte('created_at', fromDate);

    const { data, error } = await query;
    if (error) throw error;

    const rows = data ?? [];
    const summary = {
      total_jobs:      rows.length,
      total_revenue:   rows.reduce((s: number, j: any) => s + (j.sell_total ?? 0), 0),
      total_cost:      rows.reduce((s: number, j: any) => s + (j.buy_total ?? 0), 0),
      total_profit:    rows.reduce((s: number, j: any) => s + (j.profit ?? 0), 0),
      total_invoiced:  rows.reduce((s: number, j: any) => s + (j.invoiced_amount ?? 0), 0),
      total_collected: rows.reduce((s: number, j: any) => s + (j.collected_amount ?? 0), 0),
      avg_margin_pct:  rows.length
        ? (rows.reduce((s: number, j: any) => s + (j.margin_pct ?? 0), 0) / rows.length).toFixed(1)
        : 0,
    };

    return NextResponse.json({ data: rows, summary, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
