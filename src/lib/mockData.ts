export type ProductCategory =
  | 'Blinds'
  | 'Custom Curtains'
  | 'Carpets'
  | 'Wallpapers';

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

export type QuotationLineItem = {
  id: string;
  material: string;
  area: string;
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
        material: 'Sheer Veil',
        area: 'Curtain panels',
        quantity: 3,
        height: 90,
        width: 48,
        unitPrice: 26780 / 3,
        amount: 26780,
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
        material: 'Wool Loop 04',
        area: 'Main studio',
        quantity: 420,
        height: 0,
        width: 0,
        unitPrice: 220,
        amount: 92400,
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
        material: 'Linen Roller',
        area: '8 windows',
        quantity: 8,
        height: 90,
        width: 48,
        unitPrice: 4845,
        amount: 38760,
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
        material: 'Terracotta Grid',
        area: 'Living room',
        quantity: 280,
        height: 0,
        width: 0,
        unitPrice: 98,
        amount: 27440,
      },
    ],
    totalPhp: 27440,
    discount: 0,
    subTotal: 27440,
    deliveryMobilization: 0,
    grandTotal: 27440,
  },
];