import { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { supabase } from '@/lib/supabaseClient';
import LoginModal from '@/components/modals/login-modal';
import StaffDashboard from '@/components/staff-dashboard';
import {
  initialOrders,
  type FulfillmentOrder,
  type Product,
  type QuotationLineItem,
} from '@/lib/mockData';

const STAFF_SESSION_KEY = 'cm-interiors.staff-session';

const asText = (value: unknown, fallback = '') =>
  typeof value === 'string' && value.trim() ? value : fallback;

const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const mapProduct = (row: Record<string, unknown>, index: number): Product => ({
  id: asText(row.id, `product-${index + 1}`),
  name: asText(row.name, 'Unnamed material'),
  category: asText(row.category, 'Blinds') as Product['category'],
  supplier: asText(row.supplier ?? row.source, 'Davao Warehouse'),
  rate: asNumber(row.price_per_sqm ?? row.rate),
  description: asText(row.description, 'Catalog material'),
  art: asText(row.image_url ?? row.art),
  tag: asText(row.tag, 'Catalog line'),
});

const mapItems = (value: unknown): QuotationLineItem[] => {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    const row =
      item && typeof item === 'object'
        ? (item as Record<string, unknown>)
        : {};
    return {
      id: asText(row.id, `item-${index + 1}`),
      category: asText(row.category, 'Other') as QuotationLineItem['category'],
      productId: asText(row.productId ?? row.product_id),
      material: asText(row.material),
      area: asText(row.area ?? row.particulars),
      customNotes: asText(row.customNotes ?? row.custom_notes),
      supplier: asText(row.supplier),
      quantity: asNumber(row.quantity, 1),
      height: asNumber(row.height),
      width: asNumber(row.width),
      unitPrice: asNumber(row.unitPrice ?? row.unit_price),
      amount: asNumber(row.amount),
      waybillNumber: asText(row.waybillNumber ?? row.waybill_number),
    };
  });
};

const mapOrder = (row: Record<string, unknown>, index: number): FulfillmentOrder => {
  const items = mapItems(row.items);
  const total = asNumber(row.grand_total ?? row.estimated_total);
  return {
    id: asText(row.id, `order-${index + 1}`),
    client: asText(row.customer_name ?? row.attn, 'Unnamed client'),
    product: asText(row.product ?? row.for_description, 'Custom inquiry'),
    amount: total,
    status: asText(row.status, 'Quote Requested'),
    courier: asText(row.courier),
    waybillNumber: asText(row.waybill_number),
    date: asText(row.created_at),
    forDescription: asText(row.for_description),
    address: asText(row.address),
    attn: asText(row.attn ?? row.customer_name),
    contacts: asText(row.contacts),
    items,
    totalPhp: asNumber(row.total_php, total),
    discount: asNumber(row.discount),
    subTotal: asNumber(row.sub_total, total),
    deliveryMobilization: asNumber(row.delivery_mobilization),
    grandTotal: total,
    customerPhone: asText(row.customer_phone),
    customerEmail: asText(row.customer_email),
    socialHandle: asText(row.social_handle),
    source: row.source === 'custom_inquiry' ? 'custom_inquiry' : 'quotation',
    isDraft: Boolean(row.is_draft),
    createdAt: asText(row.created_at),
  };
};

const persistSession = (session: {
  access_token: string;
  refresh_token: string;
}) => {
  try {
    window.localStorage.setItem(
      STAFF_SESSION_KEY,
      JSON.stringify({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      }),
    );
  } catch {
    // Supabase's own session storage remains the fallback.
  }
};

const clearPersistedSession = () => {
  try {
    window.localStorage.removeItem(STAFF_SESSION_KEY);
  } catch {
    // Ignore unavailable browser storage.
  }
};

const readPersistedSession = () => {
  try {
    const raw = window.localStorage.getItem(STAFF_SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      access_token?: string;
      refresh_token?: string;
    };
    if (!parsed.access_token || !parsed.refresh_token) return null;
    return {
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
    };
  } catch {
    return null;
  }
};

export default function StaffPage() {
  const [, setLocation] = useLocation();
  const [authLoading, setAuthLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<FulfillmentOrder[]>(initialOrders);

  useEffect(() => {
    let mounted = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setAuthenticated(Boolean(session));
      setAuthLoading(false);
      if (session) persistSession(session);
      else clearPersistedSession();
    });

    const restoreAuth = async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      if (currentSession) {
        persistSession(currentSession);
        if (mounted) {
          setAuthenticated(true);
          setAuthLoading(false);
        }
        return;
      }

      const persisted = readPersistedSession();
      if (persisted) {
        const { data, error } = await supabase.auth.setSession(persisted);
        if (!error && data.session) {
          persistSession(data.session);
          if (mounted) {
            setAuthenticated(true);
            setAuthLoading(false);
          }
          return;
        }
        clearPersistedSession();
      }

      if (mounted) {
        setAuthenticated(false);
        setAuthLoading(false);
      }
    };

    void restoreAuth();
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authenticated) return;
    let mounted = true;

    const loadStaffData = async () => {
      const [productsResult, ordersResult] = await Promise.all([
        supabase
          .from('products')
          .select('*')
          .eq('is_archived', false)
          .order('created_at', { ascending: false }),
        supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false }),
      ]);

      if (!mounted) return;
      setProducts(
        !productsResult.error && productsResult.data
          ? productsResult.data.map((row, index) =>
              mapProduct(row as Record<string, unknown>, index),
            )
          : [],
      );
      if (!ordersResult.error && ordersResult.data) {
        setOrders(
          ordersResult.data.map((row, index) =>
            mapOrder(row as Record<string, unknown>, index),
          ),
        );
      }
    };

    void loadStaffData();
    return () => {
      mounted = false;
    };
  }, [authenticated]);

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: 'var(--forest, #263a31)',
          color: 'white',
        }}
      >
        Restoring staff session…
      </div>
    );
  }

  if (!authenticated) {
    return (
      <LoginModal
        onClose={() => setLocation('/')}
        onSuccess={() => setAuthenticated(true)}
      />
    );
  }

  return (
    <StaffDashboard
      products={products}
      setProducts={setProducts}
      orders={orders}
      setOrders={setOrders}
      onClose={() => setLocation('/')}
    />
  );
}