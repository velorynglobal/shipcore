/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// POST /api/notifications/quick
// Body: { type: 'hbl'|'invoice', job_id/invoice_id, recipient, channel: 'whatsapp'|'email' }
export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { doc_type, doc_id, recipient, channel } = body;

    if (!doc_type || !doc_id || !recipient || !channel) {
      return NextResponse.json({ error: 'doc_type, doc_id, recipient, channel required' }, { status: 400 });
    }

    let subject = '';
    let message = '';
    let job_id  = null;
    let invoice_id = null;

    if (doc_type === 'hbl') {
      const { data: job } = await supabase.from('jobs')
        .select('job_number, hbl_number, pol, pod, eta, customer:customers(company_name)')
        .eq('id', doc_id).single();

      if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      job_id = doc_id;

      subject = `House Bill of Lading - ${job.hbl_number || job.job_number}`;
      message = `Dear ${(job.customer as any)?.company_name || 'Valued Customer'},\n\nPlease find your House Bill of Lading details below:\n\nHBL No: ${job.hbl_number || job.job_number}\nJob No: ${job.job_number}\nPOL: ${job.pol}\nPOD: ${job.pod}\nETA: ${job.eta || 'TBA'}\n\nDownload HBL: ${process.env.NEXT_PUBLIC_APP_URL}/api/documents/hbl/${doc_id}\n\nRegards,\nShipCore ERP\nVerloryn Global Logistics`;

    } else if (doc_type === 'invoice') {
      const { data: inv } = await supabase.from('invoices')
        .select('invoice_number, total_amount, due_date, customer:customers(company_name)')
        .eq('id', doc_id).single();

      if (!inv) return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      invoice_id = doc_id;

      subject = `Invoice ${inv.invoice_number} - Payment Due`;
      message = `Dear ${(inv.customer as any)?.company_name || 'Valued Customer'},\n\nPlease find your invoice details:\n\nInvoice No: ${inv.invoice_number}\nAmount: ₹${inv.total_amount?.toLocaleString()}\nDue Date: ${inv.due_date || 'On Receipt'}\n\nDownload Invoice: ${process.env.NEXT_PUBLIC_APP_URL}/api/documents/invoice/${doc_id}\n\nRegards,\nShipCore ERP\nVeloryn Global Logistics`;
    }

    // Delegate to main notifications endpoint
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/notifications`, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie':       request.headers.get('cookie') || '',
      },
      body: JSON.stringify({ type: channel, recipient, subject, message, job_id, invoice_id }),
    });

    const json = await res.json();
    return NextResponse.json(json, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
