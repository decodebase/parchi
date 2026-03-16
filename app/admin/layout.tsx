/**
 * app/admin/layout.tsx
 *
 * Admin panel root layout — server component.
 * Guards: admin role only.
 * Mobile-responsive: sidebar on desktop, bottom nav on mobile (via AdminSidebar).
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminSidebar } from "./AdminSidebar";

export const runtime = 'edge';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login?redirect=/admin");

  const { data: profileRaw } = await supabase
    .from("profiles")
    .select("role, display_name, email")
    .eq("id", user.id)
    .single();
  const profile = profileRaw as { role: string; display_name: string | null; email: string | null } | null;

  if (profile?.role !== "admin") {
    redirect("/?error=unauthorized");
  }

  return (
    <div className="min-h-[100svh] bg-[#0A0A0B] flex pb-16 md:pb-0">
      {/* Sidebar (desktop) + Bottom nav (mobile) */}
      <AdminSidebar
        adminName={profile.display_name ?? profile.email ?? "Admin"}
      />

      {/* Content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header bar */}
        <header className="h-14 border-b border-[#2A2A30] bg-[#111113]/90 backdrop-blur-sm flex items-center justify-between px-4 md:px-6 sticky top-0 z-10">
          {/* Mobile: branding */}
          <div className="flex items-center gap-2 md:hidden">
            <span className="text-lg font-black"><span className="text-[#FF6A3D]">parchi</span><span className="text-white">.pk</span></span>
            <span className="text-[10px] text-[#EF4444] font-bold bg-[#EF4444]/10 border border-[#EF4444]/20 px-1.5 py-0.5 rounded-full uppercase tracking-wider">
              admin
            </span>
          </div>

          {/* Desktop: admin badge */}
          <div className="hidden md:flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#EF4444]/10 border border-[#EF4444]/20 text-[#EF4444] text-xs font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
              ADMIN
            </span>
            <span className="text-[#6B7280] text-sm">Control Panel</span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-2">
            <span className="text-[#6B7280] text-xs hidden md:block truncate max-w-[140px]">
              {profile.display_name ?? profile.email}
            </span>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
