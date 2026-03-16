"use client";

/**
 * app/scan/page.tsx
 *
 * Live QR scanner page for event check-in.
 * - Reads ?eventId from URL
 * - Guards: user must be logged in + have scanner/organiser/admin role
 * - Calls validate-ticket Edge Function on each QR detection
 * - Shows ScanResult overlay until "Scan Next" is pressed
 *
 * Usage:
 *   /scan?eventId=<uuid>
 *
 * Designed to work on mobile (full-screen camera) and desktop (centered card).
 */

import { useEffect, useState, useCallback, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/authStore";
import type { ScanResultData } from "@/components/scanner/ScanResult";

import { ShieldX, Lightbulb, Ruler, RefreshCw, Lock } from "lucide-react";
// Dynamically import camera scanner (needs browser APIs)
const CameraScanner = dynamic(() => import("@/components/scanner/CameraScanner"), {
  ssr: false,
  loading: () => (
    <div className="w-full aspect-video rounded-2xl bg-surface2 flex items-center justify-center">
      <Spinner />
    </div>
  ),
});

const ScanResult = dynamic(() => import("@/components/scanner/ScanResult"), { ssr: false });

// ── Page ──────────────────────────────────────────────────────────────────────

function ScanContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");

  const { user, profile, loading: authLoading, setProfile } = useAuthStore();

  // Self-heal: if auth resolved but profile is still null (cross-route-group
  // navigation race), fetch it directly so the guard doesn't stay stuck.
  useEffect(() => {
    if (authLoading || !user || profile) return;
    const supabase = createClient();
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setProfile(data as any); });
  }, [authLoading, user, profile, setProfile]);

  const [pageState, setPageState] = useState<"loading" | "ready" | "unauthorized" | "no-event" | "not-assigned">(
    "loading"
  );
  const [scanState, setScanState] = useState<"idle" | "validating" | "result">("idle");
  const [result, setResult] = useState<ScanResultData | null>(null);
  const [eventTitle, setEventTitle] = useState<string>("");
  const [scanCount, setScanCount] = useState(0);
  const isValidating = useRef(false);

  // ── Auth guard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    async function check() {
      if (authLoading) return;

      if (!user) {
        router.replace(`/auth/login?redirect=/scan?eventId=${eventId}`);
        return;
      }

      const role = profile?.role;
      // If user is logged in but profile hasn't loaded yet, wait — don't
      // prematurely set unauthorized. The effect will re-run when profile arrives.
      if (!role) {
        if (!profile) return; // profile still loading, do nothing
        setPageState("unauthorized");
        return;
      }
      if (!["scanner", "organiser", "admin"].includes(role)) {
        setPageState("unauthorized");
        return;
      }

      if (!eventId) {
        setPageState("no-event");
        return;
      }

      // For scanners: verify they are assigned to this specific event
      // Organisers and admins are always allowed.
      if (role === "scanner") {
        const supabase = createClient();
        const { data: assignment } = await supabase
          .from("scanner_assignments")
          .select("id")
          .eq("scanner_id", user.id)
          .eq("event_id", eventId)
          .maybeSingle();
        if (!assignment) {
          setPageState("not-assigned");
          return;
        }
      }

      setPageState("ready");
    }
    check();
  }, [authLoading, user, profile, eventId, router]);

  // ── Fetch event title for display ──────────────────────────────────────────
  useEffect(() => {
    if (!eventId || pageState !== "ready") return;

    const supabase = createClient();
    supabase
      .from("events")
      .select("title")
      .eq("id", eventId)
      .single()
      .then(({ data }) => {
        const row = data as { title: string } | null;
        if (row?.title) setEventTitle(row.title);
      });
  }, [eventId, pageState]);

  // ── QR scan handler ────────────────────────────────────────────────────────
  const handleScan = useCallback(
    async (qrToken: string) => {
      if (isValidating.current || scanState === "result") return;
      isValidating.current = true;
      setScanState("validating");

      try {
        const supabase = createClient();
        // Use getSession() — reads from localStorage, no network call, never hangs.
        // refreshSession() was causing indefinite hangs on new-tab page loads.
        // If the token is expired the edge function returns a clear 401 error.
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          router.replace("/auth/login");
          return;
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/validate-ticket`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ qrToken, eventId }),
          }
        );

        let data: any;
        const rawText = await res.text();
        try {
          data = JSON.parse(rawText);
        } catch {
          // Edge function returned non-JSON (HTML error page etc.)
          data = { error: `Server error (${res.status}): ${rawText.slice(0, 120)}` };
        }
        // Normalise: edge function may return { error } or { valid, reason }
        const result: ScanResultData = data.valid !== undefined
          ? data
          : { valid: false, reason: data.error ?? `Unexpected response (${res.status})` };
        setResult(result);
        setScanState("result");
        setScanCount((c) => c + 1);
      } catch (err) {
        console.error("Validation error:", err);
        setResult({
          valid: false,
          reason: "Network error — could not reach server",
        });
        setScanState("result");
      } finally {
        isValidating.current = false;
      }
    },
    [eventId, scanState, router]
  );

  // ── Reset for next scan ────────────────────────────────────────────────────
  const handleReset = useCallback(() => {
    setResult(null);
    setScanState("idle");
  }, []);

  // ── Render states ──────────────────────────────────────────────────────────

  if (pageState === "loading") {
    return (
      <Screen>
        <div className="flex flex-col items-center gap-4">
          <Spinner />
          <p className="text-muted text-sm">Loading scanner…</p>
        </div>
      </Screen>
    );
  }

  if (pageState === "unauthorized") {
    return (
      <Screen>
        <div className="max-w-xs text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-error/10 flex items-center justify-center text-error">
            <ShieldX size={24} />
          </div>
          <p className="text-text font-semibold">Access denied</p>
          <p className="text-muted text-sm">
            You need a scanner, organiser, or admin account to use this page.
          </p>
          <button
            onClick={() => router.back()}
            className="mt-2 text-primary text-sm hover:underline"
          >
            ← Go back
          </button>
        </div>
      </Screen>
    );
  }

  if (pageState === "not-assigned") {
    return (
      <Screen>
        <div className="max-w-xs text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-full bg-error/10 flex items-center justify-center text-error">
            <Lock size={24} />
          </div>
          <p className="text-text font-semibold">Not assigned to this event</p>
          <p className="text-muted text-sm">
            You can only scan tickets for events you have been assigned to. Contact the organiser.
          </p>
          <button
            onClick={() => router.push("/scan/portal")}
            className="mt-2 text-primary text-sm hover:underline"
          >
            ← Back to my events
          </button>
        </div>
      </Screen>
    );
  }

  if (pageState === "no-event") {
    return (
      <Screen>
        <div className="max-w-xs text-center space-y-3">
          <p className="text-text font-semibold">No event selected</p>
          <p className="text-muted text-sm">
            Open the scanner from the dashboard and select an event first.
          </p>
          <button
            onClick={() => router.push("/dashboard/scanner")}
            className="mt-2 text-primary text-sm hover:underline"
          >
            Go to Scanner Management →
          </button>
        </div>
      </Screen>
    );
  }

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/40 bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-muted hover:text-text hover:bg-surface2 transition-colors"
            aria-label="Go back"
          >
            ←
          </button>
          <div>
            <p className="text-text font-bold text-sm leading-tight">Live Scanner</p>
            {eventTitle && (
              <p className="text-muted text-xs truncate max-w-[200px]">{eventTitle}</p>
            )}
          </div>
        </div>

        {/* Scan counter */}
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface2 border border-border/60">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          <span className="text-xs text-muted font-medium">{scanCount} scanned</span>
        </div>
      </header>

      {/* ── Main ── */}
      <main className="flex-1 flex flex-col items-center justify-start px-4 py-6 gap-6">
        {/* Camera */}
        <div className="w-full max-w-md">
          <CameraScanner
            onScan={handleScan}
            paused={scanState !== "idle"}
            className="aspect-[4/3] sm:aspect-video"
          />
        </div>

        {/* Status bar below camera */}
        <div className="w-full max-w-md">
          {scanState === "idle" && (
            <div className="flex items-center justify-center gap-2 py-3">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-muted text-sm">Ready — waiting for QR code…</span>
            </div>
          )}

          {scanState === "validating" && (
            <div className="flex items-center justify-center gap-2 py-3">
              <Spinner size="sm" />
              <span className="text-muted text-sm">Validating ticket…</span>
            </div>
          )}

          {scanState === "result" && result && (
            <ScanResult result={result} onReset={handleReset} />
          )}
        </div>

        {/* Tips */}
        {scanState === "idle" && (
          <div className="w-full max-w-md space-y-2 px-1">
            <p className="text-muted text-xs font-medium uppercase tracking-wider">Tips</p>
            <div className="grid grid-cols-2 gap-2">
              <Tip icon={Lightbulb} text="Ensure good lighting for fastest scanning" />
              <Tip icon={Ruler} text="Hold 15–30 cm from the QR code" />
              <Tip icon={RefreshCw} text="Scanner resumes automatically after each result" />
              <Tip icon={Lock} text="Each ticket can only be used once" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

// ── Page export ─────────────────────────────────────────────────────────────────

export default function ScanPage() {
  return (
    <Suspense>
      <ScanContent />
    </Suspense>
  );
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function Screen({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      {children}
    </div>
  );
}

function Tip({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl bg-surface border border-border/40">
      <Icon size={14} className="shrink-0 text-primary mt-0.5" strokeWidth={1.8} />
      <span className="text-muted text-xs leading-relaxed">{text}</span>
    </div>
  );
}

function Spinner({ size = "md" }: { size?: "sm" | "md" }) {
  const s = size === "sm" ? "h-4 w-4" : "h-7 w-7";
  return (
    <svg className={`animate-spin ${s} text-primary`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}
