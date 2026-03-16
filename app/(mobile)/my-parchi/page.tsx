import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { EmptyState } from "@/components/ui/EmptyState";
import type { TicketWithEvent } from "@/lib/types/database";
import type { Metadata } from "next";
import { Ticket, MapPin, Calendar, Clock, Tag } from "lucide-react";
import Image from "next/image";

export const runtime = 'edge';
export const metadata: Metadata = { title: "My Parchi — Tickets" };

type TabKey = "valid" | "used";

async function getUserTickets(userId: string): Promise<TicketWithEvent[]> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("tickets")
      .select("*, events(*), ticket_tiers(*)")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) return [];
    // Filter out any tickets with null events or tiers (orphaned rows)
    return (data ?? []).filter((t: any) => t.events && t.ticket_tiers) as TicketWithEvent[];
  } catch {
    return [];
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-PK", {
    weekday: "short", day: "numeric", month: "short", year: "numeric",
  });
}
function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-PK", {
    hour: "numeric", minute: "2-digit", hour12: true,
  });
}

function TicketPreviewCard({ ticket }: { ticket: TicketWithEvent }) {
  const event = ticket.events;
  const tier = ticket.ticket_tiers;
  const shortId = ticket.id.slice(-8).toUpperCase();
  const isValid = ticket.status === "valid";
  const isUsed = ticket.status === "used";
  const isCancelled = ticket.status === "cancelled" || ticket.status === "refunded";

  const statusConfig: Record<string, { label: string; cls: string }> = {
    valid:     { label: "✓ Valid",    cls: "bg-success/90 text-white" },
    used:      { label: "Used",       cls: "bg-black/50 text-white/80" },
    cancelled: { label: "Cancelled",  cls: "bg-red-500/90 text-white" },
    refunded:  { label: "Refunded",   cls: "bg-yellow-500/90 text-white" },
  };
  const status = statusConfig[ticket.status] ?? statusConfig.valid;

  return (
    <Link href={`/my-parchi/${ticket.id}`} className="block active:scale-[0.98] transition-transform">
      <div className={`bg-[#1A1A1E] rounded-3xl overflow-hidden border border-[#2A2A30] ${isCancelled || isUsed ? "opacity-70 grayscale" : ""}`}>

        {/* ── Banner ── */}
        <div className="relative w-full h-36 bg-[#111114] overflow-hidden">
          {event.cover_image ? (
            <Image src={event.cover_image} alt={event.title} fill className="object-cover" sizes="400px" />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center">
              <Ticket className="w-10 h-10 text-primary/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

          {/* Brand */}
          <div className="absolute top-3 left-3">
            <span className="text-white/80 font-black text-xs tracking-tight">
              parchi<span className="text-primary">.pk</span>
            </span>
          </div>

          {/* Status */}
          <div className="absolute top-3 right-3">
            <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${status.cls}`}>
              {status.label}
            </span>
          </div>

          {/* Event title */}
          <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
            <h3 className="text-white font-bold text-base leading-tight line-clamp-1">{event.title}</h3>
          </div>
        </div>

        {/* ── Event details ── */}
        <div className="px-4 pt-3 pb-2 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[#9CA3AF]">
            <MapPin size={11} className="text-primary shrink-0" />
            <span className="text-xs truncate">{event.venue}, {event.city}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-[#9CA3AF]">
              <Calendar size={11} className="text-primary shrink-0" />
              <span className="text-xs">{formatDate(event.event_date)}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#9CA3AF]">
              <Clock size={11} className="text-primary shrink-0" />
              <span className="text-xs">{formatTime(event.event_date)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-[#9CA3AF]">
            <Tag size={11} className="text-primary shrink-0" />
            <span className="text-xs">{tier.name}</span>
            <span className="ml-auto text-primary font-bold text-xs">
              {tier.price === 0 ? "Free" : `PKR ${(tier.price / 100).toLocaleString()}`}
            </span>
          </div>
        </div>

        {/* ── Tear line ── */}
        <div className="relative flex items-center mx-0">
          <div className="w-5 h-5 bg-[#111114] rounded-full -ml-2.5 shrink-0" />
          <div className="flex-1 border-t-2 border-dashed border-[#2A2A30]" />
          <div className="w-5 h-5 bg-[#111114] rounded-full -mr-2.5 shrink-0" />
        </div>

        {/* ── Bottom: ticket number + tap hint ── */}
        <div className="px-4 py-3 flex items-center justify-between">
          <span className="text-[#555] text-[11px] font-mono tracking-[0.15em]">#{shortId}</span>
          {isValid && (
            <span className="text-primary text-[11px] font-semibold flex items-center gap-1">
              Tap to view QR →
            </span>
          )}
          {isUsed && ticket.checked_in_at && (
            <span className="text-[#666] text-[11px]">
              ✅ Checked in {new Date(ticket.checked_in_at).toLocaleDateString("en-PK", { day: "numeric", month: "short" })}
            </span>
          )}
          {isCancelled && (
            <span className="text-[#666] text-[11px] capitalize">{ticket.status}</span>
          )}
        </div>
      </div>
    </Link>
  );
}

export default async function MyParchiPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login?redirect=/my-parchi");

  const { tab } = await searchParams;
  const activeTab: TabKey = tab === "used" ? "used" : "valid";

  let tickets: TicketWithEvent[] = [];
  try { tickets = await getUserTickets(user.id); } catch {}

  const valid = tickets.filter(t => t.status === "valid");
  const used  = tickets.filter(t => t.status === "used" || t.status === "cancelled" || t.status === "refunded");
  const shown = activeTab === "valid" ? valid : used;

  return (
    <div className="px-4 py-4 pb-12 bg-background min-h-screen">
      {/* Header */}
      <div className="pt-2 flex items-center gap-3 mb-5">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Ticket className="w-5 h-5 text-primary" strokeWidth={2} />
        </div>
        <div>
          <p className="text-muted text-xs font-medium">Your tickets</p>
          <h1 className="text-text text-2xl font-bold leading-tight">My Parchi</h1>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-border mb-5">
        <Link
          href="/my-parchi"
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === "valid"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-text"
          }`}
        >
          Valid
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            activeTab === "valid" ? "bg-primary/20 text-primary" : "bg-surface2 text-muted"
          }`}>{valid.length}</span>
        </Link>
        <Link
          href="/my-parchi?tab=used"
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
            activeTab === "used"
              ? "border-primary text-primary"
              : "border-transparent text-muted hover:text-text"
          }`}
        >
          Used
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            activeTab === "used" ? "bg-primary/20 text-primary" : "bg-surface2 text-muted"
          }`}>{used.length}</span>
        </Link>
      </div>

      {/* Content */}
      {tickets.length === 0 ? (
        <div className="bg-surface rounded-3xl p-8 border border-border">
          <EmptyState
            icon={<Ticket className="w-7 h-7 text-muted" strokeWidth={1.5} />}
            title="No Parchi yet"
            description="Tickets you purchase will appear here. Go discover something happening near you!"
          />
        </div>
      ) : shown.length === 0 ? (
        <div className="py-16 text-center space-y-2">
          <Ticket className="w-10 h-10 mx-auto text-muted" strokeWidth={1.5} />
          <p className="text-text font-semibold">No {activeTab} tickets</p>
          <p className="text-muted text-sm">
            {activeTab === "valid" ? "Purchase a ticket to see it here." : "Tickets you've used will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {shown.map(t => <TicketPreviewCard key={t.id} ticket={t} />)}
        </div>
      )}
    </div>
  );
}


