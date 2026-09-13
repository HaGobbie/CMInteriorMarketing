export type ProductCategory =
  | 'Blinds'
  | 'Custom Curtains'
  | 'Carpets'
  | 'Wallpapers';

export type InquiryCategory = ProductCategory | 'Other';

// Industry-standard finish/opacity/format options per category. Shown as a
// second selection once a customer or staff member picks a category.
// Source: light-control terminology used by Hunter Douglas, Norman USA,
// Stoneside and Blinds.com (Sheer / Light Filtering / Room Darkening /
// Blackout), and common carpet + wallpaper trade formats.
export const categorySubOptions: Record<InquiryCategory, string[]> = {
  Blinds: ['None', 'Blackout', 'Room Darkening', 'Light Filtering', 'Sheer', 'Other'],
  'Custom Curtains': [
    'None',
    'Blackout',
    'Room Darkening',
    'Light Filtering',
    'Sheer',
    'Double Layer (Sheer + Blackout)',
    'Other',
  ],
  Carpets: ['None', 'Wall-to-Wall', 'Carpet Tiles', 'Area Rug', 'Stair Runner', 'Other'],
  Wallpapers: [
    'None',
    'Vinyl',
    'Non-woven',
    'Textured / Grasscloth',
    'Peel & Stick',
    'Mural / Custom Print',
    'Other',
  ],
  Other: [],
};

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

// One measured opening/location that a single item is being applied to,
// e.g. "Living Room - Small Windows" or "Sliding Door". Mirrors the
// "Qty/Sets" + H/W + amount rows of the printed quotation format.
export type QuotationAreaLine = {
  id: string;
  area: string;
  width: number;
  height: number;
  quantity: number;
  unitPrice: number;
  amount: number;
  waybillNumber?: string;
};

export type QuotationLineItem = {
  id: string;
  category?: InquiryCategory;
  // e.g. Blackout / Wall-to-Wall / Vinyl — see categorySubOptions above.
  subOption?: string;
  // The customer/staff-facing item title, e.g. "Curtains Thick Drapes B.O
  // Only". Kept separate from `material`, which is the staff-verified
  // sourced material assigned during review.
  itemName?: string;
  productId?: string;
  material: string;
  area: string;
  customNotes?: string;
  supplier?: string;
  // Uploaded reference photo URLs (lightweight avif/webp, GitHub-hosted).
  photos?: string[];
  // Multiple named areas/openings this single item applies to. When
  // present this is the source of truth for pricing; the flat
  // quantity/width/height/unitPrice/amount fields below are kept as an
  // aggregate for backward compatibility with older tooling.
  areas?: QuotationAreaLine[];
  quantity: number;
  height: number;
  width: number;
  unitPrice: number;
  amount: number;
  waybillNumber?: string;
};

export type FulfillmentOrder = {
  id: string;
  client: string;
  product: string;
  amount: number;
  status: string;
  courier: string;
  waybillNumber: string;
  date: string;
  forDescription: string;
  address: string;
  attn: string;
  contacts: string;
  items: QuotationLineItem[];
  totalPhp: number;
  discount: number;
  subTotal: number;
  deliveryMobilization: number;
  grandTotal: number;
  customerPhone?: string;
  customerEmail?: string;
  socialHandle?: string;
  source?: 'custom_inquiry' | 'quotation';
  isDraft?: boolean;
  createdAt?: string;
  signatoryName?: string;
  signatoryTitle?: string;
};

// --- Area/item helpers shared by the customer basket and staff dashboard ---

const numberOr = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const newAreaLine = (seed = 0): QuotationAreaLine => ({
  id: `area-${Date.now()}-${seed}-${Math.random().toString(36).slice(2, 7)}`,
  area: '',
  width: 0,
  height: 0,
  quantity: 1,
  unitPrice: 0,
  amount: 0,
});

// Returns the item's areas, synthesizing a single area from the legacy
// flat fields for older records that predate the areas array.
export const areasOf = (item: QuotationLineItem): QuotationAreaLine[] =>
  item.areas && item.areas.length > 0
    ? item.areas
    : [
        {
          id: `${item.id}-area-0`,
          area: item.area || '',
          width: numberOr(item.width),
          height: numberOr(item.height),
          quantity: Math.max(1, numberOr(item.quantity, 1)),
          unitPrice: numberOr(item.unitPrice),
          amount: numberOr(item.amount),
          waybillNumber: item.waybillNumber,
        },
      ];

export const areaAmount = (area: QuotationAreaLine) =>
  Math.max(0, numberOr(area.quantity)) * Math.max(0, numberOr(area.unitPrice));

export const itemTotalAmount = (item: QuotationLineItem) =>
  areasOf(item).reduce((sum, area) => sum + areaAmount(area), 0);

export const itemTotalQuantity = (item: QuotationLineItem) =>
  areasOf(item).reduce((sum, area) => sum + Math.max(0, numberOr(area.quantity)), 0);

// Displayable title for an item: prefer the dedicated itemName field, then
// fall back to the legacy material/area text used before this field existed.
export const itemDisplayName = (item: QuotationLineItem) =>
  item.itemName?.trim() || item.material?.trim() || item.area?.trim() || 'Item';

// --- Shared Supabase row parsing ---
//
// Both the public site (home.tsx) and the staff portal (staff.tsx) read
// rows out of the `orders` table and need to turn them back into
// FulfillmentOrder/QuotationLineItem objects. That used to be two
// separate, hand-written copies of this logic — which is exactly how the
// staff portal ended up silently dropping `areas`, `itemName`,
// `subOption`, and `photos` when this file's item shape grew: home.tsx
// was updated, staff.tsx's private copy wasn't, and nothing caught the
// drift because both compiled fine. Keeping one shared implementation
// here means there is only one place to update when the shape changes.

const parseText = (value: unknown, fallback = '') =>
  typeof value === 'string' && value.trim() ? value : fallback;

const parseNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const parseQuotationAreas = (value: unknown): QuotationAreaLine[] => {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (entry): entry is Record<string, unknown> =>
        Boolean(entry) && typeof entry === 'object',
    )
    .map((entry, index) => ({
      id: parseText(entry.id, `area-${index}`),
      area: parseText(entry.area),
      width: parseNumber(entry.width),
      height: parseNumber(entry.height),
      quantity: parseNumber(entry.quantity, 1),
      unitPrice: parseNumber(entry.unitPrice ?? entry.unit_price),
      amount: parseNumber(entry.amount),
      ...(parseText(entry.waybillNumber ?? entry.waybill_number)
        ? { waybillNumber: parseText(entry.waybillNumber ?? entry.waybill_number) }
        : {}),
    }));
};

export const parseQuotationItems = (value: unknown): QuotationLineItem[] => {
  const normalize = (items: unknown[]) =>
    items
      .filter(
        (item): item is Record<string, unknown> =>
          Boolean(item) && typeof item === 'object',
      )
      .map((item, index) => ({
        id: parseText(item.id, `item-${index + 1}`),
        category: parseText(item.category, 'Other') as InquiryCategory,
        subOption: parseText(item.subOption ?? item.sub_option),
        itemName: parseText(item.itemName ?? item.item_name),
        productId: parseText(item.productId ?? item.product_id),
        material: parseText(item.material, parseText(item.area ?? item.particulars)),
        area: parseText(item.area ?? item.particulars, parseText(item.material)),
        customNotes: parseText(item.customNotes ?? item.custom_notes ?? item.notes),
        supplier: parseText(item.supplier),
        photos: Array.isArray(item.photos)
          ? item.photos.filter((photo): photo is string => typeof photo === 'string')
          : [],
        areas: parseQuotationAreas(item.areas),
        quantity: parseNumber(item.quantity, 1),
        height: parseNumber(item.height),
        width: parseNumber(item.width),
        unitPrice: parseNumber(item.unitPrice ?? item.unit_price),
        amount: parseNumber(item.amount),
        ...(parseText(item.waybillNumber ?? item.waybill_number)
          ? { waybillNumber: parseText(item.waybillNumber ?? item.waybill_number) }
          : {}),
      }));

  if (Array.isArray(value)) return normalize(value);
  if (typeof value !== 'string') return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? normalize(parsed) : [];
  } catch {
    return [];
  }
};

const parseOrderDate = (value: unknown) => {
  const raw = parseText(value);
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const ORDER_STATUS_LABELS: Record<string, string> = {
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

const parseOrderStatus = (value: unknown) => {
  const raw = parseText(value);
  return ORDER_STATUS_LABELS[raw.toLowerCase()] ?? raw;
};

// Turns one raw Supabase `orders` row into a FulfillmentOrder. Used by
// both the public site and the staff portal so they never disagree about
// what a row means.
export const parseFulfillmentOrder = (
  row: Record<string, unknown>,
  index: number,
): FulfillmentOrder => {
  const items = parseQuotationItems(row.items);
  const firstItem = items[0];
  const id = parseText(
    row.id ?? row.quote_id,
    `CM-SUPABASE-${String(index + 1).padStart(3, '0')}`,
  );
  const client = parseText(row.customer_name ?? row.attn, 'Unnamed client');
  const status = parseOrderStatus(row.status) || 'Quote Requested';
  const grandTotal = parseNumber(
    row.grand_total ?? row.estimated_total ?? row.amount,
  );

  return {
    id,
    client,
    product: parseText(
      row.product,
      (firstItem ? itemDisplayName(firstItem) : '') ||
        parseText(row.for_description, 'Custom inquiry'),
    ),
    amount: grandTotal,
    status,
    courier: parseText(row.courier),
    waybillNumber: parseText(row.waybill_number ?? row.waybillNumber ?? row.waybill),
    date: parseOrderDate(row.date ?? row.created_at),
    forDescription: parseText(row.for_description),
    address: parseText(row.address),
    attn: parseText(row.attn ?? row.customer_name, client),
    contacts: parseText(row.contacts),
    items,
    totalPhp: parseNumber(row.total_php ?? row.totalPhp, grandTotal),
    discount: parseNumber(row.discount),
    subTotal: parseNumber(row.sub_total ?? row.subTotal, grandTotal),
    deliveryMobilization: parseNumber(
      row.delivery_mobilization ?? row.deliveryMobilization,
    ),
    grandTotal,
    customerPhone: parseText(row.customer_phone),
    customerEmail: parseText(row.customer_email),
    socialHandle: parseText(row.social_handle ?? row.socialHandle ?? row.customer_social),
    source: row.source === 'custom_inquiry' ? 'custom_inquiry' : 'quotation',
    isDraft: Boolean(row.is_draft) || status === 'Draft Quote',
    createdAt: parseText(row.created_at),
  };
};

export const products: Product[] = [
  {
    id: 'linen-roller',
    name: 'Linen Roller',
    category: 'Blinds',
    supplier: 'Davao Warehouse',
    rate: 145,
    description: 'Soft-filtering weave for calm, measured light.',
    art: 'art-blind',
    tag: 'Light-filtering',
  },
  {
    id: 'sheer-veil',
    name: 'Sheer Veil',
    category: 'Custom Curtains',
    supplier: 'Imported Korea',
    rate: 185,
    description: 'A fine translucent layer with a quiet drape.',
    art: 'art-curtain',
    tag: 'Best seller',
  },
  {
    id: 'wool-loop',
    name: 'Wool Loop 04',
    category: 'Carpets',
    supplier: 'Homedex / Manila',
    rate: 220,
    description: 'Dense loop pile with natural tonal movement.',
    art: 'art-carpet',
    tag: 'Contract grade',
  },
  {
    id: 'terracotta-grid',
    name: 'Terracotta Grid',
    category: 'Wallpapers',
    supplier: 'Imported Korea',
    rate: 98,
    description: 'Architectural rhythm in a warm mineral palette.',
    art: 'art-wallpaper',
    tag: 'New arrival',
  },
  {
    id: 'wood-venetian',
    name: 'Wood Venetian',
    category: 'Blinds',
    supplier: 'Davao Warehouse',
    rate: 275,
    description: 'Precision slats with an honest timber grain.',
    art: 'art-blind',
    tag: 'Made to measure',
  },
  {
    id: 'dune-blackout',
    name: 'Dune Blackout',
    category: 'Custom Curtains',
    supplier: 'Homedex / Manila',
    rate: 235,
    description: 'Fuller hand, deeper rest, and a clean fall.',
    art: 'art-curtain',
    tag: 'Blackout',
  },
];

export const orderStatuses = [
  'Quote Requested',
  'Draft Quote',
  'Confirmed Order',
  'Pending Sourcing',
  'Sourced from Davao Warehouse',
  'Sourced from Homedex / Manila',
  'In Transit',
  'Ready for Installation',
  'Fulfilled',
];

export const initialOrders: FulfillmentOrder[] = [
  {
    id: 'CM-24071',
    client: 'Mara Villanueva',
    product: 'Sheer Veil · 3 panels',
    amount: 26780,
    status: 'Ready for Installation',
    courier: 'LBC',
    waybillNumber: 'LBC-DVO-88214',
    date: '18 Jun 2024',
    forDescription: 'Supply and installation of sheer curtains',
    address: 'Davao City',
    attn: 'Mara Villanueva',
    contacts: '',
    items: [
      {
        id: 'cm-24071-1',
        itemName: 'Sheer Veil',
        category: 'Custom Curtains',
        subOption: 'Sheer',
        material: 'Sheer Veil',
        area: 'Curtain panels',
        quantity: 3,
        height: 90,
        width: 48,
        unitPrice: 26780 / 3,
        amount: 26780,
        areas: [
          {
            id: 'cm-24071-1-area-0',
            area: 'Curtain panels',
            width: 48,
            height: 90,
            quantity: 3,
            unitPrice: 26780 / 3,
            amount: 26780,
          },
        ],
      },
    ],
    totalPhp: 26780,
    discount: 0,
    subTotal: 26780,
    deliveryMobilization: 0,
    grandTotal: 26780,
  },
  {
    id: 'CM-24068',
    client: 'Northpoint Studio',
    product: 'Wool Loop 04 · 420 sq ft',
    amount: 92400,
    status: 'In Transit',
    courier: 'JRS',
    waybillNumber: 'JRS-MNL-44120',
    date: '16 Jun 2024',
    forDescription: 'Supply of contract-grade carpet',
    address: 'Davao City',
    attn: 'Northpoint Studio',
    contacts: '',
    items: [
      {
        id: 'cm-24068-1',
        itemName: 'Wool Loop 04',
        category: 'Carpets',
        subOption: 'Wall-to-Wall',
        material: 'Wool Loop 04',
        area: 'Main studio',
        quantity: 420,
        height: 0,
        width: 0,
        unitPrice: 220,
        amount: 92400,
        areas: [
          {
            id: 'cm-24068-1-area-0',
            area: 'Main studio',
            width: 0,
            height: 0,
            quantity: 420,
            unitPrice: 220,
            amount: 92400,
          },
        ],
      },
    ],
    totalPhp: 92400,
    discount: 0,
    subTotal: 92400,
    deliveryMobilization: 0,
    grandTotal: 92400,
  },
  {
    id: 'CM-24064',
    client: 'Eli & Co. Residence',
    product: 'Linen Roller · 8 windows',
    amount: 38760,
    status: 'Sourced from Davao Warehouse',
    courier: '',
    waybillNumber: '',
    date: '14 Jun 2024',
    forDescription: 'Supply and installation of roller blinds',
    address: 'Davao City',
    attn: 'Eli & Co. Residence',
    contacts: '',
    items: [
      {
        id: 'cm-24064-1',
        itemName: 'Linen Roller',
        category: 'Blinds',
        subOption: 'Light Filtering',
        material: 'Linen Roller',
        area: '8 windows',
        quantity: 8,
        height: 90,
        width: 48,
        unitPrice: 4845,
        amount: 38760,
        areas: [
          {
            id: 'cm-24064-1-area-0',
            area: '8 windows',
            width: 48,
            height: 90,
            quantity: 8,
            unitPrice: 4845,
            amount: 38760,
          },
        ],
      },
    ],
    totalPhp: 38760,
    discount: 0,
    subTotal: 38760,
    deliveryMobilization: 0,
    grandTotal: 38760,
  },
  {
    id: 'CM-24052',
    client: 'Santos Residence',
    product: 'Terracotta Grid · 280 sq ft',
    amount: 27440,
    status: 'Fulfilled',
    courier: 'LBC',
    waybillNumber: 'LBC-DVO-87188',
    date: '08 Jun 2024',
    forDescription: 'Supply of wallpaper',
    address: 'Davao City',
    attn: 'Santos Residence',
    contacts: '',
    items: [
      {
        id: 'cm-24052-1',
        itemName: 'Terracotta Grid',
        category: 'Wallpapers',
        subOption: 'Vinyl',
        material: 'Terracotta Grid',
        area: 'Living room',
        quantity: 280,
        height: 0,
        width: 0,
        unitPrice: 98,
        amount: 27440,
        areas: [
          {
            id: 'cm-24052-1-area-0',
            area: 'Living room',
            width: 0,
            height: 0,
            quantity: 280,
            unitPrice: 98,
            amount: 27440,
          },
        ],
      },
    ],
    totalPhp: 27440,
    discount: 0,
    subTotal: 27440,
    deliveryMobilization: 0,
    grandTotal: 27440,
  },
];
