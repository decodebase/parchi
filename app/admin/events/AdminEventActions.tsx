"use client";

/**
 * app/admin/events/AdminEventActions.tsx
 *
 * Client component for per-event action buttons in the admin events table.
 * Calls /api/admin/events/[id] PATCH endpoint for status + feature mutations.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface AdminEventActionsProps {
  eventId: string;
  status: string;
  isFeatured: boolean;
}

export function AdminEventActions({ eventId, status, isFeatured }: AdminEventActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [actionInFlight, setActionInFlight] = useState<string | null>(null);

  async function patch(payload: Record<string, unknown>, action: string) {
    setActionInFlight(action);
    try {
      await fetch(`/api/admin/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      startTransition(() => router.refresh());
    } catch (err) {
      console.error("Admin event action failed:", err);
    } finally {
      setActionInFlight(null);
    }
  }

  const loading = isPending || actionInFlight !== null;

  return (
    <div className="flex items-center justify-end gap-2 flex-wrap">
      {/* Approve — only for pending */}
      {status === "pending" && (
        <button
          onClick={() => patch({ status: "approved" }, "approve")}
          disabled={loading}
          className="px-3 py-1.5 bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-xs font-semibold rounded-lg hover:bg-[#10B981]/20 disabled:opacity-50 transition-colors"
        >
          {actionInFlight === "approve" ? "…" : "Approve"}
        </button>
      )}

      {/* Reject — only for pending, approved, or published */}
      {(status === "pending" || status === "approved" || status === "published") && (
        <button
          onClick={() => patch({ status: "cancelled" }, "reject")}
          disabled={loading}
          className="px-3 py-1.5 bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs font-semibold rounded-lg hover:bg-[#EF4444]/20 disabled:opacity-50 transition-colors"
        >
          {actionInFlight === "reject" ? "…" : status === "published" ? "Unpublish" : "Reject"}
        </button>
      )}

      {/* Re-publish — only for cancelled */}
      {status === "cancelled" && (
        <button
          onClick={() => patch({ status: "published" }, "republish")}
          disabled={loading}
          className="px-3 py-1.5 bg-[#6B7280]/10 border border-[#6B7280]/30 text-[#6B7280] text-xs font-semibold rounded-lg hover:bg-[#6B7280]/20 disabled:opacity-50 transition-colors"
        >
          {actionInFlight === "republish" ? "…" : "Re-publish"}
        </button>
      )}

      {/* Feature toggle */}
      <button
        onClick={() => patch({ is_featured: !isFeatured }, "feature")}
        disabled={loading}
        title={isFeatured ? "Remove from featured" : "Mark as featured"}
        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 ${
          isFeatured
            ? "bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B] hover:bg-[#F59E0B]/20"
            : "bg-[#2A2A30] border-[#2A2A30] text-[#6B7280] hover:text-[#F59E0B] hover:border-[#F59E0B]/30"
        }`}
      >
        {actionInFlight === "feature" ? "…" : isFeatured ? "⭐" : "☆"}
      </button>
    </div>
  );
}
