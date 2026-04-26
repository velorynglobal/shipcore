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

    // Fetch items for each coload
    const ids = (coloads ?? []).map((c: any) => c.id);
    let itemMap: Record<string, any[]> = {};
    if (ids.length > 0) {
      const { data: items } = await supabase
        .from('coloading_items')
        .select('*')
        .in('coload_id', ids)
        .order('created_at', { ascending: true });
      (items ?? []).forEach((item: any) => {
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
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('company_id, role').eq('id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (profile.role === 'viewer') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

    const body = await request.json();
    const { items, ...coloadData } = body;

    // Generate coload number
    const year  = new Date().getFullYear();
    const { count } = await supabase.from('coloading').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id);
    const seq   = String((count ?? 0) + 1).padStart(4, '0');
    const coload_number = `CL-${year}-${seq}`;

    const { data: coload, error } = await supabase
      .from('coloading')
      .insert({ ...coloadData, company_id: profile.company_id, created_by: user.id, coload_number })
      .select()
      .single();

    if (error) throw error;

    // Insert items
    if (items?.length > 0) {
      const itemRows = items.map((it: any) => ({
        ...it, coload_id: coload.id, company_id: profile.company_id,
      }));
      const { error: itemError } = await supabase.from('coloading_items').insert(itemRows);
      if (itemError) console.error('Items insert error:', itemError);
    }

    return NextResponse.json({ data: coload, error: null }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
