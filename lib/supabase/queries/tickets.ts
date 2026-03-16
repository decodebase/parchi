import { createClient } from "@/lib/supabase/client";
import type { Ticket, TicketWithEvent } from "@/lib/types/database";

export async function getUserTickets(userId: string): Promise<TicketWithEvent[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tickets")
    .select("*, events(*), ticket_tiers(*)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as TicketWithEvent[];
}

export async function getTicketById(ticketId: string): Promise<TicketWithEvent | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tickets")
    .select("*, events(*), ticket_tiers(*)")
    .eq("id", ticketId)
    .single();

  if (error) return null;
  return data as TicketWithEvent;
}

export async function getEventTicketStats(eventId: string) {
  const supabase = createClient();
  const { data: dataRaw, error } = await supabase
    .from("tickets")
    .select("status")
    .eq("event_id", eventId);
  const data = dataRaw as { status: string }[] | null;

  if (error) throw error;
  const total = data?.length ?? 0;
  const used = data?.filter((t) => t.status === "used").length ?? 0;
  return { total, used, remaining: total - used };
}
