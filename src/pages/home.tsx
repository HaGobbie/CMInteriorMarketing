import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react';
import {
  ArrowRight,
  CheckCircle2,
  HeartHandshake,
  Menu,
  PackageSearch,
  Plus,
  Search,
  Send,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import {
  initialOrders,
  products as seedProducts,
  type FulfillmentOrder,
  type InquiryCategory,
  type Product,
  type ProductCategory,
} from '@/lib/mockData';
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

const inquiryCategories: InquiryCategory[] = [
  'Blinds',
  'Custom Curtains',
  'Carpets',
  'Wallpapers',
  'Other',
];

const portfolioShowcases = [
  {
    category: 'Blinds' as ProductCategory,
    number: '01',
    title: 'Light, held softly.',
    copy: 'Measured window treatments that let the day arrive with intention.',
    detail: 'Quiet control · tailored openings',
    background:
      'linear-gradient(135deg, #c9b9a0 0%, #e4d8c8 42%, #877b6b 43%, #b6a58e 100%)',
    accent: '#8d2d30',
  },
  {
    category: 'Custom Curtains' as ProductCategory,
    number: '02',
    title: 'A room in a slower rhythm.',
    copy: 'Layered sheers and generous drape for spaces that feel composed, never staged.',
    detail: 'Soft layers · made to measure',
    background:
      'linear-gradient(115deg, #ece4d9 0 18%, #bdaaa2 18% 33%, #f4efe9 33% 55%, #a77d78 55% 70%, #ded1c4 70%)',
    accent: '#9b605d',
  },
  {
    category: 'Carpets' as ProductCategory,
    number: '03',
    title: 'Grounded in texture.',
    copy: 'Tactile flooring that gives a project a warmer, quieter foundation.',
    detail: 'Contract texture · tonal depth',
    background:
      'radial-gradient(circle at 25% 25%, #ccbca6 0 8%, transparent 9%), radial-gradient(circle at 80% 72%, #a89177 0 12%, transparent 13%), linear-gradient(145deg, #796652, #b9a68f 52%, #665443)',
    accent: '#74614f',
  },
  {
    category: 'Wallpapers' as ProductCategory,
    number: '04',
    title: 'Pattern with a point of view.',
    copy: 'Architectural surfaces that add character without taking over the room.',
    detail: 'Mineral palettes · considered rhythm',
    background:
      'linear-gradient(120deg, transparent 0 47%, rgba(250,245,237,.6) 48% 50%, transparent 51%), repeating-linear-gradient(35deg, #8b7466 0 18px, #a98f7c 18px 36px, #715c50 36px 54px)',
    accent: '#7f5c4e',
  },
];

type InquiryItem = {
  id: string;
  category: InquiryCategory;
  particulars: string;
  customNotes: string;
};

type ContactDetails = {
  name: string;
  phone: string;
  email: string;
  socialHandle: string;
};

const asText = (value: unknown, fallback = '') =>
  typeof value === 'string' && value.trim() ? value : fallback;

const asNumber = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

const newInquiryItem = (): InquiryItem => ({
  id: `inquiry-item-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  category: 'Blinds',
  particulars: '',
  customNotes: '',
});

const asItems = (value: unknown): FulfillmentOrder['items'] => {
  const normalizeItems = (items: unknown[]) =>
    items
      .filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === 'object',
      )
      .map((item, index) => ({
        id: asText(item.id, `item-${index + 1}`),
        category: asText(item.category, 'Other') as InquiryCategory,
        productId: asText(item.productId),
        material: asText(item.material),
        area: asText(item.area ?? item.particulars),
        customNotes: asText(item.customNotes ?? item.notes),
        supplier: asText(item.supplier),
        quantity: asNumber(item.quantity, 1),
        height: asNumber(item.height),
        width: asNumber(item.width),
        unitPrice: asNumber(item.unitPrice),
        amount: asNumber(item.amount),
        ...(asText(item.waybillNumber)
          ? { waybillNumber: asText(item.waybillNumber) }
          : {}),
      }));

  if (Array.isArray(value)) return normalizeItems(value);
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? normalizeItems(parsed) : [];
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
    art: asText(row.image_url ?? row.art, 'art-blind'),
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
    quote_requested: 'Quote Requested',
    pending: 'Quote Requested',
    pending_sourcing: 'Pending Sourcing',
    draft_quote: 'Draft Quote',
    confirmed_order: 'Confirmed Order',
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
  const status = orderStatusLabel(row.status) || 'Quote Requested';
  const grandTotal = asNumber(
    row.grand_total ?? row.estimated_total ?? row.amount,
  );

  return {
    id,
    client,
    product: asText(
      row.product,
      firstItem?.material || asText(row.for_description, 'Custom inquiry'),
    ),
    amount: grandTotal,
    status,
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
    customerPhone: asText(row.customer_phone),
    customerEmail: asText(row.customer_email),
    socialHandle: asText(
      row.social_handle ?? row.socialHandle ?? row.customer_social,
    ),
    source: row.source === 'custom_inquiry' ? 'custom_inquiry' : 'quotation',
    isDraft: Boolean(row.is_draft) || status === 'Draft Quote',
    createdAt: asText(row.created_at),
  };
};

const inputStyle = {
  width: '100%',
  border: '1px solid var(--sand)',
  background: 'white',
  color: 'var(--obsidian)',
  padding: '10px 11px',
  fontSize: 12,
};

export default function Home() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [filter, setFilter] = useState<'All' | ProductCategory>('All');
  const [products, setProducts] = useState<Product[]>(seedProducts);
  const [orders, setOrders] = useState<FulfillmentOrder[]>(initialOrders);
  const [basketOpen, setBasketOpen] = useState(false);
  const [inquiryItems, setInquiryItems] = useState<InquiryItem[]>([
    newInquiryItem(),
  ]);
  const [contact, setContact] = useState<ContactDetails>({
    name: '',
    phone: '',
    email: '',
    socialHandle: '',
  });
  const [inquiryError, setInquiryError] = useState('');
  const [inquirySuccess, setInquirySuccess] = useState('');
  const [inquirySaving, setInquirySaving] = useState(false);
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

  const visibleShowcases = useMemo(
    () =>
      filter === 'All'
        ? portfolioShowcases
        : portfolioShowcases.filter((item) => item.category === filter),
    [filter],
  );

  const scrollTo = (id: string) => {
    setMobileOpen(false);
    document
      .getElementById(id)
      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const updateInquiryItem = (
    id: string,
    patch: Partial<InquiryItem>,
  ) => {
    setInquiryItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const removeInquiryItem = (id: string) => {
    setInquiryItems((current) =>
      current.length === 1
        ? current
        : current.filter((item) => item.id !== id),
    );
  };

  const openBasket = () => {
    setInquiryError('');
    setInquirySuccess('');
    setBasketOpen(true);
  };

  const submitInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInquiryError('');
    setInquirySuccess('');

    if (
      !contact.name.trim() ||
      !contact.phone.trim() ||
      !contact.email.trim()
    ) {
      setInquiryError('Please add your name, phone number, and email.');
      return;
    }
    if (
      inquiryItems.some(
        (item) => !item.particulars.trim() || !item.customNotes.trim(),
      )
    ) {
      setInquiryError(
        'Each inquiry item needs a particulars description and custom notes.',
      );
      return;
    }

    const items: FulfillmentOrder['items'] = inquiryItems.map((item) => ({
      id: item.id,
      category: item.category,
      material: '',
      area: item.particulars.trim(),
      customNotes: item.customNotes.trim(),
      quantity: 1,
      height: 0,
      width: 0,
      unitPrice: 0,
      amount: 0,
    }));
    const contactSummary = [
      `Phone: ${contact.phone.trim()}`,
      `Email: ${contact.email.trim()}`,
      contact.socialHandle.trim()
        ? `Social: ${contact.socialHandle.trim()}`
        : '',
    ]
      .filter(Boolean)
      .join(' · ');

    setInquirySaving(true);
    const { data: savedRow, error } = await supabase
      .from('orders')
      .insert({
        status: 'Quote Requested',
        for_description: 'Custom interior inquiry',
        address: '',
        attn: contact.name.trim(),
        contacts: contactSummary,
        items,
        total_php: 0,
        discount: 0,
        sub_total: 0,
        delivery_mobilization: 0,
        grand_total: 0,
        estimated_total: 0,
        customer_name: contact.name.trim(),
        customer_email: contact.email.trim(),
        courier: '',
        waybill_number: '',
      })
      .select('id')
      .single();

    if (error) {
      setInquiryError(`Could not submit your inquiry: ${error.message}`);
      setInquirySaving(false);
      return;
    }

    const reference = savedRow?.id ? String(savedRow.id) : `CM-INQUIRY-${Date.now()}`;
    const newOrder: FulfillmentOrder = {
      id: reference,
      client: contact.name.trim(),
      product: 'Custom interior inquiry',
      amount: 0,
      status: 'Quote Requested',
      courier: '',
      waybillNumber: '',
      date: new Date().toLocaleDateString('en-GB'),
      forDescription: 'Custom interior inquiry',
      address: '',
      attn: contact.name.trim(),
      contacts: contactSummary,
      items,
      totalPhp: 0,
      discount: 0,
      subTotal: 0,
      deliveryMobilization: 0,
      grandTotal: 0,
      customerPhone: contact.phone.trim(),
      customerEmail: contact.email.trim(),
      socialHandle: contact.socialHandle.trim(),
      source: 'custom_inquiry',
      isDraft: false,
    };
    setOrders((current) => [newOrder, ...current]);
    setInquiryItems([newInquiryItem()]);
    setContact({ name: '', phone: '', email: '', socialHandle: '' });
    setInquirySuccess(
      `Inquiry received. Your reference is ${reference}. We’ll be in touch with the next questions.`,
    );
    setInquirySaving(false);
  };

  return (
    <div className="site-shell">
      <div className="topline">
        A considered source for architectural finishes · Davao City
      </div>
      <header className="nav">
        <button
          className="brand"
          onClick={() => scrollTo('portfolio')}
          aria-label="Return to portfolio"
          data-testid="button-brand-home"
        >
          <img
            src={`${import.meta.env.BASE_URL}assets/logo/CMInteriorLogoTransparentBG.png`}
            alt="CM Interiors Marketing logo"
            style={{ width: 48, height: 48, objectFit: 'contain' }}
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
            onClick={() => scrollTo('portfolio')}
            data-testid="link-portfolio"
          >
            Portfolio
          </button>
          <button onClick={openBasket} data-testid="link-inquiry-basket">
            Start an inquiry
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
            onClick={openBasket}
            data-testid="button-header-inquiry"
          >
            <ShoppingBag size={14} /> Inquiry basket
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
            <div className="eyebrow">Portfolio · custom interiors</div>
            <h1>
              Rooms begin with a <em>feeling.</em>
            </h1>
            <p className="hero-copy">
              We source and shape the quiet details that make an interior feel
              finished. Explore our work, then tell us what your room needs in
              your own words.
            </p>
            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={() => scrollTo('portfolio')}
                data-testid="button-explore-portfolio"
              >
                Explore the portfolio <ArrowRight size={15} />
              </button>
              <button
                className="secondary-button"
                onClick={openBasket}
                data-testid="button-start-inquiry"
              >
                <HeartHandshake size={14} /> Describe your project
              </button>
            </div>
            <div className="hero-note">
              For homeowners, designers, and contractors who care about the
              details that make a space feel finished.
            </div>
          </div>
          <div
            className="hero-visual reveal delay-2"
            aria-label="Interior material composition"
          >
            <div
              className="material-window"
              style={{
                background:
                  'linear-gradient(140deg, #bda997 0 35%, #f0eae1 35% 55%, #725e51 55% 100%)',
              }}
            >
              <div className="window-swatch" />
              <div className="window-card">
                <small>Portfolio study 01</small>
                <strong>Material, in context.</strong>
              </div>
            </div>
            <div className="hero-stamp">
              Sourced
              <br />
              in Davao
            </div>
          </div>
        </section>

        <section className="section section-rule" id="portfolio">
          <div className="section-heading">
            <div>
              <div className="eyebrow">Selected work</div>
              <h2>
                A point of view,
                <br />
                room by room.
              </h2>
            </div>
            <p>
              Curated references for the way a finish changes light, rhythm,
              texture, and the feeling of arriving home.
            </p>
          </div>
          <div
            className="filter-row"
            role="group"
            aria-label="Filter portfolio categories"
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
              {visibleShowcases.length} category studies
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: 16,
            }}
          >
            {visibleShowcases.map((showcase) => (
              <article
                key={showcase.category}
                className="reveal"
                style={{
                  border: '1px solid var(--sand)',
                  background: '#faf8f5',
                }}
              >
                <div
                  style={{
                    minHeight: 270,
                    padding: 16,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    background: showcase.background,
                    color: 'white',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      fontSize: 10,
                      letterSpacing: '.12em',
                      textTransform: 'uppercase',
                    }}
                  >
                    <span>{showcase.category}</span>
                    <span>{showcase.number}</span>
                  </div>
                  <div
                    style={{
                      alignSelf: 'end',
                      width: '72%',
                      border: '1px solid rgba(255,255,255,.55)',
                      padding: '16px 14px',
                      backdropFilter: 'blur(2px)',
                    }}
                  >
                    <small style={{ display: 'block', marginBottom: 8 }}>
                      {showcase.detail}
                    </small>
                    <strong
                      style={{
                        display: 'block',
                        font: '500 23px var(--app-font-serif)',
                        lineHeight: 1.05,
                      }}
                    >
                      {showcase.title}
                    </strong>
                  </div>
                </div>
                <div style={{ padding: '17px 16px 20px' }}>
                  <p
                    style={{
                      margin: 0,
                      color: 'var(--muted-ink)',
                      fontSize: 12,
                      lineHeight: 1.6,
                    }}
                  >
                    {showcase.copy}
                  </p>
                  <button
                    className="text-button"
                    onClick={openBasket}
                    data-testid={`button-inquire-${showcase.category
                      .toLowerCase()
                      .replaceAll(' ', '-')}`}
                    style={{
                      marginTop: 16,
                      color: showcase.accent,
                    }}
                  >
                    Add this feeling to an inquiry <ArrowRight size={13} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="process">
          <div className="process-grid">
            <div>
              <div className="eyebrow">A more useful first step</div>
              <h2>
                Start with the
                <br />
                room, not a SKU.
              </h2>
              <p className="process-copy">
                Tell us what you are trying to solve, what you want to feel,
                and any rough dimensions you already have. We will translate
                the brief into material options and a considered quotation.
              </p>
              <button
                className="primary-button"
                onClick={openBasket}
                data-testid="button-open-inquiry-process"
              >
                Build your inquiry <ArrowRight size={15} />
              </button>
            </div>
            <div className="steps">
              {[
                [
                  '01',
                  'Describe the space',
                  'Add as many areas as you need, from one window to a whole project.',
                ],
                [
                  '02',
                  'Share the feeling',
                  'Mention light control, texture, color, rough measurements, or references.',
                ],
                [
                  '03',
                  'We shape the options',
                  'Our team reviews the brief, checks sources, and prepares a useful next step.',
                ],
                [
                  '04',
                  'Move with clarity',
                  'Your inquiry becomes a draft, then a confirmed order when everything feels right.',
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
                Your project, in view
              </div>
              <h2>Know what’s next.</h2>
              <p>
                Enter the reference from your inquiry or quotation to see the
                latest sourcing and fulfillment note.
              </p>
            </div>
            <div>
              <button
                className="secondary-button"
                style={{ color: 'white', borderColor: 'white' }}
                onClick={() => setTrackOpen(true)}
                data-testid="button-track-shipment"
              >
                Track a project <Search size={14} />
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

      <button
        type="button"
        onClick={openBasket}
        aria-label={`Open inquiry basket with ${inquiryItems.length} item rows`}
        data-testid="button-floating-inquiry-basket"
        style={{
          position: 'fixed',
          right: 22,
          bottom: 22,
          zIndex: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 9,
          border: '1px solid var(--crimson)',
          background: 'var(--crimson)',
          color: 'white',
          padding: '12px 16px',
          boxShadow: '0 12px 30px rgba(45, 24, 22, .2)',
          cursor: 'pointer',
          fontSize: 11,
          letterSpacing: '.04em',
        }}
      >
        <ShoppingBag size={15} />
        Inquiry basket
        <span
          style={{
            minWidth: 20,
            height: 20,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '50%',
            background: 'white',
            color: 'var(--crimson)',
            fontSize: 10,
            fontWeight: 700,
          }}
        >
          {inquiryItems.length}
        </span>
      </button>

      {basketOpen && (
        <div
          className="overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !inquirySaving) {
              setBasketOpen(false);
            }
          }}
          style={{
            alignItems: 'stretch',
            justifyContent: 'flex-end',
            padding: 0,
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inquiry-basket-title"
            style={{
              width: 'min(100%, 720px)',
              height: '100%',
              maxHeight: '100vh',
              overflowY: 'auto',
              borderRadius: 0,
            }}
          >
            <div className="modal-head">
              <div>
                <div
                  style={{
                    color: 'var(--crimson)',
                    fontSize: 10,
                    letterSpacing: '.12em',
                    textTransform: 'uppercase',
                    fontWeight: 700,
                    marginBottom: 5,
                  }}
                >
                  A custom starting point
                </div>
                <h2 id="inquiry-basket-title">Your inquiry basket</h2>
              </div>
              <button
                className="close-button"
                onClick={() => setBasketOpen(false)}
                disabled={inquirySaving}
                aria-label="Close inquiry basket"
                data-testid="button-close-inquiry-basket"
              >
                <X size={18} />
              </button>
            </div>
            <form className="modal-body" onSubmit={submitInquiry}>
              <p
                style={{
                  margin: '0 0 20px',
                  color: 'var(--muted-ink)',
                  fontSize: 12,
                  lineHeight: 1.6,
                }}
              >
                Add each area or finish you are considering. There is no fixed
                catalog to choose from—your notes become the brief.
              </p>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'end',
                  gap: 12,
                  marginBottom: 10,
                }}
              >
                <div>
                  <div
                    style={{
                      color: 'var(--muted-ink)',
                      fontSize: 10,
                      letterSpacing: '.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    Project items
                  </div>
                  <h3
                    style={{
                      margin: '5px 0 0',
                      font: '600 21px var(--app-font-serif)',
                    }}
                  >
                    What should we look at?
                  </h3>
                </div>
                <span style={{ color: 'var(--muted-ink)', fontSize: 11 }}>
                  {inquiryItems.length} {inquiryItems.length === 1 ? 'area' : 'areas'}
                </span>
              </div>

              <div
                style={{
                  display: 'grid',
                  gap: 14,
                  borderTop: '1px solid var(--sand)',
                }}
              >
                {inquiryItems.map((item, index) => (
                  <div
                    key={item.id}
                    style={{
                      display: 'grid',
                      gap: 9,
                      padding: '15px 0',
                      borderBottom: '1px solid var(--sand)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <strong style={{ fontSize: 12 }}>
                        Area {String(index + 1).padStart(2, '0')}
                      </strong>
                      <button
                        type="button"
                        className="table-action"
                        onClick={() => removeInquiryItem(item.id)}
                        disabled={inquiryItems.length === 1}
                        aria-label={`Remove area ${index + 1}`}
                        data-testid={`button-remove-inquiry-item-${index}`}
                        style={{
                          opacity: inquiryItems.length === 1 ? 0.35 : 1,
                        }}
                      >
                        <Trash2 size={13} /> Remove
                      </button>
                    </div>
                    <label
                      style={{
                        color: 'var(--muted-ink)',
                        fontSize: 10,
                        letterSpacing: '.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Category
                      <select
                        value={item.category}
                        onChange={(event) =>
                          updateInquiryItem(item.id, {
                            category: event.target.value as InquiryCategory,
                          })
                        }
                        style={{ ...inputStyle, marginTop: 6 }}
                        data-testid={`select-inquiry-category-${index}`}
                      >
                        {inquiryCategories.map((category) => (
                          <option key={category} value={category}>
                            {category}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label
                      style={{
                        color: 'var(--muted-ink)',
                        fontSize: 10,
                        letterSpacing: '.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Particulars / area description
                      <input
                        value={item.particulars}
                        onChange={(event) =>
                          updateInquiryItem(item.id, {
                            particulars: event.target.value,
                          })
                        }
                        placeholder="e.g. Living room sliding glass door"
                        style={{ ...inputStyle, marginTop: 6 }}
                        data-testid={`input-inquiry-particulars-${index}`}
                      />
                    </label>
                    <label
                      style={{
                        color: 'var(--muted-ink)',
                        fontSize: 10,
                        letterSpacing: '.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      Custom notes / rough measurements
                      <textarea
                        value={item.customNotes}
                        onChange={(event) =>
                          updateInquiryItem(item.id, {
                            customNotes: event.target.value,
                          })
                        }
                        placeholder="e.g. Looking for blackout fabric, ~3 panels"
                        rows={3}
                        style={{
                          ...inputStyle,
                          marginTop: 6,
                          resize: 'vertical',
                        }}
                        data-testid={`textarea-inquiry-notes-${index}`}
                      />
                    </label>
                  </div>
                ))}
              </div>
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  setInquiryItems((current) => [...current, newInquiryItem()])
                }
                data-testid="button-add-inquiry-item"
                style={{ marginTop: 12 }}
              >
                <Plus size={14} /> Add another area
              </button>

              <div
                style={{
                  marginTop: 28,
                  paddingTop: 16,
                  borderTop: '1px solid var(--obsidian)',
                }}
              >
                <div className="eyebrow">How should we reach you?</div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                    gap: 12,
                    marginTop: 12,
                  }}
                >
                  {[
                    ['name', 'Name', 'Your name'],
                    ['phone', 'Phone number', '+63 917 000 0000'],
                    ['email', 'Email', 'you@example.com'],
                    ['socialHandle', 'Social handle (optional)', '@yourhandle'],
                  ].map(([name, label, placeholder]) => (
                    <label
                      key={name}
                      style={{
                        color: 'var(--muted-ink)',
                        fontSize: 10,
                        letterSpacing: '.08em',
                        textTransform: 'uppercase',
                      }}
                    >
                      {label}
                      <input
                        type={name === 'email' ? 'email' : 'text'}
                        value={contact[name as keyof ContactDetails]}
                        onChange={(event) =>
                          setContact((current) => ({
                            ...current,
                            [name]: event.target.value,
                          }))
                        }
                        placeholder={placeholder}
                        required={name === 'name' || name === 'phone' || name === 'email'}
                        style={{ ...inputStyle, marginTop: 6 }}
                        data-testid={`input-inquiry-${name}`}
                      />
                    </label>
                  ))}
                </div>
              </div>

              {inquiryError && (
                <div
                  role="alert"
                  style={{
                    color: 'var(--crimson)',
                    background: '#fbeceb',
                    padding: '10px 12px',
                    marginTop: 18,
                    fontSize: 11,
                  }}
                >
                  {inquiryError}
                </div>
              )}
              {inquirySuccess && (
                <div
                  role="status"
                  style={{
                    display: 'flex',
                    alignItems: 'start',
                    gap: 8,
                    color: 'var(--sage)',
                    background: '#e5ebe7',
                    padding: '10px 12px',
                    marginTop: 18,
                    fontSize: 11,
                    lineHeight: 1.5,
                  }}
                >
                  <CheckCircle2 size={14} style={{ flexShrink: 0 }} />
                  {inquirySuccess}
                </div>
              )}
              <div className="quote-actions" style={{ marginTop: 22 }}>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setBasketOpen(false)}
                  disabled={inquirySaving}
                >
                  Keep browsing
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={inquirySaving || Boolean(inquirySuccess)}
                  data-testid="button-submit-inquiry"
                >
                  {inquirySaving ? (
                    'Sending…'
                  ) : (
                    <>
                      <Send size={14} /> Send inquiry
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {trackOpen && (
        <TrackModal orders={orders} onClose={() => setTrackOpen(false)} />
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