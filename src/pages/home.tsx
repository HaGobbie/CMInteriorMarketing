import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
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
  type FulfillmentOrder,
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

const asText = (value: unknown, fallback = '') =>
  typeof value === 'string' && value.trim() ? value : fallback;

const asNumber = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const asItems = (value: unknown) => {
  if (Array.isArray(value)) return value as FulfillmentOrder['items'];
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as FulfillmentOrder['items']) : [];
  } catch {
    return [];
  }
};

const mapProductRow = (row: Record<string, unknown>, index: number): Product => {
  const categoryValue = asText(row.category, 'Blinds') as ProductCategory;
  const category = categories.includes(categoryValue) && categoryValue !== 'All'
    ? categoryValue
    : 'Blinds';

  return {
    id: asText(row.id, `supabase-product-${index}`),
    name: asText(row.name ?? row.product_name, 'Unnamed material'),
    category,
    supplier: asText(row.supplier ?? row.source, 'Davao Warehouse'),
    rate: asNumber(row.price_per_sqm ?? row.rate),
    description: asText(
      row.description,
      'A considered material line for the project desk.',
    ),
    art: asText(row.art, 'art-blind'),
    tag: asText(row.tag, 'Catalog line'),
  };
};

const formatOrderDate = (value: unknown) => {
  const raw = asText(value);
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const orderStatusLabel = (value: unknown) => {
  const raw = asText(value);
  const labels: Record<string, string> = {
    pending: 'Pending Sourcing',
    pending_sourcing: 'Pending Sourcing',
    sourced_from_davao_warehouse: 'Sourced from Davao Warehouse',
    sourced_davao_warehouse: 'Sourced from Davao Warehouse',
    sourced_from_homedex_manila: 'Sourced from Homedex / Manila',
    sourced_homedex_manila: 'Sourced from Homedex / Manila',
    in_transit: 'In Transit',
    shipped: 'In Transit',
    ready_for_installation: 'Ready for Installation',
    ready_for_delivery: 'Ready for Installation',
    fulfilled: 'Fulfilled',
    delivered: 'Fulfilled',
  };
  return labels[raw.toLowerCase()] ?? raw;
};

const mapOrderRow = (
  row: Record<string, unknown>,
  index: number,
): FulfillmentOrder => {
  const items = asItems(row.items);
  const firstItem = items[0];
  const id = asText(
    row.id ?? row.quote_id,
    `CM-SUPABASE-${String(index + 1).padStart(3, '0')}`,
  );
  const client = asText(row.customer_name ?? row.attn, 'Unnamed client');
  const grandTotal = asNumber(
    row.grand_total ?? row.estimated_total ?? row.amount,
  );

  return {
    id,
    client,
    product: asText(
      row.product,
      firstItem?.material || asText(row.for_description, 'New quotation'),
    ),
    amount: grandTotal,
    status: orderStatusLabel(row.status) || 'Pending Sourcing',
    courier: asText(row.courier),
    waybillNumber: asText(
      row.waybill_number ?? row.waybillNumber ?? row.waybill,
    ),
    date: formatOrderDate(row.date ?? row.created_at),
    forDescription: asText(row.for_description),
    address: asText(row.address),
    attn: asText(row.attn ?? row.customer_name, client),
    contacts: asText(row.contacts),
    items,
    totalPhp: asNumber(row.total_php ?? row.totalPhp, grandTotal),
    discount: asNumber(row.discount),
    subTotal: asNumber(row.sub_total ?? row.subTotal, grandTotal),
    deliveryMobilization: asNumber(
      row.delivery_mobilization ?? row.deliveryMobilization,
    ),
    grandTotal,
  };
};

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

  useEffect(() => {
    let mounted = true;

    const loadPortalData = async () => {
      const [productsResult, ordersResult] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('is_archived', false),
        supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      if (!mounted) return;

      if (
        !productsResult.error &&
        productsResult.data &&
        productsResult.data.length > 0
      ) {
        setProducts(
          productsResult.data.map((row, index) =>
            mapProductRow(row as Record<string, unknown>, index),
          ),
        );
      } else {
        setProducts(seedProducts);
      }

      if (
        !ordersResult.error &&
        ordersResult.data &&
        ordersResult.data.length > 0
      ) {
        setOrders(
          ordersResult.data.map((row, index) =>
            mapOrderRow(row as Record<string, unknown>, index),
          ),
        );
      } else {
        setOrders(initialOrders);
      }
    };

    void loadPortalData();

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session && mounted) setStaffOpen(true);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setStaffOpen(Boolean(session));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
          <img
            src={`${import.meta.env.BASE_URL}assets/logo/CMInteriorLogoTransparentBG.png`}
            alt="CM Interiors Marketing logo"
            style={{
              width: 48,
              height: 48,
              objectFit: 'contain',
            }}
          />
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
            onClick={() => scrollTo('estimator')}
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
              {[
                [
                  '01',
                  'Choose the feeling',
                  'Browse material families, supplier sources, and transparent square-foot rates.',
                ],
                [
                  '02',
                  'Measure the opening',
                  'Use the estimator for an early range, then share final dimensions for a formal quotation.',
                ],
                [
                  '03',
                  'We source with care',
                  'We coordinate local stock, Manila partners, and imported lines against your timeline.',
                ],
                [
                  '04',
                  'Hand over a finished room',
                  'Track the order, prepare the site, and let our installation partners take it from there.',
                ],
              ].map(([number, title, copy]) => (
                <div className="step" key={number}>
                  <div className="step-num">{number}</div>
                  <div>
                    <h3>{title}</h3>
                    <p>{copy}</p>
                  </div>
                </div>
              ))}
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