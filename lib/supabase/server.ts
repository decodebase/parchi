import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types/database";

// The @supabase/ssr package has a known bug with TypeScript generics where
// .from() returns `never` instead of the correct row type. We cast the client
// to `any` at creation and re-type it with our Database interface so all
// .from(), .select(), .insert(), .update() calls resolve correctly.
type TypedClient = ReturnType<typeof createServerClient<Database>>;

export async function createClient(): Promise<TypedClient> {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as any)
            );
          } catch {
            // Server component — cookie mutation ignored
          }
        },
      },
    }
  ) as unknown as TypedClient;
}

// Service role client — server-side only, NEVER expose to client
export function createServiceClient(): TypedClient {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { cookies: { getAll: () => [], setAll: () => {} } }
  ) as unknown as TypedClient;
}
