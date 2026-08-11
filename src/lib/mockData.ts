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