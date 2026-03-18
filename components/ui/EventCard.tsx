"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin, Calendar, Clock } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { Event, TicketTier } from "@/lib/types/database";

interface EventCardProps {
  event: Event & { ticket_tiers?: TicketTier[] };
  className?: string;
  variant?: "default" | "featured" | "compact" | "horizontal";
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}
function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-PK", { hour: "numeric", minute: "2-digit", hour12: true });
}
function formatPrice(tiers?: TicketTier[]) {
  if (!tiers || !tiers.length) return "Free";
  const min = Math.min(...tiers.map(t => t.price));
  const max = Math.max(...tiers.map(t => t.price));
  if (min === 0) return "Free";
  if (min === max) return `PKR ${(min / 100).toLocaleString()}`;
  return `PKR ${(min / 100).toLocaleString()}+`;
}
function isSoldOut(tiers?: TicketTier[]) {
  if (!tiers || !tiers.length) return false;
  return tiers.every(t => t.sold_quantity >= t.total_quantity);
}

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  music:      { bg: "rgba(139,92,246,0.15)", text: "#A78BFA" },
  food:       { bg: "rgba(255,106,61,0.15)", text: "#FF6A3D" },
  sports:     { bg: "rgba(16,185,129,0.15)", text: "#10B981" },
  arts:       { bg: "rgba(236,72,153,0.15)", text: "#F472B6" },
  comedy:     { bg: "rgba(245,158,11,0.15)", text: "#FBBF24" },
  nightlife:  { bg: "rgba(99,102,241,0.15)", text: "#818CF8" },
  festival:   { bg: "rgba(239,68,68,0.15)",  text: "#F87171" },
  networking: { bg: "rgba(59,130,246,0.15)", text: "#60A5FA" },
  conference: { bg: "rgba(107,114,128,0.15)",text: "#9CA3AF" },
  family:     { bg: "rgba(20,184,166,0.15)", text: "#2DD4BF" },
  general:    { bg: "rgba(107,114,128,0.15)",text: "#9CA3AF" },
};

function getEventCategories(event: Event & { ticket_tiers?: TicketTier[] }): string[] {
  return event.categories ?? [];
}

function CategoryPill({ category }: { category: string }) {
  const c = CATEGORY_COLORS[category] ?? CATEGORY_COLORS.general;
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize" style={{ background: c.bg, color: c.text }}>
      {category}
    </span>
  );
}

function CategoryPills({ event }: { event: Event & { ticket_tiers?: TicketTier[] } }) {
  const cats = getEventCategories(event);
  if (cats.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1">
      {cats.map(cat => <CategoryPill key={cat} category={cat} />)}
    </div>
  );
}

function NoImage() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-surface2">
      <Calendar className="w-10 h-10 text-border" strokeWidth={1} />
    </div>
  );
}

export function EventCard({ event, className, variant = "default" }: EventCardProps) {
  const price   = formatPrice(event.ticket_tiers);
  const soldOut = isSoldOut(event.ticket_tiers);

  if (variant === "featured")   return <FeaturedCard   event={event} price={price} soldOut={soldOut} className={className} />;
  if (variant === "compact")    return <CompactCard    event={event} price={price} soldOut={soldOut} className={className} />;
  if (variant === "horizontal") return <HorizontalCard event={event} price={price} soldOut={soldOut} className={className} />;
  return <DefaultCard event={event} price={price} soldOut={soldOut} className={className} />;
}

interface InternalProps {
  event: Event & { ticket_tiers?: TicketTier[] };
  price: string; soldOut: boolean; className?: string;
}

// ── Default ───────────────────────────────────────────────────────────────────
function DefaultCard({ event, price, soldOut, className }: InternalProps) {
  return (
    <Link href={`/events/${event.id}`} className="block group">
      <div className={cn("bg-surface rounded-2xl overflow-hidden border border-border/60 card-hover", className)}>
        <div className="relative w-full aspect-video bg-surface2 overflow-hidden">
          {event.cover_image
            ? <Image src={event.cover_image} alt={event.title} fill className="object-cover group-hover:scale-[1.03] transition-transform duration-500" sizes="(max-width:640px) 100vw, 50vw" />
            : <NoImage />
          }
          {event.is_featured && (
            <span className="absolute top-2 left-2 bg-primary text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide">Featured</span>
          )}
          {soldOut && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
              <span className="text-white font-black text-sm tracking-widest uppercase">Sold Out</span>
            </div>
          )}
        </div>
        <div className="p-4 flex flex-col" style={{ minHeight: "148px" }}>
          <CategoryPills event={event} />
          <h3 className="font-semibold text-text text-base leading-snug line-clamp-1 group-hover:text-primary transition-colors mt-2 mb-2">
            {event.title}
          </h3>
          <div className="space-y-1 flex-1">
            <p className="text-muted text-xs flex items-center gap-1.5">
              <MapPin className="w-3 h-3 shrink-0" strokeWidth={2} />
              <span className="truncate">{event.venue}, {event.city}</span>
            </p>
            <p className="text-muted text-xs flex items-center gap-1.5">
              <Calendar className="w-3 h-3 shrink-0" strokeWidth={2} />
              {formatDate(event.event_date)}
              <Clock className="w-3 h-3 shrink-0 ml-1" strokeWidth={2} />
              {formatTime(event.event_date)}
            </p>
          </div>
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/40">
            <span className={cn("font-bold text-sm", soldOut ? "text-muted line-through" : "text-primary")}>{price}</span>
            <span className={cn(
              "text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors",
              soldOut ? "bg-surface2 text-muted" : "bg-primary-muted text-primary group-hover:bg-primary group-hover:text-white"
            )}>
              {soldOut ? "Sold Out" : "Get Parchi"}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Featured ──────────────────────────────────────────────────────────────────
function FeaturedCard({ event, price, soldOut, className }: InternalProps) {
  return (
    <Link href={`/events/${event.id}`} className="block group">
      <div className={cn("relative rounded-2xl overflow-hidden aspect-[4/3]", className)}>
        {event.cover_image
          ? <Image src={event.cover_image} alt={event.title} fill className="object-cover group-hover:scale-[1.02] transition-transform duration-500" sizes="85vw" priority />
          : <NoImage />
        }
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5 space-y-2">
          <CategoryPills event={event} />
          <h2 className="font-bold text-white text-lg leading-tight line-clamp-2">{event.title}</h2>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-white/70 text-xs flex items-center gap-1">
                <MapPin className="w-3 h-3" strokeWidth={2} />{event.venue}, {event.city}
              </p>
              <p className="text-white/70 text-xs flex items-center gap-1">
                <Calendar className="w-3 h-3" strokeWidth={2} />{formatDate(event.event_date)}
              </p>
            </div>
            <span className={cn("font-bold text-sm px-3 py-1.5 rounded-xl shrink-0 ml-3", soldOut ? "bg-white/20 text-white/60" : "bg-primary text-white")}>
              {soldOut ? "Sold Out" : price}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ── Compact ───────────────────────────────────────────────────────────────────
function CompactCard({ event, price, soldOut, className }: InternalProps) {
  return (
    <Link href={`/events/${event.id}`} className="block group">
      <div className={cn("flex gap-3 p-3 bg-surface rounded-2xl border border-border/60 card-hover", className)}>
        <div className="relative w-20 h-20 rounded-xl overflow-hidden bg-surface2 shrink-0">
          {event.cover_image ? <Image src={event.cover_image} alt={event.title} fill className="object-cover" sizes="80px" /> : <NoImage />}
        </div>
        <div className="flex flex-col justify-center gap-1 min-w-0 flex-1">
          <h3 className="font-semibold text-text text-sm line-clamp-1">{event.title}</h3>
          <p className="text-muted text-xs flex items-center gap-1 truncate"><MapPin className="w-3 h-3 shrink-0" strokeWidth={2} />{event.venue}, {event.city}</p>
          <p className="text-muted text-xs flex items-center gap-1"><Calendar className="w-3 h-3 shrink-0" strokeWidth={2} />{formatDate(event.event_date)}</p>
          <span className={cn("text-xs font-bold", soldOut ? "text-muted" : "text-primary")}>{price}</span>
        </div>
      </div>
    </Link>
  );
}

// ── Horizontal ────────────────────────────────────────────────────────────────
function HorizontalCard({ event, price, soldOut, className }: InternalProps) {
  return (
    <Link href={`/events/${event.id}`} className="block group">
      <div className={cn("flex gap-4 p-4 bg-surface rounded-2xl border border-border/60 card-hover", className)}>
        <div className="relative w-28 h-28 rounded-xl overflow-hidden bg-surface2 shrink-0">
          {event.cover_image ? <Image src={event.cover_image} alt={event.title} fill className="object-cover" sizes="112px" /> : <NoImage />}
        </div>
        <div className="flex flex-col justify-between min-w-0 flex-1 py-0.5">
          <div className="space-y-1">
            <CategoryPills event={event} />
            <h3 className="font-semibold text-text text-base line-clamp-1">{event.title}</h3>
            <p className="text-muted text-xs flex items-center gap-1"><MapPin className="w-3 h-3 shrink-0" strokeWidth={2} />{event.venue}, {event.city}</p>
            <p className="text-muted text-xs flex items-center gap-1"><Calendar className="w-3 h-3 shrink-0" strokeWidth={2} />{formatDate(event.event_date)} · {formatTime(event.event_date)}</p>
          </div>
          <span className={cn("text-sm font-bold", soldOut ? "text-muted" : "text-primary")}>{soldOut ? "Sold Out" : price}</span>
        </div>
      </div>
    </Link>
  );
}
