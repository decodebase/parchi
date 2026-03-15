/**
 * Edge Function: validate-ticket
 *
 * POST /functions/v1/validate-ticket
 * Body: { qrToken: string, eventId: string }
 * Auth: Bearer token required (scanner or organiser JWT)
 *
 * Flow:
 *  1. Verify auth + role (scanner or organiser)
 *  2. Verify scanner is assigned to event (or is organiser of event)
 *  3. Verify QR token signature
 *  4. Check ticket status in DB
 *  5. Mark ticket as used + set checked_in_at
 *  6. Return result
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyQRToken } from "../_shared/qrcode.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const qrSecret = Deno.env.get("QR_SECRET") ?? serviceKey;

    // Validate user JWT
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
      error: authErr,
    } = await supabaseUser.auth.getUser();

    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    const supabase = createClient(supabaseUrl, serviceKey);

    // ── Check role ────────────────────────────────────────────
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const role = profile?.role;
    if (!role || !["scanner", "organiser", "admin"].includes(role)) {
      return json({ error: "Forbidden: insufficient role" }, 403);
    }

    // ── Parse body ────────────────────────────────────────────
    const { qrToken, eventId } = (await req.json()) as {
      qrToken: string;
      eventId: string;
    };

    if (!qrToken || !eventId) {
      return json({ error: "Missing qrToken or eventId" }, 400);
    }

    // ── Check scanner assignment ──────────────────────────────
    if (role === "scanner") {
      const { data: assignment } = await supabase
        .from("scanner_assignments")
        .select("id")
        .eq("scanner_id", user.id)
        .eq("event_id", eventId)
        .maybeSingle();

      if (!assignment) {
        return json({ error: "Scanner not assigned to this event" }, 403);
      }
    }

    if (role === "organiser") {
      const { data: event } = await supabase
        .from("events")
        .select("id")
        .eq("id", eventId)
        .eq("organiser_id", user.id)
        .maybeSingle();

      if (!event) {
        return json({ error: "Event not found or not your event" }, 403);
      }
    }

    // ── Verify token signature ────────────────────────────────
    const verifyResult = await verifyQRToken(qrToken, qrSecret);
    if (!verifyResult.valid || !verifyResult.payload) {
      return json({
        valid: false,
        reason: verifyResult.error ?? "Invalid QR code",
      });
    }

    const payload = verifyResult.payload;

    // Make sure the token's eventId matches the one we're scanning for
    if (payload.eventId !== eventId) {
      return json({
        valid: false,
        reason: "QR code is for a different event",
      });
    }

    // ── Look up ticket in DB ──────────────────────────────────
    const { data: ticket, error: ticketErr } = await supabase
      .from("tickets")
      .select("*, events(title, venue, event_date), ticket_tiers(name), profiles(display_name)")
      .eq("qr_token", qrToken)
      .eq("event_id", eventId)
      .maybeSingle();

    if (ticketErr || !ticket) {
      return json({ valid: false, reason: "Ticket not found in database" });
    }

    if (ticket.status === "used") {
      return json({
        valid: false,
        reason: "Ticket already used",
        checkedInAt: ticket.checked_in_at,
        ticket: sanitizeTicket(ticket),
      });
    }

    if (ticket.status === "cancelled" || ticket.status === "refunded") {
      return json({
        valid: false,
        reason: `Ticket is ${ticket.status}`,
        ticket: sanitizeTicket(ticket),
      });
    }

    // ── Mark as used ──────────────────────────────────────────
    const { error: updateErr } = await supabase
      .from("tickets")
      .update({
        status: "used",
        checked_in_at: new Date().toISOString(),
        checked_in_by: user.id,
      })
      .eq("id", ticket.id);

    if (updateErr) {
      return json({ error: "Failed to mark ticket as used" }, 500);
    }

    return json({
      valid: true,
      ticket: sanitizeTicket(ticket),
      checkedInAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("validate-ticket error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

function sanitizeTicket(ticket: any) {
  return {
    id: ticket.id,
    tierName: ticket.ticket_tiers?.name,
    holderName: ticket.profiles?.display_name ?? "Guest",
    eventTitle: ticket.events?.title,
    eventVenue: ticket.events?.venue,
    eventDate: ticket.events?.event_date,
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
