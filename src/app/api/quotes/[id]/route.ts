import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerSupabaseClient();
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Quote ID required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        customer: customers (id, company_name, contact_person, email, phone)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
