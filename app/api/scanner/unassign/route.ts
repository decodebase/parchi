/**
 * app/api/scanner/unassign/route.ts
 *
 * POST /api/scanner/unassign
 * Body: { assignmentId: string, eventId: string }
 *
 * Deletes a scanner_assignments row.
 * Caller must be organiser who owns the event, or admin.
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

  // 3. Parse body — support JSON and form-encoded
  let assignmentId: string | null = null;
  let eventId: string | null = null;

  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await req.json();
    assignmentId = body.assignmentId ?? null;
    eventId = body.eventId ?? null;
  } else {
    const formData = await req.formData();
    assignmentId = formData.get("assignmentId") as string | null;
    eventId = formData.get("eventId") as string | null;
  }

  if (!assignmentId || !eventId) {
    return NextResponse.json({ error: "Missing assignmentId or eventId" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // 4. For organiser: verify they own the event the assignment belongs to
  if (role === "organiser") {
    const { data: assignmentRaw } = await supabase
      .from("scanner_assignments")
      .select("event_id, events(organiser_id)")
      .eq("id", assignmentId)
      .maybeSingle();
    const assignment = assignmentRaw as { event_id: string; events: { organiser_id: string } | null } | null;

    const organiserIdOnEvent = assignment?.events?.organiser_id;
    if (!assignment || organiserIdOnEvent !== user.id) {
      return NextResponse.json(
        { error: "Assignment not found or you do not own this event" },
        { status: 403 }
      );
    }
  }

  // 5. Delete the assignment
  const { error } = await (supabase as any)
    .from("scanner_assignments")
    .delete()
    .eq("id", assignmentId);

  if (error) {
    console.error("Scanner unassign error:", error);
    return NextResponse.json({ error: "Failed to remove scanner" }, { status: 500 });
  }

  return redirect(`/dashboard/scanner?eventId=${eventId}`);
}

function redirect(location: string) {
  return NextResponse.redirect(
    new URL(location, process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
    { status: 303 }
  );
}
