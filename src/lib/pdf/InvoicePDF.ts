import PDFDocument from 'pdfkit';
import type { Invoice } from '@/types';

export async function generateInvoicePDF(invoice: Invoice): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    doc.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.fontSize(18).text(`Invoice: ${invoice.invoice_number ?? ''}`, { align: 'left' });
    doc.text(`Customer: ${invoice.customer?.company_name ?? ''}`);
    doc.text(`Total: ${invoice.total_amount ?? 0}`);
    doc.end();
  });
}
