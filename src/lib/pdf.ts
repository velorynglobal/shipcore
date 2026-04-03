// PDF Generation for HBL and Invoice
// Uses pdfkit on the server side (API routes only)

import { Job, Invoice, Company } from '@/types';
import { formatDate, formatCBM, formatWeight, formatCurrency } from '@/lib/utils';

// Dynamic import for server-side only
async function getPDFKit() {
  const PDFDocument = (await import('pdfkit')).default;
  return PDFDocument;
}

// ============================================================
// Colors and Fonts
// ============================================================
const BRAND = {
  primary:   '#1D4ED8', // blue-700
  dark:      '#0A0F1E', // shell-900
  gray:      '#64748B', // slate-500
  light:     '#F8FAFC', // slate-50
  border:    '#E2E8F0', // slate-200
  white:     '#FFFFFF',
  accent:    '#3B82F6', // blue-500
};

// ============================================================
// HBL PDF Generator
// ============================================================
export async function generateHBLPDF(
  job: Job,
  company: Company
): Promise<Buffer> {
  const PDFDocument = await getPDFKit();
  
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ 
      size: 'A4', 
      margin: 40,
      info: {
        Title: `House Bill of Lading - ${job.hbl_number || job.job_number}`,
        Author: company.name,
        Creator: 'ShipCore ERP',
      }
    });
    
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = 515; // A4 usable width at 40px margin
    const y = { val: 40 };
    const nl = (n = 1) => { y.val += n * 12; };

    // ── HEADER ────────────────────────────────────────────
    doc.rect(40, 40, pageWidth, 70).fill(BRAND.dark);
    
    // Company name
    doc.fillColor(BRAND.white)
       .fontSize(16)
       .font('Helvetica-Bold')
       .text(company.name, 50, 52);
    
    doc.fillColor(BRAND.accent)
       .fontSize(9)
       .font('Helvetica')
       .text('Smart Logistics ERP', 50, 72);

    if (company.address) {
      doc.fillColor('#94A3B8')
         .fontSize(8)
         .text(company.address, 50, 84);
    }

    // HBL Title (right side)
    doc.fillColor(BRAND.white)
       .fontSize(18)
       .font('Helvetica-Bold')
       .text('HOUSE BILL OF LADING', 300, 50, { width: 255, align: 'right' });
    
    doc.fillColor(BRAND.accent)
       .fontSize(10)
       .text(job.hbl_number || job.job_number, 300, 74, { width: 255, align: 'right' });

    // Watermark for draft
    if (job.status === 'draft') {
      doc.save()
         .rotate(45, { origin: [297.5, 421] })
         .fillColor('#E2E8F0')
         .fontSize(80)
         .opacity(0.15)
         .font('Helvetica-Bold')
         .text('DRAFT', 100, 350)
         .restore();
    }

    y.val = 125;

    // ── SECTION: Shipper & Consignee ─────────────────────
    const boxH = 90;
    doc.rect(40, y.val, pageWidth / 2 - 5, boxH).stroke(BRAND.border);
    doc.rect(40 + pageWidth / 2 + 5, y.val, pageWidth / 2 - 5, boxH).stroke(BRAND.border);

    // Shipper box
    doc.fillColor(BRAND.light)
       .rect(40, y.val, pageWidth / 2 - 5, 16).fill(BRAND.light);
    doc.fillColor(BRAND.gray)
       .fontSize(7)
       .font('Helvetica-Bold')
       .text('SHIPPER / EXPORTER', 45, y.val + 5);
    
    doc.fillColor(BRAND.dark)
       .fontSize(9)
       .font('Helvetica-Bold')
       .text(job.agent?.name || '—', 45, y.val + 22, { width: pageWidth / 2 - 15 });
    
    if (job.agent?.country) {
      doc.fillColor(BRAND.gray)
         .fontSize(8)
         .font('Helvetica')
         .text(`${job.agent.port}, ${job.agent.country}`, 45, y.val + 36);
    }

    // Consignee box
    const cX = 40 + pageWidth / 2 + 5;
    doc.fillColor(BRAND.light)
       .rect(cX, y.val, pageWidth / 2 - 5, 16).fill(BRAND.light);
    doc.fillColor(BRAND.gray)
       .fontSize(7)
       .font('Helvetica-Bold')
       .text('CONSIGNEE', cX + 5, y.val + 5);
    
    doc.fillColor(BRAND.dark)
       .fontSize(9)
       .font('Helvetica-Bold')
       .text(job.consignee_name || job.customer?.company_name || '—', cX + 5, y.val + 22, { width: pageWidth / 2 - 15 });

    y.val += boxH + 10;

    // ── SECTION: Routing Info ────────────────────────────
    const routingFields = [
      ['PORT OF LOADING', job.pol],
      ['PORT OF DISCHARGE', job.pod],
      ['VESSEL / VOYAGE', `${job.vessel || '—'} / ${job.voyage || '—'}`],
      ['CARRIER', job.carrier || '—'],
      ['ETD', formatDate(job.etd)],
      ['ETA', formatDate(job.eta)],
    ];

    const colW = pageWidth / 3;
    routingFields.forEach((field, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const fx = 40 + col * colW;
      const fy = y.val + row * 44;
      
      doc.rect(fx, fy, colW - 2, 40).stroke(BRAND.border);
      doc.fillColor(BRAND.gray).fontSize(7).font('Helvetica-Bold')
         .text(field[0], fx + 5, fy + 5);
      doc.fillColor(BRAND.dark).fontSize(9).font('Helvetica-Bold')
         .text(field[1], fx + 5, fy + 18, { width: colW - 15 });
    });

    y.val += 100;

    // ── SECTION: Cargo Description ───────────────────────
    doc.rect(40, y.val, pageWidth, 14).fill(BRAND.primary);
    doc.fillColor(BRAND.white).fontSize(8).font('Helvetica-Bold')
       .text('MARKS & NOS.', 45, y.val + 4)
       .text('DESCRIPTION OF PACKAGES AND GOODS', 160, y.val + 4)
       .text('GROSS WEIGHT', 360, y.val + 4)
       .text('MEASUREMENT', 445, y.val + 4);

    y.val += 14;
    doc.rect(40, y.val, pageWidth, 60).stroke(BRAND.border);

    doc.fillColor(BRAND.dark).fontSize(9).font('Helvetica')
       .text(job.container_no || 'AS PER MANIFEST', 45, y.val + 8)
       .text(`${job.packages || 0} ${job.package_type || 'PKGS'} - ${job.cargo_description}`, 160, y.val + 8, { width: 195 })
       .text(`${job.gross_weight || 0} KGS`, 360, y.val + 8)
       .text(`${job.cbm || 0} CBM`, 445, y.val + 8);

    if (job.commodity) {
      doc.fillColor(BRAND.gray).fontSize(8)
         .text(`Commodity: ${job.commodity}`, 160, y.val + 28);
    }

    y.val += 75;

    // ── SECTION: Freight & MBL ───────────────────────────
    const infoFields = [
      ['MBL NUMBER', job.mbl_number || '—'],
      ['HBL NUMBER', job.hbl_number || job.job_number],
      ['JOB REFERENCE', job.job_number],
      ['FREIGHT', 'AS ARRANGED'],
    ];

    infoFields.forEach((field, i) => {
      const fx = 40 + (i % 2) * (pageWidth / 2 + 5);
      const fy = y.val + Math.floor(i / 2) * 35;
      doc.rect(fx, fy, pageWidth / 2 - 5, 32).stroke(BRAND.border);
      doc.fillColor(BRAND.gray).fontSize(7).font('Helvetica-Bold').text(field[0], fx + 5, fy + 5);
      doc.fillColor(BRAND.dark).fontSize(9).font('Helvetica-Bold').text(field[1], fx + 5, fy + 17);
    });

    y.val += 80;

    // ── FOOTER ───────────────────────────────────────────
    y.val = 750;
    doc.rect(40, y.val, pageWidth, 0.5).fill(BRAND.border);
    doc.fillColor(BRAND.gray).fontSize(7).font('Helvetica')
       .text(`Generated by ShipCore ERP • ${company.name} • ${formatDate(new Date().toISOString())}`, 40, y.val + 8, { width: pageWidth, align: 'center' });
    
    doc.fillColor(BRAND.gray).fontSize(7)
       .text('This document is computer generated and valid without signature unless otherwise stated.', 40, y.val + 20, { width: pageWidth, align: 'center' });

    doc.end();
  });
}

// ============================================================
// Invoice PDF Generator
// ============================================================
export async function generateInvoicePDF(
  invoice: Invoice,
  company: Company
): Promise<Buffer> {
  const PDFDocument = await getPDFKit();
  
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageWidth = 515;

    // ── HEADER ────────────────────────────────────────────
    doc.rect(40, 40, pageWidth, 80).fill(BRAND.dark);
    
    doc.fillColor(BRAND.white).fontSize(18).font('Helvetica-Bold')
       .text('TAX INVOICE', 50, 50);
    doc.fillColor(BRAND.accent).fontSize(10).font('Helvetica')
       .text('ShipCore ERP', 50, 72);

    doc.fillColor(BRAND.white).fontSize(22).font('Helvetica-Bold')
       .text(company.name, 300, 50, { width: 255, align: 'right' });
    doc.fillColor('#94A3B8').fontSize(8).font('Helvetica')
       .text(company.address || '', 300, 76, { width: 255, align: 'right' });

    // Invoice number box
    doc.rect(40, 130, 250, 60).stroke(BRAND.border);
    doc.fillColor(BRAND.gray).fontSize(8).font('Helvetica-Bold')
       .text('INVOICE NUMBER', 50, 138);
    doc.fillColor(BRAND.dark).fontSize(14).font('Helvetica-Bold')
       .text(invoice.invoice_number, 50, 152);

    doc.rect(305, 130, 250, 60).stroke(BRAND.border);
    doc.fillColor(BRAND.gray).fontSize(8).font('Helvetica-Bold').text('DATE', 315, 138);
    doc.fillColor(BRAND.dark).fontSize(10).font('Helvetica-Bold')
       .text(formatDate(invoice.created_at), 315, 152);
    doc.fillColor(BRAND.gray).fontSize(8).font('Helvetica').text('DUE DATE', 315, 166);
    doc.fillColor(BRAND.dark).fontSize(9).font('Helvetica')
       .text(formatDate(invoice.due_date), 315, 176);

    // Bill To
    let y = 210;
    doc.rect(40, y, pageWidth, 14).fill(BRAND.primary);
    doc.fillColor(BRAND.white).fontSize(8).font('Helvetica-Bold')
       .text('BILL TO', 45, y + 4);
    y += 14;

    doc.rect(40, y, pageWidth, 55).stroke(BRAND.border);
    doc.fillColor(BRAND.dark).fontSize(10).font('Helvetica-Bold')
       .text(invoice.customer?.company_name || '—', 45, y + 8);
    if (invoice.customer?.address) {
      doc.fillColor(BRAND.gray).fontSize(8).font('Helvetica')
         .text(invoice.customer.address, 45, y + 24);
    }
    if (invoice.customer?.gst_number) {
      doc.fillColor(BRAND.gray).fontSize(8)
         .text(`GST: ${invoice.customer.gst_number}`, 45, y + 38);
    }
    y += 70;

    // Line Items Table Header
    doc.rect(40, y, pageWidth, 16).fill(BRAND.primary);
    doc.fillColor(BRAND.white).fontSize(8).font('Helvetica-Bold')
       .text('DESCRIPTION', 45, y + 5)
       .text('QTY', 330, y + 5)
       .text('UNIT', 370, y + 5)
       .text('RATE', 405, y + 5)
       .text('AMOUNT', 460, y + 5, { width: 90, align: 'right' });
    y += 16;

    // Line items
    const lineItems = invoice.line_items || [];
    lineItems.forEach((item, i) => {
      const rowY = y + i * 28;
      if (i % 2 === 0) {
        doc.rect(40, rowY, pageWidth, 28).fill('#F8FAFC');
      }
      doc.rect(40, rowY, pageWidth, 28).stroke(BRAND.border);
      doc.fillColor(BRAND.dark).fontSize(9).font('Helvetica')
         .text(item.description, 45, rowY + 10, { width: 275 })
         .text(String(item.quantity), 330, rowY + 10)
         .text(item.unit, 370, rowY + 10)
         .text(formatCurrency(item.rate), 400, rowY + 10)
         .text(formatCurrency(item.amount), 450, rowY + 10, { width: 100, align: 'right' });
    });

    y += Math.max(lineItems.length * 28, 28) + 10;

    // Totals
    const totalsX = 350;
    const totalsW = pageWidth - (totalsX - 40);

    const totalsData = [
      ['Subtotal', formatCurrency(invoice.taxable_amount)],
      [`GST @ ${invoice.gst_rate}%`, formatCurrency(invoice.gst_amount)],
      ['TOTAL', formatCurrency(invoice.total_amount)],
    ];

    totalsData.forEach(([label, val], i) => {
      const isLast = i === totalsData.length - 1;
      if (isLast) {
        doc.rect(totalsX, y, totalsW, 24).fill(BRAND.primary);
        doc.fillColor(BRAND.white).fontSize(10).font('Helvetica-Bold')
           .text(label, totalsX + 8, y + 8)
           .text(val, totalsX, y + 8, { width: totalsW - 8, align: 'right' });
      } else {
        doc.rect(totalsX, y, totalsW, 22).stroke(BRAND.border);
        doc.fillColor(BRAND.gray).fontSize(8).font('Helvetica')
           .text(label, totalsX + 8, y + 8);
        doc.fillColor(BRAND.dark).fontSize(9)
           .text(val, totalsX, y + 8, { width: totalsW - 8, align: 'right' });
      }
      y += isLast ? 24 : 22;
    });

    if (invoice.notes) {
      y += 15;
      doc.fillColor(BRAND.gray).fontSize(8).font('Helvetica-Bold').text('NOTES:', 40, y);
      doc.fillColor(BRAND.dark).fontSize(8).font('Helvetica').text(invoice.notes, 40, y + 12, { width: pageWidth });
    }

    // Footer
    const footerY = 760;
    doc.rect(40, footerY, pageWidth, 0.5).fill(BRAND.border);
    doc.fillColor(BRAND.gray).fontSize(7).font('Helvetica')
       .text(`${company.name} • ${company.phone || ''} • ${company.email || ''}`, 40, footerY + 8, { width: pageWidth, align: 'center' })
       .text(`Generated by ShipCore ERP • ${formatDate(new Date().toISOString())}`, 40, footerY + 20, { width: pageWidth, align: 'center' });

    doc.end();
  });
}
