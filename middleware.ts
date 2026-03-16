import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@/lib/supabase/middleware-client";

// Routes that require authentication
const PROTECTED_ROUTES = [
  "/my-parchi",
  "/profile",
  "/dashboard",
  "/scan",
  "/admin",
];

// Routes only accessible when NOT logged in
const AUTH_ROUTES = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
];

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // ── Demo / unreachable Supabase guard ───────────────────────────────
  // If env vars are fake or Supabase is unreachable, skip all auth checks
  // so the UI can be reviewed without a real backend.
  let session = null;
  let role: string = "user";

  try {
    const { supabase, response } = createMiddlewareClient(request);

    const sessionResult = await Promise.race([
      supabase.auth.getSession(),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 3000)
      ),
    ]).catch(() => null);

    if (!sessionResult) {
      // Supabase unreachable — block protected routes, allow public ones
      const isProtectedPath = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
      if (isProtectedPath) {
        const loginUrl = new URL("/auth/login", request.url);
        loginUrl.searchParams.set("next", pathname);
        return NextResponse.redirect(loginUrl);
      }
      return NextResponse.next();
    }

    session = (sessionResult as any)?.data?.session ?? null;

    // ── Redirect logged-in users away from auth pages ─────────────────
    if (AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
      if (session) {
        const { data: profileRaw } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", session.user.id)
          .single();
        const profile = profileRaw as { role: string } | null;

        role = profile?.role ?? "user";

        if (role === "scanner") {
          return NextResponse.redirect(new URL("/scan/portal", request.url));
        }
        // For organiser/admin redirect to dashboard, others to home
        if (["organiser", "admin"].includes(role)) {
          return NextResponse.redirect(new URL("/dashboard", request.url));
        }
        return NextResponse.redirect(new URL("/", request.url));
      }
      return response;
    }

    // ── Require auth for protected routes ─────────────────────────────
    const isProtected = PROTECTED_ROUTES.some((r) => pathname.startsWith(r));
    if (isProtected && !session) {
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // ── Role-based access guards ───────────────────────────────────────
    if (session && isProtected) {
      const { data: profileRaw2 } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", session.user.id)
        .single();
      const profile2 = profileRaw2 as { role: string } | null;

      role = profile2?.role ?? "user";

      if (pathname.startsWith("/dashboard")) {
        if (!["organiser", "admin"].includes(role)) {
          if (role === "scanner") {
            return NextResponse.redirect(new URL("/scan/portal", request.url));
          }
          return NextResponse.redirect(new URL("/?error=unauthorized", request.url));
        }
      }

      if (pathname.startsWith("/admin")) {
        if (role !== "admin") {
          return NextResponse.redirect(new URL("/?error=unauthorized", request.url));
        }
      }

      if (pathname.startsWith("/scan")) {
        if (!["scanner", "organiser", "admin"].includes(role)) {
          return NextResponse.redirect(new URL("/?error=unauthorized", request.url));
        }
      }
    }

    return response;
  } catch {
    // Any unexpected error → just pass through (don't block the UI)
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$|auth/callback).*)",
  ],
};
