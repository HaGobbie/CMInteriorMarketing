/**
 * Future integration placeholder.
 * Keep the public publishable key here only when Supabase is introduced.
 */
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabaseConfig = {
  url: SUPABASE_URL,
  anonKey: SUPABASE_ANON_KEY,
  configured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
};