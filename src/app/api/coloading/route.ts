/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { requireRouteAccess } from '@/lib/route-auth';
import { buildColoadItemRows, hydrateColoadItems, sanitizeColoadRecord } from '@/lib/coloading';
import { nextColoadNumber } from '@/lib/numbering';

export async function GET(request: Request) {
  try {
    const auth = await requireRouteAccess();
    if (auth.errorResponse) return auth.errorResponse;

    const { supabase, profile } = auth;

    const { searchParams } = new URL(request.url);
    const perPage = parseInt(searchParams.get('per_page') || '100');
    const type    = searchParams.get('type');
    const status  = searchParams.get('status');

    let query = supabase
      .from('coloading')
      .select('*', { count: 'exact' })
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })
      .limit(perPage);

    if (type)   query = query.eq('coload_type', type);
    if (status) query = query.eq('status', status);

    const { data: coloads, error, count } = await query;
    if (error) throw error;

    const ids = (coloads ?? []).map((c: any) => c.id);
    let itemMap: Record<string, any[]> = {};
    if (ids.length > 0) {
      const { data: rawItems } = await supabase
        .from('coloading_items')
        .select('*')
        .in('coload_id', ids)
        .order('created_at', { ascending: true });
      const items = await hydrateColoadItems(supabase, rawItems ?? []);
      items.forEach((item: any) => {
        if (!itemMap[item.coload_id]) itemMap[item.coload_id] = [];
        itemMap[item.coload_id].push(item);
      });
    }

    const data = (coloads ?? []).map((c: any) => ({ ...c, items: itemMap[c.id] ?? [] }));
    return NextResponse.json({ data, total: count ?? 0, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireRouteAccess({ minimumRole: 'operator' });
    if (auth.errorResponse) return auth.errorResponse;

    const { supabase, profile, user } = auth;
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];
    const coloadData = sanitizeColoadRecord(body);

    const coload_number = await nextColoadNumber(supabase);

    const { data: coload, error } = await supabase
      .from('coloading')
      .insert({ ...coloadData, company_id: profile.company_id, created_by: user.id, coload_number })
      .select()
      .single();

    if (error) throw error;

    if (items.length > 0) {
      const itemRows = buildColoadItemRows(items, profile.company_id, coload.id);
      const { error: itemError } = await supabase.from('coloading_items').insert(itemRows);
      if (itemError) {
        await supabase
          .from('coloading')
          .delete()
          .eq('id', coload.id)
          .eq('company_id', profile.company_id);
        throw itemError;
      }
    }

    const hydratedItems = await hydrateColoadItems(supabase, buildColoadItemRows(items, profile.company_id, coload.id));
    return NextResponse.json({ data: { ...coload, items: hydratedItems }, error: null }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
