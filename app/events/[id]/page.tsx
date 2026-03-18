import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { CategoryBadge } from "@/components/ui/Badge";
import type { Metadata } from "next";
import type { EventWithTiers, TicketTier, Profile } from "@/lib/types/database";
import EventHero from "@/components/ui/EventHero";
import { CalendarDays, Clock, MapPin, Building2, User } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

export const runtime = 'edge';

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const supabase = await createClient();
  const { data: eventRaw } = await supabase
    .from("events")
    .select("title, description, cover_image, venue, city")
    .eq("id", id)
    .maybeSingle();
  const event = eventRaw as { title: string; description: string | null; cover_image: string | null; venue: string; city: string } | null;

  if (!event) return { title: "Event Not Found — Parchi" };

  return {
    title: `${event.title} — Parchi`,
    description: event.description ?? `${event.title} at ${event.venue}, ${event.city}`,
    openGraph: event.cover_image
      ? { images: [{ url: event.cover_image }] }
      : undefined,
  };
}


type EventWithTiersAndOrganiser = EventWithTiers & {
  profiles: Pick<Profile, "display_name" | "avatar_url"> | null;
  promo_video_url: string | null;
};

async function getEvent(id: string): Promise<EventWithTiersAndOrganiser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*, ticket_tiers(*), profiles(display_name, avatar_url)")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as EventWithTiersAndOrganiser;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-PK", {
    weekday: "long",
    day: "numeric",
    month: "long",
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

function TicketPanel({ tiers, eventId }: { tiers: TicketTier[]; eventId: string }) {
  const cheapestAvailable = tiers.find(t => t.sold_quantity < t.total_quantity);
  const allSoldOut = tiers.every(t => t.sold_quantity >= t.total_quantity);

  return (
    <div className="relative flex items-stretch rounded-2xl overflow-hidden border border-border/60 bg-[#111114]">

      {/* Left — tier list */}
      <div className="flex-1 py-3 px-4 space-y-1.5 min-w-0">
        {tiers.map((tier) => {
          const available = tier.total_quantity - tier.sold_quantity;
          const soldOut = available <= 0;
          const isFree = tier.price === 0;
          const lowStock = !soldOut && available <= 10;
          return (
            <div key={tier.id} className="flex items-center justify-between gap-2">
              <p className={`text-xs font-medium truncate ${
                soldOut ? "text-muted line-through" : "text-text"
              }`}>
                {tier.name}
              </p>
              <div className="flex items-center gap-1.5 shrink-0">
                {lowStock && (
                  <span className="text-[9px] font-bold text-warning bg-warning/10 px-1.5 py-0.5 rounded-full">
                    {available} left
                  </span>
                )}
                {soldOut && (
                  <span className="text-[9px] font-medium text-muted bg-surface2 px-1.5 py-0.5 rounded-full">
                    Sold out
                  </span>
                )}
                <p className={`text-xs font-bold ${
                  soldOut ? "text-muted" : isFree ? "text-success" : "text-primary"
                }`}>
                  {isFree ? "Free" : `PKR ${(tier.price / 100).toLocaleString()}`}
                </p>
              </div>
            </div>
          );
        })}

      </div>

      {/* Tear line */}
      <div className="relative flex flex-col items-center justify-center w-5 shrink-0">
        <div className="absolute top-0 w-4 h-4 bg-background rounded-full -mt-2" />
        <div className="flex-1 border-l-2 border-dashed border-border/50" />
        <div className="absolute bottom-0 w-4 h-4 bg-background rounded-full -mb-2" />
      </div>

      {/* Right — CTA */}
      <div className="flex items-center justify-center px-4 py-3 shrink-0">
        {allSoldOut ? (
          <div className="px-4 py-2.5 rounded-xl bg-surface2 border border-border text-muted text-xs font-semibold">
            Sold Out
          </div>
        ) : (
          <Link
            href={`/checkout/${eventId}${cheapestAvailable ? `?tierId=${cheapestAvailable.id}` : ""}`}
            className="px-5 py-2.5 bg-primary text-white text-xs font-bold rounded-xl hover:bg-primary/90 active:scale-[0.97] transition-all whitespace-nowrap"
          >
            Get Parchi
          </Link>
        )}
      </div>
    </div>
  );
}

export default async function EventDetailPage({ params }: Props) {
  const { id } = await params;
  const event = await getEvent(id);

  if (!event) notFound();

  // Sort tiers by price ascending
  const tiers = [...(event.ticket_tiers ?? [])].sort((a, b) => a.price - b.price);
  const organiser = event.profiles;

  const allSoldOut = tiers.length > 0 && tiers.every((t) => t.sold_quantity >= t.total_quantity);
  const isPast = new Date(event.event_date) < new Date();

  return (
    <div className="min-h-screen bg-background">
      {/* ── Hero: video autoplay → fades to banner image ── */}
      <EventHero
        videoUrl={event.promo_video_url ?? null}
        imageUrl={event.cover_image ?? null}
        title={event.title}
      />

      {/* ── Content ── */}
      <div className="max-w-2xl mx-auto px-4 pb-32 space-y-6 -mt-6 relative z-10">
        {/* Category + title */}
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {event.category && <CategoryBadge category={event.category} />}
            {(event.tags ?? []).filter(tag => [
              "music", "food", "sports", "arts", "comedy", "nightlife",
              "festival", "networking", "conference", "family", "general", "tech",
            ].includes(tag) && tag !== event.category).map(tag => (
              <CategoryBadge key={tag} category={tag} />
            ))}
          </div>
          <h1 className="text-text font-bold text-2xl leading-tight">{event.title}</h1>
        </div>

        {/* Quick info cards */}
        <div className="grid grid-cols-2 gap-3">
          <InfoCard icon={CalendarDays} label="Date" value={formatDate(event.event_date)} />
          <InfoCard icon={Clock} label="Time" value={formatTime(event.event_date)} />
          <InfoCard icon={MapPin} label="Venue" value={event.venue} />
          <InfoCard icon={Building2} label="City" value={event.city} />
        </div>

        {/* Organiser */}
        {organiser && (
          <div className="flex items-center gap-3 p-3 bg-surface rounded-xl border border-border/40">
            <div className="relative w-9 h-9 rounded-full overflow-hidden bg-surface2 shrink-0">
              {organiser.avatar_url ? (
                <Image src={organiser.avatar_url} alt={organiser.display_name ?? "Organiser"} fill className="object-cover" sizes="36px" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                <User size={16} className="text-muted" />
              </div>
              )}
            </div>
            <div>
              <p className="text-[10px] text-muted uppercase tracking-wider font-medium">Organised by</p>
              <p className="text-text text-sm font-semibold">{organiser.display_name ?? "Unknown"}</p>
            </div>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="space-y-2">
            <h2 className="text-text font-bold text-base">About this event</h2>
            <p className="text-subtle text-sm leading-relaxed whitespace-pre-line">{event.description}</p>
          </div>
        )}

        {/* Tags — exclude secondary categories (already shown as badges above) */}
        {event.tags && event.tags.filter(tag => ![
          "music", "food", "sports", "arts", "comedy", "nightlife",
          "festival", "networking", "conference", "family", "general", "tech",
        ].includes(tag)).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {event.tags.filter(tag => ![
              "music", "food", "sports", "arts", "comedy", "nightlife",
              "festival", "networking", "conference", "family", "general", "tech",
            ].includes(tag)).map((tag) => (
              <span
                key={tag}
                className="text-xs px-3 py-1 bg-surface2 text-muted border border-border/40 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Ticket Tiers */}
        <div className="space-y-3">
          <h2 className="text-text font-bold text-base">
            {isPast ? "Event has ended" : allSoldOut ? "Sold Out" : "Get Your Parchi"}
          </h2>

          {isPast ? (
            <p className="text-muted text-sm">This event has already taken place.</p>
          ) : tiers.length === 0 ? (
            <p className="text-muted text-sm">No tickets available for this event.</p>
          ) : (
            <TicketPanel tiers={tiers} eventId={event.id} />
          )}
        </div>
      </div>
    </div>
  );
}

function InfoCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="p-3 bg-surface rounded-xl border border-border/40 space-y-0.5">
      <div className="flex items-center gap-1.5">
        <Icon size={12} className="text-muted" />
        <p className="text-[10px] uppercase tracking-wider text-muted font-medium">{label}</p>
      </div>
      <p className="text-text text-xs font-semibold leading-snug line-clamp-2">{value}</p>
    </div>
  );
}
