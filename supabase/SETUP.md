# CM Interiors Supabase setup

## 1. Apply the migration

1. Create or open the Supabase project.
2. Open **SQL Editor**.
3. Create a new query.
4. Paste and run:
   `supabase/migrations/20260811000000_cm_interiors.sql`
5. Confirm that `profiles`, `products`, and `orders` exist under
   **Table Editor** and that Realtime is enabled for `products` and `orders`.

The migration enables RLS, creates the auth profile trigger, and adds both
tables to the `supabase_realtime` publication. Do not disable RLS in production.

## 2. Add the frontend client

Install the Supabase client in the GitHub project:

```bash
pnpm add @supabase/supabase-js
```

Replace `src/lib/supabaseClient.ts` with the file included in this handoff and
define these public Vite variables in the GitHub/hosting environment:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

The anon key is intended for browser use. Never put the Supabase service-role
key in frontend code or a `VITE_` variable.

## 3. Configure authentication

### Email and password

In **Authentication → Providers**, enable Email. Choose whether email
confirmation is required for new accounts.

The frontend calls:

```ts
await supabase.auth.signUp({ email, password });
await supabase.auth.signInWithPassword({ email, password });
```

### Google OAuth

1. In Google Cloud Console, create an OAuth 2.0 Web Client ID.
2. In Supabase, open **Authentication → Providers → Google**.
3. Enable Google and paste the Google Client ID and Client Secret there.
4. Copy Supabase’s displayed callback URL into Google Cloud Console under
   **Authorized redirect URIs**. It normally has this form:

   `https://<project-ref>.supabase.co/auth/v1/callback`

5. In **Authentication → URL Configuration**, add the production site URL to
   **Redirect URLs**. Add the local development URL as well if needed, such as:

   `http://localhost:5173/**`

6. Start Google login from the browser:

```ts
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: window.location.origin },
});
```

The `on_auth_user_created` trigger creates the matching `public.profiles` row
with the default `client` role after either Google or email/password signup.

## 4. Promote the first super admin

After the first user has registered and the profile trigger has run:

1. Open **SQL Editor**.
2. Find the user ID in **Authentication → Users**, or query:

```sql
select id, email, role
from public.profiles
order by created_at;
```

3. Run this as an administrator in the SQL Editor, replacing the email:

```sql
update public.profiles
set role = 'super_admin'
where email = 'owner@example.com';
```

Do not expose this statement in the browser. After promotion, that user can
manage admin roles through a protected admin interface.

## 5. Use Realtime safely

Subscribe only after the user has a valid session and always remove the channel
when the component unmounts:

```ts
const channel = supabase
  .channel('cm-interiors-products-orders')
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'products' },
    (payload) => {
      // Refetch or patch the product catalog from payload.new / payload.old.
      console.info('Product change', payload);
    },
  )
  .on(
    'postgres_changes',
    { event: '*', schema: 'public', table: 'orders' },
    (payload) => {
      // Refetch staff orders or the current user's order status.
      console.info('Order change', payload);
    },
  )
  .subscribe();

return () => {
  void supabase.removeChannel(channel);
};
```

Realtime events are still subject to RLS. The database remains the source of
truth; use a refetch after a change rather than trusting an unvalidated
payload.

## 6. Track guest orders

Do not query `orders` directly from an anonymous client by passing a waybill
filter. PostgreSQL RLS cannot safely inspect an arbitrary client-side filter.
Use the restricted RPC created by the migration:

```ts
const { data, error } = await supabase.rpc('lookup_order_by_waybill', {
  p_waybill_number: reference.trim(),
});
```

The RPC returns tracking fields but omits customer email, phone, and name.
Authenticated users can read their own complete order rows through the normal
RLS-protected `orders` query, while administrators can read all orders.
