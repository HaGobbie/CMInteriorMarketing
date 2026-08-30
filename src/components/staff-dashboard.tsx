import {
  Fragment,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import {
  Check,
  FileText,
  Pencil,
  Save,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import LogoUploadModal from '@/components/modals/logo-upload-modal';
import StaffProductModal from '@/components/modals/staff-product-modal';
import StaffQuoteModal from '@/components/modals/staff-quote-modal';
import {
  orderStatuses,
  type FulfillmentOrder,
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

type RowSaveState = 'saving' | 'saved' | 'error';

const peso = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

const cloneItems = (items: QuotationLineItem[]) =>
  items.map((item) => ({ ...item }));

const draftFromOrder = (order: FulfillmentOrder): OrderDraft => ({
  status: order.status,
  courier: order.courier,
  items: cloneItems(order.items),
});

const statusCandidates = (label: string) => {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const aliases: Record<string, string[]> = {
    'Pending Sourcing': [
      'Quote Requested',
      'quote_requested',
      'pending_sourcing',
      'pending',
    ],
    'Sourced from Davao Warehouse': [
      'sourced_from_davao_warehouse',
      'sourced_davao_warehouse',
      'processing',
    ],
    'Sourced from Homedex / Manila': [
      'sourced_from_homedex_manila',
      'sourced_homedex_manila',
      'processing',
    ],
    'In Transit': ['in_transit', 'shipped'],
    'Ready for Installation': [
      'ready_for_installation',
      'ready_for_delivery',
    ],
    Fulfilled: ['fulfilled', 'delivered'],
  };
  return [...new Set([...(aliases[label] ?? []), slug])];
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
              <span className="brand-sub">Staff working desk</span>
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
            <span>Open orders</span>
            <strong>
              {orders.filter((order) => order.status !== 'Fulfilled').length}
            </strong>
          </div>
          <div className="stat">
            <span>Ready to install</span>
            <strong>
              {
                orders.filter(
                  (order) => order.status === 'Ready for Installation',
                ).length
              }
            </strong>
          </div>
          <div className="stat">
            <span>Catalog lines</span>
            <strong>{products.length}</strong>
          </div>
          <div className="stat">
            <span>In transit value</span>
            <strong>
              {peso(
                orders
                  .filter((order) => order.status === 'In Transit')
                  .reduce((sum, order) => sum + order.amount, 0),
              )}
            </strong>
          </div>
        </div>

        <div className="staff-panels">
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
              <h2>Fulfillment</h2>
              <span style={{ color: 'var(--muted-ink)', fontSize: 10 }}>
                {orders.length} logged
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
                {orders.map((order) => {
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
                            {orderStatuses.map((status) => (
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
            {orders.length === 0 && (
              <div className="empty-state">No orders have been saved yet.</div>
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