import { useState } from 'react';
import { X } from 'lucide-react';
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
          order.waybill.toLowerCase() === normalizedReference,
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
            Use the quote ID or cargo waybill. Try <b>CM-24071</b> for a live
            sample.
          </p>
          <div className="tracking-form" style={{ minWidth: 0 }}>
            <input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit();
              }}
              placeholder="e.g. CM-24071"
              aria-label="Quote ID or waybill"
              data-testid="input-track-reference"
            />
            <button onClick={submit} data-testid="button-search-order">
              Search
            </button>
          </div>
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
                }}
              >
                <b>{searched.id}</b>
                <span className="status-chip">{searched.status}</span>
              </div>
              <p style={{ fontSize: 12, margin: '15px 0 7px' }}>
                {searched.client} · {searched.product}
              </p>
              <small style={{ color: 'var(--muted-ink)' }}>
                Last updated {searched.date} · Waybill {searched.waybill}
              </small>
              <div
                style={{
                  marginTop: 18,
                  borderTop: '1px solid var(--sand)',
                  paddingTop: 13,
                  color: 'var(--sage)',
                  fontSize: 11,
                }}
              >
                Your order is being handled by the CM Interiors project desk.
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
