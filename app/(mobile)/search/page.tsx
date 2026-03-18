"use client";

import { useState, useEffect, useTransition, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { EventCard } from "@/components/ui/EventCard";
import { SkeletonCardList } from "@/components/ui/SkeletonCard";
import { NoEventsEmpty, ErrorEmpty } from "@/components/ui/EmptyState";
import type { Event, TicketTier, EventCategory } from "@/lib/types/database";
import {
  Search, LayoutGrid, Music, UtensilsCrossed, Trophy, Laugh, Palette, Moon,
  Users, PartyPopper, Briefcase, X, SlidersHorizontal, ChevronDown, ChevronUp,
} from "lucide-react";

type EventWithTiers = Event & { ticket_tiers: TicketTier[] };

const CATEGORIES: { label: string; icon: any; value: EventCategory | null }[] = [
  { label: "All",        icon: LayoutGrid,     value: null },
  { label: "Music",      icon: Music,          value: "music" },
  { label: "Food",       icon: UtensilsCrossed,value: "food" },
  { label: "Sports",     icon: Trophy,         value: "sports" },
  { label: "Comedy",     icon: Laugh,          value: "comedy" },
  { label: "Arts",       icon: Palette,        value: "arts" },
  { label: "Nightlife",  icon: Moon,           value: "nightlife" },
  { label: "Family",     icon: Users,          value: "family" },
  { label: "Conference", icon: Briefcase,      value: "conference" },
  { label: "Festival",   icon: PartyPopper,    value: "festival" },
];

const CITIES = ["All Cities", "Karachi", "Lahore", "Islamabad", "Rawalpindi", "Peshawar", "Quetta", "Multan", "Faisalabad", "Hyderabad"];

type DateFilter = "any" | "today" | "weekend" | "week" | "month";
type PriceFilter = "any" | "free" | "under1k" | "1k5k" | "over5k";
type SortBy = "date_asc" | "date_desc" | "price_asc" | "price_desc";

const DATE_OPTIONS: { label: string; value: DateFilter }[] = [
  { label: "Any Date",     value: "any" },
  { label: "Today",        value: "today" },
  { label: "This Weekend", value: "weekend" },
  { label: "This Week",    value: "week" },
  { label: "This Month",   value: "month" },
];

const PRICE_OPTIONS: { label: string; value: PriceFilter }[] = [
  { label: "Any Price",       value: "any" },
  { label: "Free",            value: "free" },
  { label: "Under PKR 1,000", value: "under1k" },
  { label: "PKR 1k – 5k",    value: "1k5k" },
  { label: "PKR 5,000+",     value: "over5k" },
];

const SORT_OPTIONS: { label: string; value: SortBy }[] = [
  { label: "Soonest First",      value: "date_asc" },
  { label: "Latest First",       value: "date_desc" },
  { label: "Price: Low → High",  value: "price_asc" },
  { label: "Price: High → Low",  value: "price_desc" },
];

function getDateRange(filter: DateFilter): { gte?: string; lte?: string } {
  const now = new Date();
  if (filter === "today") {
    const start = new Date(now); start.setHours(0,0,0,0);
    const end   = new Date(now); end.setHours(23,59,59,999);
    return { gte: start.toISOString(), lte: end.toISOString() };
  }
  if (filter === "weekend") {
    const day = now.getDay();
    const daysToFri = (5 - day + 7) % 7 || 7;
    const fri = new Date(now); fri.setDate(now.getDate() + daysToFri); fri.setHours(0,0,0,0);
    const sun = new Date(fri); sun.setDate(fri.getDate() + 2);          sun.setHours(23,59,59,999);
    return { gte: fri.toISOString(), lte: sun.toISOString() };
  }
  if (filter === "week") {
    const end = new Date(now); end.setDate(now.getDate() + 7); end.setHours(23,59,59,999);
    return { gte: now.toISOString(), lte: end.toISOString() };
  }
  if (filter === "month") {
    const end = new Date(now); end.setMonth(now.getMonth() + 1);
    return { gte: now.toISOString(), lte: end.toISOString() };
  }
  return { gte: now.toISOString() }; // any = upcoming
}

function filterByPrice(events: EventWithTiers[], filter: PriceFilter): EventWithTiers[] {
  if (filter === "any") return events;
  return events.filter(ev => {
    const tiers = ev.ticket_tiers ?? [];
    if (tiers.length === 0) return filter === "free";
    const min = Math.min(...tiers.map(t => t.price));
    if (filter === "free")    return min === 0;
    if (filter === "under1k") return min > 0 && min < 100000;   // <1000 PKR (stored as paisas)
    if (filter === "1k5k")    return min >= 100000 && min <= 500000;
    if (filter === "over5k")  return min > 500000;
    return true;
  });
}

function sortEvents(events: EventWithTiers[], sort: SortBy): EventWithTiers[] {
  return [...events].sort((a, b) => {
    if (sort === "date_asc")   return new Date(a.event_date).getTime() - new Date(b.event_date).getTime();
    if (sort === "date_desc")  return new Date(b.event_date).getTime() - new Date(a.event_date).getTime();
    if (sort === "price_asc" || sort === "price_desc") {
      const getMin = (e: EventWithTiers) => {
        const tiers = e.ticket_tiers ?? [];
        return tiers.length ? Math.min(...tiers.map(t => t.price)) : 0;
      };
      const diff = getMin(a) - getMin(b);
      return sort === "price_asc" ? diff : -diff;
    }
    return 0;
  });
}

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [query,           setQuery]           = useState(searchParams.get("q") ?? "");
  const [selectedCategory, setSelectedCategory] = useState<EventCategory | null>((searchParams.get("category") as EventCategory) ?? null);
  const [selectedCity,    setSelectedCity]    = useState(searchParams.get("city") ?? "All Cities");
  const [dateFilter,      setDateFilter]      = useState<DateFilter>("any");
  const [priceFilter,     setPriceFilter]     = useState<PriceFilter>("any");
  const [sortBy,          setSortBy]          = useState<SortBy>("date_asc");
  const [showAdvanced,    setShowAdvanced]    = useState(false);

  const [rawResults, setRawResults] = useState<EventWithTiers[]>([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState(false);
  const [, startTransition]         = useTransition();

  const activeFilterCount = [
    dateFilter !== "any",
    priceFilter !== "any",
    sortBy !== "date_asc",
    selectedCity !== "All Cities",
  ].filter(Boolean).length;

  useEffect(() => {
    const timer = setTimeout(() => doSearch(), 300);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, selectedCategory, selectedCity, dateFilter]);

  async function doSearch() {
    setLoading(true);
    setError(false);
    try {
      const supabase = createClient();
      const { gte, lte } = getDateRange(dateFilter);

      let req = supabase
        .from("events")
        .select("*, ticket_tiers(*)")
        .eq("status", "published")
        .limit(50);

      if (gte) req = req.gte("event_date", gte);
      if (lte) req = req.lte("event_date", lte);
      if (!lte && !gte) req = req.order("event_date", { ascending: true });
      else req = req.order("event_date", { ascending: true });

      if (query.trim()) {
        req = req.or(`title.ilike.%${query}%,description.ilike.%${query}%,venue.ilike.%${query}%`);
      }
      if (selectedCategory) {
        req = req.contains("categories", [selectedCategory]);
      }
      if (selectedCity !== "All Cities") req = req.eq("city", selectedCity);

      const { data, error: err } = await Promise.race([
        req,
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500)),
      ]);
      if (err) throw err;
      setRawResults((data ?? []) as EventWithTiers[]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  const results = sortEvents(filterByPrice(rawResults, priceFilter), sortBy);

  function handleCategoryClick(cat: EventCategory | null) {
    setSelectedCategory(cat);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (cat) params.set("category", cat); else params.delete("category");
      router.replace(`/search?${params.toString()}`, { scroll: false });
    });
  }

  function handleQueryChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setQuery(val);
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (val) params.set("q", val); else params.delete("q");
      router.replace(`/search?${params.toString()}`, { scroll: false });
    });
  }

  const showEmpty = !loading && !error && results.length === 0;

  return (
    <div className="min-h-screen">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border py-3 space-y-3 px-4 md:px-8">

        {/* Search bar */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" strokeWidth={2} />
            <input
              type="search"
              value={query}
              onChange={handleQueryChange}
              placeholder="Search events, venues..."
              className="w-full bg-surface2 border border-border rounded-xl pl-9 pr-4 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:border-primary/50 focus:bg-surface transition-colors"
            />
            {query && (
              <button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text">
                <X className="w-4 h-4" strokeWidth={2} />
              </button>
            )}
          </div>
          {/* Advanced filters toggle */}
          <button
            onClick={() => setShowAdvanced(v => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-colors shrink-0 text-xs font-semibold"
            style={{
              background: showAdvanced || activeFilterCount > 0 ? "#FF6A3D" : "#1A1A1E",
              borderColor: showAdvanced || activeFilterCount > 0 ? "#FF6A3D" : "#2A2A30",
              color: showAdvanced || activeFilterCount > 0 ? "#fff" : "#9CA3AF",
            }}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-white/20 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]">
                {activeFilterCount}
              </span>
            )}
            {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </div>

        {/* City filter — always visible */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {CITIES.map(city => (
            <button
              key={city}
              onClick={() => setSelectedCity(city)}
              className={`whitespace-nowrap px-3 py-1 rounded-full text-xs font-medium border transition-colors shrink-0 ${
                selectedCity === city
                  ? "bg-primary-muted text-primary border-primary/30"
                  : "bg-surface2 text-muted border-border hover:border-primary/20"
              }`}
            >
              {city}
            </button>
          ))}
        </div>

        {/* Category chips — always visible */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return (
              <button
                key={cat.label}
                onClick={() => handleCategoryClick(cat.value)}
                className={`flex items-center gap-1.5 whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-colors shrink-0 ${
                  selectedCategory === cat.value
                    ? "bg-primary text-white border-primary"
                    : "bg-surface2 text-muted border-border hover:border-primary/20"
                }`}
              >
                <Icon className="w-3 h-3" strokeWidth={2} />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Advanced filters panel */}
        {showAdvanced && (
          <div className="space-y-3 pt-1 border-t border-border/40">

            {/* Date filter */}
            <div>
              <p className="text-muted text-xs font-semibold mb-1.5 uppercase tracking-wider">When</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {DATE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDateFilter(opt.value)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-colors shrink-0 ${
                      dateFilter === opt.value
                        ? "bg-primary text-white border-primary"
                        : "bg-surface2 text-muted border-border hover:border-primary/20"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price filter */}
            <div>
              <p className="text-muted text-xs font-semibold mb-1.5 uppercase tracking-wider">Price</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {PRICE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setPriceFilter(opt.value)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-colors shrink-0 ${
                      priceFilter === opt.value
                        ? "bg-primary text-white border-primary"
                        : "bg-surface2 text-muted border-border hover:border-primary/20"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort */}
            <div>
              <p className="text-muted text-xs font-semibold mb-1.5 uppercase tracking-wider">Sort By</p>
              <div className="flex gap-2 overflow-x-auto scrollbar-hide">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium border transition-colors shrink-0 ${
                      sortBy === opt.value
                        ? "bg-primary text-white border-primary"
                        : "bg-surface2 text-muted border-border hover:border-primary/20"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Clear all */}
            {activeFilterCount > 0 && (
              <button
                onClick={() => {
                  setDateFilter("any");
                  setPriceFilter("any");
                  setSortBy("date_asc");
                  setSelectedCity("All Cities");
                }}
                className="text-primary text-xs font-semibold underline underline-offset-2"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}
      </div>

      {/* Results */}
      <div className="px-4 md:px-8 py-4">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <SkeletonCardList count={6} />
          </div>
        ) : error ? (
          <ErrorEmpty onRetry={doSearch} />
        ) : showEmpty ? (
          <NoEventsEmpty />
        ) : (
          <>
            <p className="text-muted text-xs mb-3">
              {results.length} event{results.length !== 1 ? "s" : ""} found
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
