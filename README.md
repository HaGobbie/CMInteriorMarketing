# CM Interiors Marketing — GitHub refactor

This change set modularizes the existing CM Interiors site without changing its
CSS, product data, behavior, Wouter routes, or existing `data-testid` values.

## Replace

Replace these files in the GitHub project:

- `src/App.tsx`
- `index.html`
- `vite.config.ts`

## Add

Add these files:

- `src/components/product-card.tsx`
- `src/components/estimator.tsx`
- `src/components/modals/quote-modal.tsx`
- `src/components/modals/track-modal.tsx`
- `src/components/modals/login-modal.tsx`
- `src/components/staff-dashboard.tsx`
- `src/pages/home.tsx`
- `src/lib/supabaseClient.ts`

Add the Supabase migration and setup guide:

- `supabase/migrations/20260811000000_cm_interiors.sql`
- `supabase/SETUP.md`

## Delete

Nothing needs to be deleted.

## Notes

- Keep the existing `src/index.css` exactly as-is.
- Keep the existing `src/lib/mockData.ts`, `src/main.tsx`, UI components, and
  `src/pages/not-found.tsx`. The existing placeholder
  `src/lib/supabaseClient.ts` should be replaced with the included Supabase
  client file.
- The new login button is
  `data-testid="button-autofill-demo-credentials"`.
- The demo login still uses:
  - Email: `staff@cminteriors.ph`
  - Password: `showroom2024`
- Orders are now shared between the staff desk and order-tracking modal.
- Archiving a product removes it from both the staff desk and public catalog.
- Estimator measurement inputs can be cleared while typing.
- Quote and staff-desk dates are generated from the current date.
- The SQL migration adds Supabase Auth profile creation, RBAC/RLS, Realtime,
  and a restricted guest waybill lookup RPC. Follow `supabase/SETUP.md`.

## Apply and push

1. Copy the files from this folder into the matching paths in the GitHub
   repository.
2. Do not overwrite `src/index.css`.
3. Install dependencies with the repository's existing package manager.
4. Run the existing typecheck/build commands.
5. Commit and push:

```bash
git add src/App.tsx src/lib/supabaseClient.ts \
  src/components/product-card.tsx \
  src/components/estimator.tsx src/components/modals \
  src/components/staff-dashboard.tsx src/pages/home.tsx supabase \
  index.html vite.config.ts
git commit -m "Add CM Interiors Supabase schema and integration setup"
git push
```
