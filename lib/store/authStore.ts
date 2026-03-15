import { create } from "zustand";
import type { User, Session } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types/database";

interface AuthState {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;

  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,

  setUser: (user) => set({ user }),
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (loading) => set({ loading }),

  reset: () =>
    set({
      user: null,
      session: null,
      profile: null,
      loading: false,
    }),
}));

// Convenience selectors
export const useUser = () => useAuthStore((s) => s.user);
export const useProfile = () => useAuthStore((s) => s.profile);
export const useIsLoggedIn = () => useAuthStore((s) => !!s.user);
export const useIsOrganiser = () =>
  useAuthStore((s) => s.profile?.role === "organiser" || s.profile?.role === "admin");
export const useIsAdmin = () => useAuthStore((s) => s.profile?.role === "admin");
export const useIsScanner = () =>
  useAuthStore((s) => s.profile?.role === "scanner" || s.profile?.role === "admin");
export const useAuthLoading = () => useAuthStore((s) => s.loading);
