import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types/database";

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<Profile, "display_name" | "avatar_url" | "city" | "phone">>
): Promise<Profile> {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("profiles")
    .update(updates)
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data as Profile;
}

export async function getPublicProfile(userId: string): Promise<Pick<Profile, "id" | "display_name" | "avatar_url" | "city"> | null> {
  const supabase = createClient();
  const { data: dataRaw, error } = await supabase
    .from("profiles")
    .select("id, display_name, avatar_url, city")
    .eq("id", userId)
    .single();
  if (error) return null;
  return dataRaw as Pick<Profile, "id" | "display_name" | "avatar_url" | "city"> | null;
}
