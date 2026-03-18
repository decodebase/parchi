/**
 * app/admin/events/page.tsx
 * Admin events list — cards are clickable to open full detail view.
 */

import { createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import { AdminEventActions } from "./AdminEventActions";
import { AdminEventDetail } from "./AdminEventDetail";

export const runtime = 'edge';
export const metadata: Metadata = { title: "All Events — Admin" };

const STATUS_TABS = [
  { key: "all",       label: "All" },
  { key: "pending",   label: "Pending" },
  { key: "published", label: "Live" },
  { key: "draft",     label: "Drafts" },
  { key: "cancelled", label: "Cancelled" },
] as const;

type StatusFilter = (typeof STATUS_TABS)[number]["key"];

interface PageProps {
  searchParams: Promise<{ status?: string; event?: string }>;
}

export default async function AdminEventsPage({ searchParams }: PageProps) {
  const { status: statusParam, event: selectedEventId } = await searchParams;
  const filter = (statusParam ?? "all") as StatusFilter;
  const supabase = createServiceClient();

  let query = supabase
    .from("events")
    .select(`
      id, title, status, is_featured, city, event_date, end_date, created_at,
      organiser_id, description, venue, address, cover_image, promo_video_url, categories, tags,
      profiles(display_name, email),
      ticket_tiers(id, name, price, total_quantity, sold_quantity)
    `)
    .order("created_at", { ascending: false })
    .limit(100);

  if (filter !== "all") query = query.eq("status", filter);

  const { data } = await query;
  const events = (data ?? []) as any[];

  const { data: countDataRaw } = await supabase.from("events").select("status");
  const countData = (countDataRaw ?? []) as { status: string }[];
  const counts = (countData ?? []).reduce<Record<string, number>>((acc, e) => {
    acc[e.status] = (acc[e.status] ?? 0) + 1;
    return acc;
  }, {});
  counts["all"] = countData?.length ?? 0;

  const selectedEvent = selectedEventId ? events.find(e => e.id === selectedEventId) : null;

  function formatDate(d: string | null) {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
  }
  function formatTime(d: string | null) {
    if (!d) return "";
    return new Date(d).toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit", hour12: true });
  }

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-[#FAFAFA] font-bold text-xl">All Events</h1>
        <p className="text-[#6B7280] text-sm mt-1">Approve, reject, and feature events from all organisers.</p>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 md:flex-wrap scrollbar-none">
        {STATUS_TABS.map((tab) => {
          const isActive = filter === tab.key;
          const count = counts[tab.key] ?? 0;
          return (
            <Link
              key={tab.key}
              href={`/admin/events${tab.key !== "all" ? `?status=${tab.key}` : ""}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? "bg-[#FF6A3D]/15 text-[#FF6A3D] border-[#FF6A3D]/30"
                  : "text-[#6B7280] border-transparent hover:text-[#FAFAFA] hover:bg-[#1A1A1E]"
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? "bg-[#FF6A3D]/20" : "bg-[#2A2A30]"}`}>
                  {count}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {events.length === 0 ? (
        <div className="py-20 text-center bg-[#111113] rounded-2xl border border-[#2A2A30] text-[#6B7280] text-sm">
          No events{filter !== "all" ? ` with status "${filter}"` : ""}.
          {filter !== "all" && (
            <Link href="/admin/events" className="block mt-2 text-[#FF6A3D] hover:underline">Clear filter →</Link>
          )}
        </div>
      ) : (
        <>
          {/* ── Desktop table ── */}
          <div className="hidden md:block bg-[#111113] rounded-2xl border border-[#2A2A30] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#2A2A30] bg-[#1A1A1E]/50">
                    <th className="text-left px-5 py-3 text-[#6B7280] font-medium text-xs uppercase tracking-wider">Event</th>
                    <th className="text-left px-4 py-3 text-[#6B7280] font-medium text-xs uppercase tracking-wider">Organiser</th>
                    <th className="text-left px-4 py-3 text-[#6B7280] font-medium text-xs uppercase tracking-wider">Date</th>
                    <th className="text-left px-4 py-3 text-[#6B7280] font-medium text-xs uppercase tracking-wider">Status</th>
                    <th className="text-left px-4 py-3 text-[#6B7280] font-medium text-xs uppercase tracking-wider">Featured</th>
                    <th className="text-right px-5 py-3 text-[#6B7280] font-medium text-xs uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2A2A30]/60">
                  {events.map((event) => (
                    <tr key={event.id} className="hover:bg-[#1A1A1E]/40 transition-colors">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/admin/events?${statusParam ? `status=${statusParam}&` : ""}event=${event.id}`}
                          className="group"
                        >
                          <p className="text-[#FAFAFA] font-medium leading-snug group-hover:text-[#FF6A3D] transition-colors">{event.title}</p>
                          <p className="text-[#6B7280] text-xs mt-0.5">{event.city}</p>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-[#FAFAFA] text-sm">{event.profiles?.display_name ?? "—"}</p>
                        <p className="text-[#6B7280] text-xs">{event.profiles?.email}</p>
                      </td>
                      <td className="px-4 py-3.5 text-[#6B7280] text-xs whitespace-nowrap">{formatDate(event.event_date)}</td>
                      <td className="px-4 py-3.5"><StatusPill status={event.status} /></td>
                      <td className="px-4 py-3.5">
                        {event.is_featured
                          ? <span className="text-[#F59E0B] text-xs font-medium">⭐ Featured</span>
                          : <span className="text-[#6B7280] text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <AdminEventActions eventId={event.id} status={event.status} isFeatured={event.is_featured} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mobile cards ── */}
          <div className="md:hidden space-y-3">
            {events.map((event) => (
              <div key={event.id} className="bg-[#111113] rounded-2xl border border-[#2A2A30] overflow-hidden">
                {/* Clickable detail area */}
                <Link
                  href={`/admin/events?${statusParam ? `status=${statusParam}&` : ""}event=${event.id}`}
                  className="block p-4 space-y-3"
                >
                  {/* Banner thumbnail */}
                  {event.cover_image && (
                    <div className="w-full h-32 rounded-xl overflow-hidden bg-[#1A1A1E]">
                      <img src={event.cover_image} alt={event.title} className="w-full h-full object-cover" />
                    </div>
                  )}

                  {/* Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[#FAFAFA] font-semibold leading-snug">{event.title}</p>
                      <p className="text-[#6B7280] text-xs mt-0.5">
                        {event.city} · {formatDate(event.event_date)}
                        {event.event_date && ` · ${formatTime(event.event_date)}`}
                      </p>
                      {event.venue && <p className="text-[#6B7280] text-xs">📍 {event.venue}</p>}
                    </div>
                    <StatusPill status={event.status} />
                  </div>

                  {/* Organiser */}
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-[#1A1A1E] flex items-center justify-center text-xs font-bold text-[#FF6A3D]">
                      {(event.profiles?.display_name ?? "?")[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-[#FAFAFA] text-xs font-medium">{event.profiles?.display_name ?? "—"}</p>
                      <p className="text-[#6B7280] text-[11px]">{event.profiles?.email}</p>
                    </div>
                  </div>

                  {/* Ticket tiers summary */}
                  {event.ticket_tiers?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {event.ticket_tiers.map((t: any) => (
                        <span key={t.id} className="text-[11px] px-2 py-0.5 bg-[#1A1A1E] text-[#9CA3AF] rounded-full border border-[#2A2A30]">
                          {t.name} — {t.price === 0 ? "Free" : `PKR ${(t.price / 100).toLocaleString()}`}
                        </span>
                      ))}
                    </div>
                  )}

                  {event.is_featured && (
                    <span className="inline-block text-[#F59E0B] text-xs font-medium">⭐ Featured</span>
                  )}

                  <p className="text-[#FF6A3D] text-xs font-medium">Tap to view full details →</p>
                </Link>

                {/* Actions */}
                <div className="px-4 pb-4 pt-1 border-t border-[#2A2A30]/60">
                  <AdminEventActions eventId={event.id} status={event.status} isFeatured={event.is_featured} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <p className="text-[#6B7280] text-xs">Showing {events.length} event{events.length !== 1 ? "s" : ""}.</p>

      {/* Event Detail Modal */}
      {selectedEvent && (
        <AdminEventDetail
          event={selectedEvent}
          closeHref={`/admin/events${statusParam ? `?status=${statusParam}` : ""}`}
        />
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    draft:     "bg-[#6B7280]/15 text-[#6B7280]",
    pending:   "bg-blue-400/15 text-blue-400",
    approved:  "bg-[#FF6A3D]/15 text-[#FF6A3D]",
    published: "bg-[#10B981]/15 text-[#10B981]",
    cancelled: "bg-[#EF4444]/15 text-[#EF4444]",
    completed: "bg-[#6B7280]/15 text-[#6B7280]",
  };
  const label: Record<string, string> = {
    draft: "Draft", pending: "Pending", approved: "Approved",
    published: "Live", cancelled: "Cancelled", completed: "Done",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${map[status] ?? map.draft}`}>
      {label[status] ?? status}
    </span>
  );
}
