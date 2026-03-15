"use client";

/**
 * app/admin/organisers/ApplicationActions.tsx
 * Approve / Reject buttons for organiser applications.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface ApplicationActionsProps {
  applicationId: string;
  userId: string;
}

export function ApplicationActions({ applicationId, userId }: ApplicationActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [inFlight, setInFlight] = useState<"approve" | "reject" | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectInput, setShowRejectInput] = useState(false);

  async function doAction(action: "approve" | "reject") {
    setInFlight(action);
    try {
      await fetch(`/api/admin/applications/${applicationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          userId,
          rejectionReason: action === "reject" ? rejectReason : undefined,
        }),
      });
      startTransition(() => router.refresh());
    } catch (err) {
      console.error("Application action failed:", err);
    } finally {
      setInFlight(null);
      setShowRejectInput(false);
    }
  }

  const busy = inFlight !== null || isPending;

  return (
    <div className="flex flex-col items-end gap-2 shrink-0">
      <div className="flex items-center gap-2">
        <button
          onClick={() => doAction("approve")}
          disabled={busy}
          className="px-3 py-1.5 bg-[#10B981]/10 border border-[#10B981]/30 text-[#10B981] text-xs font-semibold rounded-lg hover:bg-[#10B981]/20 disabled:opacity-50 transition-colors"
        >
          {inFlight === "approve" ? "…" : "Approve"}
        </button>
        <button
          onClick={() => setShowRejectInput(!showRejectInput)}
          disabled={busy}
          className="px-3 py-1.5 bg-[#EF4444]/10 border border-[#EF4444]/30 text-[#EF4444] text-xs font-semibold rounded-lg hover:bg-[#EF4444]/20 disabled:opacity-50 transition-colors"
        >
          Reject
        </button>
      </div>

      {showRejectInput && (
        <div className="flex items-center gap-2 w-full max-w-xs">
          <input
            type="text"
            placeholder="Reason (optional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="flex-1 text-xs bg-[#1A1A1E] border border-[#2A2A30] text-[#FAFAFA] placeholder-[#6B7280] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#EF4444]/50"
          />
          <button
            onClick={() => doAction("reject")}
            disabled={busy}
            className="px-2.5 py-1.5 bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] text-xs font-bold rounded-lg hover:bg-[#EF4444]/25 disabled:opacity-50 transition-colors"
          >
            {inFlight === "reject" ? "…" : "Confirm"}
          </button>
        </div>
      )}
    </div>
  );
}
