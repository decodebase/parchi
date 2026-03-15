/**
 * app/(desktop)/dashboard/promote/page.tsx — Mobile-responsive
 */

import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import type { Metadata } from "next";
import type { Event, FeaturedSlot, SlotType } from "@/lib/types/database";
import { Trophy, Star, Pin, TrendingUp, Megaphone, CalendarDays, MapPin, CheckCircle2, PlusCircle } from "lucide-react";

export const runtime = 'edge';
export const metadata: Metadata = { title: "Promote Events — Dashboard" };

const SLOT_ICONS: Record<SlotType, React.ElementType> = {
  homepage_hero: Trophy,
  homepage_grid: Star,
  category_top:  Pin,
  search_boost:  TrendingUp,
};

const SLOT_CONFIG: Record<SlotType, { label: string; description: string; price: number }> = {
  homepage_hero: { label: "Homepage Hero",  description: "Top carousel — highest visibility", price: 500000 },
  homepage_grid: { label: "Homepage Grid",  description: "Featured grid on home feed",        price: 200000 },
  category_top:  { label: "Category Top",   description: "Pinned at top of category pages",   price: 150000 },
  search_boost:  { label: "Search Boost",   description: "Appears first in search results",   price: 100000 },
};

function formatPKR(paisas: number) {
  return `PKR ${(paisas / 100).toLocaleString("en-PK")}`;
}
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
}

export default async function PromotePage({ searchParams }: { searchParams: Promise<{ eventId?: string }> }) {
  const { eventId: eventIdParam } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: eventsData } = await supabase
    .from("events")
    .select("id, title, event_date, cover_image, city, venue")
    .eq("organiser_id", user.id)
    .eq("status", "published")
    .gte("event_date", new Date().toISOString())
    .order("event_date", { ascending: true });

  const events = (eventsData ?? []) as Event[];
  const selectedEventId = eventIdParam ?? events[0]?.id ?? null;
  const selectedEvent = events.find((e) => e.id === selectedEventId) ?? null;

  const { data: slotsData } = selectedEventId
    ? await supabase.from("featured_slots").select("*").eq("event_id", selectedEventId).in("status", ["active", "paused"])
    : { data: [] };

  const activeSlots = (slotsData ?? []) as FeaturedSlot[];
  const activeSlotTypes = new Set(activeSlots.map((s) => s.slot_type));

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
          <Megaphone className="w-5 h-5" style={{ color: "#FF6A3D" }} strokeWidth={2} />
        </div>
        <div>
          <h1 className="text-text font-bold text-xl leading-tight">Promote Your Events</h1>
          <p className="text-muted text-sm">Get more visibility with featured placements across the app.</p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="py-20 flex flex-col items-center gap-4 bg-surface rounded-xl border border-border/40 text-center px-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Megaphone className="w-7 h-7 text-primary" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <p className="text-text font-bold">No upcoming events to promote</p>
            <p className="text-muted text-sm">Create and publish an event first.</p>
          </div>
          <Link
            href="/dashboard/events/new"
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors"
          >
            <PlusCircle className="w-4 h-4" /> Create Event
          </Link>
        </div>
      ) : (
        <>
          {/* Event selector — chips on mobile, sidebar on desktop */}
          <div>
            <p className="text-text font-semibold text-sm mb-3">Choose Event</p>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide lg:hidden -mx-4 px-4">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/dashboard/promote?eventId=${event.id}`}
                  className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl border text-sm transition-colors ${
                    selectedEventId === event.id
                      ? "border-primary bg-primary-muted text-primary"
                      : "border-border bg-surface text-text"
                  }`}
                >
                  <span className="font-medium whitespace-nowrap max-w-[160px] truncate">{event.title}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Desktop sidebar event list */}
            <div className="hidden lg:block space-y-2">
              {events.map((event) => (
                <Link
                  key={event.id}
                  href={`/dashboard/promote?eventId=${event.id}`}
                  className={`block p-3.5 rounded-xl border text-sm transition-all ${
                    selectedEventId === event.id
                      ? "border-primary bg-primary-muted"
                      : "border-border bg-surface hover:border-primary/30"
                  }`}
                >
                  <p className={`font-semibold leading-snug ${selectedEventId === event.id ? "text-primary" : "text-text"}`}>
                    {event.title}
                  </p>
                  <p className="text-muted text-xs mt-0.5 flex items-center gap-1">
                    <CalendarDays className="w-3 h-3" /> {formatDate(event.event_date)}
                  </p>
                  <p className="text-muted text-xs flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {event.venue}, {event.city}
                  </p>
                </Link>
              ))}
            </div>

            {/* Promo slots */}
            <div className="lg:col-span-2 space-y-4">
              {!selectedEvent ? (
                <div className="py-16 text-center bg-surface rounded-xl border border-border/40">
                  <p className="text-muted">Select an event to see promotion options</p>
                </div>
              ) : (
                <>
                  <p className="text-text font-semibold text-sm">
                    Slots for &quot;{selectedEvent.title}&quot;
                  </p>

                  {/* Active promotions */}
                  {activeSlots.length > 0 && (
                    <div className="bg-success/5 border border-success/20 rounded-xl overflow-hidden">
                      <div className="px-4 py-3 border-b border-success/20 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-success" />
                        <p className="text-success text-sm font-semibold">Active Promotions</p>
                      </div>
                      <div className="divide-y divide-success/10">
                        {activeSlots.map((slot) => {
                          const slotType = slot.slot_type as SlotType;
                          const config = SLOT_CONFIG[slotType];
                          const SlotIcon = SLOT_ICONS[slotType];
                          return (
                            <div key={slot.id} className="flex items-center justify-between px-4 py-3 gap-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                  <SlotIcon className="w-4 h-4 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-text text-sm font-semibold">{config.label}</p>
                                  <p className="text-muted text-xs">{formatDate(slot.starts_at)} → {formatDate(slot.ends_at)}</p>
                                </div>
                              </div>
                              <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                                slot.status === "active" ? "bg-success/15 text-success" : "bg-warning/15 text-warning"
                              }`}>
                                {slot.status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Slot cards */}
                  <div className="space-y-3">
                    {(Object.entries(SLOT_CONFIG) as [SlotType, typeof SLOT_CONFIG[SlotType]][]).map(([type, config]) => {
                      const isActive = activeSlotTypes.has(type);
                      const SlotIcon = SLOT_ICONS[type];
                      return (
                        <div
                          key={type}
                          className={`p-4 md:p-5 rounded-xl border transition-all ${
                            isActive ? "border-success/30 bg-success/5 opacity-60" : "border-border/60 bg-surface hover:border-primary/30"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                                <SlotIcon className="w-4 h-4 text-primary" />
                              </div>
                              <div>
                                <p className="font-bold text-text text-sm">{config.label}</p>
                                <p className="text-muted text-xs mt-0.5 leading-relaxed">{config.description}</p>
                              </div>
                            </div>
                            <div className="shrink-0 text-right space-y-1.5">
                              <p className="font-bold text-primary text-sm">{formatPKR(config.price)}</p>
                              <p className="text-muted text-xs">/ 7 days</p>
                              {isActive ? (
                                <span className="inline-block text-xs text-success font-medium">Active</span>
                              ) : (
                                <BookSlotButton eventId={selectedEventId!} slotType={type} price={config.price} />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="p-4 bg-surface2 rounded-xl border border-border/40 text-center">
                    <p className="text-muted text-xs">
                      Promotions are charged at booking. Payment goes through your gateway settings.
                    </p>
                    <Link href="/dashboard/settings/payment" className="text-primary text-xs hover:underline block mt-1">
                      Configure payment settings →
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BookSlotButton({ eventId, slotType, price }: { eventId: string; slotType: SlotType; price: number }) {
  return (
    <form action="/api/promote/book" method="POST">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="slotType" value={slotType} />
      <input type="hidden" name="price" value={price} />
      <button type="submit" className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors">
        Book Slot
      </button>
    </form>
  );
}
