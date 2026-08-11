import { Check, Printer, X } from 'lucide-react';
import type { Estimate } from '@/components/estimator';

type QuoteModalProps = {
  estimate: Estimate;
  onClose: () => void;
};

const peso = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

export default function QuoteModal({ estimate, onClose }: QuoteModalProps) {
  const quoteId = `CM-Q-${new Date().getFullYear()}-${String(
    Math.round(estimate.total),
  ).slice(-4)}`;

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
        aria-labelledby="quote-modal-title"
      >
        <div className="modal-head">
          <h2 id="quote-modal-title">Your quotation preview</h2>
          <button
            className="close-button"
            onClick={onClose}
            aria-label="Close quotation"
            data-testid="button-close-quote"
          >
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <div className="quote-paper" id="print-quote">
            <div className="quote-brand">CM INTERIORS MARKETING</div>
            <h2>Project quotation</h2>
            <div className="quote-meta">
              <span>
                Quote ID
                <br />
                <b style={{ color: 'var(--obsidian)' }}>{quoteId}</b>
              </span>
              <span>
                Prepared 21 June 2024
                <br />
                <b style={{ color: 'var(--obsidian)' }}>
                  Davao City, Philippines
                </b>
              </span>
            </div>
            <table className="quote-table">
              <thead>
                <tr>
                  <th>Material / specification</th>
                  <th>Dimensions</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <b>{estimate.product.name}</b>
                    <br />
                    <span style={{ color: 'var(--muted-ink)' }}>
                      {estimate.product.supplier}
                    </span>
                  </td>
                  <td>
                    {estimate.width.toFixed(0)}″ × {estimate.height.toFixed(0)}″
                    <br />
                    {estimate.quantity} unit
                    {estimate.quantity === 1 ? '' : 's'}
                  </td>
                  <td>{peso(Math.round(estimate.total))}</td>
                </tr>
              </tbody>
            </table>
            <div className="quote-total">
              <span>
                Project total
                <br />
                <small style={{ color: 'var(--muted-ink)' }}>
                  VAT and final site measurement subject to confirmation
                </small>
              </span>
              <strong>{peso(Math.round(estimate.total))}</strong>
            </div>
            <div className="payment-box">
              <strong>Payment instructions</strong>
              To reserve the material line, a 60% downpayment of{' '}
              <b style={{ color: 'var(--crimson)' }}>
                {peso(Math.round(estimate.total * 0.6))}
              </b>{' '}
              is required. Pay via GCash (+63 917 812 2007), bank transfer to
              BPI · CM Interiors Marketing, or check payable to CM Interiors
              Marketing. Standard lead time is 5–7 business days after payment
              and final measurement.
            </div>
          </div>
          <div className="quote-actions">
            <button
              className="text-button"
              onClick={() => window.print()}
              data-testid="button-print-quote"
            >
              <Printer size={14} /> Print / save PDF
            </button>
            <button
              className="primary-button"
              onClick={onClose}
              data-testid="button-done-quote"
            >
              <Check size={14} /> Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
