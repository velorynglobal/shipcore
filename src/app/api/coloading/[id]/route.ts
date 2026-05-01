/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { requireRouteAccess } from '@/lib/route-auth';
import { buildColoadItemRows, hydrateColoadItems, sanitizeColoadRecord } from '@/lib/coloading';

export async function GET(_request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireRouteAccess();
    if (auth.errorResponse) return auth.errorResponse;

    const { supabase, profile } = auth;
    const { data: coload, error } = await supabase
      .from('coloading')
      .select('*')
      .eq('id', params.id)
      .eq('company_id', profile.company_id)
      .single();

    if (error || !coload) return NextResponse.json({ error: 'Co-load not found' }, { status: 404 });

    const { data: rawItems } = await supabase
      .from('coloading_items')
      .select('*')
      .eq('coload_id', params.id)
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: true });

    const items = await hydrateColoadItems(supabase, rawItems ?? []);
    return NextResponse.json({ data: { ...coload, items }, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireRouteAccess({ minimumRole: 'operator' });
    if (auth.errorResponse) return auth.errorResponse;

    const { supabase, profile } = auth;
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];
    const updates = sanitizeColoadRecord(body);

    const { data: existing, error: existingError } = await supabase
      .from('coloading')
      .select('*')
      .eq('id', params.id)
      .eq('company_id', profile.company_id)
      .single();

    if (existingError || !existing) {
      return NextResponse.json({ error: 'Co-load not found' }, { status: 404 });
    }

    const { data: existingItems } = await supabase
      .from('coloading_items')
      .select('*')
      .eq('coload_id', params.id)
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: true });

    const restoreHeader = async () => {
      await supabase
        .from('coloading')
        .update(sanitizeColoadRecord(existing))
        .eq('id', params.id)
        .eq('company_id', profile.company_id);
    };

    const restoreItems = async () => {
      await supabase
        .from('coloading_items')
        .delete()
        .eq('coload_id', params.id)
        .eq('company_id', profile.company_id);

      if ((existingItems ?? []).length > 0) {
        await supabase.from('coloading_items').insert(existingItems);
      }
    };

    const { data: updated, error: updateError } = await supabase
      .from('coloading')
      .update(updates)
      .eq('id', params.id)
      .eq('company_id', profile.company_id)
      .select('*')
      .single();

    if (updateError) throw updateError;

    const { error: deleteError } = await supabase
      .from('coloading_items')
      .delete()
      .eq('coload_id', params.id)
      .eq('company_id', profile.company_id);

    if (deleteError) {
      await restoreHeader();
      throw deleteError;
    }

    if (items.length > 0) {
      const itemRows = buildColoadItemRows(items, profile.company_id, params.id);
      const { error: insertError } = await supabase.from('coloading_items').insert(itemRows);

      if (insertError) {
        await restoreHeader();
        await restoreItems();
        throw insertError;
      }
    }

    const { data: rawItems } = await supabase
      .from('coloading_items')
      .select('*')
      .eq('coload_id', params.id)
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: true });

    const hydratedItems = await hydrateColoadItems(supabase, rawItems ?? []);
    return NextResponse.json({ data: { ...updated, items: hydratedItems }, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
