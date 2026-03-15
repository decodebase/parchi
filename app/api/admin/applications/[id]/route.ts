/**
 * app/api/admin/applications/[id]/route.ts
 *
 * Admin API — approve or reject an organiser application.
 * On approve: sets application status to "approved" + sets user role to "organiser".
 * On reject:  sets application status to "rejected" + saves rejection_reason.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export const runtime = 'edge';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const userClient = await createClient();
  const { data: { user } } = await userClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: adminProfileRaw } = await userClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  const adminProfile = adminProfileRaw as { role: string } | null;

  if (adminProfile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { action, userId, rejectionReason } = body as {
    action: "approve" | "reject";
    userId: string;
    rejectionReason?: string;
  };

  if (!action || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Update the application record
  const appUpdate: Record<string, unknown> = {
    status: action === "approve" ? "approved" : "rejected",
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  };
  if (action === "reject" && rejectionReason) {
    appUpdate.rejection_reason = rejectionReason;
  }

  const { error: appErr } = await (supabase as any)
    .from("organiser_applications")
    .update(appUpdate)
    .eq("id", id);

  if (appErr) {
    console.error("Application update error:", appErr);
    return NextResponse.json({ error: "Failed to update application" }, { status: 500 });
  }

  // If approved, promote user to organiser role + clear organiser_status
  if (action === "approve" && userId) {
    const { error: profileErr } = await (supabase as any)
      .from("profiles")
      .update({
        role: "organiser",
        organiser_status: "approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (profileErr) {
      console.error("Profile role update error:", profileErr);
    }
  }

  // If rejected, update organiser_status to rejected on the profile
  if (action === "reject" && userId) {
    await (supabase as any)
      .from("profiles")
      .update({ organiser_status: "rejected", updated_at: new Date().toISOString() })
      .eq("id", userId);
  }

  return NextResponse.json({ ok: true });
}
