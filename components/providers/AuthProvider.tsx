"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/authStore";
import type { Profile } from "@/lib/types/database";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setSession, setProfile, setLoading, reset } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();

    // Use onAuthStateChange as the ONLY source of truth.
    // It fires INITIAL_SESSION immediately from localStorage — no network call,
    // no hanging. getUser() / getSession() in Promise.all were causing infinite
    // loading because getUser() makes a network round-trip to Supabase auth
    // server, and if that's slow or the call order races with hydration,
    // setLoading(false) never gets called and every page freezes.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);

        if (event === "INITIAL_SESSION") {
          // Fired immediately on mount from localStorage — reliable, no network
          setUser(session?.user ?? null);
          if (session?.user) await loadProfile(session.user.id);
          setLoading(false);
        } else if (event === "SIGNED_IN") {
          setUser(session?.user ?? null);
          if (session?.user) await loadProfile(session.user.id);
          setLoading(false);
        } else if (event === "SIGNED_OUT") {
          reset();
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          setUser(session.user);
        }
      }
    );

    // Safety net: if INITIAL_SESSION never fires within 1.5s, stop loading
    const timeout = setTimeout(() => setLoading(false), 1500);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadProfile(userId: string) {
    try {
      const supabase = createClient();
      const { data } = await Promise.race([
        supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 1500)
        ),
      ]);
      setProfile(data as Profile | null);
    } catch {
      // Supabase unreachable or timed out — continue without profile
    }
  }

  return <>{children}</>;
}
