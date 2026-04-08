/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// ── Send WhatsApp via WATI ─────────────────────────────────
async function sendWhatsApp(to: string, message: string): Promise<{ ok: boolean; error?: string }> {
  const apiUrl   = process.env.WHATSAPP_API_URL;
  const apiToken = process.env.WHATSAPP_API_TOKEN;

  if (!apiUrl || !apiToken) {
    return { ok: false, error: 'WhatsApp not configured. Add WHATSAPP_API_URL and WHATSAPP_API_TOKEN to env.' };
  }

  try {
    const phone = to.replace(/[^0-9]/g, ''); // strip non-digits
    const res = await fetch(`${apiUrl}/sendSessionMessage/${phone}`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ messageText: message }),
    });

    if (!res.ok) {
      const err = await res.text();
      return { ok: false, error: err };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── Send Email via Resend ──────────────────────────────────
async function sendEmail(to: string, subject: string, html: string): Promise<{ ok: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from   = process.env.EMAIL_FROM || 'noreply@shipcore.app';

  if (!apiKey) {
    return { ok: false, error: 'Email not configured. Add RESEND_API_KEY to env.' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!res.ok) {
      const err = await res.json();
      return { ok: false, error: err.message || 'Email send failed' };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

// ── GET - list notifications ───────────────────────────────
export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const page    = parseInt(searchParams.get('page') || '1');
    const perPage = parseInt(searchParams.get('per_page') || '20');
    const offset  = (page - 1) * perPage;

    const { data, error, count } = await supabase
      .from('notifications')
      .select('*, job:jobs(id, job_number), invoice:invoices(id, invoice_number)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + perPage - 1);

    if (error) throw error;
    return NextResponse.json({ data: data || [], total: count || 0, page, per_page: perPage, error: null });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ── POST - send notification ───────────────────────────────
export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase.from('users').select('company_id, role').eq('id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    if (profile.role === 'viewer') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });

    const body = await request.json();
    const { type, recipient, subject, message, job_id, invoice_id } = body;

    if (!type || !recipient || !message) {
      return NextResponse.json({ error: 'type, recipient, and message are required' }, { status: 400 });
    }

    const companyId: string = profile.company_id;

    // Create notification record
    const { data: notif, error: notifErr } = await supabase.from('notifications').insert({
      company_id:  companyId,
      type, recipient, subject, message,
      job_id:      job_id || null,
      invoice_id:  invoice_id || null,
      created_by:  user.id,
      status:      'pending',
    }).select().single();

    if (notifErr) throw notifErr;

    // Actually send
    let result: { ok: boolean; error?: string };

    if (type === 'whatsapp') {
      result = await sendWhatsApp(recipient, message);
    } else {
      result = await sendEmail(recipient, subject || 'Message from ShipCore', `<p>${message.replace(/\n/g, '<br>')}</p>`);
    }

    // Update status
    await supabase.from('notifications').update({
      status:        result.ok ? 'sent' : 'failed',
      error_message: result.error || null,
      sent_at:       result.ok ? new Date().toISOString() : null,
    }).eq('id', notif.id);

    if (!result.ok) {
      return NextResponse.json({
        data:    notif,
        warning: result.error,
        message: 'Notification saved but delivery failed. Check env config.',
        error:   null,
      }, { status: 207 });
    }

    return NextResponse.json({
      data:    notif,
      message: `${type === 'whatsapp' ? 'WhatsApp' : 'Email'} sent successfully`,
      error:   null,
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
