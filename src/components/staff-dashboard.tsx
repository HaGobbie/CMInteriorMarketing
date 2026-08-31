import {
  Fragment,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  ArrowRight,
  Check,
  FileText,
  MessageCircle,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import LogoUploadModal from '@/components/modals/logo-upload-modal';
import StaffProductModal from '@/components/modals/staff-product-modal';
import StaffQuoteModal from '@/components/modals/staff-quote-modal';
import {
  orderStatuses,
  type FulfillmentOrder,
  type InquiryCategory,
  type Product,
  type QuotationLineItem,
} from '@/lib/mockData';

type StaffDashboardProps = {
  products: Product[];
  setProducts: Dispatch<SetStateAction<Product[]>>;
  orders: FulfillmentOrder[];
  setOrders: Dispatch<SetStateAction<FulfillmentOrder[]>>;
  onClose: () => void;
};

type OrderDraft = {
  status: string;
  courier: string;
  items: QuotationLineItem[];
};

type InquiryDraft = {
  forDescription: string;
  address: string;
  items: QuotationLineItem[];
  discount: number;
  deliveryMobilization: number;
};

type RowSaveState = 'saving' | 'saved' | 'error';

const inquiryStatuses = ['Quote Requested', 'Draft Quote'];
const inquiryCategories: InquiryCategory[] = [
  'Blinds',
  'Custom Curtains',
  'Carpets',
  'Wallpapers',
  'Other',
];

const peso = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

const numberValue = (value: unknown) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const cloneItems = (items: QuotationLineItem[]) =>
  items.map((item) => ({ ...item }));

const itemAmount = (item: QuotationLineItem) =>
  Math.max(0, numberValue(item.quantity)) * Math.max(0, numberValue(item.unitPrice));

const draftFromOrder = (order: FulfillmentOrder): OrderDraft => ({
  status: order.status,
  courier: order.courier,
  items: cloneItems(order.items),
});

const inquiryDraftFromOrder = (
  order: FulfillmentOrder,
): InquiryDraft => ({
  forDescription: order.forDescription,
  address: order.address,
  items: cloneItems(order.items),
  discount: numberValue(order.discount),
  deliveryMobilization: numberValue(order.deliveryMobilization),
});

const isInquiryOrder = (order: FulfillmentOrder) =>
  order.isDraft === true || inquiryStatuses.includes(order.status);

const statusCandidates = (label: string) => {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const aliases: Record<string, string[]> = {
    'Quote Requested': ['Quote Requested', 'quote_requested', 'pending'],
    'Draft Quote': ['Draft Quote', 'draft_quote', 'draft'],
    'Confirmed Order': ['Confirmed Order', 'confirmed_order', 'confirmed'],
    'Pending Sourcing': [
      'Pending Sourcing',
      'pending_sourcing',
      'processing',
    ],
    'Sourced from Davao Warehouse': [
      'Sourced from Davao Warehouse',
      'sourced_from_davao_warehouse',
      'sourced_davao_warehouse',
      'processing',
    ],
    'Sourced from Homedex / Manila': [
      'Sourced from Homedex / Manila',
      'sourced_from_homedex_manila',
      'sourced_homedex_manila',
      'processing',
    ],
    'In Transit': ['In Transit', 'in_transit', 'shipped'],
    'Ready for Installation': [
      'Ready for Installation',
      'ready_for_installation',
      'ready_for_delivery',
    ],
    Fulfilled: ['Fulfilled', 'fulfilled', 'delivered'],
  };
  return [...new Set([...(aliases[label] ?? []), slug])];
};

const inquiryContact = (order: FulfillmentOrder) =>
  [
    order.customerPhone ? `Phone: ${order.customerPhone}` : '',
    order.customerEmail ? `Email: ${order.customerEmail}` : '',
    order.socialHandle ? `Social: ${order.socialHandle}` : '',
    order.contacts,
  ]
    .filter(Boolean)
    .join(' · ');

const inputStyle = {
  width: '100%',
  border: '1px solid var(--sand)',
  background: 'white',
  color: 'var(--obsidian)',
  padding: '8px 9px',
  fontSize: 11,
};

export default function StaffDashboard({
  products,
  setProducts,
  orders,
  setOrders,
  onClose,
}: StaffDashboardProps) {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [logoUploadOpen, setLogoUploadOpen] = useState(false);
  const [productEditor, setProductEditor] = useState<{
    product?: Product;
  } | null>(null);
  const [logoVersion, setLogoVersion] = useState(0);
  const [actionError, setActionError] = useState('');
  const [drafts, setDrafts] = useState<Record<string, OrderDraft>>({});
  const [dirtyOrders, setDirtyOrders] = useState<Record<string, boolean>>({});
  const [rowSaveStates, setRowSaveStates] = useState<
    Record<string, RowSaveState | undefined>
  >({});
  const [rowSaveErrors, setRowSaveErrors] = useState<Record<string, string>>(
    {},
  );
  const [selectedInquiry, setSelectedInquiry] =
    useState<FulfillmentOrder | null>(null);
  const [inquiryDraft, setInquiryDraft] = useState<InquiryDraft | null>(null);
  const [inquirySaveState, setInquirySaveState] = useState<
    'idle' | 'saving' | 'saved' | 'error'
  >('idle');
  const [inquirySaveError, setInquirySaveError] = useState('');

  const inquiryOrders = useMemo(
    () => orders.filter(isInquiryOrder),
    [orders],
  );
  const activeOrders = useMemo(
    () => orders.filter((order) => !isInquiryOrder(order)),
    [orders],
  );

  const getDraft = (order: FulfillmentOrder) =>
    drafts[order.id] ?? draftFromOrder(order);

  const updateDraft = (
    order: FulfillmentOrder,
    patch: Partial<OrderDraft>,
  ) => {
    setDrafts((current) => {
      const currentDraft = current[order.id] ?? draftFromOrder(order);
      return {
        ...current,
        [order.id]: {
          ...currentDraft,
          ...patch,
        },
      };
    });
    setDirtyOrders((current) => ({ ...current, [order.id]: true }));
    setRowSaveStates((current) => ({
      ...current,
      [order.id]: undefined,
    }));
    setRowSaveErrors((current) => {
      const next = { ...current };
      delete next[order.id];
      return next;
    });
  };

  const updateItemWaybill = (
    order: FulfillmentOrder,
    itemIndex: number,
    waybillNumber: string,
  ) => {
    const draft = getDraft(order);
    updateDraft(order, {
      items: draft.items.map((item, index) =>
        index === itemIndex
          ? { ...item, waybillNumber: waybillNumber || undefined }
          : item,
      ),
    });
  };

  const saveOrderUpdates = async (order: FulfillmentOrder) => {
    const draft = getDraft(order);
    setActionError('');
    setRowSaveStates((current) => ({ ...current, [order.id]: 'saving' }));
    setRowSaveErrors((current) => {
      const next = { ...current };
      delete next[order.id];
      return next;
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      const message =
        'Please sign in through Supabase Auth before saving order updates.';
      setRowSaveStates((current) => ({ ...current, [order.id]: 'error' }));
      setRowSaveErrors((current) => ({ ...current, [order.id]: message }));
      return;
    }

    const candidates = statusCandidates(draft.status);
    let lastError: { message: string } | null = null;

    for (const status of candidates) {
      const { error } = await supabase
        .from('orders')
        .update({
          status,
          courier: draft.courier.trim(),
          items: draft.items,
        })
        .eq('id', order.id);

      if (!error) {
        const updatedOrder = {
          ...order,
          status: draft.status,
          courier: draft.courier.trim(),
          items: cloneItems(draft.items),
          waybillNumber:
            order.waybillNumber ||
            draft.items.find((item) => item.waybillNumber)?.waybillNumber ||
            '',
        };
        setOrders((current) =>
          current.map((currentOrder) =>
            currentOrder.id === order.id ? updatedOrder : currentOrder,
          ),
        );
        setDrafts((current) => {
          const next = { ...current };
          delete next[order.id];
          return next;
        });
        setDirtyOrders((current) => {
          const next = { ...current };
          delete next[order.id];
          return next;
        });
        setRowSaveStates((current) => ({ ...current, [order.id]: 'saved' }));
        window.setTimeout(() => {
          setRowSaveStates((current) => {
            if (current[order.id] !== 'saved') return current;
            return { ...current, [order.id]: undefined };
          });
        }, 2200);
        return;
      }
      lastError = error;
    }

    const message = lastError
      ? `Could not save updates: ${lastError.message}`
      : 'Could not save updates.';
    setRowSaveStates((current) => ({ ...current, [order.id]: 'error' }));
    setRowSaveErrors((current) => ({ ...current, [order.id]: message }));
  };

  const openInquiry = (order: FulfillmentOrder) => {
    setSelectedInquiry(order);
    setInquiryDraft(inquiryDraftFromOrder(order));
    setInquirySaveState('idle');
    setInquirySaveError('');
  };

  const closeInquiry = () => {
    if (inquirySaveState === 'saving') return;
    setSelectedInquiry(null);
    setInquiryDraft(null);
    setInquirySaveState('idle');
    setInquirySaveError('');
  };

  const updateInquiry = (patch: Partial<InquiryDraft>) => {
    setInquiryDraft((current) => (current ? { ...current, ...patch } : current));
    setInquirySaveState('idle');
    setInquirySaveError('');
  };

  const updateInquiryItem = (
    itemIndex: number,
    patch: Partial<QuotationLineItem>,
  ) => {
    setInquiryDraft((current) =>
      current
        ? {
            ...current,
            items: current.items.map((item, index) =>
              index === itemIndex ? { ...item, ...patch } : item,
            ),
          }
        : current,
    );
    setInquirySaveState('idle');
    setInquirySaveError('');
  };

  const removeInquiryItem = (itemIndex: number) => {
    setInquiryDraft((current) =>
      current && current.items.length > 1
        ? {
            ...current,
            items: current.items.filter((_, index) => index !== itemIndex),
          }
        : current,
    );
  };

  const addInquiryItem = () => {
    setInquiryDraft((current) =>
      current
        ? {
            ...current,
            items: [
              ...current.items,
              {
                id: `draft-item-${Date.now()}-${current.items.length}`,
                category: 'Other',
                material: '',
                area: '',
                customNotes: '',
                supplier: '',
                quantity: 1,
                height: 0,
                width: 0,
                unitPrice: 0,
                amount: 0,
              },
            ],
          }
        : current,
    );
  };

  const saveInquiry = async (convertToOrder: boolean) => {
    if (!selectedInquiry || !inquiryDraft) return;
    setInquirySaveState('saving');
    setInquirySaveError('');

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setInquirySaveState('error');
      setInquirySaveError(
        'Please sign in through Supabase Auth before saving inquiry changes.',
      );
      return;
    }

    const normalizedItems = inquiryDraft.items.map((item) => ({
      ...item,
      material: item.material.trim(),
      area: item.area.trim(),
      customNotes: item.customNotes?.trim() || '',
      supplier: item.supplier?.trim() || '',
      quantity: Math.max(1, Math.trunc(numberValue(item.quantity))),
      unitPrice: Math.max(0, numberValue(item.unitPrice)),
      amount: itemAmount(item),
    }));
    const totalPhp = normalizedItems.reduce(
      (sum, item) => sum + item.amount,
      0,
    );
    const discount = Math.max(0, numberValue(inquiryDraft.discount));
    const subTotal = Math.max(0, totalPhp - discount);
    const deliveryMobilization = Math.max(
      0,
      numberValue(inquiryDraft.deliveryMobilization),
    );
    const grandTotal = subTotal + deliveryMobilization;
    const targetStatus = convertToOrder ? 'Confirmed Order' : 'Draft Quote';
    let lastError: { message: string } | null = null;

    for (const status of statusCandidates(targetStatus)) {
      const { error } = await supabase
        .from('orders')
        .update({
          status,
          for_description: inquiryDraft.forDescription.trim(),
          address: inquiryDraft.address.trim(),
          items: normalizedItems,
          total_php: totalPhp,
          discount,
          sub_total: subTotal,
          delivery_mobilization: deliveryMobilization,
          grand_total: grandTotal,
          estimated_total: grandTotal,
        })
        .eq('id', selectedInquiry.id);

      if (!error) {
        const updatedOrder: FulfillmentOrder = {
          ...selectedInquiry,
          status: targetStatus,
          isDraft: !convertToOrder,
          source: convertToOrder ? 'quotation' : 'custom_inquiry',
          forDescription: inquiryDraft.forDescription.trim(),
          address: inquiryDraft.address.trim(),
          items: cloneItems(normalizedItems),
          amount: grandTotal,
          totalPhp,
          discount,
          subTotal,
          deliveryMobilization,
          grandTotal,
        };
        setOrders((current) =>
          current.map((order) =>
            order.id === selectedInquiry.id ? updatedOrder : order,
          ),
        );
        setInquirySaveState('saved');
        if (convertToOrder) {
          setSelectedInquiry(null);
          setInquiryDraft(null);
        } else {
          setSelectedInquiry(updatedOrder);
          setInquiryDraft(inquiryDraftFromOrder(updatedOrder));
        }
        return;
      }
      lastError = error;
    }

    setInquirySaveState('error');
    setInquirySaveError(
      lastError
        ? `Could not save inquiry: ${lastError.message}`
        : 'Could not save inquiry.',
    );
  };

  const saveProduct = (product: Product, existingId?: string) => {
    setProducts((current) => {
      if (!existingId) return [...current, product];
      return current.map((currentProduct) =>
        currentProduct.id === existingId ? product : currentProduct,
      );
    });
    setProductEditor(null);
  };

  const archiveProduct = async (id: string) => {
    setActionError('');
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setActionError(
        'Please sign in through Supabase Auth before editing the catalog.',
      );
      return;
    }

    const { error } = await supabase
      .from('products')
      .update({ is_archived: true })
      .eq('id', id);

    if (error) {
      setActionError(`Could not delete product: ${error.message}`);
      return;
    }
    setProducts((current) =>
      current.filter((product) => product.id !== id),
    );
  };

  const openNewProduct = () => {
    setActionError('');
    setProductEditor({});
  };

  return (
    <div className="staff-overlay">
      <div className="staff-shell">
        <header className="staff-top">
          <div className="brand">
            <button
              type="button"
              onClick={() => setLogoUploadOpen(true)}
              title="Click to change logo"
              aria-label="Click to change logo"
              data-testid="button-change-logo"
              style={{
                background: 'transparent',
                border: 0,
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
              }}
            >
              <img
                src={`${import.meta.env.BASE_URL}assets/logo/CMInteriorLogoTransparentBG.png?v=${logoVersion}`}
                alt="CM Interiors Marketing logo"
                style={{
                  width: 48,
                  height: 48,
                  objectFit: 'contain',
                }}
              />
            </button>
            <span className="brand-copy">
              <span className="brand-name">CM INTERIORS MARKETING</span>
              <span className="brand-sub">Inquiry and project desk</span>
            </span>
          </div>
          <div className="staff-top-actions">
            <button onClick={onClose} data-testid="button-exit-staff">
              Exit portal
            </button>
          </div>
        </header>

        <div className="staff-title">
          <div>
            <div className="eyebrow" style={{ color: '#d6e0da' }}>
              Good morning, team
            </div>
            <h1>Project desk.</h1>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'end',
              gap: 22,
              flexWrap: 'wrap',
              justifyContent: 'end',
            }}
          >
            <p style={{ margin: 0 }}>
              {new Date().toLocaleDateString('en-GB', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              <br />
              Davao City · showroom view
            </p>
            <button
              className="primary-button"
              onClick={() => setQuoteOpen(true)}
              data-testid="button-create-quotation"
              style={{ whiteSpace: 'nowrap' }}
            >
              <FileText size={14} /> Create quotation
            </button>
          </div>
        </div>

        <div className="stat-grid">
          <div className="stat">
            <span>New inquiries</span>
            <strong>
              {inquiryOrders.filter((order) => order.status === 'Quote Requested').length}
            </strong>
          </div>
          <div className="stat">
            <span>Draft quotes</span>
            <strong>
              {inquiryOrders.filter((order) => order.status === 'Draft Quote').length}
            </strong>
          </div>
          <div className="stat">
            <span>Ready to install</span>
            <strong>
              {
                activeOrders.filter(
                  (order) => order.status === 'Ready for Installation',
                ).length
              }
            </strong>
          </div>
          <div className="stat">
            <span>Catalog lines</span>
            <strong>{products.length}</strong>
          </div>
        </div>

        <div className="staff-panels">
          <section className="staff-panel">
            <div className="panel-head">
              <div>
                <h2>Inquiry review</h2>
                <span
                  style={{
                    display: 'block',
                    color: 'var(--muted-ink)',
                    fontSize: 10,
                    marginTop: 4,
                  }}
                >
                  Custom requests waiting for a considered response
                </span>
              </div>
              <span style={{ color: 'var(--muted-ink)', fontSize: 10 }}>
                {inquiryOrders.length} logged
              </span>
            </div>
            {inquiryOrders.length > 0 ? (
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Client / request</th>
                    <th>Areas</th>
                    <th>Contact</th>
                    <th>State</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {inquiryOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong
                          style={{
                            display: 'block',
                            color: 'var(--obsidian)',
                            fontSize: 13,
                          }}
                        >
                          {order.client}
                        </strong>
                        <span
                          style={{
                            display: 'block',
                            color: 'var(--muted-ink)',
                            fontSize: 10,
                            marginTop: 3,
                          }}
                        >
                          {order.forDescription || 'Custom interior inquiry'}
                        </span>
                        <small
                          style={{
                            display: 'block',
                            color: 'var(--muted-ink)',
                            marginTop: 3,
                            wordBreak: 'break-all',
                          }}
                        >
                          {order.id}
                        </small>
                      </td>
                      <td>{order.items.length}</td>
                      <td
                        style={{
                          maxWidth: 230,
                          color: 'var(--muted-ink)',
                          fontSize: 10,
                          lineHeight: 1.5,
                        }}
                      >
                        {inquiryContact(order) || 'Contact details pending'}
                      </td>
                      <td>
                        <span
                          style={{
                            display: 'inline-block',
                            color:
                              order.status === 'Draft Quote'
                                ? 'var(--sage)'
                                : 'var(--crimson)',
                            border: '1px solid currentColor',
                            padding: '5px 7px',
                            fontSize: 9,
                            letterSpacing: '.06em',
                            textTransform: 'uppercase',
                          }}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td>
                        <button
                          className="table-action"
                          onClick={() => openInquiry(order)}
                          data-testid={`button-review-inquiry-${order.id}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          <MessageCircle size={12} /> Review inquiry
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="empty-state">
                No custom inquiries are waiting for review.
              </div>
            )}
          </section>

          <section className="staff-panel">
            <div className="panel-head">
              <h2>Catalog lines</h2>
              <button
                onClick={openNewProduct}
                data-testid="button-add-product"
              >
                + Add line
              </button>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Line</th>
                  <th>Source</th>
                  <th>Rate / sq. ft.</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <b>{product.name}</b>
                      <br />
                      <span style={{ color: 'var(--muted-ink)' }}>
                        {product.category}
                      </span>
                    </td>
                    <td>{product.supplier}</td>
                    <td>{peso(product.rate)}</td>
                    <td>
                      <div
                        style={{
                          display: 'flex',
                          gap: 7,
                          flexWrap: 'wrap',
                        }}
                      >
                        <button
                          className="table-action"
                          onClick={() => setProductEditor({ product })}
                          data-testid={`button-edit-${product.id}`}
                        >
                          <Pencil size={12} /> Edit
                        </button>
                        <button
                          className="table-action"
                          onClick={() => void archiveProduct(product.id)}
                          data-testid={`button-delete-${product.id}`}
                          style={{ color: '#b24949' }}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>

          <section className="staff-panel">
            <div className="panel-head">
              <h2>Active fulfillment</h2>
              <span style={{ color: 'var(--muted-ink)', fontSize: 10 }}>
                {activeOrders.length} confirmed or in progress
              </span>
            </div>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Order / client</th>
                  <th>Status</th>
                  <th>Courier</th>
                  <th>Waybill number</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeOrders.map((order) => {
                  const draft = getDraft(order);
                  const saveState = rowSaveStates[order.id];
                  const isDirty = Boolean(dirtyOrders[order.id]);
                  const hasCurrentStatus = orderStatuses.includes(draft.status);
                  return (
                    <Fragment key={order.id}>
                      <tr>
                        <td>
                          <strong
                            style={{
                              display: 'block',
                              fontSize: 14,
                              color: 'var(--obsidian)',
                            }}
                          >
                            {order.client}
                          </strong>
                          <span
                            style={{
                              color: 'var(--muted-ink)',
                              fontSize: 10,
                            }}
                          >
                            {order.id}
                          </span>
                        </td>
                        <td>
                          <select
                            value={draft.status}
                            onChange={(event) =>
                              updateDraft(order, {
                                status: event.target.value,
                              })
                            }
                            aria-label={`Status for ${order.id}`}
                            data-testid={`select-status-${order.id}`}
                          >
                            {!hasCurrentStatus && (
                              <option value={draft.status}>
                                {draft.status}
                              </option>
                            )}
                            {orderStatuses
                              .filter((status) => !inquiryStatuses.includes(status))
                              .map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="text"
                            value={draft.courier}
                            onChange={(event) =>
                              updateDraft(order, {
                                courier: event.target.value,
                              })
                            }
                            placeholder="LBC / JRS"
                            aria-label={`Courier for ${order.id}`}
                            data-testid={`input-courier-${order.id}`}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            value={order.waybillNumber}
                            readOnly
                            placeholder="See item waybills"
                            aria-label={`Main waybill number for ${order.id}`}
                          />
                        </td>
                        <td>
                          <button
                            className="table-action"
                            disabled={!isDirty || saveState === 'saving'}
                            onClick={() => void saveOrderUpdates(order)}
                            data-testid={`button-save-updates-${order.id}`}
                            style={{
                              color: isDirty ? 'var(--crimson)' : '#9d9993',
                              opacity:
                                !isDirty || saveState === 'saving' ? 0.55 : 1,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {saveState === 'saving' ? (
                              'Saving…'
                            ) : saveState === 'saved' ? (
                              <>
                                <Check size={12} /> Saved
                              </>
                            ) : (
                              <>
                                <Save size={12} /> Save Updates
                              </>
                            )}
                          </button>
                          {rowSaveErrors[order.id] && (
                            <small
                              role="alert"
                              style={{
                                display: 'block',
                                color: '#b24949',
                                marginTop: 6,
                                maxWidth: 160,
                              }}
                            >
                              {rowSaveErrors[order.id]}
                            </small>
                          )}
                        </td>
                      </tr>
                      <tr>
                        <td
                          colSpan={5}
                          style={{
                            background: '#faf8f5',
                            borderTop: 0,
                            paddingTop: 4,
                          }}
                        >
                          <div
                            style={{
                              display: 'grid',
                              gap: 7,
                              padding: '8px 0 10px 12px',
                              borderLeft: '2px solid var(--sand)',
                            }}
                          >
                            <span
                              style={{
                                color: 'var(--muted-ink)',
                                fontSize: 9,
                                letterSpacing: '.08em',
                                textTransform: 'uppercase',
                              }}
                            >
                              Item tracking numbers
                            </span>
                            {draft.items.length > 0 ? (
                              draft.items.map((item, itemIndex) => (
                                <div
                                  key={`${order.id}-item-${item.id || itemIndex}`}
                                  style={{
                                    display: 'grid',
                                    gridTemplateColumns:
                                      'minmax(160px, 1fr) minmax(180px, 260px)',
                                    gap: 12,
                                    alignItems: 'center',
                                  }}
                                >
                                  <span
                                    style={{
                                      color: 'var(--obsidian)',
                                      fontSize: 11,
                                    }}
                                  >
                                    {item.material ||
                                      item.area ||
                                      `Material ${itemIndex + 1}`}
                                    <small
                                      style={{
                                        display: 'block',
                                        color: 'var(--muted-ink)',
                                        marginTop: 2,
                                      }}
                                    >
                                      Qty {item.quantity}
                                    </small>
                                  </span>
                                  <input
                                    type="text"
                                    value={item.waybillNumber ?? ''}
                                    onChange={(event) =>
                                      updateItemWaybill(
                                        order,
                                        itemIndex,
                                        event.target.value,
                                      )
                                    }
                                    placeholder="Item tracking / waybill"
                                    aria-label={`Waybill for item ${itemIndex + 1} of ${order.id}`}
                                    data-testid={`input-item-waybill-${order.id}-${itemIndex}`}
                                  />
                                </div>
                              ))
                            ) : (
                              <span
                                style={{
                                  color: 'var(--muted-ink)',
                                  fontSize: 11,
                                }}
                              >
                                No line items recorded.
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
            {activeOrders.length === 0 && (
              <div className="empty-state">
                No confirmed orders have been saved yet.
              </div>
            )}
          </section>
        </div>
        {actionError && (
          <div
            role="alert"
            style={{
              color: '#fbeceb',
              border: '1px solid rgba(251,236,235,.35)',
              padding: '10px 12px',
              marginTop: 18,
              fontSize: 11,
            }}
          >
            {actionError}
          </div>
        )}
      </div>

      {selectedInquiry && inquiryDraft && (
        <div
          className="overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeInquiry();
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inquiry-review-title"
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
                  Custom inquiry · {selectedInquiry.status}
                </div>
                <h2 id="inquiry-review-title">
                  {selectedInquiry.client}
                </h2>
              </div>
              <button
                className="close-button"
                onClick={closeInquiry}
                disabled={inquirySaveState === 'saving'}
                aria-label="Close inquiry review"
                data-testid="button-close-inquiry-review"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
                  gap: 12,
                  paddingBottom: 17,
                  borderBottom: '1px solid var(--sand)',
                }}
              >
                <div>
                  <span className="eyebrow">Contact details</span>
                  <p
                    style={{
                      margin: '6px 0 0',
                      color: 'var(--obsidian)',
                      fontSize: 11,
                      lineHeight: 1.6,
                    }}
                  >
                    {inquiryContact(selectedInquiry) || 'No contact details'}
                  </p>
                </div>
                <label
                  style={{
                    color: 'var(--muted-ink)',
                    fontSize: 10,
                    letterSpacing: '.08em',
                    textTransform: 'uppercase',
                  }}
                >
                  Project description
                  <input
                    value={inquiryDraft.forDescription}
                    onChange={(event) =>
                      updateInquiry({ forDescription: event.target.value })
                    }
                    style={{ ...inputStyle, marginTop: 6 }}
                    data-testid="input-inquiry-project-description"
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
                  Address / installation area
                  <input
                    value={inquiryDraft.address}
                    onChange={(event) =>
                      updateInquiry({ address: event.target.value })
                    }
                    placeholder="Add when confirmed"
                    style={{ ...inputStyle, marginTop: 6 }}
                    data-testid="input-inquiry-address"
                  />
                </label>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'end',
                  gap: 12,
                  margin: '20px 0 10px',
                }}
              >
                <div>
                  <div className="eyebrow">Draft quote builder</div>
                  <h3
                    style={{
                      margin: '5px 0 0',
                      font: '600 21px var(--app-font-serif)',
                    }}
                  >
                    Shape the right response
                  </h3>
                </div>
                <span style={{ color: 'var(--muted-ink)', fontSize: 11 }}>
                  Unit amount = quantity × price
                </span>
              </div>

              <div style={{ overflowX: 'auto', border: '1px solid var(--sand)' }}>
                <table
                  className="admin-table"
                  style={{ minWidth: 1120, background: 'white' }}
                >
                  <thead>
                    <tr>
                      <th style={{ width: 120 }}>Category</th>
                      <th style={{ width: 175 }}>Area / particulars</th>
                      <th style={{ width: 210 }}>Customer notes</th>
                      <th style={{ width: 155 }}>Verified material</th>
                      <th style={{ width: 145 }}>Supplier</th>
                      <th>Qty</th>
                      <th>Unit price</th>
                      <th>Amount</th>
                      <th aria-label="Remove item" />
                    </tr>
                  </thead>
                  <tbody>
                    {inquiryDraft.items.map((item, itemIndex) => (
                      <tr key={item.id || itemIndex}>
                        <td>
                          <select
                            value={item.category ?? 'Other'}
                            onChange={(event) =>
                              updateInquiryItem(itemIndex, {
                                category: event.target.value as InquiryCategory,
                              })
                            }
                            style={inputStyle}
                            aria-label={`Category for inquiry item ${itemIndex + 1}`}
                            data-testid={`select-draft-category-${itemIndex}`}
                          >
                            {inquiryCategories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            value={item.area}
                            onChange={(event) =>
                              updateInquiryItem(itemIndex, {
                                area: event.target.value,
                              })
                            }
                            placeholder="Living room windows"
                            style={inputStyle}
                            aria-label={`Particulars for inquiry item ${itemIndex + 1}`}
                            data-testid={`input-draft-particulars-${itemIndex}`}
                          />
                        </td>
                        <td>
                          <textarea
                            value={item.customNotes ?? ''}
                            onChange={(event) =>
                              updateInquiryItem(itemIndex, {
                                customNotes: event.target.value,
                              })
                            }
                            placeholder="Blackout, rough measurements..."
                            rows={2}
                            style={{ ...inputStyle, resize: 'vertical' }}
                            aria-label={`Notes for inquiry item ${itemIndex + 1}`}
                            data-testid={`textarea-draft-notes-${itemIndex}`}
                          />
                        </td>
                        <td>
                          <input
                            value={item.material}
                            onChange={(event) =>
                              updateInquiryItem(itemIndex, {
                                material: event.target.value,
                              })
                            }
                            placeholder="Assign material"
                            style={inputStyle}
                            aria-label={`Verified material for inquiry item ${itemIndex + 1}`}
                            data-testid={`input-draft-material-${itemIndex}`}
                          />
                        </td>
                        <td>
                          <input
                            value={item.supplier ?? ''}
                            onChange={(event) =>
                              updateInquiryItem(itemIndex, {
                                supplier: event.target.value,
                              })
                            }
                            placeholder="Warehouse / partner"
                            style={inputStyle}
                            aria-label={`Supplier for inquiry item ${itemIndex + 1}`}
                            data-testid={`input-draft-supplier-${itemIndex}`}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={item.quantity || ''}
                            onChange={(event) =>
                              updateInquiryItem(itemIndex, {
                                quantity: Math.max(
                                  1,
                                  Math.trunc(numberValue(event.target.value)),
                                ),
                              })
                            }
                            style={{ ...inputStyle, width: 64 }}
                            aria-label={`Quantity for inquiry item ${itemIndex + 1}`}
                            data-testid={`input-draft-quantity-${itemIndex}`}
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={item.unitPrice || ''}
                            onChange={(event) =>
                              updateInquiryItem(itemIndex, {
                                unitPrice: Math.max(
                                  0,
                                  numberValue(event.target.value),
                                ),
                              })
                            }
                            style={{ ...inputStyle, width: 92 }}
                            aria-label={`Unit price for inquiry item ${itemIndex + 1}`}
                            data-testid={`input-draft-unit-price-${itemIndex}`}
                          />
                        </td>
                        <td
                          style={{
                            textAlign: 'right',
                            whiteSpace: 'nowrap',
                            fontWeight: 700,
                          }}
                        >
                          {peso(itemAmount(item))}
                        </td>
                        <td>
                          <button
                            type="button"
                            className="table-action"
                            onClick={() => removeInquiryItem(itemIndex)}
                            disabled={inquiryDraft.items.length === 1}
                            aria-label={`Remove inquiry item ${itemIndex + 1}`}
                            data-testid={`button-remove-draft-item-${itemIndex}`}
                            style={{
                              opacity:
                                inquiryDraft.items.length === 1 ? 0.35 : 1,
                            }}
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                type="button"
                className="text-button"
                onClick={addInquiryItem}
                data-testid="button-add-draft-item"
                style={{ marginTop: 12 }}
              >
                <Plus size={14} /> Add another quoted item
              </button>

              {(() => {
                const totalPhp = inquiryDraft.items.reduce(
                  (sum, item) => sum + itemAmount(item),
                  0,
                );
                const discount = Math.max(0, numberValue(inquiryDraft.discount));
                const subTotal = Math.max(0, totalPhp - discount);
                const delivery = Math.max(
                  0,
                  numberValue(inquiryDraft.deliveryMobilization),
                );
                const grandTotal = subTotal + delivery;
                return (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      marginTop: 22,
                    }}
                  >
                    <div
                      style={{
                        width: 'min(100%, 390px)',
                        borderTop: '1px solid var(--obsidian)',
                        paddingTop: 12,
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          color: 'var(--muted-ink)',
                          fontSize: 11,
                          marginBottom: 9,
                        }}
                      >
                        <span>Total materials</span>
                        <b style={{ color: 'var(--obsidian)' }}>
                          {peso(totalPhp)}
                        </b>
                      </div>
                      <label
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                          color: 'var(--muted-ink)',
                          fontSize: 11,
                          marginBottom: 9,
                        }}
                      >
                        <span>Discount</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={inquiryDraft.discount || ''}
                          onChange={(event) =>
                            updateInquiry({
                              discount: Math.max(
                                0,
                                numberValue(event.target.value),
                              ),
                            })
                          }
                          style={{ ...inputStyle, width: 150 }}
                          aria-label="Inquiry discount"
                          data-testid="input-inquiry-discount"
                        />
                      </label>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          color: 'var(--muted-ink)',
                          fontSize: 11,
                          marginBottom: 9,
                        }}
                      >
                        <span>Sub total</span>
                        <b style={{ color: 'var(--obsidian)' }}>
                          {peso(subTotal)}
                        </b>
                      </div>
                      <label
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: 12,
                          color: 'var(--muted-ink)',
                          fontSize: 11,
                        }}
                      >
                        <span>Delivery and mobilization</span>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={inquiryDraft.deliveryMobilization || ''}
                          onChange={(event) =>
                            updateInquiry({
                              deliveryMobilization: Math.max(
                                0,
                                numberValue(event.target.value),
                              ),
                            })
                          }
                          style={{ ...inputStyle, width: 150 }}
                          aria-label="Inquiry delivery and mobilization"
                          data-testid="input-inquiry-delivery"
                        />
                      </label>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          borderTop: '1px solid var(--obsidian)',
                          paddingTop: 12,
                          marginTop: 12,
                        }}
                      >
                        <strong style={{ fontSize: 11 }}>Grand total</strong>
                        <strong
                          style={{
                            font: '600 24px var(--app-font-serif)',
                          }}
                        >
                          {peso(grandTotal)}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {inquirySaveError && (
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
                  {inquirySaveError}
                </div>
              )}
              {inquirySaveState === 'saved' && (
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
                  {selectedInquiry
                    ? 'Draft saved to the inquiry.'
                    : 'Inquiry converted to the active fulfillment table.'}
                </div>
              )}
              <div className="quote-actions" style={{ marginTop: 22 }}>
                <button
                  type="button"
                  className="text-button"
                  onClick={closeInquiry}
                  disabled={inquirySaveState === 'saving'}
                >
                  Close
                </button>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => void saveInquiry(false)}
                  disabled={inquirySaveState === 'saving'}
                  data-testid="button-save-inquiry-draft"
                >
                  <Save size={14} /> Save Draft
                </button>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => void saveInquiry(true)}
                  disabled={inquirySaveState === 'saving'}
                  data-testid="button-convert-confirmed-order"
                >
                  <ArrowRight size={14} /> Convert to Confirmed Order
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {quoteOpen && (
        <StaffQuoteModal
          products={products}
          onClose={() => setQuoteOpen(false)}
          onSave={(order) => setOrders((current) => [order, ...current])}
        />
      )}
      {productEditor && (
        <StaffProductModal
          product={productEditor.product}
          onClose={() => setProductEditor(null)}
          onSaved={(product) =>
            saveProduct(product, productEditor.product?.id)
          }
        />
      )}
      {logoUploadOpen && (
        <LogoUploadModal
          onClose={() => setLogoUploadOpen(false)}
          onUploaded={() => setLogoVersion(Date.now())}
        />
      )}
    </div>
  );
}