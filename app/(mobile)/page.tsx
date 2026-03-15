"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { EventCard } from "@/components/ui/EventCard";
import { SkeletonCard } from "@/components/ui/SkeletonCard";
import { useAuthStore } from "@/lib/store/authStore";
import Link from "next/link";
import type { Event, TicketTier } from "@/lib/types/database";
import {
  Star, CalendarDays, LayoutGrid, Music, UtensilsCrossed,
  Trophy, Laugh, Palette, Moon, Users, Search,
  ChevronLeft, ChevronRight, MapPin, Clock,
} from "lucide-react";

type RichEvent = Event & { ticket_tiers: TicketTier[] };

const CATEGORIES = [
  { label: "All",       icon: LayoutGrid,       value: null },
  { label: "Music",     icon: Music,             value: "music" },
  { label: "Food",      icon: UtensilsCrossed,   value: "food" },
  { label: "Sports",    icon: Trophy,            value: "sports" },
  { label: "Comedy",    icon: Laugh,             value: "comedy" },
  { label: "Arts",      icon: Palette,           value: "arts" },
  { label: "Nightlife", icon: Moon,              value: "nightlife" },
  { label: "Family",    icon: Users,             value: "family" },
];

function useGreeting() {
  const [greeting, setGreeting] = useState("Good morning");
  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting("Good morning");
    else if (h < 17) setGreeting("Good afternoon");
    else setGreeting("Good evening");
  }, []);
  return greeting;
}
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-PK", { weekday: "short", day: "numeric", month: "short" });
}
function getMinPrice(tiers: TicketTier[]) {
  if (!tiers?.length) return null;
  const min = Math.min(...tiers.map(t => t.price));
  return min === 0 ? "Free" : `PKR ${(min / 100).toLocaleString()}`;
}

// ── Featured Slider ───────────────────────────────────────────────────────────
function FeaturedSlider({ events, loading }: { events: RichEvent[]; loading: boolean }) {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const count = events.length;

  const goTo = useCallback((idx: number) => setCurrent((idx + count) % count), [count]);

  useEffect(() => {
    if (loading || count < 2) return;
    autoRef.current = setInterval(() => setCurrent(c => (c + 1) % count), 4500);
    return () => { if (autoRef.current) clearInterval(autoRef.current); };
  }, [loading, count]);

  const pauseAuto = () => { if (autoRef.current) clearInterval(autoRef.current); };
  const resumeAuto = () => {
    if (count < 2) return;
    autoRef.current = setInterval(() => setCurrent(c => (c + 1) % count), 4500);
  };

  if (loading) {
    return <div className="w-full rounded-2xl overflow-hidden shimmer" style={{ height: "clamp(260px, 40vw, 500px)" }} />;
  }
  if (!count) return null;

  const event = events[current];
  const minPrice = getMinPrice(event.ticket_tiers);

  return (
    <div className="relative select-none">
      <div
        className="relative w-full rounded-2xl overflow-hidden cursor-pointer"
        style={{ height: "clamp(260px, 40vw, 500px)" }}
        onTouchStart={e => { touchStartX.current = e.touches[0].clientX; touchDeltaX.current = 0; pauseAuto(); }}
        onTouchMove={e => { touchDeltaX.current = e.touches[0].clientX - touchStartX.current; }}
        onTouchEnd={() => { if (touchDeltaX.current < -40) goTo(current + 1); else if (touchDeltaX.current > 40) goTo(current - 1); resumeAuto(); }}
        onMouseEnter={pauseAuto}
        onMouseLeave={resumeAuto}
      >
        <Link href={`/events/${event.id}`} className="block w-full h-full">
          {event.cover_image
            ? <img src={event.cover_image} alt={event.title} key={event.id} className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500" />
            : <div className="absolute inset-0 bg-gradient-to-br from-primary/40 to-surface2" />
          }
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/15 to-transparent" />

          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-full bg-black/45 backdrop-blur-sm text-xs text-white font-semibold">
            <Star className="w-3 h-3 text-yellow-400" fill="currentColor" strokeWidth={0} />
            Featured
          </div>
          {minPrice && (
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-xs font-bold" style={{ background: "#FF6A3D", color: "#fff" }}>
              {minPrice}
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h3 className="text-white font-bold text-xl leading-tight line-clamp-1 mb-1.5">{event.title}</h3>
            <div className="flex items-center gap-4 text-white/75 text-xs">
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(event.event_date)}</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.venue}, {event.city}</span>
            </div>
          </div>
        </Link>

        {count > 1 && (
          <>
            <button onClick={e => { e.preventDefault(); pauseAuto(); goTo(current - 1); resumeAuto(); }}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button onClick={e => { e.preventDefault(); pauseAuto(); goTo(current + 1); resumeAuto(); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/70 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-3">
          {events.map((_, i) => (
            <button key={i} onClick={() => { pauseAuto(); goTo(i); resumeAuto(); }}
              className="transition-all duration-300 rounded-full"
              style={{ width: i === current ? "20px" : "6px", height: "6px", background: i === current ? "#FF6A3D" : "#2A2A30" }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [featured, setFeatured] = useState<RichEvent[]>([]);
  const [upcoming, setUpcoming] = useState<RichEvent[]>([]);
  const [weekend,  setWeekend]  = useState<RichEvent[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const greeting = useGreeting();

  useEffect(() => { loadEvents(); }, []); // eslint-disable-line

  async function loadEvents() {
    try {
      const supabase = createClient();
      const today = new Date();
      const daysToFri = (5 - today.getDay() + 7) % 7 || 7;
      const fri = new Date(today); fri.setDate(today.getDate() + daysToFri); fri.setHours(0,0,0,0);
      const sun = new Date(fri);   sun.setDate(fri.getDate() + 2);           sun.setHours(23,59,59,999);

      const [fAdminR, fSlotsR, uR, wR] = await Promise.allSettled([
        // Admin-featured: is_featured = true on events table
        supabase.from("events").select("*, ticket_tiers(*)").eq("status","published").eq("is_featured",true).gte("event_date", today.toISOString()).limit(6),
        // Paid promoted slots: active featured_slots
        supabase.from("featured_slots").select("events(*, ticket_tiers(*))").eq("status","active").gte("ends_at", today.toISOString()).limit(6),
        supabase.from("events").select("*, ticket_tiers(*)").eq("status","published").gte("event_date", today.toISOString()).order("event_date",{ascending:true}).limit(12),
        supabase.from("events").select("*, ticket_tiers(*)").eq("status","published").gte("event_date", fri.toISOString()).lte("event_date", sun.toISOString()).limit(6),
      ]);

      // Merge admin-featured + paid slots, deduplicate by event id
      const adminFeatured = fAdminR.status==="fulfilled" ? (fAdminR.value.data??[]) as RichEvent[] : [];
      const slotFeatured = fSlotsR.status==="fulfilled" ? ((fSlotsR.value.data??[]) as any[]).map(r=>r.events).filter(Boolean) as RichEvent[] : [];
      const seenIds = new Set<string>();
      const fd: RichEvent[] = [];
      for (const e of [...adminFeatured, ...slotFeatured]) {
        if (!seenIds.has(e.id)) { seenIds.add(e.id); fd.push(e); }
      }

      const ud = uR.status==="fulfilled" ? (uR.value.data??[]) : [];
      const wd = wR.status==="fulfilled" ? (wR.value.data??[]) : [];

      setFeatured(fd);
      setUpcoming(ud);
      setWeekend(wd);
    } catch {
      // Supabase unreachable — sections stay empty
    } finally {
      setLoading(false);
    }
  }

  const filteredUpcoming = activeCategory ? upcoming.filter(e => e.category === activeCategory) : upcoming;

  return (
    <div className="min-h-screen pb-10">
      <div className="px-4 md:px-8">

        {/* Header */}
        <div className="pt-3 pb-3 flex items-end justify-between">
          <div>
            <p className="text-muted text-sm font-medium">{greeting}</p>
            <h1 className="text-text text-2xl font-bold mt-0.5">Discover <span className="gradient-text">Events</span></h1>
          </div>
          <Link href="/search" className="w-9 h-9 rounded-xl bg-surface2 border border-border flex items-center justify-center hover:border-primary/40 transition-colors">
            <Search className="w-4 h-4 text-muted" />
          </Link>
        </div>

        <div className="space-y-8">

          {/* Featured Slider */}
          {(loading || featured.length > 0) && (
            <section>
              <FeaturedSlider events={featured} loading={loading} />
            </section>
          )}

          {/* Category chips */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {CATEGORIES.map(cat => {
              const isActive = activeCategory === cat.value;
              const Icon = cat.icon;
              return (
                <button key={cat.label} onClick={() => setActiveCategory(cat.value)}
                  className="flex items-center gap-1.5 whitespace-nowrap px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all shrink-0"
                  style={{ background: isActive ? "#FF6A3D" : "#1A1A1E", borderColor: isActive ? "#FF6A3D" : "#2A2A30", color: isActive ? "#fff" : "#9CA3AF" }}>
                  <Icon className="w-3 h-3" strokeWidth={2} />{cat.label}
                </button>
              );
            })}
          </div>

          {/* This Weekend */}
          {!activeCategory && (loading || weekend.length > 0) && (
            <section>
              <h2 className="text-text font-bold text-sm mb-4 flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-primary" strokeWidth={2} /> This Weekend
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading
                  ? [1,2,3].map(i => <SkeletonCard key={i} />)
                  : weekend.map(event => <EventCard key={event.id} event={event} />)
                }
              </div>
            </section>
          )}

          {/* Upcoming Events */}
          <section className="space-y-4">
            <h2 className="text-text font-bold text-sm flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-primary" strokeWidth={2} /> Upcoming Events
            </h2>
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
              </div>
            ) : filteredUpcoming.length === 0 ? (
              <div className="py-16 flex flex-col items-center gap-3 bg-surface rounded-2xl border border-border/40 text-center">
                <Search className="w-10 h-10 text-muted" strokeWidth={1.5} />
                <p className="text-text font-semibold">No events yet</p>
                <p className="text-muted text-sm">Check back soon</p>
                {activeCategory && (
                  <button onClick={() => setActiveCategory(null)} className="text-primary text-sm font-semibold">Show all</button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredUpcoming.map(event => <EventCard key={event.id} event={event} />)}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
