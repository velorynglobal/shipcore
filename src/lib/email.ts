import axios from 'axios';

const RESEND_API_KEY = process.env.RESEND_API_KEY;
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
  if (!RESEND_API_KEY) {
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
          Authorization: `Bearer ${RESEND_API_KEY}`,
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
