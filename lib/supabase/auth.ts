import { createClient } from "@/lib/supabase/client";

// ──────────────────────────────────────────────
// Sign up
// ──────────────────────────────────────────────
export async function signUp(email: string, password: string, displayName: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
      emailRedirectTo: `${window.location.origin}/auth/callback`,
    },
  });
  if (error) throw error;
  return data;
}

// ──────────────────────────────────────────────
// Sign in
// ──────────────────────────────────────────────
export async function signIn(email: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

// ──────────────────────────────────────────────
// Sign out
// ──────────────────────────────────────────────
export async function signOut() {
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// ──────────────────────────────────────────────
// Forgot password
// ──────────────────────────────────────────────
export async function sendPasswordReset(email: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });
  if (error) throw error;
}

// ──────────────────────────────────────────────
// Update password (after reset)
// ──────────────────────────────────────────────
export async function updatePassword(newPassword: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// ──────────────────────────────────────────────
// Get current session (client-side)
// ──────────────────────────────────────────────
export async function getSession() {
  const supabase = createClient();
  const { data, error } = await supabase.auth.getSession();
  if (error) return null;
  return data.session;
}

// ──────────────────────────────────────────────
// Get current user (client-side)
// ──────────────────────────────────────────────
export async function getCurrentUser() {
  const supabase = createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error) return null;
  return user;
}
