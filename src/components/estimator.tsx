import { useState } from 'react';
import { FileText } from 'lucide-react';
import type { Product } from '@/lib/mockData';

export type Estimate = {
  product: Product;
  width: number;
  height: number;
  quantity: number;
  area: number;
  total: number;
};

type EstimatorProps = {
  products: Product[];
  onQuote: (estimate: Estimate) => void;
};

const peso = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

export default function Estimator({ products, onQuote }: EstimatorProps) {
  const [productId, setProductId] = useState(products[0]?.id ?? '');
  const [width, setWidth] = useState(120);
  const [height, setHeight] = useState(90);
  const [quantity, setQuantity] = useState(1);
  const [unit, setUnit] = useState<'in' | 'cm'>('in');
  const selected = products.find((product) => product.id === productId) ?? products[0];
  const multiplier = unit === 'cm' ? 0.393701 : 1;
  const widthIn = Math.max(0, Number(width) * multiplier);
  const heightIn = Math.max(0, Number(height) * multiplier);
  const area = (widthIn * heightIn) / 144;
  const normalizedQuantity = Math.max(1, Number(quantity));
  const total = area * (selected?.rate ?? 0) * normalizedQuantity;
  const estimate: Estimate | null = selected
    ? {
        product: selected,
        width: widthIn,
        height: heightIn,
        quantity: normalizedQuantity,
        area,
        total,
      }
    : null;

  return (
    <div className="estimate-form" data-testid="panel-estimator">
      <div className="field">
        <label htmlFor="product-select">Material line</label>
        <select
          id="product-select"
          value={productId}
          onChange={(event) => setProductId(event.target.value)}
          data-testid="select-estimator-product"
        >
          {products.map((product) => (
            <option key={product.id} value={product.id}>
              {product.name} · {peso(product.rate)}/sq. ft.
            </option>
          ))}
        </select>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="width-input">Width</label>
          <input
            id="width-input"
            type="number"
            min="1"
            value={width}
            onChange={(event) => setWidth(Number(event.target.value))}
            data-testid="input-estimator-width"
          />
        </div>
        <div className="field">
          <label htmlFor="height-input">Height</label>
          <input
            id="height-input"
            type="number"
            min="1"
            value={height}
            onChange={(event) => setHeight(Number(event.target.value))}
            data-testid="input-estimator-height"
          />
        </div>
      </div>
      <div className="form-row">
        <div className="field">
          <label htmlFor="quantity-input">Quantity</label>
          <input
            id="quantity-input"
            type="number"
            min="1"
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
            data-testid="input-estimator-quantity"
          />
        </div>
        <div className="field">
          <label>Measurement</label>
          <div className="unit-toggle">
            <button
              className={unit === 'in' ? 'selected' : ''}
              onClick={() => setUnit('in')}
              data-testid="button-unit-in"
            >
              inches
            </button>
            <button
              className={unit === 'cm' ? 'selected' : ''}
              onClick={() => setUnit('cm')}
              data-testid="button-unit-cm"
            >
              cm
            </button>
          </div>
        </div>
      </div>
      <div className="estimate-result" aria-live="polite">
        <div className="estimate-top">
          <span>
            Estimated project total
            <br />
            <b style={{ color: '#e0d9d1', fontWeight: 500 }}>
              {selected?.name}
            </b>
          </span>
          <div className="estimate-total">
            {peso(Math.round(total))}
            <small>
              {area.toFixed(1)} sq. ft. · {quantity} unit
              {quantity === 1 ? '' : 's'}
            </small>
          </div>
        </div>
        <div className="breakdown">
          <div>
            <span>Rate</span>
            <b>{peso(selected?.rate ?? 0)} / sq. ft.</b>
          </div>
          <div>
            <span>60% downpayment</span>
            <b>{peso(Math.round(total * 0.6))}</b>
          </div>
          <div>
            <span>Estimated lead time</span>
            <b>5–7 business days</b>
          </div>
        </div>
        {estimate && (
          <button
            className="primary-button"
            onClick={() => onQuote(estimate)}
            data-testid="button-request-quotation"
          >
            <FileText size={14} /> Request formal quotation
          </button>
        )}
      </div>
    </div>
  );
}
