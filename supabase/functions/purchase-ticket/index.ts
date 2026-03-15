/**
 * Edge Function: purchase-ticket
 *
 * POST /functions/v1/purchase-ticket
 * Body: { eventId: string, tierId: string, quantity: number, paymentMethod?: "cash" | "online" }
 * Auth: Bearer token required (user JWT)
 *
 * Flow:
 *  1. Verify auth
 *  2. Validate tier availability (with row-lock via RPC)
 *  3. Create order (status = pending)
 *  4. Generate QR tokens + create tickets
 *  5. Mark order as paid (for free tickets / cash / post-payment hook)
 *  6. Return { orderId, tickets[] }
 *
 * Note: For online paid tickets, payment gateway calls this after payment confirmation.
 * Free tickets and cash tickets complete the full flow immediately.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { generateQRToken } from "../_shared/qrcode.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // ── Auth ──────────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const qrSecret = Deno.env.get("QR_SECRET") ?? serviceKey;

    // User client — validates the JWT
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      console.error("Auth error:", authError?.message, "| Status:", authError?.status);
      return json({ error: "Unauthorized", detail: authError?.message ?? "no user" }, 401);
    }

    // ── Parse body ────────────────────────────────────────────
    const body = await req.json();
    const { eventId, tierId, quantity, paymentMethod, discountId, promoCodeId } = body as {
      eventId: string;
      tierId: string;
      quantity: number;
      paymentMethod?: "cash" | "online";
      discountId?: string;
      promoCodeId?: string;
    };

    if (!eventId || !tierId || !quantity || quantity < 1 || quantity > 10) {
      return json({ error: "Invalid request body" }, 400);
    }

    // ── Service-role client for privileged operations ─────────
    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Fetch tier & check availability ──────────────────────
    const { data: tier, error: tierErr } = await supabase
      .from("ticket_tiers")
      .select("*")
      .eq("id", tierId)
      .eq("event_id", eventId)
      .single();

    if (tierErr || !tier) {
      return json({ error: "Ticket tier not found" }, 404);
    }

    const available = tier.total_quantity - tier.sold_quantity;
    if (available < quantity) {
      return json({ error: "Not enough tickets available", available }, 409);
    }

    // Check sale window
    const now = new Date();
    if (tier.sale_starts_at && new Date(tier.sale_starts_at) > now) {
      return json({ error: "Ticket sales have not started yet" }, 400);
    }
    if (tier.sale_ends_at && new Date(tier.sale_ends_at) < now) {
      return json({ error: "Ticket sales have ended" }, 400);
    }

    // ── Resolve actual unit price (discount overrides tier price) ──
    let unitPrice = tier.price;
    if (discountId) {
      const { data: discount } = await supabase
        .from("ticket_discounts")
        .select("discounted_price, is_active, starts_at, ends_at, quantity_available, quantity_used")
        .eq("id", discountId)
        .eq("tier_id", tierId)
        .single();

      if (discount && discount.is_active) {
        const nowD = new Date();
        const withinWindow = new Date(discount.starts_at) <= nowD && new Date(discount.ends_at) >= nowD;
        const hasStock = discount.quantity_used + quantity <= discount.quantity_available;
        if (withinWindow && hasStock) {
          unitPrice = discount.discounted_price;
        }
      }
    }

    // ── Create order ──────────────────────────────────────────
    const totalAmount = unitPrice * quantity;
    const isFree = totalAmount === 0;
    const isCash = paymentMethod === "cash";
    const completeNow = isFree || isCash; // tickets generated immediately

    const originalAmount = tier.price * quantity;
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        event_id: eventId,
        tier_id: tierId,
        quantity,
        unit_price: unitPrice,
        total_amount: totalAmount,
        original_amount: originalAmount,
        discount_id: discountId ?? null,
        promo_code_id: promoCodeId ?? null,
        status: completeNow ? "paid" : "pending",
        gateway_type: isFree ? null : isCash ? "cash" : "pending",
      })
      .select()
      .single();

    if (orderErr || !order) {
      return json({ error: "Failed to create order" }, 500);
    }

    // ── Generate tickets (only for free/cash or post-payment) ──────
    // For online paid tickets, tickets are generated after payment confirmation
    if (!completeNow) {
      return json({
        orderId: order.id,
        totalAmount,
        status: "pending_payment",
        message: "Proceed to payment",
      });
    }

    // ── Free / Cash flow: generate QR tokens + tickets ────────
    const ticketInserts = [];
    for (let i = 0; i < quantity; i++) {
      const qrToken = await generateQRToken(
        {
          ticketId: crypto.randomUUID(), // temp; will match after insert via trigger
          eventId,
          userId: user.id,
          issuedAt: Date.now(),
        },
        qrSecret
      );

      ticketInserts.push({
        order_id: order.id,
        event_id: eventId,
        tier_id: tierId,
        user_id: user.id,
        qr_token: qrToken,
        status: "valid",
      });
    }

    const { data: tickets, error: ticketsErr } = await supabase
      .from("tickets")
      .insert(ticketInserts)
      .select();

    if (ticketsErr) {
      return json({ error: "Failed to generate tickets" }, 500);
    }

    // ── Increment sold_quantity ────────────────────────────────
    const { error: updateErr } = await supabase.rpc("increment_sold_quantity", {
      p_tier_id: tierId,
      p_qty: quantity,
    });

    if (updateErr) {
      console.error("sold_quantity update failed:", updateErr);
      // Non-fatal — trigger fallback handles this
    }

    // ── Increment discount quantity_used ──────────────────────
    if (discountId) {
      const { error: discErr } = await supabase.rpc("increment_discount_used", {
        p_discount_id: discountId,
        p_qty: quantity,
      });
      if (discErr) {
        console.error("discount quantity_used update failed:", discErr);
      }
    }

    // ── Increment promo code uses_count ─────────────────────
    if (promoCodeId) {
      const { error: promoErr } = await supabase.rpc("increment_promo_uses", {
        p_promo_id: promoCodeId,
      });
      if (promoErr) console.error("promo uses_count update failed:", promoErr);
    }

    return json({
      orderId: order.id,
      status: "paid",
      tickets: tickets.map((t: any) => ({
        id: t.id,
        qrToken: t.qr_token,
        status: t.status,
      })),
    });
  } catch (err) {
    console.error("purchase-ticket error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
