import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import ExcelJS from 'exceljs';
import { FileDown, Plus, Trash2, X } from 'lucide-react';
import { saveAs } from 'file-saver';
import { supabase } from '@/lib/supabaseClient';
import { publicHeroUrl } from '@/lib/heroImages';

import type {
  FulfillmentOrder,
  Product,
  QuotationLineItem,
} from '@/lib/mockData';

type StaffQuoteModalProps = {
  products: Product[];
  onClose: () => void;
  onSave: (order: FulfillmentOrder) => void;
};

type DraftLineItem = {
  id: string;
  productId: string;
  material: string;
  area: string;
  quantity: number | '';
  height: number | '';
  width: number | '';
  unitPrice: number | '';
};

type QuoteForm = {
  date: string;
  forDescription: string;
  address: string;
  attn: string;
  contacts: string;
  items: DraftLineItem[];
  discount: number | '';
  deliveryMobilization: number | '';
  signatoryName: string;
  signatoryTitle: string;
};

const peso = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const todayForInput = () => {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
};

const displayDate = (value: string) => {
  if (!value) return '';
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  });
};

const newLineItem = (): DraftLineItem => ({
  id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  productId: '',
  material: '',
  area: '',
  quantity: 1,
  height: '',
  width: '',
  unitPrice: '',
});

const toNumber = (value: number | '') => Number(value || 0);

const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(
      ...bytes.subarray(index, index + chunkSize),
    );
  }
  return btoa(binary);
};

function NumberInput({
  value,
  onChange,
  ariaLabel,
  min = 0,
  step = 0.01,
  className = '',
}: {
  value: number | '';
  onChange: (value: number | '') => void;
  ariaLabel: string;
  min?: number;
  step?: number;
  className?: string;
}) {
  return (
    <input
      className={className}
      type="number"
      min={min}
      step={step}
      value={value === '' || value === 0 ? '' : value}
      onChange={(event) =>
        onChange(
          event.target.value === '' ? '' : Number(event.target.value),
        )
      }
      aria-label={ariaLabel}
    />
  );
}

export default function StaffQuoteModal({
  products,
  onClose,
  onSave,
}: StaffQuoteModalProps) {
  const [form, setForm] = useState<QuoteForm>({
    date: todayForInput(),
    forDescription: '',
    address: '',
    attn: '',
    contacts: '',
    items: [newLineItem()],
    discount: 0,
    deliveryMobilization: 0,
    signatoryName: 'Chris Abella / Clarissa Abella',
    signatoryTitle: 'CM Interiors Marketing',
  });
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const totalPhp = useMemo(
    () =>
      form.items.reduce(
        (sum, item) =>
          sum + toNumber(item.quantity) * toNumber(item.unitPrice),
        0,
      ),
    [form.items],
  );
  const discount = toNumber(form.discount);
  const subTotal = Math.max(0, totalPhp - discount);
  const deliveryMobilization = toNumber(form.deliveryMobilization);
  const grandTotal = subTotal + deliveryMobilization;

  const updateHeader = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const updateItem = (
    index: number,
    patch: Partial<DraftLineItem>,
  ) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  };

  const selectProduct = (
    index: number,
    event: ChangeEvent<HTMLSelectElement>,
  ) => {
    const productId = event.target.value;
    const product = products.find((item) => item.id === productId);
    updateItem(index, {
      productId,
      material: product?.name ?? '',
      unitPrice: product?.rate ?? '',
    });
  };

  const removeItem = (index: number) => {
    setForm((current) => ({
      ...current,
      items:
        current.items.length === 1
          ? current.items
          : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const normalizedItems = (): QuotationLineItem[] =>
    form.items.map((item) => ({
      id: item.id,
      material: item.material.trim(),
      area: item.area.trim(),
      quantity: toNumber(item.quantity),
      height: toNumber(item.height),
      width: toNumber(item.width),
      unitPrice: toNumber(item.unitPrice),
      amount: toNumber(item.quantity) * toNumber(item.unitPrice),
    }));

  const buildOrder = (): FulfillmentOrder => {
    const items = normalizedItems();
    const quoteId = `CM-${new Date().getFullYear()}-${String(
      Date.now(),
    ).slice(-5)}`;
    const firstMaterial = items[0]?.material || 'New quotation';
    const itemSuffix =
      items.length > 1 ? ` · ${items.length} line items` : '';

    return {
      id: quoteId,
      client: form.attn.trim() || 'Unnamed client',
      product: `${firstMaterial}${itemSuffix}`,
      amount: grandTotal,
      status: 'Pending Sourcing',
      courier: '',
      waybillNumber: '',
      date: displayDate(form.date),
      forDescription: form.forDescription.trim(),
      address: form.address.trim(),
      attn: form.attn.trim(),
      contacts: form.contacts.trim(),
      items,
      totalPhp,
      discount,
      subTotal,
      deliveryMobilization,
      grandTotal,
      signatoryName: form.signatoryName,
      signatoryTitle: form.signatoryTitle,
    };
  };

  const saveQuotation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    if (!form.forDescription.trim() || !form.attn.trim()) {
      setError('Add a project description and client name before saving.');
      return;
    }
    if (
      form.items.some(
        (item) =>
          toNumber(item.quantity) <= 0 ||
          !Number.isInteger(toNumber(item.quantity)) ||
          toNumber(item.unitPrice) < 0,
      )
    ) {
      setError('Each line item needs a quantity, whole-number quantity, and unit price.');
      return;
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError('Please sign in through Supabase Auth before saving a quotation.');
      setSaving(false);
      return;
    }

    const order = buildOrder();
    const { data: savedRow, error: insertError } = await supabase
      .from('orders')
      .insert({
        for_description: form.forDescription.trim(),
        address: form.address.trim(),
        attn: form.attn.trim(),
        contacts: form.contacts.trim(),
        items: order.items,
        total_php: totalPhp,
        discount,
        sub_total: subTotal,
        delivery_mobilization: deliveryMobilization,
        grand_total: grandTotal,
        signatory_name: form.signatoryName.trim(),
        signatory_title: form.signatoryTitle.trim(),
        customer_name: form.attn.trim(),
        customer_email: '',
        estimated_total: grandTotal,
        user_id: user.id,
        courier: order.courier,
        waybill_number: order.waybillNumber,
      })
      .select('id')
      .single();

    if (insertError) {
      setError(`Could not save quotation: ${insertError.message}`);
      setSaving(false);
      return;
    }

    onSave(
      savedRow?.id
        ? { ...order, id: String(savedRow.id) }
        : order,
    );
    setSaved(true);
    setSaving(false);
  };

  const exportToExcel = async () => {
    setExportError('');

    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'CM Interiors Marketing';
      workbook.created = new Date();
      const worksheet = workbook.addWorksheet('Quotation', {
        pageSetup: {
          paperSize: 9,
          orientation: 'portrait',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0,
        },
      });

      const logoResponse = await fetch(
        publicHeroUrl('assets/logo/CMInteriorLogoTransparentBG.png'),
        { cache: 'no-cache' },
      );
      if (!logoResponse.ok) {
        throw new Error(
          `The quotation logo could not be loaded (HTTP ${logoResponse.status}).`,
        );
      }
      const logoBlob = await logoResponse.blob();
      const logoBase64 = arrayBufferToBase64(await logoBlob.arrayBuffer());
      const logoImageId = workbook.addImage({
        base64: `data:${logoBlob.type || 'image/png'};base64,${logoBase64}`,
        extension: 'png',
      });
      worksheet.addImage(logoImageId, 'A1:B4');

      worksheet.columns = [
        { key: 'qty', width: 10 },
        { key: 'area', width: 12 },
        { key: 'description', width: 36 },
        { key: 'dimensions', width: 12 },
        { key: 'unitPrice', width: 14 },
        { key: 'amount', width: 16 },
      ];
      worksheet.pageMargins = {
        left: 0.35,
        right: 0.35,
        top: 0.45,
        bottom: 0.45,
        header: 0.2,
        footer: 0.2,
      };

      const crimson = 'B20D15';
      const ink = '1A1918';
      const muted = '69645E';
      const line = 'BDB8B0';
      const soft = 'F3F0EC';
      const thinBorder = {
        style: 'thin' as const,
        color: { argb: line },
      };

      worksheet.mergeCells('C1:F1');
      worksheet.getCell('C1').value = 'CM INTERIORS MARKETING';
      worksheet.getCell('C1').font = {
        name: 'Arial',
        size: 16,
        bold: true,
        color: { argb: crimson },
      };
      worksheet.getCell('C1').alignment = {
        horizontal: 'left',
        vertical: 'middle',
      };
      worksheet.getRow(1).height = 27;

      worksheet.mergeCells('C2:F2');
      worksheet.getCell('C2').value =
        'Door 48 J.B. Olaguer Bldg., J.P. Laurel Highway, Matina, Davao City';
      worksheet.getCell('C2').font = {
        name: 'Arial',
        size: 9,
        color: { argb: muted },
      };
      worksheet.getCell('C2').alignment = { horizontal: 'left' };

      worksheet.mergeCells('C3:F3');
      worksheet.getCell('C3').value =
        'TEL NO: (082) 327 3526   MOBILE NO: 0908 519 6608';
      worksheet.getCell('C3').font = {
        name: 'Arial',
        size: 9,
        color: { argb: muted },
      };
      worksheet.getCell('C3').alignment = { horizontal: 'left' };
      worksheet.mergeCells('C4:F4');
      worksheet.getCell('C4').value = 'cminteriorsmarketing@gmail.com';
      worksheet.getCell('C4').font = {
        name: 'Arial',
        size: 9,
        color: { argb: muted },
      };
      worksheet.getCell('C4').alignment = { horizontal: 'left' };

      const writeHeaderCell = (
        address: string,
        value: string,
        bold = false,
      ) => {
        const cell = worksheet.getCell(address);
        cell.value = value;
        cell.font = {
          name: 'Arial',
          size: 9,
          bold,
          color: { argb: bold ? ink : muted },
        };
        cell.alignment = {
          vertical: 'top',
          wrapText: true,
        };
      };

      writeHeaderCell('A5', 'Date:', true);
      writeHeaderCell('B5', displayDate(form.date));
      worksheet.mergeCells('B5:C5');
      writeHeaderCell('A6', 'For:', true);
      writeHeaderCell('B6', form.forDescription);
      worksheet.mergeCells('B6:F6');

      writeHeaderCell('A7', 'Address:', true);
      writeHeaderCell('B7', form.address);
      worksheet.mergeCells('B7:F7');

      writeHeaderCell('A8', 'ATTN:', true);
      writeHeaderCell('B8', form.attn);
      worksheet.mergeCells('B8:C8');
      writeHeaderCell('D8', 'Contacts:', true);
      writeHeaderCell('E8', form.contacts);
      worksheet.mergeCells('E8:F8');

      const tableHeaderRow = 10;
      const tableHeaders = [
        'Qty / Sets',
        'Description / Particulars',
        'Material / Option',
        'H × W (in.)',
        'Unit Price',
        'Amount',
      ];
      tableHeaders.forEach((header, columnIndex) => {
        const cell = worksheet.getCell(tableHeaderRow, columnIndex + 1);
        cell.value = header;
        cell.font = {
          name: 'Arial',
          size: 9,
          bold: true,
          color: { argb: ink },
        };
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: soft },
        };
        cell.border = { top: thinBorder, bottom: thinBorder };
        cell.alignment = {
          horizontal: columnIndex === 1 || columnIndex === 2 ? 'left' : 'right',
          vertical: 'middle',
          wrapText: true,
        };
      });
      worksheet.getRow(tableHeaderRow).height = 27;

      const items = normalizedItems();
      items.forEach((item, index) => {
        const rowNumber = tableHeaderRow + 1 + index;
        const values = [
          item.quantity,
          item.area,
          item.material,
          `${item.height || '-'} × ${item.width || '-'}`,
          item.unitPrice,
          item.amount,
        ];
        values.forEach((value, columnIndex) => {
          const cell = worksheet.getCell(rowNumber, columnIndex + 1);
          cell.value = value;
          cell.font = { name: 'Arial', size: 9, color: { argb: ink } };
          cell.border = { bottom: thinBorder };
          cell.alignment = {
            horizontal:
              columnIndex === 1 || columnIndex === 2 ? 'left' : 'right',
            vertical: 'top',
            wrapText: true,
          };
          if (columnIndex >= 4) cell.numFmt = '₱#,##0.00';
        });
        worksheet.getRow(rowNumber).height = item.area ? 30 : 21;
      });

      const totalsStart = tableHeaderRow + 2 + items.length;
      const totals = [
        ['Total Php', totalPhp],
        ['Discount', discount],
        ['Sub Total', subTotal],
        ['Delivery and Mobilization', deliveryMobilization],
        ['Grand Total', grandTotal],
      ] as const;
      totals.forEach(([label, value], index) => {
        const rowNumber = totalsStart + index;
        worksheet.mergeCells(`D${rowNumber}:E${rowNumber}`);
        worksheet.getCell(`D${rowNumber}`).value = label;
        worksheet.getCell(`F${rowNumber}`).value = value;
        worksheet.getCell(`D${rowNumber}`).font = {
          name: 'Arial',
          size: index === totals.length - 1 ? 10 : 9,
          bold: true,
          color: { argb: ink },
        };
        worksheet.getCell(`F${rowNumber}`).font = {
          name: 'Arial',
          size: index === totals.length - 1 ? 11 : 9,
          bold: true,
          color: { argb: ink },
        };
        worksheet.getCell(`F${rowNumber}`).numFmt = '₱#,##0.00';
        worksheet.getCell(`F${rowNumber}`).alignment = { horizontal: 'right' };
        if (index === 0 || index === totals.length - 1) {
          worksheet.getCell(`D${rowNumber}`).border = { top: thinBorder };
          worksheet.getCell(`F${rowNumber}`).border = { top: thinBorder };
        }
      });

      const termsRow = totalsStart + totals.length + 2;
      worksheet.mergeCells(`A${termsRow}:F${termsRow}`);
      worksheet.getCell(`A${termsRow}`).value = 'Terms and Conditions:';
      worksheet.getCell(`A${termsRow}`).font = {
        name: 'Arial',
        size: 10,
        bold: true,
        color: { argb: ink },
      };
      const terms = [
        '1.) 60% DOWNPAYMENT upon order of materials and fabrication.',
        '    Remaining balance to be settled upon delivery and/or installation.',
        '2.) Transportation/delivery charges and meal expenses of the installers for installation in areas beyond city proper are to be shouldered by the client.',
        '3.) Price is subject to change without prior notice.',
        'We hope that you find our price reasonable and within your allotted budget. Looking forward to serve your other requirements in the future.',
      ];
      terms.forEach((term, index) => {
        const rowNumber = termsRow + 1 + index;
        worksheet.mergeCells(`A${rowNumber}:F${rowNumber}`);
        worksheet.getCell(`A${rowNumber}`).value = term;
        worksheet.getCell(`A${rowNumber}`).font = {
          name: 'Arial',
          size: 9,
          color: { argb: muted },
          italic: index === terms.length - 1,
        };
        worksheet.getCell(`A${rowNumber}`).alignment = {
          wrapText: true,
          vertical: 'top',
        };
        worksheet.getRow(rowNumber).height =
          index === 2 || index === 4 ? 40 : index === 1 ? 35 : 20;
      });

      const signatureRow = termsRow + terms.length + 3;
      worksheet.getCell(`A${signatureRow}`).value = 'Respectfully yours,';
      worksheet.getCell(`A${signatureRow}`).font = {
        name: 'Arial',
        size: 9,
        color: { argb: muted },
      };
      worksheet.getCell(`A${signatureRow + 2}`).value =
        form.signatoryName.trim() || 'Chris Abella / Clarissa Abella';
      worksheet.getCell(`A${signatureRow + 2}`).font = {
        name: 'Arial',
        size: 10,
        bold: true,
        color: { argb: ink },
      };
      worksheet.getCell(`A${signatureRow + 3}`).value =
        form.signatoryTitle.trim() || 'CM Interiors Marketing';
      worksheet.getCell(`A${signatureRow + 3}`).font = {
        name: 'Arial',
        size: 9,
        color: { argb: muted },
      };
      worksheet.mergeCells(`D${signatureRow}:F${signatureRow}`);
      worksheet.getCell(`D${signatureRow}`).value = 'CONFORME:';
      worksheet.getCell(`D${signatureRow}`).font = {
        name: 'Arial',
        size: 10,
        bold: true,
        color: { argb: ink },
      };
      worksheet.mergeCells(`D${signatureRow + 1}:F${signatureRow + 3}`);
      worksheet.getCell(`D${signatureRow + 1}`).value =
        'I hereby attest that I have read the Terms and Condition as provided thereof and understand and agree to the provisions therein.';
      worksheet.getCell(`D${signatureRow + 1}`).font = {
        name: 'Arial',
        size: 9,
        color: { argb: muted },
      };
      worksheet.getCell(`D${signatureRow + 1}`).alignment = {
        wrapText: true,
        vertical: 'top',
      };
      worksheet.mergeCells(`D${signatureRow + 5}:F${signatureRow + 5}`);
      const signatureLineRow = signatureRow + 5;
      worksheet.getCell(`D${signatureLineRow}`).value = '';
      worksheet.getCell(`D${signatureLineRow}`).border = {
        bottom: { style: 'medium', color: { argb: '1A1918' } },
      };
      worksheet.getCell(`E${signatureLineRow}`).border = {
        bottom: { style: 'medium', color: { argb: '1A1918' } },
      };
      worksheet.getCell(`F${signatureLineRow}`).border = {
        bottom: { style: 'medium', color: { argb: '1A1918' } },
      };
      worksheet.getCell(`D${signatureRow + 6}`).value =
        'Signature of Authorized Representative';
      worksheet.getCell(`D${signatureRow + 7}`).value = 'Above Printed Name';
      [signatureRow + 6, signatureRow + 7].forEach((rowNumber) => {
        worksheet.mergeCells(`D${rowNumber}:F${rowNumber}`);
        worksheet.getCell(`D${rowNumber}`).font = {
          name: 'Arial',
          size: 8,
          color: { argb: muted },
        };
        worksheet.getCell(`D${rowNumber}`).alignment = {
          horizontal: 'center',
        };
      });

      worksheet.views = [{ showGridLines: false }];
      worksheet.printArea = `A1:F${signatureRow + 7}`;
      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `CM-Quotation-${form.attn.trim() || 'Client'}-${form.date || 'draft'}.xlsx`;
      saveAs(
        new Blob([buffer as BlobPart], {
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        }),
        filename.replace(/[^a-zA-Z0-9._-]+/g, '-'),
      );
    } catch (exportFailure) {
      setExportError(
        exportFailure instanceof Error
          ? exportFailure.message
          : 'The quotation could not be exported.',
      );
    }
  };

  return (
    <div
      className="overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="staff-quote-modal-title"
        style={{ width: 'min(100%, 1120px)' }}
      >
        <div className="modal-head">
          <div>
            <div
              style={{
                color: 'var(--crimson)',
                fontSize: 10,
                letterSpacing: '.12em',
                textTransform: 'uppercase',
                fontWeight: 700,
                marginBottom: 5,
              }}
            >
              Project desk · new order
            </div>
            <h2 id="staff-quote-modal-title">Create quotation</h2>
          </div>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close quotation creator"
            data-testid="button-close-staff-quote"
          >
            <X size={18} />
          </button>
        </div>
        <form className="modal-body" onSubmit={saveQuotation}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, minmax(0, 1fr))',
              gap: 12,
              marginBottom: 25,
            }}
          >
            {[
              ['date', 'Date'],
              ['forDescription', 'For / project description'],
              ['address', 'Address'],
              ['attn', 'ATTN / client name'],
              ['contacts', 'Contacts'],
            ].map(([name, label]) => (
              <label
                key={name}
                style={{
                  gridColumn:
                    name === 'forDescription' || name === 'address'
                      ? 'span 6'
                      : 'span 3',
                  minWidth: 0,
                  color: 'var(--muted-ink)',
                  fontSize: 10,
                  letterSpacing: '.08em',
                  textTransform: 'uppercase',
                }}
              >
                {label}
                <input
                  name={name}
                  type={name === 'date' ? 'date' : 'text'}
                  value={form[name as keyof QuoteForm] as string}
                  onChange={updateHeader}
                  placeholder={
                    name === 'forDescription'
                      ? 'Supply and installation of Vertical PVC'
                      : undefined
                  }
                  required={name === 'forDescription' || name === 'attn'}
                  style={{
                    display: 'block',
                    width: '100%',
                    marginTop: 7,
                    border: '1px solid var(--sand)',
                    background: 'white',
                    color: 'var(--obsidian)',
                    padding: '10px 11px',
                    fontSize: 12,
                    textTransform: 'none',
                    letterSpacing: 0,
                  }}
                />
              </label>
            ))}
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'end',
              gap: 12,
              marginBottom: 10,
            }}
          >
            <div>
              <div
                style={{
                  color: 'var(--muted-ink)',
                  fontSize: 10,
                  letterSpacing: '.1em',
                  textTransform: 'uppercase',
                }}
              >
                Quotation details
              </div>
              <h3
                style={{
                  margin: '5px 0 0',
                  font: '600 21px var(--app-font-serif)',
                }}
              >
                Materials & measurements
              </h3>
            </div>
            <span style={{ color: 'var(--muted-ink)', fontSize: 11 }}>
              Amount = Qty × Unit Price
            </span>
          </div>

          <div style={{ overflowX: 'auto', border: '1px solid var(--sand)' }}>
            <table
              className="admin-table"
              style={{ minWidth: 980, background: 'white' }}
            >
              <thead>
                <tr>
                  <th style={{ width: 190 }}>Material / option (optional)</th>
                  <th style={{ width: 185 }}>Description</th>
                  <th>Qty / sets</th>
                  <th>Height</th>
                  <th>Width</th>
                  <th>Unit price</th>
                  <th>Amount</th>
                  <th aria-label="Remove item" />
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, index) => {
                  const amount =
                    toNumber(item.quantity) * toNumber(item.unitPrice);
                  return (
                    <tr key={item.id}>
                      <td>
                        <select
                          value={item.productId}
                          onChange={(event) => selectProduct(index, event)}
                          aria-label={`Product option ${index + 1}`}
                          data-testid={`select-quote-product-${index}`}
                          style={{
                            width: '100%',
                            border: '1px solid var(--sand)',
                            padding: '7px 6px',
                            fontSize: 11,
                            marginBottom: 5,
                          }}
                        >
                          <option value="">Manual entry</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.name} · {peso(product.rate)}
                            </option>
                          ))}
                        </select>
                        <input
                          value={item.material}
                          onChange={(event) =>
                            updateItem(index, { material: event.target.value })
                          }
                          placeholder="e.g. Vertical PVC"
                          aria-label={`Material for item ${index + 1}`}
                          data-testid={`input-quote-material-${index}`}
                          style={{
                            width: '100%',
                            border: '1px solid var(--sand)',
                            padding: '7px 6px',
                            fontSize: 11,
                          }}
                        />
                      </td>
                      <td>
                        <input
                          value={item.area}
                          onChange={(event) =>
                            updateItem(index, { area: event.target.value })
                          }
                          placeholder="Sliding Glass Door"
                          aria-label={`Area for item ${index + 1}`}
                          data-testid={`input-quote-area-${index}`}
                          style={{
                            width: '100%',
                            border: '1px solid var(--sand)',
                            padding: '7px 6px',
                            fontSize: 11,
                          }}
                        />
                      </td>
                      <td>
                        <NumberInput
                          value={item.quantity}
                          min={1}
                          step={1}
                          onChange={(value) =>
                            updateItem(index, {
                              quantity:
                                value === '' ? '' : Math.max(1, Math.trunc(value)),
                            })
                          }
                          ariaLabel={`Quantity for item ${index + 1}`}
                        />
                      </td>
                      <td>
                        <NumberInput
                          value={item.height}
                          onChange={(value) => updateItem(index, { height: value })}
                          ariaLabel={`Height for item ${index + 1}`}
                        />
                      </td>
                      <td>
                        <NumberInput
                          value={item.width}
                          onChange={(value) => updateItem(index, { width: value })}
                          ariaLabel={`Width for item ${index + 1}`}
                        />
                      </td>
                      <td>
                        <NumberInput
                          value={item.unitPrice}
                          onChange={(value) =>
                            updateItem(index, { unitPrice: value })
                          }
                          ariaLabel={`Unit price for item ${index + 1}`}
                        />
                      </td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <b>{peso(amount)}</b>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="table-action"
                          onClick={() => removeItem(index)}
                          disabled={form.items.length === 1}
                          aria-label={`Remove item ${index + 1}`}
                          data-testid={`button-remove-quote-item-${index}`}
                          style={{
                            opacity: form.items.length === 1 ? 0.35 : 1,
                          }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            className="text-button"
            onClick={() =>
              setForm((current) => ({
                ...current,
                items: [...current.items, newLineItem()],
              }))
            }
            data-testid="button-add-quote-item"
            style={{ marginTop: 12 }}
          >
            <Plus size={14} /> Add another item
          </button>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: 24,
            }}
          >
            <div
              style={{
                width: 'min(100%, 380px)',
                borderTop: '1px solid var(--obsidian)',
                paddingTop: 12,
              }}
            >
              {[
                ['Total Php', totalPhp, false],
                ['Discount', discount, true],
                ['Sub Total', subTotal, false],
                ['Delivery and Mobilization', deliveryMobilization, true],
              ].map(([label, value, editable]) => (
                <div
                  key={label as string}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 150px',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 9,
                    color: 'var(--muted-ink)',
                    fontSize: 11,
                  }}
                >
                  <span>{label as string}</span>
                  {editable ? (
                    <NumberInput
                      value={value as number}
                      onChange={(nextValue) =>
                        setForm((current) => ({
                          ...current,
                          [label === 'Discount'
                            ? 'discount'
                            : 'deliveryMobilization']: nextValue,
                        }))
                      }
                      ariaLabel={label as string}
                      className="totals-input"
                    />
                  ) : (
                    <b
                      style={{
                        color: 'var(--obsidian)',
                        textAlign: 'right',
                        fontSize: 12,
                      }}
                    >
                      {peso(value as number)}
                    </b>
                  )}
                </div>
              ))}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 150px',
                  gap: 12,
                  alignItems: 'baseline',
                  borderTop: '1px solid var(--obsidian)',
                  paddingTop: 12,
                  marginTop: 7,
                }}
              >
                <strong style={{ fontSize: 11 }}>Grand Total</strong>
                <strong
                  style={{
                    textAlign: 'right',
                    font: '600 24px var(--app-font-serif)',
                  }}
                >
                  {peso(grandTotal)}
                </strong>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 12,
              marginTop: 24,
            }}
          >
            <label
              style={{
                color: 'var(--muted-ink)',
                fontSize: 10,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
              }}
            >
              Respectfully Yours Name
              <input
                value={form.signatoryName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    signatoryName: event.target.value,
                  }))
                }
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: 7,
                  border: '1px solid var(--sand)',
                  background: 'white',
                  color: 'var(--obsidian)',
                  padding: '10px 11px',
                  fontSize: 12,
                  textTransform: 'none',
                  letterSpacing: 0,
                }}
                aria-label="Respectfully Yours Name"
                data-testid="input-signatory-name"
              />
            </label>
            <label
              style={{
                color: 'var(--muted-ink)',
                fontSize: 10,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
              }}
            >
              Position / Title
              <input
                value={form.signatoryTitle}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    signatoryTitle: event.target.value,
                  }))
                }
                style={{
                  display: 'block',
                  width: '100%',
                  marginTop: 7,
                  border: '1px solid var(--sand)',
                  background: 'white',
                  color: 'var(--obsidian)',
                  padding: '10px 11px',
                  fontSize: 12,
                  textTransform: 'none',
                  letterSpacing: 0,
                }}
                aria-label="Position or title"
                data-testid="input-signatory-title"
              />
            </label>
          </div>

          {error && (
            <div
              role="alert"
              style={{
                color: 'var(--crimson)',
                background: '#fbeceb',
                padding: '10px 12px',
                marginTop: 18,
                fontSize: 11,
              }}
            >
              {error}
            </div>
          )}
          {exportError && (
            <div
              role="alert"
              style={{
                color: 'var(--crimson)',
                background: '#fbeceb',
                padding: '10px 12px',
                marginTop: 18,
                fontSize: 11,
              }}
            >
              Export error: {exportError}
            </div>
          )}
          {saved && (
            <div
              role="status"
              style={{
                color: 'var(--sage)',
                background: '#e5ebe7',
                padding: '10px 12px',
                marginTop: 18,
                fontSize: 11,
              }}
            >
              Quotation saved to the order desk.
            </div>
          )}

          <div className="quote-actions" style={{ marginTop: 22 }}>
            <button
              type="button"
              className="text-button"
              onClick={() => void exportToExcel()}
              data-testid="button-export-quotation-excel"
            >
              <FileDown size={14} /> Export to Excel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={saved}
              data-testid="button-save-quotation"
            >
              {saved ? 'Saved to Database' : 'Save to Database'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}