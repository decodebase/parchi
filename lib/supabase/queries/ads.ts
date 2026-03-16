import { createClient } from "@/lib/supabase/client";
import type { FeaturedSlot, SlotType } from "@/lib/types/database";

export async function getActiveSlots(slotType?: SlotType): Promise<FeaturedSlot[]> {
  const supabase = createClient();
  const now = new Date().toISOString();

  let query = supabase
    .from("featured_slots")
    .select("*, events(*)")
    .eq("status", "active")
    .lte("starts_at", now)
    .gte("ends_at", now)
    .order("starts_at", { ascending: true });

  if (slotType) query = query.eq("slot_type", slotType);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as FeaturedSlot[];
}

export async function getOrganiserSlots(organiserId: string): Promise<FeaturedSlot[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("featured_slots")
    .select("*, events(title, cover_image)")
    .eq("organiser_id", organiserId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as FeaturedSlot[];
}

export async function createFeaturedSlot(
  slot: Omit<FeaturedSlot, "id" | "created_at">
): Promise<FeaturedSlot> {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("featured_slots")
    .insert(slot)
    .select()
    .single();
  if (error) throw error;
  return data as FeaturedSlot;
}

export async function cancelSlot(slotId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await (supabase as any)
    .from("featured_slots")
    .update({ status: "cancelled" })
    .eq("id", slotId);
  if (error) throw error;
}

// Slot pricing (PKR paisas)
export const SLOT_PRICES: Record<SlotType, number> = {
  homepage_hero:  2000000, // PKR 20,000
  homepage_grid:   500000, // PKR 5,000
  category_top:    300000, // PKR 3,000
  search_boost:    100000, // PKR 1,000
};
