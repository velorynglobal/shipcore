import axios from 'axios';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://shipcore.vercel.app';

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  attachment?: {
    content: Buffer;
    filename: string;
    type: string;
  };
}

export async function sendEmail(msg: EmailMessage): Promise<boolean> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) {
    console.warn('RESEND_API_KEY not configured');
    return false;
  }

  try {
    const res = await axios.post(
      'https://api.resend.com/emails',
      {
        from: 'ShipCore <noreply@shipcore.vercel.app>',
        to: Array.isArray(msg.to) ? msg.to : [msg.to],
        subject: msg.subject,
        html: msg.html,
        text: msg.text,
        attachments: msg.attachment
          ? [
              {
                content: msg.attachment.content.toString('base64'),
                filename: msg.attachment.filename,
                type: msg.attachment.type,
              },
            ]
          : undefined,
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
      }
    );
    return res.status === 200;
  } catch (err) {
    console.error('Email send error:', err);
    return false;
  }
}

// Invoice email template
export function buildInvoiceEmail(invoiceNumber: string, customerName: string): string {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Invoice ${invoiceNumber}</h2>
      <p>Dear ${customerName},</p>
      <p>Your invoice is ready. Please find the attached PDF.</p>
      <p><a href="${APP_URL}/invoices/${invoiceNumber}">View Online</a></p>
      <p>Thanks,<br/>ShipCore Team</p>
    </div>
  `;
}

// Quote email template
export function buildQuoteEmail(quoteNumber: string, customerName: string): string {
  return `
    <div style="font-family: Arial, sans-serif; padding: 20px;">
      <h2>Quote ${quoteNumber}</h2>
      <p>Dear ${customerName},</p>
      <p>Please find your quote attached.</p>
      <p><a href="${APP_URL}/quotes/${quoteNumber}">View Online</a></p>
      <p>Thanks,<br/>ShipCore Team</p>
    </div>
  `;
}

// Invite email template
export function buildInviteEmail(inviteLink: string, role: string): string {
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
