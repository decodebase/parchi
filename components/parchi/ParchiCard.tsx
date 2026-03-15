"use client";

import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import type { TicketWithEvent } from "@/lib/types/database";

interface ParchiCardProps {
  ticket: TicketWithEvent;
  className?: string;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-PK", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

const STATUS_CONFIG = {
  valid: {
    label: "Valid",
    dot: "bg-success",
    text: "text-success",
    bg: "bg-success/10",
  },
  used: {
    label: "Used",
    dot: "bg-muted",
    text: "text-muted",
    bg: "bg-surface2",
  },
  cancelled: {
    label: "Cancelled",
    dot: "bg-error",
    text: "text-error",
    bg: "bg-error/10",
  },
  refunded: {
    label: "Refunded",
    dot: "bg-warning",
    text: "text-warning",
    bg: "bg-warning/10",
  },
} as const;

export function ParchiCard({ ticket, className }: ParchiCardProps) {
  const event = ticket.events;
  const tier = ticket.ticket_tiers;
  const status = STATUS_CONFIG[ticket.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.valid;
  const isUsed = ticket.status === "used" || ticket.status === "cancelled";

  return (
    <Link href={`/my-parchi/${ticket.id}`} className="block group">
      <div
        className={cn(
          "relative bg-surface rounded-2xl border border-border/60 overflow-hidden transition-all duration-200",
          "hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5",
          isUsed && "opacity-60",
          className
        )}
      >
        {/* Ticket tear line */}
        <div className="absolute left-0 right-0 top-[88px] flex items-center pointer-events-none z-10">
          <div className="w-5 h-5 bg-background rounded-full -ml-2.5 shrink-0" />
          <div className="flex-1 border-t-2 border-dashed border-border/80" />
          <div className="w-5 h-5 bg-background rounded-full -mr-2.5 shrink-0" />
        </div>

        {/* Top: event cover */}
        <div className="relative h-[88px] bg-surface2 overflow-hidden">
          {event.cover_image ? (
            <Image
              src={event.cover_image}
              alt={event.title}
              fill
              className={cn("object-cover", isUsed ? "grayscale" : "group-hover:scale-[1.03] transition-transform duration-300")}
              sizes="(max-width: 640px) 100vw, 50vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface2 to-surface">
              <span className="text-4xl">🎭</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />

          {/* Status badge */}
          <div className={cn("absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold", status.bg, status.text)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", status.dot)} />
            {status.label}
          </div>
        </div>

        {/* Bottom: ticket info */}
        <div className="px-4 pt-5 pb-4 space-y-3">
          {/* Event name */}
          <div>
            <h3 className="font-bold text-text text-base leading-snug line-clamp-1">
              {event.title}
            </h3>
            <p className="text-muted text-xs mt-0.5 truncate">
              📍 {event.venue}, {event.city}
            </p>
          </div>

          {/* Details row */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-muted font-medium">Date</p>
              <p className="text-text text-xs font-semibold">{formatDate(event.event_date)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-muted font-medium">Time</p>
              <p className="text-text text-xs font-semibold">{formatTime(event.event_date)}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-muted font-medium">Tier</p>
              <p className="text-text text-xs font-semibold">{tier.name}</p>
            </div>
            <div className="space-y-0.5">
              <p className="text-[10px] uppercase tracking-wider text-muted font-medium">Price</p>
              <p className="text-primary text-xs font-bold">
                {tier.price === 0 ? "Free" : `PKR ${(tier.price / 100).toLocaleString()}`}
              </p>
            </div>
          </div>

          {/* Tap to view */}
          {!isUsed && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-muted text-[11px]">Tap to show QR code</p>
              <svg
                className="w-4 h-4 text-primary opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </div>
          )}

          {ticket.status === "used" && ticket.checked_in_at && (
            <p className="text-muted text-[11px] pt-1">
              ✅ Checked in {new Date(ticket.checked_in_at).toLocaleDateString("en-PK", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true })}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
