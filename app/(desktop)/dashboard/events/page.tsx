/**
 * app/(desktop)/dashboard/events/page.tsx
 * Organiser's event list — desktop table + mobile cards.
 */

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import type { Event } from "@/lib/types/database";
import { Theater, MapPin, CalendarDays } from "lucide-react";

export const runtime = 'edge';
export const metadata: Metadata = { title: "My Events — Dashboard" };

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-PK", {
    day: "numeric", month: "short", year: "numeric",
  });
}

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  published: { label: "Live",      className: "bg-success/15 text-success" },
  approved:  { label: "Approved",  className: "bg-primary/15 text-primary" },
  pending:   { label: "Pending",   className: "bg-warning/15 text-warning" },
  draft:     { label: "Draft",     className: "bg-surface2 text-muted border border-border" },
  cancelled: { label: "Cancelled", className: "bg-error/15 text-error" },
  completed: { label: "Completed", className: "bg-surface2 text-subtle" },
};

type EventWithTiers = Event & {
  ticket_tiers: { id: string; name: string; price: number; total_quantity: number; sold_quantity: number }[];
};

export default async function EventsListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  let query = supabase
    .from("events")
    .select("*, ticket_tiers(id, name, price, total_quantity, sold_quantity)")
    .eq("organiser_id", user.id)
    .order("created_at", { ascending: false });

  if (status) query = query.eq("status", status);

  const { data: eventsData } = await query;
  const allEvents = (eventsData ?? []) as EventWithTiers[];

  // Count per status across ALL events (not filtered)
  const { data: allRaw } = await supabase
    .from("events")
    .select("status")
    .eq("organiser_id", user.id);
  const allForCounts = (allRaw ?? []) as { status: string }[];
  const statusCounts = allForCounts.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const tabs = [
    { label: "All",       value: null,        count: allForCounts.length },
    { label: "Live",      value: "published", count: statusCounts["published"] ?? 0 },
    { label: "Approved",  value: "approved",  count: statusCounts["approved"] ?? 0 },
    { label: "Draft",     value: "draft",     count: statusCounts["draft"] ?? 0 },
    { label: "Pending",   value: "pending",   count: statusCounts["pending"] ?? 0 },
    { label: "Completed", value: "completed", count: statusCounts["completed"] ?? 0 },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-text font-bold text-xl">Events</h1>
          <p className="text-muted text-sm mt-0.5">{allForCounts.length} total</p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors shrink-0"
        >
          <span>+</span>
          <span className="hidden sm:inline">New Event</span>
          <span className="sm:hidden">New</span>
        </Link>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
        {tabs.map((tab) => {
          const isActive = status === tab.value || (!status && !tab.value);
          const href = tab.value ? `/dashboard/events?status=${tab.value}` : "/dashboard/events";
          // Hide tabs with 0 count (except All)
          if (tab.value !== null && tab.count === 0) return null;
          return (
            <Link
              key={tab.label}
              href={href}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? "bg-primary text-white"
                  : "bg-surface border border-border text-muted hover:text-text hover:border-primary/30"
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-xs font-bold ${isActive ? "text-white/80" : "text-muted"}`}>
                  {tab.count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Empty */}
      {allEvents.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-3 bg-surface rounded-xl border border-border/40 text-center">
          <Theater size={48} className="text-muted" strokeWidth={1.2} />
          <p className="text-text font-semibold">No events found</p>
          <p className="text-muted text-sm">Create your first event to get started</p>
          <Link href="/dashboard/events/new" className="mt-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl">
            Create Event
          </Link>
        </div>
      ) : (
        <>
          {/* ── Desktop table ── */}
          <div className="hidden md:block bg-surface rounded-xl border border-border/60 overflow-hidden">
            <div className="hidden lg:grid grid-cols-[48px_1fr_130px_120px_110px_70px] gap-4 px-5 py-3 border-b border-border/60 text-[11px] uppercase tracking-wider text-muted font-medium">
              <span /><span>Event</span><span>Date</span><span>Tickets</span><span>Status</span><span />
            </div>
            <div className="divide-y divide-border/40">
              {allEvents.map((event) => {
                const totalSold = event.ticket_tiers.reduce((s, t) => s + t.sold_quantity, 0);
                const totalCap  = event.ticket_tiers.reduce((s, t) => s + t.total_quantity, 0);
                const statusCfg = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.draft;
                return (
                  <div key={event.id} className="grid grid-cols-[48px_1fr_auto] lg:grid-cols-[48px_1fr_130px_120px_110px_70px] gap-4 items-center px-5 py-4 hover:bg-surface2/50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-surface2 overflow-hidden flex items-center justify-center shrink-0">
                      {event.cover_image
                        ? <img src={event.cover_image} alt="" className="w-full h-full object-cover" />
                        : <Theater size={20} className="text-muted" strokeWidth={1.4} />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-text text-sm truncate">{event.title}</p>
                      <p className="text-muted text-xs truncate mt-0.5 flex items-center gap-1"><MapPin size={10} className="shrink-0" />{event.venue}, {event.city}</p>
                      <div className="flex items-center gap-2 mt-1 lg:hidden flex-wrap">
                        <span className="text-muted text-xs">{formatDate(event.event_date)}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusCfg.className}`}>{statusCfg.label}</span>
                      </div>
                    </div>
                    <p className="text-subtle text-xs hidden lg:block">{formatDate(event.event_date)}</p>
                    <div className="hidden lg:block">
                      <p className="text-text text-sm font-semibold">{totalSold} / {totalCap}</p>
                      {totalCap > 0 && (
                        <div className="mt-1 h-1 bg-surface2 rounded-full overflow-hidden w-20">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(100, (totalSold / totalCap) * 100)}%` }} />
                        </div>
                      )}
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full hidden lg:inline-flex ${statusCfg.className}`}>{statusCfg.label}</span>
                    <Link href={`/dashboard/events/${event.id}`} className="text-primary text-xs font-semibold hover:underline whitespace-nowrap">Manage →</Link>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Mobile cards ── */}
          <div className="md:hidden space-y-3">
            {allEvents.map((event) => {
              const totalSold = event.ticket_tiers.reduce((s, t) => s + t.sold_quantity, 0);
              const totalCap  = event.ticket_tiers.reduce((s, t) => s + t.total_quantity, 0);
              const statusCfg = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.draft;
              return (
                <div key={event.id} className="bg-surface rounded-2xl border border-border/60 overflow-hidden">
                  {event.cover_image && (
                    <img src={event.cover_image} alt={event.title} className="w-full h-24 object-cover" />
                  )}
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-bold text-text leading-snug">{event.title}</p>
                        <p className="text-muted text-xs mt-0.5 truncate flex items-center gap-1"><MapPin size={10} className="shrink-0" />{event.venue}, {event.city}</p>
                        <p className="text-muted text-xs mt-0.5 flex items-center gap-1"><CalendarDays size={10} className="shrink-0" />{formatDate(event.event_date)}</p>
                      </div>
                      <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${statusCfg.className}`}>{statusCfg.label}</span>
                    </div>
                    {totalCap > 0 && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-muted text-xs">Tickets sold</span>
                          <span className="text-text text-xs font-semibold">{totalSold} / {totalCap}</span>
                        </div>
                        <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${Math.min(100, (totalSold / totalCap) * 100)}%` }} />
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-1">
                      <Link href={`/dashboard/events/${event.id}`} className="flex-1 text-center py-2 bg-primary/10 text-primary text-xs font-bold rounded-lg hover:bg-primary/20 transition-colors">
                        Manage →
                      </Link>
                      <Link href={`/events/${event.id}`} className="px-3 py-2 bg-surface2 text-muted text-xs font-medium rounded-lg hover:text-text transition-colors">
                        View
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <Link
        href="/dashboard/events/new"
        className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-border/60 rounded-xl text-muted text-sm font-medium hover:border-primary/40 hover:text-primary transition-colors"
      >
        <span>+</span> Create New Event
      </Link>
    </div>
  );
}
