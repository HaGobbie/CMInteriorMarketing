

--- FILE: .\index.html ---
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1" />
    <title>CM Interiors Marketing</title>
    <meta name="description" content="CM Interiors Marketing — built on Replit. Update this description to reflect the app." />
    <meta name="robots" content="index, follow" />
    <meta property="og:title" content="CM Interiors Marketing" />
    <meta property="og:description" content="CM Interiors Marketing — built on Replit. Update this description to reflect the app." />
    <meta property="og:type" content="website" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="CM Interiors Marketing" />
    <meta name="twitter:description" content="CM Interiors Marketing — built on Replit. Update this description to reflect the app." />
    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>


--- FILE: .\package.json ---
{
  "name": "@workspace/cm-interiors-marketing",
  "version": "0.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --config vite.config.ts --host 0.0.0.0",
    "build": "vite build --config vite.config.ts",
    "serve": "vite preview --config vite.config.ts --host 0.0.0.0",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": {
    "@hookform/resolvers": "^3.10.0",
    "@radix-ui/react-accordion": "^1.2.4",
    "@radix-ui/react-alert-dialog": "^1.1.7",
    "@radix-ui/react-aspect-ratio": "^1.1.3",
    "@radix-ui/react-avatar": "^1.1.4",
    "@radix-ui/react-checkbox": "^1.1.5",
    "@radix-ui/react-collapsible": "^1.1.4",
    "@radix-ui/react-context-menu": "^2.2.7",
    "@radix-ui/react-dialog": "^1.1.7",
    "@radix-ui/react-dropdown-menu": "^2.1.7",
    "@radix-ui/react-hover-card": "^1.1.7",
    "@radix-ui/react-label": "^2.1.3",
    "@radix-ui/react-menubar": "^1.1.7",
    "@radix-ui/react-navigation-menu": "^1.2.6",
    "@radix-ui/react-popover": "^1.1.7",
    "@radix-ui/react-progress": "^1.1.3",
    "@radix-ui/react-radio-group": "^1.2.4",
    "@radix-ui/react-scroll-area": "^1.2.4",
    "@radix-ui/react-select": "^2.1.7",
    "@radix-ui/react-separator": "^1.1.3",
    "@radix-ui/react-slider": "^1.2.4",
    "@radix-ui/react-slot": "^1.2.0",
    "@radix-ui/react-switch": "^1.1.4",
    "@radix-ui/react-tabs": "^1.1.4",
    "@radix-ui/react-toast": "^1.2.7",
    "@radix-ui/react-toggle": "^1.1.3",
    "@radix-ui/react-toggle-group": "^1.1.3",
    "@radix-ui/react-tooltip": "^1.2.0",
    "@replit/vite-plugin-cartographer": "catalog:",
    "@replit/vite-plugin-dev-banner": "catalog:",
    "@replit/vite-plugin-runtime-error-modal": "catalog:",
    "@tailwindcss/typography": "^0.5.15",
    "@tailwindcss/vite": "catalog:",
    "@tanstack/react-query": "catalog:",
    "@types/node": "catalog:",
    "@types/react": "catalog:",
    "@types/react-dom": "catalog:",
    "@vitejs/plugin-react": "catalog:",
    "@workspace/api-client-react": "workspace:*",
    "class-variance-authority": "catalog:",
    "clsx": "catalog:",
    "cmdk": "^1.1.1",
    "date-fns": "^3.6.0",
    "embla-carousel-react": "^8.6.0",
    "framer-motion": "catalog:",
    "input-otp": "^1.4.2",
    "lucide-react": "catalog:",
    "next-themes": "^0.4.6",
    "react": "catalog:",
    "react-day-picker": "^9.11.1",
    "react-dom": "catalog:",
    "react-hook-form": "^7.55.0",
    "react-icons": "^5.4.0",
    "react-resizable-panels": "^2.1.7",
    "recharts": "^2.15.2",
    "sonner": "^2.0.7",
    "tailwind-merge": "catalog:",
    "tailwindcss": "catalog:",
    "tw-animate-css": "^1.4.0",
    "vaul": "^1.1.2",
    "vite": "catalog:",
    "wouter": "^3.3.5",
    "zod": "catalog:"
  }
}


--- FILE: .\vite.config.ts ---
import path from 'path';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

import runtimeErrorOverlay from '@replit/vite-plugin-runtime-error-modal';

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    'PORT environment variable is required but was not provided.',
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    'BASE_PATH environment variable is required but was not provided.',
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay(),
    ...(process.env.NODE_ENV !== 'production' &&
    process.env.REPL_ID !== undefined
      ? [
          await import('@replit/vite-plugin-cartographer').then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, '..'),
            }),
          ),
          await import('@replit/vite-plugin-dev-banner').then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      '@assets': path.resolve(
        import.meta.dirname,
        '..',
        '..',
        'attached_assets',
      ),
    },
    dedupe: ['react', 'react-dom'],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, 'dist/public'),
    emptyOutDir: true,
  },
  server: {
    port,
    strictPort: true,
    host: '0.0.0.0',
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port,
    host: '0.0.0.0',
    allowedHosts: true,
  },
});


--- FILE: .\src\App.tsx ---
import { useMemo, useState } from 'react';
import { ArrowRight, Calculator, Check, ChevronDown, CircleUserRound, FileText, Menu, PackageSearch, Printer, Search, ShieldCheck, X } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { products as seedProducts, initialOrders, orderStatuses, type FulfillmentOrder, type Product, type ProductCategory } from '@/lib/mockData';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import NotFound from '@/pages/not-found';

const queryClient = new QueryClient();
const categories: Array<'All' | ProductCategory> = ['All', 'Blinds', 'Custom Curtains', 'Carpets', 'Wallpapers'];
const peso = (amount: number) => `₱${amount.toLocaleString('en-PH', { maximumFractionDigits: 0 })}`;

type Estimate = {
  product: Product;
  width: number;
  height: number;
  quantity: number;
  area: number;
  total: number;
};

function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [filter, setFilter] = useState<'All' | ProductCategory>('All');
  const [products, setProducts] = useState(seedProducts);
  const [estimatorOpen, setEstimatorOpen] = useState(false);
  const [quote, setQuote] = useState<Estimate | null>(null);
  const [trackOpen, setTrackOpen] = useState(false);
  const [staffLoginOpen, setStaffLoginOpen] = useState(false);
  const [staffOpen, setStaffOpen] = useState(false);

  const filteredProducts = useMemo(() => filter === 'All' ? products : products.filter((product) => product.category === filter), [filter, products]);
  const scrollTo = (id: string) => {
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="site-shell">
      <div className="topline">A considered source for architectural finishes · Davao City</div>
      <header className="nav">
        <button className="brand" onClick={() => scrollTo('catalog')} aria-label="Return to catalog" data-testid="button-brand-home">
          <span className="brand-mark">C</span>
          <span className="brand-copy"><span className="brand-name">CM INTERIORS MARKETING</span><span className="brand-sub">Est. 2007 · Davao City</span></span>
        </button>
        <nav className={`nav-links ${mobileOpen ? 'open' : ''}`} aria-label="Main navigation">
          <button className="active" onClick={() => scrollTo('catalog')} data-testid="link-catalog">Catalog</button>
          <button onClick={() => { scrollTo('estimator'); setEstimatorOpen(false); }} data-testid="link-estimator">Custom Estimator</button>
          <button onClick={() => { setTrackOpen(true); setMobileOpen(false); }} data-testid="link-track-order">Track Order</button>
          <button onClick={() => { setStaffLoginOpen(true); setMobileOpen(false); }} data-testid="link-staff-portal">Staff Portal</button>
        </nav>
        <div className="nav-actions">
          <button className="text-button" onClick={() => setTrackOpen(true)} data-testid="button-header-track"><PackageSearch size={14} /> Track order</button>
          <button className="icon-button mobile-nav-toggle" onClick={() => setMobileOpen((value) => !value)} aria-label="Toggle navigation" data-testid="button-mobile-menu"><Menu size={16} /></button>
        </div>
      </header>

      <main>
        <section className="hero reveal">
          <div>
            <div className="eyebrow">Materials, measured</div>
            <h1>Rooms begin with a <em>feeling.</em></h1>
            <p className="hero-copy">A local source for considered blinds, curtains, carpets, and wallpapers. Browse the collection, price a finish, and move from first thought to a clear next step.</p>
            <div className="hero-actions">
              <button className="primary-button" onClick={() => scrollTo('catalog')} data-testid="button-explore-collection">Explore collection <ArrowRight size={15} /></button>
              <button className="secondary-button" onClick={() => scrollTo('estimator')} data-testid="button-price-project"><Calculator size={14} /> Price a project</button>
            </div>
            <div className="hero-note">For homeowners, designers, and contractors who care about the details that make a space feel finished.</div>
          </div>
          <div className="hero-visual reveal delay-2" aria-label="Layered window treatment material study">
            <div className="material-window"><div className="window-swatch" /><div className="window-card"><small>Material study 01</small><strong>Light, held softly.</strong></div></div>
            <div className="hero-stamp">Sourced<br />in Davao</div>
          </div>
        </section>

        <section className="section section-rule" id="catalog">
          <div className="section-heading">
            <div><div className="eyebrow">The collection</div><h2>Quietly distinctive<br />materials.</h2></div>
            <p>Every line is selected for its hand, light response, and ability to live well in a real Davao home or project.</p>
          </div>
          <div className="filter-row" role="group" aria-label="Filter catalog categories">
            {categories.map((category) => <button key={category} className={`filter ${filter === category ? 'selected' : ''}`} onClick={() => setFilter(category)} data-testid={`button-filter-${category.toLowerCase().replaceAll(' ', '-')}`}>{category}</button>)}
            <span style={{ marginLeft: 'auto', color: 'var(--muted-ink)', fontSize: 10 }}>{filteredProducts.length} lines shown</span>
          </div>
          <div className="catalog-grid">
            {filteredProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} onEstimate={() => { setEstimatorOpen(true); }} />)}
          </div>
        </section>

        <section className="estimator-section" id="estimator">
          <div className="estimator-grid">
            <div className="estimator-intro">
              <div className="eyebrow">The project desk</div>
              <h2>Make the first number useful.</h2>
              <p>Enter a rough opening size and we’ll translate it into a clear starting point. Rates are per square foot and include a realistic local sourcing lead time.</p>
              <div className="hero-note" style={{ color: '#bcb6ae', borderColor: 'rgba(250,248,245,.25)' }}>60% downpayment · 5–7 business days standard lead time</div>
            </div>
            <Estimator products={products} open={estimatorOpen} onOpenChange={setEstimatorOpen} onQuote={setQuote} />
          </div>
        </section>

        <section className="process">
          <div className="process-grid">
            <div><div className="eyebrow">How it moves</div><h2>From sample<br />to install.</h2><p className="process-copy">A small, clear workflow keeps your project moving without the guesswork. We stay close to the details and the handoff.</p></div>
            <div className="steps">
              <div className="step"><div className="step-num">01</div><div><h3>Choose the feeling</h3><p>Browse material families, supplier sources, and transparent square-foot rates.</p></div></div>
              <div className="step"><div className="step-num">02</div><div><h3>Measure the opening</h3><p>Use the estimator for an early range, then share final dimensions for a formal quotation.</p></div></div>
              <div className="step"><div className="step-num">03</div><div><h3>We source with care</h3><p>We coordinate local stock, Manila partners, and imported lines against your timeline.</p></div></div>
              <div className="step"><div className="step-num">04</div><div><h3>Hand over a finished room</h3><p>Track the order, prepare the site, and let our installation partners take it from there.</p></div></div>
            </div>
          </div>
        </section>

        <section className="tracking-band" id="tracking">
          <div className="tracking-content">
            <div><div className="eyebrow" style={{ color: '#f0c6c3' }}>Your order, in view</div><h2>Know what’s next.</h2><p>Enter the reference from your quotation to see the latest sourcing and fulfillment note.</p></div>
            <div><button className="secondary-button" style={{ color: 'white', borderColor: 'white' }} onClick={() => setTrackOpen(true)} data-testid="button-track-shipment">Track a shipment <Search size={14} /></button></div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="footer-main"><div><h2>CM Interiors<br /><span style={{ color: '#d6a8a6' }}>Marketing.</span></h2><p>Architectural interior furnishings, sourced thoughtfully in Davao and beyond.</p></div><div className="footer-contact">J.P. Laurel Avenue, Davao City<br />+63 917 812 2007<br />hello@cminteriors.ph</div></div>
        <div className="footer-bottom"><span>© 2024 CM Interiors Marketing</span><span>For spaces with a point of view.</span></div>
      </footer>

      {estimatorOpen && <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setEstimatorOpen(false); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="estimator-modal-title"><div className="modal-head"><h2 id="estimator-modal-title">Custom estimator</h2><button className="close-button" onClick={() => setEstimatorOpen(false)} aria-label="Close estimator" data-testid="button-close-estimator"><X size={18} /></button></div><div className="modal-body"><Estimator products={products} open onOpenChange={setEstimatorOpen} onQuote={setQuote} /></div></div></div>}
      {quote && <QuoteModal estimate={quote} onClose={() => setQuote(null)} />}
      {trackOpen && <TrackModal orders={initialOrders} onClose={() => setTrackOpen(false)} />}
      {staffLoginOpen && <LoginModal onClose={() => setStaffLoginOpen(false)} onSuccess={() => { setStaffLoginOpen(false); setStaffOpen(true); }} />}
      {staffOpen && <StaffDashboard products={products} setProducts={setProducts} onClose={() => setStaffOpen(false)} />}
    </div>
  );
}

function ProductCard({ product, index, onEstimate }: { product: Product; index: number; onEstimate: () => void }) {
  return <article className={`product-card reveal delay-${(index % 3) + 1}`} data-testid={`card-product-${product.id}`}>
    <div className={`product-art ${product.art}`}><span className="art-label">{product.tag}</span><span className="art-number">{String(index + 1).padStart(2, '0')}</span></div>
    <div className="product-info"><h3 className="product-title">{product.name}</h3><p className="product-desc">{product.description}</p><div className="product-foot"><span className="supplier">{product.supplier}</span><span className="price">{peso(product.rate)}<small>per sq. ft.</small></span></div><button className="text-button" style={{ marginTop: 17, width: '100%', justifyContent: 'center' }} onClick={onEstimate} data-testid={`button-estimate-${product.id}`}>Estimate this line <ArrowRight size={13} /></button></div>
  </article>;
}

function Estimator({ products, onQuote }: { products: Product[]; open?: boolean; onOpenChange?: (value: boolean) => void; onQuote: (estimate: Estimate) => void }) {
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
  const total = area * (selected?.rate ?? 0) * Math.max(1, Number(quantity));
  const estimate = selected ? { product: selected, width: widthIn, height: heightIn, quantity: Math.max(1, Number(quantity)), area, total } : null;

  return <div className="estimate-form" data-testid="panel-estimator">
    <div className="field"><label htmlFor="product-select">Material line</label><select id="product-select" value={productId} onChange={(event) => setProductId(event.target.value)} data-testid="select-estimator-product">{products.map((product) => <option key={product.id} value={product.id}>{product.name} · {peso(product.rate)}/sq. ft.</option>)}</select></div>
    <div className="form-row"><div className="field"><label htmlFor="width-input">Width</label><input id="width-input" type="number" min="1" value={width} onChange={(event) => setWidth(Number(event.target.value))} data-testid="input-estimator-width" /></div><div className="field"><label htmlFor="height-input">Height</label><input id="height-input" type="number" min="1" value={height} onChange={(event) => setHeight(Number(event.target.value))} data-testid="input-estimator-height" /></div></div>
    <div className="form-row"><div className="field"><label htmlFor="quantity-input">Quantity</label><input id="quantity-input" type="number" min="1" value={quantity} onChange={(event) => setQuantity(Number(event.target.value))} data-testid="input-estimator-quantity" /></div><div className="field"><label>Measurement</label><div className="unit-toggle"><button className={unit === 'in' ? 'selected' : ''} onClick={() => setUnit('in')} data-testid="button-unit-in">inches</button><button className={unit === 'cm' ? 'selected' : ''} onClick={() => setUnit('cm')} data-testid="button-unit-cm">cm</button></div></div></div>
    <div className="estimate-result" aria-live="polite"><div className="estimate-top"><span>Estimated project total<br /><b style={{ color: '#e0d9d1', fontWeight: 500 }}>{selected?.name}</b></span><div className="estimate-total">{peso(Math.round(total))}<small>{area.toFixed(1)} sq. ft. · {quantity} unit{quantity === 1 ? '' : 's'}</small></div></div><div className="breakdown"><div><span>Rate</span><b>{peso(selected?.rate ?? 0)} / sq. ft.</b></div><div><span>60% downpayment</span><b>{peso(Math.round(total * .6))}</b></div><div><span>Estimated lead time</span><b>5–7 business days</b></div></div>{estimate && <button className="primary-button" onClick={() => onQuote(estimate)} data-testid="button-request-quotation"><FileText size={14} /> Request formal quotation</button>}</div>
  </div>;
}

function QuoteModal({ estimate, onClose }: { estimate: Estimate; onClose: () => void }) {
  const quoteId = `CM-Q-${new Date().getFullYear()}-${String(Math.round(estimate.total)).slice(-4)}`;
  return <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="quote-modal-title"><div className="modal-head"><h2 id="quote-modal-title">Your quotation preview</h2><button className="close-button" onClick={onClose} aria-label="Close quotation" data-testid="button-close-quote"><X size={18} /></button></div><div className="modal-body"><div className="quote-paper" id="print-quote"><div className="quote-brand">CM INTERIORS MARKETING</div><h2>Project quotation</h2><div className="quote-meta"><span>Quote ID<br /><b style={{ color: 'var(--obsidian)' }}>{quoteId}</b></span><span>Prepared 21 June 2024<br /><b style={{ color: 'var(--obsidian)' }}>Davao City, Philippines</b></span></div><table className="quote-table"><thead><tr><th>Material / specification</th><th>Dimensions</th><th>Amount</th></tr></thead><tbody><tr><td><b>{estimate.product.name}</b><br /><span style={{ color: 'var(--muted-ink)' }}>{estimate.product.supplier}</span></td><td>{estimate.width.toFixed(0)}″ × {estimate.height.toFixed(0)}″<br />{estimate.quantity} unit{estimate.quantity === 1 ? '' : 's'}</td><td>{peso(Math.round(estimate.total))}</td></tr></tbody></table><div className="quote-total"><span>Project total<br /><small style={{ color: 'var(--muted-ink)' }}>VAT and final site measurement subject to confirmation</small></span><strong>{peso(Math.round(estimate.total))}</strong></div><div className="payment-box"><strong>Payment instructions</strong>To reserve the material line, a 60% downpayment of <b style={{ color: 'var(--crimson)' }}>{peso(Math.round(estimate.total * .6))}</b> is required. Pay via GCash (+63 917 812 2007), bank transfer to BPI · CM Interiors Marketing, or check payable to CM Interiors Marketing. Standard lead time is 5–7 business days after payment and final measurement.</div></div><div className="quote-actions"><button className="text-button" onClick={() => window.print()} data-testid="button-print-quote"><Printer size={14} /> Print / save PDF</button><button className="primary-button" onClick={onClose} data-testid="button-done-quote"><Check size={14} /> Done</button></div></div></div></div>;
}

function TrackModal({ orders, onClose }: { orders: FulfillmentOrder[]; onClose: () => void }) {
  const [reference, setReference] = useState('');
  const [searched, setSearched] = useState<FulfillmentOrder | null>(null);
  const submit = () => setSearched(orders.find((order) => order.id.toLowerCase() === reference.trim().toLowerCase() || order.waybill.toLowerCase() === reference.trim().toLowerCase()) ?? null);
  return <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="track-modal-title"><div className="modal-head"><h2 id="track-modal-title">Track an order</h2><button className="close-button" onClick={onClose} aria-label="Close tracking" data-testid="button-close-tracking"><X size={18} /></button></div><div className="modal-body"><p style={{ color: 'var(--muted-ink)', fontSize: 12, lineHeight: 1.6, marginTop: 0 }}>Use the quote ID or cargo waybill. Try <b>CM-24071</b> for a live sample.</p><div className="tracking-form" style={{ minWidth: 0 }}><input value={reference} onChange={(event) => setReference(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submit(); }} placeholder="e.g. CM-24071" aria-label="Quote ID or waybill" data-testid="input-track-reference" /><button onClick={submit} data-testid="button-search-order">Search</button></div>{searched ? <div className="tracking-result" style={{ background: '#f1eee9', marginTop: 25, color: 'var(--obsidian)' }}><div style={{ display: 'flex', justifyContent: 'space-between', gap: 15 }}><b>{searched.id}</b><span className="status-chip">{searched.status}</span></div><p style={{ fontSize: 12, margin: '15px 0 7px' }}>{searched.client} · {searched.product}</p><small style={{ color: 'var(--muted-ink)' }}>Last updated {searched.date} · Waybill {searched.waybill}</small><div style={{ marginTop: 18, borderTop: '1px solid var(--sand)', paddingTop: 13, color: 'var(--sage)', fontSize: 11 }}>Your order is being handled by the CM Interiors project desk.</div></div> : reference && <div className="empty-state" data-testid="status-order-not-found">No order found for that reference. Check the format and try again.</div>}</div></div></div>;
}

function LoginModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const submit = () => { if (email === 'staff@cminteriors.ph' && password === 'showroom2024') onSuccess(); else setError('Use the showroom demo access: staff@cminteriors.ph · showroom2024'); };
  return <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className="modal login-modal" role="dialog" aria-modal="true" aria-labelledby="login-title"><div className="login-art"><button className="close-button" style={{ position: 'absolute', right: 18, top: 15, color: 'white', zIndex: 2 }} onClick={onClose} aria-label="Close login" data-testid="button-close-login"><X size={18} /></button><h2 id="login-title">Staff portal</h2></div><div className="login-form"><p style={{ margin: '0 0 22px', color: 'var(--muted-ink)', fontSize: 12, lineHeight: 1.5 }}>The working desk for catalog, sourcing, and fulfillment.</p><div className="light-field"><label htmlFor="staff-email">Email</label><input id="staff-email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="staff@cminteriors.ph" data-testid="input-staff-email" /></div><div className="light-field"><label htmlFor="staff-password">Password</label><input id="staff-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" onKeyDown={(event) => { if (event.key === 'Enter') submit(); }} data-testid="input-staff-password" /></div>{error && <div className="login-error" data-testid="status-login-error">{error}</div>}<button className="primary-button" onClick={submit} data-testid="button-login-staff"><ShieldCheck size={14} /> Sign in to desk</button></div></div></div>;
}

function StaffDashboard({ products, setProducts, onClose }: { products: Product[]; setProducts: (products: Product[]) => void; onClose: () => void }) {
  const [orders, setOrders] = useState(initialOrders);
  const [waybill, setWaybill] = useState('');
  const [waybillLog, setWaybillLog] = useState<string[]>([]);
  const [archived, setArchived] = useState<string[]>([]);
  const visibleProducts = products.filter((product) => !archived.includes(product.id));
  const updateRate = (id: string, rate: number) => setProducts(products.map((product) => product.id === id ? { ...product, rate: Number.isFinite(rate) ? rate : product.rate } : product));
  const addProduct = () => setProducts([...products, { id: `custom-${Date.now()}`, name: 'New material line', category: 'Blinds', supplier: 'Davao Warehouse', rate: 160, description: 'A new line ready for catalog details.', art: 'art-blind', tag: 'Draft line' }]);
  return <div className="staff-overlay"><div className="staff-shell"><header className="staff-top"><div className="brand"><span className="brand-mark">C</span><span className="brand-copy"><span className="brand-name">CM INTERIORS MARKETING</span><span className="brand-sub">Staff working desk</span></span></div><div className="staff-top-actions"><button onClick={onClose} data-testid="button-exit-staff">Exit portal</button></div></header><div className="staff-title"><div><div className="eyebrow" style={{ color: '#d6e0da' }}>Good morning, team</div><h1>Project desk.</h1></div><p>Friday, 21 June 2024<br />Davao City · showroom view</p></div><div className="stat-grid"><div className="stat"><span>Open orders</span><strong>{orders.filter((order) => order.status !== 'Fulfilled').length}</strong></div><div className="stat"><span>Ready to install</span><strong>{orders.filter((order) => order.status === 'Ready for Installation').length}</strong></div><div className="stat"><span>Catalog lines</span><strong>{visibleProducts.length}</strong></div><div className="stat"><span>In transit value</span><strong>{peso(orders.filter((order) => order.status === 'In Transit').reduce((sum, order) => sum + order.amount, 0))}</strong></div></div><div className="staff-panels"><section className="staff-panel"><div className="panel-head"><h2>Catalog lines</h2><button onClick={addProduct} data-testid="button-add-product">+ Add line</button></div><table className="admin-table"><thead><tr><th>Line</th><th>Source</th><th>Rate / sq. ft.</th><th>Action</th></tr></thead><tbody>{visibleProducts.map((product) => <tr key={product.id}><td><b>{product.name}</b><br /><span style={{ color: 'var(--muted-ink)' }}>{product.category}</span></td><td>{product.supplier}</td><td><input type="number" value={product.rate} onChange={(event) => updateRate(product.id, Number(event.target.value))} aria-label={`Rate for ${product.name}`} data-testid={`input-rate-${product.id}`} /></td><td><button className="table-action" onClick={() => setArchived([...archived, product.id])} data-testid={`button-archive-${product.id}`}>Archive</button></td></tr>)}</tbody></table></section><section className="staff-panel"><div className="panel-head"><h2>Fulfillment</h2><span style={{ color: 'var(--muted-ink)', fontSize: 10 }}>{orders.length} logged</span></div><table className="admin-table"><thead><tr><th>Order / client</th><th>Status</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id}><td><b>{order.id}</b><br /><span style={{ color: 'var(--muted-ink)' }}>{order.client}</span></td><td><select value={order.status} onChange={(event) => setOrders(orders.map((item) => item.id === order.id ? { ...item, status: event.target.value } : item))} aria-label={`Status for ${order.id}`} data-testid={`select-status-${order.id}`}>{orderStatuses.map((status) => <option key={status}>{status}</option>)}</select></td></tr>)}</tbody></table><div className="waybill-box"><label htmlFor="waybill-input">Manual waybill log</label><div className="waybill-form"><input id="waybill-input" value={waybill} onChange={(event) => setWaybill(event.target.value)} placeholder="e.g. LBC-DVO-89210" data-testid="input-waybill" /><button onClick={() => { if (waybill.trim()) { setWaybillLog([waybill.trim(), ...waybillLog]); setWaybill(''); } }} data-testid="button-log-waybill">Log</button></div>{waybillLog.length > 0 ? <div className="waybill-log">{waybillLog.map((item, index) => <div key={`${item}-${index}`}>Logged · {item}</div>)}</div> : <div className="waybill-log">No manual entries this week.</div>}</div></section></div></div></div>;
}

function Router() {
  return <ErrorBoundary resetKey={useLocation()[0]}><Switch><Route path="/" component={Home} /><Route component={NotFound} /></Switch></ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><Router /></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;

--- FILE: .\src\index.css ---
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap');
@import 'tailwindcss';
@import 'tw-animate-css';

:root {
  --crimson: #B20D15;
  --linen: #FAF8F5;
  --obsidian: #1A1918;
  --sand: #E2E0DB;
  --sage: #4D5C58;
  --taupe: #C2B6A6;
  --muted-ink: #69645e;
  --paper: #fffdfa;
  --background: 36 33% 97%;
  --foreground: 0 4% 10%;
  --border: 38 10% 87%;
  --card: 40 100% 99%;
  --card-foreground: 0 4% 10%;
  --card-border: 38 10% 87%;
  --sidebar: 0 4% 10%;
  --sidebar-foreground: 36 33% 97%;
  --sidebar-border: 0 0% 100% / 0.12;
  --sidebar-primary: 357 87% 37%;
  --sidebar-primary-foreground: 0 0% 100%;
  --sidebar-accent: 167 9% 33%;
  --sidebar-accent-foreground: 0 0% 100%;
  --sidebar-ring: 357 87% 37%;
  --popover: 40 100% 99%;
  --popover-foreground: 0 4% 10%;
  --popover-border: 38 10% 87%;
  --primary: 357 87% 37%;
  --primary-foreground: 0 0% 100%;
  --secondary: 38 10% 87%;
  --secondary-foreground: 0 4% 10%;
  --muted: 36 18% 93%;
  --muted-foreground: 25 8% 41%;
  --accent: 167 9% 33%;
  --accent-foreground: 0 0% 100%;
  --destructive: 357 87% 37%;
  --destructive-foreground: 0 0% 100%;
  --input: 38 10% 87%;
  --ring: 357 87% 37%;
  --chart-1: 357 87% 37%;
  --chart-2: 167 9% 33%;
  --chart-3: 31 22% 70%;
  --chart-4: 38 10% 87%;
  --chart-5: 0 4% 10%;
  --app-font-sans: 'DM Sans', sans-serif;
  --app-font-serif: 'Playfair Display', Georgia, serif;
  --app-font-mono: 'DM Sans', monospace;
  --radius: 0.2rem;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body {
  margin: 0;
  background: var(--linen);
  color: var(--obsidian);
  font-family: var(--app-font-sans);
  -webkit-font-smoothing: antialiased;
}
button, input, select { font: inherit; }
button { cursor: pointer; }
button:focus-visible, input:focus-visible, select:focus-visible, a:focus-visible {
  outline: 2px solid var(--crimson); outline-offset: 3px;
}

.site-shell { min-height: 100dvh; overflow: hidden; }
.topline { height: 34px; background: var(--obsidian); color: #d9d2c8; display: flex; align-items: center; justify-content: center; font-size: 10px; letter-spacing: .16em; text-transform: uppercase; }
.nav { height: 84px; border-bottom: 1px solid var(--sand); display: flex; align-items: center; justify-content: space-between; padding: 0 clamp(20px, 5vw, 80px); background: rgba(250,248,245,.94); position: sticky; top: 0; z-index: 20; backdrop-filter: blur(14px); }
.brand { display: flex; align-items: center; gap: 13px; text-decoration: none; color: var(--obsidian); }
.brand-mark { width: 35px; height: 35px; background: var(--crimson); color: white; display: grid; place-items: center; font-family: var(--app-font-serif); font-size: 20px; border-radius: 50%; }
.brand-copy { line-height: 1.1; }
.brand-name { font-size: 12px; font-weight: 700; letter-spacing: .14em; }
.brand-sub { font-size: 9px; color: var(--muted-ink); letter-spacing: .1em; margin-top: 4px; }
.nav-links { display: flex; align-items: center; gap: clamp(16px, 3vw, 38px); }
.nav-links button { border: 0; background: none; color: var(--muted-ink); font-size: 12px; padding: 8px 0; position: relative; }
.nav-links button:hover, .nav-links button.active { color: var(--obsidian); }
.nav-links button.active::after { content: ''; position: absolute; left: 0; right: 0; bottom: -12px; height: 2px; background: var(--crimson); }
.nav-actions { display: flex; gap: 10px; align-items: center; }
.icon-button, .text-button { border: 1px solid var(--sand); background: var(--paper); color: var(--obsidian); padding: 10px 12px; display: inline-flex; align-items: center; gap: 8px; font-size: 11px; }
.icon-button:hover, .text-button:hover { border-color: var(--taupe); transform: translateY(-1px); }
.mobile-nav-toggle { display: none; }

.hero { max-width: 1400px; margin: 0 auto; padding: clamp(56px, 10vw, 140px) clamp(20px, 7vw, 110px) 90px; display: grid; grid-template-columns: 1.02fr .98fr; gap: clamp(35px, 7vw, 110px); align-items: center; }
.eyebrow { display: flex; align-items: center; gap: 11px; color: var(--crimson); font-size: 10px; letter-spacing: .19em; text-transform: uppercase; font-weight: 700; }
.eyebrow::before { content: ''; width: 28px; height: 1px; background: var(--crimson); }
.hero h1 { font: 600 clamp(45px, 6.6vw, 88px)/.98 var(--app-font-serif); letter-spacing: -.045em; margin: 25px 0 29px; max-width: 700px; }
.hero h1 em { color: var(--crimson); font-style: italic; font-weight: 500; }
.hero-copy { font-size: 16px; line-height: 1.7; max-width: 455px; color: var(--muted-ink); }
.hero-actions { display: flex; gap: 13px; margin-top: 32px; flex-wrap: wrap; }
.primary-button { background: var(--crimson); color: white; border: 1px solid var(--crimson); padding: 14px 19px; font-size: 11px; letter-spacing: .05em; display: inline-flex; align-items: center; gap: 10px; }
.primary-button:hover { background: #8f0a11; transform: translateY(-2px); }
.secondary-button { background: transparent; color: var(--obsidian); border: 1px solid var(--obsidian); padding: 14px 19px; font-size: 11px; display: inline-flex; align-items: center; gap: 10px; }
.secondary-button:hover { background: var(--obsidian); color: var(--linen); transform: translateY(-2px); }
.hero-note { border-left: 1px solid var(--taupe); margin-top: 38px; padding-left: 16px; font-size: 11px; color: var(--muted-ink); line-height: 1.6; }
.hero-visual { height: min(530px, 55vw); min-height: 370px; position: relative; }
.material-window { position: absolute; inset: 0 7% 0 8%; background: var(--sage); overflow: hidden; }
.material-window::before { content: ''; position: absolute; inset: 0; background: linear-gradient(135deg, rgba(26,25,24,.2), transparent 42%), repeating-linear-gradient(90deg, transparent 0 32px, rgba(250,248,245,.15) 33px 34px); }
.window-swatch { position: absolute; width: 58%; height: 74%; right: -4%; top: 13%; background: linear-gradient(125deg, #bdb19f 0 48%, #e7dfd1 49% 70%, #a99b89 71%); box-shadow: -22px 25px 0 rgba(26,25,24,.2); }
.window-swatch::after { content: ''; position: absolute; inset: 0; opacity: .3; background: repeating-linear-gradient(97deg, transparent 0 8px, #756f66 9px 10px); }
.window-card { position: absolute; left: 0; bottom: 8%; background: var(--linen); padding: 18px 20px; width: 190px; box-shadow: 15px 15px 0 rgba(26,25,24,.15); }
.window-card small { color: var(--crimson); letter-spacing: .15em; text-transform: uppercase; font-size: 9px; }
.window-card strong { display: block; font: 600 21px var(--app-font-serif); margin-top: 7px; }
.hero-stamp { position: absolute; right: 0; top: -20px; width: 98px; height: 98px; border: 1px solid var(--crimson); border-radius: 50%; color: var(--crimson); display: grid; place-items: center; text-align: center; font-size: 9px; letter-spacing: .12em; text-transform: uppercase; transform: rotate(12deg); }

.section { max-width: 1400px; margin: 0 auto; padding: 84px clamp(20px, 7vw, 110px); }
.section-rule { border-top: 1px solid var(--sand); }
.section-heading { display: flex; justify-content: space-between; align-items: end; gap: 25px; margin-bottom: 36px; }
.section-heading h2 { font: 600 clamp(32px, 4vw, 56px)/1 var(--app-font-serif); margin: 0; letter-spacing: -.035em; }
.section-heading p { max-width: 300px; color: var(--muted-ink); font-size: 12px; line-height: 1.6; margin: 0; }
.filter-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-bottom: 30px; }
.filter { border: 1px solid var(--sand); color: var(--muted-ink); background: transparent; padding: 10px 15px; font-size: 11px; }
.filter:hover, .filter.selected { color: var(--paper); background: var(--obsidian); border-color: var(--obsidian); }
.catalog-grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 17px; }
.product-card { grid-column: span 4; border: 1px solid var(--sand); background: var(--paper); min-width: 0; transition: transform .3s ease, box-shadow .3s ease; }
.product-card:nth-child(4n+2) { grid-column: span 5; }
.product-card:nth-child(4n+3) { grid-column: span 3; }
.product-card:hover { transform: translateY(-5px); box-shadow: 9px 10px 0 var(--sand); }
.product-art { height: 270px; position: relative; overflow: hidden; background: var(--sage); }
.product-art::after { content: ''; position: absolute; inset: 0; opacity: .35; }
.art-blind { background: linear-gradient(110deg, #b8a58c, #d8cdbd); }
.art-blind::after { background: repeating-linear-gradient(90deg, transparent 0 18px, #6f6960 19px 20px); }
.art-curtain { background: linear-gradient(122deg, #b9b09d, #817b70); }
.art-curtain::after { background: repeating-linear-gradient(103deg, transparent 0 42px, #f0e8db 43px 67px, transparent 68px 93px); }
.art-carpet { background: radial-gradient(ellipse at 45% 44%, #d8ccba, #836f5d 65%, #4d453f); }
.art-carpet::after { background: repeating-linear-gradient(43deg, transparent 0 6px, rgba(250,248,245,.45) 7px 8px); }
.art-wallpaper { background: #9a6f67; }
.art-wallpaper::after { background-image: radial-gradient(#e6c5b8 1.2px, transparent 1.2px); background-size: 20px 20px; }
.art-label { position: absolute; z-index: 1; top: 15px; left: 15px; font-size: 9px; text-transform: uppercase; letter-spacing: .14em; background: var(--linen); padding: 7px 9px; }
.art-number { position: absolute; bottom: 12px; right: 14px; color: rgba(250,248,245,.72); font: 32px var(--app-font-serif); z-index: 1; }
.product-info { padding: 19px 18px 20px; }
.product-title { font: 600 22px var(--app-font-serif); margin: 0 0 6px; }
.product-desc { color: var(--muted-ink); font-size: 11px; line-height: 1.55; margin: 0 0 16px; min-height: 34px; }
.product-foot { display: flex; align-items: end; justify-content: space-between; gap: 8px; }
.supplier { font-size: 9px; color: var(--sage); letter-spacing: .04em; text-transform: uppercase; }
.price { font: 600 17px var(--app-font-serif); text-align: right; white-space: nowrap; }
.price small { display: block; color: var(--muted-ink); font: 9px var(--app-font-sans); letter-spacing: .08em; text-transform: uppercase; }

.estimator-section { background: var(--obsidian); color: var(--linen); max-width: none; padding: 94px max(20px, calc((100% - 1180px)/2)); position: relative; }
.estimator-section::before { content: 'CALCULATE'; position: absolute; right: 3%; top: 40px; color: rgba(250,248,245,.05); font: 700 clamp(70px, 13vw, 190px) var(--app-font-serif); letter-spacing: -.08em; pointer-events: none; }
.estimator-grid { display: grid; grid-template-columns: .85fr 1.15fr; gap: clamp(35px, 8vw, 125px); position: relative; z-index: 1; }
.estimator-section .eyebrow { color: #d6a8a6; }
.estimator-section .eyebrow::before { background: #d6a8a6; }
.estimator-intro h2 { font: 600 clamp(36px, 5vw, 62px)/1.02 var(--app-font-serif); margin: 25px 0 20px; letter-spacing: -.04em; }
.estimator-intro p { color: #bcb6ae; font-size: 13px; line-height: 1.7; max-width: 360px; }
.estimate-form { border-top: 1px solid rgba(250,248,245,.2); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 13px; }
.field { padding: 19px 0; border-bottom: 1px solid rgba(250,248,245,.18); }
.field label { display: block; color: #a9a29a; font-size: 10px; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 9px; }
.field input, .field select { width: 100%; color: var(--linen); border: 0; outline: 0; background: transparent; font-size: 15px; padding: 2px 0; }
.field input::placeholder { color: #77716a; }
.field select option { color: var(--obsidian); }
.unit-toggle { display: flex; gap: 6px; }
.unit-toggle button { color: #9f9991; background: transparent; border: 1px solid rgba(250,248,245,.18); padding: 5px 10px; font-size: 10px; }
.unit-toggle button.selected { background: var(--crimson); border-color: var(--crimson); color: white; }
.estimate-result { margin-top: 24px; background: #252422; border: 1px solid #3b3936; padding: 23px; }
.estimate-top { display: flex; justify-content: space-between; gap: 20px; align-items: start; }
.estimate-top span { color: #aaa39b; font-size: 11px; }
.estimate-total { text-align: right; font: 600 32px var(--app-font-serif); color: var(--linen); }
.estimate-total small { display: block; color: #918b83; font: 10px var(--app-font-sans); margin-top: 3px; }
.breakdown { border-top: 1px solid #3b3936; margin-top: 19px; padding-top: 14px; display: grid; gap: 9px; font-size: 11px; color: #aaa39b; }
.breakdown div { display: flex; justify-content: space-between; }
.breakdown b { color: var(--linen); font-weight: 500; }
.estimate-result .primary-button { margin-top: 21px; width: 100%; justify-content: center; }

.process { background: #eeeae3; padding: 92px max(20px, calc((100% - 1180px)/2)); }
.process-grid { display: grid; grid-template-columns: 1fr 1.55fr; gap: 100px; align-items: start; }
.process h2 { font: 600 clamp(34px, 4vw, 52px)/1.03 var(--app-font-serif); margin: 20px 0; letter-spacing: -.04em; }
.process-copy { color: var(--muted-ink); line-height: 1.7; font-size: 13px; max-width: 310px; }
.steps { border-top: 1px solid var(--taupe); }
.step { display: grid; grid-template-columns: 54px 1fr; gap: 18px; padding: 22px 0; border-bottom: 1px solid var(--taupe); }
.step-num { color: var(--crimson); font: 20px var(--app-font-serif); }
.step h3 { margin: 0 0 6px; font: 600 18px var(--app-font-serif); }
.step p { margin: 0; color: var(--muted-ink); font-size: 11px; line-height: 1.55; }

.tracking-band { background: var(--crimson); color: white; padding: 76px max(20px, calc((100% - 1180px)/2)); }
.tracking-content { display: flex; justify-content: space-between; gap: 40px; align-items: end; }
.tracking-band h2 { font: 600 clamp(35px, 4vw, 55px)/1 var(--app-font-serif); margin: 18px 0 10px; letter-spacing: -.04em; }
.tracking-band p { color: #f0c6c3; max-width: 350px; font-size: 12px; line-height: 1.6; }
.tracking-form { display: flex; min-width: min(100%, 405px); }
.tracking-form input { flex: 1; min-width: 0; border: 0; background: white; padding: 15px; color: var(--obsidian); font-size: 12px; }
.tracking-form button { border: 1px solid white; background: transparent; color: white; padding: 0 17px; font-size: 11px; }
.tracking-form button:hover { background: white; color: var(--crimson); }
.tracking-result { margin-top: 22px; max-width: 500px; background: rgba(26,25,24,.18); padding: 17px; font-size: 12px; }

.footer { background: var(--obsidian); color: var(--linen); padding: 62px max(20px, calc((100% - 1180px)/2)) 28px; }
.footer-main { display: flex; justify-content: space-between; gap: 30px; border-bottom: 1px solid rgba(250,248,245,.16); padding-bottom: 46px; }
.footer h2 { font: 600 29px var(--app-font-serif); margin: 0 0 12px; }
.footer p { max-width: 300px; color: #a19b92; font-size: 11px; line-height: 1.7; margin: 0; }
.footer-contact { color: #d2cbc2; font-size: 12px; line-height: 2; text-align: right; }
.footer-bottom { display: flex; justify-content: space-between; padding-top: 20px; color: #7e7871; font-size: 9px; letter-spacing: .1em; text-transform: uppercase; }

.overlay { position: fixed; z-index: 50; inset: 0; background: rgba(26,25,24,.67); display: grid; place-items: center; padding: 20px; animation: fade-in .22s ease both; }
.modal { width: min(100%, 900px); max-height: min(90dvh, 780px); overflow: auto; background: var(--linen); color: var(--obsidian); box-shadow: 18px 20px 0 rgba(0,0,0,.17); animation: rise-in .25s ease both; }
.modal-head { padding: 22px 25px; border-bottom: 1px solid var(--sand); display: flex; align-items: center; justify-content: space-between; }
.modal-head h2 { margin: 0; font: 600 27px var(--app-font-serif); }
.close-button { border: 0; background: transparent; color: var(--muted-ink); padding: 5px; }
.modal-body { padding: 25px; }
.quote-paper { background: white; border: 1px solid var(--sand); padding: clamp(24px, 5vw, 54px); position: relative; }
.quote-paper::before { content: 'CM'; position: absolute; right: 28px; top: 17px; font: 600 50px var(--app-font-serif); color: rgba(178,13,21,.11); }
.quote-brand { color: var(--crimson); font: 700 11px var(--app-font-sans); letter-spacing: .16em; }
.quote-paper h2 { font: 600 38px var(--app-font-serif); margin: 21px 0 9px; }
.quote-meta { display: flex; justify-content: space-between; gap: 30px; color: var(--muted-ink); font-size: 10px; border-bottom: 1px solid var(--sand); padding-bottom: 19px; }
.quote-table { width: 100%; border-collapse: collapse; margin: 23px 0; font-size: 11px; }
.quote-table th { text-align: left; color: var(--muted-ink); text-transform: uppercase; letter-spacing: .1em; font-size: 9px; font-weight: 500; padding-bottom: 9px; }
.quote-table td { border-top: 1px solid var(--sand); padding: 12px 5px 12px 0; }
.quote-table td:last-child, .quote-table th:last-child { text-align: right; padding-right: 0; }
.quote-total { display: flex; justify-content: flex-end; gap: 40px; align-items: end; border-top: 1px solid var(--obsidian); padding-top: 15px; }
.quote-total strong { font: 600 28px var(--app-font-serif); }
.payment-box { margin-top: 28px; background: #f1eee9; padding: 17px; font-size: 10px; color: var(--muted-ink); line-height: 1.7; }
.payment-box strong { color: var(--obsidian); display: block; margin-bottom: 3px; font-size: 11px; }
.quote-actions { display: flex; justify-content: end; gap: 10px; padding-top: 18px; }
.login-modal { width: min(100%, 430px); }
.login-art { height: 120px; background: var(--sage); color: white; padding: 20px 25px; position: relative; overflow: hidden; }
.login-art::after { content: 'CM'; position: absolute; right: 25px; top: -26px; color: rgba(255,255,255,.12); font: 170px var(--app-font-serif); }
.login-art h2 { position: relative; z-index: 1; font: 600 31px var(--app-font-serif); margin: 27px 0 0; }
.login-form { padding: 25px; }
.light-field { margin-bottom: 16px; }
.light-field label { display: block; font-size: 10px; text-transform: uppercase; letter-spacing: .1em; color: var(--muted-ink); margin-bottom: 7px; }
.light-field input { width: 100%; border: 1px solid var(--sand); background: white; padding: 12px; outline: none; font-size: 13px; }
.light-field input:focus { border-color: var(--crimson); }
.login-error { color: var(--crimson); font-size: 11px; margin: -4px 0 13px; }
.login-form .primary-button { width: 100%; justify-content: center; }

.staff-overlay { position: fixed; z-index: 45; inset: 0; background: var(--sage); color: var(--linen); overflow: auto; animation: fade-in .2s ease both; }
.staff-shell { min-height: 100dvh; max-width: 1420px; margin: 0 auto; padding: 23px clamp(20px, 5vw, 70px) 60px; }
.staff-top { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(250,248,245,.2); padding-bottom: 22px; }
.staff-top .brand { color: var(--linen); }
.staff-top .brand-sub { color: #bdc6c0; }
.staff-top-actions { display: flex; gap: 10px; }
.staff-top-actions button { background: transparent; border: 1px solid rgba(250,248,245,.35); color: var(--linen); padding: 9px 12px; font-size: 10px; }
.staff-title { display: flex; justify-content: space-between; align-items: end; gap: 30px; padding: 48px 0 35px; }
.staff-title h1 { margin: 0; font: 600 clamp(38px, 5vw, 66px) var(--app-font-serif); letter-spacing: -.04em; }
.staff-title p { color: #c3cdc7; font-size: 11px; }
.stat-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 38px; }
.stat { padding: 18px; border: 1px solid rgba(250,248,245,.2); background: rgba(26,25,24,.13); }
.stat span { color: #bfcbc4; font-size: 10px; text-transform: uppercase; letter-spacing: .1em; }
.stat strong { display: block; font: 600 32px var(--app-font-serif); margin-top: 12px; }
.staff-panels { display: grid; grid-template-columns: 1.2fr .8fr; gap: 15px; }
.staff-panel { background: var(--linen); color: var(--obsidian); padding: 22px; }
.staff-panel h2 { margin: 0 0 18px; font: 600 23px var(--app-font-serif); }
.panel-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.panel-head button { border: 0; background: var(--crimson); color: white; padding: 8px 11px; font-size: 10px; }
.admin-table { width: 100%; border-collapse: collapse; font-size: 10px; }
.admin-table th { color: var(--muted-ink); text-transform: uppercase; letter-spacing: .08em; font-size: 8px; text-align: left; padding-bottom: 8px; }
.admin-table td { border-top: 1px solid var(--sand); padding: 12px 4px 12px 0; vertical-align: middle; }
.admin-table td:last-child { text-align: right; }
.admin-table input, .admin-table select { background: transparent; border: 1px solid var(--sand); padding: 5px; font-size: 10px; max-width: 90px; }
.table-action { border: 0; background: transparent; color: var(--crimson); font-size: 10px; padding: 5px; }
.status-chip { display: inline-block; padding: 5px 7px; background: #e5ebe7; color: var(--sage); font-size: 8px; line-height: 1.2; max-width: 115px; }
.waybill-box { background: #f1eee9; padding: 14px; margin-top: 25px; }
.waybill-box label { display: block; color: var(--muted-ink); font-size: 9px; text-transform: uppercase; letter-spacing: .1em; margin-bottom: 7px; }
.waybill-form { display: flex; gap: 5px; }
.waybill-form input { min-width: 0; flex: 1; border: 1px solid var(--sand); padding: 9px; background: white; font-size: 10px; }
.waybill-form button { border: 0; background: var(--obsidian); color: white; padding: 0 12px; font-size: 10px; }
.waybill-log { margin-top: 13px; color: var(--muted-ink); font-size: 10px; }
.empty-state { color: var(--muted-ink); padding: 22px 0; font-size: 11px; }

.reveal { animation: rise-in .65s both; }
.delay-1 { animation-delay: .1s; } .delay-2 { animation-delay: .2s; } .delay-3 { animation-delay: .3s; }
@keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes rise-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
@media (max-width: 860px) {
  .nav-links { display: none; position: absolute; top: 83px; left: 0; right: 0; background: var(--linen); border-bottom: 1px solid var(--sand); padding: 14px 20px 20px; flex-direction: column; align-items: flex-start; }
  .nav-links.open { display: flex; }
  .nav-links button.active::after { bottom: 2px; }
  .mobile-nav-toggle { display: inline-flex; }
  .hero, .estimator-grid, .process-grid { grid-template-columns: 1fr; }
  .hero { padding-top: 70px; }
  .hero-visual { height: 480px; width: min(100%, 560px); margin: 0 auto; }
  .process-grid { gap: 35px; }
  .staff-panels { grid-template-columns: 1fr; }
}
@media (max-width: 620px) {
  .topline { font-size: 8px; }
  .nav { height: 70px; padding: 0 16px; }
  .brand-name { font-size: 10px; }
  .brand-sub { font-size: 8px; }
  .nav-actions .text-button { display: none; }
  .hero { padding: 54px 20px 65px; }
  .hero h1 { font-size: 52px; }
  .hero-visual { min-height: 320px; height: 90vw; }
  .window-card { width: 155px; padding: 13px; }
  .window-card strong { font-size: 17px; }
  .section { padding: 63px 20px; }
  .section-heading { display: block; }
  .section-heading p { margin-top: 15px; }
  .catalog-grid { display: block; }
  .product-card { margin-bottom: 15px; }
  .product-art { height: 245px; }
  .form-row { grid-template-columns: 1fr; }
  .tracking-content, .footer-main, .footer-bottom { display: block; }
  .tracking-form { margin-top: 28px; min-width: 0; }
  .footer-contact { text-align: left; margin-top: 25px; }
  .footer-bottom span { display: block; margin-top: 8px; }
  .modal-body, .modal-head { padding: 18px; }
  .quote-paper { padding: 20px 15px; }
  .quote-meta { display: block; line-height: 1.8; }
  .quote-total { gap: 15px; }
  .quote-total strong { font-size: 22px; }
  .stat-grid { grid-template-columns: repeat(2, 1fr); }
  .stat strong { font-size: 25px; }
  .staff-title { display: block; }
  .staff-title p { margin-top: 10px; }
  .staff-panel { padding: 15px; overflow-x: auto; }
  .admin-table { min-width: 560px; }
}
@media print {
  body * { visibility: hidden; }
  .quote-paper, .quote-paper * { visibility: visible; }
  .quote-paper { position: absolute; inset: 0; box-shadow: none; border: 0; }
}

--- FILE: .\src\main.tsx ---
import { createRoot } from 'react-dom/client';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

import './index.css';

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);


--- FILE: .\src\components\error-boundary.tsx ---
import {
  Component,
  type ComponentType,
  type ErrorInfo,
  type ReactNode,
} from 'react';

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  FallbackComponent?: ComponentType<ErrorFallbackProps>;
  /** Changing this clears a caught error. Pass the route to recover on navigation. */
  resetKey?: unknown;
}

interface ErrorBoundaryState {
  error: Error | null;
}

function toError(value: unknown): Error {
  if (value instanceof Error) {
    return value;
  }
  if (typeof value === 'string') {
    return new Error(value);
  }
  try {
    return new Error(JSON.stringify(value));
  } catch {
    return new Error(String(value));
  }
}

function DefaultFallback({ error, resetError }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-6">
      <div className="max-w-lg w-full text-center">
        <h1 className="text-xl font-semibold text-gray-900">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          This part of the app hit an error. The rest of the app is still
          running.
        </p>
        {/* Dev only: messages can carry API responses and other internals. */}
        {import.meta.env.DEV ? (
          <pre className="mt-4 overflow-x-auto rounded bg-gray-100 p-3 text-left text-xs text-gray-800">
            {error.message || String(error)}
          </pre>
        ) : null}
        <button
          type="button"
          onClick={resetError}
          className="mt-4 rounded bg-gray-900 px-4 py-2 text-sm text-white hover:bg-gray-700"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return { error: toError(error) };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    console.error(
      'ErrorBoundary caught an error:',
      toError(error),
      info.componentStack,
    );
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps): void {
    if (
      this.state.error !== null &&
      prevProps.resetKey !== this.props.resetKey
    ) {
      this.resetError();
    }
  }

  resetError = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (error === null) {
      return this.props.children;
    }
    const Fallback = this.props.FallbackComponent ?? DefaultFallback;
    return <Fallback error={error} resetError={this.resetError} />;
  }
}


--- FILE: .\src\lib\mockData.ts ---
export type ProductCategory = 'Blinds' | 'Custom Curtains' | 'Carpets' | 'Wallpapers';

export type Product = {
  id: string;
  name: string;
  category: ProductCategory;
  supplier: string;
  rate: number;
  description: string;
  art: string;
  tag: string;
};

export type FulfillmentOrder = {
  id: string;
  client: string;
  product: string;
  amount: number;
  status: string;
  waybill: string;
  date: string;
};

export const products: Product[] = [
  { id: 'linen-roller', name: 'Linen Roller', category: 'Blinds', supplier: 'Davao Warehouse', rate: 145, description: 'Soft-filtering weave for calm, measured light.', art: 'art-blind', tag: 'Light-filtering' },
  { id: 'sheer-veil', name: 'Sheer Veil', category: 'Custom Curtains', supplier: 'Imported Korea', rate: 185, description: 'A fine translucent layer with a quiet drape.', art: 'art-curtain', tag: 'Best seller' },
  { id: 'wool-loop', name: 'Wool Loop 04', category: 'Carpets', supplier: 'Homedex / Manila', rate: 220, description: 'Dense loop pile with natural tonal movement.', art: 'art-carpet', tag: 'Contract grade' },
  { id: 'terracotta-grid', name: 'Terracotta Grid', category: 'Wallpapers', supplier: 'Imported Korea', rate: 98, description: 'Architectural rhythm in a warm mineral palette.', art: 'art-wallpaper', tag: 'New arrival' },
  { id: 'wood-venetian', name: 'Wood Venetian', category: 'Blinds', supplier: 'Davao Warehouse', rate: 275, description: 'Precision slats with an honest timber grain.', art: 'art-blind', tag: 'Made to measure' },
  { id: 'dune-blackout', name: 'Dune Blackout', category: 'Custom Curtains', supplier: 'Homedex / Manila', rate: 235, description: 'Fuller hand, deeper rest, and a clean fall.', art: 'art-curtain', tag: 'Blackout' },
];

export const orderStatuses = ['Pending Sourcing', 'Sourced from Davao Warehouse', 'Sourced from Homedex / Manila', 'In Transit', 'Ready for Installation', 'Fulfilled'];

export const initialOrders: FulfillmentOrder[] = [
  { id: 'CM-24071', client: 'Mara Villanueva', product: 'Sheer Veil · 3 panels', amount: 26780, status: 'Ready for Installation', waybill: 'LBC-DVO-88214', date: '18 Jun 2024' },
  { id: 'CM-24068', client: 'Northpoint Studio', product: 'Wool Loop 04 · 420 sq ft', amount: 92400, status: 'In Transit', waybill: 'JRS-MNL-44120', date: '16 Jun 2024' },
  { id: 'CM-24064', client: 'Eli & Co. Residence', product: 'Linen Roller · 8 windows', amount: 38760, status: 'Sourced from Davao Warehouse', waybill: '—', date: '14 Jun 2024' },
  { id: 'CM-24052', client: 'Santos Residence', product: 'Terracotta Grid · 280 sq ft', amount: 27440, status: 'Fulfilled', waybill: 'LBC-DVO-87188', date: '08 Jun 2024' },
];

--- FILE: .\src\lib\supabaseClient.ts ---
/**
 * Future integration placeholder.
 * Keep the public publishable key here only when Supabase is introduced.
 */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabaseConfig = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  configured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
};

--- FILE: .\src\pages\not-found.tsx ---
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md mx-4">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <h1 className="text-2xl font-bold text-gray-900">
              404 Page Not Found
            </h1>
          </div>

          <p className="mt-4 text-sm text-gray-600">
            Did you forget to add the page to the router?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
