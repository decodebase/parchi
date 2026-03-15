"use client";

/**
 * app/admin/events/AdminEventDetail.tsx
 * Full-screen slide-over modal showing all event details for admin review.
 */

import Link from "next/link";
import { X, MapPin, Calendar, Clock, Ticket, Users, Tag } from "lucide-react";

interface Tier {
  id: string;
  name: string;
  price: number;
  total_quantity: number;
  sold_quantity: number;
  description?: string | null;
}

interface EventData {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  city: string;
  venue: string;
  address?: string | null;
  event_date: string;
  end_date?: string | null;
  cover_image?: string | null;
  category?: string | null;
  tags?: string[] | null;
  is_featured: boolean;
  created_at: string;
  profiles?: { display_name?: string | null; email?: string | null } | null;
  ticket_tiers?: Tier[];
}

interface Props {
  event: EventData;
  closeHref: string;
}

function fmt(d: string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-PK", opts ?? {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}
function fmtTime(d: string | null | undefined) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit", hour12: true });
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  draft:     { label: "Draft",     cls: "bg-[#6B7280]/15 text-[#6B7280]" },
  pending:   { label: "Pending",   cls: "bg-blue-400/15 text-blue-400" },
  approved:  { label: "Approved",  cls: "bg-[#FF6A3D]/15 text-[#FF6A3D]" },
  published: { label: "Live",      cls: "bg-[#10B981]/15 text-[#10B981]" },
  cancelled: { label: "Cancelled", cls: "bg-[#EF4444]/15 text-[#EF4444]" },
  completed: { label: "Done",      cls: "bg-[#6B7280]/15 text-[#6B7280]" },
};

export function AdminEventDetail({ event: e, closeHref }: Props) {
  const status = STATUS_MAP[e.status] ?? STATUS_MAP.draft;
  const tiers = e.ticket_tiers ?? [];
  const totalCap = tiers.reduce((s, t) => s + t.total_quantity, 0);
  const totalSold = tiers.reduce((s, t) => s + t.sold_quantity, 0);

  return (
    <>
      {/* Backdrop */}
      <Link
        href={closeHref}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
        aria-label="Close"
      />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full max-w-xl bg-[#0A0A0B] border-l border-[#2A2A30] z-50 overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-[#0A0A0B]/95 backdrop-blur-sm border-b border-[#2A2A30] px-5 py-4 flex items-center justify-between gap-3 z-10">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${status.cls}`}>
              {status.label}
            </span>
            <p className="text-[#FAFAFA] font-bold text-sm truncate">{e.title}</p>
          </div>
          <Link
            href={closeHref}
            className="w-8 h-8 rounded-full bg-[#1A1A1E] flex items-center justify-center text-[#6B7280] hover:text-[#FAFAFA] transition-colors shrink-0"
          >
            <X size={15} />
          </Link>
        </div>

        <div className="p-5 space-y-6">
          {/* Banner Image */}
          {e.cover_image ? (
            <div className="w-full aspect-video rounded-xl overflow-hidden bg-[#1A1A1E]">
              <img src={e.cover_image} alt={e.title} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-full aspect-video rounded-xl bg-[#1A1A1E] flex items-center justify-center">
              <p className="text-[#6B7280] text-sm">No banner image</p>
            </div>
          )}

          {/* Title + organiser */}
          <div className="space-y-2">
            <h2 className="text-[#FAFAFA] font-bold text-xl leading-snug">{e.title}</h2>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-[#1A1A1E] flex items-center justify-center text-xs font-bold text-[#FF6A3D]">
                {(e.profiles?.display_name ?? "?")[0].toUpperCase()}
              </div>
              <div>
                <p className="text-[#FAFAFA] text-xs font-medium">{e.profiles?.display_name ?? "—"}</p>
                <p className="text-[#6B7280] text-[11px]">{e.profiles?.email}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          {e.description && (
            <div className="space-y-1.5">
              <p className="text-[#6B7280] text-xs uppercase tracking-wider font-medium">Description</p>
              <p className="text-[#D1D5DB] text-sm leading-relaxed whitespace-pre-wrap">{e.description}</p>
            </div>
          )}

          {/* Key details grid */}
          <div className="grid grid-cols-2 gap-3">
            <DetailCard icon={MapPin} label="Venue" value={e.venue} sub={e.city} />
            <DetailCard icon={Calendar} label="Start" value={fmt(e.event_date)} sub={fmtTime(e.event_date)} />
            {e.end_date && (
              <DetailCard icon={Clock} label="End" value={fmt(e.end_date)} sub={fmtTime(e.end_date)} />
            )}
            {e.category && (
              <DetailCard icon={Tag} label="Category" value={e.category} />
            )}
            <DetailCard icon={Users} label="Capacity" value={`${totalSold} / ${totalCap}`} sub="sold / total" />
            <DetailCard icon={Ticket} label="Tiers" value={`${tiers.length}`} sub="ticket tier(s)" />
          </div>

          {/* Address */}
          {e.address && (
            <div className="p-3 bg-[#1A1A1E] rounded-xl border border-[#2A2A30]">
              <p className="text-[#6B7280] text-xs font-medium mb-1">Full Address</p>
              <p className="text-[#D1D5DB] text-sm">{e.address}</p>
            </div>
          )}

          {/* Ticket Tiers */}
          {tiers.length > 0 && (
            <div className="space-y-2">
              <p className="text-[#6B7280] text-xs uppercase tracking-wider font-medium">Ticket Tiers</p>
              <div className="bg-[#111113] rounded-xl border border-[#2A2A30] divide-y divide-[#2A2A30]/60 overflow-hidden">
                {tiers.map((tier) => {
                  const avail = tier.total_quantity - tier.sold_quantity;
                  const pct = tier.total_quantity > 0 ? (tier.sold_quantity / tier.total_quantity) * 100 : 0;
                  return (
                    <div key={tier.id} className="p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[#FAFAFA] font-semibold text-sm">{tier.name}</p>
                          {tier.description && (
                            <p className="text-[#6B7280] text-xs mt-0.5">{tier.description}</p>
                          )}
                        </div>
                        <p className="text-[#FF6A3D] font-bold text-sm">
                          {tier.price === 0 ? "Free" : `PKR ${(tier.price / 100).toLocaleString()}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-[#2A2A30] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#FF6A3D] rounded-full"
                            style={{ width: `${Math.min(100, pct)}%` }}
                          />
                        </div>
                        <p className="text-[#6B7280] text-xs shrink-0">
                          {tier.sold_quantity} sold · {avail} left
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Tags */}
          {e.tags && e.tags.length > 0 && (
            <div className="space-y-2">
              <p className="text-[#6B7280] text-xs uppercase tracking-wider font-medium">Tags</p>
              <div className="flex flex-wrap gap-1.5">
                {e.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2.5 py-1 bg-[#1A1A1E] text-[#9CA3AF] rounded-full border border-[#2A2A30]">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* View public page */}
          <a
            href={`/events/${e.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 bg-[#1A1A1E] border border-[#2A2A30] text-[#FAFAFA] text-sm font-semibold rounded-xl hover:bg-[#2A2A30] transition-colors"
          >
            View Public Event Page ↗
          </a>

          <p className="text-[#6B7280] text-xs text-center">
            Submitted {new Date(e.created_at).toLocaleDateString("en-PK", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      </div>
    </>
  );
}

function DetailCard({
  icon: Icon, label, value, sub,
}: {
  icon: React.ElementType; label: string; value: string; sub?: string;
}) {
  return (
    <div className="p-3 bg-[#1A1A1E] rounded-xl border border-[#2A2A30] space-y-1">
      <div className="flex items-center gap-1.5 text-[#6B7280]">
        <Icon size={12} />
        <p className="text-[10px] uppercase tracking-wider font-medium">{label}</p>
      </div>
      <p className="text-[#FAFAFA] text-sm font-semibold capitalize leading-snug">{value}</p>
      {sub && <p className="text-[#6B7280] text-xs">{sub}</p>}
    </div>
  );
}
