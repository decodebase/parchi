/**
 * app/api/admin/invite-scanner/route.ts
 *
 * POST /api/admin/invite-scanner
 * Body: { email: string, displayName: string, eventId?: string }
 *
 * Flow:
 *  1. Check if email already exists in profiles
 *     - If exists as scanner/organiser/admin: assign to event, return warning
 *     - If exists as regular user: return error (can't repurpose user accounts)
 *  2. If new: send Supabase invite email (magic link), create profile stub
 *  3. Optionally assign to event immediately
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  // ── Auth check ──────────────────────────────────────────────
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: callerProfileRaw } = await userClient
    .from("profiles").select("role").eq("id", user.id).single();
  const callerProfile = callerProfileRaw as { role: string } | null;

  if (!callerProfile?.role || !["organiser", "admin"].includes(callerProfile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Parse body ───────────────────────────────────────────────
  const body = await req.json();
  const { email, eventId } = body as {
    email: string;
    eventId?: string;
  };

  if (!email) {
    return NextResponse.json({ error: "email is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // ── Verify organiser owns the event ─────────────────────────
  if (eventId && callerProfile.role === "organiser") {
    const { data: event } = await supabase
      .from("events").select("id").eq("id", eventId).eq("organiser_id", user.id).maybeSingle();
    if (!event) {
      return NextResponse.json({ error: "Event not found or you do not own it" }, { status: 403 });
    }
  }

  // ── Check if email already registered ───────────────────────
  const { data: existingProfilesRaw } = await supabase
    .from("profiles").select("id, role, display_name").eq("email", email.trim().toLowerCase()).limit(1);
  const existingProfiles = existingProfilesRaw as { id: string; role: string; display_name: string | null }[] | null;

  let newUserId: string;
  let alreadyExisted = false;

  if (existingProfiles && existingProfiles.length > 0) {
    const existing = existingProfiles[0];
    alreadyExisted = true;

    // Any existing account can be added as a scanner — update role if needed
    newUserId = existing.id;
    if (existing.role === "user") {
      await (supabase as any)
        .from("profiles")
        .update({ role: "scanner" })
        .eq("id", existing.id);
    }
  } else {
    // ── New user: send Supabase invite email ─────────────────
    const { data: invited, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
      email.trim().toLowerCase(),
      {
        data: { display_name: email.split("@")[0], role: "scanner" },
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      }
    );

    if (inviteError || !invited.user) {
      console.error("Invite error:", inviteError);
      return NextResponse.json(
        { error: inviteError?.message ?? "Failed to send invite" },
        { status: 500 }
      );
    }

    newUserId = invited.user.id;

    // Upsert profile with scanner role
    await (supabase as any).from("profiles").upsert({
      id: newUserId,
      email: email.trim().toLowerCase(),
      display_name: email.split("@")[0], // default display name from email
      role: "scanner",
    }, { onConflict: "id" });
  }

  // ── Assign to event if provided ──────────────────────────────
  if (eventId) {
    const { data: existingAssign } = await supabase
      .from("scanner_assignments").select("id")
      .eq("scanner_id", newUserId).eq("event_id", eventId).maybeSingle();

    if (!existingAssign) {
      await (supabase as any).from("scanner_assignments").insert({
        scanner_id: newUserId,
        event_id: eventId,
        assigned_by: user.id,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    userId: newUserId,
    message: alreadyExisted
      ? `${email} has been added to your scanner team${eventId ? " and assigned to the event" : ""}.`
      : `Invite sent to ${email}. They'll receive an email to set up their account.`,
  });
}
