"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/authStore";
import type { Profile } from "@/lib/types/database";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setSession, setProfile, setLoading, reset } = useAuthStore();

  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);

        if (event === "INITIAL_SESSION" || event === "SIGNED_IN") {
          setUser(session?.user ?? null);
          // Set loading false IMMEDIATELY — don't wait for profile network call.
          // Profile loads in background and updates the store when ready.
          // Pages that need role use the self-healing useEffect pattern.
          setLoading(false);
          if (session?.user) loadProfile(session.user.id);
        } else if (event === "SIGNED_OUT") {
          reset();
        } else if (event === "TOKEN_REFRESHED" && session?.user) {
          setUser(session.user);
        }
      }
    );

    // Safety net in case INITIAL_SESSION never fires
    const timeout = setTimeout(() => setLoading(false), 800);

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadProfile(userId: string) {
    const supabase = createClient();
    // Fire and forget — no await, no blocking, just update store when done
    Promise.resolve(
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle()
    ).then(({ data }) => { if (data) setProfile(data as Profile); })
     .catch(() => {});
  }

  return <>{children}</>;
}
