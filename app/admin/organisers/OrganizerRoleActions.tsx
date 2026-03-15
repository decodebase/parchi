"use client";

/**
 * app/admin/organisers/OrganizerRoleActions.tsx
 * Client component — role change dropdown for an account.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

const ROLE_OPTIONS = [
  { value: "user",      label: "User" },
  { value: "scanner",   label: "Scanner" },
  { value: "organiser", label: "Organiser" },
  { value: "admin",     label: "Admin" },
] as const;

interface OrganizerRoleActionsProps {
  userId: string;
  currentRole: string;
}

export function OrganizerRoleActions({ userId, currentRole }: OrganizerRoleActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  async function changeRole(newRole: string) {
    if (newRole === currentRole) return;
    if (!confirm(`Change role to "${newRole}"? This takes effect immediately.`)) return;

    setLoading(true);
    try {
      await fetch(`/api/admin/profiles/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      startTransition(() => router.refresh());
    } catch (err) {
      console.error("Role change failed:", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <select
      defaultValue={currentRole}
      onChange={(e) => changeRole(e.target.value)}
      disabled={loading || isPending}
      className="text-xs bg-[#1A1A1E] border border-[#2A2A30] text-[#FAFAFA] rounded-lg px-2.5 py-1.5 cursor-pointer hover:border-[#FF6A3D]/40 focus:outline-none focus:border-[#FF6A3D]/60 transition-colors disabled:opacity-50"
    >
      {ROLE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}
