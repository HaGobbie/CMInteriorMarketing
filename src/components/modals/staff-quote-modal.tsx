import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from 'react';
import { FileDown, Plus, Printer, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import {
  areaAmount,
  areasOf,
  areaUnitPrice,
  categorySubOptions,
  itemTotalAmount,
  newAreaLine,
  type FulfillmentOrder,
  type InquiryCategory,
  type Product,
  type QuotationAreaLine,
  type QuotationLineItem,
} from '@/lib/mockData';
import {
  defaultCompanySettings,
  fetchCompanySettings,
  type CompanySettings,
} from '@/lib/companySettings';
import { exportQuotationToExcel, openQuotationPrintView } from '@/lib/quotationDocument';

export type StaffQuoteMode = 'create' | 'convert' | 'edit';

type StaffQuoteModalProps = {
  products: Product[];
  onClose: () => void;
  onSave: (order: FulfillmentOrder) => void;
  initialOrder?: FulfillmentOrder;
  mode?: StaffQuoteMode;
  onDelete?: () => void;
};

type QuoteForm = {
  date: string;
  forDescription: string;
  address: string;
  attn: string;
  customerPhone: string;
  customerEmail: string;
  socialHandle: string;
  items: QuotationLineItem[];
  discount: number;
  deliveryMobilization: number;
  signatoryName: string;
  signatoryTitle: string;
};

// Builds the single display string used only for documents (Excel/print)
// and the legacy `contacts` column — never re-parsed back into the form,
// so it can't drift into the "Phone: X · Email: Y · Phone: X · Email: Y"
// duplication that happened when a joined string was also the editable
// source of truth.
const joinContactLines = (phone: string, email: string, social: string) =>
  [
    phone.trim() ? `Phone: ${phone.trim()}` : '',
    email.trim() ? `Email: ${email.trim()}` : '',
    social.trim() ? `Social: ${social.trim()}` : '',
  ]
    .filter(Boolean)
    .join(' · ');

const inquiryCategories: InquiryCategory[] = ['Blinds', 'Custom Curtains', 'Carpets', 'Wallpapers', 'Other'];

const peso = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const numberValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

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

const inputDateFromOrder = (order: FulfillmentOrder) => {
  const parsed = new Date(order.createdAt || order.date);
  if (Number.isNaN(parsed.getTime())) return todayForInput();
  const month = String(parsed.getMonth() + 1).padStart(2, '0');
  const day = String(parsed.getDate()).padStart(2, '0');
  return `${parsed.getFullYear()}-${month}-${day}`;
};

const cloneItem = (item: QuotationLineItem): QuotationLineItem => ({
  ...item,
  areas: areasOf(item).map((area) => ({ ...area })),
  photos: item.photos ? [...item.photos] : [],
});

const newLineItem = (): QuotationLineItem => ({
  id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  category: 'Other',
  subOption: '',
  itemName: '',
  productId: '',
  material: '',
  area: '',
  customNotes: '',
  supplier: '',
  photos: [],
  areas: [newAreaLine()],
  quantity: 1,
  height: 0,
  width: 0,
  unitPrice: 0,
  amount: 0,
});

const formFromOrder = (order: FulfillmentOrder): QuoteForm => ({
  date: inputDateFromOrder(order),
  forDescription: order.forDescription || order.product,
  address: order.address,
  attn: order.attn || order.client,
  customerPhone: order.customerPhone || '',
  customerEmail: order.customerEmail || '',
  socialHandle: order.socialHandle || '',
  items: order.items.length ? order.items.map(cloneItem) : [newLineItem()],
  discount: order.discount || 0,
  deliveryMobilization: order.deliveryMobilization || 0,
  signatoryName: order.signatoryName || 'Chris Abella / Clarissa Abella',
  signatoryTitle: order.signatoryTitle || 'CM Interiors Marketing',
});

const inputStyle = {
  width: '100%',
  border: '1px solid var(--sand)',
  background: 'white',
  color: 'var(--obsidian)',
  padding: '8px 9px',
  fontSize: 11,
};

export default function StaffQuoteModal({
  products,
  onClose,
  onSave,
  initialOrder,
  mode = 'create',
  onDelete,
}: StaffQuoteModalProps) {
  const [form, setForm] = useState<QuoteForm>(() =>
    initialOrder
      ? formFromOrder(initialOrder)
      : {
          date: todayForInput(),
          forDescription: '',
          address: '',
          attn: '',
          customerPhone: '',
          customerEmail: '',
          socialHandle: '',
          items: [newLineItem()],
          discount: 0,
          deliveryMobilization: 0,
          signatoryName: 'Chris Abella / Clarissa Abella',
          signatoryTitle: 'CM Interiors Marketing',
        },
  );
  const [companySettings, setCompanySettings] = useState<CompanySettings>(defaultCompanySettings);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lightboxPhoto, setLightboxPhoto] = useState('');

  useEffect(() => {
    void fetchCompanySettings().then(setCompanySettings);
  }, []);

  const totalPhp = useMemo(
    () => form.items.reduce((sum, item) => sum + itemTotalAmount(item), 0),
    [form.items],
  );
  const discount = Math.max(0, numberValue(form.discount));
  const subTotal = Math.max(0, totalPhp - discount);
  const deliveryMobilization = Math.max(0, numberValue(form.deliveryMobilization));
  const grandTotal = subTotal + deliveryMobilization;

  const updateHeader = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const updateItem = (index: number, patch: Partial<QuotationLineItem>) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  };

  const setItemCategory = (index: number, category: InquiryCategory) => {
    updateItem(index, { category, subOption: categorySubOptions[category]?.[0] ?? '' });
  };

  const selectProduct = (index: number, event: ChangeEvent<HTMLSelectElement>) => {
    const productId = event.target.value;
    const product = products.find((item) => item.id === productId);
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              productId,
              material: product?.name ?? item.material,
              areas: areasOf(item).map((area) => ({
                ...area,
                ratePerSqft: product ? product.rate : area.ratePerSqft,
              })),
            }
          : item,
      ),
    }));
  };

  const removeItem = (index: number) => {
    setForm((current) => ({
      ...current,
      items: current.items.length === 1 ? current.items : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
  };

  const addArea = (itemIndex: number) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, index) =>
        index === itemIndex ? { ...item, areas: [...areasOf(item), newAreaLine(areasOf(item).length)] } : item,
      ),
    }));
  };

  const updateArea = (itemIndex: number, areaIndex: number, patch: Partial<QuotationAreaLine>) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, index) => {
        if (index !== itemIndex) return item;
        return {
          ...item,
          areas: areasOf(item).map((area, idx) => (idx === areaIndex ? { ...area, ...patch } : area)),
        };
      }),
    }));
  };

  const removeArea = (itemIndex: number, areaIndex: number) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, index) => {
        if (index !== itemIndex) return item;
        const areas = areasOf(item);
        if (areas.length <= 1) return item;
        return { ...item, areas: areas.filter((_, idx) => idx !== areaIndex) };
      }),
    }));
  };

  // Turns the editable draft into the shape stored in Supabase: each
  // area's amount is recomputed from its own quantity × unit price, and
  // the item-level flat fields are kept in sync as an aggregate (used by
  // anything that hasn't been updated to read .areas directly).
  const normalizedItems = (): QuotationLineItem[] =>
    form.items.map((item) => {
      const areas = areasOf(item).map((area) => {
        const quantity = Math.max(0.01, numberValue(area.quantity));
        // areaUnitPrice derives the price from ratePerSqft when one is
        // set; the "Unit Price" field is disabled and display-only in
        // that case, so area.unitPrice itself may be stale here.
        const unitPrice = areaUnitPrice(area);
        return {
          ...area,
          area: area.area.trim(),
          quantity,
          unitPrice,
          amount: quantity * unitPrice,
        };
      });
      const amount = areas.reduce((sum, area) => sum + area.amount, 0);
      const quantity = areas.reduce((sum, area) => sum + area.quantity, 0);
      return {
        ...item,
        itemName: item.itemName?.trim() || '',
        material: item.material.trim(),
        area: areas.map((area) => area.area).filter(Boolean).join(', ') || item.area,
        customNotes: item.customNotes?.trim() || '',
        supplier: item.supplier?.trim() || '',
        areas,
        quantity,
        height: areas[0]?.height ?? item.height,
        width: areas[0]?.width ?? item.width,
        unitPrice: areas.length === 1 ? areas[0].unitPrice : item.unitPrice,
        amount,
      };
    });

  const buildOrder = (): FulfillmentOrder => {
    const items = normalizedItems();
    const quoteId = `CM-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`;
    const firstLabel = items[0]?.itemName || items[0]?.material || 'New quotation';
    const itemSuffix = items.length > 1 ? ` · ${items.length} line items` : '';

    return {
      id: initialOrder?.id || quoteId,
      client: form.attn.trim() || 'Unnamed client',
      product: `${firstLabel}${itemSuffix}`,
      amount: grandTotal,
      status: mode === 'convert' ? 'Confirmed Order' : initialOrder?.status || 'Pending Sourcing',
      courier: initialOrder?.courier || '',
      waybillNumber: initialOrder?.waybillNumber || '',
      date: displayDate(form.date),
      forDescription: form.forDescription.trim(),
      address: form.address.trim(),
      attn: form.attn.trim(),
      contacts: joinContactLines(form.customerPhone, form.customerEmail, form.socialHandle),
      items,
      totalPhp,
      discount,
      subTotal,
      deliveryMobilization,
      grandTotal,
      customerPhone: form.customerPhone.trim() || undefined,
      customerEmail: form.customerEmail.trim() || undefined,
      socialHandle: form.socialHandle.trim() || undefined,
      source: initialOrder?.source || 'quotation',
      isDraft: false,
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
    if (form.items.some((item) => areasOf(item).every((area) => !area.area.trim()))) {
      setError('Each item needs at least one room/area filled in.');
      return;
    }
    if (
      form.items.some((item) =>
        areasOf(item).some((area) => numberValue(area.quantity) <= 0 || numberValue(area.unitPrice) < 0),
      )
    ) {
      // Quantities may be fractional (e.g. 12.5 sq ft of carpet), so this
      // only checks that they're positive — not that they're whole numbers.
      setError('Each room/area needs a quantity greater than 0 and a non-negative unit price.');
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
    const payload = {
      status: order.status,
      for_description: form.forDescription.trim(),
      address: form.address.trim(),
      attn: form.attn.trim(),
      contacts: order.contacts,
      items: order.items,
      total_php: totalPhp,
      discount,
      sub_total: subTotal,
      delivery_mobilization: deliveryMobilization,
      grand_total: grandTotal,
      signatory_name: form.signatoryName.trim(),
      signatory_title: form.signatoryTitle.trim(),
      customer_name: form.attn.trim(),
      customer_email: order.customerEmail || '',
      customer_phone: order.customerPhone || '',
      social_handle: order.socialHandle || '',
      estimated_total: grandTotal,
      courier: order.courier,
      waybill_number: order.waybillNumber,
    };

    let savedId = order.id;
    if (initialOrder) {
      const { error: updateError } = await supabase.from('orders').update(payload).eq('id', initialOrder.id);
      if (updateError) {
        setError(`Could not update order: ${updateError.message}`);
        setSaving(false);
        return;
      }
    } else {
      const { data: savedRow, error: insertError } = await supabase
        .from('orders')
        .insert({ ...payload, user_id: user.id })
        .select('id')
        .single();

      if (insertError) {
        setError(`Could not save quotation: ${insertError.message}`);
        setSaving(false);
        return;
      }
      if (savedRow?.id) savedId = String(savedRow.id);
    }

    onSave({ ...order, id: savedId });
    setSaved(true);
    setSaving(false);
  };

  const documentFromForm = (variant: 'quotation' | 'inquiry') => ({
    variant,
    header: {
      reference: initialOrder?.id || '',
      date: displayDate(form.date),
      forDescription: form.forDescription,
      address: form.address,
      attn: form.attn,
      contacts: joinContactLines(form.customerPhone, form.customerEmail, form.socialHandle),
    },
    items: normalizedItems(),
    totals: { totalPhp, discount, subTotal, deliveryMobilization, grandTotal },
    company: companySettings,
    signatoryName: form.signatoryName,
    signatoryTitle: form.signatoryTitle,
  });

  const exportToExcel = async () => {
    setExportError('');
    try {
      await exportQuotationToExcel(documentFromForm('quotation'));
    } catch (exportFailure) {
      setExportError(exportFailure instanceof Error ? exportFailure.message : 'The quotation could not be exported.');
    }
  };

  const printQuotation = () => {
    void openQuotationPrintView(documentFromForm('quotation'));
  };

  const allPhotos = useMemo(
    () => [...new Set(form.items.flatMap((item) => item.photos ?? []))],
    [form.items],
  );

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
              {mode === 'edit'
                ? 'Project desk · confirmed order'
                : mode === 'convert'
                  ? 'Project desk · final quotation review'
                  : 'Project desk · new order'}
            </div>
            <h2 id="staff-quote-modal-title">{mode === 'edit' ? 'Edit confirmed order' : 'Create quotation'}</h2>
          </div>
          <button className="close-button" onClick={onClose} aria-label="Close quotation creator" data-testid="button-close-staff-quote">
            <X size={18} />
          </button>
        </div>
        <form className="modal-body" onSubmit={saveQuotation}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 12,
              marginBottom: 25,
            }}
          >
            {[
              ['date', 'Date'],
              ['forDescription', 'For / project description'],
              ['address', 'Address'],
              ['attn', 'ATTN / client name'],
              ['customerPhone', 'Phone'],
              ['customerEmail', 'Email'],
              ['socialHandle', 'Social handle (optional)'],
            ].map(([name, label]) => (
              <label
                key={name}
                style={{
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
                  type={name === 'date' ? 'date' : name === 'customerEmail' ? 'email' : 'text'}
                  value={
                    form[
                      name as
                        | 'date'
                        | 'forDescription'
                        | 'address'
                        | 'attn'
                        | 'customerPhone'
                        | 'customerEmail'
                        | 'socialHandle'
                    ]
                  }
                  onChange={updateHeader}
                  placeholder={name === 'forDescription' ? 'Supply and installation of Vertical PVC' : undefined}
                  required={name === 'forDescription' || name === 'attn'}
                  style={{ ...inputStyle, display: 'block', marginTop: 7, padding: '10px 11px', fontSize: 12 }}
                />
              </label>
            ))}
          </div>

          {allPhotos.length > 0 && (
            <div style={{ marginBottom: 20, paddingBottom: 20, borderBottom: '1px solid var(--sand)' }}>
              <span className="eyebrow">Reference photos from the customer</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
                {allPhotos.map((photoUrl) => (
                  <button
                    key={photoUrl}
                    type="button"
                    onClick={() => setLightboxPhoto(photoUrl)}
                    aria-label="Enlarge photo"
                    style={{ width: 78, height: 78, padding: 0, border: '1px solid var(--sand)', overflow: 'hidden', cursor: 'zoom-in' }}
                  >
                    <img src={photoUrl} alt="Customer reference" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12, marginBottom: 10 }}>
            <div>
              <div style={{ color: 'var(--muted-ink)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase' }}>
                Quotation details
              </div>
              <h3 style={{ margin: '5px 0 0', font: '600 21px var(--app-font-serif)' }}>Materials &amp; measurements</h3>
            </div>
            <span style={{ color: 'var(--muted-ink)', fontSize: 11 }}>Area amount = Qty × Unit Price</span>
          </div>

          <div style={{ display: 'grid', gap: 16 }}>
            {form.items.map((item, itemIndex) => {
              const subOptions = categorySubOptions[item.category ?? 'Other'] ?? [];
              const areas = areasOf(item);
              return (
                <div key={item.id} style={{ border: '1px solid var(--sand)', background: '#faf8f5', padding: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 10 }}>
                    <label style={{ color: 'var(--muted-ink)', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                      Catalog product (optional)
                      <select
                        value={item.productId || ''}
                        onChange={(event) => selectProduct(itemIndex, event)}
                        style={{ ...inputStyle, marginTop: 6 }}
                        aria-label={`Catalog product for item ${itemIndex + 1}`}
                        data-testid={`select-quote-product-${itemIndex}`}
                      >
                        <option value="">Manual entry</option>
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} · {peso(product.rate)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label style={{ color: 'var(--muted-ink)', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                      Item name
                      <input
                        value={item.itemName ?? ''}
                        onChange={(event) => updateItem(itemIndex, { itemName: event.target.value })}
                        placeholder="e.g. Vertical PVC blinds"
                        style={{ ...inputStyle, marginTop: 6 }}
                        aria-label={`Item name for item ${itemIndex + 1}`}
                        data-testid={`input-quote-item-name-${itemIndex}`}
                      />
                    </label>
                    <label style={{ color: 'var(--muted-ink)', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                      Category
                      <select
                        value={item.category ?? 'Other'}
                        onChange={(event) => setItemCategory(itemIndex, event.target.value as InquiryCategory)}
                        style={{ ...inputStyle, marginTop: 6 }}
                        aria-label={`Category for item ${itemIndex + 1}`}
                        data-testid={`select-quote-category-${itemIndex}`}
                      >
                        {inquiryCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>
                    {subOptions.length > 0 && (
                      <label style={{ color: 'var(--muted-ink)', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                        Finish / opacity
                        <select
                          value={item.subOption ?? ''}
                          onChange={(event) => updateItem(itemIndex, { subOption: event.target.value })}
                          style={{ ...inputStyle, marginTop: 6 }}
                          aria-label={`Finish for item ${itemIndex + 1}`}
                          data-testid={`select-quote-suboption-${itemIndex}`}
                        >
                          {subOptions.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    )}
                    <label style={{ color: 'var(--muted-ink)', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                      Material
                      <input
                        value={item.material}
                        onChange={(event) => updateItem(itemIndex, { material: event.target.value })}
                        placeholder="e.g. Vertical PVC"
                        style={{ ...inputStyle, marginTop: 6 }}
                        aria-label={`Material for item ${itemIndex + 1}`}
                        data-testid={`input-quote-material-${itemIndex}`}
                      />
                    </label>
                    <label style={{ color: 'var(--muted-ink)', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase' }}>
                      Supplier
                      <input
                        value={item.supplier || ''}
                        onChange={(event) => updateItem(itemIndex, { supplier: event.target.value })}
                        placeholder="Supplier / warehouse"
                        style={{ ...inputStyle, marginTop: 6 }}
                        aria-label={`Supplier for item ${itemIndex + 1}`}
                        data-testid={`input-quote-supplier-${itemIndex}`}
                      />
                    </label>
                  </div>

                  <label
                    style={{
                      display: 'block',
                      color: 'var(--muted-ink)',
                      fontSize: 10,
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                      marginBottom: 10,
                    }}
                  >
                    Customer notes
                    <textarea
                      value={item.customNotes || ''}
                      onChange={(event) => updateItem(itemIndex, { customNotes: event.target.value })}
                      placeholder="Customer notes / rough measurements"
                      rows={2}
                      style={{ ...inputStyle, marginTop: 6, resize: 'vertical' }}
                      aria-label={`Customer notes for item ${itemIndex + 1}`}
                      data-testid={`textarea-quote-notes-${itemIndex}`}
                    />
                  </label>

                  <div style={{ overflowX: 'auto', border: '1px solid var(--sand)' }}>
                    <table className="admin-table" style={{ minWidth: 720, background: 'white' }}>
                      <thead>
                        <tr>
                          <th style={{ width: 220 }}>Room / area</th>
                          <th>H (in)</th>
                          <th>W (in)</th>
                          <th>Qty / sets</th>
                          <th>₱/sqft</th>
                          <th>Unit price</th>
                          <th>Amount</th>
                          <th aria-label="Remove area" />
                        </tr>
                      </thead>
                      <tbody>
                        {areas.map((area, areaIndex) => (
                          <tr key={area.id || areaIndex}>
                            <td>
                              <input
                                value={area.area}
                                onChange={(event) => updateArea(itemIndex, areaIndex, { area: event.target.value })}
                                placeholder="Sliding Glass Door"
                                style={inputStyle}
                                aria-label={`Area name ${areaIndex + 1} for item ${itemIndex + 1}`}
                                data-testid={`input-quote-area-${itemIndex}-${areaIndex}`}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={area.height || ''}
                                onChange={(event) =>
                                  updateArea(itemIndex, areaIndex, { height: Math.max(0, numberValue(event.target.value)) })
                                }
                                style={{ ...inputStyle, width: 74 }}
                                aria-label={`Height for area ${areaIndex + 1} of item ${itemIndex + 1}`}
                                data-testid={`input-quote-area-height-${itemIndex}-${areaIndex}`}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={area.width || ''}
                                onChange={(event) =>
                                  updateArea(itemIndex, areaIndex, { width: Math.max(0, numberValue(event.target.value)) })
                                }
                                style={{ ...inputStyle, width: 74 }}
                                aria-label={`Width for area ${areaIndex + 1} of item ${itemIndex + 1}`}
                                data-testid={`input-quote-area-width-${itemIndex}-${areaIndex}`}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min={0.01}
                                step="0.01"
                                value={area.quantity || ''}
                                onChange={(event) =>
                                  updateArea(itemIndex, areaIndex, { quantity: Math.max(0, numberValue(event.target.value)) })
                                }
                                style={{ ...inputStyle, width: 70 }}
                                aria-label={`Quantity for area ${areaIndex + 1} of item ${itemIndex + 1}`}
                                data-testid={`input-quote-area-quantity-${itemIndex}-${areaIndex}`}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={area.ratePerSqft || ''}
                                onChange={(event) =>
                                  updateArea(itemIndex, areaIndex, {
                                    ratePerSqft: Math.max(0, numberValue(event.target.value)) || undefined,
                                  })
                                }
                                placeholder="Optional"
                                style={{ ...inputStyle, width: 80 }}
                                aria-label={`Price per square foot for area ${areaIndex + 1} of item ${itemIndex + 1}`}
                                data-testid={`input-quote-area-rate-per-sqft-${itemIndex}-${areaIndex}`}
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                min={0}
                                step="0.01"
                                value={area.ratePerSqft ? Math.round(areaUnitPrice(area) * 100) / 100 : area.unitPrice || ''}
                                disabled={Boolean(area.ratePerSqft)}
                                onChange={(event) =>
                                  updateArea(itemIndex, areaIndex, { unitPrice: Math.max(0, numberValue(event.target.value)) })
                                }
                                title={
                                  area.ratePerSqft
                                    ? 'Calculated from ₱/sqft × (H × W ÷ 144). Clear ₱/sqft to enter a price manually.'
                                    : undefined
                                }
                                style={{
                                  ...inputStyle,
                                  width: 92,
                                  ...(area.ratePerSqft ? { background: '#f3f0ec', color: 'var(--muted-ink)' } : {}),
                                }}
                                aria-label={`Unit price for area ${areaIndex + 1} of item ${itemIndex + 1}`}
                                data-testid={`input-quote-area-unit-price-${itemIndex}-${areaIndex}`}
                              />
                            </td>
                            <td style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700 }}>
                              {peso(areaAmount(area))}
                            </td>
                            <td>
                              <button
                                type="button"
                                className="table-action"
                                onClick={() => removeArea(itemIndex, areaIndex)}
                                disabled={areas.length === 1}
                                aria-label={`Remove area ${areaIndex + 1} of item ${itemIndex + 1}`}
                                data-testid={`button-remove-quote-area-${itemIndex}-${areaIndex}`}
                                style={{ opacity: areas.length === 1 ? 0.35 : 1 }}
                              >
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, flexWrap: 'wrap', gap: 8 }}>
                    <button
                      type="button"
                      className="text-button"
                      onClick={() => addArea(itemIndex)}
                      data-testid={`button-add-quote-area-${itemIndex}`}
                    >
                      <Plus size={14} /> Add another room / area
                    </button>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <span style={{ fontSize: 11, color: 'var(--muted-ink)' }}>
                        Item subtotal <b style={{ color: 'var(--obsidian)' }}>{peso(itemTotalAmount(item))}</b>
                      </span>
                      <button
                        type="button"
                        className="table-action"
                        onClick={() => removeItem(itemIndex)}
                        disabled={form.items.length === 1}
                        aria-label={`Remove item ${itemIndex + 1}`}
                        data-testid={`button-remove-quote-item-${itemIndex}`}
                        style={{ color: '#b24949', opacity: form.items.length === 1 ? 0.35 : 1 }}
                      >
                        <Trash2 size={13} /> Remove item
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            className="text-button"
            onClick={() => setForm((current) => ({ ...current, items: [...current.items, newLineItem()] }))}
            data-testid="button-add-quote-item"
            style={{ marginTop: 12 }}
          >
            <Plus size={14} /> Add another item
          </button>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 24 }}>
            <div style={{ width: 'min(100%, 380px)', borderTop: '1px solid var(--obsidian)', paddingTop: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted-ink)', fontSize: 11, marginBottom: 9 }}>
                <span>Total Php</span>
                <b style={{ color: 'var(--obsidian)' }}>{peso(totalPhp)}</b>
              </div>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, color: 'var(--muted-ink)', fontSize: 11, marginBottom: 9 }}>
                <span>Discount</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.discount || ''}
                  onChange={(event) => setForm((current) => ({ ...current, discount: Math.max(0, numberValue(event.target.value)) }))}
                  style={{ ...inputStyle, width: 150 }}
                  aria-label="Discount"
                  data-testid="input-quote-discount"
                />
              </label>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--muted-ink)', fontSize: 11, marginBottom: 9 }}>
                <span>Sub Total</span>
                <b style={{ color: 'var(--obsidian)' }}>{peso(subTotal)}</b>
              </div>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, color: 'var(--muted-ink)', fontSize: 11 }}>
                <span>Delivery and Mobilization</span>
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.deliveryMobilization || ''}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, deliveryMobilization: Math.max(0, numberValue(event.target.value)) }))
                  }
                  style={{ ...inputStyle, width: 150 }}
                  aria-label="Delivery and mobilization"
                  data-testid="input-quote-delivery"
                />
              </label>
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
                <strong style={{ textAlign: 'right', font: '600 24px var(--app-font-serif)' }}>{peso(grandTotal)}</strong>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginTop: 24 }}>
            <label style={{ color: 'var(--muted-ink)', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase' }}>
              Respectfully Yours Name
              <input
                value={form.signatoryName}
                onChange={(event) => setForm((current) => ({ ...current, signatoryName: event.target.value }))}
                style={{ ...inputStyle, display: 'block', marginTop: 7, padding: '10px 11px', fontSize: 12 }}
                aria-label="Respectfully Yours Name"
                data-testid="input-signatory-name"
              />
            </label>
            <label style={{ color: 'var(--muted-ink)', fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase' }}>
              Position / Title
              <input
                value={form.signatoryTitle}
                onChange={(event) => setForm((current) => ({ ...current, signatoryTitle: event.target.value }))}
                style={{ ...inputStyle, display: 'block', marginTop: 7, padding: '10px 11px', fontSize: 12 }}
                aria-label="Position or title"
                data-testid="input-signatory-title"
              />
            </label>
          </div>
          <p style={{ margin: '10px 0 0', color: 'var(--muted-ink)', fontSize: 10, lineHeight: 1.6 }}>
            Office address, phone numbers, email, and the printed Terms &amp; Conditions come from the shared
            letterhead settings — use “Edit Letterhead &amp; Terms” on the project desk to update those.
          </p>

          {error && (
            <div role="alert" style={{ color: 'var(--crimson)', background: '#fbeceb', padding: '10px 12px', marginTop: 18, fontSize: 11 }}>
              {error}
            </div>
          )}
          {exportError && (
            <div role="alert" style={{ color: 'var(--crimson)', background: '#fbeceb', padding: '10px 12px', marginTop: 18, fontSize: 11 }}>
              Export error: {exportError}
            </div>
          )}
          {saved && (
            <div role="status" style={{ color: 'var(--sage)', background: '#e5ebe7', padding: '10px 12px', marginTop: 18, fontSize: 11 }}>
              {mode === 'edit'
                ? 'Order changes saved to the fulfillment desk.'
                : mode === 'convert'
                  ? 'Confirmed order saved to the fulfillment desk.'
                  : 'Quotation saved to the order desk.'}
            </div>
          )}

          <div className="quote-actions" style={{ marginTop: 22, flexWrap: 'wrap' }}>
            {onDelete && mode === 'edit' && (
              <button
                type="button"
                className="text-button"
                onClick={onDelete}
                disabled={saving}
                style={{ color: '#b24949', marginRight: 'auto' }}
                data-testid="button-delete-confirmed-order"
              >
                <Trash2 size={14} /> Delete order
              </button>
            )}
            <button type="button" className="text-button" onClick={printQuotation} data-testid="button-print-quotation">
              <Printer size={14} /> Print
            </button>
            <button type="button" className="text-button" onClick={() => void exportToExcel()} data-testid="button-export-quotation-excel">
              <FileDown size={14} /> Export to Excel
            </button>
            <button type="submit" className="primary-button" disabled={saved} data-testid="button-save-quotation">
              {saved
                ? 'Saved to Database'
                : mode === 'edit'
                  ? 'Save Order Changes'
                  : mode === 'convert'
                    ? 'Confirm Order'
                    : 'Save to Database'}
            </button>
          </div>
        </form>
      </div>

      {lightboxPhoto && (
        <div className="overlay" onMouseDown={() => setLightboxPhoto('')} style={{ zIndex: 60 }}>
          <img
            src={lightboxPhoto}
            alt="Enlarged customer reference"
            style={{ maxWidth: '92vw', maxHeight: '92vh', boxShadow: '0 20px 60px rgba(0,0,0,.4)' }}
          />
        </div>
      )}
    </div>
  );
}
