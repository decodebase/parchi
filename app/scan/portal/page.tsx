/**
 * app/scan/portal/page.tsx
 *
 * Scanner portal — landing page for scanner role users after login.
 * Shows their assigned events with a "Scan Tickets" button per event.
 * They cannot edit anything — read-only view of their assignments.
 *
 * Route: /scan/portal
 * Access: scanner, organiser, admin
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/authStore";

interface AssignedEvent {
  id: string;
  title: string;
  venue: string;
  city: string;
  event_date: string;
  cover_image: string | null;
  status: string;
  assignment_id: string;
}

export default function ScannerPortalPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuthStore();
  const [events, setEvents] = useState<AssignedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/auth/login?redirect=/scan/portal");
      return;
    }

    const role = profile?.role;
    if (!role || !["scanner", "organiser", "admin"].includes(role)) {
      router.replace("/?error=unauthorized");
      return;
    }

    fetchAssignedEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, profile]);

  async function fetchAssignedEvents() {
    setLoading(true);
    try {
      const supabase = createClient();

      // Organiser/admin sees all their events; scanner sees only assigned
      if (profile?.role === "organiser" || profile?.role === "admin") {
        const { data } = await supabase
          .from("events")
          .select("id, title, venue, city, event_date, cover_image, status")
          .eq("organiser_id", user!.id)
          .in("status", ["published", "completed"])
          .order("event_date", { ascending: false });

        setEvents(
          (data ?? []).map((e: any) => ({ ...e, assignment_id: "organiser" }))
        );
      } else {
        const { data } = await supabase
          .from("scanner_assignments")
          .select("id, events(id, title, venue, city, event_date, cover_image, status)")
          .eq("scanner_id", user!.id);

        setEvents(
          (data ?? [])
            .map((row: any) => ({
              ...row.events,
              assignment_id: row.id,
            }))
            .filter((e: any) => e && e.id)
            .sort(
              (a: any, b: any) =>
                new Date(b.event_date).getTime() - new Date(a.event_date).getTime()
            )
        );
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/auth/login");
  }

  const displayName = profile?.display_name ?? user?.email?.split("@")[0] ?? "Scanner";

  return (
    <div className="min-h-[100svh] bg-[#0A0A0B] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-[#111113]/90 backdrop-blur-sm border-b border-[#2A2A30]">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-black text-[#FF6A3D]">parchi</span>
            <span className="text-[10px] font-bold text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
              scanner
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[#6B7280] text-xs hidden sm:block truncate max-w-[140px]">
              {displayName}
            </span>
            <button
              onClick={handleSignOut}
              className="text-[#6B7280] text-xs hover:text-[#EF4444] transition-colors font-medium"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Greeting */}
        <div>
          <p className="text-[#6B7280] text-sm">Welcome back,</p>
          <h1 className="text-[#FAFAFA] text-2xl font-bold">{displayName}</h1>
        </div>

        {/* Events section */}
        <div className="space-y-3">
          <p className="text-[#FAFAFA] font-semibold text-sm">
            {profile?.role === "organiser" || profile?.role === "admin"
              ? "Your Events"
              : "Your Assigned Events"}
          </p>

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-2xl bg-[#111113] border border-[#2A2A30] animate-pulse" />
              ))}
            </div>
          ) : events.length === 0 ? (
            <div className="py-16 text-center bg-[#111113] rounded-2xl border border-[#2A2A30] space-y-3">
              <p className="text-4xl">🎟️</p>
              <p className="text-[#FAFAFA] font-semibold">No events assigned yet</p>
              <p className="text-[#6B7280] text-sm max-w-xs mx-auto">
                Your organiser hasn't assigned you to any events yet. Contact them to get access.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <EventScanCard key={event.assignment_id} event={event} />
              ))}
            </div>
          )}
        </div>

        {/* Help */}
        <div className="flex items-start gap-3 p-4 bg-[#111113] rounded-2xl border border-[#2A2A30]">
          <span className="text-xl shrink-0">ℹ️</span>
          <div className="space-y-1">
            <p className="text-[#FAFAFA] text-sm font-semibold">Scanning tickets</p>
            <p className="text-[#6B7280] text-xs leading-relaxed">
              Tap "Scan Tickets" next to an event to open the camera scanner. Point the camera at a
              guest's QR code. Green = valid, Yellow = already used, Red = invalid.
              Each ticket can only be scanned once.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

// ── Event scan card ─────────────────────────────────────────────────────────────

function EventScanCard({ event }: { event: AssignedEvent }) {
  const isUpcoming = new Date(event.event_date) > new Date();
  const isPast = new Date(event.event_date) < new Date();

  const dateStr = new Date(event.event_date).toLocaleDateString("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const timeStr = new Date(event.event_date).toLocaleTimeString("en-PK", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="bg-[#111113] rounded-2xl border border-[#2A2A30] overflow-hidden">
      {/* Cover image strip */}
      {event.cover_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.cover_image}
          alt={event.title}
          className="w-full h-28 object-cover"
        />
      )}

      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[#FAFAFA] font-bold leading-snug">{event.title}</p>
              {isUpcoming && (
                <span className="text-[10px] font-bold text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.5 rounded-full">
                  Upcoming
                </span>
              )}
              {isPast && (
                <span className="text-[10px] font-bold text-[#6B7280] bg-[#6B7280]/10 px-1.5 py-0.5 rounded-full">
                  Past
                </span>
              )}
            </div>
            <p className="text-[#6B7280] text-xs mt-1">
              📍 {event.venue}, {event.city}
            </p>
            <p className="text-[#6B7280] text-xs">
              📅 {dateStr} · {timeStr}
            </p>
          </div>
        </div>

        <a
          href={`/scan?eventId=${event.id}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-[#FF6A3D] text-white text-sm font-bold rounded-xl hover:bg-[#FF6A3D]/90 transition-colors"
        >
          <span>📷</span>
          Scan Tickets
        </a>
      </div>
    </div>
  );
}
