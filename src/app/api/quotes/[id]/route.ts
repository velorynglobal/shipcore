/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { requireRouteAccess } from '@/lib/route-auth';
import { nextJobNumber } from '@/lib/numbering';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const supabase = createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, error } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(id, company_name, email, mobile, gst_number),
        enquiry:enquiries(id, enquiry_number, origin, destination, cargo_type, cbm, weight, packages, commodity),
        job:jobs!job_id(id, job_number)
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
    const auth = await requireRouteAccess({ minimumRole: 'operator' });
    if (auth.errorResponse) return auth.errorResponse;

    const { supabase, profile } = auth;
    const body = await request.json();
    const {
      id,
      company_id,
      created_at,
      created_by,
      quote_number,
      customer,
      enquiry,
      job,
      ...updates
    } = body;
    void id;
    void company_id;
    void created_at;
    void created_by;
    void quote_number;
    void customer;
    void enquiry;
    void job;

    if (updates.buy_rate !== undefined || updates.sell_rate !== undefined) {
      const { data: existing } = await supabase
        .from('quotes')
        .select('buy_rate, sell_rate')
        .eq('id', params.id)
        .single();

      const buyRate = Number(updates.buy_rate ?? existing?.buy_rate) || 0;
      const sellRate = Number(updates.sell_rate ?? existing?.sell_rate) || 0;
      updates.margin = sellRate - buyRate;
      updates.margin_pct = buyRate > 0 ? Math.round(((sellRate - buyRate) / buyRate) * 10000) / 100 : 0;
    }

    if (updates.status === 'accepted') updates.accepted_at = new Date().toISOString();
    if (updates.status === 'sent') updates.sent_at = new Date().toISOString();
    if (updates.status === 'rejected') updates.rejected_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('quotes')
      .update(updates)
      .eq('id', params.id)
      .eq('company_id', profile.company_id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ data, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(_request: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await requireRouteAccess({ minimumRole: 'operator' });
    if (auth.errorResponse) return auth.errorResponse;

    const { supabase, profile, user } = auth;
    const { data: quote } = await supabase
      .from('quotes')
      .select(
        '*, enquiry:enquiries(id, enquiry_number, origin, destination, cargo_type, cbm, weight, packages, commodity), customer:customers(id, company_name, email, mobile, gst_number)'
      )
      .eq('id', params.id)
      .eq('company_id', profile.company_id)
      .single();

    if (!quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    if (quote.status !== 'accepted') {
      return NextResponse.json({ error: 'Only accepted quotes can be converted' }, { status: 400 });
    }
    if (quote.job_id) {
      return NextResponse.json({ error: 'Quote already converted to job' }, { status: 400 });
    }

    const jobNumber = await nextJobNumber(supabase, 'IMP');

    const enquiry = quote.enquiry as any;
    const { data: job, error: jobErr } = await supabase
      .from('jobs')
      .insert({
        company_id: profile.company_id,
        job_number: jobNumber,
        job_type: 'IMP',
        status: 'booked',
        customer_id: quote.customer_id,
        agent_id: null,
        pol: quote.origin || enquiry?.origin || '',
        pod: quote.destination || enquiry?.destination || '',
        cargo_description: enquiry?.commodity || 'Quoted shipment',
        commodity: enquiry?.commodity || null,
        cbm: quote.cbm || enquiry?.cbm || 0,
        gross_weight: quote.weight || enquiry?.weight || 0,
        packages: enquiry?.packages || 0,
        package_type: 'CTN',
        buy_total: quote.buy_rate || 0,
        sell_total: quote.sell_rate || 0,
        profit: quote.margin || 0,
        enquiry_id: quote.enquiry_id,
        quote_id: quote.id,
        created_by: user.id,
      })
      .select()
      .single();

    if (jobErr) throw jobErr;

    await supabase
      .from('quotes')
      .update({ job_id: job.id, status: 'converted' })
      .eq('id', params.id)
      .eq('company_id', profile.company_id);

    if (quote.enquiry_id) {
      await supabase
        .from('enquiries')
        .update({ status: 'won' })
        .eq('id', quote.enquiry_id)
        .eq('company_id', profile.company_id);
    }

    return NextResponse.json(
      { data: job, message: `Job ${jobNumber} created from quote`, error: null },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
