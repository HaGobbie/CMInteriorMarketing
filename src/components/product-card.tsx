import { ArrowRight } from 'lucide-react';
import type { Product } from '@/lib/mockData';

type ProductCardProps = {
  product: Product;
  index: number;
  onEstimate: () => void;
};

const peso = (amount: number) =>
  `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

export default function ProductCard({
  product,
  index,
  onEstimate,
}: ProductCardProps) {
  return (
    <article
      className={`product-card reveal delay-${(index % 3) + 1}`}
      data-testid={`card-product-${product.id}`}
    >
      <div className={`product-art ${product.art}`}>
        <span className="art-label">{product.tag}</span>
        <span className="art-number">{String(index + 1).padStart(2, '0')}</span>
      </div>
      <div className="product-info">
        <h3 className="product-title">{product.name}</h3>
        <p className="product-desc">{product.description}</p>
        <div className="product-foot">
          <span className="supplier">{product.supplier}</span>
          <span className="price">
            {peso(product.rate)}
            <small>per sq. ft.</small>
          </span>
        </div>
        <button
          className="text-button"
          style={{ marginTop: 17, width: '100%', justifyContent: 'center' }}
          onClick={onEstimate}
          data-testid={`button-estimate-${product.id}`}
        >
          Estimate this line <ArrowRight size={13} />
        </button>
      </div>
    </article>
  );
}
