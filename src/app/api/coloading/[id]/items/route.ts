/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { requireRouteAccess } from '@/lib/route-auth';
import { hydrateColoadItems } from '@/lib/coloading';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireRouteAccess();
    if (auth.errorResponse) return auth.errorResponse;

    const { supabase, profile } = auth;
    const { data: items, error } = await supabase
      .from('coloading_items')
      .select('*')
      .eq('coload_id', params.id)
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: true });

    if (error) throw error;
    const data = await hydrateColoadItems(supabase, items ?? []);
    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
