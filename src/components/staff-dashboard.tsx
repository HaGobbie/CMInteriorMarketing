import { useState } from 'react';
import { FileText } from 'lucide-react';
import LogoUploadModal from '@/components/modals/logo-upload-modal';
import StaffQuoteModal from '@/components/modals/staff-quote-modal';
import {
  orderStatuses,
  type FulfillmentOrder,
  type Product,
} from '@/lib/mockData';

type StaffDashboardProps = {
  products: Product[];
  setProducts: (products: Product[]) => void;
  orders: FulfillmentOrder[];
  setOrders: (orders: FulfillmentOrder[]) => void;
  onClose: () => void;
};

const peso = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

export default function StaffDashboard({
  products,
  setProducts,
  orders,
  setOrders,
  onClose,
}: StaffDashboardProps) {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [logoUploadOpen, setLogoUploadOpen] = useState(false);
  const [logoVersion, setLogoVersion] = useState(0);

  const updateRate = (id: string, rate: number) => {
    setProducts(
      products.map((product) =>
        product.id === id
          ? {
              ...product,
              rate: Number.isFinite(rate) ? rate : product.rate,
            }
          : product,
      ),
    );
  };

  const addProduct = () => {
    setProducts([
      ...products,
      {
        id: `custom-${Date.now()}`,
        name: 'New material line',
        category: 'Blinds',
        supplier: 'Davao Warehouse',
        rate: 160,
        description: 'A new line ready for catalog details.',
        art: 'art-blind',
        tag: 'Draft line',
      },
    ]);
  };

  const archiveProduct = (id: string) => {
    setProducts(products.filter((product) => product.id !== id));
  };

  const updateOrder = (
    id: string,
    patch: Partial<Pick<FulfillmentOrder, 'status' | 'courier' | 'waybillNumber'>>,
  ) => {
    setOrders(
      orders.map((order) =>
        order.id === id ? { ...order, ...patch } : order,
      ),
    );
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
              <button onClick={addProduct} data-testid="button-add-product">
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
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={product.rate}
                        onChange={(event) =>
                          updateRate(product.id, Number(event.target.value))
                        }
                        aria-label={`Rate for ${product.name}`}
                        data-testid={`input-rate-${product.id}`}
                      />
                    </td>
                    <td>
                      <button
                        className="table-action"
                        onClick={() => archiveProduct(product.id)}
                        data-testid={`button-archive-${product.id}`}
                      >
                        Archive
                      </button>
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
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <b>{order.id}</b>
                      <br />
                      <span style={{ color: 'var(--muted-ink)' }}>
                        {order.client}
                      </span>
                    </td>
                    <td>
                      <select
                        value={order.status}
                        onChange={(event) =>
                          updateOrder(order.id, { status: event.target.value })
                        }
                        aria-label={`Status for ${order.id}`}
                        data-testid={`select-status-${order.id}`}
                      >
                        {orderStatuses.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        type="text"
                        value={order.courier}
                        onChange={(event) =>
                          updateOrder(order.id, { courier: event.target.value })
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
                        onChange={(event) =>
                          updateOrder(order.id, {
                            waybillNumber: event.target.value,
                          })
                        }
                        placeholder="Waybill number"
                        aria-label={`Waybill number for ${order.id}`}
                        data-testid={`input-waybill-${order.id}`}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {orders.length === 0 && (
              <div className="empty-state">No orders have been saved yet.</div>
            )}
          </section>
        </div>
      </div>
      {quoteOpen && (
        <StaffQuoteModal
          products={products}
          onClose={() => setQuoteOpen(false)}
          onSave={(order) => setOrders([order, ...orders])}
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