import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/types/database";

// Singleton — one client instance for the entire browser session.
// Creating a new instance on every call breaks onAuthStateChange
// because the new instance has no awareness of the existing session
// until it makes a network round-trip, causing infinite loading on reload.
let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

export function createClient() {
  if (!client) {
    client = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return client;
}
