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
      return NextResponse.json({ error: 'HBL ID required' }, { status: 400 });
    }

    // Assuming HBL data is in customs_entries or a dedicated hbl table
    // For now, return a mock structure that matches what HBLDownloader expects
    const { data, error } = await supabase
      .from('customs_entries')
      .select(`
        *,
        job: jobs (id, job_number, customer: customers (company_name))
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) {
      return NextResponse.json({ error: 'HBL not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
