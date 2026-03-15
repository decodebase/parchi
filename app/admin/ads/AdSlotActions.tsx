"use client";

/**
 * app/admin/ads/AdSlotActions.tsx
 * Client component — actions for each featured slot row.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface AdSlotActionsProps {
  slotId: string;
  status: string;
  isExpired: boolean;
}

export function AdSlotActions({ slotId, status, isExpired }: AdSlotActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [inFlight, setInFlight] = useState<string | null>(null);

  async function patch(newStatus: string) {
    setInFlight(newStatus);
    try {
      await fetch(`/api/admin/slots/${slotId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      startTransition(() => router.refresh());
    } catch (err) {
      console.error("Slot action failed:", err);
    } finally {
      setInFlight(null);
    }
  }

  const busy = inFlight !== null || isPending;

  // Determine available actions based on current status
  const actions: { label: string; newStatus: string; style: string }[] = [];

  if (status === "paused" || isExpired) {
    actions.push({
      label: "Activate",
      newStatus: "active",
      style: "bg-[#10B981]/10 border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981]/20",
    });
  }
  if (status === "active") {
    actions.push({
      label: "Pause",
      newStatus: "paused",
      style: "bg-[#F59E0B]/10 border-[#F59E0B]/30 text-[#F59E0B] hover:bg-[#F59E0B]/20",
    });
  }
  if (status !== "cancelled" && status !== "expired") {
    actions.push({
      label: "Cancel",
      newStatus: "cancelled",
      style: "bg-[#EF4444]/10 border-[#EF4444]/30 text-[#EF4444] hover:bg-[#EF4444]/20",
    });
  }

  if (actions.length === 0) return null;

  return (
    <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
      {actions.map((action) => (
        <button
          key={action.newStatus}
          onClick={() => patch(action.newStatus)}
          disabled={busy}
          className={`px-3 py-1.5 border rounded-lg text-xs font-semibold transition-colors disabled:opacity-50 ${action.style}`}
        >
          {inFlight === action.newStatus ? "…" : action.label}
        </button>
      ))}
    </div>
  );
}
