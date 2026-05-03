import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase-server';
import { sendEmail, type EmailMessage } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const supabase = createAdminClient();
    
    // Get current user and verify admin role
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from('users')
      .select('company_id, role')
      .eq('id', user.id)
      .single();
    
    if (!profile || profile.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { email, role = 'operator' } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    if (!['admin', 'operator', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 409 });
    }

    // Generate invite link (Supabase magic link)
    const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        company_id: profile.company_id,
        role: role,
        invited_by: user.id,
      },
    });

    if (inviteError) {
      throw inviteError;
    }

    // Send custom invite email
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL}/login?invite_token=${inviteData?.properties?.action_link || ''}`;
    
    const emailMsg: EmailMessage = {
      to: email,
      subject: 'Invitation to join ShipCore ERP',
      html: buildInviteEmail(inviteLink, role),
    };

    await sendEmail(emailMsg);

    // Log the invitation in a tracking table (optional)
    await supabase.from('agent_messages').insert({
      company_id: profile.company_id,
      from_agent: 'system',
      to_agent: 'admin',
      message_type: 'notification',
      subject: `User invited: ${email}`,
      payload: { email, role, invited_by: user.id },
      status: 'completed',
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ 
      success: true, 
      message: `Invitation sent to ${email}` 
    });

  } catch (err: any) {
    console.error('Invite error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

function buildInviteEmail(inviteLink: string, role: string): string {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px; max-width: 600px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #1e40af;">ShipCore ERP</h1>
        <p style="color: #666;">Smart Logistics ERP for LCL, CHA & Freight Forwarders</p>
      </div>
      
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
        <h2>You've been invited!</h2>
        <p>You have been invited to join ShipCore ERP as a <strong>${role}</strong>.</p>
        <p>Click the button below to set up your account:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${inviteLink}" style="background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
            Accept Invitation
          </a>
        </div>
        
        <p style="color: #666; font-size: 14px;">
          Or copy this link: <a href="${inviteLink}">${inviteLink}</a>
        </p>
      </div>
      
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
        <p style="color: #666; font-size: 12px;">
          This invitation will expire in 24 hours.<br/>
          If you didn't expect this invitation, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;
}
