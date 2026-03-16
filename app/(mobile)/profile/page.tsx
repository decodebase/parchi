"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { signOut } from "@/lib/supabase/auth";
import { useAuthStore } from "@/lib/store/authStore";
import {
  User, Ticket, LayoutDashboard, ShieldCheck,
  HeadphonesIcon, LogOut, MapPin, Briefcase,
  ScanLine, Clock, XCircle, ChevronRight,
} from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { user, profile, loading: authLoading, setProfile } = useAuthStore();
  const [ticketCount, setTicketCount] = useState(0);
  const [ticketsLoaded, setTicketsLoaded] = useState(false);
  const [hasAssignments, setHasAssignments] = useState(false);

  // If auth has resolved but profile is still null (e.g. navigating back from
  // admin/dashboard caused a remount race), re-fetch it directly.
  useEffect(() => {
    if (authLoading || !user || profile) return;
    const supabase = createClient();
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
      .then(({ data }) => { if (data) setProfile(data as any); });
  }, [authLoading, user, profile, setProfile]);

  // Once auth is resolved and we have a user, fetch ticket count + scanner assignments
  useEffect(() => {
    if (authLoading || !user || ticketsLoaded) return;
    setTicketsLoaded(true);

    const supabase = createClient();
    // Run both in parallel
    Promise.all([
      Promise.race([
        supabase.from("tickets").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000)),
      ]).then(({ count }: any) => setTicketCount(count ?? 0)).catch(() => setTicketCount(0)),
      Promise.resolve(
        supabase.from("scanner_assignments").select("id", { count: "exact", head: true }).eq("scanner_id", user.id)
      ).then(({ count }: any) => setHasAssignments((count ?? 0) > 0)).catch(() => {}),
    ]);
  }, [authLoading, user, ticketsLoaded]);

  async function handleLogout() {
    await signOut();
    router.push("/auth/login");
    router.refresh();
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  // Auth resolved but no user — middleware will redirect to login
  if (!user) return null;

  // Auth resolved, user exists but profile row not loaded yet — show fallback
  const safeProfile = profile ?? { id: user.id, email: user.email, role: "user", display_name: null, avatar_url: null, city: null, phone: null, organiser_status: null };

  const role = safeProfile.role ?? "user";
  const displayName = safeProfile.display_name ?? user.email?.split("@")[0] ?? "User";
  const initials = displayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);

  const avatarUrl = safeProfile.avatar_url ?? null;

  const roleBadgeMap: Record<string, { label: string; color: string }> = {
    user:      { label: "Member",    color: "#FF6A3D" },
    organiser: { label: "Organiser", color: "#FF6A3D" },
    scanner:   { label: "Scanner",   color: "#10B981" },
    admin:     { label: "Admin",     color: "#EF4444" },
  };
  const roleBadge = roleBadgeMap[role] ?? roleBadgeMap.user;

  return (
    <div className="min-h-screen bg-background">

      <div className="px-4 py-6 space-y-6">

        {/* Centered avatar + name block */}
        <div className="flex flex-col items-center gap-3 pt-2">
          {/* Avatar */}
          <div className="relative w-24 h-24 shrink-0">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-24 h-24 rounded-full object-cover border-2 border-primary"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                <span className="text-primary font-bold text-2xl">{initials}</span>
              </div>
            )}
          </div>

          {/* Name + city + role badge (only for non-user roles) */}
          <div className="text-center space-y-1.5">
          <p className="font-bold text-text text-lg">{displayName}</p>
          {safeProfile.city && (
          <div className="flex items-center justify-center gap-1">
          <MapPin className="w-3.5 h-3.5 text-muted" strokeWidth={2} />
          <span className="text-sm text-muted">{safeProfile.city}</span>
          </div>
          )}
          {role !== "user" && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{ background: `${roleBadge.color}15` }}>
          {role === "organiser" || role === "admin"
            ? <Briefcase className="w-3.5 h-3.5" style={{ color: roleBadge.color }} strokeWidth={2} />
              : <User className="w-3.5 h-3.5" style={{ color: roleBadge.color }} strokeWidth={2} />
            }
          <span className="text-sm font-medium" style={{ color: roleBadge.color }}>
              {roleBadge.label} Account
              </span>
              </div>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => router.push("/profile/settings")}
            className="flex-1 py-2.5 rounded-xl border border-border bg-surface text-sm font-semibold text-text hover:bg-surface2 transition-colors"
          >
            Edit Profile
          </button>
          {(role === "organiser" || role === "admin") && (
            <button
              onClick={() => router.push("/dashboard")}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-colors"
              style={{ background: "#FF6A3D" }}
            >
              Dashboard
            </button>
          )}
        </div>

        {/* Admin Panel button — full width, only for admin */}
        {role === "admin" && (
          <button
            onClick={() => router.push("/admin")}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-500/30 bg-red-500/8 hover:bg-red-500/15 transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-red-400" strokeWidth={2} />
            <span className="text-sm font-semibold text-red-400">Admin Panel</span>
          </button>
        )}

        {/* Scanner Portal — show for any role that has scanner assignments */}
        {hasAssignments && (
          <button
            onClick={() => router.push("/scan/portal")}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#10B981]/30 bg-[#10B981]/8 hover:bg-[#10B981]/15 transition-colors"
          >
            <ScanLine className="w-4 h-4" style={{ color: "#10B981" }} strokeWidth={2} />
            <span className="text-sm font-semibold" style={{ color: "#10B981" }}>Scanner Portal</span>
          </button>
        )}

        {/* My Parchi — full width card (only for non-scanner) */}
        {role !== "scanner" && (
          <button
            onClick={() => router.push("/my-parchi")}
            className="w-full flex items-center gap-4 p-4 bg-surface rounded-2xl border border-border hover:border-primary/20 transition-all text-left"
          >
            <Ticket className="w-7 h-7 shrink-0" style={{ color: "#FF6A3D" }} strokeWidth={1.8} />
            <div>
              <p className="text-2xl font-bold text-text leading-none">{ticketCount}</p>
              <p className="text-xs text-muted mt-0.5">My Parchi</p>
            </div>
          </button>
        )}

        {/* My Events card — organisers only */}
        {(role === "organiser" || role === "admin") && (
          <button
            onClick={() => router.push("/dashboard/events")}
            className="w-full flex items-center gap-4 p-4 bg-surface rounded-2xl border border-border hover:border-primary/20 transition-all text-left"
          >
            <LayoutDashboard className="w-7 h-7 text-primary shrink-0" strokeWidth={1.8} />
            <div>
              <p className="text-xs text-muted mt-0.5">My Events</p>
            </div>
          </button>
        )}

        {/* Become Organiser — for users and scanners */}
        {(role === "user" || role === "scanner") && (
          <div className="bg-surface rounded-2xl p-5 border border-border">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <Briefcase className="w-5 h-5 text-primary" strokeWidth={2} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-text mb-0.5">Become an Organiser</h3>
                <p className="text-sm text-muted mb-3">
                  Create events, sell tickets with 0% commission
                </p>
                {safeProfile.organiser_status === "pending" ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                    style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                    <Clock className="w-4 h-4 text-amber-500" strokeWidth={2} />
                    <span className="text-xs font-medium text-amber-500">Application under review</span>
                  </div>
                ) : safeProfile.organiser_status === "rejected" ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                      style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                      <XCircle className="w-4 h-4 text-red-500" strokeWidth={2} />
                      <span className="text-xs font-medium text-red-500">Application rejected. You can reapply.</span>
                    </div>
                    <button
                      onClick={() => router.push("/profile/become-organiser")}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      Resubmit Application →
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => router.push("/profile/become-organiser")}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-colors"
                    style={{ background: "#FF6A3D" }}
                  >
                    Apply Now
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Menu items */}
        <div className="space-y-2">
          {[
            { icon: HeadphonesIcon, label: "Help & Support", href: "/support", show: true },
          ].filter(i => i.show).map(item => {
            const Icon = item.icon;
            return (
              <button key={item.href} onClick={() => router.push(item.href)}
                className="w-full flex items-center gap-3 px-4 py-3.5 bg-surface rounded-xl border border-border/60 hover:border-primary/20 hover:bg-surface2 transition-colors text-left">
                <div className="w-8 h-8 rounded-lg bg-surface2 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-muted" strokeWidth={2} />
                </div>
                <span className="text-sm font-medium text-text flex-1">{item.label}</span>
                <ChevronRight className="w-4 h-4 text-muted" strokeWidth={2} />
              </button>
            );
          })}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 transition-colors"
        >
          <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
            <LogOut className="w-4 h-4 text-red-500" strokeWidth={2} />
          </div>
          <span className="text-sm font-medium text-red-500 flex-1">Logout</span>
          <ChevronRight className="w-4 h-4 text-red-400" strokeWidth={2} />
        </button>
      </div>

      <p className="text-center text-muted text-xs pb-8">parchi.pk v1.0.0</p>
    </div>
  );
}
