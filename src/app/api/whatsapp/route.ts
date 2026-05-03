import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient();
    
    // Parse WhatsApp webhook payload (Twilio/WATI format)
    const payload = await request.json();
    
    // Extract message details (adjust based on your provider)
    const { from, text, message_id } = payload;
    
    if (!from || !text) {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // Create enquiry from WhatsApp message
    const { data: enquiry, error } = await supabase
      .from('enquiries')
      .insert({
        customer_name: from, // You might want to look up customer by phone
        description: text,
        source: 'whatsapp',
        phone: from,
        status: 'new',
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) throw error;

    // Notify Komal agent about new enquiry
    await supabase.from('agent_messages').insert({
      company_id: '00000000-0000-0000-0000-000000000000', // Replace with actual company_id
      from_agent: 'system',
      to_agent: 'komal_agent',
      message_type: 'notification',
      subject: 'New WhatsApp Enquiry',
      payload: { enquiry_id: enquiry.id, from, text },
      status: 'pending',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true, enquiry_id: enquiry.id });
  } catch (err: any) {
    console.error('WhatsApp webhook error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  // WhatsApp webhook verification (for Twilio/WATI)
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  
  return new Response('Verification failed', { status: 403 });
}
