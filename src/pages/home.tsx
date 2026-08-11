import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Calculator,
  Menu,
  PackageSearch,
  Search,
  X,
} from 'lucide-react';
import {
  initialOrders,
  products as seedProducts,
  type Product,
  type ProductCategory,
} from '@/lib/mockData';
import ProductCard from '@/components/product-card';
import Estimator, { type Estimate } from '@/components/estimator';
import QuoteModal from '@/components/modals/quote-modal';
import TrackModal from '@/components/modals/track-modal';
import LoginModal from '@/components/modals/login-modal';
import StaffDashboard from '@/components/staff-dashboard';

const categories: Array<'All' | ProductCategory> = [
  'All',
  'Blinds',
  'Custom Curtains',
  'Carpets',
  'Wallpapers',
];

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [filter, setFilter] = useState<'All' | ProductCategory>('All');
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [orders, setOrders] = useState(initialOrders);
  const [estimatorOpen, setEstimatorOpen] = useState(false);
  const [quote, setQuote] = useState<Estimate | null>(null);
  const [trackOpen, setTrackOpen] = useState(false);
  const [staffLoginOpen, setStaffLoginOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);

  const filteredProducts = useMemo(
    () =>
      filter === 'All'
        ? products
        : products.filter((product) => product.category === filter),
    [filter, products],
  );

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="site-shell">
      <div className="topline">
        A considered source for architectural finishes · Davao City
      </div>
      <header className="nav">
        <button
          className="brand"
          onClick={() => scrollTo('catalog')}
          aria-label="Return to catalog"
          data-testid="button-brand-home"
        >
          <span className="brand-mark">C</span>
          <span className="brand-copy">
            <span className="brand-name">CM INTERIORS MARKETING</span>
            <span className="brand-sub">Est. 2007 · Davao City</span>
          </span>
        </button>
        <nav
          className={`nav-links ${mobileOpen ? 'open' : ''}`}
          aria-label="Main navigation"
        >
          <button
            className="active"
            onClick={() => scrollTo('catalog')}
            data-testid="link-catalog"
          >
            Catalog
          </button>
          <button
            onClick={() => {
              scrollTo('estimator');
              setEstimatorOpen(false);
            }}
            data-testid="link-estimator"
          >
            Custom Estimator
          </button>
          <button
            onClick={() => {
              setTrackOpen(true);
              setMobileOpen(false);
            }}
            data-testid="link-track-order"
          >
            Track Order
          </button>
          <button
            onClick={() => {
              setStaffLoginOpen(true);
              setMobileOpen(false);
            }}
            data-testid="link-staff-portal"
          >
            Staff Portal
          </button>
        </nav>
        <div className="nav-actions">
          <button
            className="text-button"
            onClick={() => setTrackOpen(true)}
            data-testid="button-header-track"
          >
            <PackageSearch size={14} /> Track order
          </button>
          <button
            className="icon-button mobile-nav-toggle"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label="Toggle navigation"
            data-testid="button-mobile-menu"
          >
            <Menu size={16} />
          </button>
        </div>
      </header>

      <main>
        <section className="hero reveal">
          <div>
            <div className="eyebrow">Materials, measured</div>
            <h1>
              Rooms begin with a <em>feeling.</em>
            </h1>
            <p className="hero-copy">
              A local source for considered blinds, curtains, carpets, and
              wallpapers. Browse the collection, price a finish, and move from
              first thought to a clear next step.
            </p>
            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={() => scrollTo('catalog')}
                data-testid="button-explore-collection"
              >
                Explore collection <ArrowRight size={15} />
              </button>
              <button
                className="secondary-button"
                onClick={() => scrollTo('estimator')}
                data-testid="button-price-project"
              >
                <Calculator size={14} /> Price a project
              </button>
            </div>
            <div className="hero-note">
              For homeowners, designers, and contractors who care about the
              details that make a space feel finished.
            </div>
          </div>
          <div
            className="hero-visual reveal delay-2"
            aria-label="Layered window treatment material study"
          >
            <div className="material-window">
              <div className="window-swatch" />
              <div className="window-card">
                <small>Material study 01</small>
                <strong>Light, held softly.</strong>
              </div>
            </div>
            <div className="hero-stamp">
              Sourced
              <br />
              in Davao
            </div>
          </div>
        </section>

        <section className="section section-rule" id="catalog">
          <div className="section-heading">
            <div>
              <div className="eyebrow">The collection</div>
              <h2>
                Quietly distinctive
                <br />
                materials.
              </h2>
            </div>
            <p>
              Every line is selected for its hand, light response, and ability
              to live well in a real Davao home or project.
            </p>
          </div>
          <div
            className="filter-row"
            role="group"
            aria-label="Filter catalog categories"
          >
            {categories.map((category) => (
              <button
                key={category}
                className={`filter ${filter === category ? 'selected' : ''}`}
                onClick={() => setFilter(category)}
                data-testid={`button-filter-${category
                  .toLowerCase()
                  .replaceAll(' ', '-')}`}
              >
                {category}
              </button>
            ))}
            <span
              style={{
                marginLeft: 'auto',
                color: 'var(--muted-ink)',
                fontSize: 10,
              }}
            >
              {filteredProducts.length} lines shown
            </span>
          </div>
          <div className="catalog-grid">
            {filteredProducts.map((product, index) => (
              <ProductCard
                key={product.id}
                product={product}
                index={index}
                onEstimate={() => setEstimatorOpen(true)}
              />
            ))}
          </div>
        </section>

        <section className="estimator-section" id="estimator">
          <div className="estimator-grid">
            <div className="estimator-intro">
              <div className="eyebrow">The project desk</div>
              <h2>Make the first number useful.</h2>
              <p>
                Enter a rough opening size and we’ll translate it into a clear
                starting point. Rates are per square foot and include a
                realistic local sourcing lead time.
              </p>
              <div
                className="hero-note"
                style={{
                  color: '#bcb6ae',
                  borderColor: 'rgba(250,248,245,.25)',
                }}
              >
                60% downpayment · 5–7 business days standard lead time
              </div>
            </div>
            <Estimator products={products} onQuote={setQuote} />
          </div>
        </section>

        <section className="process">
          <div className="process-grid">
            <div>
              <div className="eyebrow">How it moves</div>
              <h2>
                From sample
                <br />
                to install.
              </h2>
              <p className="process-copy">
                A small, clear workflow keeps your project moving without the
                guesswork. We stay close to the details and the handoff.
              </p>
            </div>
            <div className="steps">
              <div className="step">
                <div className="step-num">01</div>
                <div>
                  <h3>Choose the feeling</h3>
                  <p>
                    Browse material families, supplier sources, and transparent
                    square-foot rates.
                  </p>
                </div>
              </div>
              <div className="step">
                <div className="step-num">02</div>
                <div>
                  <h3>Measure the opening</h3>
                  <p>
                    Use the estimator for an early range, then share final
                    dimensions for a formal quotation.
                  </p>
                </div>
              </div>
              <div className="step">
                <div className="step-num">03</div>
                <div>
                  <h3>We source with care</h3>
                  <p>
                    We coordinate local stock, Manila partners, and imported
                    lines against your timeline.
                  </p>
                </div>
              </div>
              <div className="step">
                <div className="step-num">04</div>
                <div>
                  <h3>Hand over a finished room</h3>
                  <p>
                    Track the order, prepare the site, and let our installation
                    partners take it from there.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="tracking-band" id="tracking">
          <div className="tracking-content">
            <div>
              <div className="eyebrow" style={{ color: '#f0c6c3' }}>
                Your order, in view
              </div>
              <h2>Know what’s next.</h2>
              <p>
                Enter the reference from your quotation to see the latest
                sourcing and fulfillment note.
              </p>
            </div>
            <div>
              <button
                className="secondary-button"
                style={{ color: 'white', borderColor: 'white' }}
                onClick={() => setTrackOpen(true)}
                data-testid="button-track-shipment"
              >
                Track a shipment <Search size={14} />
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-main">
          <div>
            <h2>
              CM Interiors
              <br />
              <span style={{ color: '#d6a8a6' }}>Marketing.</span>
            </h2>
            <p>
              Architectural interior furnishings, sourced thoughtfully in Davao
              and beyond.
            </p>
          </div>
          <div className="footer-contact">
            J.P. Laurel Avenue, Davao City
            <br />
            +63 917 812 2007
            <br />
            hello@cminteriors.ph
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2024 CM Interiors Marketing</span>
          <span>For spaces with a point of view.</span>
        </div>
      </footer>

      {estimatorOpen && (
        <div
          className="overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setEstimatorOpen(false);
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="estimator-modal-title"
          >
            <div className="modal-head">
              <h2 id="estimator-modal-title">Custom estimator</h2>
              <button
                className="close-button"
                onClick={() => setEstimatorOpen(false)}
                aria-label="Close estimator"
                data-testid="button-close-estimator"
              >
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <Estimator products={products} onQuote={setQuote} />
            </div>
          </div>
        </div>
      )}
      {quote && (
        <QuoteModal estimate={quote} onClose={() => setQuote(null)} />
      )}
      {trackOpen && (
        <TrackModal
          orders={orders}
          onClose={() => setTrackOpen(false)}
        />
      )}
      {staffLoginOpen && (
        <LoginModal
          onClose={() => setStaffLoginOpen(false)}
          onSuccess={() => {
            setStaffLoginOpen(false);
            setStaffOpen(true);
          }}
        />
      )}
      {staffOpen && (
        <StaffDashboard
          products={products}
          setProducts={setProducts}
          orders={orders}
          setOrders={setOrders}
          onClose={() => setStaffOpen(false)}
        />
      )}
    </div>
  );
}
