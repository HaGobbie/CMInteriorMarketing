import { useState } from 'react';
import { PackageSearch, X } from 'lucide-react';
import type { FulfillmentOrder } from '@/lib/mockData';

type TrackModalProps = {
  orders: FulfillmentOrder[];
  onClose: () => void;
};

export default function TrackModal({ orders, onClose }: TrackModalProps) {
  const [reference, setReference] = useState('');
  const [searched, setSearched] = useState<FulfillmentOrder | null>(null);

  const submit = () => {
    const normalizedReference = reference.trim().toLowerCase();
    setSearched(
      orders.find(
        (order) =>
          order.id.toLowerCase() === normalizedReference ||
          order.waybillNumber.toLowerCase() === normalizedReference,
      ) ?? null,
    );
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
        aria-labelledby="track-modal-title"
      >
        <div className="modal-head">
          <h2 id="track-modal-title">Track an order</h2>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close tracking"
            data-testid="button-close-tracking"
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <p
            style={{
              color: 'var(--muted-ink)',
              fontSize: 12,
              lineHeight: 1.6,
              marginTop: 0,
            }}
          >
            Search with the Quote ID from your quotation or your Waybill
            Number. Try <b>CM-24071</b> for a live sample.
          </p>
          <form
            className="tracking-form"
            style={{ minWidth: 0 }}
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="e.g. CM-24071"
              aria-label="Quote ID or waybill number"
              data-testid="input-track-reference"
            />
            <button type="submit" data-testid="button-search-order">
              Search
            </button>
          </form>
          {searched ? (
            <div
              className="tracking-result"
              style={{
                background: '#f1eee9',
                marginTop: 25,
                color: 'var(--obsidian)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 15,
                  alignItems: 'start',
                }}
              >
                <div>
                  <b>{searched.id}</b>
                  <p
                    style={{
                      fontSize: 12,
                      margin: '8px 0 0',
                      color: 'var(--muted-ink)',
                    }}
                  >
                    {searched.client}
                  </p>
                </div>
                <span className="status-chip">{searched.status}</span>
              </div>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: 12,
                  borderTop: '1px solid var(--sand)',
                  borderBottom: '1px solid var(--sand)',
                  margin: '17px 0 13px',
                  padding: '13px 0',
                }}
              >
                <div>
                  <small
                    style={{
                      display: 'block',
                      color: 'var(--muted-ink)',
                      fontSize: 9,
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Courier
                  </small>
                  <strong style={{ display: 'block', marginTop: 4 }}>
                    {searched.courier || 'Not assigned yet'}
                  </strong>
                </div>
                <div>
                  <small
                    style={{
                      display: 'block',
                      color: 'var(--muted-ink)',
                      fontSize: 9,
                      letterSpacing: '.08em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Waybill number
                  </small>
                  <strong style={{ display: 'block', marginTop: 4 }}>
                    {searched.waybillNumber || 'Not assigned yet'}
                  </strong>
                </div>
              </div>
              <small style={{ color: 'var(--muted-ink)' }}>
                Last updated {searched.date}
              </small>
              <div
                style={{
                  marginTop: 18,
                  color: 'var(--sage)',
                  fontSize: 11,
                  lineHeight: 1.6,
                  display: 'flex',
                  gap: 8,
                  alignItems: 'start',
                }}
              >
                <PackageSearch size={15} style={{ flexShrink: 0 }} />
                <span>
                  Please use your Waybill Number to track your shipment
                  directly on the courier&apos;s official tracking website.
                </span>
              </div>
            </div>
          ) : (
            reference && (
              <div className="empty-state" data-testid="status-order-not-found">
                No order found for that reference. Check the format and try
                again.
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}