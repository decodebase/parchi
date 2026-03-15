/**
 * app/(desktop)/dashboard/page.tsx
 *
 * Organiser dashboard overview — fully mobile responsive.
 * KPI cards: 2-col on mobile, 4-col on xl.
 * Bottom section: stacked on mobile, 3-col grid on xl.
 */

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import type { Event, Order, Ticket } from "@/lib/types/database";
import { CalendarCheck, Ticket as TicketIcon, Banknote, CalendarClock, Calendar, Plus } from "lucide-react";

export const runtime = 'edge';
export const metadata: Metadata = { title: "Dashboard — Parchi" };

async function getDashboardStats(organiserId: string) {
  const supabase = await createClient();

  // First get organiser's event IDs
  const { data: orgEvents } = await supabase
    .from("events")
    .select("id, title, status, event_date, cover_image")
    .eq("organiser_id", organiserId)
    .order("created_at", { ascending: false });

  const events = (orgEvents ?? []) as Event[];
  const eventIds = events.map((e) => e.id);

  if (eventIds.length === 0) {
    return { events: [], orders: [], totalRevenue: 0, totalTicketsSold: 0, publishedEvents: 0, upcomingEvents: [] };
  }

  const [ordersRes, ticketsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, total_amount, status, created_at, event_id")
      .in("event_id", eventIds)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("tickets")
      .select("id, status, event_id, created_at")
      .in("event_id", eventIds),
  ]);

  const orders = (ordersRes.data ?? []) as Order[];
  const tickets = (ticketsRes.data ?? []) as Ticket[];

  const totalRevenue = orders
    .filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + o.total_amount, 0);
  const totalTicketsSold = tickets.filter(
    (t) => t.status === "valid" || t.status === "used"
  ).length;
  const publishedEvents = events.filter((e) => e.status === "published").length;
  const upcomingEvents = events.filter(
    (e) => e.status === "published" && new Date(e.event_date) > new Date()
  );

  return { events, orders, totalRevenue, totalTicketsSold, publishedEvents, upcomingEvents };
}

function formatPKR(paisas: number) {
  return `PKR ${(paisas / 100).toLocaleString("en-PK")}`;
}

function formatDate(dateStr: string | null) {
  return new Date(dateStr ?? Date.now()).toLocaleDateString("en-PK", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export default async function DashboardOverviewPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("display_name, role")
    .eq("id", user.id)
    .maybeSingle();
  const profile = profileRaw as { display_name: string | null; role: string } | null;

  const { events, orders, totalRevenue, totalTicketsSold, publishedEvents, upcomingEvents } =
    await getDashboardStats(user.id);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="space-y-6 md:space-y-8">
      {/* Header */}
      <div>
        <p className="text-muted text-sm">{greeting}</p>
        <h1 className="text-text text-xl md:text-2xl font-bold mt-0.5">
          {profile?.display_name ?? "Organiser"}
        </h1>
      </div>

      {/* KPI cards — 2 col on mobile, 4 on xl */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        <KPICard icon={CalendarCheck} label="Published" value={String(publishedEvents)} sub={`${events.length} total`} color="text-primary" />
        <KPICard icon={TicketIcon} label="Tickets Sold" value={String(totalTicketsSold)} sub="all events" color="text-success" />
        <KPICard icon={Banknote} label="Revenue" value={formatPKR(totalRevenue)} sub="paid orders" color="text-warning" />
        <KPICard icon={CalendarClock} label="Upcoming" value={String(upcomingEvents.length)} sub="live events" color="text-primary" />
      </div>

      {/* Bottom section — stacked on mobile, 3-col on xl */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 md:gap-6">
        {/* Upcoming events — takes 2 cols on xl */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-text font-bold text-base">Upcoming Events</h2>
            <Link href="/dashboard/events" className="text-primary text-sm hover:underline">
              View all
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <EmptyCard message="No upcoming events. Create one to get started." />
          ) : (
            <div className="space-y-3">
              {upcomingEvents.slice(0, 5).map((event) => (
                <Link
                  key={event.id}
                  href={`/dashboard/events/${event.id}`}
                  className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-surface rounded-xl border border-border/60 hover:border-primary/30 transition-colors group"
                >
                  <div className="w-11 h-11 rounded-lg bg-surface2 flex items-center justify-center text-xl shrink-0 overflow-hidden">
                    {event.cover_image
                      ? <img src={event.cover_image} alt="" className="w-full h-full object-cover rounded-lg" />
                      : <Calendar className="w-5 h-5 text-muted" strokeWidth={1.5} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text text-sm truncate group-hover:text-primary transition-colors">
                      {event.title}
                    </p>
                    <p className="text-muted text-xs mt-0.5 flex items-center gap-1"><Calendar className="w-3 h-3" strokeWidth={2} />{formatDate(event.event_date)}</p>
                  </div>
                  <StatusPill status={event.status} />
                </Link>
              ))}
            </div>
          )}

          <Link
            href="/dashboard/events/new"
            className="flex items-center justify-center gap-2 w-full py-3 border-2 border-dashed border-border/60 rounded-xl text-muted text-sm font-medium hover:border-primary/40 hover:text-primary transition-colors"
          >
            <Plus className="w-4 h-4" strokeWidth={2} /> Create New Event
          </Link>
        </div>

        {/* Recent orders */}
        <div className="space-y-4">
          <h2 className="text-text font-bold text-base">Recent Orders</h2>
          {orders.length === 0 ? (
            <EmptyCard message="No orders yet." />
          ) : (
            <div className="space-y-2">
              {orders.slice(0, 6).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-3 bg-surface rounded-xl border border-border/40"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-text text-xs font-semibold font-mono">
                      #{order.id.slice(-8).toUpperCase()}
                    </p>
                    <p className="text-muted text-[11px] mt-0.5">{formatDate(order.created_at)}</p>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="text-text text-xs font-bold">
                      {order.status === "paid" ? formatPKR(order.total_amount) : "—"}
                    </p>
                    <p className={`text-[10px] font-semibold capitalize mt-0.5 ${
                      order.status === "paid"     ? "text-success"
                      : order.status === "pending" ? "text-warning"
                      : order.status === "failed"  ? "text-error"
                      : "text-muted"
                    }`}>
                      {order.status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function KPICard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string; sub: string; color: string;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border/60 p-4 md:p-5 space-y-2 md:space-y-3">
      <div className="flex items-center justify-between">
        <Icon className="w-5 h-5 text-muted" strokeWidth={1.8} />
        <span className="text-[10px] text-muted uppercase tracking-wider font-medium text-right leading-tight">
          {label}
        </span>
      </div>
      <div>
        <p className={`text-lg md:text-2xl font-bold ${color}`}>{value}</p>
        <p className="text-muted text-xs mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    published: "bg-success/15 text-success",
    draft:     "bg-surface2 text-muted",
    pending:   "bg-warning/15 text-warning",
    cancelled: "bg-error/15 text-error",
    completed: "bg-surface2 text-muted",
  };
  return (
    <span className={`text-[10px] font-semibold px-2.5 py-1 rounded-full capitalize shrink-0 ${map[status] ?? "bg-surface2 text-muted"}`}>
      {status}
    </span>
  );
}

function EmptyCard({ message }: { message: string }) {
  return (
    <div className="py-10 flex flex-col items-center gap-2 bg-surface rounded-xl border border-border/40">
      <Calendar className="w-8 h-8 text-muted" strokeWidth={1.5} />
      <p className="text-muted text-sm text-center px-4">{message}</p>
    </div>
  );
}
