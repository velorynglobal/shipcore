import PDFDocument from 'pdfkit';
import type { Invoice, Company } from '@/types';

// ============================================================
// India Tax Invoice PDF — Rule 46 Compliant
// CGST + SGST for intra-state, IGST for inter-state
// ============================================================

interface TaxBreakup {
  type: 'intra' | 'inter' | 'none';
  cgst_rate?: number;
  cgst_amount?: number;
  sgst_rate?: number;
  sgst_amount?: number;
  igst_rate?: number;
  igst_amount?: number;
}

function computeTaxBreakup(invoice: Invoice): TaxBreakup {
  const igstAmount = (invoice as any).igst_amount as number | undefined;
  const igstRate = (invoice as any).igst_rate as number | undefined;

  if (igstAmount && igstAmount > 0) {
    return {
      type: 'inter',
      igst_rate: igstRate || invoice.gst_rate,
      igst_amount: igstAmount,
    };
  }

  if (invoice.gst_amount > 0) {
    const half = invoice.gst_amount / 2;
    const halfRate = invoice.gst_rate / 2;
    return {
      type: 'intra',
      cgst_rate: halfRate,
      cgst_amount: half,
      sgst_rate: halfRate,
      sgst_amount: half,
    };
  }

  return { type: 'none' };
}

export async function generateInvoicePDF(
  invoice: Invoice,
  company: Company
): Promise<Buffer> {
  const doc = new PDFDocument({ size: 'A4', margin: 40 });
  const chunks: Buffer[] = [];

  await new Promise<void>((resolve, reject) => {
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve());
    doc.on('error', reject);

    const pageWidth = 515;
    const brand = {
      dark: '#0A0F1E',
      primary: '#1D4ED8',
      accent: '#3B82F6',
      gray: '#64748B',
      light: '#F8FAFC',
      border: '#E2E8F0',
      white: '#FFFFFF',
      green: '#10B981',
    };
    let y = 40;

    // ── HEADER BAR ───────────────────────────────────────
    doc.rect(40, y, pageWidth, 85).fill(brand.dark);

    // Company name (left)
    doc.fillColor(brand.white).fontSize(16).font('Helvetica-Bold')
       .text(company.name || 'Company Name', 50, y + 10, { width: 250 });

    doc.fillColor(brand.accent).fontSize(9).font('Helvetica')
       .text('ShipCore ERP', 50, y + 30);

    // Company details
    const companyInfo: string[] = [];
    if (company.address) companyInfo.push(company.address);
    if (company.gst_number) companyInfo.push(`GSTIN: ${company.gst_number}`);
    if (company.phone) companyInfo.push(`Ph: ${company.phone}`);
    if (company.email) companyInfo.push(company.email);

    doc.fillColor('#94A3B8').fontSize(8).font('Helvetica')
       .text(companyInfo.join(' • '), 50, y + 44, { width: 300 });

    // TAX INVOICE label (right)
    doc.fillColor(brand.white).fontSize(22).font('Helvetica-Bold')
       .text('TAX INVOICE', 300, y + 10, { width: 255, align: 'right' });
    doc.fillColor(brand.accent).fontSize(10).font('Helvetica')
       .text('(Rule 46 Compliant)', 300, y + 36, { width: 255, align: 'right' });

    y += 95;

    // ── INVOICE META BOXES ───────────────────────────────
    const metaFields = [
      { label: 'Invoice No.', value: invoice.invoice_number },
      { label: 'Date', value: new Date(invoice.created_at).toLocaleDateString('en-IN') },
      { label: 'Due Date', value: invoice.due_date ? new Date(invoice.due_date).toLocaleDateString('en-IN') : '—' },
      { label: 'Status', value: (invoice.status || '').toUpperCase() },
      { label: 'Type', value: invoice.invoice_type === 'sales' ? 'SALES' : (invoice.invoice_type || '').toUpperCase() },
    ];

    const metaW = pageWidth / 5;
    metaFields.forEach((m, i) => {
      const mx = 40 + i * metaW;
      doc.rect(mx, y, metaW - 2, 44).stroke(brand.border);
      doc.fillColor(brand.gray).fontSize(7).font('Helvetica-Bold')
         .text(m.label, mx + 5, y + 6);
      doc.fillColor(brand.dark).fontSize(11).font('Helvetica-Bold')
         .text(m.value, mx + 5, y + 22, { width: metaW - 12 });
    });
    y += 54;

    // ── BILL TO / SHIP TO ───────────────────────────────
    doc.rect(40, y, pageWidth, 14).fill(brand.primary);
    doc.fillColor(brand.white).fontSize(8).font('Helvetica-Bold')
       .text('BILL TO', 45, y + 4);
    y += 14;

    const custInfo: string[] = [];
    if (invoice.customer?.company_name) custInfo.push(invoice.customer.company_name);
    if (invoice.customer?.address) custInfo.push(invoice.customer.address);
    if (invoice.customer?.gst_number) custInfo.push(`GSTIN: ${invoice.customer.gst_number}`);
    if (invoice.customer?.city) custInfo.push(`Place of Supply: ${invoice.customer.city}`);

    const billH = 16 + custInfo.length * 14;
    doc.rect(40, y, pageWidth, billH).stroke(brand.border);
    custInfo.forEach((line, i) => {
      doc.fillColor(i === 0 ? brand.dark : brand.gray)
         .fontSize(i === 0 ? 10 : 8)
         .font(i === 0 ? 'Helvetica-Bold' : 'Helvetica')
         .text(line, 45, y + 8 + i * 14, { width: pageWidth - 10 });
    });
    y += billH + 10;

    // ── LINE ITEMS TABLE ─────────────────────────────────
    const tableCols = [
      { x: 40,  w: 30, label: '#',    align: 'center' as const },
      { x: 70,  w: 185, label: 'Description / SAC', align: 'left' as const },
      { x: 255, w: 50, label: 'Qty',  align: 'right' as const },
      { x: 305, w: 50, label: 'Unit', align: 'center' as const },
      { x: 355, w: 70, label: 'Rate', align: 'right' as const },
      { x: 425, w: 90, label: 'Amount (₹)', align: 'right' as const },
    ];

    // Header row
    doc.rect(40, y, pageWidth, 18).fill(brand.primary);
    tableCols.forEach(col => {
      doc.fillColor(brand.white).fontSize(7).font('Helvetica-Bold')
         .text(col.label, col.x, y + 6, { width: col.w, align: col.align });
    });
    y += 18;

    // Data rows
    const items = invoice.line_items || [];
    if (items.length === 0) {
      doc.rect(40, y, pageWidth, 28).stroke(brand.border);
      doc.fillColor(brand.gray).fontSize(9).font('Helvetica')
         .text('No line items', 40, y + 10, { width: pageWidth, align: 'center' });
      y += 28;
    } else {
      items.forEach((item, i) => {
        const rowH = 26;
        if (i % 2 === 0) {
          doc.rect(40, y, pageWidth, rowH).fill('#F8FAFC');
        }
        doc.rect(40, y, pageWidth, rowH).stroke(brand.border);

        const rowData = [
          String(i + 1),
          item.description,
          String(item.quantity),
          item.unit,
          item.rate.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
          item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }),
        ];

        tableCols.forEach((col, ci) => {
          doc.fillColor(brand.dark).fontSize(8).font('Helvetica')
             .text(rowData[ci], col.x + 2, y + 8, { width: col.w - 4, align: col.align });
        });
        y += rowH;
      });
    }

    y += 8;

    // ── TOTALS BOX ───────────────────────────────────────
    const totalsW = 220;
    const totalsX = 40 + pageWidth - totalsW;

    const tax = computeTaxBreakup(invoice);

    const totalsRows: [string, string, boolean, string?][] = [
      ['Taxable Amount', invoice.taxable_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), false],
    ];

    if (tax.type === 'intra') {
      totalsRows.push(
        [`CGST @ ${tax.cgst_rate}%`, (tax.cgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), false],
        [`SGST @ ${tax.sgst_rate}%`, (tax.sgst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }), false],
      );
    } else if (tax.type === 'inter') {
      totalsRows.push(
        [`IGST @ ${tax.igst_rate}%`, (tax.igst_amount || invoice.gst_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 }), false],
      );
    } else if (invoice.gst_amount > 0) {
      totalsRows.push(
        [`GST @ ${invoice.gst_rate}%`, invoice.gst_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), false],
      );
    }

    totalsRows.push(
      ['TOTAL', invoice.total_amount.toLocaleString('en-IN', { minimumFractionDigits: 2 }), true, brand.primary],
    );

    totalsRows.forEach(([label, value, isBold, bgColor]) => {
      const rh = isBold ? 28 : 22;
      if (isBold && bgColor) {
        doc.rect(totalsX, y, totalsW, rh).fill(bgColor);
        doc.fillColor(brand.white).fontSize(11).font('Helvetica-Bold')
           .text(label, totalsX + 10, y + 8);
        doc.fillColor(brand.white).fontSize(11).font('Helvetica-Bold')
           .text(`₹ ${value}`, totalsX, y + 8, { width: totalsW - 10, align: 'right' });
      } else {
        doc.rect(totalsX, y, totalsW, rh).stroke(brand.border);
        doc.fillColor(brand.gray).fontSize(8).font('Helvetica')
           .text(label, totalsX + 10, y + 7);
        doc.fillColor(brand.dark).fontSize(9).font('Helvetica')
           .text(`₹ ${value}`, totalsX, y + 7, { width: totalsW - 10, align: 'right' });
      }
      y += rh;
    });

    y += 16;

    // ── AMOUNT IN WORDS ──────────────────────────────────
    doc.fillColor(brand.gray).fontSize(8).font('Helvetica-Bold')
       .text('Amount in words:', 40, y);
    doc.fillColor(brand.dark).fontSize(9).font('Helvetica')
       .text(`Rupees ${numberToWords(invoice.total_amount)} Only`, 40, y + 12, { width: pageWidth });

    y += 35;

    // ── TERMS & NOTES ────────────────────────────────────
    doc.fillColor(brand.gray).fontSize(7).font('Helvetica')
       .text('Terms: Payment due within 30 days. Interest @ 24% p.a. on overdue amounts.', 40, y);
    y += 12;
    doc.fillColor(brand.gray).fontSize(7).font('Helvetica')
       .text('This is a computer-generated invoice and does not require a physical signature.', 40, y);

    if (invoice.notes) {
      y += 16;
      doc.fillColor(brand.dark).fontSize(8).font('Helvetica-Bold').text('Notes:', 40, y);
      doc.fillColor(brand.gray).fontSize(8).font('Helvetica')
         .text(invoice.notes, 40, y + 12, { width: pageWidth });
    }

    // ── BANK DETAILS ────────────────────────────────────
    y = 730;
    doc.rect(40, y, pageWidth, 0.5).fill(brand.border);
    y += 6;

    doc.fillColor(brand.gray).fontSize(7).font('Helvetica')
       .text('Bank: HDFC Bank | A/C: 5010XXXXXXXX2345 | IFSC: HDFC0001234 | Branch: Mumbai', 40, y, { width: pageWidth, align: 'center' });

    // ── FOOTER ──────────────────────────────────────────
    doc.rect(40, 750, pageWidth, 0.5).fill(brand.border);
    doc.fillColor(brand.gray).fontSize(7).font('Helvetica')
       .text(`${company.name} • ${company.phone || ''} • ${company.email || ''}`, 40, 756, { width: pageWidth, align: 'center' })
       .text(`Generated by ShipCore ERP • ${new Date().toISOString().split('T')[0]}`, 40, 768, { width: pageWidth, align: 'center' });

    doc.end();
  });

  return Buffer.concat(chunks);
}

// ── Indian Number-to-Words (Lakh/Crore) ──────────────────
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
const TEENS = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function convertHundreds(n: number): string {
  let result = '';
  if (n >= 100) {
    result += `${ONES[Math.floor(n / 100)]} Hundred `;
    n %= 100;
  }
  if (n >= 20) {
    result += `${TENS[Math.floor(n / 10)]} `;
    n %= 10;
  }
  if (n >= 10) {
    result += `${TEENS[n - 10]} `;
  } else if (n > 0) {
    result += `${ONES[n]} `;
  }
  return result;
}

function numberToWords(num: number): string {
  if (num === 0) return 'Zero';
  const whole = Math.floor(num);
  const parts: string[] = [];

  let n = whole;
  const crore = Math.floor(n / 10000000);
  if (crore > 0) { parts.push(`${convertHundreds(crore)}Crore`); n %= 10000000; }
  const lakh = Math.floor(n / 100000);
  if (lakh > 0) { parts.push(`${convertHundreds(lakh)}Lakh`); n %= 100000; }
  const thousand = Math.floor(n / 1000);
  if (thousand > 0) { parts.push(`${convertHundreds(thousand)}Thousand`); n %= 1000; }
  if (n > 0) parts.push(convertHundreds(n));

  return parts.join(' ').trim();
}