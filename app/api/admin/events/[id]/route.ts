/**
 * app/api/admin/events/[id]/route.ts
 *
 * Admin API — PATCH an event's status or is_featured flag.
 * Protected: admin role only (verified server-side via user JWT + profiles table).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const runtime = 'edge';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // Verify caller is admin
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profileRaw } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { role: string } | null;

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Parse body with strict value validation
  const body = await req.json();
  const update: Record<string, unknown> = {};

  // Whitelist allowed status values — admins can set any valid status
  const validStatuses = ["draft", "pending", "approved", "published", "cancelled", "completed"];
  if ("status" in body) {
    if (!validStatuses.includes(body.status)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }
    update.status = body.status;
  }

  // is_featured must be a boolean
  if ("is_featured" in body) {
    if (typeof body.is_featured !== "boolean") {
      return NextResponse.json({ error: "is_featured must be a boolean" }, { status: 400 });
    }
    update.is_featured = body.is_featured;
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  // Apply with service client (bypasses RLS)
  // Cast to `any` — same @supabase/ssr generic inference bug: spreading
  // Record<string,unknown> into .update() resolves as `never` on typed client.
  const supabase = createServiceClient();
  const { error } = await (supabase as any)
    .from("events")
    .update({ ...update, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    console.error("Admin event update error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
