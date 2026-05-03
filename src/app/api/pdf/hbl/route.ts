/* eslint-disable @typescript-eslint/no-explicit-any */
import { generateHBLPDF } from '@/lib/pdf/HBLPDF';
import { sendEmail, type EmailMessage } from '@/lib/email';

export async function POST(request: Request) {
  try {
    const { hbl, email_to } = await request.json();
    if (!hbl) {
      return new Response(JSON.stringify({ error: 'hbl payload required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const pdfBuffer = await generateHBLPDF(hbl as any);

    // Optionally send email with PDF attachment
    if (email_to) {
      const emailMsg: EmailMessage = {
        to: email_to,
        subject: `HBL ${hbl.hbl_number || 'N/A'}`,
        text: `Please find the HBL document attached.`,
        attachment: {
          content: pdfBuffer,
          filename: `hbl_${hbl.hbl_number || 'N/A'}.pdf`,
          type: 'application/pdf',
        },
      };
      await sendEmail(emailMsg);
    }

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="hbl.pdf"',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Failed to generate hbl pdf' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
    const pdfBuffer = await generateHBLPDF(hbl as any);
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="hbl.pdf"',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? 'Failed to generate hbl pdf' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
