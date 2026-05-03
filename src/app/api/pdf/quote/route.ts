/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateQuotePDF } from '@/lib/pdf/QuotePDF';
import { sendEmail, buildQuoteEmail, type EmailMessage } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { quote, email_to } = await request.json();
    if (!quote) {
      return new Response(JSON.stringify({ error: 'quote payload required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const pdfBuffer = await generateQuotePDF(quote as any);

    // Optionally send email with PDF attachment
    if (email_to) {
      const emailMsg: EmailMessage = {
        to: email_to,
        subject: `Quote ${quote.quote_number || 'N/A'}`,
        html: buildQuoteEmail(quote.quote_number || 'N/A', quote.customer?.company_name || ''),
        attachment: {
          content: pdfBuffer,
          filename: `quote_${quote.quote_number || 'N/A'}.pdf`,
          type: 'application/pdf',
        },
      };
      await sendEmail(emailMsg);
    }

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="quote.pdf"',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Failed to generate quote pdf' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
