/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { requireRouteAccess } from '@/lib/route-auth';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const { data, error } = await supabase.from('customers').select('*').eq('id', params.id).single();
    if (error || !data) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireRouteAccess({ minimumRole: 'operator' });
    if (auth.errorResponse) return auth.errorResponse;

    const { profile, supabase } = auth;
    const body = await request.json();
    const { company_name, contact_person, mobile, email, address, city, gst_number, credit_limit, is_active } = body;
    if (!company_name) return NextResponse.json({ error: 'Company name is required' }, { status: 400 });
    if (is_active !== undefined && profile.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can change active status' }, { status: 403 });
    }
    const { data, error } = await supabase.from('customers')
      .update({ company_name, contact_person, mobile, email, address, city, gst_number, credit_limit, is_active })
      .eq('id', params.id).select().single();
    if (error) throw error;
    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireRouteAccess({ minimumRole: 'admin' });
    if (auth.errorResponse) return auth.errorResponse;

    const { supabase } = auth;
    await supabase.from('customers').update({ is_active: false }).eq('id', params.id);
    return NextResponse.json({ data: { id: params.id }, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
