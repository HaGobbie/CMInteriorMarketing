import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { publicHeroUrl } from '@/lib/heroImages';
import { areaAmount, areasOf, itemDisplayName, itemTotalAmount, type QuotationLineItem } from '@/lib/mockData';
import type { CompanySettings } from '@/lib/companySettings';

// One place that knows how to lay out a quotation/inquiry as a document —
// used for both the Excel export and the print view, and for both the
// lightweight inquiry-review export and the full formal quotation. Keeping
// this in one file is what lets the inquiry export and the quotation
// export look consistent instead of drifting apart the way the old
// per-modal copies did.

export type DocumentHeader = {
  reference: string;
  date: string;
  forDescription: string;
  address: string;
  attn: string;
  contacts: string;
};

export type DocumentTotals = {
  totalPhp: number;
  discount: number;
  subTotal: number;
  deliveryMobilization: number;
  grandTotal: number;
};

export type QuotationDocument = {
  variant: 'quotation' | 'inquiry';
  header: DocumentHeader;
  items: QuotationLineItem[];
  totals: DocumentTotals;
  company: CompanySettings;
  signatoryName?: string;
  signatoryTitle?: string;
};

const peso = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dimensionLabel = (width: number, height: number) => {
  if (!width && !height) return '—';
  return `${height || '—'} × ${width || '—'}`;
};

const itemHeading = (item: QuotationLineItem) => {
  const parts = [itemDisplayName(item)];
  if (item.subOption && item.subOption !== 'None') parts.push(item.subOption);
  return parts.join(' — ');
};

const itemSubheading = (item: QuotationLineItem) => {
  const bits = [item.category, item.material].filter(
    (value) => value && value !== itemDisplayName(item),
  );
  return bits.join(' · ');
};

// --- Excel export -----------------------------------------------------

const estimateColumnWidth = (values: string[], min: number, max: number) => {
  const longest = values.reduce((longest, value) => Math.max(longest, (value || '').length), 0);
  return Math.min(max, Math.max(min, longest + 2));
};

const wrappedLineCount = (text: string, charsPerLine: number) =>
  Math.max(1, Math.ceil((text || '').length / Math.max(10, charsPerLine)));

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
};

const CRIMSON = 'B20D15';
const INK = '1A1918';
const MUTED = '69645E';
const LINE = 'BDB8B0';
const SOFT = 'F3F0EC';
const THIN_BORDER = { style: 'thin' as const, color: { argb: LINE } };

export async function exportQuotationToExcel(doc: QuotationDocument): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CM Interiors Marketing';
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet(doc.variant === 'quotation' ? 'Quotation' : 'Inquiry', {
    pageSetup: {
      paperSize: 9,
      orientation: 'portrait',
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  // Dynamic column widths: measured from the actual content so long area
  // names or item descriptions don't get clipped, but short ones don't
  // leave the sheet looking sparse either.
  const areaNames: string[] = [];
  const itemLabels: string[] = [];
  doc.items.forEach((item) => {
    itemLabels.push(itemHeading(item));
    areasOf(item).forEach((area) => areaNames.push(area.area));
  });
  const columns = [
    { key: 'qty', header: 'Qty / Sets', width: 9 },
    {
      key: 'area',
      header: 'Description / Particulars',
      width: estimateColumnWidth([...itemLabels, ...areaNames], 26, 46),
    },
    { key: 'dimensions', header: 'H × W (in.)', width: 14 },
    { key: 'unitPrice', header: 'Unit Price', width: 14 },
    { key: 'amount', header: 'Amount', width: 16 },
  ];
  worksheet.columns = columns;
  worksheet.pageMargins = { left: 0.35, right: 0.35, top: 0.45, bottom: 0.45, header: 0.2, footer: 0.2 };

  // Best-effort logo — a network hiccup fetching it shouldn't block the
  // whole export, it just falls back to a text-only letterhead.
  let logoImageId: number | null = null;
  try {
    const logoResponse = await fetch(publicHeroUrl('assets/logo/CMInteriorLogoTransparentBG.png'), {
      cache: 'no-cache',
    });
    if (logoResponse.ok) {
      const logoBlob = await logoResponse.blob();
      const logoBase64 = arrayBufferToBase64(await logoBlob.arrayBuffer());
      logoImageId = workbook.addImage({
        base64: `data:${logoBlob.type || 'image/png'};base64,${logoBase64}`,
        extension: 'png',
      });
    }
  } catch {
    // Logo is optional — continue without it.
  }
  const headerLeftColumn = logoImageId !== null ? 'C' : 'A';
  if (logoImageId !== null) worksheet.addImage(logoImageId, 'A1:B4');

  worksheet.mergeCells(`${headerLeftColumn}1:E1`);
  worksheet.getCell(`${headerLeftColumn}1`).value = 'CM INTERIORS MARKETING';
  worksheet.getCell(`${headerLeftColumn}1`).font = { name: 'Arial', size: 16, bold: true, color: { argb: CRIMSON } };
  worksheet.getRow(1).height = 27;

  const contactLines = [doc.company.address, `TEL NO: ${doc.company.telNo}   MOBILE NO: ${doc.company.mobileNo}`, doc.company.email];
  contactLines.forEach((line, index) => {
    const rowNumber = 2 + index;
    worksheet.mergeCells(`${headerLeftColumn}${rowNumber}:E${rowNumber}`);
    const cell = worksheet.getCell(`${headerLeftColumn}${rowNumber}`);
    cell.value = line;
    cell.font = { name: 'Arial', size: 9, color: { argb: MUTED } };
  });

  const writeHeaderCell = (address: string, value: string, bold = false) => {
    const cell = worksheet.getCell(address);
    cell.value = value;
    cell.font = { name: 'Arial', size: 9, bold, color: { argb: bold ? INK : MUTED } };
    cell.alignment = { vertical: 'top', wrapText: true };
  };

  writeHeaderCell('A5', doc.variant === 'quotation' ? 'Date:' : 'Reference:', true);
  writeHeaderCell('B5', doc.variant === 'quotation' ? doc.header.date : doc.header.reference);
  worksheet.mergeCells('B5:E5');
  writeHeaderCell('A6', 'For:', true);
  writeHeaderCell('B6', doc.header.forDescription);
  worksheet.mergeCells('B6:E6');
  writeHeaderCell('A7', 'Address:', true);
  writeHeaderCell('B7', doc.header.address || '—');
  worksheet.mergeCells('B7:E7');
  writeHeaderCell('A8', 'ATTN:', true);
  writeHeaderCell('B8', doc.header.attn);
  worksheet.mergeCells('B8:C8');
  writeHeaderCell('D8', 'Contacts:', true);
  writeHeaderCell('E8', doc.header.contacts || '—');

  const tableHeaderRow = 10;
  columns.forEach((column, columnIndex) => {
    const cell = worksheet.getCell(tableHeaderRow, columnIndex + 1);
    cell.value = column.header;
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: INK } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SOFT } };
    cell.border = { top: THIN_BORDER, bottom: THIN_BORDER };
    cell.alignment = {
      horizontal: columnIndex === 1 ? 'left' : 'right',
      vertical: 'middle',
      wrapText: true,
    };
  });
  worksheet.getRow(tableHeaderRow).height = 24;

  const descriptionCharsPerLine = Math.max(18, (columns[1].width || 30) - 2);
  let rowCursor = tableHeaderRow + 1;

  doc.items.forEach((item) => {
    const headingRow = worksheet.getRow(rowCursor);
    const headingText = itemHeading(item);
    worksheet.mergeCells(`B${rowCursor}:E${rowCursor}`);
    const headingCell = worksheet.getCell(`B${rowCursor}`);
    headingCell.value = itemSubheading(item) ? `${headingText}  (${itemSubheading(item)})` : headingText;
    headingCell.font = { name: 'Arial', size: 10, bold: true, color: { argb: INK } };
    headingCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
    headingRow.height = 16 + (wrappedLineCount(headingText, descriptionCharsPerLine) - 1) * 13;
    rowCursor += 1;

    if (item.customNotes) {
      worksheet.mergeCells(`B${rowCursor}:E${rowCursor}`);
      const noteCell = worksheet.getCell(`B${rowCursor}`);
      noteCell.value = item.customNotes;
      noteCell.font = { name: 'Arial', size: 8, italic: true, color: { argb: MUTED } };
      noteCell.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
      worksheet.getRow(rowCursor).height = 14 + (wrappedLineCount(item.customNotes, descriptionCharsPerLine) - 1) * 12;
      rowCursor += 1;
    }

    areasOf(item).forEach((area) => {
      const values = [area.quantity, area.area, dimensionLabel(area.width, area.height), area.unitPrice, areaAmount(area)];
      values.forEach((value, columnIndex) => {
        const cell = worksheet.getCell(rowCursor, columnIndex + 1);
        cell.value = value;
        cell.font = { name: 'Arial', size: 9, color: { argb: INK } };
        cell.border = { bottom: THIN_BORDER };
        cell.alignment = {
          horizontal: columnIndex === 1 ? 'left' : 'right',
          vertical: 'top',
          wrapText: true,
        };
        if (columnIndex >= 3) cell.numFmt = '₱#,##0.00';
      });
      worksheet.getRow(rowCursor).height = 14 + (wrappedLineCount(area.area, descriptionCharsPerLine) - 1) * 12;
      rowCursor += 1;
    });

    if (areasOf(item).length > 1) {
      worksheet.mergeCells(`B${rowCursor}:D${rowCursor}`);
      const subtotalLabel = worksheet.getCell(`B${rowCursor}`);
      subtotalLabel.value = 'Item subtotal';
      subtotalLabel.font = { name: 'Arial', size: 8, italic: true, color: { argb: MUTED } };
      subtotalLabel.alignment = { horizontal: 'right' };
      const subtotalValue = worksheet.getCell(`E${rowCursor}`);
      subtotalValue.value = itemTotalAmount(item);
      subtotalValue.numFmt = '₱#,##0.00';
      subtotalValue.font = { name: 'Arial', size: 8, italic: true, color: { argb: MUTED } };
      subtotalValue.alignment = { horizontal: 'right' };
      worksheet.getRow(rowCursor).height = 14;
      rowCursor += 1;
    }
  });

  rowCursor += 1;
  const totalsRows: Array<[string, number, boolean]> = [
    ['Total Php', doc.totals.totalPhp, false],
    ['Discount', doc.totals.discount, false],
    ['Sub Total', doc.totals.subTotal, false],
    ['Delivery and Mobilization', doc.totals.deliveryMobilization, false],
    ['Grand Total', doc.totals.grandTotal, true],
  ];
  totalsRows.forEach(([label, value, emphasize]) => {
    worksheet.mergeCells(`C${rowCursor}:D${rowCursor}`);
    worksheet.getCell(`C${rowCursor}`).value = label;
    worksheet.getCell(`C${rowCursor}`).font = {
      name: 'Arial',
      size: emphasize ? 11 : 9,
      bold: true,
      color: { argb: INK },
    };
    const valueCell = worksheet.getCell(`E${rowCursor}`);
    valueCell.value = value;
    valueCell.numFmt = '₱#,##0.00';
    valueCell.font = { name: 'Arial', size: emphasize ? 12 : 9, bold: true, color: { argb: INK } };
    valueCell.alignment = { horizontal: 'right' };
    if (emphasize) {
      worksheet.getCell(`C${rowCursor}`).border = { top: THIN_BORDER };
      valueCell.border = { top: THIN_BORDER };
    }
    rowCursor += 1;
  });

  if (doc.variant === 'quotation') {
    rowCursor += 2;
    worksheet.mergeCells(`A${rowCursor}:E${rowCursor}`);
    worksheet.getCell(`A${rowCursor}`).value = 'Terms and Conditions:';
    worksheet.getCell(`A${rowCursor}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: INK } };
    rowCursor += 1;

    doc.company.terms.forEach((term, index) => {
      worksheet.mergeCells(`A${rowCursor}:E${rowCursor}`);
      const cell = worksheet.getCell(`A${rowCursor}`);
      cell.value = `${index + 1}.) ${term}`;
      cell.font = { name: 'Arial', size: 9, color: { argb: MUTED } };
      cell.alignment = { wrapText: true, vertical: 'top' };
      worksheet.getRow(rowCursor).height = 14 + (wrappedLineCount(term, 100) - 1) * 12;
      rowCursor += 1;
    });
    worksheet.mergeCells(`A${rowCursor}:E${rowCursor}`);
    worksheet.getCell(`A${rowCursor}`).value =
      'We hope that you find our price reasonable and within your allotted budget. Looking forward to serve your other requirements in the future.';
    worksheet.getCell(`A${rowCursor}`).font = { name: 'Arial', size: 9, italic: true, color: { argb: MUTED } };
    worksheet.getCell(`A${rowCursor}`).alignment = { wrapText: true };
    worksheet.getRow(rowCursor).height = 26;
    rowCursor += 3;

    worksheet.getCell(`A${rowCursor}`).value = 'Respectfully yours,';
    worksheet.getCell(`A${rowCursor}`).font = { name: 'Arial', size: 9, color: { argb: MUTED } };
    worksheet.getCell(`A${rowCursor + 2}`).value = doc.signatoryName?.trim() || 'Chris Abella / Clarissa Abella';
    worksheet.getCell(`A${rowCursor + 2}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: INK } };
    worksheet.getCell(`A${rowCursor + 3}`).value = doc.signatoryTitle?.trim() || 'CM Interiors Marketing';
    worksheet.getCell(`A${rowCursor + 3}`).font = { name: 'Arial', size: 9, color: { argb: MUTED } };

    worksheet.mergeCells(`C${rowCursor}:E${rowCursor}`);
    worksheet.getCell(`C${rowCursor}`).value = 'CONFORME:';
    worksheet.getCell(`C${rowCursor}`).font = { name: 'Arial', size: 10, bold: true, color: { argb: INK } };
    worksheet.mergeCells(`C${rowCursor + 1}:E${rowCursor + 3}`);
    worksheet.getCell(`C${rowCursor + 1}`).value =
      'I hereby attest that I have read the Terms and Condition as provided thereof and understand and agree to the provisions therein.';
    worksheet.getCell(`C${rowCursor + 1}`).font = { name: 'Arial', size: 9, color: { argb: MUTED } };
    worksheet.getCell(`C${rowCursor + 1}`).alignment = { wrapText: true, vertical: 'top' };
    const signatureLineRow = rowCursor + 5;
    worksheet.mergeCells(`C${signatureLineRow}:E${signatureLineRow}`);
    ['C', 'D', 'E'].forEach((column) => {
      worksheet.getCell(`${column}${signatureLineRow}`).border = { bottom: { style: 'medium', color: { argb: INK } } };
    });
    worksheet.getCell(`C${signatureLineRow + 1}`).value = 'Signature of Authorized Representative';
    worksheet.getCell(`C${signatureLineRow + 2}`).value = 'Above Printed Name';
    [signatureLineRow + 1, signatureLineRow + 2].forEach((row) => {
      worksheet.mergeCells(`C${row}:E${row}`);
      worksheet.getCell(`C${row}`).font = { name: 'Arial', size: 8, color: { argb: MUTED } };
      worksheet.getCell(`C${row}`).alignment = { horizontal: 'center' };
    });
    rowCursor = signatureLineRow + 3;
  } else {
    rowCursor += 1;
    worksheet.mergeCells(`A${rowCursor}:E${rowCursor}`);
    worksheet.getCell(`A${rowCursor}`).value =
      'This is a working draft for internal review — not yet a formal quotation.';
    worksheet.getCell(`A${rowCursor}`).font = { name: 'Arial', size: 8, italic: true, color: { argb: MUTED } };
  }

  worksheet.views = [{ showGridLines: false }];
  worksheet.printArea = `A1:E${rowCursor + 1}`;

  const buffer = await workbook.xlsx.writeBuffer();
  const label = doc.variant === 'quotation' ? 'Quotation' : 'Inquiry';
  const filename = `CM-${label}-${doc.header.attn.trim() || doc.header.reference || 'Client'}.xlsx`;
  saveAs(
    new Blob([buffer as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    filename.replace(/[^a-zA-Z0-9._-]+/g, '-'),
  );
}

// --- Print view ---------------------------------------------------------

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

export function openQuotationPrintView(doc: QuotationDocument): void {
  const itemRows = doc.items
    .map((item) => {
      const areas = areasOf(item);
      const heading = `
        <tr class="item-row">
          <td></td>
          <td colspan="4">
            <strong>${escapeHtml(itemHeading(item))}</strong>
            ${itemSubheading(item) ? `<span class="muted"> (${escapeHtml(itemSubheading(item))})</span>` : ''}
            ${item.customNotes ? `<div class="muted small">${escapeHtml(item.customNotes)}</div>` : ''}
          </td>
        </tr>`;
      const areaRows = areas
        .map(
          (area) => `
        <tr>
          <td class="right">${area.quantity}</td>
          <td>${escapeHtml(area.area)}</td>
          <td class="right">${dimensionLabel(area.width, area.height)}</td>
          <td class="right">${peso(area.unitPrice)}</td>
          <td class="right">${peso(areaAmount(area))}</td>
        </tr>`,
        )
        .join('');
      const subtotalRow =
        areas.length > 1
          ? `<tr><td colspan="4" class="right muted small">Item subtotal</td><td class="right muted small">${peso(itemTotalAmount(item))}</td></tr>`
          : '';
      return heading + areaRows + subtotalRow;
    })
    .join('');

  const termsHtml =
    doc.variant === 'quotation'
      ? `
      <div class="terms">
        <strong>Terms and Conditions:</strong>
        <ol>
          ${doc.company.terms.map((term) => `<li>${escapeHtml(term)}</li>`).join('')}
        </ol>
        <p class="muted small">We hope that you find our price reasonable and within your allotted budget. Looking forward to serve your other requirements in the future.</p>
      </div>
      <div class="signatures">
        <div>
          <p class="muted small">Respectfully yours,</p>
          <p class="signatory-name">${escapeHtml(doc.signatoryName?.trim() || 'Chris Abella / Clarissa Abella')}</p>
          <p class="muted small">${escapeHtml(doc.signatoryTitle?.trim() || 'CM Interiors Marketing')}</p>
        </div>
        <div>
          <p><strong>CONFORME:</strong></p>
          <p class="muted small">I hereby attest that I have read the Terms and Condition as provided thereof and understand and agree to the provisions therein.</p>
          <div class="signature-line"></div>
          <p class="muted small center">Signature of Authorized Representative</p>
          <p class="muted small center">Above Printed Name</p>
        </div>
      </div>`
      : `<p class="muted small" style="margin-top:24px;">This is a working draft for internal review — not yet a formal quotation.</p>`;

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(doc.variant === 'quotation' ? 'Quotation' : 'Inquiry')} — ${escapeHtml(doc.header.attn)}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #1A1918; margin: 0; padding: 32px 40px; }
  h1 { color: #B20D15; font-size: 22px; margin: 0 0 4px; }
  .muted { color: #69645E; }
  .small { font-size: 11px; }
  .center { text-align: center; }
  .letterhead-lines p { margin: 1px 0; font-size: 11px; color: #69645E; }
  .meta { border-top: 1px solid #BDB8B0; border-bottom: 1px solid #BDB8B0; margin: 16px 0; padding: 10px 0; font-size: 12px; }
  .meta div { margin-bottom: 4px; }
  .meta b { color: #1A1918; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 12px; }
  thead th { text-align: right; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; color: #1A1918; background: #F3F0EC; border-bottom: 1px solid #BDB8B0; padding: 8px 6px; }
  thead th:nth-child(2) { text-align: left; }
  td { padding: 6px; border-bottom: 1px solid #eee; vertical-align: top; }
  .right { text-align: right; }
  .item-row td { border-bottom: none; padding-top: 12px; }
  .totals { display: flex; justify-content: flex-end; margin-top: 16px; }
  .totals table { width: 320px; margin-top: 0; }
  .totals td { border: none; padding: 4px 0; }
  .totals tr.grand td { border-top: 1px solid #1A1918; font-weight: bold; font-size: 15px; padding-top: 8px; }
  .terms { margin-top: 28px; font-size: 11px; }
  .terms ol { padding-left: 18px; color: #69645E; }
  .terms li { margin-bottom: 4px; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 28px; font-size: 11px; }
  .signatory-name { font-weight: bold; margin: 8px 0 2px; }
  .signature-line { border-bottom: 2px solid #1A1918; margin: 32px 0 6px; }
  @media print { body { padding: 12mm; } }
</style>
</head>
<body>
  <h1>CM INTERIORS MARKETING</h1>
  <div class="letterhead-lines">
    <p>${escapeHtml(doc.company.address)}</p>
    <p>TEL NO: ${escapeHtml(doc.company.telNo)}&nbsp;&nbsp;&nbsp;MOBILE NO: ${escapeHtml(doc.company.mobileNo)}</p>
    <p>${escapeHtml(doc.company.email)}</p>
  </div>
  <div class="meta">
    <div><b>${doc.variant === 'quotation' ? 'Date' : 'Reference'}:</b> ${escapeHtml(doc.variant === 'quotation' ? doc.header.date : doc.header.reference)}</div>
    <div><b>For:</b> ${escapeHtml(doc.header.forDescription)}</div>
    <div><b>Address:</b> ${escapeHtml(doc.header.address || '—')}</div>
    <div><b>ATTN:</b> ${escapeHtml(doc.header.attn)} &nbsp;&nbsp; <b>Contacts:</b> ${escapeHtml(doc.header.contacts || '—')}</div>
  </div>
  <table>
    <thead>
      <tr><th class="right">Qty</th><th>Description / Particulars</th><th class="right">H × W (in.)</th><th class="right">Unit Price</th><th class="right">Amount</th></tr>
    </thead>
    <tbody>${itemRows}</tbody>
  </table>
  <div class="totals">
    <table>
      <tbody>
        <tr><td>Total Php</td><td class="right">${peso(doc.totals.totalPhp)}</td></tr>
        <tr><td>Discount</td><td class="right">${peso(doc.totals.discount)}</td></tr>
        <tr><td>Sub Total</td><td class="right">${peso(doc.totals.subTotal)}</td></tr>
        <tr><td>Delivery and Mobilization</td><td class="right">${peso(doc.totals.deliveryMobilization)}</td></tr>
        <tr class="grand"><td>Grand Total</td><td class="right">${peso(doc.totals.grandTotal)}</td></tr>
      </tbody>
    </table>
  </div>
  ${termsHtml}
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    window.alert('Please allow pop-ups for this site to print the document.');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
