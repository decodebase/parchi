/**
 * app/api/admin/invite-scanner/route.ts
 *
 * POST /api/admin/invite-scanner
 * Body: { email: string, password: string, displayName: string, eventId?: string }
 *
 * Organiser (or admin) creates a new scanner account:
 *  1. Creates Supabase auth user via service-role admin API
 *  2. Upserts profile with role = "scanner"
 *  3. Optionally assigns them to eventId immediately
 *
 * The new user can then log in to parchi.pk with those credentials.
 * They will only see /scan/portal — their assigned events.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const runtime = 'edge';

export async function POST(req: NextRequest) {
  // ── Auth check ──────────────────────────────────────────────
  const userClient = await createClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: callerProfileRaw } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const callerProfile = callerProfileRaw as { role: string } | null;

  if (!callerProfile?.role || !["organiser", "admin"].includes(callerProfile.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // ── Parse body ───────────────────────────────────────────────
  const body = await req.json();
  const { email, password, displayName, eventId } = body as {
    email: string;
    password: string;
    displayName: string;
    eventId?: string;
  };

  if (!email || !password || !displayName) {
    return NextResponse.json(
      { error: "email, password and displayName are required" },
      { status: 400 }
    );
  }

  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  // ── If eventId provided, verify organiser owns it ────────────
  const supabase = createServiceClient();

  if (eventId && callerProfile.role === "organiser") {
    const { data: event } = await supabase
      .from("events")
      .select("id")
      .eq("id", eventId)
      .eq("organiser_id", user.id)
      .maybeSingle();

    if (!event) {
      return NextResponse.json(
        { error: "Event not found or you do not own it" },
        { status: 403 }
      );
    }
  }

  // ── Check if email already registered ───────────────────────
  const { data: existingProfilesRaw } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("email", email)
    .limit(1);
  const existingProfiles = existingProfilesRaw as { id: string; role: string }[] | null;

  let newUserId: string;

  if (existingProfiles && existingProfiles.length > 0) {
    // User already exists — just ensure scanner role
    const existing = existingProfiles[0];
    newUserId = existing.id;

    if (!["scanner", "organiser", "admin"].includes(existing.role)) {
      // Upgrade to scanner role
      await (supabase as any)
        .from("profiles")
        .update({ role: "scanner", updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    }
  } else {
    // ── Create new Supabase auth user ────────────────────────────
    const { data: newUser, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true, // skip email verification
        user_metadata: { display_name: displayName },
      });

    if (createError || !newUser.user) {
      console.error("Create user error:", createError);
      return NextResponse.json(
        { error: createError?.message ?? "Failed to create user" },
        { status: 500 }
      );
    }

    newUserId = newUser.user.id;

    // ── Upsert profile ──────────────────────────────────────────
    const { error: profileError } = await (supabase as any).from("profiles").upsert({
      id: newUserId,
      email,
      display_name: displayName,
      role: "scanner",
    });

    if (profileError) {
      console.error("Profile upsert error:", profileError);
      // Don't fail — the auth user was created, profile trigger may handle it
    }
  }

  // ── Assign to event if provided ──────────────────────────────
  if (eventId) {
    // Check for existing assignment (idempotent)
    const { data: existing } = await supabase
      .from("scanner_assignments")
      .select("id")
      .eq("scanner_id", newUserId)
      .eq("event_id", eventId)
      .maybeSingle();

    if (!existing) {
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
    message: existingProfiles?.length
      ? "Existing user assigned as scanner"
      : "Scanner account created successfully",
  });
}
