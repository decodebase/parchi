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
    // Look up by qr_token alone first — then verify event_id matches.
    // This gives a clearer error if the ticket exists but is for a different event.
    const { data: ticket, error: ticketErr } = await supabase
      .from("tickets")
      .select("*")
      .eq("qr_token", qrToken)
      .maybeSingle();

    if (ticketErr || !ticket) {
      console.error("ticket lookup error:", ticketErr?.message);
      return json({ valid: false, reason: "Ticket not found in database" });
    }

    // Fetch related data separately to avoid join failures blocking the lookup
    const [eventRes, tierRes, profileRes] = await Promise.all([
      supabase.from("events").select("title, venue, event_date").eq("id", ticket.event_id).maybeSingle(),
      supabase.from("ticket_tiers").select("name").eq("id", ticket.tier_id).maybeSingle(),
      supabase.from("profiles").select("display_name").eq("id", ticket.user_id).maybeSingle(),
    ]);
    const eventData = eventRes.data as { title: string; venue: string; event_date: string } | null;
    const tierData = tierRes.data as { name: string } | null;
    const profileData = profileRes.data as { display_name: string | null } | null;

    // Verify the ticket belongs to the event being scanned
    if (ticket.event_id !== eventId) {
      return json({ valid: false, reason: "Ticket is for a different event" });
    }

    if (ticket.status === "used") {
      return json({
        valid: false,
        reason: "Ticket already used",
        checkedInAt: ticket.checked_in_at,
        ticket: sanitizeTicket(ticket, eventData, tierData, profileData),
      });
    }

    if (ticket.status === "cancelled" || ticket.status === "refunded") {
      return json({
        valid: false,
        reason: `Ticket is ${ticket.status}`,
        ticket: sanitizeTicket(ticket, eventData, tierData, profileData),
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
      ticket: sanitizeTicket(ticket, eventData, tierData, profileData),
      checkedInAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("validate-ticket error:", err);
    return json({ error: "Internal server error" }, 500);
  }
});

function sanitizeTicket(ticket: any, eventData?: any, tierData?: any, profileData?: any) {
  return {
    id: ticket.id,
    tierName: tierData?.name ?? ticket.ticket_tiers?.name,
    holderName: profileData?.display_name ?? ticket.profiles?.display_name ?? "Guest",
    eventTitle: eventData?.title ?? ticket.events?.title,
    eventVenue: eventData?.venue ?? ticket.events?.venue,
    eventDate: eventData?.event_date ?? ticket.events?.event_date,
  };
}

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
