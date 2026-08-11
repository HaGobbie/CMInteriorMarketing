import { useState } from 'react';
import {
  orderStatuses,
  type Product,
} from '@/lib/mockData';
import type { FulfillmentOrder } from '@/lib/mockData';

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
  const [waybill, setWaybill] = useState('');
  const [waybillLog, setWaybillLog] = useState<string[]>([]);

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

  const updateOrderStatus = (id: string, status: string) => {
    setOrders(
      orders.map((order) => (order.id === id ? { ...order, status } : order)),
    );
  };

  const logWaybill = () => {
    if (!waybill.trim()) return;
    setWaybillLog([waybill.trim(), ...waybillLog]);
    setWaybill('');
  };

  return (
    <div className="staff-overlay">
      <div className="staff-shell">
        <header className="staff-top">
          <div className="brand">
            <span className="brand-mark">C</span>
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
          <p>
            {new Date().toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
            <br />
            Davao City · showroom view
          </p>
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
                          updateOrderStatus(order.id, event.target.value)
                        }
                        aria-label={`Status for ${order.id}`}
                        data-testid={`select-status-${order.id}`}
                      >
                        {orderStatuses.map((status) => (
                          <option key={status}>{status}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="waybill-box">
              <label htmlFor="waybill-input">Manual waybill log</label>
              <div className="waybill-form">
                <input
                  id="waybill-input"
                  value={waybill}
                  onChange={(event) => setWaybill(event.target.value)}
                  placeholder="e.g. LBC-DVO-89210"
                  data-testid="input-waybill"
                />
                <button onClick={logWaybill} data-testid="button-log-waybill">
                  Log
                </button>
              </div>
              {waybillLog.length > 0 ? (
                <div className="waybill-log">
                  {waybillLog.map((item, index) => (
                    <div key={`${item}-${index}`}>Logged · {item}</div>
                  ))}
                </div>
              ) : (
                <div className="waybill-log">No manual entries this week.</div>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
