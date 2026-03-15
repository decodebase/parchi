/**
 * app/api/events/[id]/publish/route.ts
 *
 * Handles two organiser-triggered status transitions:
 *   draft     → pending    (Submit for Review)
 *   approved  → published  (Go Live)
 *
 * Only the event's own organiser can call this. Admin approval
 * (pending → approved) is handled separately via /api/admin/events/[id].
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = 'edge';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch the event — must belong to this organiser
  const { data: eventRaw, error: fetchError } = await supabase
    .from("events")
    .select("id, status, organiser_id")
    .eq("id", id)
    .eq("organiser_id", user.id)
    .single();
  const event = eventRaw as { id: string; status: string; organiser_id: string } | null;

  if (fetchError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  // Determine the allowed transition
  const transitions: Record<string, string> = {
    draft:    "pending",   // Submit for Review
    approved: "published", // Go Live
  };

  const nextStatus = transitions[event.status];
  if (!nextStatus) {
    return NextResponse.json(
      { error: `Cannot transition from status "${event.status}"` },
      { status: 400 }
    );
  }

  const { error: updateError } = await (supabase as any)
    .from("events")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    console.error("Publish error:", updateError);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: nextStatus });
}
