import { createClient } from "@/lib/supabase/client";
import type { EventWithTiers, EventWithOrganiser, Event } from "@/lib/types/database";

export async function getPublishedEvents(city?: string): Promise<EventWithOrganiser[]> {
  const supabase = createClient();
  let query = supabase
    .from("events")
    .select("*, profiles(display_name, avatar_url)")
    .eq("status", "published")
    .order("event_date", { ascending: true });

  if (city) query = query.eq("city", city);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as EventWithOrganiser[];
}

export async function getFeaturedEvents(): Promise<Event[]> {
  const supabase = createClient();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from("featured_slots")
    .select("events(*)")
    .eq("status", "active")
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("slot_type", { ascending: true });

  if (error) throw error;
  return (data ?? []).map((row: any) => row.events).filter(Boolean) as Event[];
}

export async function getTonightEvents(): Promise<Event[]> {
  const supabase = createClient();
  const tonight = new Date();
  tonight.setHours(18, 0, 0, 0);
  const tonightEnd = new Date();
  tonightEnd.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .gte("event_date", tonight.toISOString())
    .lte("event_date", tonightEnd.toISOString())
    .order("event_date", { ascending: true })
    .limit(8);

  if (error) throw error;
  return data ?? [];
}

export async function getWeekendEvents(): Promise<Event[]> {
  const supabase = createClient();
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilFriday = (5 - dayOfWeek + 7) % 7 || 7;
  const friday = new Date(today);
  friday.setDate(today.getDate() + daysUntilFriday);
  friday.setHours(0, 0, 0, 0);
  const sunday = new Date(friday);
  sunday.setDate(friday.getDate() + 2);
  sunday.setHours(23, 59, 59, 999);

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .gte("event_date", friday.toISOString())
    .lte("event_date", sunday.toISOString())
    .order("event_date", { ascending: true })
    .limit(8);

  if (error) throw error;
  return data ?? [];
}

export async function getEventById(id: string): Promise<EventWithTiers | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*, ticket_tiers(*), profiles(display_name, avatar_url)")
    .eq("id", id)
    .single();

  if (error) return null;
  return data as EventWithTiers;
}

export async function getOrganiserEvents(organiserId: string): Promise<Event[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("organiser_id", organiserId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function searchEvents(query: string, city?: string): Promise<Event[]> {
  const supabase = createClient();
  let req = supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .or(`title.ilike.%${query}%,description.ilike.%${query}%,venue.ilike.%${query}%`)
    .order("event_date", { ascending: true })
    .limit(20);

  if (city) req = req.eq("city", city);

  const { data, error } = await req;
  if (error) throw error;
  return data ?? [];
}
