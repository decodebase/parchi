/**
 * app/admin/ads/page.tsx — Mobile-responsive
 */

import { createServiceClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { AdSlotActions } from "./AdSlotActions";

export const runtime = 'edge';
export const metadata: Metadata = { title: "Ad Slots — Admin" };

const SLOT_LABELS: Record<string, { label: string; icon: string; desc: string }> = {
  homepage_hero:  { label: "Homepage Hero",  icon: "🏠", desc: "Full-width top banner" },
  homepage_grid:  { label: "Homepage Grid",  icon: "⊞",  desc: "Featured grid placement" },
  category_top:   { label: "Category Top",   icon: "🏷️", desc: "Top of category listing" },
  search_boost:   { label: "Search Boost",   icon: "🔍", desc: "Boosted in search results" },
};

type SlotStatusFilter = "all" | "active" | "paused" | "expired" | "cancelled";

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function AdminAdsPage({ searchParams }: PageProps) {
  const resolvedParams = await searchParams;
  const filter = (resolvedParams.status ?? "all") as SlotStatusFilter;
  const supabase = createServiceClient();

  let query = supabase
    .from("featured_slots")
    .select(`id, slot_type, starts_at, ends_at, status, price_paid, created_at, events(id, title, city), profiles(display_name, email)`)
    .order("created_at", { ascending: false })
    .limit(100);

  if (filter !== "all") query = query.eq("status", filter);

  const { data } = await query;
  const slots = (data ?? []) as any[];

  const { data: allSlotsRaw } = await supabase.from("featured_slots").select("status, price_paid");
  const allSlots = (allSlotsRaw ?? []) as { status: string; price_paid: number | null }[];
  const summary = allSlots.reduce(
    (acc, s) => {
      acc.total++;
      acc[s.status] = (acc[s.status] ?? 0) + 1;
      if (s.status === "active") acc.revenue += s.price_paid ?? 0;
      return acc;
    },
    { total: 0, active: 0, revenue: 0 } as Record<string, number>
  );

  function formatDate(d: string | null) {
    return new Date(d ?? Date.now()).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
  }

  function formatPKR(paisas: number) {
    return `PKR ${(paisas / 100).toLocaleString("en-PK")}`;
  }

  function isExpired(endsAt: string | null) {
    return new Date(endsAt ?? Date.now()) < new Date();
  }

  return (
    <div className="space-y-5 max-w-6xl">
      <div>
        <h1 className="text-[#FAFAFA] font-bold text-xl">Featured Ad Slots</h1>
        <p className="text-[#6B7280] text-sm mt-1">Manage all featured event placements.</p>
      </div>

      {/* Summary — 2 cols on mobile, 4 on sm+ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Slots",  value: summary.total,                     color: "text-[#FAFAFA]" },
          { label: "Active Now",   value: summary.active ?? 0,               color: "text-[#10B981]" },
          { label: "Paused",       value: summary.paused ?? 0,               color: "text-[#F59E0B]" },
          { label: "Ad Revenue",   value: formatPKR(summary.revenue),        color: "text-[#FF6A3D]" },
        ].map((card) => (
          <div key={card.label} className="bg-[#111113] border border-[#2A2A30] rounded-xl p-3 md:p-4">
            <p className="text-[#6B7280] text-xs">{card.label}</p>
            <p className={`text-lg md:text-xl font-bold mt-1 ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs — horizontal scroll on mobile */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-4 px-4 md:mx-0 md:px-0 scrollbar-none">
        {(["all", "active", "paused", "expired", "cancelled"] as SlotStatusFilter[]).map((s) => (
          <a
            key={s}
            href={`/admin/ads${s !== "all" ? `?status=${s}` : ""}`}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors capitalize whitespace-nowrap shrink-0 ${
              filter === s
                ? "bg-[#FF6A3D]/15 text-[#FF6A3D] border-[#FF6A3D]/30"
                : "text-[#6B7280] border-transparent hover:text-[#FAFAFA] hover:bg-[#1A1A1E]"
            }`}
          >
            {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </a>
        ))}
      </div>

      {/* Slot cards */}
      {slots.length === 0 ? (
        <div className="py-20 text-center bg-[#111113] rounded-2xl border border-[#2A2A30] text-[#6B7280] text-sm">
          No ad slots{filter !== "all" ? ` with status "${filter}"` : ""}.
        </div>
      ) : (
        <div className="space-y-3">
          {slots.map((slot) => {
            const slotInfo = SLOT_LABELS[slot.slot_type] ?? { label: slot.slot_type, icon: "📣", desc: "" };
            const expired = isExpired(slot.ends_at);
            const displayStatus = expired && slot.status === "active" ? "expired" : slot.status;

            const statusStyle: Record<string, string> = {
              active:    "bg-[#10B981]/15 text-[#10B981]",
              paused:    "bg-[#F59E0B]/15 text-[#F59E0B]",
              expired:   "bg-[#6B7280]/15 text-[#6B7280]",
              cancelled: "bg-[#EF4444]/15 text-[#EF4444]",
            };

            return (
              <div key={slot.id} className="bg-[#111113] rounded-2xl border border-[#2A2A30] p-4 md:p-5">
                <div className="flex items-start gap-3 md:gap-4">
                  {/* Icon */}
                  <div className="w-10 h-10 rounded-xl bg-[#FF6A3D]/10 flex items-center justify-center text-lg shrink-0">
                    {slotInfo.icon}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[#FAFAFA] font-semibold text-sm">{slotInfo.label}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${statusStyle[displayStatus] ?? statusStyle.active}`}>
                        {displayStatus}
                      </span>
                    </div>

                    <p className="text-[#FAFAFA]/80 text-xs truncate">
                      🎭 {slot.events?.title ?? "Unknown"}{" "}
                      <span className="text-[#6B7280]">· {slot.events?.city}</span>
                    </p>
                    <p className="text-[#6B7280] text-xs truncate">
                      by {slot.profiles?.display_name ?? "—"} · {slot.profiles?.email}
                    </p>
                    <div className="flex items-center gap-3 flex-wrap pt-0.5">
                      <span className="text-[#6B7280] text-xs">
                        📅 {formatDate(slot.starts_at)} → {formatDate(slot.ends_at)}
                      </span>
                      <span className="text-[#F59E0B] text-xs font-semibold">
                        {formatPKR(slot.price_paid ?? 0)}
                      </span>
                    </div>
                  </div>

                  {/* Actions — stacked on mobile, inline on desktop */}
                  <div className="shrink-0">
                    <AdSlotActions slotId={slot.id} status={slot.status} isExpired={expired} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <p className="text-[#6B7280] text-xs">Showing {slots.length} slot{slots.length !== 1 ? "s" : ""}.</p>
    </div>
  );
}
