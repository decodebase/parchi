import { createClient } from "@/lib/supabase/client";
import type { Order, OrderStatus } from "@/lib/types/database";

export async function getUserOrders(userId: string): Promise<Order[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getOrderById(orderId: string): Promise<Order | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();
  if (error) return null;
  return data as Order;
}

export async function createOrder(
  order: Omit<Order, "id" | "created_at" | "updated_at">
): Promise<Order> {
  const supabase = createClient();
  const { data, error } = await (supabase as any)
    .from("orders")
    .insert(order)
    .select()
    .single();
  if (error) throw error;
  return data as Order;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  gatewayRef?: string
): Promise<void> {
  const supabase = createClient();
  const updates: Partial<Order> = { status };
  if (gatewayRef) updates.gateway_ref = gatewayRef;
  const { error } = await (supabase as any)
    .from("orders")
    .update(updates)
    .eq("id", orderId);
  if (error) throw error;
}

export async function getOrganiserOrders(eventId: string): Promise<Order[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
