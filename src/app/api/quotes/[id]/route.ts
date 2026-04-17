/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(id, company_name, email, mobile, gst_number),
        enquiry:enquiries(id, enquiry_number, origin, destination, cargo_type, cbm, weight, packages, commodity),
        job:jobs(id, job_number)
      `)
      .eq('id', params.id)
      .single();

    if (error || !data) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();

    // Recalculate margin if rates changed
    if (body.buy_rate !== undefined || body.sell_rate !== undefined) {
      const { data: existing } = await supabase.from('quotes').select('buy_rate, sell_rate').eq('id', params.id).single();
      const buyRate  = Number(body.buy_rate  ?? existing?.buy_rate)  || 0;
      const sellRate = Number(body.sell_rate ?? existing?.sell_rate) || 0;
      body.margin     = sellRate - buyRate;
      body.margin_pct = buyRate > 0 ? Math.round(((sellRate - buyRate) / buyRate) * 10000) / 100 : 0;
    }

    // Handle status changes
    if (body.status === 'accepted')  body.accepted_at = new Date().toISOString();
    if (body.status === 'sent')      body.sent_at     = new Date().toISOString();

    const { data, error } = await supabase
      .from('quotes')
      .update(body)
      .eq('id', params.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST to /api/quotes/[id]/convert — convert accepted quote to a Job
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('company_id').eq('id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const { data: quote } = await supabase
      .from('quotes')
      .select('*, enquiry:enquiries(id, enquiry_number, origin, destination, cargo_type, cbm, weight, packages, commodity), customer:customers(id, company_name, email, mobile, gst_number)')
      .eq('id', params.id)
      .single();

    if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    if (quote.status !== 'accepted') return NextResponse.json({ error: 'Only accepted quotes can be converted' }, { status: 400 });
    if (quote.job_id) return NextResponse.json({ error: 'Quote already converted to job' }, { status: 400 });

    // Generate job number
    const year = new Date().getFullYear();
    const { count } = await supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('company_id', profile.company_id);
    const jobNumber = `SC/IMP/${year}/${String((count || 0) + 1).padStart(4, '0')}`;

    const enq = quote.enquiry as any;
    const { data: job, error: jobErr } = await supabase.from('jobs').insert({
      company_id:        profile.company_id,
      job_number:        jobNumber,
      job_type:          'IMP',
      status:            'booking_confirmed',
      customer_id:       quote.customer_id,
      agent_id:          null,
      pol:               quote.origin || enq?.origin || '',
      pod:               quote.destination || enq?.destination || '',
      cargo_description: enq?.commodity || '',
      cbm:               quote.cbm || enq?.cbm || 0,
      gross_weight:      quote.weight || enq?.weight || 0,
      packages:          enq?.packages || 0,
      buy_total:         quote.buy_rate || 0,
      sell_total:        quote.sell_rate || 0,
      profit:            quote.margin || 0,
      enquiry_id:        quote.enquiry_id,
      quote_id:          quote.id,
      created_by:        user.id,
    }).select().single();

    if (jobErr) throw jobErr;

    // Link job back to quote and mark converted
    await supabase.from('quotes').update({ job_id: job.id, status: 'converted' }).eq('id', params.id);

    // Update enquiry to won
    if (quote.enquiry_id) {
      await supabase.from('enquiries').update({ status: 'won' }).eq('id', quote.enquiry_id);
    }

    return NextResponse.json({ data: job, message: `Job ${jobNumber} created from quote`, error: null }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
