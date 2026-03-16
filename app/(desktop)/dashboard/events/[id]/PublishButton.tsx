"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  eventId: string;
  status: string;
}

export function PublishButton({ eventId, status }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Pending — show a non-interactive badge, no button
  if (status === "pending") {
    return (
      <div className="px-4 py-2 bg-warning/10 border border-warning/30 text-warning text-sm font-semibold rounded-xl cursor-default">
        Under Review
      </div>
    );
  }

  // Only draft and approved have actionable buttons
  if (status !== "draft" && status !== "approved") return null;

  const label = status === "draft" ? "Submit for Review" : "Go Live →";
  const cls = status === "draft"
    ? "px-4 py-2 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors disabled:opacity-50"
    : "px-4 py-2 bg-success text-white text-sm font-bold rounded-xl hover:bg-success/90 transition-colors disabled:opacity-50";

  const handleClick = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/events/${eventId}/publish`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      // Refresh the page to show updated status
      router.refresh();
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <button onClick={handleClick} disabled={loading} className={cls}>
        {loading ? "Updating…" : label}
      </button>
      {error && <p className="text-error text-xs">{error}</p>}
    </div>
  );
}
