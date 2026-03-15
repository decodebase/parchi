import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? null;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Determine redirect based on role
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profileRaw } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        const profile = profileRaw as { role: string } | null;

        const role = profile?.role ?? "user";

        // If caller specified a redirect, honour it (unless it's a scanner trying to access dashboard)
        if (next && role !== "scanner") {
          return NextResponse.redirect(`${origin}${next}`);
        }

        // Role-based default redirects
        if (role === "scanner")   return NextResponse.redirect(`${origin}/scan/portal`);
        if (role === "organiser") return NextResponse.redirect(`${origin}/dashboard`);
        if (role === "admin")     return NextResponse.redirect(`${origin}/admin`);
      }

      return NextResponse.redirect(`${origin}${next ?? "/"}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=auth_callback_failed`);
}
