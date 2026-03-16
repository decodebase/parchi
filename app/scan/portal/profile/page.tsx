/**
 * app/scan/portal/profile/page.tsx
 *
 * Scanner Portal — Profile tab.
 * Simple profile view with sign out and edit profile.
 * Tapping "← Main App" in the top bar returns to main app.
 */

"use client";

import { useAuthStore } from "@/lib/store/authStore";
import { createClient } from "@/lib/supabase/client";
import { User, LogOut, ChevronRight, Settings } from "lucide-react";

export default function ScannerPortalProfilePage() {
  const { user, profile } = useAuthStore();

  const displayName = profile?.display_name ?? user?.email?.split("@")[0] ?? "Scanner";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/auth/login";
  }

  return (
    <div className="px-4 py-6 space-y-5">

      {/* Avatar + name */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center shrink-0">
          {profile?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt={displayName} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-primary font-bold text-xl">{initials}</span>
          )}
        </div>
        <div>
          <p className="text-text font-bold text-lg">{displayName}</p>
          <p className="text-muted text-xs">{user?.email}</p>
          <span
            className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider"
            style={{ color: "#10B981", background: "rgba(16,185,129,0.10)", border: "1px solid rgba(16,185,129,0.20)" }}
          >
            Scanner
          </span>
        </div>
      </div>

      {/* Edit profile */}
      <button
        onClick={() => window.location.href = "/profile/settings"}
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-surface rounded-2xl border border-border hover:bg-surface2 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-surface2 flex items-center justify-center shrink-0">
          <Settings className="w-4 h-4 text-muted" strokeWidth={2} />
        </div>
        <span className="text-sm font-medium text-text flex-1">Edit Profile</span>
        <ChevronRight className="w-4 h-4 text-muted" strokeWidth={2} />
      </button>

      {/* Back to main app */}
      <button
        onClick={() => window.location.href = "/profile"}
        className="w-full flex items-center gap-3 px-4 py-3.5 bg-surface rounded-2xl border border-border hover:bg-surface2 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-surface2 flex items-center justify-center shrink-0">
          <User className="w-4 h-4 text-muted" strokeWidth={2} />
        </div>
        <span className="text-sm font-medium text-text flex-1">My Profile</span>
        <ChevronRight className="w-4 h-4 text-muted" strokeWidth={2} />
      </button>

      {/* Sign out */}
      <button
        onClick={handleSignOut}
        className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors"
      >
        <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
          <LogOut className="w-4 h-4 text-red-500" strokeWidth={2} />
        </div>
        <span className="text-sm font-medium text-red-500 flex-1">Sign Out</span>
        <ChevronRight className="w-4 h-4 text-red-400" strokeWidth={2} />
      </button>

      <p className="text-center text-muted text-xs pb-2">parchi.pk v1.0.0</p>
    </div>
  );
}
