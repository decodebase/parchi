/**
 * app/api/scanner/assign/route.ts
 *
 * POST /api/scanner/assign
 * Body: { scannerId: string, eventId: string }
 *
 * Creates a scanner_assignments row.
 * Caller must be an organiser who owns the event, or an admin.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  // 1. Authenticate caller
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 2. Check role
  const { data: profileRaw } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { role: string } | null;

  const role = profile?.role;
  if (!role || !["organiser", "admin"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 3. Parse body — support both JSON (fetch) and form-encoded (native <form>)
  let scannerId: string | null = null;
  let eventId: string | null = null;

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await req.json();
    scannerId = body.scannerId ?? null;
    eventId = body.eventId ?? null;
  } else {
    // form-urlencoded (submitted by the HTML <form> in dashboard/scanner)
    const formData = await req.formData();
    scannerId = formData.get("scannerId") as string | null;
    eventId = formData.get("eventId") as string | null;
  }

  if (!scannerId || !eventId) {
    return NextResponse.json({ error: "Missing scannerId or eventId" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // 4. For organiser: verify they own the event
  if (role === "organiser") {
    const { data: event } = await supabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("organiser_id", user.id)
      .maybeSingle();

    if (!event) {
      return NextResponse.json(
        { error: "Event not found or you are not the organiser" },
        { status: 403 }
      );
    }
  }

  // 5. Upsert assignment — skip profile check, service role handles it
  const { data: existing } = await supabase
    .from("scanner_assignments")
    .select("id")
    .eq("scanner_id", scannerId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ ok: true, message: "Already assigned" });
  }

  // 6. Insert assignment
  const { error: insertError } = await (supabase as any).from("scanner_assignments").insert({
    scanner_id: scannerId,
    event_id: eventId,
    assigned_by: user.id,
  });

  if (insertError) {
    console.error("Scanner assign error:", JSON.stringify(insertError));
    return NextResponse.json({ error: "Failed to assign scanner" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
