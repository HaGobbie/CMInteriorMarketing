import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { supabase } from "@/lib/supabaseClient";
import { fetchStaffProfile, type StaffProfile } from "@/lib/auth";
import LoginModal from "@/components/modals/login-modal";
import StaffDashboard from "@/components/staff-dashboard";
import {
  initialOrders,
  parseFulfillmentOrder,
  type FulfillmentOrder,
  type Product,
} from "@/lib/mockData";

const STAFF_SESSION_KEY = "cm-interiors.staff-session";

const asText = (value: unknown, fallback = "") =>
  typeof value === "string" && value.trim() ? value : fallback;

const asNumber = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const mapProduct = (row: Record<string, unknown>, index: number): Product => ({
  id: asText(row.id, `product-${index + 1}`),
  name: asText(row.name, "Unnamed material"),
  category: asText(row.category, "Blinds") as Product["category"],
  supplier: asText(row.supplier ?? row.source, "Davao Warehouse"),
  rate: asNumber(row.price_per_sqm ?? row.rate),
  description: asText(row.description, "Catalog material"),
  art: asText(row.image_url ?? row.art),
  tag: asText(row.tag, "Catalog line"),
});

// Order rows are parsed by the SAME shared function the public site uses
// (see parseFulfillmentOrder in src/lib/mockData.ts). This file used to
// keep its own private mapItems/mapOrder copies that only understood the
// old flat item shape — they silently dropped `areas`, `itemName`,
// `subOption`, and `photos` from every inquiry read back from Supabase,
// which is why multi-area inquiries collapsed into a single row and
// customer reference photos never showed up in the review modal here.
// Using one shared parser means the two can't drift apart again.

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

function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string,
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      window.setTimeout(
        () => reject(new Error(`${operation} timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
    }),
  ]);
}

export default function StaffPage() {
  const [, setLocation] = useLocation();
  const [authLoading, setAuthLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [staffProfile, setStaffProfile] = useState<StaffProfile | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<FulfillmentOrder[]>(initialOrders);

  useEffect(() => {
    let mounted = true;

    const acceptSessionIfStaff = async (
      session: {
        user: { id: string };
        access_token: string;
        refresh_token: string;
      } | null,
    ) => {
      if (!session) {
        if (mounted) {
          setAuthenticated(false);
          setStaffProfile(null);
          setAuthLoading(false);
        }
        return;
      }

      try {
        const profile = await withTimeout(
          fetchStaffProfile(session.user.id),
          10000,
          "Staff profile lookup",
        );
        if (!mounted) return;

        if (!profile) {
          setAuthenticated(false);
          setStaffProfile(null);
          setAccessDenied(true);
          setAuthLoading(false);
          clearPersistedSession();
          void supabase.auth.signOut();
          return;
        }

        persistSession(session);
        setStaffProfile(profile);
        setAccessDenied(false);
        setAuthenticated(true);
        setAuthLoading(false);
      } catch {
        if (!mounted) return;
        setAuthenticated(false);
        setStaffProfile(null);
        setAuthLoading(false);
        clearPersistedSession();
      }
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      // Supabase holds an internal auth lock while this callback runs.
      // Defer the profile query until the callback has returned, otherwise
      // getSession() can wait on the same lock and never resolve.
      window.setTimeout(() => {
        if (mounted) void acceptSessionIfStaff(session);
      }, 0);
    });

    const restoreAuth = async () => {
      try {
        const {
          data: { session: currentSession },
        } = await withTimeout(
          supabase.auth.getSession(),
          10000,
          "Supabase session restoration",
        );
        if (currentSession) {
          await acceptSessionIfStaff(currentSession);
          return;
        }

        const persisted = readPersistedSession();
        if (persisted) {
          const { data, error } = await withTimeout(
            supabase.auth.setSession(persisted),
            10000,
            "Saved staff session restoration",
          );
          if (!error && data.session) {
            await acceptSessionIfStaff(data.session);
            return;
          }
          clearPersistedSession();
        }
      } catch (error) {
        console.error("Unable to restore the staff session:", error);
        clearPersistedSession();
      }

      if (mounted) {
        setAuthenticated(false);
        setStaffProfile(null);
        setAccessDenied(false);
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
          .from("products")
          .select("*")
          .eq("is_archived", false)
          .order("created_at", { ascending: false }),
        supabase
          .from("orders")
          .select("*")
          .order("created_at", { ascending: false }),
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
            parseFulfillmentOrder(row as Record<string, unknown>, index),
          ),
        );
      }
    };

    void loadStaffData();

    const realtimeChannel = supabase
      .channel("staff-dashboard-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => {
          void loadStaffData();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          void loadStaffData();
        },
      )
      .subscribe();

    return () => {
      mounted = false;
      void supabase.removeChannel(realtimeChannel);
    };
  }, [authenticated]);

  if (authLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "var(--forest, #263a31)",
          color: "white",
        }}
      >
        Restoring staff session…
      </div>
    );
  }

  if (accessDenied) {
    return (
      <div className="overlay">
        <div
          className="modal login-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="staff-access-denied-title"
        >
          <div className="login-art">
            <h2 id="staff-access-denied-title">Staff access required</h2>
          </div>
          <div style={{ padding: "24px" }}>
            <p
              style={{
                margin: "0 0 18px",
                color: "var(--muted-ink)",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              This account is not registered as staff, so it cannot enter the
              staff portal. Ask a super admin to add your email before trying
              again.
            </p>
            <button
              className="primary-button"
              type="button"
              onClick={() => {
                setAccessDenied(false);
                setLocation("/");
              }}
              data-testid="button-close-staff-access-denied"
            >
              Return to site
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <LoginModal
        onClose={() => setLocation("/")}
        onSuccess={() => undefined}
      />
    );
  }

  return (
    <StaffDashboard
      products={products}
      setProducts={setProducts}
      orders={orders}
      setOrders={setOrders}
      staffProfile={staffProfile!}
      onClose={() => setLocation("/")}
    />
  );
}
