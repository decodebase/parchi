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

  // 5. Verify the target user has scanner role (or allow organiser/admin to be assigned)
  const { data: scannerProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", scannerId)
    .maybeSingle();

  if (!scannerProfile) {
    return NextResponse.json({ error: "Scanner user not found" }, { status: 404 });
  }

  // 6. Prevent duplicate assignments (upsert-style)
  const { data: existing } = await supabase
    .from("scanner_assignments")
    .select("id")
    .eq("scanner_id", scannerId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (existing) {
    // Already assigned — treat as success (idempotent)
    return redirect(`/dashboard/scanner?eventId=${eventId}`);
  }

  // 7. Insert assignment
  const { error } = await (supabase as any).from("scanner_assignments").insert({
    scanner_id: scannerId,
    event_id: eventId,
    assigned_by: user.id,
  });

  if (error) {
    console.error("Scanner assign error:", error);
    return NextResponse.json({ error: "Failed to assign scanner" }, { status: 500 });
  }

  return redirect(`/dashboard/scanner?eventId=${eventId}`);
}

/** Helper: redirect back to dashboard scanner page (for form POSTs) */
function redirect(location: string) {
  return NextResponse.redirect(
    new URL(location, process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
    { status: 303 }
  );
}
