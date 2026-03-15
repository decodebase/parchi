import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/types/database";

/**
 * Used by middleware.ts — returns { supabase, response }
 * Fails gracefully if Supabase env vars are missing/fake (demo mode).
 */
export function createMiddlewareClient(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options as any)
          );
        },
      },
    }
  );

  return { supabase, response };
}

/** Legacy export kept for compatibility */
export async function updateSession(request: NextRequest) {
  const { supabase, response: supabaseResponse } = createMiddlewareClient(request);
  const { data: { user } } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  return { supabaseResponse, user, supabase };
}
