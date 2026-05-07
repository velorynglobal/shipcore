/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { mockReports, isSupabaseConfigured } from '@/lib/mock-data';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET() {
  // Return mock data if Supabase is not configured
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ data: [], buckets: mockReports.aging, total: 0, error: null });
  }

  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const { data, error } = await supabase
      .from('vw_aging')
      .select('*')
      .eq('company_id', profile.company_id)
      .order('days_overdue', { ascending: false });

    if (error) throw error;

    const rows = data ?? [];
    const buckets: Record<string, { count: number; amount: number }> = {
      current: { count: 0, amount: 0 },
      '1-30':  { count: 0, amount: 0 },
      '31-60': { count: 0, amount: 0 },
      '61-90': { count: 0, amount: 0 },
      '90+':   { count: 0, amount: 0 },
    };
    rows.forEach((inv: any) => {
      const b = inv.aging_bucket ?? 'current';
      if (buckets[b]) { buckets[b].count++; buckets[b].amount += inv.balance_due ?? 0; }
    });
    const total = Object.values(buckets).reduce((s, b) => s + b.amount, 0);

    return NextResponse.json({ data: rows, buckets, total, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
