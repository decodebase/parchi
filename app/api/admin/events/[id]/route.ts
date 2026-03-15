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

  // Parse body
  const body = await req.json();
  const allowedFields = ["status", "is_featured"] as const;
  const update: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) update[field] = body[field];
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
