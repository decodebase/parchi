"use client";

/**
 * app/(desktop)/dashboard/scanner/ScannerManagementClient.tsx
 *
 * Handles:
 *  - Invite new scanner (creates account via API)
 *  - Assign existing scanner to event
 *  - Remove scanner from event
 *  - Open scanner page
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, MapPin, User, AlertCircle } from "lucide-react";

interface Assignment {
  id: string;
  scanner_id: string;
  profiles: { id: string; display_name: string | null; email: string } | null;
}

interface AvailableScanner {
  id: string;
  display_name: string | null;
  email: string;
}

interface SelectedEvent {
  id: string;
  title: string;
  venue: string;
  event_date: string;
}

interface Props {
  selectedEvent: SelectedEvent;
  assignments: Assignment[];
  availableScanners: AvailableScanner[];
}

type ActiveTab = "assigned" | "invite" | "add-existing";

export function ScannerManagementClient({
  selectedEvent,
  assignments,
  availableScanners,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<ActiveTab>("assigned");

  // Invite form state
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [inviteAssign, setInviteAssign] = useState(true);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  // Remove state
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);

  const formattedDate = new Date(selectedEvent.event_date).toLocaleDateString("en-PK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // ── Invite handler ─────────────────────────────────────────
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    setInviteLoading(true);

    try {
      const res = await fetch("/api/admin/invite-scanner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: inviteEmail.trim().toLowerCase(),
          password: invitePassword,
          displayName: inviteName.trim(),
          eventId: inviteAssign ? selectedEvent.id : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setInviteError(data.error ?? "Failed to create scanner account");
        return;
      }

      setInviteSuccess(
        inviteAssign
          ? `Account created and assigned to ${selectedEvent.title}. They can now log in at parchi.pk.`
          : "Scanner account created. You can assign them to events from the Assigned tab."
      );
      setInviteEmail("");
      setInviteName("");
      setInvitePassword("");
      setInviteAssign(true);
      startTransition(() => router.refresh());
    } catch {
      setInviteError("Network error. Please try again.");
    } finally {
      setInviteLoading(false);
    }
  }

  // ── Remove assignment ──────────────────────────────────────
  async function handleRemove(assignmentId: string) {
    setRemovingId(assignmentId);
    try {
      await fetch("/api/scanner/unassign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId, eventId: selectedEvent.id }),
      });
      startTransition(() => router.refresh());
    } finally {
      setRemovingId(null);
    }
  }

  // ── Assign existing ────────────────────────────────────────
  async function handleAssignExisting(scannerId: string) {
    setAssigningId(scannerId);
    try {
      await fetch("/api/scanner/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scannerId, eventId: selectedEvent.id }),
      });
      startTransition(() => router.refresh());
    } finally {
      setAssigningId(null);
    }
  }

  const tabs: { key: ActiveTab; label: string; count?: number }[] = [
    { key: "assigned",      label: "Assigned",   count: assignments.length },
    { key: "invite",        label: "Invite New" },
    { key: "add-existing",  label: "Add Existing", count: availableScanners.length || undefined },
  ];

  return (
    <div className="space-y-4">
      {/* Event header */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-text font-semibold text-sm">{selectedEvent.title}</p>
          <p className="text-muted text-xs flex items-center gap-1.5"><CalendarDays size={10} className="shrink-0" />{formattedDate} <span className="text-muted">·</span> <MapPin size={10} className="shrink-0" />{selectedEvent.venue}</p>
        </div>
        <a
          href={`/scan?eventId=${selectedEvent.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary/90 transition-colors"
        >
          Open Scanner ↗
        </a>
      </div>

      {/* Tabs */}
      <div className="flex items-center border-b border-border/60">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-text"
            }`}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? "bg-primary/20 text-primary" : "bg-surface2 text-muted"
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Assigned ── */}
      {activeTab === "assigned" && (
        <div className="bg-surface rounded-xl border border-border/60 overflow-hidden">
          {assignments.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-surface2 border border-border flex items-center justify-center"><User size={20} className="text-muted" strokeWidth={1.5} /></div>
              <p className="text-muted text-sm">No scanners assigned to this event yet.</p>
              <button
                onClick={() => setActiveTab("invite")}
                className="text-primary text-xs hover:underline"
              >
                Invite a scanner →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {assignments.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-surface2/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-surface2 border border-border flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {(a.profiles?.display_name ?? a.profiles?.email ?? "?")[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-text text-sm font-medium truncate">
                        {a.profiles?.display_name ?? "No name"}
                      </p>
                      <p className="text-muted text-xs truncate">{a.profiles?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-2">
                    <span className="text-[10px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full hidden sm:block">
                      Scanner
                    </span>
                    <button
                      onClick={() => handleRemove(a.id)}
                      disabled={removingId === a.id || isPending}
                      className="text-error text-xs hover:underline disabled:opacity-50 font-medium"
                    >
                      {removingId === a.id ? "…" : "Remove"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {assignments.length > 0 && (
            <div className="px-4 py-3 border-t border-border/40 bg-surface2/30">
              <p className="text-muted text-xs">
                {assignments.length} scanner{assignments.length !== 1 ? "s" : ""} assigned to this event.
                Share this link with them:{" "}
                <span className="text-primary font-medium">
                  parchi.pk/scan?eventId={selectedEvent.id}
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Invite New ── */}
      {activeTab === "invite" && (
        <div className="bg-surface rounded-xl border border-border/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 bg-surface2/50">
            <p className="text-text font-semibold text-sm">Create Scanner Account</p>
            <p className="text-muted text-xs mt-0.5">
              The person will use these credentials to log in to parchi.pk
            </p>
          </div>

          <form onSubmit={handleInvite} className="p-4 space-y-4">
            {/* Name */}
            <div className="space-y-1.5">
              <label className="text-text text-xs font-semibold">Full Name</label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Ahmed Ali"
                required
                className="w-full bg-surface2 border border-border text-text text-sm rounded-xl px-4 py-2.5 placeholder:text-muted focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-text text-xs font-semibold">Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="scanner@example.com"
                required
                className="w-full bg-surface2 border border-border text-text text-sm rounded-xl px-4 py-2.5 placeholder:text-muted focus:outline-none focus:border-primary/50 transition-colors"
              />
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <label className="text-text text-xs font-semibold">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={invitePassword}
                  onChange={(e) => setInvitePassword(e.target.value)}
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                  className="w-full bg-surface2 border border-border text-text text-sm rounded-xl px-4 py-2.5 pr-12 placeholder:text-muted focus:outline-none focus:border-primary/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-text text-xs"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
              <p className="text-muted text-[11px]">
                Share these credentials with your staff member securely (e.g. WhatsApp).
              </p>
            </div>

            {/* Assign checkbox */}
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-xl bg-surface2/60 border border-border/60 hover:border-primary/20 transition-colors">
              <input
                type="checkbox"
                checked={inviteAssign}
                onChange={(e) => setInviteAssign(e.target.checked)}
                className="mt-0.5 accent-primary"
              />
              <div>
                <p className="text-text text-sm font-medium">
                  Assign to <span className="text-primary">{selectedEvent.title}</span> immediately
                </p>
                <p className="text-muted text-xs mt-0.5">
                  They'll be able to scan tickets for this event as soon as they log in.
                </p>
              </div>
            </label>

            {/* Error / Success */}
            {inviteError && (
              <p className="text-error text-xs bg-error/5 border border-error/20 rounded-lg px-3 py-2 flex items-center gap-1.5">
                <AlertCircle size={12} className="shrink-0" />{inviteError}
              </p>
            )}
            {inviteSuccess && (
              <p className="text-success text-xs bg-success/5 border border-success/20 rounded-lg px-3 py-2">
                {inviteSuccess}
              </p>
            )}

            <button
              type="submit"
              disabled={inviteLoading}
              className="w-full py-2.5 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {inviteLoading ? "Creating account…" : "Create Scanner Account"}
            </button>
          </form>
        </div>
      )}

      {/* ── Tab: Add Existing ── */}
      {activeTab === "add-existing" && (
        <div className="bg-surface rounded-xl border border-border/60 overflow-hidden">
          <div className="px-4 py-3 border-b border-border/60 bg-surface2/50">
            <p className="text-text font-semibold text-sm">Existing Scanner Accounts</p>
            <p className="text-muted text-xs mt-0.5">
              Assign a previously created scanner to this event
            </p>
          </div>

          {availableScanners.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <p className="text-muted text-sm">No unassigned scanners available.</p>
              <button
                onClick={() => setActiveTab("invite")}
                className="text-primary text-xs hover:underline"
              >
                Invite a new one →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {availableScanners.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between px-4 py-3 hover:bg-surface2/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-surface2 border border-border flex items-center justify-center text-sm font-bold text-muted shrink-0">
                      {(s.display_name ?? s.email)[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-text text-sm font-medium truncate">
                        {s.display_name ?? "—"}
                      </p>
                      <p className="text-muted text-xs truncate">{s.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleAssignExisting(s.id)}
                    disabled={assigningId === s.id || isPending}
                    className="shrink-0 ml-2 px-3 py-1.5 bg-surface2 border border-border text-text text-xs font-semibold rounded-lg hover:bg-primary hover:border-primary hover:text-white transition-colors disabled:opacity-50"
                  >
                    {assigningId === s.id ? "…" : "Assign"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
