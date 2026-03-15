/**
 * app/(desktop)/dashboard/scanner/page.tsx
 *
 * Organiser scanner management — fully mobile responsive.
 *
 * Features:
 *  1. Select an event from your events list
 *  2. See currently assigned scanners
 *  3. Invite new scanner (creates account with email + password)
 *  4. Assign existing scanner users to the event
 *  5. Remove scanner assignments
 *  6. Open live scanner page for the event
 */

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import type { Event } from "@/lib/types/database";
import { ScannerManagementClient } from "./ScannerManagementClient";
import { Lightbulb, Search } from "lucide-react";

export const runtime = 'edge';
export const metadata: Metadata = { title: "Scanner Management — Dashboard" };

export default async function ScannerPage({
  searchParams,
}: {
  searchParams: Promise<{ eventId?: string }>;
}) {
  const { eventId: eventIdParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  // Organiser's events
  const { data: eventsData } = await supabase
    .from("events")
    .select("id, title, venue, city, event_date, status")
    .eq("organiser_id", user.id)
    .in("status", ["published", "completed"])
    .order("event_date", { ascending: false });

  const events = (eventsData ?? []) as Event[];
  const selectedEventId = eventIdParam ?? events[0]?.id ?? null;
  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  // Assignments for selected event
  const { data: assignmentsData } = selectedEventId
    ? await supabase
        .from("scanner_assignments")
        .select("id, scanner_id, profiles(id, display_name, email)")
        .eq("event_id", selectedEventId)
    : { data: [] };

  const assignments = (assignmentsData ?? []) as any[];

  // All scanner-role users (not yet assigned to this event)
  const { data: allScannersData } = await supabase
    .from("profiles")
    .select("id, display_name, email")
    .eq("role", "scanner");

  const allScanners = (allScannersData ?? []) as { id: string; display_name: string | null; email: string }[];
  const assignedIds = new Set(assignments.map((a) => a.scanner_id));
  const availableScanners = allScanners.filter((s) => !assignedIds.has(s.id));

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-text font-bold text-xl">Scanner Team</h1>
        <p className="text-muted text-sm mt-1">
          Invite staff, assign them to events. They log in at parchi.pk and scan tickets at the gate.
        </p>
      </div>

      {/* How it works — info banner */}
      <div className="flex items-start gap-3 p-4 bg-primary/5 border border-primary/20 rounded-xl">
        <Lightbulb size={20} className="shrink-0 text-primary" strokeWidth={1.8} />
        <div className="space-y-1 text-sm">
          <p className="text-text font-semibold">How scanner accounts work</p>
          <p className="text-muted text-sm leading-relaxed">
            Create a login for each gate staff member below. They'll use their email &amp; password to log in at{" "}
            <span className="text-primary font-medium">parchi.pk</span> and will only see the events you've assigned them to.
            They <strong className="text-text">cannot</strong> edit events, change prices, or access your dashboard.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Event selector ── */}
        <div className="space-y-3">
          <p className="text-text font-semibold text-sm">Select Event</p>
          {events.length === 0 ? (
            <div className="p-4 bg-surface rounded-xl border border-border/40 text-center space-y-2">
              <p className="text-muted text-sm">No published events</p>
              <Link
                href="/dashboard/events/new"
                className="text-primary text-xs hover:underline block"
              >
                Create one →
              </Link>
            </div>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-x-visible scrollbar-hide">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/dashboard/scanner?eventId=${event.id}`}
                  className={`shrink-0 lg:shrink block p-3 lg:p-3.5 rounded-xl border text-sm transition-colors ${
                    selectedEventId === event.id
                      ? "border-primary bg-primary-muted text-primary"
                      : "border-border bg-surface text-text hover:border-primary/30"
                  }`}
                >
                  <p className="font-semibold leading-snug truncate max-w-[200px] lg:max-w-none">
                    {event.title}
                  </p>
                  <p className="text-xs mt-0.5 opacity-70">
                    {new Date(event.event_date).toLocaleDateString("en-PK", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Scanner management panel ── */}
        <div className="lg:col-span-2">
          {!selectedEvent ? (
            <div className="py-16 text-center bg-surface rounded-xl border border-border/40">
              <Search size={36} className="mx-auto mb-3 text-muted" strokeWidth={1.4} />
              <p className="text-muted text-sm">Select an event to manage scanners</p>
            </div>
          ) : (
            <ScannerManagementClient
              selectedEvent={{
                id: selectedEvent.id,
                title: selectedEvent.title,
                venue: selectedEvent.venue,
                event_date: selectedEvent.event_date,
              }}
              assignments={assignments}
              availableScanners={availableScanners}
            />
          )}
        </div>
      </div>
    </div>
  );
}
