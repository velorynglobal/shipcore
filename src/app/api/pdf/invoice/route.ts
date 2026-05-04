/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateInvoicePDF } from '@/lib/pdf/InvoicePDF';
import { sendEmail, buildInvoiceEmail, type EmailMessage } from '@/lib/email';
import { pdfLimiter } from '@/lib/rate-limit';

export async function POST(request: Request) {
  try {
    // Apply rate limiting
    const { limited, remaining, resetTime } = await pdfLimiter(request);
    if (limited) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((resetTime - Date.now()) / 1000).toString(),
          'X-RateLimit-Remaining': '0',
        },
      });
    }

    const { invoice, email_to } = await request.json();
    if (!invoice) {
      return new Response(JSON.stringify({ error: 'invoice payload required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const pdfBuffer = await generateInvoicePDF(invoice as any);

    // Optionally send email with PDF attachment
    if (email_to) {
      const emailMsg: EmailMessage = {
        to: email_to,
        subject: `Invoice ${invoice.invoice_number || 'N/A'}`,
        html: buildInvoiceEmail(invoice.invoice_number || 'N/A', invoice.customer?.company_name || ''),
        attachment: {
          content: pdfBuffer,
          filename: `invoice_${invoice.invoice_number || 'N/A'}.pdf`,
          type: 'application/pdf',
        },
      };
      await sendEmail(emailMsg);
    }

    return new Response(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="invoice.pdf"',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Failed to generate invoice pdf' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
