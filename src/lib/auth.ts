import { supabase } from './supabaseClient';

export type StaffRole = 'staff' | 'super_admin';

export type StaffProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: StaffRole;
};

export type StaffMember = StaffProfile & {
  staff_access_id: string | null;
  profile_id: string | null;
};

export const isStaffRole = (role: unknown): role is StaffRole =>
  role === 'staff' || role === 'super_admin';

export const isSuperAdminRole = (role: unknown): role is 'super_admin' =>
  role === 'super_admin';

export async function fetchStaffProfile(userId: string): Promise<StaffProfile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  if (!data || !isStaffRole(data.role)) return null;

  return {
    id: data.id,
    email: data.email,
    full_name: data.full_name ?? null,
    role: data.role,
  };
}

/**
 * Triggers Google OAuth Sign-In flow
 */
export async function signInWithGoogle() {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}${import.meta.env.BASE_URL}`,
    },
  });

  if (error) {
    console.error('Error signing in with Google:', error.message);
    throw error;
  }

  return data;
}

/**
 * Email & Password Sign In (for Staff/Admins)
 */
export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Error signing in:', error.message);
    throw error;
  }

  return data;
}

/**
 * Sign Out
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error('Error signing out:', error.message);
    throw error;
  }
}
