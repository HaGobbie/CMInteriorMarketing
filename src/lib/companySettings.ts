import { supabase } from '@/lib/supabaseClient';

// Letterhead details and Terms & Conditions used on every quotation —
// Excel export, print view, and (previously) hardcoded directly into the
// export code. Moved into the database so staff can update the address,
// phone numbers, or terms without needing a code change every time the
// office or policy changes.
//
// Backed by a single-row `company_settings` table. Run this once in the
// Supabase SQL editor to create it:
//
//   create table if not exists public.company_settings (
//     id text primary key default 'default',
//     address text not null default '',
//     tel_no text not null default '',
//     mobile_no text not null default '',
//     email text not null default '',
//     terms text not null default '',
//     updated_at timestamptz not null default now()
//   );
//   insert into public.company_settings (id) values ('default')
//     on conflict (id) do nothing;
//   alter table public.company_settings enable row level security;
//   create policy "Company settings are publicly readable"
//     on public.company_settings for select using (true);
//   create policy "Staff can update company settings"
//     on public.company_settings for update using (auth.uid() is not null);
//   create policy "Staff can insert company settings"
//     on public.company_settings for insert with check (auth.uid() is not null);
//
// --- Two more one-time migrations, also needed on the `orders` table ---
//
// 1) A dedicated column for the customer's social handle. It used to
//    only survive as free text embedded in the `contacts` column, which
//    is what caused contact details to show up as one run-on
//    "Phone: X · Email: Y · Social: Z" string that couldn't be edited
//    field-by-field. Phone and email already have their own columns;
//    this gives social the same treatment:
//
//   alter table public.orders add column if not exists social_handle text;
//
// 2) A `deleted_at` column for the recycle bin (soft delete). Deleting an
//    inquiry or order now just sets this instead of removing the row, so
//    it can be restored; a row is only actually deleted (and its photos
//    cleaned up) when purged from the recycle bin, either by staff or
//    automatically once it's older than 30 days:
//
//   alter table public.orders add column if not exists deleted_at timestamptz;
//
//    The 30-day purge currently runs client-side, whenever a staff member
//    opens the Recycle Bin panel (see loadRecycleBin in
//    staff-dashboard.tsx) — no extra setup needed. If you'd rather this
//    happen on a schedule even when nobody opens that panel, Supabase
//    supports scheduled Postgres jobs via the pg_cron extension:
//
//   create extension if not exists pg_cron;
//   select cron.schedule(
//     'purge-old-recycle-bin-orders',
//     '0 3 * * *', -- daily at 03:00
//     $$ delete from public.orders
//        where deleted_at is not null
//          and deleted_at < now() - interval '30 days' $$
//   );
//
//    Note this SQL-only purge does NOT clean up GitHub photos — that part
//    of the cleanup is done from the app (via the upload-inquiry-photo
//    Edge Function's delete action), so if you rely purely on pg_cron for
//    the row deletion, orphaned photos can accumulate in the repo. The
//    client-side purge on panel-open handles both together, which is why
//    it's the default.

export type CompanySettings = {
  address: string;
  telNo: string;
  mobileNo: string;
  email: string;
  // One paragraph/clause per entry — kept as a list so the print/Excel
  // views can number them consistently no matter how many there are.
  terms: string[];
};

export const defaultCompanySettings: CompanySettings = {
  address: 'Door 48 J.B. Olaguer Bldg., J.P. Laurel Highway, Matina, Davao City',
  telNo: '(082) 327 3526',
  mobileNo: '0908 519 6608',
  email: 'cminteriorsmarketing@gmail.com',
  terms: [
    '60% DOWNPAYMENT upon order of materials and fabrication. Remaining balance to be settled upon delivery and/or installation.',
    'Transportation/delivery charges and meal expenses of the installers for installation in areas beyond city proper are to be shouldered by the client.',
    'Price is subject to change without prior notice.',
  ],
};

const parseTerms = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.filter((entry): entry is string => typeof entry === 'string' && entry.trim() !== '');
  }
  if (typeof value === 'string' && value.trim()) {
    // Stored as newline-separated text in the `terms` column.
    return value.split('\n').map((line) => line.trim()).filter(Boolean);
  }
  return defaultCompanySettings.terms;
};

// Reads the shared settings row. Falls back to the hardcoded defaults
// (matching what used to be baked into the export code) if the table
// doesn't exist yet or the row hasn't been created — so nothing breaks
// for staff who haven't run the migration yet.
export async function fetchCompanySettings(): Promise<CompanySettings> {
  try {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .eq('id', 'default')
      .maybeSingle();

    if (error || !data) return defaultCompanySettings;

    const row = data as Record<string, unknown>;
    return {
      address: typeof row.address === 'string' && row.address ? row.address : defaultCompanySettings.address,
      telNo: typeof row.tel_no === 'string' && row.tel_no ? row.tel_no : defaultCompanySettings.telNo,
      mobileNo: typeof row.mobile_no === 'string' && row.mobile_no ? row.mobile_no : defaultCompanySettings.mobileNo,
      email: typeof row.email === 'string' && row.email ? row.email : defaultCompanySettings.email,
      terms: parseTerms(row.terms),
    };
  } catch {
    return defaultCompanySettings;
  }
}

export async function saveCompanySettings(
  settings: CompanySettings,
): Promise<{ error?: string }> {
  const { error } = await supabase.from('company_settings').upsert({
    id: 'default',
    address: settings.address.trim(),
    tel_no: settings.telNo.trim(),
    mobile_no: settings.mobileNo.trim(),
    email: settings.email.trim(),
    terms: settings.terms.map((term) => term.trim()).filter(Boolean).join('\n'),
    updated_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };
  return {};
}
