/**
 * app/scan/portal/page.tsx
 *
 * Scanner Portal — Events tab.
 * Shows all events the scanner is assigned to (current & past).
 * Tapping "Scan Tickets" navigates to /scan?eventId=<id>.
 *
 * Organisers and admins who land here see their own events.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/lib/store/authStore";
import { ScanLine, MapPin, Calendar, Ticket } from "lucide-react";

interface AssignedEvent {
  id: string;
  title: string;
  venue: string;
  city: string;
  event_date: string;
  cover_image: string | null;
  status: string;
}

export default function ScannerEventsPage() {
  const router = useRouter();
  const { user, profile, loading: authLoading } = useAuthStore();
  const [events, setEvents] = useState<AssignedEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.replace("/auth/login?next=/scan/portal");
      return;
    }
    // Wait for profile to load before evaluating role — avoids kicking out
    // valid scanners during the brief window where profile is still null.
    if (!profile) return;
    const role = profile.role;
    if (!role || !["scanner", "organiser", "admin"].includes(role)) {
      router.replace("/?error=unauthorized");
      return;
    }
    fetchEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, profile]);

  async function fetchEvents() {
    setLoading(true);
    try {
      const supabase = createClient();

      if (profile?.role === "organiser" || profile?.role === "admin") {
        const { data } = await supabase
          .from("events")
          .select("id, title, venue, city, event_date, cover_image, status")
          .eq("organiser_id", user!.id)
          .in("status", ["published", "completed"])
          .order("event_date", { ascending: false });
        setEvents(data ?? []);
      } else {
        // Scanners: all assignments, then fetch event details separately
        // (avoids RLS join failures on the events table)
        const { data: assignments } = await supabase
          .from("scanner_assignments")
          .select("event_id")
          .eq("scanner_id", user!.id);

        const eventIds = (assignments ?? []).map((a: any) => a.event_id).filter(Boolean);
        if (eventIds.length === 0) { setEvents([]); return; }

        const { data: eventData } = await supabase
          .from("events")
          .select("id, title, venue, city, event_date, cover_image, status")
          .in("id", eventIds)
          .order("event_date", { ascending: false });

        setEvents((eventData ?? []) as AssignedEvent[]);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 py-6 space-y-4">
      <div>
        <h1 className="text-text text-xl font-bold">
          {profile?.role === "scanner" ? "My Assigned Events" : "Your Events"}
        </h1>
        <p className="text-muted text-xs mt-0.5">
          {profile?.role === "scanner"
            ? "All events you have been assigned to scan."
            : "Your published events ready to scan."}
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-surface border border-border animate-pulse"
            />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="py-16 text-center bg-surface rounded-2xl border border-border space-y-3">
          <Ticket className="w-10 h-10 mx-auto text-muted" strokeWidth={1.5} />
          <p className="text-text font-semibold">No events yet</p>
          <p className="text-muted text-sm max-w-xs mx-auto">
            {profile?.role === "scanner"
              ? "You haven't been assigned to any events. Contact your organiser."
              : "No published events found."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event, i) => (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <EventCard event={event} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: AssignedEvent }) {
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
    <div className="bg-surface rounded-2xl border border-border overflow-hidden">
      {event.cover_image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={event.cover_image}
          alt={event.title}
          className="w-full h-28 object-cover"
        />
      )}
      <div className="p-4 space-y-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-text font-bold leading-snug">{event.title}</p>
            {isUpcoming && (
              <span className="text-[10px] font-bold text-[#10B981] bg-[#10B981]/10 px-1.5 py-0.5 rounded-full">
                Upcoming
              </span>
            )}
            {isPast && (
              <span className="text-[10px] font-bold text-muted bg-surface2 px-1.5 py-0.5 rounded-full">
                Past
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5 text-muted shrink-0" strokeWidth={2} />
            <p className="text-muted text-xs truncate">
              {event.venue}, {event.city}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-muted shrink-0" strokeWidth={2} />
            <p className="text-muted text-xs">
              {dateStr} · {timeStr}
            </p>
          </div>
        </div>

        <a
          href={`/scan?eventId=${event.id}`}
          className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors"
        >
          <ScanLine className="w-4 h-4" strokeWidth={2.5} />
          Scan Tickets
        </a>
      </div>
    </div>
  );
}
