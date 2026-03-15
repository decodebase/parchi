/**
 * app/admin/organisers/page.tsx — Mobile-responsive
 * Desktop: table. Mobile: cards.
 */

import { createServiceClient } from "@/lib/supabase/server";
import type { Metadata } from "next";
import { OrganizerRoleActions } from "./OrganizerRoleActions";
import { ApplicationActions } from "./ApplicationActions";

export const runtime = 'edge';
export const metadata: Metadata = { title: "Organisers — Admin" };

type Tab = "organisers" | "applications";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function AdminOrganisersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tab = (params.tab ?? "organisers") as Tab;
  const supabase = createServiceClient();

  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, display_name, email, role, city, created_at")
    .in("role", ["organiser", "scanner"])
    .order("created_at", { ascending: false });

  const profiles = (profilesData ?? []) as any[];

  // Fetch applications — split into two queries so a missing column doesn't kill everything
  const { data: appsData, error: appsError } = await supabase
    .from("organiser_applications")
    .select("id, user_id, business_name, business_type, status, notes, created_at")
    .order("created_at", { ascending: false });

  // Fetch applicant profile info separately (avoids RLS join issues)
  const applicantIds = (appsData ?? []).map((a: any) => a.user_id).filter(Boolean);
  const { data: applicantProfiles } = applicantIds.length > 0
    ? await supabase
        .from("profiles")
        .select("id, display_name, email")
        .in("id", applicantIds)
    : { data: [] };

  const profileMap: Record<string, { display_name: string | null; email: string | null }> = {};
  (applicantProfiles ?? []).forEach((p: any) => { profileMap[p.id] = p; });

  // Try fetching ID doc URLs — may not exist if SQL migration hasn't been run yet
  let docsMap: Record<string, { id_front_url?: string; id_back_url?: string; id_front_signed?: string; id_back_signed?: string }> = {};
  try {
    const { data: appsWithDocs } = await supabase
      .from("organiser_applications")
      .select("id, user_id, id_front_url, id_back_url")
      .order("created_at", { ascending: false })
      .limit(100);

    // Generate signed URLs (1 hour) for each ID doc so admin can view them
    await Promise.all((appsWithDocs ?? []).map(async (d: any) => {
      const entry: typeof docsMap[string] = { id_front_url: d.id_front_url, id_back_url: d.id_back_url };
      if (d.user_id && d.id_front_url) {
        const path = `${d.user_id}/id-front.jpg`;
        const { data: s } = await supabase.storage.from("id-documents").createSignedUrl(path, 3600);
        if (s?.signedUrl) entry.id_front_signed = s.signedUrl;
      }
      if (d.user_id && d.id_back_url) {
        const path = `${d.user_id}/id-back.jpg`;
        const { data: s } = await supabase.storage.from("id-documents").createSignedUrl(path, 3600);
        if (s?.signedUrl) entry.id_back_signed = s.signedUrl;
      }
      docsMap[d.id] = entry;
    }));
  } catch (_) {
    // columns don't exist yet or bucket missing — ignore
  }

  const applications = (appsData ?? []).map((a: any) => ({
    ...a,
    profiles: profileMap[a.user_id] ?? null,
    ...docsMap[a.id],
  })) as any[];

  const pendingApps = applications.filter((a) => a.status === "pending");

  function formatDate(d: string | null) {
    return new Date(d ?? Date.now()).toLocaleDateString("en-PK", { day: "numeric", month: "short", year: "numeric" });
  }

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="text-[#FAFAFA] font-bold text-xl">Organisers & Applications</h1>
        <p className="text-[#6B7280] text-sm mt-1">Manage organiser accounts and review new applications.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-0 border-b border-[#2A2A30]">
        {([
          { key: "organisers", label: "Accounts" },
          { key: "applications", label: `Applications${pendingApps.length > 0 ? ` (${pendingApps.length})` : ""}` },
        ] as { key: Tab; label: string }[]).map((t) => (
          <a
            key={t.key}
            href={`/admin/organisers?tab=${t.key}`}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
              tab === t.key
                ? "border-[#FF6A3D] text-[#FF6A3D]"
                : "border-transparent text-[#6B7280] hover:text-[#FAFAFA]"
            }`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {/* ── Tab: Accounts ── */}
      {tab === "organisers" && (
        <>
          {profiles.length === 0 ? (
            <div className="py-16 text-center bg-[#111113] rounded-2xl border border-[#2A2A30] text-[#6B7280] text-sm">
              No organiser accounts yet.
            </div>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block bg-[#111113] rounded-2xl border border-[#2A2A30] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[#2A2A30] bg-[#1A1A1E]/50">
                        <th className="text-left px-5 py-3 text-[#6B7280] font-medium text-xs uppercase tracking-wider">User</th>
                        <th className="text-left px-4 py-3 text-[#6B7280] font-medium text-xs uppercase tracking-wider">Role</th>
                        <th className="text-left px-4 py-3 text-[#6B7280] font-medium text-xs uppercase tracking-wider">City</th>
                        <th className="text-left px-4 py-3 text-[#6B7280] font-medium text-xs uppercase tracking-wider">Joined</th>
                        <th className="text-right px-5 py-3 text-[#6B7280] font-medium text-xs uppercase tracking-wider">Change Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#2A2A30]/60">
                      {profiles.map((p) => (
                        <tr key={p.id} className="hover:bg-[#1A1A1E]/40 transition-colors">
                          <td className="px-5 py-3.5">
                            <p className="text-[#FAFAFA] font-medium">{p.display_name ?? "—"}</p>
                            <p className="text-[#6B7280] text-xs">{p.email}</p>
                          </td>
                          <td className="px-4 py-3.5"><RolePill role={p.role} /></td>
                          <td className="px-4 py-3.5 text-[#6B7280] text-xs">{p.city ?? "—"}</td>
                          <td className="px-4 py-3.5 text-[#6B7280] text-xs whitespace-nowrap">{formatDate(p.created_at)}</td>
                          <td className="px-5 py-3.5 text-right">
                            <OrganizerRoleActions userId={p.id} currentRole={p.role} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden space-y-3">
                {profiles.map((p) => (
                  <div key={p.id} className="bg-[#111113] rounded-2xl border border-[#2A2A30] p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-full bg-[#1A1A1E] flex items-center justify-center text-sm font-bold text-[#FF6A3D] shrink-0">
                          {(p.display_name ?? p.email ?? "?")[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[#FAFAFA] text-sm font-semibold truncate">{p.display_name ?? "—"}</p>
                          <p className="text-[#6B7280] text-xs truncate">{p.email}</p>
                        </div>
                      </div>
                      <RolePill role={p.role} />
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-[#6B7280] text-xs">{p.city ?? "—"} · {formatDate(p.created_at)}</p>
                      <OrganizerRoleActions userId={p.id} currentRole={p.role} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}

      {/* ── Tab: Applications ── */}
      {tab === "applications" && (
        <div className="space-y-4">
          {/* Debug banner — remove once working */}
          {appsError && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
              DB error: {appsError.message}
            </div>
          )}
          {applications.length === 0 ? (
            <div className="py-16 text-center bg-[#111113] rounded-2xl border border-[#2A2A30] text-[#6B7280] text-sm">
              No applications yet.
              {appsError && <p className="text-red-400 text-xs mt-2">Error: {appsError.message}</p>}
            </div>
          ) : (
            // Show pending first, then rest
            [...applications].sort((a, b) => {
              const order: Record<string, number> = { pending: 0, approved: 1, rejected: 2 };
              return (order[a.status] ?? 9) - (order[b.status] ?? 9);
            }).map((app) => (
              <div key={app.id} className="bg-[#111113] rounded-2xl border border-[#2A2A30] p-4 md:p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[#FAFAFA] font-semibold">{app.business_name}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        app.status === "pending" ? "bg-blue-400/15 text-blue-400"
                        : app.status === "approved" ? "bg-[#10B981]/15 text-[#10B981]"
                        : "bg-[#EF4444]/15 text-[#EF4444]"
                      }`}>
                        {app.status}
                      </span>
                    </div>
                    <p className="text-[#6B7280] text-xs mt-1">
                      {app.profiles?.display_name ?? "Unknown"} · {app.profiles?.email}
                    </p>
                    <p className="text-[#6B7280] text-xs mt-0.5">
                      {app.business_type} · Applied {formatDate(app.created_at)}
                    </p>
                  </div>
                  {app.status === "pending" && (
                    <ApplicationActions applicationId={app.id} userId={app.user_id} />
                  )}
                </div>

                {app.notes && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 bg-[#1A1A1E] rounded-xl px-4 py-3">
                    {app.notes.split(" | ").map((line: string, i: number) => {
                      const [key, ...rest] = line.split(": ");
                      return (
                        <div key={i} className="flex gap-1.5">
                          <span className="text-[#6B7280] text-xs font-medium shrink-0">{key}:</span>
                          <span className="text-[#FAFAFA] text-xs">{rest.join(": ")}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                {(app.id_front_url || app.id_back_url) && (
                  <div className="flex gap-3 flex-wrap">
                    {(app.id_front_signed || app.id_front_url) && (
                      <a href={app.id_front_signed ?? app.id_front_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-[#FF6A3D] hover:underline">
                        ID Card Front ↗
                      </a>
                    )}
                    {(app.id_back_signed || app.id_back_url) && (
                      <a href={app.id_back_signed ?? app.id_back_url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs text-[#FF6A3D] hover:underline">
                        ID Card Back ↗
                      </a>
                    )}
                  </div>
                )}

                {app.status === "rejected" && app.rejection_reason && (
                  <p className="text-[#EF4444] text-xs bg-[#EF4444]/5 border border-[#EF4444]/20 rounded-lg px-3 py-2">
                    Rejection reason: {app.rejection_reason}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function RolePill({ role }: { role: string }) {
  const map: Record<string, string> = {
    organiser: "bg-[#FF6A3D]/15 text-[#FF6A3D]",
    scanner:   "bg-blue-400/15 text-blue-400",
    admin:     "bg-[#EF4444]/15 text-[#EF4444]",
    user:      "bg-[#6B7280]/15 text-[#6B7280]",
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold capitalize shrink-0 ${map[role] ?? map.user}`}>
      {role}
    </span>
  );
}
