"use client";

export const runtime = 'edge';

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import { QRDisplay } from "@/components/parchi/QRDisplay";
import { cn } from "@/lib/utils/cn";
import type { TicketWithEvent } from "@/lib/types/database";
import { MapPin, Calendar, Clock, Tag, Ticket, CheckCircle2, XCircle, Maximize2 } from "lucide-react";

interface Props {
  params: Promise<{ ticketId: string }>;
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

export default function TicketDetailPage({ params }: Props) {
  const { ticketId } = use(params);
  const router = useRouter();

  const [ticket, setTicket] = useState<TicketWithEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [showFullscreen, setShowFullscreen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    Promise.resolve(supabase.auth.getUser()).then(({ data }) => {
      if (!data.user) { router.replace("/auth/login"); return; }

      // Fetch profile and ticket in parallel
      Promise.all([
        Promise.resolve(
          supabase.from("profiles").select("display_name").eq("id", data.user.id).single()
        ).then(({ data: profileRaw }) => {
          const profile = profileRaw as { display_name: string | null } | null;
          setUserName(profile?.display_name ?? undefined);
        }).catch(() => {}),
        Promise.resolve(
          supabase.from("tickets").select("*, events(*), ticket_tiers(*)")
            .eq("id", ticketId).eq("user_id", data.user.id).single()
        ).then(({ data: t, error }) => {
          if (error || !t) { router.replace("/my-parchi"); return; }
          setTicket(t as TicketWithEvent);
          setLoading(false);
        }).catch(() => { router.replace("/my-parchi"); }),
      ]);
    }).catch(() => { router.replace("/auth/login"); });
  }, [ticketId, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-surface2 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }
  if (!ticket) return null;

  const event = ticket.events;
  const tier = ticket.ticket_tiers;
  const isValid = ticket.status === "valid";
  const isUsed = ticket.status === "used";
  const shortId = ticket.id.slice(-8).toUpperCase();

  return (
    <>
      {/* Fullscreen QR overlay */}
      {showFullscreen && isValid && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex flex-col items-center justify-center px-6 gap-6"
          onClick={() => setShowFullscreen(false)}
        >
          <div className="flex flex-col items-center gap-4" onClick={e => e.stopPropagation()}>
            <p className="text-white/60 text-sm">Present at venue entrance</p>
            <div className="p-4 bg-black rounded-2xl shadow-2xl border border-white/10">
              <QRDisplay qrToken={ticket.qr_token} ticketId={ticket.id} />
            </div>
            <p className="text-white font-bold text-lg tracking-widest font-mono">#{shortId}</p>
            <button
              onClick={() => setShowFullscreen(false)}
              className="px-8 py-3 bg-white/10 border border-white/20 rounded-full text-white text-sm font-medium"
            >
              Close
            </button>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-background">
        {/* Back button */}
        <div className="px-4 pt-4 pb-2">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 bg-surface rounded-full border border-border flex items-center justify-center text-text hover:bg-surface2 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        </div>

        {/* The Ticket */}
        <div className="px-4 pb-8">
          <div
            className={cn(
              "relative bg-[#1A1A1E] rounded-3xl overflow-hidden border border-[#2A2A30] mx-auto max-w-sm",
              (isUsed || ticket.status === "cancelled") && "opacity-75 grayscale"
            )}
          >
            {/* ── TOP: Event Banner ── */}
            <div className="relative w-full h-48 bg-[#111114] overflow-hidden">
              {event.cover_image ? (
                <Image
                  src={event.cover_image}
                  alt={event.title}
                  fill
                  className="object-cover"
                  sizes="400px"
                  priority
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/5 flex items-center justify-center">
                  <Ticket className="w-16 h-16 text-primary/30" strokeWidth={1} />
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />

              {/* Status pill */}
              <div className="absolute top-3 right-3">
                <StatusBadge status={ticket.status} />
              </div>

              {/* Brand watermark */}
              <div className="absolute top-3 left-3">
                <span className="text-white/80 font-black text-sm tracking-tight">
                  parchi<span className="text-primary">.pk</span>
                </span>
              </div>

              {/* Event name over image */}
              <div className="absolute bottom-0 left-0 right-0 px-4 pb-3">
                <h1 className="text-white font-bold text-lg leading-tight line-clamp-2">{event.title}</h1>
              </div>
            </div>

            {/* ── EVENT DETAILS ── */}
            <div className="px-5 pt-4 pb-3 space-y-2.5">
              <div className="flex items-center gap-2 text-[#9CA3AF]">
                <MapPin size={13} className="text-primary shrink-0" />
                <span className="text-xs font-medium truncate">{event.venue}, {event.city}</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-[#9CA3AF]">
                  <Calendar size={13} className="text-primary shrink-0" />
                  <span className="text-xs font-medium">{formatDate(event.event_date)}</span>
                </div>
                <div className="flex items-center gap-2 text-[#9CA3AF]">
                  <Clock size={13} className="text-primary shrink-0" />
                  <span className="text-xs font-medium">{formatTime(event.event_date)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 text-[#9CA3AF]">
                <Tag size={13} className="text-primary shrink-0" />
                <span className="text-xs font-medium">{tier.name}</span>
                <span className="ml-auto text-primary font-bold text-sm">
                  {tier.price === 0 ? "Free" : `PKR ${(tier.price / 100).toLocaleString()}`}
                </span>
              </div>
            </div>

            {/* ── TEAR LINE ── */}
            <div className="relative flex items-center">
              <div className="w-6 h-6 bg-background rounded-full -ml-3 shrink-0" />
              <div className="flex-1 border-t-2 border-dashed border-[#2A2A30]" />
              <div className="w-6 h-6 bg-background rounded-full -mr-3 shrink-0" />
            </div>

            {/* ── QR CODE SECTION ── */}
            <div className="px-5 pt-5 pb-6 flex flex-col items-center gap-3">
              {isValid ? (
                <>
                  {/* QR Code */}
                  <button
                    onClick={() => setShowFullscreen(true)}
                    className="group relative p-3 bg-black border border-[#2A2A30] rounded-2xl hover:border-primary/40 transition-colors active:scale-[0.98]"
                    title="Tap to fullscreen"
                  >
                    <QRDisplay qrToken={ticket.qr_token} ticketId={ticket.id} />
                    <div className="absolute inset-0 rounded-2xl bg-primary/0 group-hover:bg-primary/5 transition-colors flex items-end justify-center pb-2 opacity-0 group-hover:opacity-100">
                      <span className="text-[10px] text-primary font-semibold bg-black px-2 py-0.5 rounded-full">
                        Tap to enlarge
                      </span>
                    </div>
                  </button>

                  {/* Holder name */}
                  <div className="text-center">
                    {userName && (
                      <p className="text-text font-bold text-base tracking-wide">{userName}</p>
                    )}
                    <div className="flex items-center gap-1.5 justify-center mt-1">
                      <Ticket size={11} className="text-muted" />
                      <p className="text-muted text-xs font-mono tracking-[0.2em] uppercase">
                        #{shortId}
                      </p>
                    </div>
                  </div>

                  <p className="text-muted text-[10px] text-center leading-relaxed max-w-[220px]">
                    Show this at venue entrance. Do not screenshot.
                  </p>
                </>
              ) : isUsed ? (
                <div className="py-8 flex flex-col items-center gap-2 text-center">
                  <CheckCircle2 size={44} className="text-success" strokeWidth={1.5} />
                  <p className="text-text font-bold">Ticket Used</p>
                  {ticket.checked_in_at && (
                    <p className="text-muted text-xs">
                      Checked in {new Date(ticket.checked_in_at).toLocaleDateString("en-PK", {
                        day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true,
                      })}
                    </p>
                  )}
                  <p className="text-muted text-xs font-mono tracking-widest mt-1">#{shortId}</p>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center gap-2 text-center">
                  <XCircle size={44} className="text-error" strokeWidth={1.5} />
                  <p className="text-text font-bold capitalize">{ticket.status}</p>
                  <p className="text-muted text-xs font-mono tracking-widest mt-1">#{shortId}</p>
                </div>
              )}
            </div>

            {/* ── BOTTOM STRIP ── */}
            <div className="bg-[#111114] px-5 py-3 flex items-center justify-between border-t border-[#2A2A30]">
              <span className="text-white/30 text-[10px] font-mono tracking-widest uppercase">
                {shortId}
              </span>
              <span className="text-white/30 text-[10px]">parchi.pk</span>
            </div>
          </div>

          {/* Fullscreen CTA */}
          {isValid && (
            <button
              onClick={() => setShowFullscreen(true)}
              className="w-full max-w-sm mx-auto mt-4 flex items-center justify-center gap-2 py-3.5 bg-primary text-white font-bold text-sm rounded-2xl hover:bg-primary/90 active:scale-[0.98] transition-all"
            >
              <Maximize2 size={16} />
              Show QR at Entrance (Fullscreen)
            </button>
          )}
        </div>
      </div>
    </>
  );
}

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { label: string; className: string }> = {
    valid:     { label: "✓ Valid",    className: "bg-success/90 text-white" },
    used:      { label: "Used",       className: "bg-black/50 text-white/80" },
    cancelled: { label: "Cancelled",  className: "bg-error/90 text-white" },
    refunded:  { label: "Refunded",   className: "bg-warning/90 text-white" },
  };
  const config = configs[status] ?? configs.valid;
  return (
    <span className={cn("px-2.5 py-1 rounded-full text-[11px] font-bold backdrop-blur-sm", config.className)}>
      {config.label}
    </span>
  );
}
