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