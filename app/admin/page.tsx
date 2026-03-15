/**
 * app/admin/page.tsx — Mobile-responsive admin overview
 */

import { createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import { Users, CalendarDays, Ticket, Banknote, CheckCircle2, Building2, Megaphone, UserCog } from "lucide-react";

export const runtime = 'edge';
export const metadata: Metadata = { title: "Admin Overview — Parchi" };

async function getPlatformStats() {
  const supabase = createServiceClient();

  const [
    usersRes,
    eventsRes,
    ordersRes,
    ticketsRes,
    pendingAppsRes,
    pendingSlotsRes,
    recentEventsRes,
  ] = await Promise.all([
    supabase.from("profiles").select("id, role, created_at", { count: "exact" }),
    supabase.from("events").select("id, status, created_at", { count: "exact" }),
    supabase.from("orders").select("id, total_amount, status"),
    supabase.from("tickets").select("id, status", { count: "exact" }),
    supabase.from("organiser_applications").select("id", { count: "exact" }).eq("status", "pending"),
    supabase.from("featured_slots").select("id", { count: "exact" }).eq("status", "active"),
    supabase
      .from("events")
      .select("id, title, status, created_at, profiles(display_name)")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const users   = (usersRes.data   ?? []) as { id: string; role: string; created_at: string | null }[];
  const events   = (eventsRes.data  ?? []) as { id: string; status: string; created_at: string | null }[];
  const orders   = (ordersRes.data  ?? []) as { id: string; total_amount: number; status: string }[];
  const tickets  = (ticketsRes.data ?? []) as { id: string; status: string }[];

  const totalRevenue = orders
    .filter((o) => o.status === "paid")
    .reduce((sum, o) => sum + (o.total_amount ?? 0), 0);

  const totalTicketsSold = tickets.filter(
    (t) => t.status === "valid" || t.status === "used"
  ).length;

  return {
    totalUsers: usersRes.count ?? users.length,
    organiserCount: users.filter((u) => u.role === "organiser").length,
    scannerCount: users.filter((u) => u.role === "scanner").length,
    totalEvents: eventsRes.count ?? events.length,
    publishedEvents: events.filter((e) => e.status === "published").length,
    pendingEvents: events.filter((e) => e.status === "pending").length,
    totalRevenue,
    totalTicketsSold,
    pendingApps: pendingAppsRes.count ?? 0,
    activeSlots: pendingSlotsRes.count ?? 0,
    recentEvents: (recentEventsRes.data ?? []) as any[],
  };
}

function formatPKR(paisas: number) {
  return `PKR ${(paisas / 100).toLocaleString("en-PK", { minimumFractionDigits: 0 })}`;
}

export default async function AdminOverviewPage() {
  const stats = await getPlatformStats();

  const kpiCards = [
    {
      label: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      sub: `${stats.organiserCount} organisers · ${stats.scannerCount} scanners`,
      Icon: Users,
      accent: "#60A5FA",
    },
    {
      label: "Total Events",
      value: stats.totalEvents.toLocaleString(),
      sub: `${stats.publishedEvents} live · ${stats.pendingEvents} pending`,
      Icon: CalendarDays,
      accent: "#FF6A3D",
    },
    {
      label: "Tickets Sold",
      value: stats.totalTicketsSold.toLocaleString(),
      sub: "All time",
      Icon: Ticket,
      accent: "#10B981",
    },
    {
      label: "Gross Revenue",
      value: formatPKR(stats.totalRevenue),
      sub: "From paid orders",
      Icon: Banknote,
      accent: "#F59E0B",
    },
  ];

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-[#FAFAFA] font-bold text-xl md:text-2xl">Platform Overview</h1>
        <p className="text-[#6B7280] text-sm mt-1">Real-time metrics across all organisers and events.</p>
      </div>

      {/* Alert banners */}
      {(stats.pendingApps > 0 || stats.pendingEvents > 0) && (
        <div className="flex flex-col sm:flex-row gap-2">
          {stats.pendingApps > 0 && (
            <Link
              href="/admin/organisers?tab=applications"
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 text-[#F59E0B] text-sm font-medium hover:bg-[#F59E0B]/15 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse shrink-0" />
              <span>{stats.pendingApps} organiser application{stats.pendingApps !== 1 ? "s" : ""} awaiting review →</span>
            </Link>
          )}
          {stats.pendingEvents > 0 && (
            <Link
              href="/admin/events?status=pending"
              className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-blue-400/10 border border-blue-400/30 text-blue-400 text-sm font-medium hover:bg-blue-400/15 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse shrink-0" />
              <span>{stats.pendingEvents} event{stats.pendingEvents !== 1 ? "s" : ""} pending approval →</span>
            </Link>
          )}
        </div>
      )}

      {/* KPI grid — 2 cols on mobile, 4 on xl */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        {kpiCards.map((card) => (
          <div key={card.label} className="p-4 md:p-5 rounded-2xl border border-[#2A2A30] bg-[#111113] space-y-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${card.accent}18` }}>
              <card.Icon className="w-4.5 h-4.5" style={{ color: card.accent }} strokeWidth={1.8} />
            </div>
            <div>
              <p className="text-[#6B7280] text-xs font-medium">{card.label}</p>
              <p className="text-lg md:text-2xl font-bold mt-0.5" style={{ color: card.accent }}>{card.value}</p>
              <p className="text-[#6B7280] text-xs mt-1 leading-relaxed">{card.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom grid — stacked on mobile, 2-col on lg */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Recent events */}
        <div className="bg-[#111113] rounded-2xl border border-[#2A2A30] overflow-hidden">
          <div className="px-4 md:px-5 py-4 border-b border-[#2A2A30] flex items-center justify-between">
            <p className="text-[#FAFAFA] font-semibold text-sm">Recently Created</p>
            <Link href="/admin/events" className="text-[#FF6A3D] text-xs hover:underline">
              View all →
            </Link>
          </div>
          {stats.recentEvents.length === 0 ? (
            <div className="py-10 text-center text-[#6B7280] text-sm">No events yet.</div>
          ) : (
            <div className="divide-y divide-[#2A2A30]/60">
              {stats.recentEvents.map((event) => (
                <div key={event.id} className="flex items-center justify-between px-4 md:px-5 py-3">
                  <div className="min-w-0 mr-3">
                    <p className="text-[#FAFAFA] text-sm font-medium leading-snug truncate">
                      {event.title}
                    </p>
                    <p className="text-[#6B7280] text-xs mt-0.5 truncate">
                      by {event.profiles?.display_name ?? "Unknown"}
                    </p>
                  </div>
                  <StatusPill status={event.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-[#111113] rounded-2xl border border-[#2A2A30] overflow-hidden">
          <div className="px-4 md:px-5 py-4 border-b border-[#2A2A30]">
            <p className="text-[#FAFAFA] font-semibold text-sm">Quick Actions</p>
          </div>
          <div className="p-3 md:p-4 grid grid-cols-1 gap-2">
            {([
              { href: "/admin/events?status=pending", Icon: CheckCircle2, label: "Review pending events", sub: `${stats.pendingEvents} waiting`, warn: stats.pendingEvents > 0 },
              { href: "/admin/organisers?tab=applications", Icon: Building2, label: "Organiser applications", sub: `${stats.pendingApps} pending`, warn: stats.pendingApps > 0 },
              { href: "/admin/ads", Icon: Megaphone, label: "Manage ad slots", sub: `${stats.activeSlots} active`, warn: false },
              { href: "/admin/organisers", Icon: UserCog, label: "Manage user roles", sub: "Promote / demote", warn: false },
            ] as const).map((action) => (
              <Link key={action.href} href={action.href}
                className="flex items-center justify-between p-3 md:p-3.5 rounded-xl border border-[#2A2A30] hover:border-[#FF6A3D]/30 hover:bg-[#FF6A3D]/5 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#1A1A1E] flex items-center justify-center shrink-0">
                    <action.Icon className={`w-4 h-4 ${action.warn ? "text-[#F59E0B]" : "text-[#6B7280] group-hover:text-[#FF6A3D]"}`} strokeWidth={1.8} />
                  </div>
                  <div>
                    <p className="text-[#FAFAFA] text-sm font-medium">{action.label}</p>
                    <p className={`text-xs mt-0.5 ${action.warn ? "text-[#F59E0B]" : "text-[#6B7280]"}`}>{action.sub}</p>
                  </div>
                </div>
                <span className="text-[#6B7280] group-hover:text-[#FF6A3D] transition-colors text-sm">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft:     "bg-[#6B7280]/15 text-[#6B7280]",
    pending:   "bg-blue-400/15 text-blue-400",
    published: "bg-[#10B981]/15 text-[#10B981]",
    cancelled: "bg-[#EF4444]/15 text-[#EF4444]",
    completed: "bg-[#6B7280]/15 text-[#6B7280]",
  };
  const label: Record<string, string> = {
    draft: "Draft", pending: "Pending", published: "Live",
    cancelled: "Cancelled", completed: "Done",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${map[status] ?? map.draft}`}>
      {label[status] ?? status}
    </span>
  );
}
